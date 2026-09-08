import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";

const CHROME =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VIEWPORTS = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "in-between", width: 1280, height: 800 },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withCdp(fn) {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  server.close();
  await once(server, "close");

  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${port}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=" +
        `${process.env.TEMP}\\guestbook-scroll-check-${port}`,
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  let version;
  for (let i = 0; i < 40; i += 1) {
    try {
      version = await fetch(`http://127.0.0.1:${port}/json/version`).then(
        (res) => res.json(),
      );
      break;
    } catch {
      await wait(150);
    }
  }
  if (!version) {
    chrome.kill();
    throw new Error("Chrome CDP did not start");
  }

  const wsUrl = version.webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await once(ws, "open");
  let nextId = 1;
  const pending = new Map();
  const eventWaiters = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
    if (msg.method && eventWaiters.has(msg.method)) {
      const waiters = eventWaiters.get(msg.method);
      eventWaiters.delete(msg.method);
      for (const waiter of waiters) waiter(msg);
    }
  });

  function waitEvent(method) {
    return new Promise((resolve) => {
      const list = eventWaiters.get(method) ?? [];
      list.push(resolve);
      eventWaiters.set(method, list);
    });
  }

  function send(method, params = {}, sessionId) {
    const id = nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      pending.set(id, (msg) => {
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      });
    });
  }

  try {
    return await fn({ send, waitEvent });
  } finally {
    ws.close();
    chrome.kill();
  }
}

async function measure(send, waitEvent, viewport) {
  const { targetId } = await send("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const call = (method, params) => send(method, params, sessionId);

  await call("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Input.enable").catch(() => {});
  const loaded = waitEvent("Page.domContentEventFired");
  await call("Page.navigate", { url: "http://127.0.0.1:3000/" });
  await loaded;
  await wait(4000);

  const { result: noteBox } = await call("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const note = document.querySelector(".desk-desktop .sticky-note");
        if (!note) return null;
        const r = note.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      })()
    `,
  });
  if (!noteBox.value) {
    return { error: "no sticky note" };
  }
  await call("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: noteBox.value.x,
    y: noteBox.value.y,
    button: "left",
    clickCount: 1,
  });
  await call("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: noteBox.value.x,
    y: noteBox.value.y,
    button: "left",
    clickCount: 1,
  });
  await wait(4000);

  const { result } = await call("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const book = document.querySelector(".book");
        const cover = document.querySelector(".cover");
        const pageRight = document.querySelector(".page-right");
        const copy = document.querySelector(".page-right .leaf-copy");
        if (!book || !cover || !pageRight || !copy) {
          return { error: "missing nodes" };
        }
        const pageBox = pageRight.getBoundingClientRect();
        const x = Math.round(pageBox.left + pageBox.width * 0.45);
        const y = Math.round(pageBox.top + pageBox.height * 0.4);
        const hit = document.elementFromPoint(x, y);
        const before = copy.scrollTop;
        const wheel = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 120,
          clientX: x,
          clientY: y,
        });
        (hit || copy).dispatchEvent(wheel);
        const afterWheel = copy.scrollTop;
        copy.scrollTop = 80;
        const afterSet = copy.scrollTop;
        copy.scrollTop = before;
        const leftCopy = document.querySelector(".page-left .leaf-copy");
        return {
          open: book.className,
          coverPe: getComputedStyle(cover).pointerEvents,
          pageLeftPe: getComputedStyle(document.querySelector(".page-left")).pointerEvents,
          hit: hit && (hit.tagName + "." + hit.className),
          hitCover: Boolean(hit?.closest(".cover")),
          hitCopy: Boolean(hit?.closest(".leaf-copy")),
          scrollHeight: copy.scrollHeight,
          clientHeight: copy.clientHeight,
          canScroll: copy.scrollHeight - copy.clientHeight > 20,
          afterWheel,
          afterSet,
          leftCanScroll: leftCopy
            ? leftCopy.scrollHeight - leftCopy.clientHeight > 20
            : null,
        };
      })()
    `,
  });

  await send("Target.closeTarget", { targetId });
  return result.value;
}

const results = await withCdp(async ({ send, waitEvent }) => {
  const out = {};
  for (const viewport of VIEWPORTS) {
    out[viewport.name] = await measure(send, waitEvent, viewport);
  }
  return out;
});

console.log(JSON.stringify(results, null, 2));
