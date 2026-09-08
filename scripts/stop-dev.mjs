import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const nextDir = path.join(root, ".next");
const appRoots = [
  root,
  path.resolve(root, "..", "guestbook"),
  path.resolve(root, "..", "y2k-guestbook"),
  path.resolve(root, "..", "y2k-demobook"),
].filter((value, index, all) => all.indexOf(value) === index);

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function listeningPids(port) {
  const out = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
  const bound = new RegExp(`:${port}(?!\\d)`);
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes("LISTENING") || !bound.test(line)) continue;
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

function powershellEscape(value) {
  return value.replace(/'/g, "''");
}

function leftoverNextPids() {
  const needles = appRoots.map(
    (dir) => `$_.CommandLine.Contains('${powershellEscape(dir)}')`,
  );
  const cmd = [
    "Get-CimInstance Win32_Process |",
    "Where-Object {",
    "  $_.CommandLine -and",
    "  $_.CommandLine -notmatch 'tsserver|typingsInstaller' -and",
    "  $_.CommandLine -notmatch 'Local\\\\Programs\\\\cursor' -and",
    "  $_.CommandLine -notmatch 'stop-dev' -and",
    `  (${needles.join(" -or ")}) -and`,
    "  ($_.CommandLine -match 'docs-dev|next dev|next\\\\dist|start-server|pool_entry|\\\\.next')",
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
for (let port = 3000; port <= 3010; port++) {
  for (const pid of listeningPids(port)) pids.add(pid);
}
for (const pid of leftoverNextPids()) pids.add(pid);

let killed = 0;
for (const pid of pids) {
  if (killPid(pid)) killed += 1;
}
if (killed === 0) {
  console.log("no Next preview processes to stop");
} else {
  console.log(`stopped ${killed} process tree(s)`);
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
    console.log(`removed ${nextDir}`);
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
