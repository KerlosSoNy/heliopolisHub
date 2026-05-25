import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { Order } from '../types';

export interface ProductData {
  name: string;
  costPrice: string;
  sellingPrice: string;
  quantity: string;
}

export interface CustomerOrderForm {
  client: string;
  products: ProductData[];  // Array of product objects with all details
  price_egp: string;        // Total order cost (what customer pays)
  discount?: string;
  discount_type?: string;
}

export const customerOrderService = {
  // Create new order
  async create(data: CustomerOrderForm): Promise<Order> {
    // Convert products array to JSON string for storage
    const productsJson = JSON.stringify(data.products);
    const productNames = data.products.map((p) => p.name).join(', ');

    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.CUSTOMER_ORDERS,
      ID.unique(),
      {
        client: data.client,
        product: productNames,  // Store product names as string
        products: productsJson, // Store full product data as JSON string
        quantities: data.products.map((p) => p.quantity).join(','), // Store quantities as comma-separated string
        price_egp: data.price_egp,
        customer_deposite: '0',
        is_paid: 'no',
        discount: data.discount || '0',
        discount_type: data.discount_type || 'percentage',
      }
    );
    return response as unknown as Order;
  },

  // Parse products from JSON string
  parseProducts(productsJson: string): ProductData[] {
    try {
      return JSON.parse(productsJson);
    } catch {
      return [];
    }
  },

  // Get all orders
  async listAll(): Promise<Order[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CUSTOMER_ORDERS,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Order[];
  },

  // Get single order
  async get(id: string): Promise<Order> {
    const response = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.CUSTOMER_ORDERS,
      id
    );
    return response as unknown as Order;
  },

  // Get orders by customer name
  async getByCustomer(customerName: string): Promise<Order[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CUSTOMER_ORDERS,
      [Query.equal('client', customerName), Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Order[];
  },

  // Update order
  async update(id: string, data: Partial<CustomerOrderForm>): Promise<Order> {
    const updateData: any = { ...data };

    // If products array is included, convert to JSON string
    if (data.products) {
      updateData.products = JSON.stringify(data.products);
      updateData.quantities = data.products.map((p) => p.quantity).join(',');
      updateData.product = data.products.map((p) => p.name).join(', ');
    }

    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.CUSTOMER_ORDERS,
      id,
      updateData
    );
    return response as unknown as Order;
  },

  // Mark order as paid
  async markAsPaid(id: string): Promise<Order> {
    const response = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.CUSTOMER_ORDERS,
      id,
      { is_paid: 'yes' }
    );
    return response as unknown as Order;
  },

  // Delete order
  async remove(id: string): Promise<void> {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CUSTOMER_ORDERS, id);
  },

  // Get total order count
  async count(): Promise<number> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CUSTOMER_ORDERS,
      [Query.limit(1)]
    );
    return response.total;
  },

  // Get unpaid orders
  async getUnpaid(): Promise<Order[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CUSTOMER_ORDERS,
      [Query.notEqual('is_paid', 'yes'), Query.orderDesc('$createdAt')]
    );
    return response.documents as unknown as Order[];
  },

  // Get unpaid orders by customer
  async getUnpaidByCustomer(customerName: string): Promise<Order[]> {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CUSTOMER_ORDERS,
      [
        Query.equal('client', customerName),
        Query.notEqual('is_paid', 'yes'),
        Query.orderDesc('$createdAt'),
      ]
    );
    return response.documents as unknown as Order[];
  },
};