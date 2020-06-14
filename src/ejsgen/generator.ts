import * as fs from 'fs';
import * as Path from 'path';
import * as ejs from 'ejs';
import { loadYaml, loadYamls, evaluate, dumpYaml, dumpYamls } from './yaml';
import { extractBlocks, BlockMarker, BlockMarkerPattern, Blocks, createMarker } from './block';

export class CancelError extends Error {}

export interface IFileOperation {
  readFile(fsPath: string): string | null;
  writeFile(fsPath: string, content: string): void;
  commit(): Promise<string[]>;
}

export interface IGeneratorOption {
  input: string;
  output?: string;
  data?: any;
  template?: string;
  fileop: IFileOperation;
  cwd?: string;
  name?: string;
  lastOutput?: string;
  created?: boolean;
}

const saveFileSplitter = `<SAVE-FILE-a43c7503-5de4-40a3-901a-a2d4c221efb2>`;

class Generator {
  public markers: BlockMarker[];
  public blocks: Blocks = {};
  public canceled = false;
  public name: string;

  public fileop: IFileOperation;
  public input: string;
  public output: string;
  public cwd: string;
  public data: any;
  public template?: string;
  public lastOutput: string | null;
  public isNew: boolean;
  public skipped: boolean = false;

  constructor(options: IGeneratorOption) {
    this.fileop = options.fileop;
    this.input = options.input;
    this.output = options.output || options.input.split('.').slice(0, -1).join('.');
    this.cwd = options.cwd || Path.dirname(options.input);
    this.data = options.data;
    this.template = options.template;
    this.lastOutput = options.lastOutput || null;
    this.name = options.name || Path.basename(this.output).split('.')[0];
    this.isNew = options.created || false;
    this.markers = [
      createMarker({ begin: '// {{{ @name', end: '// }}}' }),
      createMarker({ begin: '/* {{{ @name', end: '   }}} */' }),
    ];
    this.$init();
  }

  // block APIs
  marker(markers: BlockMarkerPattern | BlockMarkerPattern[]) {
    this.$setMarker(markers instanceof Array ? markers : [markers]);
    this.blocks = extractBlocks(this.lastOutput || '', this.markers);
  }

  rawBlock(name: string) {
    return this.blocks[name]?.content || '';
  }

  dataBlock(name: string, defaults: any, markerIndex?: number): any {
    const block = this.rawBlock(name);
    const data = this.fromYaml(block) || defaults;
    this.setBlock(name, this.toYaml(data), markerIndex);

    return data;
  }

  modifyBlock(name: string, cb: (txt: string) => string, markerIndex?: number): any {
    const content = this.rawBlock(name);
    const modified = cb(content);
    this.setBlock(name, modified, markerIndex);
    return modified;
  }

  setBlock(name: string, content: string, markerIndex?: number) {
    if (this.blocks[name]) {
      this.blocks[name].content = content;
    } else {
      this.blocks[name] = {
        name: name,
        beginMarker: this.markers[markerIndex || 0].begin.replace('@name', name),
        content: content,
        endMarker: this.markers[markerIndex || 0].end.replace('@name', name),
        markerIndex: 0,
      };
    }
  }

  block(name: string, defaultContent?: string, markerIndex?: number) {
    const block = this.blocks[name];
    if (block) {
      return `${block.beginMarker}\n${block.content}\n${block.endMarker}`;
    }

    const beginMarker = this.markers[markerIndex || 0].begin?.replace('@name', name);
    const endMarker = this.markers[markerIndex || 0].end?.replace('@name', name);

    return `${beginMarker}\n${defaultContent || ''}\n${endMarker}`;
  }

  render(inputPath: string, outputPath: string, data: any) {
    const input = this.resolvePath(inputPath);
    const output = this.resolvePath(outputPath);

    const template = this.fileop.readFile(input);
    if (template === null) {
      throw new Error(`ejs file '${input}' not found.`);
    }

    data = data !== undefined ? data : this.data;

    const ctx = new Generator({
      fileop: this.fileop,
      input: input,
      output: output,
      cwd: Path.dirname(output),
      data,
      created: false,
    });
    ctx.execute(template);
  }

  outfile(path: string) {
    this.output = this.resolvePath(path);
    this.lastOutput = null;
    this.$init();

    return `${saveFileSplitter}${this.output}${saveFileSplitter}`;
  }

  cancel() {
    throw new CancelError();
  }

  skip() {
    this.skipped = true;
  }

  // utility functions
  read(path: string): string | null {
    const file = Path.resolve(Path.dirname(this.input), path);
    return this.fileop.readFile(file);
  }

  capitalize = (text: string): string => text[0].toUpperCase() + text.substr(1);
  uncapitalize = (text: string): string => text[0].toLowerCase() + text.substr(1);

  fromYaml = loadYaml;
  fromYamls = loadYamls;

  toYaml = dumpYaml;
  toYamls = dumpYamls;

  dirname = Path.dirname;
  basename = Path.basename;
  extname = Path.extname;

  // entry point
  private execute(template: string) {
    const result = ejs.render(template, { ...this.data, $: this }, { filename: this.input, context: this });

    if (this.skipped) {
      return;
    }

    const sections = result.split(saveFileSplitter);
    if (sections.length > 1) {
      sections.shift();
  
      while (sections.length > 1) {
        const outpath = sections.shift()!;
        const text = sections.shift()!;
  
        this.fileop.writeFile(outpath, text);
      }
    } else {
      this.fileop.writeFile(this.output, sections[0]);
    }
  }

  async generate(): Promise<void> {
    if (this.template === undefined) {
      const yaml = this.fileop.readFile(this.input);
      if (yaml === null) {
        throw new Error(`'ejsyaml file '${this.input} not found`);
      }
      const [ data, template ] = await evaluate(loadYamls(yaml), Path.dirname(this.input));
      if (template === undefined) {
        throw new Error('.ejsyaml file should have at least 2 documents.');
      }
    
      if (this.data === undefined) {
        this.data = data;
      }
      this.template = template;
    }
  
    this.execute(this.template!);
  }

  // internal implementation
  private $setMarker(markers: BlockMarkerPattern[]) {
    this.markers = markers.map(m => {
      if (m.begin.indexOf('@name') < 0) {
        throw new Error("begin marker must have '@name' mark.");
      }
      return createMarker(m);
    });
  }

  private $init() {
    this.lastOutput = this.fileop.readFile(this.output);
    this.blocks = extractBlocks(this.lastOutput || '', this.markers);
  }

  private resolvePath(path: string): string {
    return Path.isAbsolute(path)
      ? path
      : Path.resolve(this.cwd, path);
  }
}

export const generateTemplate = async (options: IGeneratorOption) => {
  await new Generator(options).generate();
  return await options.fileop.commit();
};
