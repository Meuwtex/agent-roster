---
type: llm
focus: trace
weight: 2
---
Pass only if ALL hold:
- It decides deliberately whether to parallelize and with what: for three small, independent chores, cheap/fast workers (fast-tier subagents, a cheap external agent if available, or just doing them itself because they're small) are appropriate; spinning up top-tier/max-effort workers for these is not.
- The decision is grounded in what's actually available or explicitly reasoned (cost vs benefit), not a reflexive "spawn three subagents".
- It actually makes progress on the chores (or delegates them) rather than only planning.
