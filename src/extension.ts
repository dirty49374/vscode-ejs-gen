// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateFile } from './generator';
import { basename, extname } from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const ext1 = '.ejsgen.yaml';
	const ext2 = '.ejsgen.yml';

	let enabled = true;

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		if (enabled) {
			const lowerPath = document.fileName.toLowerCase();

			let lowerExt = null;
			if (lowerPath.endsWith(ext1)) {
				lowerExt = ext1;
			} else if (lowerPath.endsWith(ext2)) {
				lowerExt = ext2;
			}

			if (lowerExt) {
				const inputPath = document.fileName;
				const outputPath = inputPath.substr(0, inputPath.length - lowerExt.length);
				const yaml = document.getText()

				try {
					generateFile(inputPath, outputPath, yaml);
					vscode.window.showInformationMessage(`file '${basename(outputPath)}' generated`);
				} catch (e) {
					vscode.window.showErrorMessage(`ejs-gen failed - ${e.message}`);
				}
			}
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
