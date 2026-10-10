# Evals

Does loading agent-roster actually change what an agent recommends? The suite
in [`evals/`](evals) runs each case with the skill and without it (a no-skill
baseline), using `claude plugin eval`.

## Latest results (2026-10-10)

| Case | What it checks | With skill | Without |
|---|---|---|---|
| [cross-vendor-review](evals/cross-vendor-review) | A second opinion goes to a *different* vendor, read-only, with a real command | **3/3** | 0/3 |
| [hard-task-tier](evals/hard-task-tier) | The agent knows its own tier: a fast model escalates hard work (to another CLI or a stronger model in its own harness) | **3/3** | 0/3 |
| [first-run-onboarding](evals/first-run-onboarding) | Reports what's really installed, invents nothing, offers once to create a roster, leaks no emails | **3/3** | 0/3 (0.33) |
| [failed-handoff-feedback](evals/failed-handoff-feedback) | After a misroute it re-routes correctly, offers feedback once in one line, and sends nothing without a yes | **3/3** | 0/3 (0.33) |
| [bulk-mechanical](evals/bulk-mechanical) | A 300-file rename goes to a named cheap/fast model, not a frontier one | 3/3 | 3/3 |
| [unrelated-no-trigger](evals/unrelated-no-trigger) | The skill stays out of an ordinary coding request | 3/3 | 3/3 |
| **Overall** | | **18/18 runs** | **6/18 runs** (mean Δ +0.56) |

**Setup:** Claude Code 2.1.296 · agent model Sonnet · judge Opus (LLM graders
vote 2 of 3) · 3 runs per case per arm · 157 s · about $3.30 in
API-equivalent cost.

Without the skill, Sonnet gave reasonable generic advice ("use a codemod",
"ask another model") but never named an available agent from another vendor,
never placed itself in a tier, and could only guess at what was installed.
`bulk-mechanical` and `unrelated-no-trigger` don't separate the arms: a plain
"use a fast model and a codemod" answer is already good for a rename, and the
negative case is meant to pass both ways.

## What we learned getting here

The first passes were lower, and each fix came from reading the transcripts:

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
