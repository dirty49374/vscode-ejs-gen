// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateFile, ejsyamlExtension } from './generator';
import { existsSync } from 'fs';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let enabled = true;

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		if (!enabled) {
			return;
		}

		let ejsyamlFileName: string | null = null;

		if (document.fileName.endsWith(ejsyamlExtension)) {
			ejsyamlFileName = document.fileName;
		} else if (existsSync(document.fileName + ejsyamlExtension)) {
			ejsyamlFileName = document.fileName + ejsyamlExtension;
		}

		if (ejsyamlFileName !== null) {
			(async () => {
				try {	
					const files = await generateFile(ejsyamlFileName);
					vscode.window.showInformationMessage(`${files.length ? files.join(',') : 'no file'} generated`);
				} catch (e) {
					vscode.window.showErrorMessage(e.message);
				}	
			})();
		}
	});

	let enableCommand = vscode.commands.registerCommand('ejs-gen.enable', () => {
		enabled = true;
		vscode.window.showInformationMessage('ejs-gen: enabled');
	});

	let disableCommand = vscode.commands.registerCommand('ejs-gen.disable', () => {
		enabled = false;
		vscode.window.showInformationMessage('ejs-gen: disabled');
	});

	context.subscriptions.push(enableCommand, disableCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}
