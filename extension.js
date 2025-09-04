const vscode = require("vscode");
const { runAddFeatureFlow, addUserscriptFlow, addUserstyleFlow, addResourceFlow } = require('./src/feature');

function activate(context) {
  console.log('ScratchTools extension active');

  const toolbox = vscode.commands.registerCommand("scratchtools.toolbox", () => {
    try {
      const quickPickData = [
        { label: "$(add) Add a new feature", description: "Add a new feature to your ScratchTools project" },
        { label: "$(file-code) Add Userscript", description: "Create a userscript and attach it to data.json" },
        { label: "$(symbol-color) Add Userstyle", description: "Create a userstyle and attach it to data.json" },
        { label: "$(file-media) Add Resource", description: "Copy a file into the feature and register it as a resource" }
      ];
      vscode.window.showQuickPick(quickPickData).then(selection => {
        if (!selection) return;
        if (selection.label === "$(add) Add a new feature") runAddFeatureFlow();
        if (selection.label === "$(file-code) Add Userscript") addUserscriptFlow();
        if (selection.label === "$(symbol-color) Add Userstyle") addUserstyleFlow();
        if (selection.label === "$(file-media) Add Resource") addResourceFlow();
      });
    } catch (e) {
      console.error(e);
      vscode.window.showErrorMessage("An error happened in the toolbox: " + e);
    }
  });

  const addFeature = vscode.commands.registerCommand("scratchtools.addFeature", async () => {
    await runAddFeatureFlow();
  });
  const addUserscript = vscode.commands.registerCommand("scratchtools.addUserscript", async () => {
    await addUserscriptFlow();
  });
  const addUserstyle = vscode.commands.registerCommand("scratchtools.addUserstyle", async () => {
    await addUserstyleFlow();
  });
  const addResource = vscode.commands.registerCommand("scratchtools.addResource", async () => {
    await addResourceFlow();
  });

  context.subscriptions.push(hello, toolbox, addFeature, addUserscript, addUserstyle, addResource);
}

function deactivate() {}

module.exports = { activate, deactivate };
