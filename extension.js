const vscode = require("vscode");
const path = require('path');
const { runAddFeatureFlow, addUserscriptFlow, addUserstyleFlow, addResourceFlow } = require('./src/feature');
const { FeaturesProvider } = require('./src/tree');

function activate(context) {
  console.log('ScratchTools extension active');
  const provider = new FeaturesProvider();
  vscode.window.registerTreeDataProvider('scratchtoolsFeatures', provider);
  context.subscriptions.push(vscode.commands.registerCommand('scratchtools.refreshFeatures', () => provider.refresh()));

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
