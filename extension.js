const vscode = require("vscode");
const fs = require('fs');
const path = require('path');
const { json } = require("stream/consumers");

// Thank you ChatGPT-4! I'm lazy
function findFileValue(fileName) {
    // Search for files with the given name in the current workspace
    return vscode.workspace.findFiles(`**/${fileName}`)
        .then((uris) => {
            if (uris.length > 0) {
                // If a file was found, read its contents and return them
                const filePath = uris[0].fsPath;
                return fs.readFileSync(filePath, 'utf8');
            } else {
                // If no file was found, return false
                vscode.window.showErrorMessage("Could not find file " + fileName);
                return false;
            }
        });
};
function findFile(fileName) {
    // Search for files with the given name in the current workspace
    return vscode.workspace.findFiles(`**/${fileName}`)
        .then((uris) => {
            if (uris.length > 0) {
                // If a file was found, return true
                return true;
            } else {
                // If no file was found, return false
                vscode.window.showErrorMessage("Could not find file " + fileName);
                return false;
            }
        });
}
function findFolder(folderName) {
    // Get the folders in the current workspace
    const workspaceFolders = vscode.workspace.workspaceFolders;

    // Check if a folder with the given name exists
    const folder = workspaceFolders.find((folder) => folder.name === folderName);

    if (folder) {
        // If a folder was found, return its URI
        return folder.uri;
    } else {
        // If no folder was found, return false
        vscode.window.showErrorMessage("Could not find file " + folderName);
        return false;
    }
};
function appendToJSONFile(fileName, data) {
    // Get the path to the file in the current active folder
    const activeFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const filePath = path.join(activeFolder, fileName);

    // Read the existing contents of the file
    const fileContents = fs.readFileSync(filePath, 'utf8');

    // Parse the file contents into a JavaScript object
    const json = JSON.parse(fileContents);

    // Append the new data to the object
    Object.assign(json, data);

    // Write the updated object back to the file as a JSON string
    fs.writeFileSync(filePath, JSON.stringify(json, null, 4));
}
function getInput(prompt) {
    // Show an input box to the user
    return vscode.window.showInputBox({ prompt });
}
function getManifest() {
    findFileValue("manifest.json").then((value) => {
        return value;
    });
}


/**
 * @param {vscode.ExtensionContext} context
 */




function activate(context) {
	
	console.log('Congratulations, your extension "scratchtools" is now active!');

	let disposable = vscode.commands.registerCommand(
		"scratchtools.helloWorld",
		function () {
			vscode.window.showInformationMessage("Hello World from ScratchTools!");
		}
	);

	let disposable2 = vscode.commands.registerCommand("scratchtools.toolbox", ()=>{
        try{
            var quickPickData = [
                {
                    label: "$(add) Add a new feature",
                    description: "Add a new feature to your ScratchTools project"
                }
            ]
            //showquickpick
            vscode.window.showQuickPick(quickPickData).then((selection)=>{
                if(selection.label == "$(add) Add a new feature"){
                    //add variable inputs
                    const addFeature = async () => {
                        var featureName =  await getInput("What is the name of your feature?");
                        var featureId = await getInput("What is the ID of your feature?");
                        var featureDescription = await getInput("What is the description of your feature?");
                        

                        vscode.window.showInformationMessage("Adding feature " + featureName + " to your project...");
                        //add feature to project
                        var jsonobj = {
                            "version": 2,
                            "id": featureId,
                            "versionAdded": "..."
                        }
                        appendToJSONFile("features/features.json", jsonobj);
                        

                }
                addFeature();}
            });
        }catch(e){
            console.log(e);
            vscode.window.showErrorMessage("An error happened in the toolbox: " + e)
        }



		}
	);

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate,
};
