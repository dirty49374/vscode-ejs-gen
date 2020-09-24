// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { IGeneratorOption, generateTemplate, CancelError } from './ejsgen/generator';
import { dirname, join } from 'path';
import { findTemplateFileFor as findTemplateFileFor, findOutputFilesFor } from './ejsgen/utils';
import { FileOperation } from './fileOperation';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let enabled = true;
	let generating = false;
	let generation = 0;

	const generate = async (options: IGeneratorOption) => {
		generating = true;
		try {
			const files = await generateTemplate(options);
			const message = `${files.length ? files.join(', ') : 'no files'} are created or updated (#${++generation})`;
			vscode.window.showInformationMessage(message);
		} catch (e) {
			if (!(e instanceof CancelError)) {
				vscode.window.showErrorMessage(e.message);
			}
		}
		generating = false;
	};
	
	const getTriggeredFiles = (document: vscode.TextDocument): string[] => {
		const text = document.getText();
		const firstLine = text.split(/\r?\n/, 1)[0];
		const triggerRegexp = /ejsgen-trigger:(.*)/;

		const match = firstLine.match(triggerRegexp);
		if (match) {
			let line = match[1].trim();
			if (line.endsWith('_%>')) line = line.substr(0, line.length - 3).trim();

			const files = line.split(',');
			return files.map(p => join(dirname(document.uri.fsPath), p.trim()));
		}
		return [];
	}

	const generatePath = async (path: string) => {
		const files = findOutputFilesFor(path);
		for (let file of files) {
			await generate({
				fileop: new FileOperation(),
				input: path,
				output: file,
			});	
		}
	}

	vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		const path = document.uri.fsPath;
		if (!enabled || generating) {
			return;
		}
		if (path.endsWith('.ejsyaml')) {
			await generatePath(path);
		}

		if (path.endsWith('.ejs')) {
			const triggeredFiles = getTriggeredFiles(document);
			for (const file of triggeredFiles) {
				if (file.endsWith('.ejsyaml')) {
					await generatePath(file);
				}
			}
		}
		return;
	});

	vscode.workspace.onWillSaveTextDocument((e: vscode.TextDocumentWillSaveEvent) => {
		const path = e.document.uri.fsPath;
		if (!enabled || generating || path.endsWith('.ejsyaml')) {
			return;
		}

		const templatePath = findTemplateFileFor(e.document.uri.fsPath);
		if (!templatePath) {
			return;
		}

		e.waitUntil(generate({
			fileop: new FileOperation(e.document.uri.path),
			input: templatePath,
			output: e.document.uri.fsPath,
			cwd: dirname(e.document.uri.fsPath),
		}));
	});

	vscode.workspace.onDidCreateFiles(async (event: vscode.FileCreateEvent) => {
		if (!enabled || generating) {
			return;
		}

		for (let file of event.files) {
			if (file.scheme === 'file') {
				const templatePath = findTemplateFileFor(file.fsPath);
				if (!templatePath) {
					continue;
				}

				await generate({
					fileop: new FileOperation(file.fsPath),
					input: templatePath,
					output: file.fsPath,
					created: true,
				});
			}
		}
	});

	let generateCommand = vscode.commands.registerCommand('ejs-gen.generate', async () => {

		const wsedit = new vscode.WorkspaceEdit();
		const filePath = vscode.Uri.file('/Users/swshin/work/vscode-ejs-gen/examples/xxxx.js');
		vscode.window.showInformationMessage(filePath.toString());
		wsedit.createFile(filePath, { ignoreIfExists: true });
		vscode.workspace.applyEdit(wsedit);
		vscode.window.showInformationMessage('Created a new file: hello/world.md');

		// const editor = vscode.window.activeTextEditor;
		// if (!editor) {
		// 	vscode.window.showErrorMessage('no active editor');
		// 	return;
		// }

		// const document = vscode.window.activeTextEditor?.document;
		// if (!document) {
		// 	vscode.window.showErrorMessage('no active document');
		// 	return;
		// }

		// const directory = dirname(document.fileName);
		// const ejsyamls = findEjsYamls(directory);

		// if (ejsyamls.length === 0) {
		// 	vscode.window.showInformationMessage('ejs-gen: no .ejsyaml files');
		// 	return;
		// }

		// let ejsyaml = matchEjsYamls(ejsyamls, document.fileName);
		// if (!ejsyaml) {
		// 	ejsyaml = await vscode.window.showQuickPick(ejsyamls);
		// 	if (!ejsyaml) {
		// 		return;
		// 	}
		// }

		// const ejsyamlFileName = join(directory, ejsyaml);

		// try {
		// 	const fileop = new FileOperation();
		// 	const text = await generateText(ejsyamlFileName, document.fileName, document.getText(), fileop);
		// 	await fileop.commit();
		// 	var wholeRange = new vscode.Range(
		// 		document.positionAt(0),
		// 		document.positionAt(document.getText().length - 1)
		// 	);
		// 	if (text !== null && text !== undefined) {
		// 		editor.edit(edit => edit.replace(wholeRange, text));
		// 	} else {
		// 		vscode.window.showInformationMessage("ejs-gen: cancelled");
		// 	}
		// } catch (e) {
		// 			if (!(e instanceof CancelError)) {
		// 		if (!(e instanceof CancelError)) {
		// 		}
		// 		vscode.window.showErrorMessage(e.message);
		// 	}
		// }
	});

	let enableCommand = vscode.commands.registerCommand('ejs-gen.enable', () => {
		enabled = true;
		vscode.window.showInformationMessage('ejs-gen: enabled');
	});

	let disableCommand = vscode.commands.registerCommand('ejs-gen.disable', () => {
		enabled = false;
		vscode.window.showInformationMessage('ejs-gen: disabled');
	});


	context.subscriptions.push(enableCommand, disableCommand, generateCommand);
}

// this method is called when your extension is deactivated
export function deactivate() { }
