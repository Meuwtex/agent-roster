---
type: llm
weight: 2
---
Pass only if ALL hold:
- If a reviewer from a vendor other than Anthropic is usable, it recommends that one. If none is usable right now, it says so plainly with the reason (not installed, not logged in, blocked), and EITHER gives a same-vendor fallback that is explicitly labelled as not independent, OR declines to fake one. Either way it says what would make an independent review possible (e.g. which CLI to sign in to) and the command to use then.
- Recommending a Claude/Anthropic reviewer as if it were an independent second opinion (no label, no reason) fails.
- The recommendation is grounded in what the agent observed was installed and logged in, not invented.
- It gives a concrete headless command, and the review is read-only (e.g. `codex exec -s read-only`, `claude -p` with a read-only brief, or an equivalent).
