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
  await call("Page.navigate", { url: "http://localhost:3000/" });
  await loaded;
  await wait(4000);

  const { result: noteBox } = await call("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const note = document.querySelector(".desk-desktop .sticky-note");
        if (!note) return null;
        const r = note.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        return {
          x, y, w: r.width, h: r.height,
          hit: hit && (hit.tagName + "." + String(hit.className).split(" ")[0]),
        };
      })()
    `,
  });
  if (!noteBox.value) {
    return { error: "no sticky note" };
  }
  await call("Runtime.evaluate", {
    expression: `
      const note = document.querySelector(".desk-desktop .sticky-note");
      note?.click();
    `,
  });
  let openedClass = "";
  for (let i = 0; i < 50; i += 1) {
    const { result: opened } = await call("Runtime.evaluate", {
      returnByValue: true,
      expression: `
        (() => {
          const book = document.querySelector(".desk-desktop .book");
          return book ? book.className : "";
        })()
      `,
    });
    openedClass = String(opened.value);
    if (openedClass.includes("is-open") && !openedClass.includes("is-animating")) {
      break;
    }
    await wait(200);
  }
  await wait(200);

  const { result: layout } = await call("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const book = document.querySelector(".desk-desktop .book");
        const cover = document.querySelector(".desk-desktop .cover");
        const pageRight = document.querySelector(".desk-desktop .page-right");
        const copy = document.querySelector(".desk-desktop .page-right .leaf-copy");
        const leftCopy = document.querySelector(".desk-desktop .page-left .leaf-copy");
        if (!book || !cover || !pageRight || !copy) {
          return { error: "missing nodes" };
        }
        const pageBox = copy.getBoundingClientRect();
        const leftBox = leftCopy?.getBoundingClientRect();
        const samples = [0.2, 0.45, 0.7].map((t) => ({
          x: Math.round(pageBox.left + pageBox.width * t),
          y: Math.round(pageBox.top + pageBox.height * 0.42),
        }));
        if (leftBox) {
          samples.push({
            x: Math.round(leftBox.left + leftBox.width * 0.45),
            y: Math.round(leftBox.top + leftBox.height * 0.42),
          });
        }
        const hits = samples.map((pt) => {
          const hit = document.elementFromPoint(pt.x, pt.y);
          return {
            ...pt,
            hit: hit && (hit.tagName + "." + String(hit.className).split(" ")[0]),
            hitCover: Boolean(hit?.closest(".cover")),
            hitCopy: Boolean(hit?.closest(".leaf-copy")),
          };
        });
        return {
          noteClick: ${JSON.stringify(noteBox.value)},
          open: book.className,
          coverPe: getComputedStyle(cover).pointerEvents,
          coverVis: getComputedStyle(cover).visibility,
          pageRightPe: getComputedStyle(pageRight).pointerEvents,
          scrollHeight: copy.scrollHeight,
          clientHeight: copy.clientHeight,
          canScroll: copy.scrollHeight - copy.clientHeight > 20,
          leftCanScroll: leftCopy
            ? leftCopy.scrollHeight - leftCopy.clientHeight > 20
            : null,
          samples: hits,
        };
      })()
    `,
  });
  if (!layout.value || layout.value.error) {
    await send("Target.closeTarget", { targetId });
    return layout.value ?? { error: "no layout" };
  }

  const wheelHits = [];
  for (const sample of layout.value.samples) {
    await call("Runtime.evaluate", {
      expression: `
        document.querySelector(".desk-desktop .page-right .leaf-copy").scrollTop = 0;
        const left = document.querySelector(".desk-desktop .page-left .leaf-copy");
        if (left) left.scrollTop = 0;
      `,
    });
    await wait(50);
    await call("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: sample.x,
      y: sample.y,
    });
    await call("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: sample.x,
      y: sample.y,
      deltaX: 0,
      deltaY: 180,
    });
    await wait(80);
    const { result: scrolled } = await call("Runtime.evaluate", {
      returnByValue: true,
      expression: `
        (() => {
          const right = document.querySelector(".desk-desktop .page-right .leaf-copy");
          const left = document.querySelector(".desk-desktop .page-left .leaf-copy");
          return {
            right: right?.scrollTop ?? null,
            left: left?.scrollTop ?? null,
          };
        })()
      `,
    });
    wheelHits.push({ ...sample, scrolled: scrolled.value });
  }

  await send("Target.closeTarget", { targetId });
  return { ...layout.value, wheelHits };
}

const results = await withCdp(async ({ send, waitEvent }) => {
  const out = {};
  for (const viewport of VIEWPORTS) {
    out[viewport.name] = await measure(send, waitEvent, viewport);
  }
  return out;
});

console.log(JSON.stringify(results, null, 2));
