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
  price_egp: string;
  total_shipping?: string;
  total_order?: string;
  deposite_used?: string;
  is_paid?: string;  
}

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