import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ports = [3000, 3001];

function listeningPids(port) {
  const out = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes(`:${port}`) || !line.includes("LISTENING")) continue;
    const pid = line.trim().split(/\s+/).at(-1);
    if (pid && pid !== "0") pids.add(pid);
  }
  return [...pids];
}

let killed = 0;
for (const port of ports) {
  const pids = listeningPids(port);
  if (pids.length === 0) {
    console.log(`nothing listening on ${port}`);
    continue;
  }
  for (const pid of pids) {
    execFileSync("taskkill", ["/F", "/PID", pid], { stdio: "inherit" });
    killed += 1;
  }
}

if (killed === 0) {
  console.log("no Next preview processes to stop");
}

const nextDir = path.join(root, ".next");
rmSync(nextDir, { recursive: true, force: true });
console.log("removed .next");
