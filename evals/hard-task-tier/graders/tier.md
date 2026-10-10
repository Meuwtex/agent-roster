---
type: llm
weight: 2
---
Pass only if ALL hold:
- The agent states which model it is (or its model family) and classifies its own tier (frontier vs fast).
- The decision is consistent with that tier: a fast-tier model (e.g. Sonnet, Haiku, Flash) recommends escalating to a frontier model (e.g. Opus, a Codex model at high effort, Gemini Pro); a frontier model (e.g. Opus) may take it on itself.
- It does not route this hard task to a fast/cheap model.
