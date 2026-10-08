#!/usr/bin/env node
// agent-roster probe: prints a live markdown snapshot of the coding agents and
// model resources on this machine, then the user's roster (or the example).
//
// No dependencies (Node 18+). Never prints tokens, emails or account ids.
// Network calls are listed in README.md; slow answers are cached.
//
//   node probe.mjs            snapshot + roster
//   node probe.mjs --live     snapshot only
//   node probe.mjs --fresh    ignore the cache
//   node probe.mjs --offline  no network calls (cached values only)

import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, realpathSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, dirname, delimiter } from "node:path";
import { fileURLToPath } from "node:url";

const HOME = homedir();
const HERE = dirname(fileURLToPath(import.meta.url));
const OS = platform();
const args = new Set(process.argv.slice(2));
const OFFLINE = args.has("--offline");
const FRESH = args.has("--fresh");
const CONFIG_DIR = process.env.AGENT_ROSTER_CONFIG || join(process.env.XDG_CONFIG_HOME || join(HOME, ".config"), "agent-roster");
const CACHE = join(process.env.XDG_CACHE_HOME || join(HOME, ".cache"), "agent-roster", "cache.json");
const CONFIG = readJSON(join(CONFIG_DIR, "config.json")) || {};
const MIN = 60e3, HOUR = 60 * MIN;

// ---- helpers --------------------------------------------------------------

