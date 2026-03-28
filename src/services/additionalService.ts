import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Additional, AdditionalForm } from '../types';

export const additionalService = {
  async listAll(): Promise<Additional[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ADDITIONAL,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Additional[];
  },

  async get(id: string): Promise<Additional> {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.ADDITIONAL,
      id
    );
    return response as unknown as Additional;
  },

  async create(data: AdditionalForm): Promise<Additional> {
    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ADDITIONAL,
      ID.unique(),
      data
    );
    return response as unknown as Additional;
  },

  async update(id: string, data: Partial<AdditionalForm>): Promise<Additional> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.ADDITIONAL,
      id,
      data
    );
    return response as unknown as Additional;
  },

  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.ADDITIONAL, id);
  },

  async count(): Promise<number> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ADDITIONAL,
      [Query.limit(1)]
    );
    return response.total;
  },
};