import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { ProductHistory, ProductHistoryForm } from '../types';

export const productHistoryService = {
  // Get all history for a specific product
  async listByProduct(productId: string): Promise<ProductHistory[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PRODUCT_HISTORY,
      [
        Query.equal('product_id', productId),
        Query.orderDesc('$createdAt'),
      ]
    );
    return response.documents as unknown as ProductHistory[];
  },

  // Get all history entries
  async listAll(): Promise<ProductHistory[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PRODUCT_HISTORY,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as ProductHistory[];
  },

  // Create a history entry
  async create(data: ProductHistoryForm): Promise<ProductHistory> {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCT_HISTORY,
      ID.unique(),
      data
    );
    return response as unknown as ProductHistory;
  },

  // Delete a history entry
  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PRODUCT_HISTORY, id);
  },

  // Get price stats for a product
  async getProductPriceStats(productId: string) {
    const history = await this.listByProduct(productId);
    if (history.length === 0) return null;

    const prices = history.map((h) => parseFloat(h.price_egp));
    const counts = history.map((h) => parseInt(h.count) || 0);

    return {
      totalEntries: history.length,
      totalQuantityBought: counts.reduce((a, b) => a + b, 0),
      lowestPrice: Math.min(...prices),
      highestPrice: Math.max(...prices),
      averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      latestPrice: prices[0],
      firstPrice: prices[prices.length - 1],
      priceChange: prices[0] - prices[prices.length - 1],
      history,
    };
  },
};