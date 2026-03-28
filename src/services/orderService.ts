import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Order } from '../types';

// Only send fields that exist in Appwrite
interface OrderData {
  client: string;
  product: string;
  products: string[];
  price_egp: string;
}

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

  async create(data: OrderData): Promise<Order> {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      ID.unique(),
      {
        client: data.client,
        // product: data.product,
        products: data.products,
        price_egp: data.price_egp,
      }
    );
    return response as unknown as Order;
  },

  async update(id: string, data: Partial<OrderData>): Promise<Order> {
    // Only send fields that have values
    const cleanData: Record<string, unknown> = {};
    if (data.client) cleanData.client = data.client;
    if (data.product) cleanData.product = data.product;
    if (data.products) cleanData.products = data.products;
    if (data.price_egp) cleanData.price_egp = data.price_egp;

    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      id,
      cleanData
    );
    return response as unknown as Order;
  },

  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.ORDERS, id);
  },

  async count(): Promise<number> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      [Query.limit(1)]
    );
    return response.total;
  },
};