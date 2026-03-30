import { useState, useCallback, useMemo } from 'react';
import {
    History, Package, TrendingUp, TrendingDown, DollarSign,
    ArrowLeft, Trash2, Search, BarChart3, Calendar,
    ArrowUpRight, ArrowDownRight, Minus, X,
} from 'lucide-react';
import { productHistoryService } from '../services/productHistoryService';
import { useCollection } from '../hooks/useCollection';
import { usePagination } from '../lib/hooks/usePagination';
import Pagination from '../components/Pagination';
import type { ProductHistory } from '../types';
import { useNavigate } from 'react-router-dom';

const sourceConfig = {
    create: { label: 'Created', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    update: { label: 'Updated', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    restock: { label: 'Restocked', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
};

export default function ProductHistoryPage() {
    const navigate = useNavigate();
    const { data: history, loading, error, refetch } = useCollection<ProductHistory>({
        fetchFn: useCallback(() => productHistoryService.listAll(), []),
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState<string>('all');
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'date' | 'price_asc' | 'price_desc'>('date');

    // Get unique product names for filter
    const uniqueProducts = useMemo(() => {
        const map = new Map<string, string>();
        history.forEach((h) => map.set(h.product_id, h.product_name));
        return Array.from(map.entries()); // [id, name][]
    }, [history]);

    // Filter & Sort
    const filteredHistory = useMemo(() => {
        let result = history.filter((h) => {
            const matchesSearch =
                h.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (h.note || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSource = sourceFilter === 'all' || h.source === sourceFilter;
            const matchesProduct = !selectedProduct || h.product_id === selectedProduct;
            return matchesSearch && matchesSource && matchesProduct;
        });

        if (sortBy === 'price_asc') {
            result = [...result].sort((a, b) => parseFloat(a.price_egp) - parseFloat(b.price_egp));
        } else if (sortBy === 'price_desc') {
            result = [...result].sort((a, b) => parseFloat(b.price_egp) - parseFloat(a.price_egp));
        }

        return result;
    }, [history, searchTerm, sourceFilter, selectedProduct, sortBy]);

    // Stats
    const stats = useMemo(() => {
        if (filteredHistory.length === 0) return null;
        const prices = filteredHistory.map((h) => parseFloat(h.price_egp));
        const counts = filteredHistory.map((h) => parseInt(h.count) || 0);

        return {
            totalEntries: filteredHistory.length,
            totalQty: counts.reduce((a, b) => a + b, 0),
            avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices),
            latestPrice: prices[0],
        };
    }, [filteredHistory]);

    // Price change indicator
    const getPriceChange = (current: ProductHistory) => {
        const sameProductHistory = filteredHistory.filter(
            (h) => h.product_id === current.product_id
        );
        const currentIdx = sameProductHistory.findIndex((h) => h.$id === current.$id);
        const prev = sameProductHistory[currentIdx + 1];
        if (!prev) return null;

        const diff = parseFloat(current.price_egp) - parseFloat(prev.price_egp);
        if (diff === 0) return { direction: 'same' as const, amount: 0, percent: 0 };

        const percent = (diff / parseFloat(prev.price_egp)) * 100;
        return {
            direction: diff > 0 ? ('up' as const) : ('down' as const),
            amount: Math.abs(diff),
            percent: Math.abs(percent),
        };
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this history entry?')) return;
        await productHistoryService.remove(id);
        refetch();
    };

    const {
        currentPage,
        totalPages,
        paginatedData,
        nextPage,
        prevPage,
        goToPage,
        startIndex,
        endIndex,
        itemsPerPage,
        setItemsPerPage,
    } = usePagination({
        data: filteredHistory,
        itemsPerPage: 15,
    });

    if (loading) return <div className="loading">Loading history...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button type="button" title='Back' className="btn-icon" onClick={() => navigate('/products')}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className='flex flex-row items-center gap-2'>
                        <History size={24} /> Product Price History ({filteredHistory.length})
                    </h1>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="stat-grid">
                    <div className="stat-card">
                        <div className="stat-icon blue"><BarChart3 size={24} /></div>
                        <div>
                            <p className="stat-label">Total Entries</p>
                            <p className="stat-value">{stats.totalEntries}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green"><DollarSign size={24} /></div>
                        <div>
                            <p className="stat-label">Avg Price (EGP)</p>
                            <p className="stat-value">{stats.avgPrice.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon orange"><TrendingDown size={24} /></div>
                        <div>
                            <p className="stat-label">Lowest Price</p>
                            <p className="stat-value">{stats.minPrice.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple"><TrendingUp size={24} /></div>
                        <div>
                            <p className="stat-label">Highest Price</p>
                            <p className="stat-value">{stats.maxPrice.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                        <Search
                            size={16}
                            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }}
                        />
                        <input
                            type="text"
                            placeholder="Search by product name or note..."
                            className="search-input"
                            style={{ paddingLeft: '36px', width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Product Filter */}
                    <select
                        title='select product to filter'
                        value={selectedProduct || ''}
                        onChange={(e) => setSelectedProduct(e.target.value || null)}
                        className="search-input"
                        style={{ minWidth: '180px' }}
                    >
                        <option value="">All Products</option>
                        {uniqueProducts.map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>

                    {/* Source Filter */}
                    <select
                        title='select product to filter'
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="search-input"
                        style={{ minWidth: '140px' }}
                    >
                        <option value="all">All Sources</option>
                        <option value="create">Created</option>
                        <option value="update">Updated</option>
                        <option value="restock">Restocked</option>
                    </select>

                    {/* Sort */}
                    <select
                        title='select product to filter'
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="search-input"
                        style={{ minWidth: '160px' }}
                    >
                        <option value="date">Sort by Date</option>
                        <option value="price_asc">Price: Low → High</option>
                        <option value="price_desc">Price: High → Low</option>
                    </select>

                    {/* Clear Filters */}
                    {(searchTerm || selectedProduct || sourceFilter !== 'all' || sortBy !== 'date') && (
                        <button
                            className="btn btn-sm"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedProduct(null);
                                setSourceFilter('all');
                                setSortBy('date');
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* History Table */}
            <div className="card">
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Product</th>
                                <th>Source</th>
                                <th>CNY Price</th>
                                <th>Rate</th>
                                <th>EGP Price</th>
                                <th>Change</th>
                                <th>Qty</th>
                                <th>Note</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((entry) => {
                                const source = sourceConfig[entry.source as keyof typeof sourceConfig] || sourceConfig.update;
                                const change = getPriceChange(entry);
                                return (
                                    <tr key={entry.$id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={13} style={{ color: '#888' }} />
                                                <div>
                                                    <div>{new Date(entry.$createdAt).toLocaleDateString()}</div>
                                                    <div style={{ fontSize: '11px', color: '#888' }}>
                                                        {new Date(entry.$createdAt).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="table-avatar-product"><Package size={14} /></div>
                                                <strong>{entry.product_name}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 10px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                background: source.bg,
                                                color: source.color,
                                            }}>
                                                {source.label}
                                            </span>
                                        </td>
                                        <td>{entry.price_chi} ¥</td>
                                        <td>{entry.rate}</td>
                                        <td><strong>{parseFloat(entry.price_egp).toFixed(2)} EGP</strong></td>
                                        <td>
                                            {change ? (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: change.direction === 'up' ? '#ef4444' : change.direction === 'down' ? '#10b981' : '#888',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                }}>
                                                    {change.direction === 'up' && <ArrowUpRight size={14} />}
                                                    {change.direction === 'down' && <ArrowDownRight size={14} />}
                                                    {change.direction === 'same' && <Minus size={14} />}
                                                    {change.direction !== 'same' && (
                                                        <span>
                                                            {change.amount.toFixed(2)} ({change.percent.toFixed(1)}%)
                                                        </span>
                                                    )}
                                                    {change.direction === 'same' && <span>No change</span>}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#888', fontSize: '12px' }}>First entry</span>
                                            )}
                                        </td>
                                        <td>{entry.count}</td>
                                        <td>
                                            <span style={{ fontSize: '12px', color: '#aaa', maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {entry.note || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-icon danger"
                                                onClick={() => handleDelete(entry.$id)}
                                                title="Delete entry"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredHistory.length === 0 && (
                    <div className="empty-state flex flex-col items-center gap-4">
                        <History size={48} />
                        <p>No price history found</p>
                    </div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredHistory.length}
                startIndex={startIndex}
                endIndex={endIndex}
                itemsPerPage={itemsPerPage}
                onNext={nextPage}
                onPrev={prevPage}
                onGoToPage={goToPage}
                onItemsPerPageChange={setItemsPerPage}
            />
        </div>
    );
}