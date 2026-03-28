import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Product, ProductForm } from '../types';

export const productService = {
  async list(limit = 25, offset = 0): Promise<Product[]> {
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
      DATABASE_ID, COLLECTIONS.PRODUCTS, ID.unique(), data
    );
    return response as unknown as Product;
  },

  async update(id: string, data: Partial<ProductForm>): Promise<Product> {
    const response = await databases.updateDocument(
      DATABASE_ID, COLLECTIONS.PRODUCTS, id, data
    );
    return response as unknown as Product;
  },

  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, id);
  },

  async count(): Promise<number> {
    const response = await databases.listDocuments(
      DATABASE_ID, COLLECTIONS.PRODUCTS, [Query.limit(1)]
    );
    return response.total;
  },
};