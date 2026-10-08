// Smoke test: the probe must run on an empty machine (no agents, no config) without crashing,
// and must never print an email address.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const probe = join(dirname(fileURLToPath(import.meta.url)), "..", "probe.mjs");
const home = mkdtempSync(join(tmpdir(), "agent-roster-test-"));
const env = { HOME: home, PATH: "/nonexistent", XDG_CONFIG_HOME: join(home, ".config"), XDG_CACHE_HOME: join(home, ".cache") };
const out = execFileSync(process.execPath, [probe, "--offline"], { env, encoding: "utf8" });
const fail = (m) => { console.error("FAIL:", m, "\n" + out); process.exit(1); };
if (!out.includes("## Live snapshot")) fail("no snapshot header");
if (/\*\*(Claude Code|Codex CLI|Cursor Agent CLI|Antigravity|Jules|Gemini CLI)\*\*/.test(out)) fail("reported an agent on an empty PATH");
if (!out.includes("No personal roster yet")) fail("expected the example-roster hint");
if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(out)) fail("output contains an email address");
console.log("ok: empty-machine probe");
