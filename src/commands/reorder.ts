import * as path from 'path';
import * as vscode from 'vscode';
import { ParsedTemplate } from '../templates';

interface ReorderItem extends vscode.QuickPickItem {
	index: number;
}

const UP_BUTTON: vscode.QuickInputButton = {
	iconPath: new vscode.ThemeIcon('arrow-up'),
	tooltip: 'Move up',
};

const DOWN_BUTTON: vscode.QuickInputButton = {
	iconPath: new vscode.ThemeIcon('arrow-down'),
	tooltip: 'Move down',
};

export async function reorderFiles(
	template: ParsedTemplate,
	files: vscode.Uri[]
): Promise<vscode.Uri[] | undefined> {
	if (files.length < 2) {
		return files;
	}

	const workspaceRoot =
		vscode.workspace.getWorkspaceFolder(files[0])?.uri.fsPath ??
		vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

	const order = files.slice();

	return new Promise<vscode.Uri[] | undefined>(resolve => {
		const quickPick = vscode.window.createQuickPick<ReorderItem>();
		quickPick.title = `Run Me: ${template.name} — reorder files`;
		quickPick.placeholder = 'Используй ↑/↓ у строк, чтобы поменять порядок. Enter — запустить, Esc — отмена';
		quickPick.canSelectMany = false;
		quickPick.ignoreFocusOut = true;
		quickPick.matchOnDescription = false;
		quickPick.matchOnDetail = false;
		quickPick.items = buildItems(order, workspaceRoot);

		let settled = false;
		const settle = (value: vscode.Uri[] | undefined) => {
			if (settled) {
				return;
			}
			settled = true;
			resolve(value);
		};

		quickPick.onDidTriggerItemButton(e => {
			const i = e.item.index;
			const isUp = e.button === UP_BUTTON;
			const target = isUp ? i - 1 : i + 1;
			if (target < 0 || target >= order.length) {
				return;
			}
			[order[i], order[target]] = [order[target], order[i]];
			const newItems = buildItems(order, workspaceRoot);
			quickPick.items = newItems;
			quickPick.activeItems = [newItems[target]];
		});

		quickPick.onDidAccept(() => {
			settle(order.slice());
			quickPick.hide();
		});

		quickPick.onDidHide(() => {
			settle(undefined);
			quickPick.dispose();
		});

		quickPick.show();
	});
}

function buildItems(order: vscode.Uri[], workspaceRoot: string | undefined): ReorderItem[] {
	return order.map((uri, i) => {
		const buttons: vscode.QuickInputButton[] = [];
		if (i > 0) {
			buttons.push(UP_BUTTON);
		}
		if (i < order.length - 1) {
			buttons.push(DOWN_BUTTON);
		}
		return {
			index: i,
			label: `$${i + 1} → ${path.basename(uri.fsPath)}`,
			description: describePath(uri.fsPath, workspaceRoot),
			buttons,
		};
	});
}

function describePath(fsPath: string, workspaceRoot: string | undefined): string {
	if (workspaceRoot && (fsPath === workspaceRoot || fsPath.startsWith(workspaceRoot + path.sep))) {
		const rel = path.relative(workspaceRoot, fsPath);
		return rel.length > 0 ? rel : fsPath;
	}
	return fsPath;
}
