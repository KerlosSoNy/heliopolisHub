import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import { productService } from './productService';
import type { Return, ReturnForm } from '../types';

export const returnService = {
    // ✅ List all returns (newest first)
    async listAll(): Promise<Return[]> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            [Query.orderDesc('$createdAt'), Query.limit(500)]
        );
        return response.documents as unknown as Return[];
    },

    // ✅ Get single return
    async get(id: string): Promise<Return> {
        const response = await databases.getDocument(DATABASE_ID, COLLECTIONS.RETURNS, id);
        return response as unknown as Return;
    },

    // ✅ Create a new return request
    async create(data: ReturnForm): Promise<Return> {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            ID.unique(),
            {
                product_id: data.product_id,
                product_name: data.product_name,
                order_id: data.order_id || '',
                client: data.client,
                quantity: parseInt(data.quantity as string) || 1,
                reason: data.reason,
                reason_category: data.reason_category,
                status: 'pending',
                refund_amount: parseFloat(data.refund_amount as string) || 0,
                original_price: parseFloat(data.original_price as string) || 0,
                action: data.action || 'none',
                restock: data.restock ?? false,
                note: data.note || '',
                resolved_at: '',
            }
        );
        return response as unknown as Return;
    },

    // ✅ Update a return
    async update(id: string, data: Partial<ReturnForm>): Promise<Return> {
        const payload: Record<string, unknown> = { ...data };

        if (data.quantity !== undefined) {
            payload.quantity = parseInt(data.quantity as string) || 1;
        }
        if (data.refund_amount !== undefined) {
            payload.refund_amount = parseFloat(data.refund_amount as string) || 0;
        }
        if (data.original_price !== undefined) {
            payload.original_price = parseFloat(data.original_price as string) || 0;
        }

        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            id,
            payload
        );
        return response as unknown as Return;
    },

    // ✅ Approve a return
    async approve(id: string, action: string, refundAmount: number, restock: boolean): Promise<Return> {
        const returnDoc = await this.get(id);

        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            id,
            {
                status: 'approved',
                action: action,
                refund_amount: refundAmount,
                restock: restock,
            }
        );

        // If restock, increase product count
        if (restock && returnDoc.product_id) {
            try {
                await productService.increaseCount(returnDoc.product_id, returnDoc.quantity);
            } catch (err) {
                console.error('Failed to restock product:', err);
            }
        }

        return response as unknown as Return;
    },

    // ✅ Mark as refunded (fully processed)
    async markRefunded(id: string): Promise<Return> {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            id,
            {
                status: 'refunded',
                resolved_at: new Date().toISOString(),
            }
        );
        return response as unknown as Return;
    },

    // ✅ Mark as replaced
    async markReplaced(id: string): Promise<Return> {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            id,
            {
                status: 'replaced',
                resolved_at: new Date().toISOString(),
            }
        );
        return response as unknown as Return;
    },

    // ✅ Reject a return
    async reject(id: string, note: string): Promise<Return> {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            id,
            {
                status: 'rejected',
                note: note,
                resolved_at: new Date().toISOString(),
            }
        );
        return response as unknown as Return;
    },

    // ✅ Delete a return
    async remove(id: string): Promise<void> {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.RETURNS, id);
    },

    // ✅ Get returns by product
    async getByProduct(productId: string): Promise<Return[]> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            [
                Query.equal('product_id', productId),
                Query.orderDesc('$createdAt'),
            ]
        );
        return response.documents as unknown as Return[];
    },

    // ✅ Get returns by client
    async getByClient(client: string): Promise<Return[]> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            [
                Query.equal('client', client),
                Query.orderDesc('$createdAt'),
            ]
        );
        return response.documents as unknown as Return[];
    },

    // ✅ Count by status
    async count(): Promise<number> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.RETURNS,
            [Query.limit(1)]
        );
        return response.total;
    },
};