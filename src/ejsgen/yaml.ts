import { Type, Schema, load, loadAll, dump } from 'js-yaml';
import fetch, { RequestInit } from 'node-fetch';
import { readFileSync } from 'fs';
import { resolve } from 'path';

abstract class CustomTag { abstract evaluate(cwd: string): Promise<any>; }
class FetchTag extends CustomTag {
  constructor(public url: string, public init?: RequestInit, public type?: string) { super(); }
  async evaluate(cwd: string): Promise<any> {
    const response = await fetch(this.url, this.init);
    switch (this.type) {
      case 'text':
        return await response.text();
      case 'yaml':
        return loadYaml(await response.text());
      case 'yamls':
        return loadYamls(await response.text());
      default:
        return await response.json()
    }
  }
}
class FetchJsonTag extends FetchTag { constructor(public url: string) { super(url, undefined, 'json'); } }
class FetchTextTag extends FetchTag { constructor(public url: string) { super(url, undefined, 'text'); } }
class FetchYamlTag extends FetchTag { constructor(public url: string) { super(url, undefined, 'yaml'); } }

class ReadTag extends CustomTag {
  constructor(public path: string, public type?: string) { super(); }
  async evaluate(cwd: string): Promise<any> {
    const resolved = resolve(cwd, this.path);
    console.log('EVAL', resolved);
    const data = readFileSync(resolved, 'utf-8');
    switch (this.type) {
      case 'text':
        return data;
      case 'yaml':
        return loadYaml(data);
      case 'yamls':
        return loadYamls(data);
      default:
        return JSON.parse(data);
    }
  }
}
class ReadJsonTag extends ReadTag { constructor(public path: string) { super(path, 'json'); } }
class ReadTextTag extends ReadTag { constructor(public path: string) { super(path, 'text'); } }
class ReadYamlTag extends ReadTag { constructor(public path: string) { super(path, 'yaml'); } }

const FetchType = new Type(
  '!fetch',
  {
    kind: 'mapping',
    resolve: data => data !== null && typeof data == 'object' && !data.url,
    construct: data => new FetchTag(data.url, data.options),
    instanceOf: FetchTag,
    represent: (tag: any) => ({ url: tag.url, options: tag.options }),
  });

const FetchJsonType = new Type(
  '!fetchjson',
  {
    kind: 'scalar',
    resolve: data => data !== null && typeof data == 'string',
    construct: data => new FetchJsonTag(data),
    instanceOf: FetchJsonTag,
    represent: (tag: any) => tag.url,
  });

const FetchTextType = new Type(
  '!fetchtext',
  {
    kind: 'scalar',
    resolve: data => data !== null && typeof data == 'string',
    construct: data => new FetchTextTag(data),
    instanceOf: FetchTextTag,
    represent: (tag: any) => tag.url,
  });

const FetchYamlType = new Type(
  '!fetchyaml',
  {
    kind: 'scalar',
    resolve: data => data !== null && typeof data == 'string',
    construct: data => new FetchYamlTag(data),
    instanceOf: FetchYamlTag,
    represent: (tag: any) => tag.url,
  });

const ReadType = new Type(
  '!read',
  {
    kind: 'mapping',
    resolve: data => data !== null && typeof data == 'object' && !data.path,
    construct: data => new ReadTag(data.path, data.type),
    instanceOf: ReadTag,
    represent: (tag: any) => ({ path: tag.path, type: tag.type }),
  });

const ReadJsonType = new Type(
  '!readjson',
  {
    kind: 'scalar',
    resolve: data => data !== null && typeof data == 'string',
    construct: data => new ReadJsonTag(data),
    instanceOf: ReadJsonTag,
    represent: (tag: any) => tag.url,
  });

const ReadTextType = new Type(
  '!readtext',
  {
    kind: 'scalar',
    resolve: data => data !== null && typeof data == 'string',
    construct: data => new ReadTextTag(data),
    instanceOf: ReadTextTag,
    represent: (tag: any) => tag.url,
  });

const ReadYamlType = new Type(
  '!readyaml',
  {
    kind: 'scalar',
    resolve: data => data !== null && typeof data == 'string',
    construct: data => new ReadYamlTag(data),
    instanceOf: FetchYamlTag,
    represent: (tag: any) => tag.url,
  });

const FETCH_SCHEMA = Schema.create([
  FetchType, FetchJsonType, FetchTextType, FetchYamlType,
  ReadType, ReadJsonType, ReadTextType, ReadYamlType,
]);

export const loadYaml = (data: string) => load(data, { schema: FETCH_SCHEMA });
export const loadYamls = (data: string) => loadAll(data, null, { schema: FETCH_SCHEMA });
export const dumpYaml = (doc: any) => dump(doc, { schema: FETCH_SCHEMA });
export const evaluate = async (node: any, cwd: string): Promise<any> => {
  if (node instanceof CustomTag) {
    return await node.evaluate(cwd);
  }

  if (Array.isArray(node)) {
    return await Promise.all(node.map(p => evaluate(p, cwd)));
  }

  if (typeof node === 'object') {
    if (node === null) return null;

    const clone: any = {};
    for (const kv of Object.entries(node)) {
      clone[kv[0]] = await evaluate(kv[1], cwd);
    }

    return clone;
  }

  return node;
}
