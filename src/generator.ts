import * as ejs from 'ejs';
import * as fs from 'fs';
import { extname } from 'path';

export function generateFile(file: string, template: string): void {
  if (extname(file).toLowerCase() != '.ejs-gen') {
    throw new Error("file extension is not .ejs-gen");
  }

  const outfile = file.substr(0, file.length - 8);
  const text = ejs.render(template, {});

  fs.writeFileSync(outfile, text, 'utf-8');
}
