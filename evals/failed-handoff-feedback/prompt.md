---
name: failed-handoff-feedback
tags: [routing, feedback]
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill, Bash]
---
Earlier you routed a refactor of our auth types to Gemini Flash as "bulk mechanical work". It made a mess: it broke the type hierarchy across 14 files because the change needed real cross-module reasoning. Where should that kind of task go instead?
