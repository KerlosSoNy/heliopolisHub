import { Client, Account,ID, Query, Databases } from "appwrite";

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

export const DATABASE_ID = '69c7a62e00384a4a362b';      


export const COLLECTIONS = {
  CUSTOMERS: 'customers',                         
  ORDERS: 'orders',
  PRODUCTS: 'products',
  DEPOSIT_HISTORY: 'deposit_history',
  ADDITIONAL: 'additional',
  SHIPMENTS: 'shipments',
};

export { ID, Query };

export { client, account, databases };
