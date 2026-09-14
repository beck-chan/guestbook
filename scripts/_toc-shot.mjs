import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chrome =
  process.env.CHROME ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const outDir = process.argv[2] || "C:/Users/9char/Documents/GitHub/beck-chan/guestbook";
const userData = mkdtempSync(join(tmpdir(), "toc-chrome-"));

const child = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--user-data-dir=${userData}`,
    "--remote-debugging-port=9230",
  ],
  { stdio: "ignore" },
);

await new Promise((r) => setTimeout(r, 800));

const { webSocketDebuggerUrl } = await fetch("http://127.0.0.1:9230/json/version").then((r) =>
  r.json(),
);

const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve);
  ws.addEventListener("error", reject);
});

let id = 0;
const pending = new Map();
const eventWaiters = [];
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(String(event.data));
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
  if (msg.method) {
    for (const waiter of eventWaiters) waiter(msg);
  }
});

function waitForEvent(method, sessionId, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = eventWaiters.indexOf(onMsg);
      if (idx >= 0) eventWaiters.splice(idx, 1);
      reject(new Error(`timeout waiting for ${method}`));
    }, timeoutMs);
    function onMsg(msg) {
      if (msg.method === method && (!sessionId || msg.sessionId === sessionId)) {
        clearTimeout(timer);
        const idx = eventWaiters.indexOf(onMsg);
        if (idx >= 0) eventWaiters.splice(idx, 1);
        resolve(msg);
      }
    }
    eventWaiters.push(onMsg);
  });
}

function send(method, params = {}, sessionId) {
  const next = ++id;
  return new Promise((resolve) => {
    pending.set(next, resolve);
    ws.send(JSON.stringify({ id: next, method, params, sessionId }));
  });
}

const { result } = await send("Target.createTarget", { url: "about:blank" });
const attached = await send("Target.attachToTarget", {
  targetId: result.targetId,
  flatten: true,
});
const sessionId = attached.result.sessionId;

async function shot({ width, height, url, name }) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  }, sessionId);
  await send("Page.enable", {}, sessionId);
  const loaded = waitForEvent("Page.loadEventFired", sessionId);
  await send("Page.navigate", { url }, sessionId);
  await loaded.catch(() => {});
  await new Promise((r) => setTimeout(r, 1800));
  await send(
    "Runtime.evaluate",
    {
      expression: `(() => { const el = location.hash && document.querySelector(location.hash); if (el) el.scrollIntoView(); return document.querySelector(".docs-toc-stack")?.getBoundingClientRect(); })()`,
      returnByValue: true,
    },
    sessionId,
  );
  await new Promise((r) => setTimeout(r, 400));
  const shotResult = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(join(outDir, name), Buffer.from(shotResult.result.data, "base64"));
  console.log("wrote", name, "from", url, `${width}x${height}`);
}

const shots = [
  { width: 1676, height: 942, url: "http://localhost:3000/docs/book-build#feature-flags", name: "toc-fix-flags.png" },
  { width: 1676, height: 942, url: "http://localhost:3000/docs/book-build#nextjs-frontend", name: "toc-fix-children.png" },
  { width: 1920, height: 1080, url: "http://localhost:3000/docs/book-build#feature-flags", name: "toc-fix-1920-flags.png" },
  { width: 1920, height: 1080, url: "http://localhost:3000/docs/book-build#nextjs-frontend", name: "toc-fix-1920-children.png" },
  { width: 1280, height: 800, url: "http://localhost:3000/docs/book-build#nextjs-frontend", name: "toc-fix-1280-children.png" },
];

for (const item of shots) {
  await shot(item);
}

ws.close();
child.kill();
process.exit(0);
