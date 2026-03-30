import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Product, ProductForm } from '../types';

export const productService = {
  async listAll(): Promise<Product[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Product[];
  },

  async get(id: string): Promise<Product> {
    const response = await databases.getDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, id);
    return response as unknown as Product;
  },

  async create(data: ProductForm): Promise<Product> {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      ID.unique(),
      {
        ...data,
        shipped_china: data.shipped_china ?? false,
        shipped_egy: data.shipped_egy ?? false,
      }
    );
    return response as unknown as Product;
  },

  async update(id: string, data: Partial<ProductForm>): Promise<Product> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      id,
      data
    );
    return response as unknown as Product;
  },

  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, id);
  },

  async count(): Promise<number> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      [Query.limit(1)]
    );
    return response.total;
  },

  // ✅ NEW: Toggle shipped_china
  async toggleShippedChina(id: string, value: boolean): Promise<Product> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      id,
      { shipped_china: value }
    );
    return response as unknown as Product;
  },

  // ✅ NEW: Toggle shipped_egy
  async toggleShippedEgy(id: string, value: boolean): Promise<Product> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      id,
      { shipped_egy: value }
    );
    return response as unknown as Product;
  },

  async linkToOrder(productIds: string[], orderId: string): Promise<void> {
    await Promise.all(
      productIds.map((id) =>
        databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, id, {
          order_id: orderId,
        })
      )
    );
  },

  async decreaseCount(productId: string, qty: number): Promise<void> {
    const product = await this.get(productId);
    const currentCount = parseInt(product.count) || 0;
    const newCount = Math.max(0, currentCount - qty);
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, productId, {
      count: newCount.toString(),
    });
  },

  async increaseCount(productId: string, qty: number): Promise<void> {
    const product = await this.get(productId);
    const currentCount = parseInt(product.count) || 0;
    const newCount = currentCount + qty;
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, productId, {
      count: newCount.toString(),
    });
  },
};