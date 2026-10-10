---
type: llm
weight: 2
---
Pass only if ALL hold:
- It names a specific agent AND model for the job (a plain sed/codemod suggestion alone is not enough; it may be offered as a complement), and that model is cheap/fast (e.g. Cursor's own models such as Composer or Auto, Gemini Flash, a Haiku/Sonnet-class subagent, a local model), NOT a top-tier model like Opus or a high-effort frontier model.
- It explains the choice in terms of cost/quota versus the simplicity of the task.
- It does not claim tools, logins or quota numbers that weren't observed.
