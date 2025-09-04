const path = require('path');

const { runTests, downloadAndUnzipVSCode } = require('@vscode/test-electron');

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, '../');

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Download VS Code, unzip it and run the integration test
		// Pin a compatible VS Code version to avoid macOS spawn issues
		const vscodePath = await downloadAndUnzipVSCode('1.81.0');

		// Determine macOS executable path across different bundle layouts
		const fs = require('fs');
		const candidates = [
			path.join(vscodePath, 'Contents', 'MacOS', 'Electron'),
			path.join(vscodePath, 'Visual Studio Code.app', 'Contents', 'MacOS', 'Electron'),
			path.join(vscodePath, 'Code - OSS.app', 'Contents', 'MacOS', 'Electron')
		];
		let vscodeExecutablePath = null;
		for (const p of candidates) {
			try {
				fs.accessSync(p, fs.constants.X_OK);
				vscodeExecutablePath = p;
				break;
			} catch (e) {
				// keep searching
			}
		}
		if (!vscodeExecutablePath) {
			console.error('Could not locate VS Code executable. Tried:', candidates);
			process.exit(1);
		}

		await runTests({
			vscodeExecutablePath,
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: ['--disable-gpu']
		});
	} catch (err) {
		console.error('Failed to run tests', err);
		process.exit(1);
	}
}

main();
