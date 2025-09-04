# ScratchTools for VS Code

A helper extension for developing ScratchTools features. Quickly scaffold feature JSON, and manage your project files right from VS Code.

## Features

Current commands:

- ScratchTools: Add Feature — prompts for a title, id, description, and versionAdded; creates `features/<id>/data.json` and updates `features/features.json`.
	- Leave versionAdded blank to auto-use the current project version (from manifest.json or package.json).

## Add a new feature (command palette)

Open the Command Palette and run "ScratchTools: Add Feature". You'll be prompted for:

- Feature title
- Feature ID (creates `features/<id>/`)
- Feature description
- versionAdded (leave blank to auto-detect)

What it does:

- Creates `features/<id>/data.json` with a starter template per the ScratchTools docs.
- Inserts an entry at the top of `features/features.json` array: `{ version: 2, id, versionAdded }`.

References:

- Feature JSON: https://docs.scratchtools.app/docs/contributing/featurejson
- Adding to features.json: https://docs.scratchtools.app/docs/contributing/allfeatures

## Requirements

No special requirements.

## Extension Settings

This extension does not add any settings.

## Known Issues

macOS VS Code test harness can be flaky (spawn path). Packaging and runtime are unaffected.

## Release Notes

See CHANGELOG.md for details.

---

**Enjoy!**
