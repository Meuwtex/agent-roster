# agent-roster

A skill that tells **whichever coding agent loads it** what else is on your
machine: which agent CLIs are installed and logged in, what plan each is on,
how much quota is left, and how *you* want work routed between them. Then it
gives the agent a recipe for handing work over.

You pay for Claude, ChatGPT, Cursor, Gemini, maybe a local GPU. Each agent only
knows about itself, so you end up re-explaining your setup every session, and
subagents default to the invoking agent's own vendor. agent-roster fixes that
with one skill that works the same from Claude Code, Codex, Cursor, Antigravity
and anything else that reads `SKILL.md`.

```
## Live snapshot (2026-10-08 22:49 UTC; invoked from: Claude Code)

- **Claude Code**: 2.1.295
  - auth: subscription max (max_20x)
  - usage: 34% of 5h (resets in 61m), 10% of 7d (resets in 5.5d)
- **Codex CLI**: 0.162.0 (current)
  - accounts: `codex`: ChatGPT **plus**; 20% of 5h (resets in 3.0h), 4% of 7d | `CODEX_HOME=~/.codex-b codex`: not logged in
- **Cursor Agent CLI**: 2026.09.28 (+ Cursor IDE)
  - auth: ok, model calls work
- **Antigravity CLI (agy)**: 1.3.2
  - usage: Gemini Models: 97% of weekly limit left; Claude and GPT models: 100% left
- **Local models**: ollama: gemma3:4b; LM Studio: qwen3-coder-30b-a3b-instruct, …
  - gpu: VRAM 2.2 / 31.9 GiB used; a desktop session is running, so it shares the GPU

## My roster
### Routing: by task, relative to the model asking
| Task | Ranked targets | Rules |
| Review / second opinion | a vendor other than yours | never review with your own vendor |
…
```

## What it does

- **Live probe** (`probe.mjs`, Node 18+, no dependencies, about a second when cached):
  - versions, plus duplicate installs on PATH (the classic "the update went to
    a copy I don't run" bug);
  - logins and plan tiers: Claude, Codex (every `CODEX_HOME`, so several
    ChatGPT accounts), Cursor (checks that model calls really work, not just
    `status`), Antigravity, Jules, Gemini CLI;
  - quota windows: Codex 5h/7d from its own session logs, Antigravity weekly
    pools, and Claude 5h/7d if you opt in;
  - local runtimes (ollama, LM Studio) and GPU memory;
  - Copilot, opencode, Aider, Goose, Amp, Qwen Code, Crush, Droid and Kiro are
    reported as present.
- **Your roster** (`~/.config/agent-roster/roster.md`): what you pay for, your
  routing table, usage rules, and a track record of how delegated jobs went.
  Plain markdown that you and your agents both edit.
- **Routing by task *and* by who's asking**: a fast model (Flash, Haiku,
  Composer) escalates hard work, while a frontier model holding the context
  does it itself. Reviews always go to a different vendor.
- **Handoff recipes** (`handoff.md`): headless invocations for each CLI, with
  the gotchas we hit (e.g. `agy -p` must be the last flag).

## Install

```sh
npx skills add Meuwtex/agent-roster -g        # symlinks into every agent it finds
```

or by hand:

```sh
git clone https://github.com/Meuwtex/agent-roster ~/.agents/skills/agent-roster
ln -s ~/.agents/skills/agent-roster ~/.claude/skills/agent-roster   # Claude Code
ln -s ~/.agents/skills/agent-roster ~/.codex/skills/agent-roster    # Codex
ln -s ~/.agents/skills/agent-roster ~/.cursor/skills/agent-roster   # Cursor
```

Then ask any agent to "use agent-roster". The first time, it will offer to
create your roster from `roster.example.md`.

### Per-agent notes

| Agent | How it runs the probe |
|---|---|
| Claude Code | inline: the snapshot is injected when the skill loads (`allowed-tools` pre-approves the one command) |
| Codex CLI | runs `probe.mjs` itself (`$agent-roster` or by description) |
| Cursor Agent | runs it itself |
| Antigravity (`agy`) | headless `-p` can't ask permission, so run `agy` interactively once and choose "always allow" for the probe command |
| Others | any harness that reads `SKILL.md` and can run a shell command |

Tested on Linux (Arch) with Claude Code 2.1, Codex 0.162, Cursor Agent
2026.09 and agy 1.3. macOS should work (the GPU line is skipped); Windows is
untested.

## Configuration

`~/.config/agent-roster/` (or `$AGENT_ROSTER_CONFIG`):

| File | Purpose |
|---|---|
| `roster.md` | your roster; printed after the live snapshot |
| `config.json` | `{"claude_usage": false, "feedback": false}` |
| `extras` or `extras.sh` | optional executable; its output is appended (your own services, job runner, GPU notes…) |

## Privacy and network

The probe reads local config and auth files to report **plan tiers and
quota**, and never prints tokens, emails or account ids (emails are redacted
from all output). Cached answers live in `~/.cache/agent-roster/` (mode 600).

Network calls it makes, all to the vendor's own service with your own login:

| Call | When | Cache |
|---|---|---|
| `npm view @openai/codex version` | Codex installed | 24h |
| `cursor-agent --list-models` | Cursor installed | 10 min |
| `agy models`, `agy -p /usage` | agy installed | 1h / 10 min |
| `jules remote list --repo` | Jules installed | 1h |
| `GET api.anthropic.com/api/oauth/usage` with your Claude Code token | **only if** `"claude_usage": true`; unofficial endpoint, may break | 5 min |

`--offline` skips all of them; `--fresh` ignores the cache.

## Feedback (opt-in, never nags)

If you want to help improve the default routing, set `"feedback": true`, then
ask your agent to "send agent-roster feedback". `feedback.mjs` writes a draft
(agent names and versions, your routing table and track record, your note,
with emails and home paths scrubbed) and prints it. Nothing is sent until you
run `feedback.mjs --send`, which files a GitHub issue (or gives you a
prefilled link). With feedback off, the skill never mentions it.

## Prior art

- [claudexor](https://github.com/razzant/claudexor): a full control plane
  that runs Codex/Claude/Cursor/OpenCode/Antigravity with multi-account quota
  rotation. Use it if you want one app to drive everything; agent-roster is the
  lightweight "what's around and what's left" layer for whichever agent you're
  already in.
- [agent-intern](https://github.com/TuTouPower/agent-intern): an MCP server
  that lets Claude Code delegate to Gemini, Codex, Copilot, Cursor and opencode.
- [avenoxskills](https://github.com/avenoxai/avenoxskills): its `limit` skill
  showed the Claude usage endpoint approach used here.

## License

MIT. Built with Claude Code (and smoke-tested by Codex, Cursor and Antigravity).
