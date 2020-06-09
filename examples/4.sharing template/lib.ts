export class BaseClient {
    constructor(baseUri: string) {
    }
}

export function handleError(e: Error) {
    throw new Error('not implemented');
}

export interface User { name: string }

export function post<T>(url: string, body: any): T {
    throw new Error('not implemented');
}
