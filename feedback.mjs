#!/usr/bin/env node
// agent-roster feedback: send routing problems to the maintainers.
//
//   node feedback.mjs ["what went wrong"]  write a draft and print it (sends nothing)
//   node feedback.mjs --send               file the draft as a GitHub issue
//   node feedback.mjs --off | --on         stop / resume the agent offering to send
//
// On by default. "feedback": false in ~/.config/agent-roster/config.json means
// "don't offer again". The draft holds only what it prints: agent names and
// versions, the roster's routing table and track record, and the note, with
// emails and home paths scrubbed. The user sees it before anything is sent.

import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HOME = homedir();
const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = process.env.AGENT_ROSTER_CONFIG || join(process.env.XDG_CONFIG_HOME || join(HOME, ".config"), "agent-roster");
const CONFIG = (() => { try { return JSON.parse(readFileSync(join(CONFIG_DIR, "config.json"), "utf8")); } catch { return {}; } })();
const REPO = CONFIG.feedback_repo || "Meuwtex/agent-roster";
const DRAFT = join(process.env.XDG_CACHE_HOME || join(HOME, ".cache"), "agent-roster", "feedback-draft.md");

const sh = (cmd, argv, timeout = 30000) => new Promise((res) =>
  execFile(cmd, argv, { timeout, encoding: "utf8" }, (err, out, errOut) => res({ ok: !err, out: (out || "").trim(), err: (errOut || "").trim() })));

const CONFIG_FILE = join(CONFIG_DIR, "config.json");
for (const [flag, value] of [["--off", false], ["--on", true]]) {
  if (process.argv.includes(flag)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify({ ...CONFIG, feedback: value }, null, 2) + "\n");
    console.log(value ? "Feedback offers are back on." : "Done: the agent won't offer to send feedback again. (`feedback.mjs --on` to undo.)");
    process.exit(0);
  }
}
if (CONFIG.feedback === false && !process.argv.includes("--send")) {
  console.log("Feedback offers are off (\"feedback\": false). Run with --on to re-enable.");
  process.exit(0);
}

const scrub = (s) => s
  .replace(/[\w.%+-]+@[\w-]+(\.[\w-]+)+/g, "<email>")
  .split(HOME).join("~")
  .replace(/\/(home|Users)\/[^/\s]+/g, "~");

if (process.argv.includes("--send")) {
  if (!existsSync(DRAFT)) { console.log("No draft. Run `node feedback.mjs` first and review it."); process.exit(1); }
  const body = scrub(readFileSync(DRAFT, "utf8"));
  const title = `Routing feedback ${new Date().toISOString().slice(0, 10)}`;
  const gh = await sh("gh", ["issue", "create", "-R", REPO, "--title", title, "--body-file", DRAFT, "--label", "routing-feedback"]);
  if (gh.ok) { console.log(`Sent: ${gh.out}`); process.exit(0); }
  // No gh (or not logged in, or the label is missing): hand back a prefilled URL to open in a browser.
  const url = `https://github.com/${REPO}/issues/new?labels=routing-feedback&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body.slice(0, 6000))}`;
  console.log(`Couldn't file it with gh (${(gh.err || "not installed").split("\n")[0]}). Open this to submit it yourself:\n${url}`);
  process.exit(0);
}

// Build the draft.
const note = process.argv.slice(2).filter((a) => !a.startsWith("--")).join(" ");
const live = await sh("node", [join(HERE, "probe.mjs"), "--live", "--offline"]);
// Agent names and versions only: drop auth/usage/model detail lines.
const agents = live.out.split("\n").filter((l) => l.startsWith("- **")).map((l) => l.split(";")[0]).join("\n");
const roster = (() => { try { return readFileSync(join(CONFIG_DIR, "roster.md"), "utf8"); } catch { return ""; } })();
const section = (title) => {
  const m = roster.match(new RegExp(`###\\s*${title}[^\\n]*\\n([\\s\\S]*?)(?=\\n###\\s|$)`, "i"));
  return m ? m[1].trim() : "(none)";
};
const version = (() => { try { return JSON.parse(readFileSync(join(HERE, "package.json"), "utf8")).version; } catch { return "dev"; } })();

const draft = scrub(`### What I'd change about the routing
${note || "(write here: which pick was wrong or right, and what should have been chosen)"}

### Agents present (names and versions only)
${agents || "(none detected)"}

### My routing table
${section("Routing")}

### Track record
${section("Track record")}

<sub>agent-roster ${version}; sent with \`feedback.mjs --send\` after review.</sub>
`);
mkdirSync(dirname(DRAFT), { recursive: true });
writeFileSync(DRAFT, draft, { mode: 0o600 });
console.log(draft);
console.log(`---\nDraft saved to ${DRAFT.replace(HOME, "~")}; nothing sent yet. ` +
  `Send: \`node ${join(HERE, "feedback.mjs").replace(HOME, "~")} --send\` (public issue on ${REPO}). Never ask again: \`--off\`.`);
