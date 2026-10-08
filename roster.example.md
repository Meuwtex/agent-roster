## Roster (example: copy to ~/.config/agent-roster/roster.md and make it yours)

Last reviewed: YYYY-MM-DD. Live status above overrides anything here.

### What I pay for

| Resource | Plan | Billing | Notes |
|---|---|---|---|
| Claude Code | Max / Pro / API | monthly | main driver? |
| Codex CLI | ChatGPT Plus / Pro | monthly | one CODEX_HOME per account |
| Cursor | Pro / Pro+ / Ultra | monthly or annual | annual = sunk cost, use it |
| Antigravity (agy) / Gemini | Google AI Pro / free | monthly | also serves some Claude/GPT-OSS models |
| Local | free | — | which GPU, how much VRAM is safe to use |

### Routing: by task, relative to the model asking

Work out your model, vendor and tier first: **frontier** (Opus, GPT high
effort, Gemini Pro) or **fast** (Sonnet, Haiku, Flash, mini, Composer, local).

| Task | Ranked targets | Rules |
|---|---|---|
| Hard implementation, debugging, architecture | frontier models: Claude (Opus) ≈ Codex (high effort) > Gemini Pro (agy) > Cursor with a frontier model | A fast-tier model escalates rather than attempts it. A frontier model that already holds the context does it itself. |
| Review / second opinion | a vendor **other than yours** | Never review with your own vendor. Read-only; the caller applies fixes. |
| Bulk mechanical edits, search, extraction | cheap fast models: Cursor's own models > Gemini Flash (agy or Cursor) > fast subagents in your harness > local | Don't spend frontier quota on these. |
| Async, self-contained tasks on a GitHub repo | Jules > a background CLI run | Code leaves the machine. |
| Very long context, video/image input | Gemini Pro (agy) | |
| Private, offline, trivial | local models | |

Quota tiebreaks: when an account's short window is over ~80%, use another
account or vendor. Prefer sunk-cost plans when quality is equal.

### Usage rules

- Ask before more than N parallel subagents, or max-effort top-tier models.
- Use the cheapest model and effort that still does the job well.

### Track record (one line per delegated job: date, who, task, how it went)

- YYYY-MM-DD codex exec (read-only): reviewed X, found Y real issues; good value.