function run(cmd, argv = [], timeout = 8000) {
  return new Promise((resolve) => {
    execFile(cmd, argv, { timeout, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", CI: "1" } }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: stripAnsi(stdout || "").trim(), err: stripAnsi(stderr || "").trim() });
    });
  });
}
function readJSON(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
function stripAnsi(s) { return s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\r/g, ""); }
const firstLine = (s) => (s || "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
const tilde = (p) => p.replace(HOME, "~");

/** Every executable named `name` on PATH, resolved through symlinks, in PATH order. */
function whichAll(name) {
  const exts = OS === "win32" ? (process.env.PATHEXT || ".EXE;.CMD").split(";") : [""];
  const hits = [];
  for (const dir of (process.env.PATH || "").split(delimiter)) {
    for (const ext of exts) {
      const p = join(dir, name + ext);
      try { if (statSync(p).isFile()) hits.push(p); } catch {}
    }
  }
  const seen = new Set();
  return hits.filter((p) => { let r = p; try { r = realpathSync(p); } catch {} return seen.has(r) ? false : seen.add(r); });
}
const which = (name) => whichAll(name)[0] || null;
function dupesNote(name) {
  const all = whichAll(name);
  return all.length > 1 ? `; **${all.length} installs on PATH** (${all.map(tilde).join(", ")}): updates may land in a copy you don't run` : "";
}

const ago = (ms) => { const m = Math.round(ms / MIN); return m < 90 ? `${m}m ago` : m < 2880 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
const until = (ms) => { const m = Math.round((ms - Date.now()) / MIN); return m <= 0 ? "now" : m < 90 ? `in ${m}m` : m < 2880 ? `in ${(m / 60).toFixed(1)}h` : `in ${(m / 1440).toFixed(1)}d`; };
const win = (minutes) => (minutes >= 1440 ? `${minutes / 1440}d` : `${minutes / 60}h`);

function jwtClaims(tok) {
  try { return JSON.parse(Buffer.from(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")); } catch { return null; }
}

/** Cache slow or networked answers. `fn` returns a JSON-able value or null. */
async function cached(key, maxAgeMs, fn, { network = true } = {}) {
  const db = readJSON(CACHE) || {};
  const hit = db[key];
  if (hit && !FRESH && Date.now() - hit.t < maxAgeMs) return { ...hit.v, _age: Date.now() - hit.t };
  if (network && OFFLINE) return hit ? { ...hit.v, _age: Date.now() - hit.t } : null;
  const v = await fn();
  if (v != null) {
    try {
      mkdirSync(dirname(CACHE), { recursive: true });
      const cur = readJSON(CACHE) || {};
      cur[key] = { t: Date.now(), v };
      writeFileSync(CACHE, JSON.stringify(cur), { mode: 0o600 });
    } catch {}
    return v;
  }
  return hit ? { ...hit.v, _age: Date.now() - hit.t } : null;
}

async function version(bin, argv = ["--version"]) {
  const r = await run(bin, argv);
  return firstLine(r.out) || firstLine(r.err) || "version unknown";
}

// ---- who is invoking ------------------------------------------------------

const AGENT_PROCS = [
  [/\bclaude\b/, "Claude Code"], [/\bcodex\b/, "Codex CLI"], [/cursor-agent|\.cursor|cursor\b/, "Cursor"],
  [/\bagy\b|antigravity/, "Antigravity CLI (agy)"], [/\bgemini\b/, "Gemini CLI"], [/\bopencode\b/, "opencode"],
  [/\bcopilot\b/, "GitHub Copilot CLI"], [/\bgoose\b/, "Goose"], [/\baider\b/, "Aider"], [/\bqwen\b/, "Qwen Code"],
  [/\bamp\b/, "Amp"], [/\bcrush\b/, "Crush"], [/\bdroid\b/, "Factory Droid"],
];

async function invoker() {
  // Nearest agent in the process tree wins: env markers are inherited, so an agent
  // launched from inside another agent would otherwise report its parent.
  if (OS !== "win32") {
    let pid = process.ppid;
    for (let i = 0; i < 12 && pid >= 1; i++) {
      const r = await run("ps", ["-o", "ppid=,args=", "-p", String(pid)], 2000);
      const m = r.out.match(/^\s*(\d+)\s+(.*)$/);
      if (!m) break;
      const exe = m[2].split(/\s+/).slice(0, 2).map((x) => x.split("/").pop()).join(" ").toLowerCase();
      for (const [re, name] of AGENT_PROCS) if (re.test(exe)) return name;
      if (pid === 1) break;
      pid = +m[1];
    }
  }
  const e = process.env, has = (p) => Object.keys(e).some((k) => k.startsWith(p));
  if (e.CLAUDECODE || e.CLAUDE_CODE_ENTRYPOINT) return "Claude Code";
  if (has("CODEX_")) return "Codex CLI";
  if (has("CURSOR_")) return "Cursor";
  if (has("GEMINI_CLI")) return "Gemini CLI";
  return "unknown";
}

// ---- providers ------------------------------------------------------------
// Each returns { name, status, ...detail lines } or null when not installed.

async function claude() {
  const bin = which("claude");
  if (!bin) return null;
  const out = { name: "Claude Code", status: `${await version(bin)}${dupesNote("claude")}` };
  const creds = readJSON(join(HOME, ".claude", ".credentials.json"))?.claudeAiOauth;
  if (creds) {
    out.auth = `subscription ${creds.subscriptionType ?? "?"}${creds.rateLimitTier ? ` (${creds.rateLimitTier.replace(/^default_claude_/, "")})` : ""}`;
    if (CONFIG.claude_usage && creds.accessToken) {
      // Unofficial endpoint (same one Claude Code's /usage uses). Opt-in: config.json {"claude_usage": true}.
      const u = await cached("claude-usage", 5 * MIN, async () => {
        try {
          const r = await fetch("https://api.anthropic.com/api/oauth/usage", {
            headers: { Authorization: `Bearer ${creds.accessToken}`, "anthropic-beta": "oauth-2025-04-20" },
            signal: AbortSignal.timeout(6000),
          });
          if (!r.ok) return null;
          const j = await r.json();
          const pick = (w) => (w && w.utilization != null ? { u: w.utilization, r: w.resets_at } : null);
          return { five: pick(j.five_hour), week: pick(j.seven_day), opus: pick(j.seven_day_opus) };
        } catch { return null; }
      });
      if (u) {
        const f = (label, w) => (w ? `${w.u}% of ${label} (resets ${until(Date.parse(w.r))})` : null);
        out.usage = [f("5h", u.five), f("7d", u.week), f("7d Opus", u.opus)].filter(Boolean).join(", ") + (u._age ? `, checked ${ago(u._age)}` : "");
      } else out.usage = "usage endpoint failed (unofficial; may have changed)";
    } else out.usage = "not checked (opt in with `\"claude_usage\": true` in config.json, or run /usage)";
  } else out.auth = "no credentials file (macOS keeps them in Keychain; plan unknown)";
  return out;
}

function codexRateLimits(home) {
  const root = join(home, "sessions");
  const desc = (d) => { try { return readdirSync(d).sort().reverse(); } catch { return []; } };
  let scanned = 0;
  for (const y of desc(root)) for (const m of desc(join(root, y))) for (const d of desc(join(root, y, m))) {
    const dir = join(root, y, m, d);
    const files = desc(dir).filter((f) => f.endsWith(".jsonl"))
      .map((f) => ({ f: join(dir, f), t: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
    for (const { f, t } of files) {
      if (++scanned > 40) return null;
      const txt = readFileSync(f, "utf8");
      const i = txt.lastIndexOf('"rate_limits":{');
      if (i < 0) continue;
      const end = txt.indexOf("\n", i);
      try {
        const find = (o) => (o && typeof o === "object" ? (o.rate_limits ?? Object.values(o).map(find).find(Boolean)) : null);
        const rl = find(JSON.parse(txt.slice(txt.lastIndexOf("\n", i) + 1, end === -1 ? undefined : end)));
        if (rl) return { rl, mtime: t };
      } catch {}
    }
  }
  return null;
}

async function codex() {
  const bin = which("codex");
  if (!bin) return null;
  const v = (await version(bin)).replace(/^codex-cli\s*/, "");
  const latest = (await cached("codex-npm-latest", 24 * HOUR, async () => {
    const r = await run("npm", ["view", "@openai/codex", "version"], 10000);
    return r.ok ? { v: r.out } : null;
  }))?.v || readJSON(join(HOME, ".codex", "version.json"))?.latest_version;
  const newer = (a, b) => { const x = a.split(/[.-]/).map(Number), y = b.split(/[.-]/).map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
  const behind = latest ? (newer(latest, v) ? ` (**outdated**, latest ${latest})` : " (current)") : "";

  // One CODEX_HOME per account: $CODEX_HOME, ~/.codex, and any ~/.codex-<name>.
  const homes = [...new Set([process.env.CODEX_HOME, join(HOME, ".codex"),
    ...readdirSync(HOME).filter((d) => /^\.codex-[\w-]+$/.test(d)).map((d) => join(HOME, d))].filter((h) => h && isDir(h)))];
  const accounts = homes.map((h) => {
    const label = h === join(HOME, ".codex") ? "`codex`" : `\`CODEX_HOME=${tilde(h)} codex\``;
    const auth = readJSON(join(h, "auth.json"));
    if (!auth) return `${label}: not logged in`;
    let a = `auth mode ${auth.auth_mode ?? "api key"}`;
    if (auth.auth_mode === "chatgpt" && auth.tokens?.id_token) {
      const z = (jwtClaims(auth.tokens.id_token) || {})["https://api.openai.com/auth"] || {};
      a = `ChatGPT **${z.chatgpt_plan_type ?? "?"}**${z.chatgpt_subscription_active_until ? `, renews/ends ${String(z.chatgpt_subscription_active_until).slice(0, 10)}` : ""}`;
    }
    const s = codexRateLimits(h);
    const w = (x) => (x ? `${x.used_percent}% of ${win(x.window_minutes)} (resets ${until(x.resets_at * 1000)})` : null);
    const q = s ? `; ${[w(s.rl.primary), w(s.rl.secondary)].filter(Boolean).join(", ")}, as of ${ago(Date.now() - s.mtime)}` : "; no quota sample yet";
    return `${label}: ${a}${q}`;
  });
  const cfg = existsSync(join(HOME, ".codex", "config.toml")) ? readFileSync(join(HOME, ".codex", "config.toml"), "utf8") : "";
  const model = cfg.match(/^model\s*=\s*"([^"]+)"/m)?.[1], effort = cfg.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m)?.[1];
  return {
    name: "Codex CLI",
    status: `${v}${behind}${dupesNote("codex")}`,
    accounts: accounts.join(" | ") || "no CODEX_HOME found",
    defaults: model ? `model ${model}${effort ? `, effort ${effort}` : ""}` : undefined,
  };
}

async function cursor() {
  // `agent` is Cursor's short name but too generic to trust unless it resolves into a cursor install.
  let bin = which("cursor-agent");
  if (!bin) { const a = which("agent"); try { if (a && /cursor/i.test(realpathSync(a))) bin = a; } catch {} }
  if (!bin) return null;
  // `status` can say "Logged in" while model calls fail; --list-models is the honest check.
  const auth = await cached("cursor-auth", 10 * MIN, async () => {
    const lm = await run(bin, ["--list-models"], 15000);
    const txt = `${lm.out}\n${lm.err}`;
    const broken = !lm.ok || /authentication required|not logged in|login/i.test(firstLine(txt));
    return { broken, msg: broken ? firstLine(txt).slice(0, 140) : "", models: broken ? 0 : txt.split("\n").filter((l) => l.trim()).length };
  });
  const cfg = readJSON(join(HOME, ".cursor", "cli-config.json"));
  return {
    name: "Cursor Agent CLI",
    status: `${await version(bin)}${which("cursor") ? " (+ Cursor IDE)" : ""}${dupesNote("cursor-agent")}`,
    auth: !auth ? "unknown (offline)" : auth.broken ? `**BROKEN**: model calls fail (${auth.msg}). Ask the user to run \`cursor-agent login\`.` : "ok, model calls work",
    defaults: cfg?.model?.displayName ? `model ${cfg.model.displayName}` : undefined,
    usage: "quota not exposed to the CLI (see the Cursor dashboard)",
  };
}

async function agy() {
  const bin = which("agy");
  if (!bin) return null;
  const m = await cached("agy-models", HOUR, async () => {
    const r = await run(bin, ["models"], 20000);
    if (!r.ok) return { ok: false, msg: firstLine(r.err.split("\n").filter((l) => !/logging before/.test(l)).join("\n")).slice(0, 140) };
    const ids = r.out.split("\n").map((l) => l.split(/\s+/)[0]).filter((x) => /^[a-z0-9][\w.-]+$/.test(x) && !/^fetching/i.test(x));
    return { ok: true, ids };
  });
  const q = await cached("agy-usage", 10 * MIN, async () => {
    const r = await run(bin, ["--output-format", "json", "-p", "/usage"], 30000);
    try {
      const groups = JSON.parse(r.out).command.data.groups;
      return { g: groups.flatMap((g) => g.buckets.map((b) => ({ n: g.name, w: b.window, left: Math.round(b.remaining_fraction * 100), r: b.reset_time }))) };
    } catch { return null; }
  });
  const fam = (re) => (m?.ids || []).filter((x) => re.test(x));
  return {
    name: "Antigravity CLI (agy)",
    status: `${(await version(bin)).replace(/^.*?(\d+\.\d+\.\d+).*$/, "$1")}; self-updates`,
    auth: !m ? "unknown (offline)" : m.ok ? `ok, ${m.ids.length} models` : `not working: ${m.msg} (run \`agy\` once to sign in)`,
    usage: q?.g?.length ? q.g.map((b) => `${b.n}: ${b.left}% of ${b.w} limit left (resets ${until(Date.parse(b.r))})`).join("; ") : undefined,
    models: m?.ok ? [fam(/gemini.*pro/).slice(0, 2).join(", "), fam(/gemini.*flash/).slice(0, 1).join(", "), fam(/^claude/).join(", "), fam(/^gpt/).join(", ")].filter(Boolean).join(" · ") : undefined,
  };
}

async function gemini() {
  const bin = which("gemini");
  if (!bin) return null;
  const oauth = existsSync(join(HOME, ".gemini", "oauth_creds.json")), key = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  return { name: "Gemini CLI", status: await version(bin), auth: oauth ? "Google login present" : key ? "API key in env" : "no login found" };
}

async function jules() {
  const bin = which("jules");
  if (!bin) return null;
  const r = await cached("jules-repos", HOUR, async () => {
    const x = await run(bin, ["remote", "list", "--repo"], 15000);
    return { ok: x.ok, n: x.ok ? x.out.split("\n").filter(Boolean).length : 0 };
  });
  return {
    name: "Jules (Google, async cloud agent)",
    status: (await version(bin, ["version"])).replace(/^Version:\s*/, ""),
    auth: !r ? "unknown (offline)" : r.ok ? `ok, ${r.n} GitHub repos connected` : "not working (run `jules login`)",
  };
}

// CLIs we only report as present.
const SIMPLE = [
  ["copilot", "GitHub Copilot CLI"], ["opencode", "opencode"], ["aider", "Aider"], ["goose", "Goose"],
  ["amp", "Amp"], ["qwen", "Qwen Code"], ["crush", "Crush"], ["droid", "Factory Droid"], ["kiro-cli", "Kiro CLI"],
];
async function others() {
  const found = SIMPLE.filter(([b]) => which(b));
  if (!found.length) return null;
  const vs = await Promise.all(found.map(([b]) => version(which(b))));
  return { name: "Other agent CLIs", status: found.map(([, n], i) => `${n} ${vs[i]}`).join("; ") };
}

async function local() {
  const parts = [];
  if (which("ollama")) {
    const [ls, ps] = await Promise.all([run("ollama", ["list"]), run("ollama", ["ps"])]);
    const names = (r) => r.out.split("\n").slice(1).map((l) => l.split(/\s+/)[0]).filter(Boolean);
    parts.push(ls.ok ? `ollama: ${names(ls).join(", ") || "no models"}${names(ps).length ? ` (loaded: ${names(ps).join(", ")})` : ""}` : "ollama installed, server not answering");
  }
  if (which("lms")) {
    const r = await run("lms", ["ls", "--json"]);
    const j = (() => { try { return JSON.parse(r.out); } catch { return null; } })();
    parts.push(`LM Studio: ${j ? j.map((m) => m.modelKey || m.path).slice(0, 8).join(", ") : "installed"}`);
  }
  const gpu = await vram();
  if (!parts.length && !gpu) return null;
  return { name: "Local models", status: parts.join("; ") || "no local runtime found", gpu };
}

async function vram() {
  const desktop = !!(process.env.WAYLAND_DISPLAY || process.env.DISPLAY);
  const note = desktop ? "; a desktop session is running, so it shares the GPU: leave headroom" : "";
  if (OS === "linux") {
    try {
      for (const c of readdirSync("/sys/class/drm").filter((c) => /^card\d+$/.test(c))) {
        const p = `/sys/class/drm/${c}/device/mem_info_vram_`;
        if (!existsSync(p + "total")) continue;
        const used = +readFileSync(p + "used", "utf8"), total = +readFileSync(p + "total", "utf8");
        if (total >= 4 * 2 ** 30) return `VRAM ${(used / 2 ** 30).toFixed(1)} / ${(total / 2 ** 30).toFixed(1)} GiB used${note}`;
      }
    } catch {}
  }
  if (which("nvidia-smi")) {
    const r = await run("nvidia-smi", ["--query-gpu=memory.used,memory.total", "--format=csv,noheader,nounits"]);
    const [u, t] = firstLine(r.out).split(",").map((x) => +x);
    if (t) return `VRAM ${(u / 1024).toFixed(1)} / ${(t / 1024).toFixed(1)} GiB used${note}`;
  }
  return null;
}

async function extras() {
  // User hook: any executable `extras` script in the config dir; its stdout is appended verbatim.
  for (const f of ["extras", "extras.sh"]) {
    const p = join(CONFIG_DIR, f);
    if (existsSync(p)) { const r = await run(p, [], 10000); return r.out || null; }
  }
  return null;
}

// ---- output ---------------------------------------------------------------

const [who, ...results] = await Promise.all([invoker(), claude(), codex(), cursor(), agy(), gemini(), jules(), others(), local()]);
const ex = await extras();
const lines = [`## Live snapshot (${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC; invoked from: ${who})`, ""];
for (const r of results.filter(Boolean)) {
  lines.push(`- **${r.name}**: ${r.status}`);
  for (const k of ["auth", "accounts", "models", "defaults", "usage", "gpu"]) if (r[k]) lines.push(`  - ${k}: ${r[k]}`);
}
if (results.every((r) => !r)) lines.push("- No known agent CLIs or local model runtimes found on PATH.");
if (ex) lines.push("", "### Local extras", "", ex);

const EMAIL = /[\w.%+-]+@[\w-]+(\.[\w-]+)+/g;
console.log(lines.join("\n").replace(EMAIL, "<account>"));

if (!args.has("--live")) {
  const mine = join(CONFIG_DIR, "roster.md");
  if (existsSync(mine)) console.log("\n" + readFileSync(mine, "utf8"));
  else {
    console.log(`\n> No personal roster yet. Showing the example; copy it to \`${tilde(mine)}\` and edit it ` +
      "(plans, priorities, what each agent is good at). Offer to do this for the user.\n");
    console.log(readFileSync(join(HERE, "roster.example.md"), "utf8"));
  }
}
