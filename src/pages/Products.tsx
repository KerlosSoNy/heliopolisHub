import { useState, useCallback } from 'react';
import {
    Trash2, Edit, Plus, X, Package, Hash,
    DollarSign, TrendingUp, Truck, Tag,
} from 'lucide-react';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { useCollection } from '../hooks/useCollection';
import type { Product, ProductForm, Order } from '../types';

const emptyForm: ProductForm = {
    name: '',
    count: '',
    price_chi: '',
    rate: '',
    sold_price: '',
};

export default function Products() {
    const { data: products, loading, error, refetch } = useCollection<Product>({
        fetchFn: useCallback(() => productService.list(), []),
    });

    const { data: orders } = useCollection<Order>({
        fetchFn: useCallback(() => orderService.list(100), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ProductForm>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');

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

    // ========== CALCULATIONS ==========
    const calcPriceEgp = (price_chi: string, rate: string): number => {
        const price = parseFloat(price_chi);
        const r = parseFloat(rate);
        if (isNaN(price) || isNaN(r)) return 0;
        return price * r;
    };

    // Find the order that contains this product and calculate shipping
    const calcShippingForProduct = (productName: string, priceEgp: number): number => {
        // Find order containing this product
        const order = orders.find((o) => o.product === productName);
        if (!order) return 0;

        const totalShipping = parseFloat(order.total_shipping || '0');
        const totalOrder = parseFloat(order.total_order || '0');

        if (totalOrder === 0 || totalShipping === 0) return 0;

        // shipping_per_piece = (piece_price / total_order) × total_shipping
        return (priceEgp / totalOrder) * totalShipping;
    };

    const calcProfit = (product: Product): { profit: number; shippingCost: number; priceEgp: number } => {
        const priceEgp = calcPriceEgp(product.price_chi, product.rate);
        const shippingCost = calcShippingForProduct(product.name, priceEgp);
        const soldPrice = parseFloat(product.sold_price || '0');
        const profit = soldPrice - priceEgp - shippingCost;
        return { profit, shippingCost, priceEgp };
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Totals
    const totals = products.reduce(
        (acc, p) => {
            const { profit, shippingCost, priceEgp } = calcProfit(p);
            const count = parseInt(p.count) || 1;
            return {
                totalCost: acc.totalCost + priceEgp * count,
                totalShipping: acc.totalShipping + shippingCost * count,
                totalSold: acc.totalSold + (parseFloat(p.sold_price || '0') * count),
                totalProfit: acc.totalProfit + profit * count,
            };
        },
        { totalCost: 0, totalShipping: 0, totalSold: 0, totalProfit: 0 }
    );

    if (loading) return <div className="loading">Loading products...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
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

            {/* Summary Cards */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Total Cost (EGP)</p>
                        <p className="stat-value">{totals.totalCost.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><Truck size={24} /></div>
                    <div>
                        <p className="stat-label">Total Shipping</p>
                        <p className="stat-value">{totals.totalShipping.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><Tag size={24} /></div>
                    <div>
                        <p className="stat-label">Total Sold</p>
                        <p className="stat-value">{totals.totalSold.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card">
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

            {/* Product Cards */}
            <div className="product-grid">
                {filteredProducts.map((p) => {
                    const { profit, shippingCost, priceEgp } = calcProfit(p);
                    const soldPrice = parseFloat(p.sold_price || '0');

                    return (
                        <div key={p.$id} className="product-card">
                            <div className="product-card-header">
                                <div className="product-icon">
                                    <Package size={22} />
                                </div>
                                <div className="customer-card-actions">
                                    <button type="button" title="Edit" className="btn-icon" onClick={() => openEdit(p)}>
                                        <Edit size={15} />
                                    </button>
                                    <button type="button" title="Delete" className="btn-icon danger" onClick={() => handleDelete(p.$id)}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="product-name">{p.name}</h3>

                            <div className="product-stats">
                                <div className="product-stat">
                                    <span className="product-stat-label">Count</span>
                                    <span className="product-stat-value">{p.count}</span>
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

                            {/* Price Breakdown */}
                            <div className="price-breakdown">
                                <div className="breakdown-row">
                                    <span>Cost (EGP)</span>
                                    <span>{priceEgp.toFixed(2)}</span>
                                </div>
                                <div className="breakdown-row">
                                    <span><Truck size={12} /> Shipping</span>
                                    <span>{shippingCost.toFixed(2)}</span>
                                </div>
                                <div className="breakdown-row">
                                    <span><Tag size={12} /> Sold For</span>
                                    <span>{soldPrice > 0 ? soldPrice.toFixed(2) : '—'}</span>
                                </div>
                                <div className={`breakdown-row breakdown-total ${profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                                    <span><TrendingUp size={12} /> Profit</span>
                                    <span>{soldPrice > 0 ? profit.toFixed(2) + ' EGP' : '—'}</span>
                                </div>
                            </div>

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

            {/* Table */}
            <div className="card">
                <h2>All Products — Detailed View</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Count</th>
                                <th>CNY</th>
                                <th>Rate</th>
                                <th>Cost (EGP)</th>
                                <th>Shipping</th>
                                <th>Total Cost</th>
                                <th>Sold For</th>
                                <th>Profit</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p) => {
                                const { profit, shippingCost, priceEgp } = calcProfit(p);
                                const soldPrice = parseFloat(p.sold_price || '0');
                                const totalCostPerPiece = priceEgp + shippingCost;

                                return (
                                    <tr key={p.$id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="table-avatar-product"><Package size={16} /></div>
                                                {p.name}
                                            </div>
                                        </td>
                                        <td>{p.count}</td>
                                        <td>{p.price_chi} ¥</td>
                                        <td>{p.rate}</td>
                                        <td>{priceEgp.toFixed(2)}</td>
                                        <td>{shippingCost.toFixed(2)}</td>
                                        <td><strong>{totalCostPerPiece.toFixed(2)}</strong></td>
                                        <td>{soldPrice > 0 ? soldPrice.toFixed(2) : '—'}</td>
                                        <td>
                                            {soldPrice > 0 ? (
                                                <span className={profit >= 0 ? 'text-green' : 'text-danger'}>
                                                    <strong>{profit.toFixed(2)}</strong>
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="actions">
                                            <button type="button" title="Edit" className="btn-icon" onClick={() => openEdit(p)}><Edit size={16} /></button>
                                            <button type="button" title="Delete" className="btn-icon danger" onClick={() => handleDelete(p.$id)}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredProducts.length === 0 && (
                                <tr><td colSpan={10} className="empty">No products yet</td></tr>
                            )}
                        </tbody>
                        {/* Table Footer with Totals */}
                        {filteredProducts.length > 0 && (
                            <tfoot>
                                <tr className="totals-row">
                                    <td><strong>TOTALS</strong></td>
                                    <td><strong>{products.reduce((s, p) => s + (parseInt(p.count) || 0), 0)}</strong></td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td><strong>{totals.totalCost.toFixed(2)}</strong></td>
                                    <td><strong>{totals.totalShipping.toFixed(2)}</strong></td>
                                    <td><strong>{(totals.totalCost + totals.totalShipping).toFixed(2)}</strong></td>
                                    <td><strong>{totals.totalSold.toFixed(2)}</strong></td>
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

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Product' : 'New Product'}</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label><Package size={14} /> Product Name *</label>
                                <input required placeholder="Product name" value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label><Hash size={14} /> Count *</label>
                                <input required placeholder="Quantity" value={form.count}
                                    onChange={(e) => setForm({ ...form, count: e.target.value })} />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label><DollarSign size={14} /> Price (CNY) *</label>
                                    <input required placeholder="Chinese price" value={form.price_chi}
                                        onChange={(e) => setForm({ ...form, price_chi: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label><TrendingUp size={14} /> Rate *</label>
                                    <input required placeholder="Exchange rate" value={form.rate}
                                        onChange={(e) => setForm({ ...form, rate: e.target.value })} />
                                </div>
                            </div>

                            {/* Live EGP Calculation */}
                            <div className="calc-preview">
                                <span>Cost in EGP:</span>
                                <strong>
                                    {form.price_chi && form.rate
                                        ? (parseFloat(form.price_chi) * parseFloat(form.rate)).toFixed(2) + ' EGP'
                                        : '—'}
                                </strong>
                            </div>

                            <div className="form-divider">
                                <span>Selling Info</span>
                            </div>

                            <div className="form-group">
                                <label><Tag size={14} /> Sold Price (EGP)</label>
                                <input placeholder="What you sold it for" value={form.sold_price}
                                    onChange={(e) => setForm({ ...form, sold_price: e.target.value })} />
                            </div>

                            {/* Live Profit Preview */}
                            {form.sold_price && form.price_chi && form.rate && (
                                <div className={`calc-preview ${parseFloat(form.sold_price) - (parseFloat(form.price_chi) * parseFloat(form.rate)) >= 0
                                    ? 'calc-profit' : 'calc-loss'
                                    }`}>
                                    <span>Estimated Profit (excl. shipping):</span>
                                    <strong>
                                        {(parseFloat(form.sold_price) - (parseFloat(form.price_chi) * parseFloat(form.rate))).toFixed(2)} EGP
                                    </strong>
                                </div>
                            )}

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