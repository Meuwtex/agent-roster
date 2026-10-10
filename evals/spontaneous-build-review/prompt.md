---
name: spontaneous-build-review
tags: [spontaneous, delegation]
max_turns: 14
timeout_seconds: 420
allowed_tools: [Read, Glob, Grep, Skill, Bash, Agent, Write, Edit]
---
I need a small Python CLI, `csv2json`, that converts a CSV file to JSON (an array of objects, with a `--pretty` flag), plus pytest tests and a short README. Before you call it done, get the code reviewed. Plan how you'll split this up, then start.
