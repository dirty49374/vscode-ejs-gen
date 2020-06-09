// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateFile, ejsyamlExtension, generateText } from './ejsgen/generator';
import { existsSync, readdirSync } from 'fs';
import { dirname, join, relative, basename } from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let enabled = true;
	const findEjsYamls = (work: string, files?: string[], curr?: string) => {
		if (!files)
			files = [];

		if (!curr)
			curr = work;

		const fns = readdirSync(curr);
		for (const fileName of fns) {
			if (fileName.endsWith(ejsyamlExtension)) {
				files.push(relative(work, join(curr, fileName)));
			}
		}

		const parent = dirname(curr);
		if (parent != curr)
			findEjsYamls(work, files, parent);

		return files;
	}

	const matchEjsYamls = (ejsyamls: string[], target: string) => ejsyamls.find(p => {
		const pattern = basename(p).split('.').slice(0, -1).join('.');
		const idx = pattern.indexOf('@');
		if (idx < 0) return false;

		const prefix = pattern.substr(0, idx);
		const postfix = pattern.substring(idx + 1);
		const matched = target.startsWith(prefix) && target.endsWith(postfix);
		return matched;
	});

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

	let generateCommand = vscode.commands.registerCommand('ejs-gen.generate', async (uri) => {

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('no active editor');
			return;
		}

		const document = vscode.window.activeTextEditor?.document;
		if (!document) {
			vscode.window.showErrorMessage('no active document');
			return;
		}

		const directory = dirname(document.fileName);
		const ejsyamls = findEjsYamls(directory);

		if (ejsyamls.length == 0) {
			vscode.window.showInformationMessage('ejs-gen: no .ejsyaml files');
			return;
		}

		let ejsyaml = matchEjsYamls(ejsyamls, document.fileName);
		if (!ejsyaml) {
			ejsyaml = await vscode.window.showQuickPick(ejsyamls);
			if (!ejsyaml) {
				return;
			}
		}

		const ejsyamlFileName = join(directory, ejsyaml);

		try {
			const text = await generateText(ejsyamlFileName, document.fileName, document.getText());
			var wholeRange = new vscode.Range(
				document.positionAt(0),
				document.positionAt(document.getText().length - 1)
			);
			if (text != null) {
				editor.edit(edit => edit.replace(wholeRange, text));
			} else {
				vscode.window.showInformationMessage("ejs-gen: cancelled");
			}
		} catch (e) {
			vscode.window.showErrorMessage(e.message);
		}
	});

	vscode.workspace.onDidCreateFiles(async (event: vscode.FileCreateEvent) => {
		if (!enabled) {
			return;
		}

		for (let file of event.files) {
			if (file.scheme === 'file') {
				const path = file.fsPath;
				const inputFile = basename(path);
				const directory = dirname(path);
				const ejsyamls = findEjsYamls(directory);

				const ejsyaml = ejsyamls.find(p => {
					const pattern = basename(p).split('.').slice(0, -1).join('.');
					const idx = pattern.indexOf('@');
					if (idx < 0) return false;

					const prefix = pattern.substr(0, idx);
					const postfix = pattern.substring(idx + 1);
					const matched = inputFile.startsWith(prefix) && inputFile.endsWith(postfix);
					return matched;
				});

				if (ejsyaml != null) {
					const ejsyamlFileName = join(directory, ejsyaml);

					try {
						const document = await vscode.workspace.openTextDocument(path);
						const text = await generateText(ejsyamlFileName, path, document.getText());

						console.log(text);
						var wholeRange = new vscode.Range(
							document.positionAt(0),
							document.positionAt(document.getText().length - 1)
						);
						if (text != null) {
							const edit = new vscode.WorkspaceEdit();
							edit.replace(document.uri, wholeRange, text);
							vscode.workspace.applyEdit(edit);
						} else {
							vscode.window.showInformationMessage("ejs-gen: cancelled");
						}
					} catch (e) {
						vscode.window.showErrorMessage(e.message);
					}

				}
			}
		}

	});

	context.subscriptions.push(enableCommand, disableCommand, generateCommand);
}

// this method is called when your extension is deactivated
export function deactivate() { }
