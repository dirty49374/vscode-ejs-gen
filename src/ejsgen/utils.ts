import { readdirSync, existsSync, fstatSync, lstatSync } from "fs";
import { basename, dirname, join } from "path";

export const logdebug = (...args: any[]) => console.log(...args);

const matchFileName = (genericTplFileName: string, fileName: string): boolean => {
    const pattern = genericTplFileName.slice(0, - '.ejsyaml'.length).split(/@+/, 2);
    return fileName.startsWith(pattern[0]) && fileName.endsWith(pattern[1]);
};

const findGenericTemplateFor = (directory: string, fileName: string, level: number = 0): string | null => {
    const matchFn = (fn: string) => 
        fn.endsWith('.ejsyaml') &&
        fn.indexOf('@') !== -1 &&
        (level === 0 || fn.indexOf("@@") !== -1) &&
        matchFileName(fn, fileName);
    
    const tplFileName = readdirSync(directory).find(matchFn);
    if (tplFileName) {
        return join(directory, tplFileName);
    }

    const parent = dirname(directory);
    if (parent === directory) {
        return null;
    }

    return findGenericTemplateFor(parent, fileName, level + 1);
};

export const findTemplateFileFor = (path: string): string | null => {
    const defTemplate = `${path}.ejsyaml`;
    if (existsSync(defTemplate)) {
        return defTemplate;
    }
    
    return findGenericTemplateFor(dirname(path), basename(path));
};

const findOutputFilesForGeneric = (directory: string, tplFileName: string, files: string[]) => {
    const fns = readdirSync(directory);
    for (let fn of fns) {
        matchFileName(tplFileName, fn) && files.push(fn);
    }

    if (tplFileName.indexOf('@@') !== -1) {
        for (let fn of fns) {
            const dir = join(directory, fn);
            lstatSync(dir).isDirectory() && findOutputFilesForGeneric(dir, tplFileName, files);
        }
    }
};

export const findOutputFilesFor = (path: string): string[] => {
    const fileName = basename(path);
    if (fileName.indexOf('@') === -1) {
        return [ path.slice(0, - '.ejsyaml'.length) ];
    }

    const files: string[] = [];
    findOutputFilesForGeneric(dirname(path), basename(path), files);

    return files;
};
