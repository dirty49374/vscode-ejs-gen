import * as ejs from 'ejs';
import * as fs from 'fs';
import { load, dump, loadAll } from 'js-yaml';
import { basename } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { render } from 'ejs';
import * as Path from 'path';

export const ejsyamlExtension = '.ejsyaml';
export const zz = 1;

interface Block {
  name?: string;
  beginMarker?: string;
  content?: string;
  endMarker?: string;
}

interface Blocks {
  [name: string]: Block;
}

function escapeRegex(regex: string): string {
  return regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function makeMarkerRegex(marker: string): RegExp {
  const regexp = '^\\s*' + escapeRegex(marker).replace('@name', '([0-9A-Za-z-_:]+)') + '(?:.|\r)*$';
  console.error(regexp);
  return new RegExp(regexp);
}

function extractBlocks(source: string, beginMarker: string, endMarker: string): Blocks {
  const beginMarkerRegex = makeMarkerRegex(beginMarker);
  const endMarkerRegex = makeMarkerRegex(endMarker);

  const blocks: Blocks = {};
  const lines = source.split('\n');

  let block: Block | null = null;
  let contents: string[] = [];

  for (let line of lines) {
    if (block === null) {
      const m = line.match(beginMarkerRegex);
      if (m !== null) {
        console.error('BLOCK BEGIN: ' + line);
        block = {
          name: m[1],
          beginMarker: line,
        };
      } else {
        console.log('BLOCK ----: ' + line);
      }
    } else {
      const m = line.match(endMarkerRegex);
      if (m != null) {
        console.error('BLOCK END: ' + line);
        block.content = contents.join('\n');
        block.endMarker = line.endsWith('\r') ? line.substr(0, line.length - 1) : line;
        blocks[block.name!] = block;

        contents = [];
        block = null;
      } else {
        console.log('BLOCK ----: ' + line);
        contents.push(line);
      }
    }
  }

  return blocks;
}

class Context {
  public beginMarker = '// {{{ @name';
  public endMarker = '// }}}';
  public blocks: Blocks = {};
  public canceled = false;
  public lastOutput: string | null = null;

  constructor(
    public inputFile: string,
    public outputFile: string,
    public data: any,
    private generatedFiles: string[]) {
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

  out(path: string) {
    this.outputFile = this.resolve(path);
    this.$init();
  }

  resolve(path: string): string {
    if (Path.isAbsolute(path)) {
      return path;
    }
    return Path.resolve(Path.dirname(this.outputFile), path);
  }

  render(ejsPath: string, outputPath: string, data: any) {
    const inputFile = this.resolve(ejsPath);
    const outputFile = this.resolve(outputPath);
    
    const template = readFileSync(inputFile, 'utf-8');
    data = data !== undefined ? data : this.data;

    const ctx = new Context(inputFile, outputFile, data, this.generatedFiles);
    const output = render(template, { ...data, $: ctx }, { filename: inputFile });
    if (!ctx.canceled) {
      writeFileSync(ctx.outputFile, output, 'utf-8');
      this.generatedFiles.push(basename(outputFile))
    }
  }

  cancel() {
    this.canceled = true;
  }

  read(path: string): string | null {
    try {
      const file = Path.resolve(Path.dirname(this.inputFile), path);
      return readFileSync(file, 'utf-8');
    } catch (e) {
      return null;
    }
  }

  fromYaml(text: string) {
    return load(text);
  }

  fromYamls(text: string) {
    return loadAll(text);
  }

  toYaml(doc: any) {
    return dump(doc);
  }
}

export async function generateFile(ejsyamlPath: string): Promise<string[]> {
  const yaml = fs.readFileSync(ejsyamlPath, 'utf-8');
  const docs = loadAll(yaml);

  if (docs.length < 2) {
    throw new Error(".ejsyaml file should have at least 2 documents.")
  }

  const inputFile = ejsyamlPath;
  const outputFile = ejsyamlPath.substr(0, inputFile.length - ejsyamlExtension.length);
  const data = docs[0];
  const templates = docs.slice(1);

  const generatedFiles: string[] = [];
  for (let template of templates) {
    const ctx = new Context(inputFile, outputFile, data, generatedFiles);
    const output = render(template, { ...data, $: ctx }, { filename: inputFile });
    if (!ctx.canceled) {
      writeFileSync(ctx.outputFile, output, 'utf-8');
      generatedFiles.push(basename(outputFile))
    }
  }

  return generatedFiles;
}
