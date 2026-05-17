import * as vscode from 'vscode';

export interface Template {
	name: string;
	command: string;
	cwd?: string;
}

export interface ParsedTemplate extends Template {
	arity: number;
}

const SECTION = 'runMe';
const KEY = 'templates';

type TemplateMap = { [hostKey: string]: Template[] };

export function loadHostTemplates(hostKey: string): ParsedTemplate[] {
	const map = readMap();
	const list = map[hostKey];
	if (!Array.isArray(list)) {
		return [];
	}
	return list
		.filter((t): t is Template =>
			!!t && typeof t.name === 'string' && typeof t.command === 'string'
		)
		.map(normalize)
		.map(parse);
}

export async function saveTemplates(list: Template[], hostKey: string): Promise<void> {
	const map = readMap();
	if (list.length === 0) {
		delete map[hostKey];
	} else {
		map[hostKey] = list.map(normalize);
	}
	await vscode.workspace
		.getConfiguration(SECTION)
		.update(KEY, map, vscode.ConfigurationTarget.Global);
}

function readMap(): TemplateMap {
	const raw = vscode.workspace.getConfiguration(SECTION).get<unknown>(KEY);
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return {};
	}
	return { ...(raw as TemplateMap) };
}

function normalize(t: Template): Template {
	const out: Template = { name: t.name, command: t.command };
	if (typeof t.cwd === 'string' && t.cwd.length > 0) {
		out.cwd = t.cwd;
	}
	return out;
}

export function parse(t: Template): ParsedTemplate {
	return { ...t, arity: computeArity(t.command) };
}

export function computeArity(command: string): number {
	const re = /\$(\d+)/g;
	let max = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(command)) !== null) {
		const n = parseInt(m[1], 10);
		if (n > max) {
			max = n;
		}
	}
	return max;
}

export function matchingFor(templates: ParsedTemplate[], fileCount: number): ParsedTemplate[] {
	return templates.filter(t => t.arity === fileCount);
}
