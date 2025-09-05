const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { ensureDirSync } = require('./utils/fs');

function getInput(prompt) {
    return vscode.window.showInputBox({ prompt });
}

function scaffoldFeatureDataJson(root, feature) {
    const featureDir = path.join(root, 'features', feature.id);
    ensureDirSync(featureDir);
    const dataPath = path.join(featureDir, 'data.json');
    if (fs.existsSync(dataPath)) {
        return { created: false, path: dataPath };
    }
    const template = {
        title: feature.title,
        description: feature.description || "",
        credits: [],
        type: ["Website"],
        tags: [],
        dynamic: true,
        default: false,
        resources: [],
        options: [],
        scripts: [],
        styles: []
    };
    fs.writeFileSync(dataPath, JSON.stringify(template, null, 2));
    return { created: true, path: dataPath };
}

function readFeatureData(root, id) {
    const p = path.join(root, 'features', id, 'data.json');
    const content = fs.readFileSync(p, 'utf8');
    return { path: p, data: JSON.parse(content) };
}

function writeFeatureData(filePath, obj) {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function addToFeaturesList(root, id, versionAdded) {
    const featuresDir = path.join(root, 'features');
    const featuresFile = path.join(featuresDir, 'features.json');
    ensureDirSync(featuresDir);
    if (!fs.existsSync(featuresFile)) {
        fs.writeFileSync(featuresFile, JSON.stringify([], null, 2));
    }
    let arr;
    try {
        const content = fs.readFileSync(featuresFile, 'utf8') || '[]';
        arr = JSON.parse(content);
        if (!Array.isArray(arr)) throw new Error('features.json is not an array');
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to read features/features.json: ${e.message}`);
        return { ok: false };
    }

    if (arr.some(e => e && e.id === id)) {
        vscode.window.showWarningMessage(`Feature with id "${id}" already exists in features.json; skipping add.`);
        return { ok: true, skipped: true };
    }

    const entry = { version: 2, id, versionAdded: versionAdded || "..." };
    arr.unshift(entry);
    fs.writeFileSync(featuresFile, JSON.stringify(arr, null, 2));
    return { ok: true, entry };
}

async function detectProjectVersion(root) {
    try {
        const matches = await vscode.workspace.findFiles('**/manifest.json', 1);
        if (matches && matches.length > 0) {
            const manifestPath = matches[0].fsPath;
            const content = fs.readFileSync(manifestPath, 'utf8');
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed.version === 'string' && parsed.version.trim()) {
                return parsed.version.trim();
            }
        }
        const pkgPath = path.join(root, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const content = fs.readFileSync(pkgPath, 'utf8');
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed.version === 'string' && parsed.version.trim()) {
                return parsed.version.trim();
            }
        }
    } catch (e) {
        console.warn('Version detection failed:', e);
    }
    return undefined;
}

async function promptForFeatureInfo() {
    const title = await getInput("Feature title (as shown in settings)");
    if (!title) { throw new Error('Title is required'); }
    const id = await getInput("Feature ID (folder name under /features)");
    if (!id) { throw new Error('ID is required'); }
    const description = await getInput("Feature description");
    const versionAdded = await vscode.window.showInputBox({ prompt: "versionAdded (e.g., 2.5.0)", placeHolder: "Leave blank to use current project version" });
    return { title, id, description, versionAdded };
}

async function runAddFeatureFlow() {
    try {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage("Open a workspace folder to create a ScratchTools feature.");
            return;
        }
        const root = folders[0].uri.fsPath;
        const info = await promptForFeatureInfo();
        let resolvedVersion = (info.versionAdded || '').trim();
        if (!resolvedVersion) {
            const detected = await detectProjectVersion(root);
            resolvedVersion = detected || "...";
            if (detected) {
                vscode.window.showInformationMessage(`Using current project version: ${resolvedVersion}`);
            }
        }

        const dataResult = scaffoldFeatureDataJson(root, info);
        if (dataResult.created) {
            vscode.window.showInformationMessage(`Created feature data.json at ${path.relative(root, dataResult.path)}`);
        } else {
            vscode.window.showWarningMessage(`data.json already exists for ${info.id}; not overwritten.`);
        }

        try {
            const doc = await vscode.workspace.openTextDocument(dataResult.path);
            await vscode.window.showTextDocument(doc);
        } catch (openErr) {
            console.warn('Could not open data.json:', openErr);
        }

        const listResult = addToFeaturesList(root, info.id, resolvedVersion);
        if (listResult.ok && !listResult.skipped) {
            vscode.window.showInformationMessage(`Added ${info.id} to features/features.json`);
        }
    } catch (e) {
        console.error(e);
        vscode.window.showErrorMessage(`Failed to add feature: ${e.message}`);
    }
}

async function promptForFeatureId() { return getInput('Feature ID'); }

async function addUserscriptFlow(target) {
    try {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) { vscode.window.showErrorMessage('Open a workspace.'); return; }
        const root = folders[0].uri.fsPath;
    const id = (target && target.featureId) || await promptForFeatureId(); if (!id) return;
        const runOn = await getInput('runOn (e.g., "/" or "/projects/*")'); if (!runOn) return;
        const fileName = await getInput('Script file name (e.g., script.js)'); if (!fileName) return;

        const featureDir = path.join(root, 'features', id);
        ensureDirSync(featureDir);
        const absFile = path.join(featureDir, fileName);
        if (!fs.existsSync(absFile)) {
            fs.writeFileSync(absFile, `// Userscript for ${id}\n// runOn: ${runOn}\n(function(){\n  // TODO: implement\n})();\n`);
        }
        const { path: dataPath, data } = readFeatureData(root, id);
        data.scripts = data.scripts || [];
        data.scripts.push({ file: fileName, runOn });
        writeFeatureData(dataPath, data);
        const doc = await vscode.workspace.openTextDocument(absFile);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`Added userscript ${fileName} to ${id}`);
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to add userscript: ${e.message}`);
    }
}

async function addUserstyleFlow(target) {
    try {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) { vscode.window.showErrorMessage('Open a workspace.'); return; }
        const root = folders[0].uri.fsPath;
    const id = (target && target.featureId) || await promptForFeatureId(); if (!id) return;
        const runOn = await getInput('runOn (e.g., "/" or "/projects/*")'); if (!runOn) return;
        const fileName = await getInput('Style file name (e.g., style.css)'); if (!fileName) return;

        const featureDir = path.join(root, 'features', id);
        ensureDirSync(featureDir);
        const absFile = path.join(featureDir, fileName);
        if (!fs.existsSync(absFile)) {
            fs.writeFileSync(absFile, `/* Userstyle for ${id}\n   runOn: ${runOn} */\n`);
        }
        const { path: dataPath, data } = readFeatureData(root, id);
        data.styles = data.styles || [];
        data.styles.push({ file: fileName, runOn });
        writeFeatureData(dataPath, data);
        const doc = await vscode.workspace.openTextDocument(absFile);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`Added userstyle ${fileName} to ${id}`);
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to add userstyle: ${e.message}`);
    }
}

