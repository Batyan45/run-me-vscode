import * as vscode from 'vscode';
import { runOnSelection, runWithPicker } from './commands/run';
import { addTemplate, manageTemplates, openSettings } from './commands/manage';
import { registerTerminalLifecycle } from './runner';

export function activate(context: vscode.ExtensionContext): void {
	registerTerminalLifecycle(context);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'runMe.run',
			(clicked?: vscode.Uri, selected?: vscode.Uri[]) => runOnSelection(clicked, selected)
		),
		vscode.commands.registerCommand('runMe.pickAndRun', () => runWithPicker()),
		vscode.commands.registerCommand('runMe.addTemplate', () => addTemplate()),
		vscode.commands.registerCommand('runMe.manageTemplates', () => manageTemplates()),
		vscode.commands.registerCommand('runMe.openSettings', () => openSettings())
	);
}

export function deactivate(): void {}
