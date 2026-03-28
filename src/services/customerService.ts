import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Customer, CustomerForm } from '../types';

export const customerService = {
  async list(limit = 25, offset = 0): Promise<Customer[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CUSTOMERS,
      [Query.limit(limit), Query.offset(offset), Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Customer[];
  },

  async get(id: string): Promise<Customer> {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.CUSTOMERS,
      id
    );
    return response as unknown as Customer;
  },

  async create(data: CustomerForm): Promise<Customer> {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.CUSTOMERS,
      ID.unique(),
      data
    );
    return response as unknown as Customer;
  },

  async update(id: string, data: Partial<CustomerForm>): Promise<Customer> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.CUSTOMERS,
      id,
      data
    );
    return response as unknown as Customer;
  },

  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CUSTOMERS, id);
  },

  async count(): Promise<number> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CUSTOMERS,
      [Query.limit(1)]
    );
    return response.total;
  },
};