import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Shipment, ShipmentForm } from '../types';

export const shipmentService = {
  async listAll(): Promise<Shipment[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SHIPMENTS,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Shipment[];
  },

  async get(id: string): Promise<Shipment> {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.SHIPMENTS,
      id
    );
    return response as unknown as Shipment;
  },

  async create(data: ShipmentForm): Promise<Shipment> {
    const totalCost = (
      (parseFloat(data.cost_in_china) || 0) +
      (parseFloat(data.shipping) || 0) +
      (parseFloat(data.extra_cost) || 0)
    ).toString();

    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SHIPMENTS,
      ID.unique(),
      {
        ...data,
        total_cost: totalCost,
      }
    );
    return response as unknown as Shipment;
  },

  async update(id: string, data: Partial<ShipmentForm>): Promise<Shipment> {
    let payload: Partial<ShipmentForm> = { ...data };

    if (data.cost_in_china !== undefined || data.shipping !== undefined || data.extra_cost !== undefined) {
      const current = await this.get(id);
      const costInChina = parseFloat(data.cost_in_china ?? current.cost_in_china) || 0;
      const shipping = parseFloat(data.shipping ?? current.shipping) || 0;
      const extraCost = parseFloat(data.extra_cost ?? current.extra_cost) || 0;
      payload.total_cost = (costInChina + shipping + extraCost).toString();
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SHIPMENTS,
      id,
      payload
    );
    return response as unknown as Shipment;
  },

  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SHIPMENTS, id);
  },

  async count(): Promise<number> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SHIPMENTS,
      [Query.limit(1)]
    );
    return response.total;
  },
};