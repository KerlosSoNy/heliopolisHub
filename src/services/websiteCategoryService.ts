import {
    databases,
    storage,
    DATABASE_ID,
    COLLECTIONS,
    BUCKET_ID,
    ID,
    Query,
} from '../lib/appwrite';
import type { WebsiteCategory, WebsiteCategoryForm } from '../types';

export const websiteCategoryService = {
    // ========== CRUD ==========
    async listAll(): Promise<WebsiteCategory[]> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.WEBSITE_CATEGORIES,
            [Query.orderDesc('$createdAt'), Query.limit(500)]
        );
        return response.documents as unknown as WebsiteCategory[];
    },

    async getById(id: string): Promise<WebsiteCategory> {
        const response = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.WEBSITE_CATEGORIES,
            id
        );
        return response as unknown as WebsiteCategory;
    },

    async create(data: WebsiteCategoryForm): Promise<WebsiteCategory> {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.WEBSITE_CATEGORIES,
            ID.unique(),
            data
        );
        return response as unknown as WebsiteCategory;
    },

    async update(id: string, data: Partial<WebsiteCategoryForm>): Promise<WebsiteCategory> {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.WEBSITE_CATEGORIES,
            id,
            data
        );
        return response as unknown as WebsiteCategory;
    },

    async remove(id: string): Promise<void> {
        // Delete category image if exists
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.WEBSITE_CATEGORIES, id);
        if ((doc as unknown as WebsiteCategory).image_id) {
            try {
                await storage.deleteFile(BUCKET_ID, (doc as unknown as WebsiteCategory).image_id!);
            } catch {
                console.warn('Category image not found, skipping delete');
            }
        }
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.WEBSITE_CATEGORIES, id);
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
            return storage.getFilePreview(
                BUCKET_ID,
                fileId,
                300,  // width
                300,  // height
            ).toString();
        } catch (err) {
            console.error('Preview error:', err);
            return storage.getFileView(BUCKET_ID, fileId).toString();
        }
    },

    getImageView(fileId: string): string {
        return storage.getFileView(BUCKET_ID, fileId).toString();
    },
};