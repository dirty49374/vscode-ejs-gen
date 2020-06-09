import { Type, Schema, load, loadAll, dump } from 'js-yaml';
import fetch, { RequestInit } from 'node-fetch';

abstract class CustomTag { abstract evaluate(): Promise<any>; }
class FetchTag extends CustomTag {
  constructor(public url: string, public init?: RequestInit, public type?: string) { super(); }
  async evaluate(): Promise<any> {
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

const FETCH_SCHEMA = Schema.create([ FetchType, FetchJsonType, FetchTextType, FetchYamlType ]);

export const loadYaml = (data: string) => load(data, { schema: FETCH_SCHEMA });
export const loadYamls = (data: string) => loadAll(data, null, { schema: FETCH_SCHEMA });
export const dumpYaml = (doc: any) => dump(doc, { schema: FETCH_SCHEMA });
export const evaluate = async (node: any): Promise<any> => {
  if (node instanceof CustomTag) {
    return await node.evaluate();
  }

  if (Array.isArray(node)) {
    return await Promise.all(node.map(p => evaluate(p)));
  }

  if (typeof node === 'object') {
    if (node === null) return null;

    const clone: any = {};
    for (const kv of Object.entries(node)) {
      clone[kv[0]] = await evaluate(kv[1]);
    }

    return clone;
  }

  return node;
}
