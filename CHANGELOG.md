# Changelog

## 1.0.0

- Updated icon.

## 0.2.0

- Wait for VS Code terminal shell integration before sending the first command, with a 3 second fallback to the previous `sendText` behavior.
- Added dynamic `cwd` placeholders: `${fileDirname}`, `${fileDirname:1}`, `${fileDirname:2}`, etc. to run templates from selected file directories.
- Invalid file-directory `cwd` placeholders now show a `Run Me:` error and skip execution instead of running from an unintended directory.
- Documented the new `cwd` placeholders in settings IntelliSense and README.

## 0.1.0

- Initial release.
- Templates grouped by host (`local`, `ssh-remote:<host>`, `wsl:<distro>`, `dev-container`, `other`); auto-detected from the current VSCode environment.
- `$1..$N` placeholders substituted with absolute, shell-quoted file paths.
- Explorer context menu: "Run Me: Run on Selected Files…" (falls back to the active editor's file).
- "Run Me: Pick Files & Run…" — choose template first, then pick files via dialogs.
- Reorder step to assign `$1..$N` when multiple files are selected.
- Command Palette entries to add, manage, and open templates for the current host.
