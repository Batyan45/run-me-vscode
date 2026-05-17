export function posixQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}
