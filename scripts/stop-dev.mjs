import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = path.join(root, ".next");
const ports = [3000, 3001];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

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

function killPid(pid) {
  try {
    execFileSync("taskkill", ["/F", "/T", "/PID", String(pid)], {
      stdio: "inherit",
    });
    return true;
  } catch {
    return false;
  }
}

function leftoverNextPids() {
  const needle = root.replace(/'/g, "''");
  const cmd = [
    "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" |",
    "Where-Object {",
    "  $_.CommandLine -and",
    `  $_.CommandLine.Contains('${needle}') -and`,
    "  $_.CommandLine -notmatch 'tsserver|typingsInstaller' -and",
    "  $_.CommandLine -notmatch 'Local\\\\Programs\\\\cursor' -and",
    "  ($_.CommandLine -match '\\.next|next\\\\dist|start-server|pool_entry')",
    "} | Select-Object -ExpandProperty ProcessId",
  ].join(" ");
  try {
    const out = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", cmd],
      { encoding: "utf8" },
    );
    return [...new Set(out.split(/\s+/).map((s) => s.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

const pids = new Set();
for (const port of ports) {
  const found = listeningPids(port);
  if (found.length === 0) {
    console.log(`nothing listening on ${port}`);
    continue;
  }
  for (const pid of found) pids.add(pid);
}
for (const pid of leftoverNextPids()) pids.add(pid);

let killed = 0;
for (const pid of pids) {
  if (killPid(pid)) killed += 1;
}
if (killed === 0) {
  console.log("no Next preview processes to stop");
}

sleep(400);

let lastErr;
for (let i = 0; i < 8; i++) {
  try {
    rmSync(nextDir, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 150,
    });
    console.log("removed .next");
    lastErr = null;
    break;
  } catch (err) {
    lastErr = err;
    if (!["ENOTEMPTY", "EBUSY", "EPERM", "EACCES"].includes(err.code)) {
      throw err;
    }
    sleep(300);
  }
}

if (lastErr) {
  console.error(
    "killed Next but .next is still locked (another process has files open).",
  );
  console.error(lastErr.message);
  process.exit(1);
}
