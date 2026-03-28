import { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Trash2, Edit, Plus, X, ShoppingCart, User,
    Package, DollarSign, Check, Minus,
    Plus as PlusIcon, Wallet, CheckCircle,
    CircleDollarSign, Clock,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { depositHistoryService } from '../services/depositHistoryService';
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
    const [useDeposite, setUseDeposite] = useState(true);
    const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');

    const refreshProducts = () => {
        productService.list(100).then(setAllProducts).catch(console.error);
    };

    const refreshCustomers = () => {
        customerService.list(100).then(setCustomers).catch(console.error);
    };

    useEffect(() => {
        refreshCustomers();
        refreshProducts();
    }, []);

    // ========== HELPERS ==========
    const getProduct = (id: string): Product | undefined =>
        allProducts.find((p) => p.$id === id);

    const getCostPerPiece = (product: Product): number => {
        const price = parseFloat(product.price_chi);
        const rate = parseFloat(product.rate);
        if (isNaN(price) || isNaN(rate)) return 0;
        return price * rate;
    };

    const getSoldPerPiece = (product: Product): number =>
        parseFloat(product.sold_price || '0');

    const getAvailableCount = (product: Product): number =>
        parseInt(product.count) || 0;

    const getDisplayPrice = (product: Product): number => {
        const sold = getSoldPerPiece(product);
        return sold > 0 ? sold : getCostPerPiece(product);
    };

    const isPaid = (order: Order): boolean => order.is_paid === 'yes';

    // Customer info
    const selectedCustomer = useMemo(() =>
        customers.find((c) => c.name === client), [client, customers]);

    const customerDeposite = useMemo(() =>
        parseFloat(selectedCustomer?.deposite || '0'), [selectedCustomer]);

    // ========== TOTALS ==========
    const orderTotal = useMemo(() => {
        return selectedProducts.reduce((sum, sp) => {
            const product = getProduct(sp.productId);
            if (!product) return sum;
            return sum + getDisplayPrice(product) * sp.qty;
        }, 0);
    }, [selectedProducts, allProducts]);

    const depositeToUse = useMemo(() => {
        if (!useDeposite || customerDeposite <= 0) return 0;
        return Math.min(customerDeposite, orderTotal);
    }, [useDeposite, customerDeposite, orderTotal]);

    const amountAfterDeposite = useMemo(() =>
        Math.max(0, orderTotal - depositeToUse), [orderTotal, depositeToUse]);

    // Summary stats
    const totalPaid = orders
        .filter((o) => o.is_paid === 'yes')
        .reduce((sum, o) => sum + parseFloat(o.price_egp || '0'), 0);

    const totalUnpaid = orders
        .filter((o) => o.is_paid !== 'yes')
        .reduce((sum, o) => sum + parseFloat(o.price_egp || '0'), 0);

    const totalRevenue = orders.reduce(
        (sum, o) => sum + (parseFloat(o.price_egp) || 0), 0);

    // ========== PRODUCT SELECTION ==========
    const toggleProduct = (productId: string) => {
        setSelectedProducts((prev) => {
            const exists = prev.find((sp) => sp.productId === productId);
            if (exists) return prev.filter((sp) => sp.productId !== productId);
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

    // ========== TOGGLE PAID ==========
    const handleTogglePaid = async (order: Order) => {
        try {
            const newStatus = !isPaid(order);
            await orderService.togglePaid(order.$id, newStatus);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    // ========== MODAL ==========
    const openCreate = () => {
        setClient('');
        setSelectedProducts([]);
        setEditingId(null);
        setUseDeposite(true);
        setShowModal(true);
    };

    const openEdit = (order: Order) => {
        setClient(order.client);
        const restored: SelectedProduct[] = (order.products || []).map((pid) => ({
            productId: pid, qty: 1,
        }));
        setSelectedProducts(restored);
        setEditingId(order.$id);
        setUseDeposite(parseFloat(order.deposite_used || '0') > 0);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);

        try {
            const productDescription = selectedProducts
                .map((sp) => {
                    const product = getProduct(sp.productId);
                    return product ? `${product.name} ×${sp.qty}` : '';
                })
                .filter(Boolean)
                .join(', ');

            const orderData = {
                client,
                product: productDescription,
                products: selectedProducts.map((sp) => sp.productId),
                price_egp: amountAfterDeposite.toFixed(2),
                deposite_used: depositeToUse > 0 ? depositeToUse.toFixed(2) : '0',
                is_paid: 'no',
            };

            let orderId: string;

            if (editingId) {
                await orderService.update(editingId, orderData);
                orderId = editingId;
            } else {
                const newOrder = await orderService.create(orderData);
                orderId = newOrder.$id;

                for (const sp of selectedProducts) {
                    await productService.decreaseCount(sp.productId, sp.qty);
                }

                if (depositeToUse > 0 && selectedCustomer) {
                    const remainingDeposite = Math.max(0, customerDeposite - depositeToUse);
                    await customerService.update(selectedCustomer.$id, {
                        deposite: remainingDeposite > 0 ? remainingDeposite.toString() : '0',
                    });
                    await depositHistoryService.logUse(
                        selectedCustomer.$id,
                        selectedCustomer.name,
                        depositeToUse.toFixed(2),
                        `Used in order: ${productDescription}`
                    );
                }
            }

            const productIds = selectedProducts.map((sp) => sp.productId);
            if (productIds.length > 0) {
                await productService.linkToOrder(productIds, orderId);
            }

            setShowModal(false);
            setSelectedProducts([]);
            setClient('');
            refetch();
            refreshProducts();
            refreshCustomers();
        } catch (err) {
            console.error('Order error:', err);
            alert('Failed to create order.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this order? Product counts will be restored.')) return;
        try {
            const order = orders.find((o) => o.$id === id);

            if (order?.products && order.products.length > 0) {
                for (const pid of order.products) {
                    await productService.increaseCount(pid, 1);
                }
            }

            if (order?.deposite_used && parseFloat(order.deposite_used) > 0) {
                const customer = customers.find((c) => c.name === order.client);
                if (customer) {
                    const currentDeposite = parseFloat(customer.deposite || '0');
                    const restoredAmount = parseFloat(order.deposite_used);
                    await customerService.update(customer.$id, {
                        deposite: (currentDeposite + restoredAmount).toString(),
                    });
                    await depositHistoryService.logRestore(
                        customer.$id, customer.name, restoredAmount.toFixed(2)
                    );
                }
            }

            await orderService.remove(id);
            refetch();
            refreshProducts();
            refreshCustomers();
        } catch (err) {
            console.error(err);
        }
    };

    // ========== FILTER ==========
    const filteredOrders = orders
        .filter((o) =>
            o.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.product || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .filter((o) => {
            if (filterPaid === 'paid') return o.is_paid === 'yes';
            if (filterPaid === 'unpaid') return o.is_paid !== 'yes';
            return true;
        });

    if (loading) return <div className="loading">Loading orders...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Orders ({orders.length})</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        title='Select'
                        className="filter-select"
                        value={filterPaid}
                        onChange={(e) => setFilterPaid(e.target.value as 'all' | 'paid' | 'unpaid')}
                    >
                        <option value="all">All Orders</option>
                        <option value="paid">✅ Paid</option>
                        <option value="unpaid">⏳ Unpaid</option>
                    </select>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> New Order
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><ShoppingCart size={24} /></div>
                    <div>
                        <p className="stat-label">Total Orders</p>
                        <p className="stat-value">{orders.length}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><CheckCircle size={24} /></div>
                    <div>
                        <p className="stat-label">Total Paid</p>
                        <p className="stat-value text-green">{totalPaid.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><Clock size={24} /></div>
                    <div>
                        <p className="stat-label">Total Unpaid</p>
                        <p className="stat-value text-danger">{totalUnpaid.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Total Revenue</p>
                        <p className="stat-value">{totalRevenue.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Order Cards */}
            <div className="order-grid">
                {filteredOrders.map((o) => {
                    const paid = isPaid(o);
                    const depUsed = parseFloat(o.deposite_used || '0');

                    return (
                        <div key={o.$id} className={`order-card ${paid ? 'order-card-paid' : 'order-card-unpaid'}`}>
                            <div className="order-card-header">
                                <div className="order-id">#{o.$id.slice(0, 8)}</div>
                                <div className="customer-card-actions">
                                    <button
                                        className={`btn-icon ${paid ? 'paid-btn' : 'unpaid-btn'}`}
                                        onClick={() => handleTogglePaid(o)}
                                        title={paid ? 'Mark as unpaid' : 'Mark as paid'}
                                    >
                                        {paid ? <CheckCircle size={18} /> : <CircleDollarSign size={18} />}
                                    </button>
                                    <button type="button" title="Edit" className="btn-icon" onClick={() => openEdit(o)}>
                                        <Edit size={15} />
                                    </button>
                                    <button type="button" title="Delete" className="btn-icon danger" onClick={() => handleDelete(o.$id)}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Payment Status Badge */}
                            <div className={`payment-badge ${paid ? 'payment-paid' : 'payment-unpaid'}`}>
                                {paid ? <><CheckCircle size={14} /> Paid</> : <><Clock size={14} /> Unpaid</>}
                            </div>

                            <div className="order-details">
                                <div className="order-detail">
                                    <User size={14} />
                                    <span className="order-client-name">{o.client}</span>
                                </div>

                                <div className="order-numbers">
                                    <div className="order-number-item">
                                        <span>{paid ? 'Paid' : 'Unpaid'}</span>
                                        <strong className={paid ? 'text-green' : 'text-danger'}>{o.price_egp} EGP</strong>
                                    </div>
                                    {depUsed > 0 && (
                                        <div className="order-number-item deposite-item">
                                            <span>Deposit</span>
                                            <strong className="text-blue">{depUsed.toFixed(2)}</strong>
                                        </div>
                                    )}
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
                                <th>Items</th>
                                <th>Deposit</th>
                                <th>To Pay</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((o) => {
                                const paid = isPaid(o);
                                const depUsed = parseFloat(o.deposite_used || '0');

                                return (
                                    <tr key={o.$id} className={paid ? 'row-paid' : 'row-unpaid'}>
                                        <td>#{o.$id.slice(0, 8)}</td>
                                        <td><strong>{o.client}</strong></td>
                                        <td><span className="table-items-text">{o.product || '—'}</span></td>
                                        <td>
                                            {depUsed > 0 ? (
                                                <span className="text-blue">{depUsed.toFixed(2)}</span>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <strong className={paid ? 'text-green' : 'text-danger'}>
                                                {o.price_egp} EGP
                                            </strong>
                                        </td>
                                        <td>
                                            <button
                                                className={`payment-status-btn ${paid ? 'status-paid' : 'status-unpaid'}`}
                                                onClick={() => handleTogglePaid(o)}
                                            >
                                                {paid ? <><CheckCircle size={13} /> Paid</> : <><Clock size={13} /> Unpaid</>}
                                            </button>
                                        </td>
                                        <td>{new Date(o.$createdAt).toLocaleDateString()}</td>
                                        <td className="actions">
                                            <button type="button" title="Edit" className="btn-icon" onClick={() => openEdit(o)}><Edit size={16} /></button>
                                            <button type="button" title="Delete" className="btn-icon danger" onClick={() => handleDelete(o.$id)}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredOrders.length === 0 && (
                                <tr><td colSpan={8} className="empty">No orders yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== ORDER MODAL (same as before, no changes needed) ===== */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Order' : 'New Order'}</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label><User size={14} /> Client *</label>
                                <select title='Select' required value={client} onChange={(e) => setClient(e.target.value)}>
                                    <option value="">Select client...</option>
                                    {customers.map((c) => {
                                        const dep = parseFloat(c.deposite || '0');
                                        return (
                                            <option key={c.$id} value={c.name}>
                                                {c.name} ({c.phone}){dep > 0 ? ` — 💰 ${dep.toFixed(2)} EGP` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {selectedCustomer && customerDeposite > 0 && (
                                <div className="deposite-banner">
                                    <div className="deposite-banner-info">
                                        <Wallet size={18} />
                                        <div>
                                            <strong>{selectedCustomer.name}</strong> has deposit
                                            <span className="deposite-amount"> {customerDeposite.toFixed(2)} EGP</span>
                                        </div>
                                    </div>
                                    <label className="deposite-toggle">
                                        <input type="checkbox" checked={useDeposite} onChange={(e) => setUseDeposite(e.target.checked)} />
                                        <span>Use deposit</span>
                                    </label>
                                </div>
                            )}

                            {selectedCustomer && customerDeposite === 0 && (
                                <div className="deposite-banner no-deposite">
                                    <Wallet size={16} /><span><strong>{selectedCustomer.name}</strong> has no deposit</span>
                                </div>
                            )}

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
                                            <div key={p.$id} className={`product-select-item ${selected ? 'selected' : ''} ${outOfStock ? 'out-of-stock' : ''}`}>
                                                <div className="product-select-check" onClick={() => !outOfStock && toggleProduct(p.$id)}>
                                                    {selected && <Check size={16} />}
                                                </div>
                                                <div className="product-select-info" onClick={() => !outOfStock && !selected && toggleProduct(p.$id)}>
                                                    <span className="product-select-name">
                                                        {p.name}
                                                        {soldPc === 0 && <span className="no-sold-badge">No sold price</span>}
                                                        {outOfStock && <span className="out-of-stock-badge">Out of stock</span>}
                                                    </span>
                                                    <span className="product-select-details">
                                                        {soldPc > 0 ? <>Sold: <strong>{soldPc.toFixed(2)}</strong> EGP/pc</> : <>Cost: {costPc.toFixed(2)} EGP/pc</>}
                                                    </span>
                                                    <span className={`product-select-stock ${outOfStock ? 'stock-zero' : ''}`}>
                                                        Available: <strong>{available}</strong>
                                                    </span>
                                                </div>
                                                {selected && !outOfStock && (
                                                    <div className="qty-picker">
                                                        <button title="Decrease quantity" type="button" className="qty-btn" onClick={() => updateQty(p.$id, qty - 1)} disabled={qty <= 1}><Minus size={14} /></button>
                                                        <input title="Quantity" type="number" className="qty-input" value={qty} min={1} max={available} onChange={(e) => updateQty(p.$id, parseInt(e.target.value) || 1)} />
                                                        <button title="Increase quantity" type="button" className="qty-btn" onClick={() => updateQty(p.$id, qty + 1)} disabled={qty >= available}><PlusIcon size={14} /></button>
                                                        <span className="qty-max">/ {available}</span>
                                                    </div>
                                                )}
                                                {selected && (
                                                    <div className="product-select-subtotal">{(displayPrice * qty).toFixed(2)}<small> EGP</small></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

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
                                                    <span className="breakdown-product-name">{product.name}<span className="breakdown-qty">×{sp.qty}</span></span>
                                                    <span className="breakdown-unit-price">{displayPrice.toFixed(2)} EGP/pc {soldPc > 0 ? '(sold)' : '(cost)'}</span>
                                                </div>
                                                <div className="breakdown-item-total">{(displayPrice * sp.qty).toFixed(2)} EGP</div>
                                            </div>
                                        );
                                    })}
                                    <div className="order-breakdown-totals">
                                        <div className="breakdown-total-row"><span>Subtotal:</span><span>{orderTotal.toFixed(2)} EGP</span></div>
                                        {depositeToUse > 0 && (
                                            <div className="breakdown-total-row deposite-deduction">
                                                <span><Wallet size={14} /> Deposit:</span><span>−{depositeToUse.toFixed(2)} EGP</span>
                                            </div>
                                        )}
                                        <div className="breakdown-total-row sold-total final-total">
                                            <span>Amount to Pay:</span><strong>{amountAfterDeposite.toFixed(2)} EGP</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={selectedProducts.length === 0 || !client || submitting}>
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