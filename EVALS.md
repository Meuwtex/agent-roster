# Evals

Does loading agent-roster actually change what an agent recommends? The suite
in [`evals/`](evals) runs each case with the skill and without it (a no-skill
baseline), using `claude plugin eval`.

## Latest results (2026-10-10, v3)

| Case | What it checks | With skill | Without |
|---|---|---|---|
| [spontaneous-build-review](evals/spontaneous-build-review) | **Unprompted:** a build-test-review task that never mentions agents or models. Does the skill load, and are workers and the reviewer chosen sensibly? | **3/3** (fired 3/3) | 0/3 (fired 0/3) |
| [spontaneous-parallel-chores](evals/spontaneous-parallel-chores) | **Unprompted:** three small chores "in parallel if it helps". Does it load, and size the workers to the job? | **3/3** (fired 3/3) | 0/3 (routing alone 3/3) |
| [hard-task-tier](evals/hard-task-tier) | The agent knows its own tier: a fast model escalates hard work (to another CLI or a stronger model in its own harness) | **3/3** | 0/3 |
| [first-run-onboarding](evals/first-run-onboarding) | Reports what's really installed, invents nothing, offers once to create a roster, leaks no emails | **3/3** | 0/3 (0.33) |
| [failed-handoff-feedback](evals/failed-handoff-feedback) | After a misroute it re-routes correctly, offers feedback once in one line, and sends nothing without a yes | **3/3** | 0/3 (0.33) |
| [cross-vendor-review](evals/cross-vendor-review) | A second opinion goes to another vendor; if none is usable, it says so, labels any same-vendor fallback "not independent", and says how to get an independent one | **3/3** | 2/3 |
| [bulk-mechanical](evals/bulk-mechanical) | A 300-file rename goes to a named cheap/fast model, not a frontier one | 3/3 | 3/3 |
| [unrelated-no-trigger](evals/unrelated-no-trigger) | The skill stays out of an ordinary coding request | 3/3 | 3/3 |
| **Overall** | | **24/24 runs** | **8/24 runs** |

**Setup:** Claude Code 2.1.296 · agent model Sonnet · judge Opus (2-of-3 votes;
the two spontaneous cases grade the whole trace, the rest the final message) ·
3 runs per case per arm · billed to an API key: about $20 for all v3 runs,
including reruns. cross-vendor-review was re-graded in its own run after its
rubric changed (see below); all other numbers come from one full-suite run.

## What we learned getting here

The first passes were lower, and each fix came from reading the transcripts:

- **The description is the trigger.** v2 asked "does the skill load on its own
  when the task doesn't mention routing?" It didn't: **0/6**. The description
  listed what the skill *contains* and only mentioned subagents near the end.
  Rewritten to lead with when to load it ("Load BEFORE spawning subagents,
  splitting a task into parts, using the Agent/Task tool, or getting work
  reviewed"), it fired **6/6**, and the unrelated-task case still stayed 3/3
  (no over-triggering).
- **An absolute rule blocks work.** "Never review with your own vendor" made one
  agent stop and ask instead of reviewing when no other vendor was usable. The
  rule now prefers another vendor, falls back to a separate, stronger
  same-vendor reviewer labelled "not independent", and doesn't block. The
  cross-vendor rubric was then updated to accept that honest fallback (it had
  been failing answers that were, on reading, excellent), which also lets the
  baseline pass 2/3. That case separates the arms less than before.
- **The judge matters as much as the skill.** With a Haiku judge, a correct
  "I'm Sonnet, fast tier, escalate to Opus" answer was failed. With a Sonnet
  judge, two correct bulk-routing answers and an exact-template feedback offer
  were failed. The numbers above use Opus. Treat any single-judge number here
  as ±1 run per case.
- **A real gap it found:** when no other CLI was logged in, Sonnet sometimes
  decided to do hard work itself, forgetting it could escalate to a stronger
  model in its own harness. The routing rule now says so explicitly (1/3 → 3/3).
- **Instruction placement:** the feedback step was ignored while it sat at the
  end of the skill output, below the long snapshot. Moving it into the numbered
  steps fixed that.
- **A badly designed case:** the first feedback case used "Codex isn't logged
  in" as the failure. One agent rightly declined to send feedback, since that's
  the user's setup, not a routing default. The case now uses a real misroute
  (a cross-module refactor sent to a fast model).

## Interaction with other skills

Tested next to obra/superpowers' `requesting-code-review`,
`dispatching-parallel-agents` and `subagent-driven-development`: agent-roster
loaded first in every run and the others never loaded after it, so the
superpowers review *procedure* got skipped. agent-roster now says it picks
**who**, and to also load a skill that covers **how**. That co-loaded the
review skill in 1 of 3 runs (from 0 of 9), so it's a direction, not a fix yet.
If you use both, consider saying "use superpowers for the review process" in
your roster.

## What this does and doesn't show

- Each run gets a **fresh, empty HOME** and a sandbox without network, so the
  agent sees the CLIs on PATH but no logins and no personal roster. This
  measures the **new-user experience** (the example roster), not a tuned setup.
- Only Claude (Sonnet) is the evaluated agent so far. Running the same cases
  from Codex, Cursor and Antigravity is planned.
- Six cases is a smoke test of the routing behaviour, not a benchmark of which
  model is best at what.

## Reproduce

```sh
# The probe needs Bash; the harness sandboxes it (Linux: bubblewrap + socat)
claude plugin eval . --trust-plugin --runs 3 --model sonnet --judge-model opus \
  --allow-tools "Bash(node:*)" --threshold 0
```

Results land in `evals/results/<timestamp>/` (git-ignored).
