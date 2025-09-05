# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [1.0.1] - 2025-09-05

### Added
- ScratchTools view in the Activity Bar to manage features.
- Indexing from features lists:
	- v2: `features/features.json` with `{ "version": 2, "id": "..." }` entries.
	- v1 legacy: `./features.json` with `title`/`file` entries.
- Feature tree children: `data.json`, `scripts`, `styles`, `resources` with native file icons and click-to-open.
- Inline actions on features: Open, Add (+ userscript/userstyle/resource), Delete.
- Command palette toolbox:
	- `ScratchTools: Add Feature`
	- `ScratchTools: Add Userscript`
	- `ScratchTools: Add Userstyle`
	- `ScratchTools: Add Resource`
	- `ScratchTools: Refresh Features`
	- `ScratchTools: Open Feature data.json`
	- `ScratchTools: Search Features`
- Search/filter box for the features view and alphabetical sorting (A→Z).
- JSON validation:
	- `features/*/data.json` validated against bundled schema.
	- `features/features.json` validated; legacy entries warn once.
- Toolbox keybinding: Cmd+Alt+T (macOS) / Ctrl+Alt+T (Win/Linux).

### Changed
- Feature tree now indexes from list files instead of scanning directories.
- Main feature items show labels with icons; child file icons come from the current theme.
- README updated to document the view, commands, search, and validation.

### Removed
- Old explicit “Open Script/Style” icons in favor of generic Open and native file icons.

### Internal
- Refactored code into modules under `src/` (feature flows and tree provider).
- Packaging workflow with `vsce`; `publisher` added to `package.json`.

## [1.0.0]

### Added
- Initial release with basic "ScratchTools: Add Feature" scaffolding.
