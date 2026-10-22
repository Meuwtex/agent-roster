# Changelog

## 0.2.0 (2026-10-22)

- **Windows works.** npm installs CLIs (`codex`, `gemini`, `copilot`, …) as
  `.cmd` shims, and Node 18.20+ refuses to spawn those without a shell
  (`spawn EINVAL`), so every such CLI showed as "version unknown" or broken.
  The probe now runs them through `cmd.exe`. Also on Windows: the smoke test
  really runs against an empty home (`os.homedir()` ignores `HOME` there),
  the GPU line notes the desktop session, and `extras.mjs` / `extras.cmd` are
  accepted next to `extras.sh`.
- **Claude Code**: an API key (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` or
  `apiKeyHelper`) is reported as pay-as-you-go billing, since it changes the
  routing math; the default model from `settings.json` is shown; with no
  credentials file the macOS Keychain entry is read (untested on a Mac). The
  version no longer carries the "(Claude Code)" suffix.
- **Roster**: a one-line nudge when "Last reviewed" is more than 60 days old.
- `feedback.mjs` quotes the script path in the `--send` command it prints.
- **Tests and CI**: fixture tests with fake CLIs and fake auth/session files
  cover the Codex, Claude and Cursor parsers, the outdated check and the
  roster nudge; GitHub Actions runs them on Linux, macOS and Windows with
  Node 18, 20 and 22.

## 0.1.0 (2026-10-10)

- First release: live probe, personal roster, handoff recipes, feedback flow,
  and the `claude plugin eval` suite.
