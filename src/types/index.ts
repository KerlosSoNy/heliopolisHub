// ========== CUSTOMER ==========
export interface Customer {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  phone: string;
  deposite?: string;
}

export type CustomerForm = Omit<Customer, '$id' | '$createdAt' | '$updatedAt'>;

// ========== PRODUCT ==========
export interface Product {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  count: string;
  price_chi: string;
  rate: string;
  sold_price?: string;
}

export type ProductForm = Omit<Product, '$id' | '$createdAt' | '$updatedAt'>;

// ========== ORDER ==========
export interface Order {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  product: string;
  price_egp: string;
  client: string;
  total_shipping?: string;
  total_order?: string;
}

export type OrderForm = Omit<Order, '$id' | '$createdAt' | '$updatedAt'>;