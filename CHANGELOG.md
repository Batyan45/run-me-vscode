# Changelog

## 0.1.0

- Initial release.
- Templates grouped by host (`local`, `ssh-remote:<host>`, `wsl:<distro>`, `dev-container`, `other`); auto-detected from the current VSCode environment.
- `$1..$N` placeholders substituted with absolute, shell-quoted file paths.
- Explorer context menu: "Run Me: Run on Selected Files…" (falls back to the active editor's file).
- "Run Me: Pick Files & Run…" — choose template first, then pick files via dialogs.
- Reorder step to assign `$1..$N` when multiple files are selected.
- Command Palette entries to add, manage, and open templates for the current host.
