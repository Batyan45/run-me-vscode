import * as vscode from 'vscode';

export type EnvKind = 'local' | 'wsl' | 'ssh-remote' | 'dev-container' | 'other';

export interface Environment {
	kind: EnvKind;
	host?: string;
}

export function currentEnvironment(): Environment {
	const remote = vscode.env.remoteName;
	if (!remote) {
		return { kind: 'local' };
	}
	if (remote === 'wsl') {
		return { kind: 'wsl', host: wslDistro() };
	}
	if (remote === 'ssh-remote') {
		return { kind: 'ssh-remote', host: sshHostFromAuthority() };
	}
	if (remote === 'dev-container' || remote === 'attached-container' || remote === 'codespaces') {
		return { kind: 'dev-container' };
	}
	return { kind: 'other' };
}

export function currentHostKey(env: Environment = currentEnvironment()): string {
	switch (env.kind) {
		case 'local':
			return 'local';
		case 'ssh-remote':
			return env.host ? `ssh-remote:${env.host.toLowerCase()}` : 'ssh-remote';
		case 'wsl':
			return env.host ? `wsl:${env.host}` : 'wsl';
		case 'dev-container':
			return 'dev-container';
		default:
			return 'other';
	}
}

export function describeEnvironment(env: Environment): string {
	switch (env.kind) {
		case 'local': return 'Local';
		case 'wsl': return env.host ? `WSL: ${env.host}` : 'WSL';
		case 'ssh-remote': return env.host ? `SSH: ${env.host}` : 'SSH';
		case 'dev-container': return 'Dev Container';
		default: return 'Remote';
	}
}

function sshHostFromAuthority(): string | undefined {
	const authority =
		vscode.workspace.workspaceFolders?.[0]?.uri.authority
		?? vscode.window.activeTextEditor?.document.uri.authority;
	if (!authority) {
		return undefined;
	}
	const plus = authority.indexOf('+');
	if (plus < 0) {
		return undefined;
	}
	const rest = authority.slice(plus + 1);
	const eq = rest.indexOf('=');
	const raw = (eq < 0 ? rest : rest.slice(0, eq)) || undefined;
	if (!raw) {
		return undefined;
	}
	return tryHexDecode(raw) ?? raw;
}

function tryHexDecode(value: string): string | undefined {
	if (value.length < 2 || value.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(value)) {
		return undefined;
	}
	try {
		const decoded = Buffer.from(value, 'hex').toString('utf8');
		if (decoded.length === 0) {
			return undefined;
		}
		// Accept only printable ASCII (host names, labels) — anything else means hex was coincidental.
		if (!/^[\x20-\x7e]+$/.test(decoded)) {
			return undefined;
		}
		return decoded;
	} catch {
		return undefined;
	}
}

function wslDistro(): string | undefined {
	const authority = vscode.workspace.workspaceFolders?.[0]?.uri.authority;
	if (!authority) {
		return undefined;
	}
	const plus = authority.indexOf('+');
	if (plus < 0) {
		return undefined;
	}
	return authority.slice(plus + 1) || undefined;
}
