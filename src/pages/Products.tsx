import { useState, useCallback } from 'react';
import {
    Trash2, Edit, Plus, X, Package, Hash,
    DollarSign, TrendingUp, Truck, Tag, Save,
    XCircle,
    AlertTriangle,
    CheckCircle,
    User,
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
    order_id: '',
    total_order: '',
    total_shipping: '',
};

export default function Products() {
    const { data: products, loading, error, refetch } = useCollection<Product>({
        fetchFn: useCallback(() => productService.list(100), []),
    });

    const { data: orders } = useCollection<Order>({
        fetchFn: useCallback(() => orderService.list(100), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ProductForm>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');

    // Inline edit for shipping/sold
    const [inlineEdit, setInlineEdit] = useState<{
        id: string;
        total_order: string;
        total_shipping: string;
        sold_price: string;
    } | null>(null);

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

    // Inline save shipping + sold price
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

    // Get client name from order
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
        return price * r; // PER PIECE
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

    const getOrderForProduct = (product: Product): Order | undefined => {
        if (!product.order_id) return undefined;
        return orders.find((o) => o.$id === product.order_id);
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            {/* Summary */}
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
                    const calc = calcAll(p);
                    const order = getOrderForProduct(p);
                    const stock = getStockStatus(p);
                    const clientName = getClientName(p);
                    const isEditing = inlineEdit?.id === p.$id;
                    const StockIcon = stock.icon;

                    return (
                        <div key={p.$id} className={`product-card ${stock.color === 'red' ? 'product-card-oos' : ''}`}>
                            <div className="product-card-header">
                                <div className="product-icon"><Package size={22} /></div>
                                <div className="customer-card-actions">
                                    <button className="btn-icon" onClick={() => openEdit(p)}><Edit size={15} /></button>
                                    <button className="btn-icon danger" onClick={() => handleDelete(p.$id)}><Trash2 size={15} /></button>
                                </div>
                            </div>

                            <h3 className="product-name">
                                {p.name}
                                {stock.color === 'red' && (
                                    <span className="oos-badge"><XCircle size={12} /> Out of Stock</span>
                                )}
                            </h3>

                            {/* Client name from order */}
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

                            <div className="product-stats">
                                <div className="product-stat">
                                    <span className="product-stat-label">Count</span>
                                    <span className={`product-stat-value stock-${stock.color}`}>
                                        {p.count}
                                    </span>
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
                                        <div className={`breakdown-row breakdown-total ${calc.profitPerPiece >= 0 ? 'profit-positive' : 'profit-negative'
                                            }`}>
                                            <span><TrendingUp size={12} /> Profit/piece</span>
                                            <span>{calc.soldPrice > 0 ? calc.profitPerPiece.toFixed(2) + ' EGP' : '—'}</span>
                                        </div>
                                        {calc.soldPrice > 0 && calc.count > 1 && (
                                            <div className={`breakdown-row breakdown-total ${calc.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'
                                                }`}>
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
            {/* Detailed Table */}
            {/* Detailed Table */}
            <div className="card">
                <h2>All Products — Detailed</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Client</th>
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
                            {filteredProducts.map((p) => {
                                const calc = calcAll(p);
                                const stock = getStockStatus(p);
                                const clientName = getClientName(p);
                                const StockIcon = stock.icon;

                                return (
                                    <tr key={p.$id} className={stock.color === 'red' ? 'row-oos' : ''}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                            <button className="btn-icon" onClick={() => startInlineEdit(p)} title="Set shipping & sold">
                                                <Truck size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => openEdit(p)}><Edit size={16} /></button>
                                            <button className="btn-icon danger" onClick={() => handleDelete(p.$id)}><Trash2 size={16} /></button>
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

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Product' : 'New Product'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
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
                                    <label><DollarSign size={14} /> Total Order (EGP)</label>
                                    <input placeholder="Total order price" value={form.total_order}
                                        onChange={(e) => setForm({ ...form, total_order: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label><Truck size={14} /> Total Shipping (EGP)</label>
                                    <input placeholder="Total shipping cost" value={form.total_shipping}
                                        onChange={(e) => setForm({ ...form, total_shipping: e.target.value })} />
                                </div>
                            </div>

                            {form.total_order && form.total_shipping && form.price_chi && form.rate && (
                                <div className="calc-preview">
                                    <span><Truck size={14} /> Shipping/piece:</span>
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
                                <label><Tag size={14} /> Sold Price per piece (EGP)</label>
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

                                    // Shipping per piece = (piece_cost / total_order) × total_shipping
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
                                                    <span><Truck size={12} /> Shipping/piece:</span>
                                                    <span>{shippingPerPiece.toFixed(2)} EGP</span>
                                                </div>
                                            )}
                                            <div className="profit-preview-row">
                                                <span>Total Cost/piece:</span>
                                                <span><strong>{totalCostPerPiece.toFixed(2)} EGP</strong></span>
                                            </div>
                                            <div className="profit-preview-row">
                                                <span><Tag size={12} /> Sold/piece:</span>
                                                <span>{soldPrice.toFixed(2)} EGP</span>
                                            </div>
                                            <div className={`profit-preview-row profit-preview-total ${profitPerPiece >= 0 ? 'profit-positive' : 'profit-negative'
                                                }`}>
                                                <span><TrendingUp size={12} /> Profit/piece:</span>
                                                <strong>{profitPerPiece.toFixed(2)} EGP</strong>
                                            </div>
                                            {count > 1 && (
                                                <div className={`profit-preview-row profit-preview-total ${profitPerPiece * count >= 0 ? 'profit-positive' : 'profit-negative'
                                                    }`}>
                                                    <span>Total Profit (×{count}):</span>
                                                    <strong>{(profitPerPiece * count).toFixed(2)} EGP</strong>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
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