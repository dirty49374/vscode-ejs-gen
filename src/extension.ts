// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateFile } from './generator';
import { extname } from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let enabled = true;

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		if (enabled && extname(document.fileName).toLowerCase() == '.ejs-gen') {
			const fileName = document.fileName;
			const template = document.getText()

			generateFile(fileName, template);
			vscode.window.showInformationMessage('generated');
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
