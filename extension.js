const vscode = require("vscode");
const path = require('path');
const fs = require('fs');
const { runAddFeatureFlow, addUserscriptFlow, addUserstyleFlow, addResourceFlow, convertV1ToV2Flow } = require('./src/feature');
const { FeaturesProvider } = require('./src/tree');

function activate(context) {
  console.log('ScratchTools extension active');
  const provider = new FeaturesProvider();
  vscode.window.registerTreeDataProvider('scratchtoolsFeatures', provider);
  context.subscriptions.push(vscode.commands.registerCommand('scratchtools.refreshFeatures', () => provider.refresh()));
  context.subscriptions.push(vscode.commands.registerCommand('scratchtools.searchFeatures', async () => {
    const text = await vscode.window.showInputBox({ prompt: 'Filter features by name or id' });
    provider.setFilter(text || '');
  }));

  // Inline actions: add submenu and delete
  context.subscriptions.push(vscode.commands.registerCommand('scratchtools.featureAdd', async (node) => {
    const choice = await vscode.window.showQuickPick([
      { label: '$(file-code) Add Userscript', action: 'script' },
      { label: '$(symbol-color) Add Userstyle', action: 'style' },
      { label: '$(file-media) Add Resource', action: 'resource' }
    ], { placeHolder: 'Add to feature' });
    if (!choice) return;
    if (choice.action === 'script') await addUserscriptFlow(node);
    if (choice.action === 'style') await addUserstyleFlow(node);
    if (choice.action === 'resource') await addResourceFlow(node);
    provider.refresh();
  }));

  context.subscriptions.push(vscode.commands.registerCommand('scratchtools.deleteFeature', async (node) => {
    try {
      if (!node || !node.featureId) return;
      const isLegacy = node.kind === 'v1';
      const targetLabel = isLegacy && node.label ? String(node.label) : node.featureId;
      const confirm = await vscode.window.showWarningMessage(
        isLegacy
          ? `Delete legacy feature "${targetLabel}"? This removes its list entry and linked file if found.`
          : `Delete feature "${targetLabel}"? This removes its folder and list entry.`,
        { modal: true }, 'Delete'
      );
      if (confirm !== 'Delete') return;
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) return;
      const root = folders[0].uri.fsPath;
      const featuresDir = path.join(root, 'features');

      if (isLegacy) {
        // Best-effort: remove linked JS file and legacy list entry.
        const fileBase = node.fileBase || node.featureId;
        // Delete guessed JS
        try {
          const guesses = [
            path.join(featuresDir, `${fileBase}.js`),
            path.join(root, `${fileBase}.js`)
          ];
          for (const g of guesses) {
            if (fs.existsSync(g)) {
              fs.rmSync(g, { force: true });
              break;
            }
          }
        } catch (e) {
          console.warn('Failed deleting legacy linked file:', e);
        }
        // Remove from list by file field
        try {
          const listPath = path.join(featuresDir, 'features.json');
          if (fs.existsSync(listPath)) {
            const arr = JSON.parse(fs.readFileSync(listPath, 'utf8') || '[]');
            if (Array.isArray(arr)) {
              const next = arr.filter(e => {
                if (!e || typeof e !== 'object') return true;
                if (typeof e.version === 'number' && e.version === 2) return true; // leave v2 entries untouched
                // legacy shape: remove if file matches
                return e.file !== fileBase;
              });
              fs.writeFileSync(listPath, JSON.stringify(next, null, 2));
            }
          }
        } catch (e) {
          console.warn('Failed updating legacy features list during delete:', e);
        }
        vscode.window.showInformationMessage(`Deleted legacy feature ${targetLabel}`);
      } else {
        // v2: delete folder and list entry by id
        const featureDir = path.join(featuresDir, node.featureId);
        if (fs.existsSync(featureDir)) {
          fs.rmSync(featureDir, { recursive: true, force: true });
        }
        try {
          const listPath = path.join(featuresDir, 'features.json');
          if (fs.existsSync(listPath)) {
            const arr = JSON.parse(fs.readFileSync(listPath, 'utf8') || '[]');
            if (Array.isArray(arr)) {
              const next = arr.filter(e => !(e && e.id === node.featureId));
              fs.writeFileSync(listPath, JSON.stringify(next, null, 2));
            }
          }
        } catch (e) {
          console.warn('Failed updating features list during delete:', e);
        }
        vscode.window.showInformationMessage(`Deleted feature ${targetLabel}`);
      }
      provider.refresh();
    } catch (e) {
      vscode.window.showErrorMessage(`Delete failed: ${e.message}`);
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('scratchtools.openNode', async (node) => {
    try {
      if (!node) return;
      if (node.resourceUri) {
        await vscode.window.showTextDocument(node.resourceUri, { preview: false });
        return;
      }
      // Legacy v1 feature: open ./features.json and reveal the entry
      if (node.kind === 'v1') {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) return;
        const root = folders[0].uri.fsPath;
        const featuresDir = path.join(root, 'features');
        const v1Path = path.join(featuresDir, 'features.json');
        if (!fs.existsSync(v1Path)) {
          vscode.window.showWarningMessage('Legacy features.json not found at workspace root.');
          return;
        }
        const doc = await vscode.workspace.openTextDocument(v1Path);
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
        const text = doc.getText();
        const needle = node.fileBase || node.featureId || String(node.label || '');
        // Find the occurrence of the file property for this legacy entry
        const pattern = new RegExp(String.raw`"file"\s*:\s*"${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
        const match = pattern.exec(text);
        if (match) {
          const start = doc.positionAt(match.index);
          const end = doc.positionAt(match.index + match[0].length);
          editor.selection = new vscode.Selection(start, end);
          editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
        }
        return;
      }
      if (node.featureId) {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) return;
        const root = folders[0].uri.fsPath;
        const fileUri = vscode.Uri.file(path.join(root, 'features', node.featureId, 'data.json'));
        await vscode.window.showTextDocument(fileUri, { preview: false });
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Open failed: ${err.message}`);
    }
  }));

  // Delete a single file node (scripts/styles/resources), not data.json
  context.subscriptions.push(vscode.commands.registerCommand('scratchtools.deleteNode', async (node) => {
    try {
      if (!node || !node.resourceUri) return;
      const fsPath = node.resourceUri.fsPath;
      const base = path.basename(fsPath);
      if (base === 'data.json') {
        vscode.window.showWarningMessage('data.json cannot be deleted here.');
        return;
      }
      const confirm = await vscode.window.showWarningMessage(
        `Delete file "${base}"?`,
        { modal: true },
        'Delete'
      );
      if (confirm !== 'Delete') return;
      // Capture file contents for undo
      let fileBuffer;
      try {
        if (fs.existsSync(fsPath)) { fileBuffer = fs.readFileSync(fsPath); }
      } catch (e) { /* ignore */ }

      // Find the nearest data.json and update arrays, tracking removed entries + indices for undo
      let dataPath;
      let removed = { scripts: [], styles: [], resources: [] };
      try {
        const featureDir = path.dirname(fsPath);
        let dir = featureDir;
        for (let i = 0; i < 3; i++) {
          const tryPath = path.join(dir, 'data.json');
          if (fs.existsSync(tryPath)) { dataPath = tryPath; break; }
          const next = path.dirname(dir);
          if (next === dir) break;
          dir = next;
        }
        if (dataPath && fs.existsSync(dataPath)) {
          const raw = fs.readFileSync(dataPath, 'utf8');
          const json = JSON.parse(raw);
          const rel = path.basename(fsPath);
          let changed = false;
          if (Array.isArray(json.scripts)) {
            const next = [];
            json.scripts.forEach((s, idx) => {
              if (s && s.file === rel) { removed.scripts.push({ entry: s, index: idx }); changed = true; }
              else next.push(s);
            });
            json.scripts = next;
          }
          if (Array.isArray(json.styles)) {
            const next = [];
            json.styles.forEach((s, idx) => {
              if (s && s.file === rel) { removed.styles.push({ entry: s, index: idx }); changed = true; }
              else next.push(s);
            });
            json.styles = next;
          }
          if (Array.isArray(json.resources)) {
            const next = [];
            json.resources.forEach((r, idx) => {
              const p = (r && r.path ? String(r.path) : '').replace(/^\//, '');
              if (p === rel) { removed.resources.push({ entry: r, index: idx }); changed = true; }
              else next.push(r);
            });
            json.resources = next;
          }
          if (changed) {
            fs.writeFileSync(dataPath, JSON.stringify(json, null, 2));
          }
        }
      } catch (e) {
        console.warn('Failed updating data.json after delete', e);
      }

      // Delete the file from disk
      if (fs.existsSync(fsPath)) {
        try { fs.rmSync(fsPath, { force: true }); } catch (e) { /* ignore */ }
      }

      // Offer Undo
      const undo = await vscode.window.showInformationMessage(`Deleted ${base}`, 'Undo');
      if (undo === 'Undo') {
        try {
          // Restore file
          if (fileBuffer && !fs.existsSync(fsPath)) {
            fs.writeFileSync(fsPath, fileBuffer);
          }
          // Restore data.json entries
          if (dataPath && fs.existsSync(dataPath)) {
            const raw = fs.readFileSync(dataPath, 'utf8');
            const json = JSON.parse(raw);
            if (!Array.isArray(json.scripts)) json.scripts = [];
            if (!Array.isArray(json.styles)) json.styles = [];
            if (!Array.isArray(json.resources)) json.resources = [];
            removed.scripts.sort((a,b)=>a.index-b.index).forEach(({entry, index}) => {
              const pos = Math.min(index, json.scripts.length);
              json.scripts.splice(pos, 0, entry);
            });
            removed.styles.sort((a,b)=>a.index-b.index).forEach(({entry, index}) => {
              const pos = Math.min(index, json.styles.length);
              json.styles.splice(pos, 0, entry);
            });
            removed.resources.sort((a,b)=>a.index-b.index).forEach(({entry, index}) => {
              const pos = Math.min(index, json.resources.length);
              json.resources.splice(pos, 0, entry);
            });
            fs.writeFileSync(dataPath, JSON.stringify(json, null, 2));
          }
          vscode.window.showInformationMessage(`Restored ${base}`);
        } catch (e) {
          vscode.window.showErrorMessage(`Undo failed: ${e.message}`);
        }
      }
      provider.refresh();
    } catch (e) {
      vscode.window.showErrorMessage(`Delete failed: ${e.message}`);
    }
  }));

  const toolbox = vscode.commands.registerCommand("scratchtools.toolbox", async () => {
    try {
      const quickPickData = [
        { label: "$(add) Add a new feature", description: "Add a new feature to your ScratchTools project" },
        { label: "$(file-code) Add Userscript", description: "Create a userscript and attach it to data.json" },
        { label: "$(symbol-color) Add Userstyle", description: "Create a userstyle and attach it to data.json" },
        { label: "$(file-media) Add Resource", description: "Copy a file into the feature and register it as a resource" },
        { label: "$(arrow-right) Convert legacy to v2", description: "Migrate legacy entries to v2" }
      ];
      const selection = await vscode.window.showQuickPick(quickPickData);
      if (!selection) return;
      if (selection.label === "$(add) Add a new feature") await runAddFeatureFlow();
      if (selection.label === "$(file-code) Add Userscript") await addUserscriptFlow();
      if (selection.label === "$(symbol-color) Add Userstyle") await addUserstyleFlow();
      if (selection.label === "$(file-media) Add Resource") await addResourceFlow();
      if (selection.label === "$(arrow-right) Convert legacy to v2") await convertV1ToV2Flow();
      provider.refresh();
    } catch (e) {
      console.error(e);
      vscode.window.showErrorMessage("An error happened in the toolbox: " + e);
    }
  });

  const addFeature = vscode.commands.registerCommand("scratchtools.addFeature", async () => {
    await runAddFeatureFlow();
    provider.refresh();
  });
  const addUserscript = vscode.commands.registerCommand("scratchtools.addUserscript", async (node) => {
    await addUserscriptFlow(node);
    provider.refresh();
  });
  const addUserstyle = vscode.commands.registerCommand("scratchtools.addUserstyle", async (node) => {
    await addUserstyleFlow(node);
    provider.refresh();
  });
  const addResource = vscode.commands.registerCommand("scratchtools.addResource", async (node) => {
    await addResourceFlow(node);
    provider.refresh();
  });

  // Convert legacy to v2 (toolbar/context)
  context.subscriptions.push(vscode.commands.registerCommand('scratchtools.convertV1ToV2', async (node) => {
    try { await convertV1ToV2Flow(node); provider.refresh(); }
    catch (e) { vscode.window.showErrorMessage(`Convert failed: ${e.message}`); }
  }));

  // Open data.json from selected feature in tree
  context.subscriptions.push(vscode.commands.registerCommand('scratchtools.openFeatureData', async (node) => {
    try {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) return;
      const root = folders[0].uri.fsPath;
      const fileUri = vscode.Uri.file(path.join(root, 'features', node.featureId, 'data.json'));
      await vscode.window.showTextDocument(fileUri, { preview: false });
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to open data.json: ${err.message}`);
    }
  }));

  context.subscriptions.push(toolbox, addFeature, addUserscript, addUserstyle, addResource);
}

function deactivate() {}

module.exports = { activate, deactivate };
