import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { DepositHistory, DepositHistoryForm } from '../types';

export const depositHistoryService = {
  // Get all history for a customer
  async listByCustomer(customerId: string): Promise<DepositHistory[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DEPOSIT_HISTORY,
      [
        Query.equal('customer_id', customerId),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]
    );
    return response.documents as unknown as DepositHistory[];
  },

  // Get all history
  async list(limit = 100): Promise<DepositHistory[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.DEPOSIT_HISTORY,
      [Query.orderDesc('$createdAt'), Query.limit(limit)]
    );
    return response.documents as unknown as DepositHistory[];
  },

  // Log a deposit addition
  async logAdd(customerId: string, customerName: string, amount: string, note?: string): Promise<DepositHistory> {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.DEPOSIT_HISTORY,
      ID.unique(),
      {
        customer_id: customerId,
        customer_name: customerName,
        amount,
        type: 'add',
        note: note || 'Deposit added',
      }
    );
    return response as unknown as DepositHistory;
  },

  // Log a deposit usage (from order)
  async logUse(customerId: string, customerName: string, amount: string, note?: string): Promise<DepositHistory> {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.DEPOSIT_HISTORY,
      ID.unique(),
      {
        customer_id: customerId,
        customer_name: customerName,
        amount,
        type: 'use',
        note: note || 'Used in order',
      }
    );
    return response as unknown as DepositHistory;
  },

  // Log a deposit restore (order deleted)
  async logRestore(customerId: string, customerName: string, amount: string): Promise<DepositHistory> {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.DEPOSIT_HISTORY,
      ID.unique(),
      {
        customer_id: customerId,
        customer_name: customerName,
        amount,
        type: 'add',
        note: 'Restored from deleted order',
      }
    );
    return response as unknown as DepositHistory;
  },

  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.DEPOSIT_HISTORY, id);
  },
};