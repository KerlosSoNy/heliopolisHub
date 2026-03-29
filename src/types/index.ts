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
  order_id?: string;
  total_order?: string;
  total_shipping?: string;
}

export type ProductForm = Omit<Product, '$id' | '$createdAt' | '$updatedAt'>;

// ========== ORDER ==========
export interface Order {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  client: string;
  product: string;
  products?: string[];
  quantities: string[];
  price_egp: string;
  total_shipping?: string;
  total_order?: string;
  deposite?: string;
  customer_deposite: string;
  is_paid?: string;  
}

export interface Additional {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  note: string;
  cost: string;
}

export type AdditionalForm = Omit<Additional, '$id' | '$createdAt' | '$updatedAt'>;

export type OrderForm = {
  client: string;
  product: string;
  products: string[];
  price_egp: string;
  total_shipping: string;
  total_order: string;
};

// NEW: track selected product with quantity
export interface SelectedProduct {
  productId: string;
  qty: number;
}


// ========== DEPOSIT HISTORY ==========
export interface DepositHistory {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  customer_id: string;
  customer_name: string;
  amount: string;
  type: 'add' | 'use';
  note?: string;
}

export type DepositHistoryForm = Omit<DepositHistory, '$id' | '$createdAt' | '$updatedAt'>;


// ========== SHIPMENT ==========
export interface ShipmentProduct {
  productId: string;
  qty: number;
}

export interface Shipment {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  products: string[];        // ✅ Array of JSON strings
  extra_cost: string;
  shipping: string;
  cost_in_china: string;
  total_cost: string;
}

export type ShipmentForm = {
  products: string[];        // ✅ Array of JSON strings
  extra_cost: string;
  shipping: string;
  cost_in_china: string;
  total_cost: string;
};