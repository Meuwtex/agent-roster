# Handoff recipes

The same shapes work whichever agent invokes them. Put the full brief in the
prompt, because the target can't see your context: what to do, where, what
"done" looks like, and what not to touch.

- Always redirect stdin (`< /dev/null`) in headless runs; some CLIs otherwise
  wait for input.
- Run long jobs in the background with whatever job runner the user prefers
  (your harness's background mode, `systemd-run --user`, tmux). Check the roster
  for a preference, and avoid bare `nohup ... &`.
- Default to read-only or plan modes for reviews; let the caller apply fixes.
- Don't add "skip all permissions" flags unless the user has said so for this
  workspace.

## Codex CLI (OpenAI)

    codex exec -s read-only -C <repo> -o <out.md> "<brief>" < /dev/null
    codex exec -s workspace-write -C <repo> "<brief>" < /dev/null   # may edit inside the repo
    CODEX_HOME=~/.codex-<name> codex exec ...                     # another ChatGPT account

- `-m <model>` and `-c model_reasoning_effort=<low|medium|high|xhigh>` override the defaults.
- Codex reads `AGENTS.md`, not CLAUDE.md.

## Cursor Agent CLI

    cursor-agent -p --trust --workspace <repo> --model <model> --output-format text "<brief>" < /dev/null
    cursor-agent --list-models

- Without `--force` it won't run shell commands that aren't allowlisted.
- On "Authentication required", stop and ask the user to run `cursor-agent login`.

## Antigravity CLI (agy, Google)

    agy --model <model> --effort <low|medium|high> -p "<brief>" < /dev/null
    agy models

- **Flag order matters:** `-p` takes the next argument as the prompt, so put
  `-p "<brief>"` last (or write `-p='<brief>'`).
- `--mode plan` for read-only planning; `--add-dir` to widen the workspace.
- `agy models` may also list Claude and GPT-OSS models billed to the Google plan.
- **Headless `-p` can't read files or run commands** until the user picks "always
  allow" for them in an interactive session, and prompts can't come from stdin
  (argv only, ~128 KB). For read-heavy jobs, use the same Gemini models through
  Cursor (`cursor-agent --model gemini-…`) or have the user approve once.
- "auth: ok" in the snapshot means logged in, not able to do *this* job: check
  the recipe's constraints.

## Jules (Google, async, GitHub repos only)

    jules new --repo <owner/repo> "<brief>"     # --parallel N for N attempts
    jules remote list --session
    jules remote pull --session <id>

Only for code that's already pushed and fine to send to Google's cloud.

## Claude Code (from another agent)

    claude -p --model <haiku|sonnet|opus> "<brief>" < /dev/null

Headless `claude -p` can't load skills unless they're allowed, e.g.
`--allowedTools "Skill,Bash(node:*)"`.

## Gemini CLI

    gemini -p "<brief>" < /dev/null

## GUI-only models (the user is the tool call)

When a model is only reachable in an app, write the brief to a file and give the
user a defined spec: which app and model, the exact prompt (point to the file),
what to attach, and what to paste back and where. Then carry on with work that
doesn't depend on the answer.

## After any handoff

Report who did what and how it went (quality, speed, what it missed), and add a
line to the roster's Track record.
