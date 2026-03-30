import {
    Trash2, Edit, Plus, X, Package, Hash,
    DollarSign, TrendingUp, Truck, Tag, Save,
    XCircle,
    AlertTriangle,
    CheckCircle,
    User,
    Plane,
    MapPin,
    Filter,
    History,
} from 'lucide-react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { useCollection } from '../hooks/useCollection';
import type { Product, ProductForm, Order } from '../types';
import { usePagination } from '../lib/hooks/usePagination';
import Pagination from '../components/Pagination';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';

const emptyForm: ProductForm = {
    name: '',
    count: '',
    price_chi: '',
    rate: '',
    sold_price: '',
    order_id: '',
    total_order: '',
    total_shipping: '',
    shipped_china: false,
    shipped_egy: false,
};

// ✅ Shipping status helper
type ShippingStatus = 'pending' | 'shipped_china' | 'arrived_egy';

const getShippingStatus = (product: Product): ShippingStatus => {
    if (product.shipped_egy) return 'arrived_egy';
    if (product.shipped_china) return 'shipped_china';
    return 'pending';
};

const shippingStatusConfig = {
    pending: {
        label: 'In China',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.3)',
        icon: Package,
    },
    shipped_china: {
        label: 'Shipped from China',
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.3)',
        icon: Plane,
    },
    arrived_egy: {
        label: 'Arrived in Egypt',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
        icon: MapPin,
    },
};

type ShippingFilter = 'all' | ShippingStatus;

