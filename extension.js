const vscode = require("vscode");
const path = require('path');
const fs = require('fs');
const { runAddFeatureFlow, addUserscriptFlow, addUserstyleFlow, addResourceFlow } = require('./src/feature');
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
      const confirm = await vscode.window.showWarningMessage(
        `Delete feature "${node.featureId}"? This removes its folder and list entry.`,
        { modal: true }, 'Delete'
      );
      if (confirm !== 'Delete') return;
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) return;
      const root = folders[0].uri.fsPath;
      const featureDir = path.join(root, 'features', node.featureId);
      if (fs.existsSync(featureDir)) {
        fs.rmSync(featureDir, { recursive: true, force: true });
      }
      // Remove from features/features.json if present
      try {
        const listPath = path.join(root, 'features', 'features.json');
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
      vscode.window.showInformationMessage(`Deleted feature ${node.featureId}`);
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

  const toolbox = vscode.commands.registerCommand("scratchtools.toolbox", async () => {
    try {
      const quickPickData = [
        { label: "$(add) Add a new feature", description: "Add a new feature to your ScratchTools project" },
        { label: "$(file-code) Add Userscript", description: "Create a userscript and attach it to data.json" },
        { label: "$(symbol-color) Add Userstyle", description: "Create a userstyle and attach it to data.json" },
        { label: "$(file-media) Add Resource", description: "Copy a file into the feature and register it as a resource" }
      ];
      const selection = await vscode.window.showQuickPick(quickPickData);
      if (!selection) return;
      if (selection.label === "$(add) Add a new feature") await runAddFeatureFlow();
      if (selection.label === "$(file-code) Add Userscript") await addUserscriptFlow();
      if (selection.label === "$(symbol-color) Add Userstyle") await addUserstyleFlow();
      if (selection.label === "$(file-media) Add Resource") await addResourceFlow();
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
