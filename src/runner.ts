import * as vscode from 'vscode';
import * as path from 'path';
import { posixQuote } from './util/shellQuote';
import { ParsedTemplate } from './templates';

const TERMINAL_NAME = 'Run Me';
const SHELL_INTEGRATION_TIMEOUT_MS = 3000;

let terminal: vscode.Terminal | undefined;

type CwdResolution =
	| { cwd: string | undefined; error?: undefined }
	| { cwd?: undefined; error: string };

export function registerTerminalLifecycle(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.window.onDidCloseTerminal(closed => {
			if (closed === terminal) {
				terminal = undefined;
			}
		})
	);
}

export function buildCommand(template: ParsedTemplate, files: vscode.Uri[]): string {
	return template.command.replace(/\$(\d+)/g, (_, digits: string) => {
		const idx = parseInt(digits, 10) - 1;
		const uri = files[idx];
		return uri ? posixQuote(uri.fsPath) : '';
	});
}

export function resolveCwd(template: ParsedTemplate, files: vscode.Uri[]): CwdResolution {
	const workspaceFolder =
		(files[0] && vscode.workspace.getWorkspaceFolder(files[0])?.uri.fsPath) ??
		vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

	if (template.cwd && template.cwd.trim().length > 0) {
		const expanded = expandCwd(template.cwd, files, workspaceFolder);
		if (expanded.error) {
			return expanded;
		}
		return { cwd: expanded.cwd };
	}
	return { cwd: workspaceFolder };
}

export async function run(template: ParsedTemplate, files: vscode.Uri[]): Promise<void> {
	const command = buildCommand(template, files);
	const cwdResolution = resolveCwd(template, files);
	if (cwdResolution.error) {
		void vscode.window.showErrorMessage(cwdResolution.error);
		return;
	}
	const cwd = cwdResolution.cwd;

	if (!terminal) {
		terminal = vscode.window.createTerminal({ name: TERMINAL_NAME, cwd });
		terminal.show(true);
		await waitForShellIntegration(terminal);
		terminal.sendText(command, true);
		return;
	}

	terminal.show(true);
	if (cwd) {
		terminal.sendText(`cd ${posixQuote(cwd)} && ${command}`, true);
	} else {
		terminal.sendText(command, true);
	}
}

function expandCwd(
	cwd: string,
	files: vscode.Uri[],
	workspaceFolder: string | undefined
): CwdResolution {
	let error: string | undefined;
	let expanded = workspaceFolder
		? cwd.replace(/\$\{workspaceFolder\}/g, workspaceFolder)
		: cwd;

	expanded = expanded.replace(/\$\{fileDirname(?::(\d+))?\}/g, (token: string, digits: string | undefined) => {
		const fileNumber = digits ? parseInt(digits, 10) : 1;
		const uri = files[fileNumber - 1];
		if (!uri) {
			error = fileNumber < 1
				? `Run Me: cwd references ${token}, but file indexes start at 1.`
				: `Run Me: cwd references ${token}, but only ${files.length} file${files.length === 1 ? '' : 's'} selected.`;
			return token;
		}
		return path.dirname(uri.fsPath);
	});

	if (error) {
		return { error };
	}
	return { cwd: expanded };
}

async function waitForShellIntegration(term: vscode.Terminal): Promise<void> {
	if (term.shellIntegration) {
		return;
	}

	await new Promise<void>(resolve => {
		let settled = false;
		let disposable: vscode.Disposable | undefined;
		let timer: NodeJS.Timeout | undefined;

		const settle = () => {
			if (settled) {
				return;
			}
			settled = true;
			if (timer) {
				clearTimeout(timer);
			}
			disposable?.dispose();
			resolve();
		};

		disposable = vscode.window.onDidChangeTerminalShellIntegration(event => {
			if (event.terminal === term) {
				settle();
			}
		});
		timer = setTimeout(settle, SHELL_INTEGRATION_TIMEOUT_MS);
	});
}
