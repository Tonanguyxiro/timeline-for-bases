export interface FolderNoteTreeRow {
	path: string;
	depth: number;
	hasChildren: boolean;
}

function dirname(path: string): string {
	const idx = path.lastIndexOf('/');
	return idx < 0 ? '' : path.slice(0, idx);
}

/** Order file paths as a tree in which every file is nested under the folder
 *  note of its nearest ancestor folder that is part of `paths`.
 *
 *  A folder note is either `Folder/Folder.md` (inside the folder) or
 *  `Folder.md` next to `Folder/`; the inside form wins when both exist.
 *  Siblings keep their incoming order, so the host sort is preserved per level. */
export function buildFolderNoteTree(paths: string[]): FolderNoteTreeRow[] {
	const known = new Set(paths);

	const folderNoteOf = (dir: string): string | null => {
		const inside = `${dir}/${dir.slice(dir.lastIndexOf('/') + 1)}.md`;
		if (known.has(inside)) return inside;
		const outside = `${dir}.md`;
		return known.has(outside) ? outside : null;
	};

	const childrenByParent = new Map<string | null, string[]>();
	for (const path of paths) {
		let parent: string | null = null;
		for (let dir = dirname(path); dir && !parent; dir = dirname(dir)) {
			const note = folderNoteOf(dir);
			if (note && note !== path) parent = note;
		}
		const siblings = childrenByParent.get(parent);
		if (siblings) siblings.push(path);
		else childrenByParent.set(parent, [path]);
	}

	const rows: FolderNoteTreeRow[] = [];
	const visit = (path: string, depth: number) => {
		const children = childrenByParent.get(path) ?? [];
		rows.push({ path, depth, hasChildren: children.length > 0 });
		for (const child of children) visit(child, depth + 1);
	};
	for (const root of childrenByParent.get(null) ?? []) visit(root, 0);
	return rows;
}
