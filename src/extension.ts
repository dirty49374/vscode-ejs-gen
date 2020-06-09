// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { generateFile, ejsyamlExtension, generateText } from './ejsgen/generator';
import { existsSync, readdirSync } from 'fs';

export async function showQuickPick() {
	let i = 0;
	const result = await vscode.window.showQuickPick(['eins', 'zwei', 'drei'], {
		placeHolder: 'eins, zwei or drei',
		onDidSelectItem: item => vscode.window.showInformationMessage(`Focus ${++i}: ${item}`)
	});
	vscode.window.showInformationMessage(`Got: ${result}`);
}

/**
 * Shows an input box using window.showInputBox().
 */
export async function showInputBox() {
	const result = await vscode.window.showInputBox({
		value: 'abcdef',
		valueSelection: [2, 4],
		placeHolder: 'For example: fedcba. But not: 123',
		validateInput: text => {
			vscode.window.showInformationMessage(`Validating: ${text}`);
			return text === '123' ? 'Not 123!' : null;
		}
	});
	vscode.window.showInformationMessage(`Got: ${result}`);
}

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

	let generateCommand = vscode.commands.registerCommand('ejs-gen.generate', async (uri) => {
		const findEjsYamls = (work: string, curr: string, files: string[]) => {
			const fns = readdirSync(curr);
			for (const fileName of fns) {
				if (fileName.endsWith(ejsyamlExtension)) {
					files.push(relative(work, join(curr, fileName)));
				}
			}

			const parent = dirname(curr);
			if (parent != curr)
				findEjsYamls(work, parent, files);
		}

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

		const ejsyamls: string[] = [];
		const directory = dirname(document.fileName);

		findEjsYamls(directory, directory, ejsyamls);
		
		if (ejsyamls.length == 0) {
			vscode.window.showInformationMessage('ejs-gen: no .ejsyaml files');
			return;
		}

		const result = await vscode.window.showQuickPick(ejsyamls);
		if (!result) {
			return;
		}

		const ejsyamlFileName = join(directory, result);

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

	context.subscriptions.push(enableCommand, disableCommand, generateCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}

import * as path from 'path';
import * as cp from 'child_process';
import { workspace } from 'vscode';

/**
 * A file opener using window.createQuickPick().
 * 
 * It shows how the list of items can be dynamically updated based on
 * the user's input in the filter field.
 */
export async function quickOpen() {
	const uri = await pickFile();
	if (uri) {
		const document = await workspace.openTextDocument(uri);
		await window.showTextDocument(document);
	}
}

class FileItem implements QuickPickItem {

	label: string;
	description: string;
	
	constructor(public base: Uri, public uri: Uri) {
		this.label = path.basename(uri.fsPath);
		this.description = path.dirname(path.relative(base.fsPath, uri.fsPath));
	}
}

class MessageItem implements QuickPickItem {

	label: string;
	description = '';
	detail: string;
	
	constructor(public base: Uri, public message: string) {
		this.label = message.replace(/\r?\n/g, ' ');
		this.detail = base.fsPath;
	}
}

async function pickFile() {
	const disposables: Disposable[] = [];
	try {
		return await new Promise<Uri | undefined>((resolve, reject) => {
			const input = window.createQuickPick<FileItem | MessageItem>();
			input.placeholder = 'Type to search for files';
			let rgs: cp.ChildProcess[] = [];
			disposables.push(
				input.onDidChangeValue(value => {
					rgs.forEach(rg => rg.kill());
					if (!value) {
						input.items = [];
						return;
					}
					input.busy = true;
					const cwds = workspace.workspaceFolders ? workspace.workspaceFolders.map(f => f.uri.fsPath) : [process.cwd()];
					const q = process.platform === 'win32' ? '"' : '\'';
					rgs = cwds.map(cwd => {
						const rg = cp.exec(`rg --files -g ${q}*${value}*${q}`, { cwd }, (err, stdout) => {
							const i = rgs.indexOf(rg);
							if (i !== -1) {
								if (rgs.length === cwds.length) {
									input.items = [];
								}
								if (!err) {
									input.items = input.items.concat(
										stdout
											.split('\n').slice(0, 50)
											.map(relative => new FileItem(Uri.file(cwd), Uri.file(path.join(cwd, relative))))
									);
								}
								if (err && !(<any>err).killed && (<any>err).code !== 1 && err.message) {
									input.items = input.items.concat([
										new MessageItem(Uri.file(cwd), err.message)
									]);
								}
								rgs.splice(i, 1);
								if (!rgs.length) {
									input.busy = false;
								}
							}
						});
						return rg;
					});
				}),
				input.onDidChangeSelection(items => {
					const item = items[0];
					if (item instanceof FileItem) {
						resolve(item.uri);
						input.hide();
					}
				}),
				input.onDidHide(() => {
					rgs.forEach(rg => rg.kill());
					resolve(undefined);
					input.dispose();
				})
			);
			input.show();
		});
	} finally {
		disposables.forEach(d => d.dispose());
	}
}

import { QuickPickItem, window, Disposable, CancellationToken, QuickInputButton, QuickInput, ExtensionContext, QuickInputButtons, Uri } from 'vscode';
import { basename, dirname, join, relative } from 'path';

/**
 * A multi-step input using window.createQuickPick() and window.createInputBox().
 * 
 * This first part uses the helper class `MultiStepInput` that wraps the API for the multi-step case.
 */
export async function multiStepInput(context: ExtensionContext) {

	class MyButton implements QuickInputButton {
		constructor(public iconPath: { light: Uri; dark: Uri; }, public tooltip: string) { }
	}

	const createResourceGroupButton = new MyButton({
		dark: Uri.file(context.asAbsolutePath('resources/dark/add.svg')),
		light: Uri.file(context.asAbsolutePath('resources/light/add.svg')),
	}, 'Create Resource Group');

	const resourceGroups: QuickPickItem[] = ['vscode-data-function', 'vscode-appservice-microservices', 'vscode-appservice-monitor', 'vscode-appservice-preview', 'vscode-appservice-prod']
		.map(label => ({ label }));


	interface State {
		title: string;
		step: number;
		totalSteps: number;
		resourceGroup: QuickPickItem | string;
		name: string;
		runtime: QuickPickItem;
	}

	async function collectInputs() {
		const state = {} as Partial<State>;
		await MultiStepInput.run(input => pickResourceGroup(input, state));
		return state as State;
	}

	const title = 'Create Application Service';

	async function pickResourceGroup(input: MultiStepInput, state: Partial<State>) {
		const pick = await input.showQuickPick({
			title,
			step: 1,
			totalSteps: 3,
			placeholder: 'Pick a resource group',
			items: resourceGroups,
			activeItem: typeof state.resourceGroup !== 'string' ? state.resourceGroup : undefined,
			buttons: [createResourceGroupButton],
			shouldResume: shouldResume
		});
		if (pick instanceof MyButton) {
			return (input: MultiStepInput) => inputResourceGroupName(input, state);
		}
		state.resourceGroup = pick;
		return (input: MultiStepInput) => inputName(input, state);
	}

	async function inputResourceGroupName(input: MultiStepInput, state: Partial<State>) {
		state.resourceGroup = await input.showInputBox({
			title,
			step: 2,
			totalSteps: 4,
			value: typeof state.resourceGroup === 'string' ? state.resourceGroup : '',
			prompt: 'Choose a unique name for the resource group',
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		});
		return (input: MultiStepInput) => inputName(input, state);
	}

	async function inputName(input: MultiStepInput, state: Partial<State>) {
		const additionalSteps = typeof state.resourceGroup === 'string' ? 1 : 0;
		// TODO: Remember current value when navigating back.
		state.name = await input.showInputBox({
			title,
			step: 2 + additionalSteps,
			totalSteps: 3 + additionalSteps,
			value: state.name || '',
			prompt: 'Choose a unique name for the Application Service',
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		});
		return (input: MultiStepInput) => pickRuntime(input, state);
	}

	async function pickRuntime(input: MultiStepInput, state: Partial<State>) {
		const additionalSteps = typeof state.resourceGroup === 'string' ? 1 : 0;
		const runtimes = await getAvailableRuntimes(state.resourceGroup!, undefined /* TODO: token */);
		// TODO: Remember currently active item when navigating back.
		state.runtime = await input.showQuickPick({
			title,
			step: 3 + additionalSteps,
			totalSteps: 3 + additionalSteps,
			placeholder: 'Pick a runtime',
			items: runtimes,
			activeItem: state.runtime,
			shouldResume: shouldResume
		});
	}

	function shouldResume() {
		// Could show a notification with the option to resume.
		return new Promise<boolean>((resolve, reject) => {
			// noop
		});
	}

	async function validateNameIsUnique(name: string) {
		// ...validate...
		await new Promise(resolve => setTimeout(resolve, 1000));
		return name === 'vscode' ? 'Name not unique' : undefined;
	}

	async function getAvailableRuntimes(resourceGroup: QuickPickItem | string, token?: CancellationToken): Promise<QuickPickItem[]> {
		// ...retrieve...
		await new Promise(resolve => setTimeout(resolve, 1000));
		return ['Node 8.9', 'Node 6.11', 'Node 4.5']
			.map(label => ({ label }));
	}

	const state = await collectInputs();
	window.showInformationMessage(`Creating Application Service '${state.name}'`);
}


// -------------------------------------------------------
// Helper code that wraps the API for the multi-step case.
// -------------------------------------------------------


class InputFlowAction {
	static back = new InputFlowAction();
	static cancel = new InputFlowAction();
	static resume = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
	title: string;
	step: number;
	totalSteps: number;
	items: T[];
	activeItem?: T;
	placeholder: string;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

interface InputBoxParameters {
	title: string;
	step: number;
	totalSteps: number;
	value: string;
	prompt: string;
	validate: (value: string) => Promise<string | undefined>;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

class MultiStepInput {

	static async run<T>(start: InputStep) {
		const input = new MultiStepInput();
		return input.stepThrough(start);
	}

	private current?: QuickInput;
	private steps: InputStep[] = [];

	private async stepThrough<T>(start: InputStep) {
		let step: InputStep | void = start;
		while (step) {
			this.steps.push(step);
			if (this.current) {
				this.current.enabled = false;
				this.current.busy = true;
			}
			try {
				step = await step(this);
			} catch (err) {
				if (err === InputFlowAction.back) {
					this.steps.pop();
					step = this.steps.pop();
				} else if (err === InputFlowAction.resume) {
					step = this.steps.pop();
				} else if (err === InputFlowAction.cancel) {
					step = undefined;
				} else {
					throw err;
				}
			}
		}
		if (this.current) {
			this.current.dispose();
		}
	}

	async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({ title, step, totalSteps, items, activeItem, placeholder, buttons, shouldResume }: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = window.createQuickPick<T>();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.placeholder = placeholder;
				input.items = items;
				if (activeItem) {
					input.activeItems = [activeItem];
				}
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidChangeSelection(items => resolve(items[0])),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}

	async showInputBox<P extends InputBoxParameters>({ title, step, totalSteps, value, prompt, validate, buttons, shouldResume }: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = window.createInputBox();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.value = value || '';
				input.prompt = prompt;
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				let validating = validate('');
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidAccept(async () => {
						const value = input.value;
						input.enabled = false;
						input.busy = true;
						if (!(await validate(value))) {
							resolve(value);
						}
						input.enabled = true;
						input.busy = false;
					}),
					input.onDidChangeValue(async text => {
						const current = validate(text);
						validating = current;
						const validationMessage = await current;
						if (current === validating) {
							input.validationMessage = validationMessage;
						}
					}),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}
}