async function addResourceFlow(target) {
    try {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) { vscode.window.showErrorMessage('Open a workspace.'); return; }
        const root = folders[0].uri.fsPath;
    const id = (target && target.featureId) || await promptForFeatureId(); if (!id) return;
        const name = await getInput('Resource name (used in code)'); if (!name) return;
        const picked = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Pick resource file' });
        if (!picked || picked.length === 0) return;
        const src = picked[0].fsPath;
        const featureDir = path.join(root, 'features', id);
        ensureDirSync(featureDir);
        const dest = path.join(featureDir, path.basename(src));
        fs.copyFileSync(src, dest);
        const rel = `/${path.basename(src)}`;
        const { path: dataPath, data } = readFeatureData(root, id);
        data.resources = data.resources || [];
        data.resources.push({ name, path: rel });
        writeFeatureData(dataPath, data);
        vscode.window.showInformationMessage(`Added resource ${name} -> ${rel} to ${id}`);
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to add resource: ${e.message}`);
    }
}

module.exports = {
    runAddFeatureFlow,
    addUserscriptFlow,
    addUserstyleFlow,
    addResourceFlow,
    convertV1ToV2Flow
};

async function convertV1ToV2Flow(target) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { vscode.window.showErrorMessage('Open a workspace.'); return; }
    const root = folders[0].uri.fsPath;
    const featuresDir = path.join(root, 'features');
    const listPath = path.join(featuresDir, 'features.json');
    if (!fs.existsSync(listPath)) { vscode.window.showInformationMessage('features/features.json not found.'); return; }
    let arr;
    try {
        arr = JSON.parse(fs.readFileSync(listPath, 'utf8') || '[]');
    } catch (e) {
        vscode.window.showErrorMessage(`Could not parse features/features.json: ${e.message}`);
        return;
    }
    if (!Array.isArray(arr)) { vscode.window.showErrorMessage('features/features.json is not an array.'); return; }

    // Filter legacy entries when a specific legacy node is targeted
    let candidates = arr.filter(e => e && typeof e === 'object' && e.version !== 2);
    if (target && target.kind === 'v1') {
        const fileBase = target.fileBase || target.featureId;
        candidates = candidates.filter(e => e && (e.file === fileBase || e.id === fileBase));
    }
    if (candidates.length === 0) { vscode.window.showInformationMessage('No legacy entries to convert.'); return; }

    const confirmed = await vscode.window.showWarningMessage(
        `Convert ${candidates.length} legacy feature(s) to v2?`, { modal: true }, 'Convert'
    );
    if (confirmed !== 'Convert') return;

    const versionAdded = await detectProjectVersion(root) || '...';
    let converted = 0;
    const newArr = [];

    for (const entry of arr) {
        if (!entry || typeof entry !== 'object') { newArr.push(entry); continue; }
        if (entry.version === 2) { newArr.push(entry); continue; }
        // Legacy
        const id = (entry.id && String(entry.id)) || (entry.file && String(entry.file));
        const title = (entry.title && String(entry.title)) || id || 'Untitled Feature';
        if (!id) { newArr.push(entry); continue; }

        // Scaffold folder and data.json if missing
        scaffoldFeatureDataJson(root, { id, title, description: '' });

        // Try to move legacy script into feature folder (best-effort)
        try {
            const guesses = [
                path.join(featuresDir, `${id}.js`),
                path.join(root, `${id}.js`)
            ];
            let found;
            for (const g of guesses) { if (fs.existsSync(g)) { found = g; break; } }
            if (found) {
                const dest = path.join(featuresDir, id, path.basename(found));
                if (!fs.existsSync(dest)) {
                    try {
                        fs.renameSync(found, dest);
                    } catch (e) {
                        try { fs.copyFileSync(found, dest); } catch (e2) { /* ignore */ }
                    }
                }
                // Register script in data.json
                const { path: dataPath, data } = readFeatureData(root, id);
                data.scripts = Array.isArray(data.scripts) ? data.scripts : [];
                if (!data.scripts.some(s => s && s.file === path.basename(dest))) {
                    data.scripts.push({ file: path.basename(dest), runOn: '/' });
                    writeFeatureData(dataPath, data);
                }
            }
        } catch (e) {
            // ignore
        }

        // Add v2 entry
        newArr.push({ version: 2, id, versionAdded });
        converted++;
    }

    // Persist updated list
    try { fs.writeFileSync(listPath, JSON.stringify(newArr, null, 2)); } catch (e) {
        vscode.window.showErrorMessage(`Failed writing features/features.json: ${e.message}`);
        return;
    }
    vscode.window.showInformationMessage(`Converted ${converted} legacy feature(s) to v2.`);
}
