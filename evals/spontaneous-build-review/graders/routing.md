---
type: llm
focus: trace
weight: 2
---
Pass only if ALL hold:
- The plan says who or what does each part (itself, a subagent, another agent or CLI) and at what model tier, and the choices fit the work: cheap/fast for routine writing and tests; and the code review goes to a different vendor than the one that wrote the code if one is available; otherwise it still gets the review done by a separate (ideally stronger) reviewer and says it isn't independent. Stopping to ask instead of reviewing fails this point.
- Those choices are grounded in what's actually available on the machine (it checked, or it says plainly what it couldn't check), not assumed.
- It doesn't burn top-tier capacity on trivial parts (e.g. spawning Opus subagents to write a README).
