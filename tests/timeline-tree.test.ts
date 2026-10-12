import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildFolderNoteTree } from '../src/timeline-tree';

const flat = (paths: string[]) => buildFolderNoteTree(paths).map(row => `${row.depth}${row.hasChildren ? '+' : ' '}${row.path}`);

test('nests files under the folder note inside their folder', () => {
	assert.deepEqual(flat([
		'Projects/Alpha/Task 1.md',
		'Projects/Alpha/Alpha.md',
		'Projects/Alpha/Task 2.md',
		'Loose.md',
	]), [
		'0+Projects/Alpha/Alpha.md',
		'1 Projects/Alpha/Task 1.md',
		'1 Projects/Alpha/Task 2.md',
		'0 Loose.md',
	]);
});

test('nests folder notes under the folder note of their parent folder', () => {
	assert.deepEqual(flat([
		'A/B/B.md',
		'A/B/leaf.md',
		'A/A.md',
		'A/other.md',
	]), [
		'0+A/A.md',
		'1+A/B/B.md',
		'2 A/B/leaf.md',
		'1 A/other.md',
	]);
});

test('supports a folder note that sits next to its folder', () => {
	assert.deepEqual(flat(['A/x.md', 'A.md', 'A/A.md']), [
		'0 A.md',
		'0+A/A.md',
		'1 A/x.md',
	]);
	assert.deepEqual(flat(['A/x.md', 'A.md']), ['0+A.md', '1 A/x.md']);
});

test('skips folders whose folder note is not listed', () => {
	assert.deepEqual(flat(['A/B/leaf.md', 'A/A.md']), ['0+A/A.md', '1 A/B/leaf.md']);
	assert.deepEqual(flat(['A/B/leaf.md', 'C/other.md']), ['0 A/B/leaf.md', '0 C/other.md']);
});

test('returns every path exactly once', () => {
	const paths = ['A/A.md', 'A.md', 'A/A/A.md', 'A/A/x.md', 'x.md'];
	const rows = buildFolderNoteTree(paths);
	assert.deepEqual(rows.map(row => row.path).sort(), [...paths].sort());
});
