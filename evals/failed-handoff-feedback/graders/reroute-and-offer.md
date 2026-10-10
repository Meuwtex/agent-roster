---
type: llm
weight: 2
---
Pass only if ALL hold:
- It re-routes this kind of task to a frontier-tier option (e.g. Opus, a Codex model at high effort, Gemini Pro), or says which frontier option to use once it's available, and explains why: cross-module type changes need reasoning, so they aren't bulk mechanical work.
- Because a routing pick went wrong, it offers ONCE, briefly, to send a note about the misroute to the skill's maintainers (asking yes / not now / never, or equivalent). It does not send anything without the user's yes.
- The feedback offer is short and doesn't dominate the answer.
