// {{{ CUSTOM-IMPORT
export interface Book {
  
}
// }}} CUSTOM-IMPORT

import { BaseClient, post, handleError } from './lib';

interface IBookClient {
  getBook(id: string): Promise<Book>;
  setBook(book: Book, force: boolean): Promise<boolean>;
}

class BookClient extends BaseClient implements IBookClient {
  constructor(baseUri: string) {
    super(baseUri);
  }

  async getBook(id: string): Promise<Book> {
    try {
      return await post<Book>('/getBook', { id });
    } catch (e) {
      handleError(e);
      throw e;
    }
  }

  async setBook(book: Book, force: boolean): Promise<boolean> {
    try {
      return await post<boolean>('/setBook', { book, force });
    } catch (e) {
      handleError(e);
      throw e;
    }
  }

}

// {{{ CUSTOM-IMPLEMENTATION

// }}} CUSTOM-IMPLEMENTATION

