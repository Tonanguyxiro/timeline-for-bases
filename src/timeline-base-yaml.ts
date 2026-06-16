import { ALL_CUSTOM_KEYS, CUSTOM_NUMERIC_KEYS, CUSTOM_STRING_KEYS } from './timeline-style-config';

const DEFAULT_INDENT = '    ';

function quoteYamlString(value: string): string {
	return "'" + value.replace(/'/g, "''") + "'";
}

/** Unquote a raw YAML scalar value: strips matching single/double quotes and
 *  un-escapes doubled single quotes (the inverse of quoteYamlString). */
function unquoteYamlScalar(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
		return trimmed.slice(1, -1).replace(/''/g, "'");
	}
	if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

/** Extract the persisted custom-key values from a .base view YAML block.
 *
 *  Returns each key in the same in-memory form `setViewConfigValue` would store:
 *  - CUSTOM_NUMERIC_KEYS → number
 *  - showColors → boolean
 *  - everything else → string (quotes stripped)
 *
 *  Keys absent from the YAML are omitted. Used to hydrate the view's override
 *  map on load so that a later Bases save (which strips unknown keys) can be
 *  fully repaired rather than losing settings from previous sessions. */
export function extractCustomKeysFromYaml(
	yaml: string,
	indent: string = DEFAULT_INDENT,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	const numericKeys = new Set<string>(CUSTOM_NUMERIC_KEYS);
	for (const key of ALL_CUSTOM_KEYS) {
		const pattern = new RegExp(`^${indent}${key}:\\s(.+)$`, 'm');
		const match = pattern.exec(yaml);
		if (!match) continue;
		const rawValue = match[1].trim();
		if (numericKeys.has(key)) {
			const num = Number(rawValue);
			if (!Number.isNaN(num)) result[key] = num;
			continue;
		}
		if (key === 'showColors') {
			result[key] = rawValue === 'true';
			continue;
		}
		result[key] = unquoteYamlScalar(rawValue);
	}
	return result;
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
