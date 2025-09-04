const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class FeatureItem extends vscode.TreeItem {
  constructor(label, iconName, featureId, tooltip) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'scratchtoolsFeature';
    this.featureId = featureId;
    this.description = featureId;
    this.tooltip = tooltip || `${label} (${featureId})`;
    this.iconPath = new vscode.ThemeIcon(iconName || 'extensions');
    this.accessibilityInformation = {
      label: this.tooltip,
      role: 'treeitem'
    };
  }
}

class FileItem extends vscode.TreeItem {
  constructor(label, iconName, fileUri, description, tooltip, contextValue) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.resourceUri = fileUri;
    this.iconPath = new vscode.ThemeIcon(iconName || 'file');
    this.description = description;
    this.tooltip = tooltip || (fileUri ? fileUri.fsPath : label);
    this.contextValue = contextValue || 'scratchtoolsFile';
    this.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [fileUri]
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

  getChildren(element) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { return []; }
    const root = folders[0].uri.fsPath;
    const featuresDir = path.join(root, 'features');
    if (!fs.existsSync(featuresDir)) { return []; }

    // Root level: list features
    if (!element) {
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
            if (json) {
              const t = (typeof json.title === 'string' && json.title.trim()) ? json.title.trim() : undefined;
              const n = (typeof json.name === 'string' && json.name.trim()) ? json.name.trim() : undefined;
              if (t) displayName = t; else if (n) displayName = n;
            }
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

    // Children of a feature: show data.json, scripts, styles, resources
    if (element instanceof FeatureItem) {
      const id = element.featureId;
      const featureDir = path.join(featuresDir, id);
      const dataPath = path.join(featureDir, 'data.json');
      const children = [];

      // data.json
      const dataUri = vscode.Uri.file(dataPath);
      children.push(new FileItem('data.json', 'file', dataUri, undefined, `Feature metadata (${id})`, 'scratchtoolsData'));

      // parse data.json for arrays
      let json;
      try {
        if (fs.existsSync(dataPath)) {
          const raw = fs.readFileSync(dataPath, 'utf8');
          json = JSON.parse(raw);
        }
      } catch (e) {
        // ignore parse errors; still show data.json item above
      }

      // scripts
      if (json && Array.isArray(json.scripts)) {
        json.scripts.forEach(s => {
          const file = s && s.file ? String(s.file) : '';
          if (!file) return;
          const fileUri = vscode.Uri.file(path.join(featureDir, file));
          const desc = s && s.runOn ? `runOn: ${s.runOn}` : undefined;
          const tip = `${file}${desc ? `\n${desc}` : ''}`;
          children.push(new FileItem(file, 'file-code', fileUri, desc, tip, 'scratchtoolsScript'));
        });
      }

      // styles
      if (json && Array.isArray(json.styles)) {
        json.styles.forEach(s => {
          const file = s && s.file ? String(s.file) : '';
          if (!file) return;
          const fileUri = vscode.Uri.file(path.join(featureDir, file));
          const desc = s && s.runOn ? `runOn: ${s.runOn}` : undefined;
          const tip = `${file}${desc ? `\n${desc}` : ''}`;
          children.push(new FileItem(file, 'symbol-color', fileUri, desc, tip, 'scratchtoolsStyle'));
        });
      }

      // resources
      if (json && Array.isArray(json.resources)) {
        json.resources.forEach(r => {
          const rel = r && r.path ? String(r.path) : '';
          if (!rel) return;
          const file = rel.replace(/^\//, '');
          const fileUri = vscode.Uri.file(path.join(featureDir, file));
          const desc = r && r.name ? `name: ${r.name}` : undefined;
          const tip = `${file}${desc ? `\n${desc}` : ''}`;
          children.push(new FileItem(file, 'file-media', fileUri, desc, tip, 'scratchtoolsResource'));
        });
      }

      return children;
    }

    return [];
  }
}

module.exports = { FeaturesProvider, FeatureItem };
