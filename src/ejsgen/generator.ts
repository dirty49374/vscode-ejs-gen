import * as fs from 'fs';
import * as path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { render } from 'ejs';
import { loadYaml, loadYamls, evaluate, dumpYaml } from './yaml';
import { extractBlocks, Blocks } from './block';

export const ejsyamlExtension = '.ejsyaml';

const saveFileSplitter = `<SAVE-FILE-a43c7503-5de4-40a3-901a-a2d4c221efb2>`;

const saveOutput = (output: string, outpath: string, generatedFiles: string[]) => {
  // sections = [ output_text ]
  //          | [ dummy, path1, text1, path2, text2 ]
  const sections = output.split(saveFileSplitter);

  if (sections.length > 1) {
    sections.shift();

    while (sections.length > 1) {
      const outpath = sections.shift()!;
      const text = sections.shift()!;
  
      writeFileSync(outpath, text, 'utf-8');
      generatedFiles.push(path.basename(outpath))
    }
  } else {
    writeFileSync(outpath, sections[0], 'utf-8');
    generatedFiles.push(path.basename(outpath))
  }
}

class Context {
  public beginMarker = '// {{{ @name';
  public endMarker = '// }}}';
  public blocks: Blocks = {};
  public canceled = false;
  public name: string;

  constructor(
    public inputFile: string,
    public outputFile: string,
    public cwd: string,
    name: string | null,
    public data: any,
    public lastOutput: string | null,
    private generatedFiles: string[],
    public autogen: boolean) {

    this.name = name || path.basename(this.inputFile).split('.')[0];
    this.$init();
    this.marker(this.beginMarker, this.endMarker);
  }

  private $setMarker(beginMarker: string, endMarker: string) {
    if (beginMarker.indexOf('@name') < 0) {
      throw new Error("begin marker must have '@name' mark.");
    }

    this.beginMarker = beginMarker;
    this.endMarker = endMarker;
  }

  private $init() {
    try {
      this.lastOutput = readFileSync(this.outputFile, 'utf-8');
    } catch (e) {
      this.lastOutput = null;
    }
    this.blocks = extractBlocks(this.lastOutput || '', this.beginMarker, this.endMarker);
  }

  marker(beginMarker: string, endMarker: string) {
    this.$setMarker(beginMarker, endMarker);
    this.blocks = extractBlocks(this.lastOutput || '', this.beginMarker, this.endMarker);
  }

  rawBlock(name: string) {
    return this.blocks[name]?.content || '';
  }

  block(name: string, defaultContent?: string) {
    const block = this.blocks[name];
    return block
      ? `${block.beginMarker}\n${block.content}\n${block.endMarker}`
      : `${this.beginMarker?.replace('@name', name)}\n${defaultContent || ''}\n${this.endMarker?.replace('@name', name)}`;
  }

  outfile(p: string) {
    this.outputFile = this.resolve(p);
    this.lastOutput = null;
    this.$init();

    return `${saveFileSplitter}${this.outputFile}${saveFileSplitter}`;
  }

  resolve(p: string): string {
    if (path.isAbsolute(p)) {
      return p;
    }
    return path.resolve(this.cwd, p);
  }

  render(ejsPath: string, outputPath: string, data: any) {
    const inputFile = this.resolve(ejsPath);
    const outputFile = this.resolve(outputPath);
    
    const template = readFileSync(inputFile, 'utf-8');
    data = data !== undefined ? data : this.data;

    const ctx = new Context(inputFile, outputFile, path.dirname(outputFile), null, data, null, this.generatedFiles, this.autogen);
    const output = render(template, { ...data, $: ctx }, { filename: inputFile });
    if (!ctx.canceled) {
      saveOutput(output, ctx.outputFile, this.generatedFiles);
    }
  }

  cancel() {
    this.canceled = true;
  }

  read(p: string): string | null {
    try {
      const file = path.resolve(path.dirname(this.inputFile), p);
      return readFileSync(file, 'utf-8');
    } catch (e) {
      return null;
    }
  }

  upperFirst(text: string): string {
    return text[0].toUpperCase() + text.substr(1);
  }

  lowerFirst(text: string): string {
    return text[0].toUpperCase() + text.substr(1);
  }

  fromYaml(text: string) {
    return loadYaml(text);
  }

  fromYamls(text: string) {
    return loadYamls(text);
  }

  toYaml(doc: any) {
    return dumpYaml(doc);
  }

  dirname = path.dirname;
  basename = path.basename;
  extname = path.extname;
}

export const generateFile = async (ejsyamlPath: string): Promise<string[]> => {
  const yaml = fs.readFileSync(ejsyamlPath, 'utf-8');
  const docs = await evaluate(loadYamls(yaml));

  if (docs.length < 2) {
    throw new Error(".ejsyaml file should have at least 2 documents.")
  }

  const inputFile = ejsyamlPath;
  const outputFile = ejsyamlPath.substr(0, inputFile.length - ejsyamlExtension.length);
  const data = docs[0];
  const templates = docs.slice(1);

  const generatedFiles: string[] = [];
  for (let template of templates) {
    const ctx = new Context(inputFile, outputFile, path.dirname(outputFile), null, data, null, generatedFiles, true);
    const output = render(template, { ...data, $: ctx }, { filename: inputFile });
    if (!ctx.canceled) {
      saveOutput(output, ctx.outputFile, generatedFiles);
    }
  }

  return generatedFiles;
}

export const generateText = async (ejsyamlPath: string, outputFile: string, lastOutput: string): Promise<string | null> => {
  const yaml = fs.readFileSync(ejsyamlPath, 'utf-8');
  const docs = await evaluate(loadYamls(yaml));

  if (docs.length < 2) {
    throw new Error(".ejsyaml file should have at least 2 documents.")
  }

  const inputFile = ejsyamlPath;
  const data = docs[0];
  const templates = docs.slice(1);
  if (!outputFile) {
    outputFile = ejsyamlPath.substr(0, inputFile.length - ejsyamlExtension.length);
  }

  const generatedFiles: string[] = [];
  for (let template of templates) {
    const ctx = new Context(inputFile, outputFile, path.dirname(outputFile), path.basename(outputFile).split('.')[0], data, lastOutput, generatedFiles, false);
    const output = render(template, { ...data, $: ctx }, { filename: inputFile });
    return ctx.canceled ? null : output;
  }
  return null;
}
