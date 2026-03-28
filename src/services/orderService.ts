import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Order } from '../types';

interface OrderData {
  client: string;
  product: string;
  products: string[];
  price_egp: string;
  deposite?: string;
  is_paid?: string;
}

export const orderService = {
  async listAll(): Promise<Order[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ORDERS,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Order[];
  },

  async get(id: string): Promise<Order> {
    const response = await databases.getDocument(DATABASE_ID, COLLECTIONS.ORDERS, id);
    return response as unknown as Order;
  },

  async create(data: OrderData): Promise<Order> {
    const cleanData: Record<string, unknown> = {
      client: data.client,
      // product: data.product,
      products: data.products,
      price_egp: data.price_egp,
      deposite: data.deposite && parseFloat(data.deposite) > 0
        ? data.deposite : '0',
      is_paid: data.is_paid || 'no',
    };

    const response = await databases.createDocument(
      DATABASE_ID, COLLECTIONS.ORDERS, ID.unique(), cleanData
    );
    return response as unknown as Order;
  },

  async update(id: string, data: Partial<OrderData>): Promise<Order> {
    const cleanData: Record<string, unknown> = {};
    if (data.client) cleanData.client = data.client;
    if (data.product) cleanData.product = data.product;
    if (data.products) cleanData.products = data.products;
    if (data.price_egp) cleanData.price_egp = data.price_egp;
    if (data.deposite !== undefined) {
      cleanData.deposite = data.deposite && parseFloat(data.deposite) > 0
        ? data.deposite : '0';
    }
    if (data.is_paid !== undefined) cleanData.is_paid = data.is_paid;

    const response = await databases.updateDocument(
      DATABASE_ID, COLLECTIONS.ORDERS, id, cleanData
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

  // Toggle paid status
  async togglePaid(id: string, isPaid: boolean): Promise<Order> {
    const response = await databases.updateDocument(
      DATABASE_ID, COLLECTIONS.ORDERS, id,
      { is_paid: isPaid ? 'yes' : 'no' }
    );
    return response as unknown as Order;
  },
};