import { basename, extname } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { loadAll } from 'js-yaml';
import { render } from 'ejs';

interface block {
  wsBegin: string;
  content: string;
  wsEnd: string;
}

class Context {
  private blocks: { [name: string]: block } = {};
  private beginBlockMarker: string = '// -->> ';
  private endBlockMarker: string = '// <<-- ';

  public inputFile: string;
  public outputFile: string;
  public name: string;

  constructor(
    public inputPath: string,
    public outputPath: string,
    private prev: string) {
    this.inputFile = basename(inputPath);
    this.outputFile = basename(inputPath);
    this.name = this.outputFile.split('.')[0];
    this.extractBlocks();
  }

  private extractBlocks() {
    this.blocks = {};

    let name = null;
    let wsBegin: string = '';

    let content: string[] = [];
    for (let line of this.prev.split('\n')) {
      if (name == null) {
        const ltrim = line.trimLeft();
        if (ltrim.startsWith(this.beginBlockMarker)) {
          wsBegin = line.substr(0, line.length - ltrim.length);
          name = ltrim.substr(this.beginBlockMarker.length).trim();
        }
      } else {
        const ltrim = line.trimLeft();
        if (ltrim.startsWith(this.endBlockMarker)) {
          this.blocks[name] = {
            wsBegin,
            content: content.join('\n'),
            wsEnd: line.substr(0, line.length - ltrim.length)
          }
          name = null;
          content = [];
        } else {
          content.push(line);
        }
      }
    }

    if (name != null) {
      this.blocks[name] = { wsBegin, content: content.join('\n'), wsEnd: '' }
    }
  }

  blockMarker(beginBlockMarker: string, endBlockMarker: string): void {
    this.beginBlockMarker = beginBlockMarker.trim();
    this.endBlockMarker = endBlockMarker.trim();
    this.extractBlocks();
  }

  block(name: string, defaultContent?: string): string {
    const block = this.blocks[name] || { wsBegin: '', content: defaultContent || '', wsEnd: '' };

    return block.wsBegin + this.beginBlockMarker + name + '\n' +
      block.content + '\n' +
      block.wsEnd + this.endBlockMarker + name + '\n';
  }
}

export function generateFile(inputPath: string, outputPath: string, source: string): void {
  const prevOutput = existsSync(outputPath) ? readFileSync(outputPath, 'utf-8') : '';

  const [data, template] = loadAll(source);
  if (template == undefined || typeof template != 'string') {
    throw new Error('wrong ejs-gen file');
  }

  const context = new Context(inputPath, outputPath, prevOutput);
  const text = render(template, { ...data, $: context }, { filename: inputPath });

  writeFileSync(outputPath, text, 'utf-8');
}
