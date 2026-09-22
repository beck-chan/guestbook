import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { writeFileSync } from "node:fs";

const port = 9335;
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--remote-debugging-port=" + port,
    "--user-data-dir=C:/Users/9char/AppData/Local/Temp/poem-align-check",
    "--no-first-run",
    "--disable-gpu",
    "about:blank",
  ],
  { stdio: "ignore" },
);

function die(error) {
  chrome.kill();
  console.error(error);
  process.exit(1);
}

await sleep(700);
let page;
for (let i = 0; i < 20 && !page; i += 1) {
  try {
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
    page = pages.find((item) => item.type === "page");
  } catch {
    await sleep(200);
  }
}
if (!page) die("no page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
const waiters = [];
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg);
  for (const waiter of waiters) waiter(msg);
});
await new Promise((resolve) => ws.addEventListener("open", resolve));
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, (msg) => {
      pending.delete(id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evalJs(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) die(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function check(width, height, root) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 800,
  });
  await send("Page.enable");
  await send("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 8000);
    waiters.push((msg) => {
      if (msg.method === "Page.loadEventFired") {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  await sleep(400);
  if (width < 800) {
    await evalJs(`document.querySelector(".mobile-reading").scrollTop = 2 * document.querySelector(".mobile-reading").clientHeight`);
    await sleep(300);
  } else {
    await evalJs(`document.querySelector('.desk-desktop [aria-label="Open Book"]').click()`);
    await sleep(1200);
  }
  let found = null;
  for (let turn = 0; turn < 24; turn += 1) {
    const sample = await evalJs(`(() => {
      const piece = document.querySelector("${root} .poem-piece:last-child");
      const title = piece?.querySelector(".poem-title");
      const lines = [...(piece?.querySelectorAll(".poem-line") ?? [])];
      const text = lines.find((line) => line.querySelector(".poem-line-text")?.textContent?.trim())?.querySelector(".poem-line-text");
      const num = lines[0]?.querySelector(".poem-line-num");
      const copy = document.querySelector("${root} .leaf-copy");
      const titles = [...document.querySelectorAll("${root} .poem-title")].map((node) => node.textContent);
      return {
        titles,
        titleX: title ? Math.round(title.getBoundingClientRect().x) : null,
        textX: text ? Math.round(text.getBoundingClientRect().x) : null,
        numX: num ? Math.round(num.getBoundingClientRect().x) : null,
        overflow: copy ? copy.scrollWidth > copy.clientWidth + 2 : null,
        lines: lines.map((line) => ({
          n: line.querySelector(".poem-line-num")?.textContent,
          t: (line.querySelector(".poem-line-text")?.textContent ?? "").replace(/\\u00a0/g, "").slice(0, 24),
        })),
      };
    })()`);
    if (sample.titles.some((title) => title.includes("牡丹") || title === "Ode to Peonies")) {
      found = sample;
      break;
    }
    await evalJs(`document.querySelector('${root} [aria-label="Turn Page"]').click()`);
    await sleep(280);
  }
  return found;
}

const mobile = await check(390, 844, ".mobile-poem");
console.log("mobile", JSON.stringify(mobile, null, 2));
if (mobile) {
  await evalJs(`document.querySelector(".mobile-poem .poem-title")?.scrollIntoView({block:"center"})`);
  await sleep(200);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync("scripts/_align.png", Buffer.from(shot.data, "base64"));
}
chrome.kill();
if (!mobile) die("did not find peonies");
const piece = mobile.titles.includes("お牡丹へ") ? mobile : null;
if (piece && !piece.lines.some((line) => line.t.includes("届き")) ) die("missing last line");
const todoki = piece?.lines.find((line) => line.t.includes("届き"));
const before = piece ? piece.lines[Number(todoki.n) - 2] : null;
console.log("before todoki", before, "todoki", todoki);
if (piece && before?.t.trim()) die("expected a blank line before 届きにいく");
if (mobile.titleX === null || Math.abs(mobile.titleX - mobile.textX) > 2) {
  die("title and poem text are not aligned " + mobile.titleX + " " + mobile.textX);
}
if (!(mobile.numX < mobile.titleX)) die("number is not left of the title");
