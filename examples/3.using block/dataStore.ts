import { User, Company, Product, Order } from "./types";

// {{{ IMPORT

// }}} IMPORT

export interface IDataStore {
  getUser(userId: string): User;
  getCompany(companyId: string): Company;
  getProduct(productId: string): Product;
  getOrder(orderId: string): Order;
}

class DataStore implements IDataStore {
// {{{ IMPLEMENTATION

  getUser(userId: string): User {
    throw new Error("Method not implemented.");
  }
  getCompany(companyId: string): Company {
    throw new Error("Method not implemented.");
  }
  getProduct(productId: string): Product {
    throw new Error("Method not implemented.");
  }
  getOrder(orderId: string): Order {
    throw new Error("Method not implemented.");
  }

// }}} IMPLEMENTATION
}
