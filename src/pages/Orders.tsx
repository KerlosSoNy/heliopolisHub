import { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Trash2, Edit, Plus, X, ShoppingCart, User,
    Package, DollarSign, Check, Minus,
    Plus as PlusIcon,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { useCollection } from '../hooks/useCollection';
import type { Order, Customer, Product, SelectedProduct } from '../types';

export default function Orders() {
    const { data: orders, loading, error, refetch } = useCollection<Order>({
        fetchFn: useCallback(() => orderService.list(100), []),
    });

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [client, setClient] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const refreshProducts = () => {
        productService.list(100).then(setAllProducts).catch(console.error);
    };

    useEffect(() => {
        customerService.list(100).then(setCustomers).catch(console.error);
        refreshProducts();
    }, []);

    // ========== HELPERS ==========
    const getProduct = (id: string): Product | undefined =>
        allProducts.find((p) => p.$id === id);

    const getCostPerPiece = (product: Product): number => {
        const price = parseFloat(product.price_chi);
        const rate = parseFloat(product.rate);
        const total_order = parseFloat(product.total_order || '0');
        const total_shipping = parseFloat(product.total_shipping || '0');
        if (isNaN(price) || isNaN(rate)) return 0;
        return ((price * rate) / total_order) * total_shipping + (price * rate);
    };

    const getSoldPerPiece = (product: Product): number => {
        return parseFloat(product.sold_price || '0');
    };

    const getAvailableCount = (product: Product): number => {
        return parseInt(product.count) || 0;
    };

    const getDisplayPrice = (product: Product): number => {
        const sold = getSoldPerPiece(product);
        return sold > 0 ? sold : getCostPerPiece(product);
    };

    // ========== TOTALS ==========
    const orderTotal = useMemo(() => {
        return selectedProducts.reduce((sum, sp) => {
            const product = getProduct(sp.productId);
            if (!product) return sum;
            return sum + getDisplayPrice(product) * sp.qty;
        }, 0);
    }, [selectedProducts, allProducts]);

    // ========== PRODUCT SELECTION ==========
    const toggleProduct = (productId: string) => {
        setSelectedProducts((prev) => {
            const exists = prev.find((sp) => sp.productId === productId);
            if (exists) {
                return prev.filter((sp) => sp.productId !== productId);
            }
            return [...prev, { productId, qty: 1 }];
        });
    };

    const updateQty = (productId: string, newQty: number) => {
        const product = getProduct(productId);
        if (!product) return;
        const maxCount = getAvailableCount(product);
        const clampedQty = Math.max(1, Math.min(newQty, maxCount));
        setSelectedProducts((prev) =>
            prev.map((sp) =>
                sp.productId === productId ? { ...sp, qty: clampedQty } : sp
            )
        );
    };

    const isSelected = (productId: string): boolean =>
        selectedProducts.some((sp) => sp.productId === productId);

    const getSelectedQty = (productId: string): number =>
        selectedProducts.find((sp) => sp.productId === productId)?.qty || 0;

    // ========== MODAL ==========
    const openCreate = () => {
        setClient('');
        setSelectedProducts([]);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (order: Order) => {
        setClient(order.client);
        const restored: SelectedProduct[] = (order.products || []).map((pid) => ({
            productId: pid,
            qty: 1,
        }));
        setSelectedProducts(restored);
        setEditingId(order.$id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);

        try {
            // Build product description string
            const productDescription = selectedProducts
                .map((sp) => {
                    const product = getProduct(sp.productId);
                    return product ? `${product.name} ×${sp.qty}` : '';
                })
                .filter(Boolean)
                .join(', ');

            // Only send clean data
            const orderData = {
                client,
                product: productDescription,
                products: selectedProducts.map((sp) => sp.productId),
                price_egp: orderTotal.toFixed(2),
            };

            let orderId: string;

            if (editingId) {
                await orderService.update(editingId, orderData);
                orderId = editingId;
            } else {
                // CREATE new order
                const newOrder = await orderService.create(orderData);
                orderId = newOrder.$id;

                // 👇 DECREASE product count for each selected product
                console.log('📦 Decreasing product counts...');
                for (const sp of selectedProducts) {
                    await productService.decreaseCount(sp.productId, sp.qty);
                    console.log(`  ✅ ${sp.productId}: -${sp.qty}`);
                }
            }

            // Link products to order
            const productIds = selectedProducts.map((sp) => sp.productId);
            if (productIds.length > 0) {
                await productService.linkToOrder(productIds, orderId);
            }

            setShowModal(false);
            setSelectedProducts([]);
            setClient('');
            refetch();
            refreshProducts(); // Refresh to show updated counts
        } catch (err) {
            console.error('Order error:', err);
            alert('Failed to create order. Check console for details.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this order? Product counts will be restored.')) return;

        try {
            // Get order to find products
            const order = orders.find((o) => o.$id === id);

            // 👇 RESTORE product counts
            if (order?.products && order.products.length > 0) {
                console.log('📦 Restoring product counts...');
                for (const pid of order.products) {
                    // Restore 1 for now (we don't store qty in order)
                    // TODO: store qty per product in order
                    await productService.increaseCount(pid, 1);
                    console.log(`  ✅ ${pid}: +1`);
                }
            }

            await orderService.remove(id);
            refetch();
            refreshProducts();
        } catch (err) {
            console.error(err);
        }
    };

    // ========== DISPLAY ==========
    const getOrderProducts = (order: Order): Product[] => {
        if (order.products && order.products.length > 0) {
            return order.products
                .map((pid) => allProducts.find((p) => p.$id === pid))
                .filter(Boolean) as Product[];
        }
        return [];
    };

    const filteredOrders = orders.filter(
        (o) =>
            o.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.product || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalRevenue = orders.reduce(
        (sum, o) => sum + (parseFloat(o.price_egp) || 0), 0
    );

    if (loading) return <div className="loading">Loading orders...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Orders ({orders.length})</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search by client or product..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> New Order
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="order-summary">
                <div className="summary-item">
                    <ShoppingCart size={18} />
                    <span>Total Orders: <strong>{orders.length}</strong></span>
                </div>
                <div className="summary-item">
                    <DollarSign size={18} />
                    <span>Total Revenue: <strong>{totalRevenue.toFixed(2)} EGP</strong></span>
                </div>
            </div>

            {/* Order Cards */}
            <div className="order-grid">
                {filteredOrders.map((o) => {
                    const orderProducts = getOrderProducts(o);
                    return (
                        <div key={o.$id} className="order-card">
                            <div className="order-card-header">
                                <div className="order-id">#{o.$id.slice(0, 8)}</div>
                                <div className="customer-card-actions">
                                    <button className="btn-icon" onClick={() => openEdit(o)}>
                                        <Edit size={15} />
                                    </button>
                                    <button className="btn-icon danger" onClick={() => handleDelete(o.$id)}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <div className="order-details">
                                <div className="order-detail">
                                    <User size={14} />
                                    <span className="order-client-name">{o.client}</span>
                                </div>

                                <div className="order-products-list">
                                    <span className="order-products-label">
                                        <Package size={14} /> {o.product}
                                    </span>
                                </div>

                                <div className="order-numbers">
                                    <div className="order-number-item">
                                        <span>Total</span>
                                        <strong className="text-green">{o.price_egp} EGP</strong>
                                    </div>
                                    <div className="order-number-item">
                                        <span>Items</span>
                                        <strong>{orderProducts.length}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="customer-meta">
                                {new Date(o.$createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
                {filteredOrders.length === 0 && (
                    <div className="empty-state"><p>No orders found</p></div>
                )}
            </div>

            {/* Table */}
            <div className="card">
                <h2>All Orders</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Client</th>
                                <th>Products</th>
                                <th>Total</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((o) => (
                                <tr key={o.$id}>
                                    <td>#{o.$id.slice(0, 8)}</td>
                                    <td><strong>{o.client}</strong></td>
                                    <td>{o.product || '—'}</td>
                                    <td><strong className="text-green">{o.price_egp} EGP</strong></td>
                                    <td>{new Date(o.$createdAt).toLocaleDateString()}</td>
                                    <td className="actions">
                                        <button className="btn-icon" onClick={() => openEdit(o)}><Edit size={16} /></button>
                                        <button className="btn-icon danger" onClick={() => handleDelete(o.$id)}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredOrders.length === 0 && (
                                <tr><td colSpan={6} className="empty">No orders yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== ORDER MODAL ===== */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Order' : 'New Order'}</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {/* Client */}
                            <div className="form-group">
                                <label><User size={14} /> Client *</label>
                                <select
                                    required
                                    value={client}
                                    onChange={(e) => setClient(e.target.value)}
                                >
                                    <option value="">Select client...</option>
                                    {customers.map((c) => (
                                        <option key={c.$id} value={c.name}>
                                            {c.name} ({c.phone})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Products */}
                            <div className="form-group">
                                <label>
                                    <Package size={14} /> Select Products *
                                    <span className="label-badge">{selectedProducts.length} selected</span>
                                </label>
                                <div className="product-selector">
                                    {allProducts.map((p) => {
                                        const selected = isSelected(p.$id);
                                        const soldPc = getSoldPerPiece(p);
                                        const costPc = getCostPerPiece(p);
                                        const available = getAvailableCount(p);
                                        const qty = getSelectedQty(p.$id);
                                        const displayPrice = getDisplayPrice(p);
                                        const outOfStock = available === 0;

                                        return (
                                            <div
                                                key={p.$id}
                                                className={`product-select-item ${selected ? 'selected' : ''} ${outOfStock ? 'out-of-stock' : ''}`}
                                            >
                                                <div
                                                    className="product-select-check"
                                                    onClick={() => !outOfStock && toggleProduct(p.$id)}
                                                >
                                                    {selected && <Check size={16} />}
                                                </div>

                                                <div
                                                    className="product-select-info"
                                                    onClick={() => !outOfStock && !selected && toggleProduct(p.$id)}
                                                >
                                                    <span className="product-select-name">
                                                        {p.name}
                                                        {soldPc === 0 && <span className="no-sold-badge">No sold price</span>}
                                                        {outOfStock && <span className="out-of-stock-badge">Out of stock</span>}
                                                    </span>
                                                    <span className="product-select-details">
                                                        {soldPc > 0 ? (
                                                            <>Sold: <strong>{soldPc.toFixed(2)}</strong> EGP/pc</>
                                                        ) : (
                                                            <>Cost: {costPc.toFixed(2)} EGP/pc</>
                                                        )}
                                                    </span>
                                                    <span className={`product-select-stock ${outOfStock ? 'stock-zero' : ''}`}>
                                                        Available: <strong>{available}</strong>
                                                    </span>
                                                </div>

                                                {/* Qty Picker */}
                                                {selected && !outOfStock && (
                                                    <div className="qty-picker">
                                                        <button
                                                            type="button"
                                                            className="qty-btn"
                                                            onClick={() => updateQty(p.$id, qty - 1)}
                                                            disabled={qty <= 1}
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            className="qty-input"
                                                            value={qty}
                                                            min={1}
                                                            max={available}
                                                            onChange={(e) => updateQty(p.$id, parseInt(e.target.value) || 1)}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="qty-btn"
                                                            onClick={() => updateQty(p.$id, qty + 1)}
                                                            disabled={qty >= available}
                                                        >
                                                            <PlusIcon size={14} />
                                                        </button>
                                                        <span className="qty-max">/ {available}</span>
                                                    </div>
                                                )}

                                                {/* Subtotal */}
                                                {selected && (
                                                    <div className="product-select-subtotal">
                                                        {(displayPrice * qty).toFixed(2)}
                                                        <small> EGP</small>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {allProducts.length === 0 && (
                                        <p className="empty-text">No products available.</p>
                                    )}
                                </div>
                            </div>

                            {/* Order Summary */}
                            {selectedProducts.length > 0 && (
                                <div className="order-breakdown">
                                    <h4>Order Summary</h4>

                                    {selectedProducts.map((sp) => {
                                        const product = getProduct(sp.productId);
                                        if (!product) return null;
                                        const displayPrice = getDisplayPrice(product);
                                        const soldPc = getSoldPerPiece(product);

                                        return (
                                            <div key={sp.productId} className="order-breakdown-item">
                                                <div className="breakdown-product-info">
                                                    <span className="breakdown-product-name">
                                                        {product.name}
                                                        <span className="breakdown-qty">×{sp.qty}</span>
                                                    </span>
                                                    <span className="breakdown-unit-price">
                                                        {displayPrice.toFixed(2)} EGP/pc
                                                        {soldPc > 0 ? ' (sold)' : ' (cost)'}
                                                    </span>
                                                </div>
                                                <div className="breakdown-item-total">
                                                    {(displayPrice * sp.qty).toFixed(2)} EGP
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="order-breakdown-totals">
                                        <div className="breakdown-total-row sold-total">
                                            <span>Order Total:</span>
                                            <strong>{orderTotal.toFixed(2)} EGP</strong>
                                        </div>
                                    </div>

                                    {/* Stock warning */}
                                    <div className="breakdown-note">
                                        📦 Product stock will be decreased after order is created
                                    </div>
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={selectedProducts.length === 0 || !client || submitting}
                                >
                                    {submitting ? '⏳ Creating...' : editingId ? 'Update Order' : 'Create Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}