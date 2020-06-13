import * as vscode from 'vscode';
import { basename } from 'path';
import { readFileSync, existsSync } from 'fs';
import { CancelError, IFileOperation } from './ejsgen/generator';

export class FileOperation implements IFileOperation {
    private files: { [path: string]: string } = {};

    constructor(private saving?: string) {
    }

    readFile(fsPath: string): string | null {
        const document = vscode.workspace.textDocuments.find(p => p.uri.fsPath === fsPath);
        if (document) {
            if (document.isDirty && this.saving !== fsPath) {
                throw new Error(`file '${basename(fsPath)}' has unsaved changes. (path = ${fsPath})`);
            }
            return document.getText();
        }

        try {
            const content = readFileSync(fsPath, 'utf-8');
            return content;
        } catch (e) {
                if (!(e instanceof CancelError)) {
            }
            return null;
        }
    }

    writeFile(path: string, content: string): void {
        if (typeof content !== 'string') {
            throw new Error('failed to write');
        }
        this.files[path] = content;
    }

    create(edit: vscode.WorkspaceEdit, path: string): boolean {
        if (existsSync(path)) {
            return false;
        }
        edit.createFile(vscode.Uri.file(path), { ignoreIfExists: true });
        return true;
    }

    async modify(edit: vscode.WorkspaceEdit, path: string, content: string): Promise<vscode.TextDocument | null> {
        const document = await vscode.workspace.openTextDocument(path);
        if (!document) {
            throw new Error(`failed to read file '${path}'`);
        }

        if (document.getText() === content) {
            return null;
        }

        var wholeRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        edit.replace(document.uri, wholeRange, content);

        return this.saving !== document.uri.fsPath
            ? document
            : null;
    }

    async commit(): Promise<string[]> {
        let edit = new vscode.WorkspaceEdit();

        const created = Object.entries(this.files)
            .reduce((created, e) => this.create(edit, e[0]) || created, false);
        if (created) {
            await vscode.workspace.applyEdit(edit);
            edit = new vscode.WorkspaceEdit();
        }

        const documents = await Promise.all(Object.entries(this.files).map(e => this.modify(edit, e[0], e[1])));
        await vscode.workspace.applyEdit(edit);

        const docsToSave = documents.filter(doc => doc) as vscode.TextDocument[];
        await Promise.all(docsToSave.map(doc => doc.save()));

        return docsToSave.map(doc => basename(doc.uri.fsPath));
    }
};
