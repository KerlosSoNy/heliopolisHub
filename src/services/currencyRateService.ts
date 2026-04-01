import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../lib/appwrite';
import type { CurrencyRate, CurrencyRateForm } from '../types';

const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/CNY';

export const currencyRateService = {
    // ✅ Fetch live rate from API
    async fetchLiveRate(): Promise<number> {
        try {
            const response = await fetch(EXCHANGE_API_URL);
            const data = await response.json();

            if (data.result === 'success' && data.rates?.EGP) {
                return data.rates.EGP;
            }
            throw new Error('Failed to fetch rate');
        } catch (err) {
            console.error('Exchange rate API error:', err);
            throw err;
        }
    },

    // ✅ Fetch live rate AND save to database
    async fetchAndSave(): Promise<CurrencyRate> {
        const rate = await this.fetchLiveRate();

        const saved = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.CURRENCY_RATES,
            ID.unique(),
            {
                from_currency: 'CNY',
                to_currency: 'EGP',
                rate: rate,
                source: 'auto',
                note: `Auto-fetched from open.er-api.com`,
            }
        );

        return saved as unknown as CurrencyRate;
    },

    // ✅ Manually add a rate
    async create(data: CurrencyRateForm): Promise<CurrencyRate> {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.CURRENCY_RATES,
            ID.unique(),
            data
        );
        return response as unknown as CurrencyRate;
    },

    // ✅ Get all rate history (newest first)
    async listAll(): Promise<CurrencyRate[]> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CURRENCY_RATES,
            [Query.orderDesc('$createdAt'), Query.limit(100)]
        );
        return response.documents as unknown as CurrencyRate[];
    },

    // ✅ Get the latest saved rate
    async getLatest(): Promise<CurrencyRate | null> {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CURRENCY_RATES,
            [Query.orderDesc('$createdAt'), Query.limit(1)]
        );
        if (response.documents.length === 0) return null;
        return response.documents[0] as unknown as CurrencyRate;
    },

    // ✅ Get rates from last N days
    async getRecent(days: number = 30): Promise<CurrencyRate[]> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CURRENCY_RATES,
            [
                Query.greaterThan('$createdAt', since.toISOString()),
                Query.orderAsc('$createdAt'),
                Query.limit(100),
            ]
        );
        return response.documents as unknown as CurrencyRate[];
    },

    // ✅ Delete a rate entry
    async remove(id: string): Promise<void> {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CURRENCY_RATES, id);
    },

    // ✅ Check if we already fetched today
    async hasTodayRate(): Promise<boolean> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CURRENCY_RATES,
            [
                Query.greaterThan('$createdAt', today.toISOString()),
                Query.equal('source', 'auto'),
                Query.limit(1),
            ]
        );
        return response.documents.length > 0;
    },
};