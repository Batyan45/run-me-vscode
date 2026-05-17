import * as vscode from 'vscode';
import { posixQuote } from './util/shellQuote';
import { ParsedTemplate } from './templates';

const TERMINAL_NAME = 'Run Me';

let terminal: vscode.Terminal | undefined;

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

export function resolveCwd(template: ParsedTemplate, files: vscode.Uri[]): string | undefined {
	const workspaceFolder =
		(files[0] && vscode.workspace.getWorkspaceFolder(files[0])?.uri.fsPath) ??
		vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

	if (template.cwd && template.cwd.trim().length > 0) {
		return workspaceFolder
			? template.cwd.replace(/\$\{workspaceFolder\}/g, workspaceFolder)
			: template.cwd;
	}
	return workspaceFolder;
}

export function run(template: ParsedTemplate, files: vscode.Uri[]): void {
	const command = buildCommand(template, files);
	const cwd = resolveCwd(template, files);

	if (!terminal) {
		terminal = vscode.window.createTerminal({ name: TERMINAL_NAME, cwd });
		terminal.show(true);
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
