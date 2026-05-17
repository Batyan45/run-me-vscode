import * as vscode from 'vscode';
import {
	Template,
	loadHostTemplates,
	saveTemplates,
	computeArity,
} from '../templates';
import { currentEnvironment, currentHostKey, describeEnvironment } from '../environment';

export async function addTemplate(suggestedArity?: number): Promise<void> {
	const env = currentEnvironment();
	const hostKey = currentHostKey(env);
	const envLabel = describeEnvironment(env);

	const name = await vscode.window.showInputBox({
		title: `Run Me — new template (1/3) for ${envLabel}: name`,
		prompt: 'A short display name (shown in the picker)',
		placeHolder: 'Process file with output',
		validateInput: value => (value.trim().length === 0 ? 'Name cannot be empty.' : undefined),
	});
	if (!name) {
		return;
	}

	const placeholderHint = suggestedArity
		? Array.from({ length: suggestedArity }, (_, i) => `$${i + 1}`).join(' ')
		: '$1';

	const command = await vscode.window.showInputBox({
		title: `Run Me — new template (2/3) for ${envLabel}: command`,
		prompt: 'Shell command. Use $1, $2, … for selected file paths.',
		placeHolder: `python run.py --file ${placeholderHint}`,
		validateInput: value => {
			if (value.trim().length === 0) {
				return 'Command cannot be empty.';
			}
			if (computeArity(value) === 0) {
				return 'Command must reference at least one placeholder ($1, $2, …).';
			}
			return undefined;
		},
	});
	if (!command) {
		return;
	}

	const cwd = await vscode.window.showInputBox({
		title: `Run Me — new template (3/3) for ${envLabel}: working directory (optional)`,
		prompt: 'Leave empty for workspace root. Supports ${workspaceFolder}.',
		placeHolder: '${workspaceFolder}',
	});
	if (cwd === undefined) {
		return; // user pressed Escape
	}

	const template: Template = { name: name.trim(), command: command.trim() };
	if (cwd.trim().length > 0) {
		template.cwd = cwd.trim();
	}

	const list = loadHostTemplates(hostKey).map(toTemplate);
	list.push(template);
	await saveTemplates(list, hostKey);
	void vscode.window.showInformationMessage(
		`Run Me: template "${template.name}" added for ${envLabel}.`
	);
}

export async function manageTemplates(): Promise<void> {
	const env = currentEnvironment();
	const hostKey = currentHostKey(env);
	const envLabel = describeEnvironment(env);
	const list = loadHostTemplates(hostKey);

	if (list.length === 0) {
		const choice = await vscode.window.showInformationMessage(
			`Run Me: no templates yet for ${envLabel}.`,
			'Add one…'
		);
		if (choice === 'Add one…') {
			await addTemplate();
		}
		return;
	}

	const items = list.map((t, index) => ({
		label: t.name,
		description: `arity ${t.arity}`,
		detail: t.command,
		index,
	}));
	const picked = await vscode.window.showQuickPick(items, {
		placeHolder: `Select a template to edit or delete — ${envLabel}`,
	});
	if (!picked) {
		return;
	}

	const action = await vscode.window.showQuickPick(
		[
			{ label: '$(edit) Edit', value: 'edit' as const },
			{ label: '$(trash) Delete', value: 'delete' as const },
		],
		{ placeHolder: `What to do with "${picked.label}"?` }
	);
	if (!action) {
		return;
	}

	if (action.value === 'delete') {
		const confirm = await vscode.window.showWarningMessage(
			`Delete template "${picked.label}" from ${envLabel}?`,
			{ modal: true },
			'Delete'
		);
		if (confirm !== 'Delete') {
			return;
		}
		const next = list.map(toTemplate);
		next.splice(picked.index, 1);
		await saveTemplates(next, hostKey);
		void vscode.window.showInformationMessage(`Run Me: template "${picked.label}" deleted.`);
		return;
	}

	await editAt(list.map(toTemplate), picked.index, hostKey, envLabel);
}

async function editAt(list: Template[], index: number, hostKey: string, envLabel: string): Promise<void> {
	const current = list[index];

	const name = await vscode.window.showInputBox({
		title: `Run Me — edit template (1/3) for ${envLabel}: name`,
		value: current.name,
		validateInput: v => (v.trim().length === 0 ? 'Name cannot be empty.' : undefined),
	});
	if (!name) {
		return;
	}

	const command = await vscode.window.showInputBox({
		title: `Run Me — edit template (2/3) for ${envLabel}: command`,
		value: current.command,
		validateInput: v => {
			if (v.trim().length === 0) {
				return 'Command cannot be empty.';
			}
			if (computeArity(v) === 0) {
				return 'Command must reference at least one placeholder ($1, $2, …).';
			}
			return undefined;
		},
	});
	if (!command) {
		return;
	}

	const cwd = await vscode.window.showInputBox({
		title: `Run Me — edit template (3/3) for ${envLabel}: working directory (optional)`,
		value: current.cwd ?? '',
		prompt: 'Leave empty for workspace root.',
	});
	if (cwd === undefined) {
		return;
	}

	const updated: Template = { name: name.trim(), command: command.trim() };
	if (cwd.trim().length > 0) {
		updated.cwd = cwd.trim();
	}
	list[index] = updated;
	await saveTemplates(list, hostKey);
	void vscode.window.showInformationMessage(`Run Me: template "${updated.name}" updated.`);
}

export async function openSettings(): Promise<void> {
	await vscode.commands.executeCommand('workbench.action.openSettings', 'runMe.templates');
}

function toTemplate(t: Template & { arity?: number }): Template {
	const base: Template = { name: t.name, command: t.command };
	if (t.cwd) {
		base.cwd = t.cwd;
	}
	return base;
}