export default function Products() {
    const { data: products, loading, error, refetch } = useCollection<Product>({
        fetchFn: useCallback(() => productService.listAll(), []),
    });

    const { data: orders } = useCollection<Order>({
        fetchFn: useCallback(() => orderService.listAll(), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ProductForm>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');
    const [shippingFilter, setShippingFilter] = useState<ShippingFilter>('all'); // ✅ NEW
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'date' | 'profit'>('date');
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

    // Inline edit for shipping/sold
    const [inlineEdit, setInlineEdit] = useState<{
        id: string;
        total_order: string;
        total_shipping: string;
        sold_price: string;
    } | null>(null);

    // ✅ Toggle shipping status handlers
    const handleToggleShippedChina = async (product: Product) => {
        try {
            const newValue = !product.shipped_china;
            await productService.toggleShippedChina(product.$id, newValue);
            // If un-checking shipped_china, also un-check shipped_egy
            if (!newValue && product.shipped_egy) {
                await productService.toggleShippedEgy(product.$id, false);
            }
            refetch();
        } catch (err) {
            console.error('Failed to toggle shipped_china:', err);
        }
    };

    const handleToggleShippedEgy = async (product: Product) => {
        try {
            const newValue = !product.shipped_egy;
            await productService.toggleShippedEgy(product.$id, newValue);
            // If checking shipped_egy, also ensure shipped_china is checked
            if (newValue && !product.shipped_china) {
                await productService.toggleShippedChina(product.$id, true);
            }
            refetch();
        } catch (err) {
            console.error('Failed to toggle shipped_egy:', err);
        }
    };

    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (product: Product) => {
        setForm({
            name: product.name,
            count: product.count,
            price_chi: product.price_chi,
            rate: product.rate,
            sold_price: product.sold_price || '',
            order_id: product.order_id || '',
            total_order: product.total_order || '',
            total_shipping: product.total_shipping || '',
            shipped_china: product.shipped_china ?? false,
            shipped_egy: product.shipped_egy ?? false,
        });
        setEditingId(product.$id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await productService.update(editingId, form);
            } else {
                await productService.create(form);
            }
            setShowModal(false);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product?')) return;
        await productService.remove(id);
        refetch();
    };

    const startInlineEdit = (product: Product) => {
        setInlineEdit({
            id: product.$id,
            total_order: product.total_order || '',
            total_shipping: product.total_shipping || '',
            sold_price: product.sold_price || '',
        });
    };

    const getStockStatus = (product: Product) => {
        const count = parseInt(product.count) || 0;
        if (count === 0) return { label: 'Out of Stock', color: 'red', icon: XCircle };
        if (count <= 3) return { label: 'Low Stock', color: 'orange', icon: AlertTriangle };
        return { label: 'In Stock', color: 'green', icon: CheckCircle };
    };

    const getClientName = (product: Product): string => {
        if (!product.order_id) return '';
        const order = orders.find((o) => o.$id === product.order_id);
        return order?.client || '';
    };

    const saveInlineEdit = async () => {
        if (!inlineEdit) return;
        try {
            await productService.update(inlineEdit.id, {
                total_order: inlineEdit.total_order,
                total_shipping: inlineEdit.total_shipping,
                sold_price: inlineEdit.sold_price,
            });
            setInlineEdit(null);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    // ========== CALCULATIONS ==========
    const calcPriceEgp = (product: Product): number => {
        const price = parseFloat(product.price_chi);
        const r = parseFloat(product.rate);
        if (isNaN(price) || isNaN(r)) return 0;
        return price * r;
    };

    const calcShippingPerPiece = (product: Product): number => {
        const totalShipping = parseFloat(product.total_shipping || '0');
        const totalOrder = parseFloat(product.total_order || '0');
        if (totalOrder === 0 || totalShipping === 0) return 0;
        const priceEgp = calcPriceEgp(product);
        return (priceEgp / totalOrder) * totalShipping;
    };

    const calcAll = (product: Product) => {
        const priceEgp = calcPriceEgp(product);
        const count = parseInt(product.count) || 1;
        const shippingPerPiece = calcShippingPerPiece(product);
        const totalCostPerPiece = priceEgp + shippingPerPiece;
        const soldPrice = parseFloat(product.sold_price || '0');
        const profitPerPiece = soldPrice > 0 ? soldPrice - totalCostPerPiece : 0;

        return {
            priceEgp,
            count,
            shippingPerPiece,
            shippingTotal: shippingPerPiece * count,
            totalCostPerPiece,
            soldPrice,
            profitPerPiece,
            totalProfit: profitPerPiece * count,
        };
    };
    const navigate = useNavigate();

    const getOrderForProduct = (product: Product): Order | undefined => {
        if (!product.order_id) return undefined;
        return orders.find((o) => o.$id === product.order_id);
    };

    // ✅ Filter by search AND shipping status
    const filteredProducts = useMemo(() => {
        let result = products.filter((p) => {
            // Search filter
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            // Shipping filter
            if (shippingFilter !== 'all' && getShippingStatus(p) !== shippingFilter) return false;

            // Price filter (EGP)
            const priceEgp = parseFloat(p.price_chi) * parseFloat(p.rate);
            if (minPrice && priceEgp < parseFloat(minPrice)) return false;
            if (maxPrice && priceEgp > parseFloat(maxPrice)) return false;

            // Stock filter
            if (stockFilter !== 'all') {
                const count = parseInt(p.count) || 0;
                if (stockFilter === 'out_of_stock' && count !== 0) return false;
                if (stockFilter === 'low_stock' && (count === 0 || count > 3)) return false;
                if (stockFilter === 'in_stock' && count <= 3) return false;
            }

            return true;
        });

        // Sort
        if (sortBy === 'name') {
            result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'price_asc') {
            result = [...result].sort(
                (a, b) =>
                    parseFloat(a.price_chi) * parseFloat(a.rate) -
                    parseFloat(b.price_chi) * parseFloat(b.rate)
            );
        } else if (sortBy === 'price_desc') {
            result = [...result].sort(
                (a, b) =>
                    parseFloat(b.price_chi) * parseFloat(b.rate) -
                    parseFloat(a.price_chi) * parseFloat(a.rate)
            );
        } else if (sortBy === 'profit') {
            result = [...result].sort((a, b) => {
                const calcA = calcAll(a);
                const calcB = calcAll(b);
                return calcB.profitPerPiece - calcA.profitPerPiece;
            });
        }

        return result;
    }, [products, searchTerm, shippingFilter, minPrice, maxPrice, stockFilter, sortBy]);

    // // ✅ Shipping summary counts
    // const shippingCounts = {
    //     all: products.length,
    //     pending: products.filter((p) => getShippingStatus(p) === 'pending').length,
    //     shipped_china: products.filter((p) => getShippingStatus(p) === 'shipped_china').length,
    //     arrived_egy: products.filter((p) => getShippingStatus(p) === 'arrived_egy').length,
    // };

    const {
        currentPage,
        totalPages,
        paginatedData: paginatedProducts,
        nextPage,
        prevPage,
        goToPage,
        startIndex,
        endIndex,
        itemsPerPage,
        setItemsPerPage,
    } = usePagination({
        data: filteredProducts,
        itemsPerPage: 10,
    });

    const totals = products.reduce(
        (acc, p) => {
            const calc = calcAll(p);
            return {
                totalCount: acc.totalCount + calc.count,
                totalCost: acc.totalCost + calc.priceEgp * calc.count,
                totalShipping: acc.totalShipping + calc.shippingTotal,
                totalSold: acc.totalSold + calc.soldPrice * calc.count,
                totalProfit: acc.totalProfit + calc.totalProfit,
            };
        },
        { totalCount: 0, totalCost: 0, totalShipping: 0, totalSold: 0, totalProfit: 0 }
    );

    if (loading) return <div className="loading">Loading products...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page overflow-hidden">
            <div className="page-header">
                <h1>Products ({products.length})</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Product
                    </button>
                </div>
            </div>

            {/* ✅ Summary Stats */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><Package size={24} /></div>
                    <div>
                        <p className="stat-label">Total Items</p>
                        <p className="stat-value">{totals.totalCount}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Total Cost</p>
                        <p className="stat-value">{totals.totalCost.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><Truck size={24} /></div>
                    <div>
                        <p className="stat-label">Total Shipping</p>
                        <p className="stat-value">{totals.totalShipping.toFixed(2)}</p>
                    </div>
                </div>
                <div className={`stat-card`}>
                    <div className={`stat-icon ${totals.totalProfit >= 0 ? 'green' : 'red'}`}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="stat-label">Total Profit</p>
                        <p className={`stat-value ${totals.totalProfit >= 0 ? 'text-green' : 'text-danger'}`}>
                            {totals.totalProfit.toFixed(2)} EGP
                        </p>
                    </div>
                </div>
            </div>

            {/* ✅ NEW: Shipping Filter Tabs */}
            <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
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
                            style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#888',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="search-input"
                            style={{ paddingLeft: '36px', width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Min Price */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={14} style={{ color: '#888' }} />
                        <input
                            type="number"
                            placeholder="Min EGP"
                            className="search-input"
                            style={{ width: '110px' }}
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                        />
                    </div>

                    {/* Max Price */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#888' }}>—</span>
                        <input
                            type="number"
                            placeholder="Max EGP"
                            className="search-input"
                            style={{ width: '110px' }}
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                        />
                    </div>

                    {/* Stock Filter */}
                    <select
                        title='Select'
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
                        className="search-input"
                        style={{ minWidth: '140px' }}
                    >
                        <option value="all">All Stock</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>

                    {/* Sort */}
                    <select
                        title='Select'
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="search-input"
                        style={{ minWidth: '160px' }}
                    >
                        <option value="date">Sort by Date</option>
                        <option value="name">Sort by Name</option>
                        <option value="price_asc">Price: Low → High</option>
                        <option value="price_desc">Price: High → Low</option>
                        <option value="profit">Sort by Profit</option>
                    </select>

                    {/* Clear All Filters */}
                    {(searchTerm || minPrice || maxPrice || stockFilter !== 'all' || sortBy !== 'date' || shippingFilter !== 'all') && (
                        <button
                            className="btn btn-sm"
                            onClick={() => {
                                setSearchTerm('');
                                setMinPrice('');
                                setMaxPrice('');
                                setStockFilter('all');
                                setSortBy('date');
                                setShippingFilter('all');
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <X size={14} /> Clear All
                        </button>
                    )}
                </div>

                {/* Active filter count */}
                {(minPrice || maxPrice || stockFilter !== 'all' || sortBy !== 'date') && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#888',
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                    }}>
                        <Filter size={12} />
                        <span>Showing {filteredProducts.length} of {products.length} products</span>
                        {minPrice && (
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: 'rgba(99,102,241,0.1)',
                                color: '#6366f1',
                            }}>
                                Min: {minPrice} EGP
                            </span>
                        )}
                        {maxPrice && (
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: 'rgba(99,102,241,0.1)',
                                color: '#6366f1',
                            }}>
                                Max: {maxPrice} EGP
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ✅ Product Cards */}
            <div className="flex flex-row items-center h-178 gap-4 !max-w-full !overflow-x-auto py-5! my-5!">
                {filteredProducts.map((p) => {
                    const calc = calcAll(p);
                    const order = getOrderForProduct(p);
                    const stock = getStockStatus(p);
                    const clientName = getClientName(p);
                    const isEditing = inlineEdit?.id === p.$id;
                    const StockIcon = stock.icon;
                    const shipStatus = getShippingStatus(p);
                    const shipConfig = shippingStatusConfig[shipStatus];
                    const ShipIcon = shipConfig.icon;

                    return (
                        <div key={p.$id} className={`product-card ${stock.color === 'red' ? 'product-card-oos' : ''} w-75 h-full shrink-0`}>
                            <div className="product-card-header">
                                <div className="product-icon"><Package size={22} /></div>
                                <div className="customer-card-actions">
                                    <button
                                        type="button"
                                        title="Price History"
                                        className="btn-icon"
                                        onClick={() => navigate(`/product-history?product=${p.$id}`)}
                                    >
                                        <History size={15} />
                                    </button>
                                    <button type="button" title="edit" className="btn-icon" onClick={() => openEdit(p)}><Edit size={15} /></button>
                                    <button type="button" title="delete" className="btn-icon danger" onClick={() => handleDelete(p.$id)}><Trash2 size={15} /></button>
                                </div>
                            </div>

                            <h3 className="product-name">{p.name}</h3>

                            {clientName && (
                                <div className="product-client-badge">
                                    <User size={12} /> {clientName}
                                </div>
                            )}

                            {order && !clientName && (
                                <div className="product-order-badge">
                                    Order #{order.$id.slice(0, 6)}
                                </div>
                            )}

                            {/* ✅ NEW: Shipping Status Badge */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: shipConfig.bg,
                                color: shipConfig.color,
                                border: `1px solid ${shipConfig.border}`,
                                marginBottom: '8px',
                            }}>
                                <ShipIcon size={14} />
                                {shipConfig.label}
                            </div>

                            {/* ✅ NEW: Shipping Toggle Switches */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                marginBottom: '10px',
                                padding: '8px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.03)',
                            }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ccc' }}>
                                        <Plane size={13} /> Shipped from China
                                    </span>
                                    <div
                                        onClick={() => handleToggleShippedChina(p)}
                                        style={{
                                            width: '36px',
                                            height: '20px',
                                            borderRadius: '10px',
                                            background: p.shipped_china ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            background: '#fff',
                                            position: 'absolute',
                                            top: '2px',
                                            left: p.shipped_china ? '18px' : '2px',
                                            transition: 'left 0.2s',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                        }} />
                                    </div>
                                </label>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ccc' }}>
                                        <MapPin size={13} /> Arrived in Egypt
                                    </span>
                                    <div
                                        onClick={() => handleToggleShippedEgy(p)}
                                        style={{
                                            width: '36px',
                                            height: '20px',
                                            borderRadius: '10px',
                                            background: p.shipped_egy ? '#10b981' : 'rgba(255,255,255,0.15)',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            background: '#fff',
                                            position: 'absolute',
                                            top: '2px',
                                            left: p.shipped_egy ? '18px' : '2px',
                                            transition: 'left 0.2s',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                        }} />
                                    </div>
                                </label>
                            </div>

                            <div className="product-stats">
                                <div className="product-stat">
                                    <span className="product-stat-label">Count</span>
                                    <span className={`product-stat-value stock-${stock.color}`}>{p.count}</span>
                                </div>
                                <div className="product-stat">
                                    <span className="product-stat-label">CNY</span>
                                    <span className="product-stat-value">{p.price_chi}</span>
                                </div>
                                <div className="product-stat">
                                    <span className="product-stat-label">Rate</span>
                                    <span className="product-stat-value">{p.rate}</span>
                                </div>
                            </div>

                            {/* Stock Status Bar */}
                            <div className={`stock-status-bar stock-bar-${stock.color}`}>
                                <StockIcon size={14} />
                                <span>{stock.label}</span>
                            </div>

                            {/* Inline Edit */}
                            {isEditing ? (
                                <div className="inline-edit-section">
                                    <div className="inline-edit-row">
                                        <label>Total Order (EGP)</label>
                                        <input
                                            value={inlineEdit.total_order}
                                            onChange={(e) => setInlineEdit({ ...inlineEdit, total_order: e.target.value })}
                                            placeholder="Total order price"
                                        />
                                    </div>
                                    <div className="inline-edit-row">
                                        <label>Total Shipping (EGP)</label>
                                        <input
                                            value={inlineEdit.total_shipping}
                                            onChange={(e) => setInlineEdit({ ...inlineEdit, total_shipping: e.target.value })}
                                            placeholder="Total shipping cost"
                                        />
                                    </div>
                                    <div className="inline-edit-row">
                                        <label>Sold Price/piece (EGP)</label>
                                        <input
                                            value={inlineEdit.sold_price}
                                            onChange={(e) => setInlineEdit({ ...inlineEdit, sold_price: e.target.value })}
                                            placeholder="Sold price per piece"
                                        />
                                    </div>
                                    <div className="inline-edit-actions">
                                        <button className="btn btn-sm" onClick={() => setInlineEdit(null)}>Cancel</button>
                                        <button className="btn btn-primary btn-sm" onClick={saveInlineEdit}>
                                            <Save size={14} /> Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="price-breakdown">
                                        <div className="breakdown-row">
                                            <span>Cost/piece (EGP)</span>
                                            <span>{calc.priceEgp.toFixed(2)}</span>
                                        </div>
                                        <div className="breakdown-row">
                                            <span><Truck size={12} /> Shipping/piece</span>
                                            <span>{calc.shippingPerPiece > 0 ? calc.shippingPerPiece.toFixed(2) : '—'}</span>
                                        </div>
                                        <div className="breakdown-row">
                                            <span>Total Cost/piece</span>
                                            <span><strong>{calc.totalCostPerPiece.toFixed(2)}</strong></span>
                                        </div>
                                        <div className="breakdown-row">
                                            <span><Tag size={12} /> Sold/piece</span>
                                            <span>{calc.soldPrice > 0 ? calc.soldPrice.toFixed(2) : '—'}</span>
                                        </div>
                                        <div className={`breakdown-row breakdown-total ${calc.profitPerPiece >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                                            <span><TrendingUp size={12} /> Profit/piece</span>
                                            <span>{calc.soldPrice > 0 ? calc.profitPerPiece.toFixed(2) + ' EGP' : '—'}</span>
                                        </div>
                                        {calc.soldPrice > 0 && calc.count > 1 && (
                                            <div className={`breakdown-row breakdown-total ${calc.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                                                <span>Total Profit (×{calc.count})</span>
                                                <span><strong>{calc.totalProfit.toFixed(2)} EGP</strong></span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        className="btn btn-sm btn-outline-full"
                                        onClick={() => startInlineEdit(p)}
                                    >
                                        <Truck size={14} /> Set Shipping & Sold Price
                                    </button>
                                </>
                            )}

                            <div className="customer-meta">
                                Added {new Date(p.$createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
                {filteredProducts.length === 0 && (
                    <div className="empty-state"><p>No products found</p></div>
                )}
            </div>

            {/* ✅ Detailed Table */}
            <div className="card mt-4">
                <h2>All Products — Detailed</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Client</th>
                                <th>Shipping Status</th>
                                <th>Stock</th>
                                <th>CNY</th>
                                <th>Rate</th>
                                <th>Cost/pc</th>
                                <th>Ship/pc</th>
                                <th>Total/pc</th>
                                <th>Sold/pc</th>
                                <th>Profit/pc</th>
                                <th>Total Profit</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedProducts.map((p) => {
                                const calc = calcAll(p);
                                const stock = getStockStatus(p);
                                const clientName = getClientName(p);
                                const StockIcon = stock.icon;
                                const shipStatus = getShippingStatus(p);
                                const shipConfig = shippingStatusConfig[shipStatus];
                                const ShipIcon = shipConfig.icon;

                                return (
                                    <tr key={p.$id} className={stock.color === 'red' ? 'row-oos' : ''}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="w-[300px] overflow-hidden">
                                                <div className="table-avatar-product"><Package size={16} /></div>
                                                <div>
                                                    <span>{p.name}</span>
                                                    {stock.color === 'red' && (
                                                        <span className="table-oos-badge">OUT OF STOCK</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {clientName ? (
                                                <div className="table-client">
                                                    <User size={13} />
                                                    <span>{clientName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        {/* ✅ NEW: Shipping Status Column */}
                                        <td>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                background: shipConfig.bg,
                                                color: shipConfig.color,
                                                border: `1px solid ${shipConfig.border}`,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                <ShipIcon size={12} />
                                                {shipConfig.label}
                                            </div>

                                            {/* Mini toggles in table */}
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#888', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={p.shipped_china ?? false}
                                                        onChange={() => handleToggleShippedChina(p)}
                                                        style={{ width: '13px', height: '13px', accentColor: '#3b82f6' }}
                                                    />
                                                    🇨🇳
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#888', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={p.shipped_egy ?? false}
                                                        onChange={() => handleToggleShippedEgy(p)}
                                                        style={{ width: '13px', height: '13px', accentColor: '#10b981' }}
                                                    />
                                                    🇪🇬
                                                </label>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`stock-badge stock-badge-${stock.color}`}>
                                                <StockIcon size={12} />
                                                {p.count}
                                            </span>
                                        </td>
                                        <td>{p.price_chi} ¥</td>
                                        <td>{p.rate}</td>
                                        <td>{calc.priceEgp.toFixed(2)}</td>
                                        <td>{calc.shippingPerPiece > 0 ? calc.shippingPerPiece.toFixed(2) : '—'}</td>
                                        <td><strong>{calc.totalCostPerPiece.toFixed(2)}</strong></td>
                                        <td>{calc.soldPrice > 0 ? calc.soldPrice.toFixed(2) : '—'}</td>
                                        <td>
                                            {calc.soldPrice > 0 ? (
                                                <span className={calc.profitPerPiece >= 0 ? 'text-green' : 'text-danger'}>
                                                    {calc.profitPerPiece.toFixed(2)}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            {calc.soldPrice > 0 ? (
                                                <strong className={calc.totalProfit >= 0 ? 'text-green' : 'text-danger'}>
                                                    {calc.totalProfit.toFixed(2)}
                                                </strong>
                                            ) : '—'}
                                        </td>
                                        <td className="actions">
                                            <button
                                                className="btn-icon"
                                                onClick={() => navigate(`/product-history?product=${p.$id}`)}
                                                title="Price History"
                                            >
                                                <History size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => startInlineEdit(p)} title="Set shipping & sold">
                                                <Truck size={16} />
                                            </button>
                                            <button title="Edit" type="button" className="btn-icon" onClick={() => openEdit(p)}><Edit size={16} /></button>
                                            <button title="Delete" type="button" className="btn-icon danger" onClick={() => handleDelete(p.$id)}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {filteredProducts.length > 0 && (
                            <tfoot>
                                <tr className="totals-row">
                                    <td><strong>TOTALS</strong></td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td><strong>{totals.totalCount}</strong></td>
                                    <td colSpan={2}>—</td>
                                    <td><strong>{totals.totalCost.toFixed(2)}</strong></td>
                                    <td><strong>{totals.totalShipping.toFixed(2)}</strong></td>
                                    <td><strong>{(totals.totalCost + totals.totalShipping).toFixed(2)}</strong></td>
                                    <td><strong>{totals.totalSold.toFixed(2)}</strong></td>
                                    <td>—</td>
                                    <td>
                                        <strong className={totals.totalProfit >= 0 ? 'text-green' : 'text-danger'}>
                                            {totals.totalProfit.toFixed(2)}
                                        </strong>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredProducts.length}
                startIndex={startIndex}
                endIndex={endIndex}
                itemsPerPage={itemsPerPage}
                onNext={nextPage}
                onPrev={prevPage}
                onGoToPage={goToPage}
                onItemsPerPageChange={setItemsPerPage}
            />

            {/* ✅ Modal with shipping flags */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Product' : 'New Product'}</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className='flex! flex-row! items-center gap-2'><Package size={14} /> Product Name *</label>
                                <input required placeholder="Product name" value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className='flex! flex-row! items-center gap-2'><Hash size={14} /> Count *</label>
                                <input required placeholder="Quantity" value={form.count}
                                    onChange={(e) => setForm({ ...form, count: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className='flex! flex-row! items-center gap-2'><DollarSign size={14} /> Price (CNY) *</label>
                                    <input required placeholder="Chinese price" value={form.price_chi}
                                        onChange={(e) => setForm({ ...form, price_chi: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className='flex! flex-row! items-center gap-2'><TrendingUp size={14} /> Rate *</label>
                                    <input required placeholder="Exchange rate" value={form.rate}
                                        onChange={(e) => setForm({ ...form, rate: e.target.value })} />
                                </div>
                            </div>

                            <div className="calc-preview">
                                <span>Cost per piece (EGP):</span>
                                <strong>
                                    {form.price_chi && form.rate
                                        ? (parseFloat(form.price_chi) * parseFloat(form.rate)).toFixed(2) + ' EGP'
                                        : '—'}
                                </strong>
                            </div>

                            <div className="form-divider"><span>Shipping & Selling</span></div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className='flex! flex-row! items-center gap-2'><DollarSign size={14} /> Total Order (EGP)</label>
                                    <input placeholder="Total order price" value={form.total_order}
                                        onChange={(e) => setForm({ ...form, total_order: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className='flex! flex-row! items-center gap-2'><Truck size={14} /> Total Shipping (EGP)</label>
                                    <input placeholder="Total shipping cost" value={form.total_shipping}
                                        onChange={(e) => setForm({ ...form, total_shipping: e.target.value })} />
                                </div>
                            </div>

                            {form.total_order && form.total_shipping && form.price_chi && form.rate && (
                                <div className="calc-preview">
                                    <span className='flex! flex-row! items-center gap-2'><Truck size={14} /> Shipping/piece:</span>
                                    <strong>
                                        {(() => {
                                            const priceEgp = parseFloat(form.price_chi) * parseFloat(form.rate);
                                            const totalOrder = parseFloat(form.total_order);
                                            const totalShipping = parseFloat(form.total_shipping);
                                            if (totalOrder === 0) return '—';
                                            return ((priceEgp / totalOrder) * totalShipping).toFixed(2) + ' EGP';
                                        })()}
                                    </strong>
                                </div>
                            )}

                            <div className="form-group">
                                <label className='flex! flex-row! items-center gap-2'><Tag size={14} /> Sold Price per piece (EGP)</label>
                                <input placeholder="What you sold each piece for" value={form.sold_price}
                                    onChange={(e) => setForm({ ...form, sold_price: e.target.value })} />
                            </div>

                            {form.sold_price && form.price_chi && form.rate && (
                                (() => {
                                    const costPerPiece = parseFloat(form.price_chi) * parseFloat(form.rate);
                                    const count = parseInt(form.count) || 1;
                                    const totalOrder = parseFloat(form.total_order || '0');
                                    const totalShipping = parseFloat(form.total_shipping || '0');
                                    const soldPrice = parseFloat(form.sold_price);
                                    let shippingPerPiece = 0;
                                    if (totalOrder > 0 && totalShipping > 0) {
                                        shippingPerPiece = (costPerPiece / totalOrder) * totalShipping;
                                    }
                                    const totalCostPerPiece = costPerPiece + shippingPerPiece;
                                    const profitPerPiece = soldPrice - totalCostPerPiece;

                                    return (
                                        <div className="profit-preview-box">
                                            <div className="profit-preview-row">
                                                <span>Cost/piece:</span>
                                                <span>{costPerPiece.toFixed(2)} EGP</span>
                                            </div>
                                            {shippingPerPiece > 0 && (
                                                <div className="profit-preview-row">
                                                    <span className='flex! flex-row! items-center gap-2'><Truck size={12} /> Shipping/piece:</span>
                                                    <span>{shippingPerPiece.toFixed(2)} EGP</span>
                                                </div>
                                            )}
                                            <div className="profit-preview-row">
                                                <span>Total Cost/piece:</span>
                                                <span><strong>{totalCostPerPiece.toFixed(2)} EGP</strong></span>
                                            </div>
                                            <div className="profit-preview-row">
                                                <span className='flex! flex-row! items-center gap-2'><Tag size={12} /> Sold/piece:</span>
                                                <span>{soldPrice.toFixed(2)} EGP</span>
                                            </div>
                                            <div className={`profit-preview-row profit-preview-total ${profitPerPiece >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                                                <span className='flex! flex-row! items-center gap-2'><TrendingUp size={12} /> Profit/piece:</span>
                                                <strong>{profitPerPiece.toFixed(2)} EGP</strong>
                                            </div>
                                            {count > 1 && (
                                                <div className={`profit-preview-row profit-preview-total ${profitPerPiece * count >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                                                    <span>Total Profit (×{count}):</span>
                                                    <strong>{(profitPerPiece * count).toFixed(2)} EGP</strong>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
                            )}

                            {/* ✅ NEW: Shipping Status in Modal */}
                            <div className="form-divider"><span>Shipping Status</span></div>

                            <div className='flex flex-col items-start gap-4 p-3 rounded-lg' >
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: form.shipped_china ? '#3b82f6' : '#888',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: `1px solid ${form.shipped_china ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                                    background: form.shipped_china ? 'rgba(59,130,246,0.1)' : 'transparent',
                                    transition: 'all 0.2s',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={form.shipped_china ?? false}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setForm({
                                                ...form,
                                                shipped_china: checked,
                                                // If unchecked, also uncheck Egypt
                                                shipped_egy: checked ? form.shipped_egy : false,
                                            });
                                        }}
                                        style={{ accentColor: '#3b82f6' }}
                                    />
                                    <Plane size={16} />
                                    Shipped from China 🇨🇳
                                </label>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: form.shipped_egy ? '#10b981' : '#888',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: `1px solid ${form.shipped_egy ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                                    background: form.shipped_egy ? 'rgba(16,185,129,0.1)' : 'transparent',
                                    transition: 'all 0.2s',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={form.shipped_egy ?? false}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setForm({
                                                ...form,
                                                shipped_egy: checked,
                                                // If checked, also check China
                                                shipped_china: checked ? true : form.shipped_china,
                                            });
                                        }}
                                        style={{ accentColor: '#10b981' }}
                                    />
                                    <MapPin size={16} />
                                    Arrived in Egypt 🇪🇬
                                </label>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}