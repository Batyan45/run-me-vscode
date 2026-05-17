import * as vscode from 'vscode';
import { loadHostTemplates, matchingFor, ParsedTemplate } from '../templates';
import { run as runTemplate } from '../runner';
import { addTemplate } from './manage';
import { currentEnvironment, currentHostKey, describeEnvironment } from '../environment';
import { reorderFiles } from './reorder';

export async function runOnSelection(
	clicked: vscode.Uri | undefined,
	selected: vscode.Uri[] | undefined
): Promise<void> {
	const files = await resolveFileSelection(clicked, selected);
	if (files.length === 0) {
		void vscode.window.showWarningMessage(
			'Run Me: select one or more files in the Explorer (or open a file) before running.'
		);
		return;
	}

	const env = currentEnvironment();
	const envLabel = describeEnvironment(env);
	const templates = loadHostTemplates(currentHostKey(env));
	const matches = matchingFor(templates, files.length);

	if (matches.length === 0) {
		const action = await vscode.window.showInformationMessage(
			`Run Me: no templates take exactly ${files.length} file${files.length === 1 ? '' : 's'} for ${envLabel}.`,
			'Create one…'
		);
		if (action === 'Create one…') {
			await addTemplate(files.length);
		}
		return;
	}

	const choice = matches.length === 1 ? matches[0] : await pickTemplate(matches, envLabel);
	if (!choice) {
		return;
	}

	const ordered = await reorderFiles(choice, files);
	if (!ordered) {
		return;
	}

	runTemplate(choice, ordered);
}

export async function runWithPicker(): Promise<void> {
	const env = currentEnvironment();
	const envLabel = describeEnvironment(env);
	const templates = loadHostTemplates(currentHostKey(env));

	if (templates.length === 0) {
		const action = await vscode.window.showInformationMessage(
			`Run Me: no templates defined for ${envLabel}.`,
			'Create one…'
		);
		if (action === 'Create one…') {
			await addTemplate();
		}
		return;
	}

	const choice = await pickAnyTemplate(templates, envLabel);
	if (!choice) {
		return;
	}

	const files: vscode.Uri[] = [];
	let defaultUri: vscode.Uri | undefined =
		vscode.window.activeTextEditor
			? parentUri(vscode.window.activeTextEditor.document.uri)
			: vscode.workspace.workspaceFolders?.[0]?.uri;

	for (let i = 1; i <= choice.arity; i++) {
		const picked = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			openLabel: `Use as $${i}`,
			title: `Run Me: ${choice.name} — choose file for $${i} (${i}/${choice.arity})`,
			defaultUri,
		});
		if (!picked || picked.length === 0) {
			return;
		}
		const file = picked[0];
		files.push(file);
		defaultUri = parentUri(file);
	}

	runTemplate(choice, files);
}

function parentUri(uri: vscode.Uri): vscode.Uri {
	return vscode.Uri.joinPath(uri, '..');
}

async function resolveFileSelection(
	clicked: vscode.Uri | undefined,
	selected: vscode.Uri[] | undefined
): Promise<vscode.Uri[]> {
	const raw = (selected && selected.length > 0)
		? selected
		: clicked
			? [clicked]
			: vscode.window.activeTextEditor
				? [vscode.window.activeTextEditor.document.uri]
				: [];

	const files: vscode.Uri[] = [];
	for (const uri of raw) {
		if (uri.scheme !== 'file') {
			continue;
		}
		try {
			const stat = await vscode.workspace.fs.stat(uri);
			if (stat.type === vscode.FileType.File) {
				files.push(uri);
			}
		} catch {
			// Skip unreadable entries silently.
		}
	}
	return files;
}

function pickTemplate(
	matches: ParsedTemplate[],
	envLabel: string
): Thenable<ParsedTemplate | undefined> {
	const items = matches.map(t => ({
		label: t.name,
		description: t.command,
		template: t,
	}));
	return vscode.window
		.showQuickPick(items, { placeHolder: `Select a Run Me template — ${envLabel}` })
		.then(picked => picked?.template);
}

function pickAnyTemplate(
	templates: ParsedTemplate[],
	envLabel: string
): Thenable<ParsedTemplate | undefined> {
	const items = templates.map(t => ({
		label: t.name,
		description: `${t.arity} arg${t.arity === 1 ? '' : 's'} — ${t.command}`,
		template: t,
	}));
	return vscode.window
		.showQuickPick(items, {
			placeHolder: `Select a Run Me template, then pick its files — ${envLabel}`,
		})
		.then(picked => picked?.template);
}
