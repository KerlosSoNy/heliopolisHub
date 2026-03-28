import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Product, ProductForm } from '../types';

export const productService = {
  async list(limit = 100, offset = 0): Promise<Product[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      [Query.limit(limit), Query.offset(offset), Query.orderDesc('$createdAt')]
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
      data
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

  // Link products to order
  async linkToOrder(productIds: string[], orderId: string): Promise<void> {
    await Promise.all(
      productIds.map((id) =>
        databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, id, {
          order_id: orderId,
        })
      )
    );
  },

  // 👇 NEW: Decrease product count after order
  async decreaseCount(productId: string, qty: number): Promise<void> {
    // Get current product
    const product = await this.get(productId);
    const currentCount = parseInt(product.count) || 0;
    const newCount = Math.max(0, currentCount - qty);

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, productId, {
      count: newCount.toString(),
    });
  },

  // 👇 NEW: Increase count (for order delete/undo)
  async increaseCount(productId: string, qty: number): Promise<void> {
    const product = await this.get(productId);
    const currentCount = parseInt(product.count) || 0;
    const newCount = currentCount + qty;

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, productId, {
      count: newCount.toString(),
    });
  },
};