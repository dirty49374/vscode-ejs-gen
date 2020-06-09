
interface Block {
  name?: string;
  beginMarker?: string;
  content?: string;
  endMarker?: string;
}

export interface Blocks {
  [name: string]: Block;
}

function escapeRegex(regex: string): string {
  return regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function makeMarkerRegex(marker: string): RegExp {
  const regexp = '^\\s*' + escapeRegex(marker).replace('@name', '([0-9A-Za-z-_:]+)') + '(?:.|\r)*$';
  return new RegExp(regexp);
}

export function extractBlocks(source: string, beginMarker: string, endMarker: string): Blocks {
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
        block = {
          name: m[1],
          beginMarker: line,
        };
      }
    } else {
      const m = line.match(endMarkerRegex);
      if (m != null) {
        block.content = contents.join('\n');
        block.endMarker = line.endsWith('\r') ? line.substr(0, line.length - 1) : line;
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
