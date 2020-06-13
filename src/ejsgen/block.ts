export interface BlockMarkerPattern {
  begin: string;
  end: string;
}

export interface BlockMarker extends BlockMarkerPattern {
  beginRegexp: RegExp;
  endRegexp: RegExp;
}

export interface Block {
  name?: string;
  beginMarker?: string;
  content?: string;
  endMarker?: string;
  markerIndex?: number;
}

export interface Blocks {
  [name: string]: Block;
}

const makeMarkerRegex = (marker: string): RegExp => {
  const markerRegex = marker
  .trim()
  .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  .replace('@name', '([0-9A-Za-z-_:]+)');
  return new RegExp(`^\\s*${markerRegex}(?:.|\r)*$`);
};

const matchBeginMarker = (line: string, markers: BlockMarker[]): [ RegExpMatchArray | null, number ] => {
  for (let index = 0; index < markers.length; ++index) {
    const match = line.match(markers[index].beginRegexp);
    if (match !== null) {
      return [ match, index ];
    }
  }
  return [ null, -1 ];
};

export const createMarker = (pattern: BlockMarkerPattern): BlockMarker => {
  return {
    ...pattern,
    beginRegexp: makeMarkerRegex(pattern.begin),
    endRegexp: makeMarkerRegex(pattern.end),
  };
};

export const extractBlocks = (source: string, markers: BlockMarker[]): Blocks => {
  const blocks: Blocks = {};
  const lines = source.split('\n');

  let block: Block | null = null;
  let contents: string[] = [];

  for (let line of lines) {
    if (block === null) {
      const [ match, index ] = matchBeginMarker(line, markers);
      if (match !== null) {
        block = {
          name: match[1],
          beginMarker: line,
          markerIndex: index,
        };
      }
    } else {
      const m = line.match(markers[block.markerIndex!].endRegexp);
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
};
