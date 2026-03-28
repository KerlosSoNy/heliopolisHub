import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Order, OrderForm } from '../types';

export const orderService = {
  async list(limit = 25, offset = 0): Promise<Order[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      [Query.limit(limit), Query.offset(offset), Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Order[];
  },

  async get(id: string): Promise<Order> {
    const response = await databases.getDocument(DATABASE_ID, COLLECTIONS.ORDERS, id);
    return response as unknown as Order;
  },

  async create(data: OrderForm): Promise<Order> {
    const response = await databases.createDocument(
      DATABASE_ID, COLLECTIONS.ORDERS, ID.unique(), data
    );
    return response as unknown as Order;
  },

  async update(id: string, data: Partial<OrderForm>): Promise<Order> {
    const response = await databases.updateDocument(
      DATABASE_ID, COLLECTIONS.ORDERS, id, data
    );
    return response as unknown as Order;
  },

  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.ORDERS, id);
  },

  async count(): Promise<number> {
    const response = await databases.listDocuments(
      DATABASE_ID, COLLECTIONS.ORDERS, [Query.limit(1)]
    );
    return response.total;
  },
};