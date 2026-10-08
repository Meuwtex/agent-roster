---
name: agent-roster
description: Live inventory of the coding agents and model subscriptions on this machine (Claude Code, Codex, Cursor, Antigravity/Gemini, Jules, Copilot, opencode, local ollama/LM Studio), with logins, plan tiers, quota left, and the user's own priorities, plus routing by task and by which model is asking, and handoff recipes. Use before delegating or spawning subagents, when choosing which model or agent should do a task, when asked for a second opinion or cross-vendor review, or when the user mentions other agents, subscriptions, or usage limits.
license: MIT
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/probe.mjs)
---

# Agent roster

Shows what agents and model subscriptions are available here, what state they
are in, and how to hand work to each, whichever agent you are.

## Live snapshot

!`node ${CLAUDE_SKILL_DIR}/probe.mjs`

If no snapshot appears above (your agent doesn't run inline commands), run
`probe.mjs`, which sits in the same directory as this SKILL.md:

    node <this skill's directory>/probe.mjs

It prints live status, then the user's roster (or an example if they haven't
written one).

## How to use it

1. Read the snapshot and roster. Live status (logins, quota windows, versions)
   beats the curated notes.
2. Identify yourself: your **model**, not just the harness, its vendor, and its
   tier (frontier or fast). The snapshot's "invoked from" names the harness only.
3. Pick a target from the roster's routing table for this task. Recommend; don't
   default to your own vendor, and never review your own work with it.
4. Respect the user's usage rules in the roster. If a plan is heavy (many
   subagents, top models at max effort, a lot of unapproved quota), say what,
   why and the rough scale, and ask first.
5. Hand off with a recipe from `handoff.md` (same directory).
6. Afterwards, tell the user who did what and how it went, and add one line to
   the roster's Track record.

If the roster is wrong (plan changed, a CLI was added or broke), fix it and tell
the user. If there's no personal roster yet, offer once to create it from the
example.

## Feedback (opt-in only)

Only if the roster's config has `"feedback": true` and the user asks to share
routing feedback: run `node <dir>/feedback.mjs`, show the user the exact text
it prints, and send it only after they say yes. Never suggest or mention
feedback otherwise.
