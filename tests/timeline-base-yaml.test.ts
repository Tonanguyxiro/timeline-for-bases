import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { applyCustomKeysToYaml, extractCustomKeysFromYaml } from '../src/timeline-base-yaml';

const baseYaml = `views:
  - type: timeline
    name: Tasks
    startDate: note.start
    endDate: note.end
`;

test('appends custom string keys with single-quoted YAML when missing', () => {
	const { yaml, changed } = applyCustomKeysToYaml(baseYaml, {
		colorMap: 'High=#e03131;Low=#2f9e44',
	});
	assert.equal(changed, true);
	assert.match(yaml, /^ {4}colorMap: 'High=#e03131;Low=#2f9e44'$/m);
});

test('updates an existing custom key in place rather than appending a duplicate', () => {
	const yamlWithKey = baseYaml.trimEnd() + "\n    timeScale: 'week'\n";
	const { yaml, changed } = applyCustomKeysToYaml(yamlWithKey, { timeScale: 'day' });
	assert.equal(changed, true);
	assert.equal(yaml.match(/timeScale:/g)?.length, 1);
	assert.match(yaml, /^ {4}timeScale: 'day'$/m);
});

test('removes a custom key when its override is null or undefined', () => {
	const yamlWithKey = baseYaml.trimEnd() + "\n    colorMap: 'High=#e03131'\n";
	const { yaml, changed } = applyCustomKeysToYaml(yamlWithKey, { colorMap: null });
	assert.equal(changed, true);
	assert.doesNotMatch(yaml, /colorMap:/);
});

test('writes numeric and boolean overrides without quoting', () => {
	const { yaml, changed } = applyCustomKeysToYaml(baseYaml, {
		borderWidth: 3,
		zoom: 2,
		showColors: true,
	});
	assert.equal(changed, true);
	assert.match(yaml, /^ {4}borderWidth: 3$/m);
	assert.match(yaml, /^ {4}zoom: 2$/m);
	assert.match(yaml, /^ {4}showColors: true$/m);
});

test('escapes single quotes inside YAML string values', () => {
	const { yaml } = applyCustomKeysToYaml(baseYaml, { colorMap: "It's=ok" });
	assert.match(yaml, /^ {4}colorMap: 'It''s=ok'$/m);
});

test('re-quotes unquoted CUSTOM_STRING_KEYS already in the YAML', () => {
	const yamlUnquoted = baseYaml.trimEnd() + '\n    colorMap: High=#e03131;Low=#2f9e44\n';
	const { yaml, changed } = applyCustomKeysToYaml(yamlUnquoted, {});
	assert.equal(changed, true);
	assert.match(yaml, /^ {4}colorMap: 'High=#e03131;Low=#2f9e44'$/m);
});

test('returns changed=false when nothing needs to be modified', () => {
	const yamlClean = baseYaml.trimEnd() + "\n    colorMap: 'High=#e03131'\n";
	const { yaml, changed } = applyCustomKeysToYaml(yamlClean, {});
	assert.equal(changed, false);
	assert.equal(yaml, yamlClean);
});

test('ignores keys that are not in the custom-key allowlist', () => {
	const { yaml, changed } = applyCustomKeysToYaml(baseYaml, {
		// startDate is a Bases-declared option, not a custom key — must not be touched here.
		startDate: 'note.somethingElse',
	} as Record<string, unknown>);
	assert.equal(changed, false);
	assert.equal(yaml, baseYaml);
});

test('round-trips: writing then re-applying the same overrides is idempotent', () => {
	const overrides = { colorMap: 'High=#e03131', borderWidth: 2 };
	const first = applyCustomKeysToYaml(baseYaml, overrides);
	const second = applyCustomKeysToYaml(first.yaml, overrides);
	assert.equal(second.changed, false);
	assert.equal(second.yaml, first.yaml);
});

test('extractCustomKeysFromYaml reads persisted custom keys with correct types', () => {
	const yaml = baseYaml.trimEnd() + [
		"",
		"    colorBy: note.priority",
		"    colorMap: 'High=#e03131;Low=#2f9e44'",
		"    borderBy: note.assigned",
		"    borderWidth: 3",
		"    zoom: 2",
		"    timeScale: 'day'",
		"    showColors: false",
		"",
	].join("\n");

	const extracted = extractCustomKeysFromYaml(yaml);
	assert.equal(extracted.colorBy, 'note.priority');
	assert.equal(extracted.colorMap, 'High=#e03131;Low=#2f9e44');
	assert.equal(extracted.borderBy, 'note.assigned');
	assert.equal(extracted.borderWidth, 3);
	assert.equal(extracted.zoom, 2);
	assert.equal(extracted.timeScale, 'day');
	assert.equal(extracted.showColors, false);
});

test('timeline display custom keys write and extract together', () => {
	const overrides = {
		colorBy: 'note.status',
		colorMap: 'open=var(--color-red);done=var(--color-green)',
		timeScale: 'day',
		zoom: 1,
		showColors: true,
	};
	const { yaml, changed } = applyCustomKeysToYaml(baseYaml, overrides);
	assert.equal(changed, true);

	const extracted = extractCustomKeysFromYaml(yaml);
	assert.equal(extracted.colorBy, overrides.colorBy);
	assert.equal(extracted.colorMap, overrides.colorMap);
	assert.equal(extracted.timeScale, overrides.timeScale);
	assert.equal(extracted.zoom, overrides.zoom);
	assert.equal(extracted.showColors, overrides.showColors);
});

test('extractCustomKeysFromYaml omits keys absent from the YAML', () => {
	const extracted = extractCustomKeysFromYaml(baseYaml);
	assert.equal('colorBy' in extracted, false);
	assert.equal('colorMap' in extracted, false);
});

test('extracted custom keys re-apply idempotently (hydration round-trip)', () => {
	// Mirrors the live flow: extract persisted keys, then re-persist them.
	// Scalar string keys are stored quoted (as the plugin writes them); re-applying
	// the extracted set must not report a change — otherwise repeated user edits
	// would keep rewriting the file.
	const yaml = baseYaml.trimEnd() + [
		"",
		"    colorBy: 'note.priority'",
		"    colorMap: 'High=#e03131;Low=#2f9e44'",
		"    borderWidth: 2",
		"",
	].join("\n");
	const extracted = extractCustomKeysFromYaml(yaml);
	const { changed } = applyCustomKeysToYaml(yaml, extracted);
	assert.equal(changed, false);
});

test('object-valued property override is dropped, not written (hazard the view layer must coerce)', () => {
	// formatValueLine only serializes string/number/boolean. An object colorBy
	// (which JSON.parse of the dropdown value can yield) leaves the colorBy line
	// untouched. This is why TimelineView coerces to a string id before persisting.
	const yaml = baseYaml.trimEnd() + "\n    colorBy: 'note.priority'\n";
	const { yaml: out } = applyCustomKeysToYaml(yaml, { colorBy: { type: 'note', name: 'status' } });
	assert.match(out, /^ {4}colorBy: 'note.priority'$/m); // unchanged — object silently dropped
});

test('string property override updates colorBy in place (post-coercion path)', () => {
	const yaml = baseYaml.trimEnd() + "\n    colorBy: 'note.priority'\n";
	const { yaml: out, changed } = applyCustomKeysToYaml(yaml, { colorBy: 'note.status' });
	assert.equal(changed, true);
	assert.match(out, /^ {4}colorBy: 'note.status'$/m);
	assert.equal(out.match(/colorBy:/g)?.length, 1);
});
