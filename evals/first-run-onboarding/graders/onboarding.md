---
type: llm
weight: 2
---
Pass only if ALL hold:
- The answer reports what was actually detected (installed CLIs, login state, quota where shown) and does not invent subscriptions, plans or quota that weren't in the snapshot. If little or nothing is logged in, it says so.
- It notices there is no personal roster yet and offers (once, briefly) to create one from the example. It does not create it without asking.
- It does not present the example roster's plans as the user's actual subscriptions.
