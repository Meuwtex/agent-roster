// Fixture test: fake CLIs on a temp PATH and fake auth/session files in a temp home, so the
// parsers that matter (Codex plan and quota, Claude plan and settings, Cursor auth, the
// outdated check, the roster nudge, and on Windows the .cmd shim path) run with no real agent
// installed. Nothing here is a real credential.
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir, platform } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WIN = platform() === "win32";
const probe = join(dirname(fileURLToPath(import.meta.url)), "..", "probe.mjs");
const home = mkdtempSync(join(tmpdir(), "agent-roster-fixture-"));
const bin = join(home, "bin");
mkdirSync(bin, { recursive: true });

/** A fake CLI: `--version` prints `version`; any other first argument prints `lines`. */
function shim(name, version, lines = []) {
  if (WIN) {
    // Same shape npm uses for its shims. Parentheses must be escaped inside an if-block.
    const esc = (s) => s.replace(/[()]/g, "^$&");
    const other = lines.length ? lines.map((l) => `echo ${esc(l)}`).join("& ") : "echo.";
    writeFileSync(join(bin, `${name}.cmd`), `@echo off\r\nif "%1"=="--version" (echo ${esc(version)}) else (${other})\r\n`);
  } else {
    const other = lines.length ? lines.map((l) => `echo '${l}'`).join("; ") : "true";
    writeFileSync(join(bin, name), `#!/bin/sh\nif [ "$1" = "--version" ]; then echo '${version}'; else ${other}; fi\n`, { mode: 0o755 });
  }
}
const put = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s); };
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const now = Math.floor(Date.now() / 1000);

shim("claude", "2.1.300 (Claude Code)");
const creds = join(home, ".claude", ".credentials.json");
put(creds, JSON.stringify({ claudeAiOauth: { accessToken: "fixture-token-not-real", subscriptionType: "max", rateLimitTier: "default_claude_max_20x" } }));
put(join(home, ".claude", "settings.json"), JSON.stringify({ model: "opus" }));

shim("codex", "codex-cli 0.50.0");
const idToken = `${b64url({ alg: "none" })}.${b64url({ email: "fixture@example.com",
  "https://api.openai.com/auth": { chatgpt_plan_type: "plus", chatgpt_subscription_active_until: "2026-12-01T00:00:00Z" } })}.sig`;
put(join(home, ".codex", "auth.json"), JSON.stringify({ auth_mode: "chatgpt", tokens: { id_token: idToken } }));
put(join(home, ".codex", "version.json"), JSON.stringify({ latest_version: "0.51.0" }));
put(join(home, ".codex", "config.toml"), 'model = "gpt-5-codex"\nmodel_reasoning_effort = "high"\n');
put(join(home, ".codex", "sessions", "2026", "10", "01", "rollout-fixture.jsonl"),
  JSON.stringify({ type: "event_msg", payload: { type: "token_count", rate_limits: {
    primary: { used_percent: 20, window_minutes: 300, resets_at: now + 3 * 3600 },
    secondary: { used_percent: 4, window_minutes: 10080, resets_at: now + 5 * 86400 } } } }) + "\n");

shim("cursor-agent", "2026.10.1", ["gpt-5", "claude-4-sonnet"]);

const cfg = join(home, ".config", "agent-roster");
put(join(cfg, "roster.md"), "## Roster\n\nLast reviewed: 2025-01-01.\n\n### Routing\n\n| Task | Target |\n|---|---|\n| review | codex |\n");
put(join(cfg, "extras.mjs"), 'console.log("job runner: idle");\n');

// Only the fakes are on PATH; npm (Codex's latest-version check) and ps are deliberately absent.
const base = WIN ? { SystemRoot: process.env.SystemRoot, ComSpec: process.env.ComSpec, TEMP: process.env.TEMP, TMP: process.env.TMP, PATHEXT: ".EXE;.CMD;.BAT" } : {};
const env = { ...base, HOME: home, USERPROFILE: home, PATH: bin, XDG_CONFIG_HOME: join(home, ".config"), XDG_CACHE_HOME: join(home, ".cache") };
const run = (extra = {}) => execFileSync(process.execPath, [probe, "--fresh"], { env: { ...env, ...extra }, encoding: "utf8" });

let failed = 0;
const check = (out, what, re, want = true) => {
  if (re.test(out) === want) return;
  failed++;
  console.error(`FAIL: ${what}`);
};

const out = run();
check(out, "Claude version without the harness suffix", /- \*\*Claude Code\*\*: 2\.1\.300\n/);
check(out, "Claude plan from the credentials file", /auth: subscription max \(max_20x\)\n/);
check(out, "Claude default model from settings.json", /- \*\*Claude Code\*\*[\s\S]*?defaults: model opus\n/);
check(out, "Codex outdated check against version.json", /- \*\*Codex CLI\*\*: 0\.50\.0 \(\*\*outdated\*\*, latest 0\.51\.0\)/);
check(out, "Codex plan from the id_token", /ChatGPT \*\*plus\*\*, renews\/ends 2026-12-01/);
check(out, "Codex quota windows from the session log", /20% of 5h \(resets in 3\.0h\), 4% of 7d \(resets in 5\.0d\)/);
check(out, "Codex defaults from config.toml", /defaults: model gpt-5-codex, effort high/);
check(out, "Cursor auth via --list-models", /- \*\*Cursor Agent CLI\*\*: 2026\.10\.1\n  - auth: ok, model calls work/);
check(out, "extras.mjs output appended", /### Local extras\n\njob runner: idle/);
check(out, "stale-roster nudge", /> Roster last reviewed \d+ days ago \(2025-01-01\)/);
check(out, "personal roster printed", /\| review \| codex \|/);
check(out, "no email address leaks", /[\w.+-]+@[\w-]+\.[\w.]+/, false);
check(out, "no token leaks", /fixture-token-not-real/, false);

const withKey = run({ ANTHROPIC_API_KEY: "sk-ant-fixture-not-real" });
check(withKey, "API key next to a subscription is flagged", /subscription max \(max_20x\); ANTHROPIC_API_KEY is also set/);
check(withKey, "the API key is not printed", /sk-ant-fixture-not-real/, false);

rmSync(creds);
const keyOnly = run({ ANTHROPIC_API_KEY: "sk-ant-fixture-not-real" });
check(keyOnly, "API key alone reads as pay-as-you-go", /auth: API key \(ANTHROPIC_API_KEY\): pay-as-you-go/);

if (failed) { console.error(`\n${failed} check(s) failed. Output:\n${out}`); process.exit(1); }
console.log(`ok: fixture probe (${WIN ? ".cmd shims" : "sh shims"})`);
