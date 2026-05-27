# Run Me on Files

Right-click selected files in the VSCode Explorer to run user-defined commands with the files as arguments.

## How it works

1. You define **run templates** once, in your VSCode user settings. Templates are grouped by host: each top-level key identifies an environment (`local`, `ssh-remote:<host>`, `wsl:<distro>`, `dev-container`, `other`), and each value is a list of templates available **only** on that host. Each template is a shell command that uses `$1`, `$2`, … as placeholders for the files you'll select later:

   ```json
   "runMe.templates": {
     "local": [
       { "name": "Process file with output", "command": "python run.py --file $1 --output $2" },
       { "name": "Echo one", "command": "echo $1" }
     ],
     "ssh-remote:prod-1": [
       { "name": "Tail log", "command": "tail -f $1" }
     ],
     "wsl:Ubuntu": [
       { "name": "Open in VLC", "command": "vlc $1" }
     ]
   }
   ```

2. In the Explorer, select one or more files, right-click, and choose **Run Me on Files: Run on Selected Files…**.
3. Run Me on Files detects the current environment and looks at templates under that host key only. It filters them down to those whose argument count exactly matches the number of selected files, then either runs the only match or shows a picker.
4. If you selected more than one file, a reorder step lets you assign which file becomes `$1`, `$2`, … using ↑/↓ buttons.
5. The chosen command runs in an integrated terminal named **Run Me on Files**, with each `$N` replaced by the absolute, shell-quoted path of the corresponding selected file.

## Commands

All available from the Command Palette (`Ctrl+Shift+P`):

| Command | What it does |
| --- | --- |
| `Run Me: Run on Selected Files…` | Same as the context-menu entry. Falls back to the active editor's file if nothing is selected in the Explorer. |
| `Run Me: Pick Files & Run…` | Choose a template first, then pick its `$1`…`$N` files via open dialogs. |
| `Run Me: Add Template…` | Walk through name → command → optional `cwd` with workspace/file-directory placeholders. Saved under the current host key. |
| `Run Me: Manage Templates…` | Pick a template (for the current host) to edit or delete. |
| `Run Me: Open Templates in settings.json` | Jump straight to the `runMe.templates` entry in your settings. |

## Template fields

| Field | Required | Description |
| --- | --- | --- |
| `name` | yes | Display name shown in the picker. |
| `command` | yes | Shell command. Use `$1`, `$2`, … as placeholders. The number of distinct `$N` references (highest `N`) is the template's **arity**. |
| `cwd` | no | Working directory. Supports `${workspaceFolder}`, `${fileDirname}` / `${fileDirname:1}` for the directory of `$1`, and `${fileDirname:2}` etc. for other selected files. Defaults to the workspace root. |

## Host scoping

Run Me on Files auto-detects the active VSCode environment and uses the matching key:

| Environment | Host key |
| --- | --- |
| Local window | `local` |
| WSL | `wsl:<distro>` (e.g. `wsl:Ubuntu`) |
| Remote SSH | `ssh-remote:<host>` (lowercased) |
| Dev Container / Attached Container / Codespaces | `dev-container` |
| Anything else | `other` |

`Add Template…` and `Manage Templates…` always act on the current host's list, so templates added in a remote window don't leak into your local picker (and vice versa).

## Notes

- Templates are stored under `runMe.templates` in your **user** settings, so they sync via Settings Sync and are shared across all your workspaces.
- Paths substituted into `$N` are absolute and POSIX single-quoted, so spaces and special characters work correctly in bash/zsh integrated terminals.
- Use `cwd: "${fileDirname:1}"` to run a template from the directory containing `$1`, or `cwd: "${fileDirname:2}"` for `$2`.
- The Explorer context-menu entry is shown for file selections (`resourceScheme == 'file' && !explorerResourceIsFolder`). If no templates match the selection count for the current host, Run Me on Files offers to create one.

## Development

```bash
npm install
npm run compile          # type-check, lint, bundle
npm run watch            # watch mode for development
# Press F5 in VSCode to launch an Extension Development Host
```

## License

MIT
