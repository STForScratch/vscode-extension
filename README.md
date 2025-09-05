# ScratchTools for VS Code

Build and manage ScratchTools features from VS Code. Scaffold feature files, validate JSON, and manage features from a dedicated view.

## What you get

- Command palette toolbox to scaffold:
	- Add Feature (creates `features/<id>/data.json` and updates the features list; auto-detects versionAdded if left blank)
	- Add Userscript, Add Userstyle, Add Resource (attach to an existing feature)
- ScratchTools view (Activity Bar):
	- Indexes from features lists:
		- v2: `features/features.json` entries like `{ "version": 2, "id": "my-feature" }`
		- v1: legacy `./features.json` entries with `title`/`file`
	- Each feature expands to show its files (data.json, scripts, styles, resources)
	- Inline actions on feature rows: Open, Add (+), Delete
	- Quick Search (filter by name/id)
- JSON validation:
	- `features/*/data.json` validated against the included schema
	- `features/features.json` validated, with warnings surfaced for legacy formats

## Quick start

1) Open the Command Palette → “ScratchTools: Add Feature”.
- Enter Title, ID, Description, and optionally versionAdded (blank = auto-detect from `manifest.json` or `package.json`).

2) Use the ScratchTools view:
- Expand a feature to see `data.json`, scripts, styles, and resources.
- Click the magnifier icon to filter.
- Use the inline + to add a userscript/userstyle/resource.
- Use the trash icon to delete a feature (removes folder and list entry).

## Data shapes

- data.json (example):

```json
{
	"title": "More Scratch News",
	"description": "On the main page, scroll through the Scratch News section and load more results.",
	"credits": [{ "username": "rgantzos", "url": "https://scratch.mit.edu/users/rgantzos/" }],
	"type": ["Website"],
	"tags": ["New", "Featured"],
	"dynamic": true,
	"default": true,
	"resources": [{ "name": "my-resource", "path": "/resource.svg" }],
	"options": [{ "id": "option-id", "name": "My Option", "type": 1 }],
	"scripts": [{ "file": "script.js", "runOn": "/" }],
	"styles": [{ "file": "style.css", "runOn": "/" }]
}
```

- features list (v2):

```json
[
	{ "version": 2, "id": "admin-notifications", "versionAdded": "1.0.0" }
]
```

- features list (v1 legacy):

```json
[
	{
		"title": "Nicknames",
		"file": "nicknames",
		"type": ["Website"],
		"dynamic": false
	}
]
```

## Keybinding

- Open Toolbox: Ctrl+Alt+T (Windows/Linux) or Cmd+Alt+T (macOS).

## Known issues

- macOS VS Code test harness can be flaky (spawn path). Packaging and runtime are unaffected.

## Release notes

See CHANGELOG.md.
