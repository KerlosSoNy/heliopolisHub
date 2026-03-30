import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Product, ProductForm } from '../types';
import { productHistoryService } from './productHistoryService'; // ✅ NEW

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

  // ✅ UPDATED: Now logs history on create
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

    const product = response as unknown as Product;

    // ✅ Auto-log price history
    const priceEgp = (parseFloat(data.price_chi) * parseFloat(data.rate)).toFixed(2);
    await productHistoryService.create({
      product_id: product.$id,
      product_name: data.name,
      price_chi: data.price_chi,
      rate: data.rate,
      price_egp: priceEgp,
      count: data.count,
      source: 'create',
      note: 'Initial product creation',
    });

    return product;
  },

  // ✅ UPDATED: Logs history when price changes
  async update(id: string, data: Partial<ProductForm>): Promise<Product> {
    // Get current product to compare
    const current = await this.get(id);

    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      id,
      data
    );

    const updated = response as unknown as Product;

    // ✅ Log history if price or rate changed
    const priceChanged = data.price_chi && data.price_chi !== current.price_chi;
    const rateChanged = data.rate && data.rate !== current.rate;
    const countChanged = data.count && data.count !== current.count;

    if (priceChanged || rateChanged || countChanged) {
      const newPriceChi = data.price_chi || current.price_chi;
      const newRate = data.rate || current.rate;
      const newCount = data.count || current.count;
      const priceEgp = (parseFloat(newPriceChi) * parseFloat(newRate)).toFixed(2);

      const changes: string[] = [];
      if (priceChanged) changes.push(`Price: ${current.price_chi}→${data.price_chi} CNY`);
      if (rateChanged) changes.push(`Rate: ${current.rate}→${data.rate}`);
      if (countChanged) changes.push(`Count: ${current.count}→${data.count}`);

      await productHistoryService.create({
        product_id: id,
        product_name: updated.name,
        price_chi: newPriceChi,
        rate: newRate,
        price_egp: priceEgp,
        count: newCount,
        source: 'update',
        note: `Updated: ${changes.join(', ')}`,
      });
    }

    return updated;
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

  async toggleShippedChina(id: string, value: boolean): Promise<Product> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PRODUCTS,
      id,
      { shipped_china: value }
    );
    return response as unknown as Product;
  },

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

  // ✅ UPDATED: Logs restock history
  async decreaseCount(productId: string, qty: number): Promise<void> {
    const product = await this.get(productId);
    const currentCount = parseInt(product.count) || 0;
    const newCount = Math.max(0, currentCount - qty);
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, productId, {
      count: newCount.toString(),
    });
  },

  // ✅ UPDATED: Logs restock history
  async increaseCount(productId: string, qty: number): Promise<void> {
    const product = await this.get(productId);
    const currentCount = parseInt(product.count) || 0;
    const newCount = currentCount + qty;
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, productId, {
      count: newCount.toString(),
    });

    // Log restock in history
    await productHistoryService.create({
      product_id: productId,
      product_name: product.name,
      price_chi: product.price_chi,
      rate: product.rate,
      price_egp: (parseFloat(product.price_chi) * parseFloat(product.rate)).toFixed(2),
      count: qty.toString(),
      source: 'restock',
      note: `Restocked +${qty} (${currentCount}→${newCount})`,
    });
  },
};