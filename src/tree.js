const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class FeatureItem extends vscode.TreeItem {
  constructor(label, iconName, featureId, tooltip) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'scratchtoolsFeature';
    this.featureId = featureId;
    this.description = featureId;
    this.tooltip = tooltip || `${label} (${featureId})`;
    this.iconPath = new vscode.ThemeIcon(iconName || 'extensions');
    this.command = {
      command: 'scratchtools.openFeatureData',
      title: 'Open Feature data.json',
      arguments: [this]
    };
    this.accessibilityInformation = {
      label: this.tooltip,
      role: 'treeitem'
    };
  }
}

class FeaturesProvider {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() { this._onDidChangeTreeData.fire(); }

  getTreeItem(element) { return element; }

  getChildren() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { return []; }
    const root = folders[0].uri.fsPath;
    const featuresDir = path.join(root, 'features');
    if (!fs.existsSync(featuresDir)) { return []; }
    const entries = fs.readdirSync(featuresDir, { withFileTypes: true })
      .filter(d => d.isDirectory());
    return entries.map(d => {
      const id = d.name;
      const dataPath = path.join(featuresDir, id, 'data.json');
      let displayName = id;
      let scripts = 0, styles = 0, resources = 0;
      try {
        if (fs.existsSync(dataPath)) {
          const raw = fs.readFileSync(dataPath, 'utf8');
          const json = JSON.parse(raw);
          if (json && typeof json.name === 'string' && json.name.trim()) displayName = json.name.trim();
          scripts = (json && Array.isArray(json.scripts)) ? json.scripts.length : 0;
          styles = (json && Array.isArray(json.styles)) ? json.styles.length : 0;
          resources = (json && Array.isArray(json.resources)) ? json.resources.length : 0;
        }
      } catch (e) {
        // ignore parse errors; fall back to defaults
      }
      // Pick an icon representing most prominent content
      let iconName = 'extensions';
      if (scripts > 0) iconName = 'file-code';
      else if (styles > 0) iconName = 'symbol-color';
      else if (resources > 0) iconName = 'file-media';

  const tooltip = `${displayName} (${id})\nScripts: ${scripts}  Styles: ${styles}  Resources: ${resources}`;
  return new FeatureItem(displayName, iconName, id, tooltip);
    });
  }
}

module.exports = { FeaturesProvider, FeatureItem };
