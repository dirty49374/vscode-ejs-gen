import * as ejs from 'ejs';
import * as fs from 'fs';
import { load, dump, loadAll } from 'js-yaml';
import { basename } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { render } from 'ejs';
import * as Path from 'path';
import fetch from 'node-fetch';

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

function extractBlocks(source: string, beginMarker: string, endMarker: string): Blocks {
  const blocks: Blocks = {};
  const lines = source.split('\n');

  let block: Block | null = null;
  let contents: string[] = [];
  let name: string, tmp: string;

  for (let line of lines) {
    const ltrim = line.trimLeft();

    if (block === null) {
      if (ltrim.startsWith(beginMarker)) {
        block = {
          name: ltrim.substr(beginMarker.length).split(' ', 2)[0],
          beginMarker: line,
        };
      }
    } else {
      if (ltrim.startsWith(endMarker)) {
        block.content = contents.join('\n');
        block.endMarker = line;
        blocks[block.name!] = block;

        contents = [];
        block = null;
      } else {
        contents.push(line);
      }
    }
  }

  return blocks;
}

class Context {
  public beginMarker = '// {{{ ';
  public endMarker = '// }}} ';
  public blocks: Blocks = {};

  constructor(
    public inputFile: string,
    public outputFile: string,
    public model: any,
    public lastOutput: string | null) {
    this.marker(this.beginMarker, this.endMarker);
  }

  marker(beginMarker: string, endMarker: string) {
    this.beginMarker = beginMarker;
    this.endMarker = endMarker;
    this.blocks = extractBlocks(this.lastOutput || '', this.beginMarker, this.endMarker);
  }

  rawBlock(name: string) {
    return this.blocks[name]?.content || '';
  }

  fetch = fetch;

  block(name: string, defaultContent?: string) {
    const block = this.blocks[name];
    return block
      ? `${block.beginMarker}\n${block.content}\n${block.endMarker}`
      : `${this.beginMarker}${name}\n${defaultContent || ''}\n${this.endMarker}${name}`;
  }

  out(path: string) {
    if (Path.isAbsolute(path)) {
      return this.outputFile = path;
    } else {
      console.log('INPUT_FILE', this.inputFile);
      console.log('REL', path);
      this.outputFile = Path.resolve(Path.dirname(this.inputFile), path);
      console.log('OUT=', this.outputFile);
    }
  }

  fromYaml(text: string) {
    return load(text);
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
  const model = docs[0];
  const templates = docs.slice(1);

  const lastOutput = fs.existsSync(outputFile)
    ? readFileSync(outputFile, 'utf-8')
    : null;
  const ctx = new Context(inputFile, outputFile, model, lastOutput);

  const output = await render(templates[0], { ...model, $: ctx }, { filename: inputFile, async: true });

  writeFileSync(ctx.outputFile, output, 'utf-8');
  return [ basename(outputFile) ];
}
