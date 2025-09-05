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
  this._filter = '';
  }

  refresh() { this._onDidChangeTreeData.fire(); }

  setFilter(text) {
    this._filter = (text || '').toLowerCase();
    this.refresh();
  }

  getTreeItem(element) { return element; }

  getChildren(element) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { return []; }
    const root = folders[0].uri.fsPath;
    const featuresDir = path.join(root, 'features');
    if (!fs.existsSync(featuresDir)) { return []; }

    // Root level: list features from features.json (v2) and root features.json (v1)
    if (!element) {
      const items = [];
      const lists = [
        path.join(featuresDir, 'features.json')
      ];
      for (const listPath of lists) {
        try {
          if (!fs.existsSync(listPath)) continue;
          const raw = fs.readFileSync(listPath, 'utf8') || '[]';
          const arr = JSON.parse(raw);
          if (!Array.isArray(arr)) continue;
          // intentionally no legacy warnings
          for (let i = 0; i < arr.length; i++) {
            const entry = arr[i];
            if (!entry || typeof entry !== 'object') continue;
            // v2 entry
            if (typeof entry.version === 'number' && entry.version === 2 && typeof entry.id === 'string') {
              const id = entry.id;
              const dataPath = path.join(featuresDir, id, 'data.json');
              let displayName = id;
              let scripts = 0, styles = 0, resources = 0;
              try {
                if (fs.existsSync(dataPath)) {
                  const rawD = fs.readFileSync(dataPath, 'utf8');
                  const json = JSON.parse(rawD);
                  if (json) {
                    const t = (typeof json.title === 'string' && json.title.trim()) ? json.title.trim() : undefined;
                    const n = (typeof json.name === 'string' && json.name.trim()) ? json.name.trim() : undefined;
                    if (t) displayName = t; else if (n) displayName = n;
                  }
                  scripts = (json && Array.isArray(json.scripts)) ? json.scripts.length : 0;
                  styles = (json && Array.isArray(json.styles)) ? json.styles.length : 0;
                  resources = (json && Array.isArray(json.resources)) ? json.resources.length : 0;
                }
              } catch (e) { /* ignore */ }
              if (this._filter) {
                const hay = (displayName + ' ' + id).toLowerCase();
                if (!hay.includes(this._filter)) continue;
              }
              let iconName = 'extensions';
              if (scripts > 0) iconName = 'file-code';
              else if (styles > 0) iconName = 'symbol-color';
              else if (resources > 0) iconName = 'file-media';
              const tooltip = `${displayName} (${id})\nScripts: ${scripts}  Styles: ${styles}  Resources: ${resources}`;
              const item = new FeatureItem(displayName, iconName, id, tooltip);
              item.kind = 'v2';
              items.push(item);
              continue;
            }
            // v1 legacy entry
            const title = (typeof entry.title === 'string' && entry.title.trim()) ? entry.title.trim() : (entry.file || `Feature ${i + 1}`);
            const fileBase = typeof entry.file === 'string' ? entry.file : undefined;
            if (this._filter) {
              const legacyHay = (title + ' ' + (fileBase || '')).toLowerCase();
              if (!legacyHay.includes(this._filter)) continue;
            }
            const lvItem = new FeatureItem(title, 'history', fileBase || title, `${title}${fileBase ? `\nfile: ${fileBase}.js` : ''}`);
            lvItem.contextValue = 'scratchtoolsLegacyFeature';
            lvItem.kind = 'v1';
            lvItem.fileBase = fileBase;
            items.push(lvItem);
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      // sort A->Z by label
      items.sort((a, b) => String(a.label).localeCompare(String(b.label)));
      return items;
    }

    // Children of a feature: show data.json, scripts, styles, resources
    if (element instanceof FeatureItem) {
      const id = element.featureId;
      const featureDir = path.join(featuresDir, id);
      // Legacy v1 nodes: show its JS if possible
      if (element.kind === 'v1') {
        const children = [];
        const base = element.fileBase || id;
        if (base) {
          const guesses = [
            path.join(featuresDir, `${base}.js`),
            path.join(root, `${base}.js`)
          ];
          let found;
          for (const g of guesses) { if (fs.existsSync(g)) { found = g; break; } }
          if (found) {
            const fileUri = vscode.Uri.file(found);
            children.push(new FileItem(path.basename(found), undefined, fileUri, undefined, `Legacy feature script`, 'scratchtoolsLegacyScript'));
          }
        }
        return children;
      }
      // v2 nodes: folder-based feature details
      const dataPath = path.join(featureDir, 'data.json');
      const children = [];

      // data.json
  const dataUri = vscode.Uri.file(dataPath);
  children.push(new FileItem('data.json', undefined, dataUri, undefined, `Feature metadata (${id})`, 'scratchtoolsData'));

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
          children.push(new FileItem(file, undefined, fileUri, desc, tip, 'scratchtoolsScript'));
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
          children.push(new FileItem(file, undefined, fileUri, desc, tip, 'scratchtoolsStyle'));
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
          children.push(new FileItem(file, undefined, fileUri, desc, tip, 'scratchtoolsResource'));
        });
      }

  // sort children A->Z by label
  children.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  return children;
    }

    return [];
  }
}

module.exports = { FeaturesProvider, FeatureItem };
