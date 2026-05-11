import { ALL_CUSTOM_KEYS, CUSTOM_STRING_KEYS } from './timeline-style-config';

const DEFAULT_INDENT = '    ';

function quoteYamlString(value: string): string {
	return "'" + value.replace(/'/g, "''") + "'";
}

function unquoteYamlString(value: string): string {
	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1).replace(/''/g, "'");
	}
	if (value.startsWith('"') && value.endsWith('"')) {
		const inner = value.slice(1, -1);
		return inner.replace(/\\([\\nrt"])/g, (_match, ch: string) => {
			switch (ch) {
				case 'n': return '\n';
				case 'r': return '\r';
				case 't': return '\t';
				case '"': return '"';
				case '\\': return '\\';
			}
			return ch;
		});
	}
	return value;
}

function formatValueLine(indent: string, key: string, value: unknown): string | null {
	if (typeof value === 'number') return `${indent}${key}: ${value}`;
	if (typeof value === 'boolean') return `${indent}${key}: ${value}`;
	if (typeof value === 'string') return `${indent}${key}: ${quoteYamlString(value)}`;
	return null;
}

/** Inject/update/remove custom-key lines in a .base view YAML block.
 *
 *  - Keys in `overrides` with null/undefined values are removed from the YAML.
 *  - Other keys are inserted (appended) or updated in-place.
 *  - Any CUSTOM_STRING_KEYS found unquoted in the YAML are re-quoted, so the
 *    next round-trip through Bases' parser does not break on `:` / `|`.
 *
 *  Returns the possibly-mutated yaml and whether any change was made. */
export function applyCustomKeysToYaml(
	yaml: string,
	overrides: Record<string, unknown>,
	indent: string = DEFAULT_INDENT,
): { yaml: string; changed: boolean } {
	let next = yaml;
	let changed = false;

	for (const key of ALL_CUSTOM_KEYS) {
		if (!(key in overrides)) continue;
		const value = overrides[key];
		const existingPattern = new RegExp(`^${indent}${key}:\\s.*$`, 'm');

		if (value === null || value === undefined) {
			if (existingPattern.test(next)) {
				next = next.replace(existingPattern, '');
				changed = true;
			}
			continue;
		}

		const line = formatValueLine(indent, key, value);
		if (line == null) continue;

		const existingMatch = next.match(existingPattern);
		if (existingMatch) {
			if (existingMatch[0] === line) continue; // already up to date
			next = next.replace(existingPattern, line);
		} else {
			next = next.trimEnd() + '\n' + line + '\n';
		}
		changed = true;
	}

	for (const key of CUSTOM_STRING_KEYS) {
		if (key in overrides) continue;
		const unquotedPattern = new RegExp(`^${indent}${key}: (?!')(.+)$`, 'm');
		const match = unquotedPattern.exec(next);
		if (!match) continue;
		const line = `${indent}${key}: ${quoteYamlString(match[1].trim())}`;
		next = next.replace(unquotedPattern, line);
		changed = true;
	}

	return { yaml: next, changed };
}

export function readYamlKeyValue(
	yaml: string,
	key: string,
	indent: string = DEFAULT_INDENT,
): string | null {
	const pattern = new RegExp(`^${indent}${key}:\\s(.+)$`, 'm');
	const match = pattern.exec(yaml);
	if (!match) return null;
	return unquoteYamlString(match[1].trim());
}
