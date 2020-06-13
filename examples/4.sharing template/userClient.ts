// {{{ CUSTOM-IMPORT
import { User } from './lib';
// }}} CUSTOM-IMPORT

import { BaseClient, post, handleError } from './lib';

interface IUserClient {
  getUser(id: string): Promise<User>;
  setUser(user: User, force: boolean): Promise<boolean>;
}

class UserClient extends BaseClient implements IUserClient {
  constructor(baseUri: string) {
    super(baseUri);
  }

  async getUser(id: string): Promise<User> {
    try {
      return await post<User>('/getUser', { id });
    } catch (e) {
      handleError(e);
      throw e;
    }
  }

  async setUser(user: User, force: boolean): Promise<boolean> {
    try {
      return await post<boolean>('/setUser', { user, force });
    } catch (e) {
      handleError(e);
      throw e;
    }
  }

}

// {{{ CUSTOM-IMPLEMENTATION

export const client: IUserClient = new UserClient("http://0.0.0.0/");

// }}} CUSTOM-IMPLEMENTATION


