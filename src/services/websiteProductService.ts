import {
    databases,
    storage,
    DATABASE_ID,
    COLLECTIONS,
    BUCKET_ID,
    ID,
    Query,
} from '../lib/appwrite';
import type { WebsiteProduct, WebsiteProductForm } from '../types';

export const websiteProductService = {
    // ========== CRUD ==========
    async listAll(): Promise<WebsiteProduct[]> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.WEBSITE_PRODUCTS,
            [Query.orderDesc('$createdAt'), Query.limit(500)]
        );
        return response.documents as unknown as WebsiteProduct[];
    },

    async getById(id: string): Promise<WebsiteProduct> {
        const response = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.WEBSITE_PRODUCTS,
            id
        );
        return response as unknown as WebsiteProduct;
    },

    async create(data: WebsiteProductForm): Promise<WebsiteProduct> {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.WEBSITE_PRODUCTS,
            ID.unique(),
            data
        );
        return response as unknown as WebsiteProduct;
    },

    async update(id: string, data: Partial<WebsiteProductForm>): Promise<WebsiteProduct> {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.WEBSITE_PRODUCTS,
            id,
            data
        );
        return response as unknown as WebsiteProduct;
    },

    async remove(id: string): Promise<void> {
        // Delete product image if exists
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.WEBSITE_PRODUCTS, id);
        if ((doc as unknown as WebsiteProduct).image_id) {
            try {
                await storage.deleteFile(BUCKET_ID, (doc as unknown as WebsiteProduct).image_id!);
            } catch {
                console.warn('Product image not found, skipping delete');
            }
        }
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.WEBSITE_PRODUCTS, id);
    },

    // ========== FILE UPLOAD ==========
    async uploadImage(file: File): Promise<string> {
        const response = await storage.createFile(BUCKET_ID, ID.unique(), file);
        return response.$id;
    },

    async deleteImage(fileId: string): Promise<void> {
        await storage.deleteFile(BUCKET_ID, fileId);
    },

    getImagePreview(fileId: string): string {
        try {
            const preview = storage.getFilePreview(
                BUCKET_ID,
                fileId,
                300,  // width
                300,  // height
            );
            return preview.toString();
        } catch (err) {
            console.error('Preview error:', err);
            // Fallback to full view if preview fails
            return storage.getFileView(BUCKET_ID, fileId).toString();
        }
    },

    getImageView(fileId: string): string {
        return storage.getFileView(BUCKET_ID, fileId).toString();
    },
};