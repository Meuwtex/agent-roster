---
name: agent-roster
description: Load BEFORE spawning subagents, splitting a task into parts, using the Agent/Task tool, or getting work reviewed. It shows which other coding agents and models are on this machine (Claude Code, Codex, Cursor, Antigravity/Gemini, Jules, local models), their logins and quota left, and the user's routing rules, so you pick the right worker and tier instead of defaulting to copies of yourself. Also use when choosing a model, asking for a second opinion, or when the user mentions other agents, subscriptions or usage limits.
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
   default to your own vendor. For reviews prefer another vendor; if none is
   usable, use a separate stronger reviewer and say it isn't independent.
4. Respect the user's usage rules in the roster. If a plan is heavy (many
   subagents, top models at max effort, a lot of unapproved quota), say what,
   why and the rough scale, and ask first.
5. Hand off with a recipe from `handoff.md` (same directory). This skill picks
   **who** does the work. If another installed skill covers **how** to do it
   (a code-review procedure, a parallel-dispatch or planning workflow), load
   that one too and follow it with the worker chosen here.
6. Afterwards, tell the user who did what and how it went, and add one line to
   the roster's Track record.
7. **If a pick went wrong** (the user corrected it, a handoff failed, or the
   user reports an earlier recommendation failed): after fixing the routing,
   offer once to send feedback. See Feedback below; it's one line, not a pitch.

If the roster is wrong (plan changed, a CLI was added or broke), fix it and tell
the user. If there's no personal roster yet, offer once to create it from the
example.

## Feedback

When routing goes wrong (the user corrects a pick, a handoff fails, or the
snapshot misreported something), **including when the user tells you an earlier
recommendation failed**, first fix the routing, then offer **once per session**
in one line, e.g.:

> Want me to send a note about this misroute to the agent-roster maintainers?
> It includes your routing table and track record (emails and paths scrubbed).
> Yes / not now / never.

- **Yes:** `node <dir>/feedback.mjs "<one sentence: what went wrong, what should have happened>"`,
  then `node <dir>/feedback.mjs --send`. Tell the user what was sent and give
  the issue link (or the prefilled link it prints).
- **Never:** `node <dir>/feedback.mjs --off`, then stop offering.
- **Not now:** drop it for this session.

If `feedback.mjs` says feedback is off, don't offer. Don't offer for problems
on the user's side (a CLI not logged in, a quota running out); those aren't
routing defaults.
