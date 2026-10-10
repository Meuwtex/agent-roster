---
type: llm
weight: 2
---
Pass only if ALL hold:
- The recommended reviewer is from a vendor other than Anthropic (e.g. OpenAI Codex, Google Gemini/Antigravity, or Cursor with a non-Claude model). Recommending Claude/Claude Code to review a Claude-written patch fails.
- The recommendation is grounded in what the agent observed was installed (or it says plainly that the tool isn't installed or logged in), not invented.
- It gives a concrete headless command, and the review is read-only (e.g. `codex exec -s read-only`, `agy --mode plan`, or an equivalent).
