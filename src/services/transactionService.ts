import {
    databases,
    storage,
    DATABASE_ID,
    COLLECTIONS,
    BUCKET_ID,
    ID,
    Query,
} from '../lib/appwrite';
import type { Transaction, TransactionForm } from '../types';

export const transactionService = {
    // ========== CRUD ==========
    async listAll(): Promise<Transaction[]> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.TRANSACTIONS,
            [Query.orderDesc('$createdAt'), Query.limit(500)]
        );
        return response.documents as unknown as Transaction[];
    },

    async create(data: TransactionForm): Promise<Transaction> {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.TRANSACTIONS,
            ID.unique(),
            data
        );
        return response as unknown as Transaction;
    },

    async update(id: string, data: Partial<TransactionForm>): Promise<Transaction> {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.TRANSACTIONS,
            id,
            data
        );
        return response as unknown as Transaction;
    },

    async remove(id: string): Promise<void> {
        // Also delete receipt if exists
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.TRANSACTIONS, id);
        if ((doc as unknown as Transaction).receipt_id) {
            try {
                await storage.deleteFile(BUCKET_ID, (doc as unknown as Transaction).receipt_id!);
            } catch {
                console.warn('Receipt file not found, skipping delete');
            }
        }
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TRANSACTIONS, id);
    },

    // ========== FILE UPLOAD ==========
    async uploadReceipt(file: File): Promise<string> {
        const response = await storage.createFile(BUCKET_ID, ID.unique(), file);
        return response.$id;
    },

    async deleteReceipt(fileId: string): Promise<void> {
        await storage.deleteFile(BUCKET_ID, fileId);
    },

    getReceiptPreview(fileId: string): string {
        return storage.getFilePreview(
            BUCKET_ID,
            fileId,
            400,  // width
            400,  // height
        ).toString();
    },

    getReceiptView(fileId: string): string {
        return storage.getFileView(BUCKET_ID, fileId).toString();
    },
};