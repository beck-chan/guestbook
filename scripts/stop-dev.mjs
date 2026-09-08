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

const PORT_MIN = 3000;
const PORT_MAX = 3099;
const selfPid = String(process.pid);
const parentPid = String(process.ppid);

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function norm(value) {
  return String(value || "").replace(/\//g, "\\").toLowerCase();
}

function inApp(cmd) {
  const lowered = String(cmd || "").toLowerCase();
  const slashed = norm(cmd);
  return appRoots.some((dir) => {
    const win = norm(dir);
    const fwd = dir.replace(/\\/g, "/").toLowerCase();
    return slashed.includes(win) || lowered.includes(fwd);
  });
}

function isProtected(proc) {
  const pid = String(proc.ProcessId);
  if (pid === selfPid || pid === parentPid) return true;
  const blob = `${proc.Name}\n${proc.ExecutablePath}\n${proc.CommandLine}`;
  const n = norm(blob);
  if (n.includes("stop-dev") || n.includes("dev:stop")) return true;
  if (n.includes("tsserver") || n.includes("typingsinstaller")) return true;
  if (n.includes("\\cursor\\resources\\") || n.includes("programs\\cursor")) return true;
  const name = String(proc.Name || "").toLowerCase();
  return [
    "explorer.exe",
    "cursor.exe",
    "code.exe",
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
  ].includes(name);
}

function isNextCommand(cmd) {
  const n = norm(cmd);
  const f = String(cmd || "").toLowerCase();
  if (f.includes("stop-dev") || f.includes("dev:stop")) return false;
  return (
    n.includes("docs-dev") ||
    n.includes("\\next\\dist") ||
    f.includes("/next/dist") ||
    n.includes("start-server") ||
    n.includes("pool_entry") ||
    n.includes("\\.next\\") ||
    f.includes("/.next/") ||
    /\bnext(\.cmd|\.exe)?\s+(dev|start)\b/.test(f) ||
    /npm-cli\.js["']?\s+run\s+(dev|docs)(?!:)/.test(f) ||
    /npm\.cmd\s+run\s+(dev|docs)(?!:)/.test(f)
  );
}

function listProcesses() {
  const out = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine | ConvertTo-Json -Compress -Depth 2",
    ],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  ).trim();
  if (!out) return [];
  const parsed = JSON.parse(out);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function localPort(addr) {
  const match = String(addr).match(/:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function inPortRange(port) {
  return port != null && port >= PORT_MIN && port <= PORT_MAX;
}

function netstatRows() {
  const out = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
  const rows = [];
  for (const line of out.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] !== "TCP") continue;
    if (parts.length < 5) continue;
    const port = localPort(parts[1]);
    const remotePort = localPort(parts[2]);
    if (!inPortRange(port) && !inPortRange(remotePort)) continue;
    rows.push({
      local: parts[1],
      remote: parts[2],
      state: parts[3],
      pid: parts[4],
      port,
      remotePort,
    });
  }
  return rows;
}

function highestKillableAncestor(pid, byPid) {
  let current = byPid.get(String(pid));
  if (!current) return String(pid);
  if (isProtected(current)) return null;
  let best = current;
  const shells = new Set([
    "bash.exe",
    "zsh.exe",
    "pwsh.exe",
    "powershell.exe",
    "fish.exe",
    "mintty.exe",
    "conhost.exe",
  ]);
  while (current) {
    const parent = byPid.get(String(current.ParentProcessId));
    if (!parent || isProtected(parent)) break;
    const name = String(parent.Name || "").toLowerCase();
    const cmd = String(parent.CommandLine || "").toLowerCase();
    if (shells.has(name)) break;
    if (name === "cmd.exe" && !/npm|next|docs-dev/.test(cmd)) break;
    if (!["node.exe", "cmd.exe", "npm.exe"].includes(name)) break;
    best = parent;
    current = parent;
  }
  return String(best.ProcessId);
}

function pidsToKill(procs) {
  const byPid = new Map(procs.map((proc) => [String(proc.ProcessId), proc]));
  const seeds = new Set();

  for (const row of netstatRows()) {
    if (row.state !== "LISTENING" || row.pid === "0" || !inPortRange(row.port)) continue;
    const proc = byPid.get(row.pid);
    if (proc && isProtected(proc)) continue;
    seeds.add(row.pid);
  }

  for (const proc of procs) {
    if (isProtected(proc)) continue;
    const cmd = proc.CommandLine || "";
    if (inApp(cmd) && isNextCommand(cmd)) {
      seeds.add(String(proc.ProcessId));
    }
  }

  const roots = new Set();
  for (const pid of seeds) {
    const rootPid = highestKillableAncestor(pid, byPid);
    if (rootPid) roots.add(rootPid);
  }
  return { roots, byPid };
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

function describe(proc) {
  const cmd = String(proc?.CommandLine || proc?.Name || "").replace(/\s+/g, " ");
  return cmd.length > 140 ? `${cmd.slice(0, 137)}...` : cmd;
}

function reportLeftoverSockets() {
  const rows = netstatRows();
  const listening = rows.filter(
    (row) => row.state === "LISTENING" && row.pid !== "0" && inPortRange(row.port),
  );
  const ghosts = rows.filter((row) =>
    ["TIME_WAIT", "CLOSE_WAIT", "FIN_WAIT_1", "FIN_WAIT_2", "LAST_ACK", "CLOSING"].includes(
      row.state,
    ),
  );
  const clients = rows.filter(
    (row) =>
      ["SYN_SENT", "ESTABLISHED"].includes(row.state) && inPortRange(row.remotePort),
  );

  if (listening.length > 0) {
    for (const row of listening) {
      console.error(`still LISTENING on ${row.local} pid ${row.pid}`);
    }
    return listening.length;
  }

  console.log(`no server listening on ${PORT_MIN}-${PORT_MAX}`);
  if (ghosts.length > 0) {
    console.log(
      `${ghosts.length} leftover TIME_WAIT/CLOSE_WAIT socket(s) — Windows TCP leftovers, not a Next process`,
    );
  }
  if (clients.length > 0) {
    console.log(
      `${clients.length} client connection(s) still hitting :${PORT_MIN}+ (browser/preview retry). Those are not the server.`,
    );
  }
  return 0;
}

let killed = 0;
for (let attempt = 0; attempt < 3; attempt++) {
  let procs;
  try {
    procs = listProcesses();
  } catch (err) {
    console.error("could not list processes:", err.message);
    procs = [];
  }

  const { roots, byPid } = pidsToKill(procs);
  if (roots.size === 0) break;

  for (const pid of roots) {
    const proc = byPid.get(pid);
    console.log(`killing pid ${pid}: ${describe(proc)}`);
    if (killPid(pid)) killed += 1;
  }
  sleep(500);
}

if (killed === 0) {
  console.log("no Next preview processes to stop");
} else {
  console.log(`stopped ${killed} process tree(s)`);
}

sleep(400);
const stillListening = reportLeftoverSockets();

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

if (stillListening > 0) process.exit(1);
