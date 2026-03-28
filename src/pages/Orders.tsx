import { useState, useCallback, useEffect } from 'react';
import {
    Trash2, Edit, Plus, X, ShoppingCart, User,
    Package, DollarSign, Truck,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { useCollection } from '../hooks/useCollection';
import type { Customer, Order, OrderForm, Product } from '../types';

const emptyForm: OrderForm = {
    product: '',
    price_egp: '',
    client: '',
    total_shipping: '',
    total_order: '',
};

export default function Orders() {
    const { data: orders, loading, error, refetch } = useCollection<Order>({
        fetchFn: useCallback(() => orderService.list(), []),
    });

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<OrderForm>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        customerService.list(100).then(setCustomers).catch(console.error);
        productService.list(100).then(setProducts).catch(console.error);
    }, []);

    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (order: Order) => {
        setForm({
            product: order.product,
            price_egp: order.price_egp,
            client: order.client,
            total_shipping: order.total_shipping || '',
            total_order: order.total_order || '',
        });
        setEditingId(order.$id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await orderService.update(editingId, form);
            } else {
                await orderService.create(form);
            }
            setShowModal(false);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this order?')) return;
        await orderService.remove(id);
        refetch();
    };

    // Auto-fill price when product is selected
    const handleProductSelect = (productName: string) => {
        const product = products.find((p) => p.name === productName);
        if (product) {
            const price = parseFloat(product.price_chi) * parseFloat(product.rate);
            setForm({
                ...form,
                product: productName,
                price_egp: isNaN(price) ? '' : price.toFixed(2),
            });
        } else {
            setForm({ ...form, product: productName });
        }
    };

    // Calculate shipping per piece for display
    const calcShippingPerPiece = (order: Order): string => {
        const totalShipping = parseFloat(order.total_shipping || '0');
        const totalOrder = parseFloat(order.total_order || '0');
        const priceEgp = parseFloat(order.price_egp || '0');
        if (totalOrder === 0 || totalShipping === 0) return '—';
        return ((priceEgp / totalOrder) * totalShipping).toFixed(2);
    };

    const filteredOrders = orders.filter(
        (o) =>
            o.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.product.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalRevenue = orders.reduce(
        (sum, o) => sum + (parseFloat(o.price_egp) || 0), 0
    );
    const totalShippingAll = orders.reduce(
        // @ts-expect-error type missing
        (sum, o) => sum + (parseFloat(o.total_shipping) || 0), 0
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
                <div className="summary-item">
                    <Truck size={18} />
                    <span>Total Shipping: <strong>{totalShippingAll.toFixed(2)} EGP</strong></span>
                </div>
            </div>

            {/* Order Cards */}
            <div className="order-grid">
                {filteredOrders.map((o) => (
                    <div key={o.$id} className="order-card">
                        <div className="order-card-header">
                            <div className="order-id">#{o.$id.slice(0, 8)}</div>
                            <div className="customer-card-actions">
                                <button
                                    title='Edit Order'
                                    type='button'
                                    className="btn-icon" onClick={() => openEdit(o)}>
                                    <Edit size={15} />
                                </button>
                                <button
                                    title='Delete Order'
                                    type='button'
                                    className="btn-icon danger" onClick={() => handleDelete(o.$id)}>
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>

                        <div className="order-details">
                            <div className="order-detail">
                                <User size={14} />
                                <span>{o.client}</span>
                            </div>
                            <div className="order-detail">
                                <Package size={14} />
                                <span>{o.product}</span>
                            </div>
                            <div className="order-detail">
                                <DollarSign size={14} />
                                <span className="order-price">{o.price_egp} EGP</span>
                            </div>
                            {o.total_shipping && (
                                <>
                                    <div className="order-detail">
                                        <Truck size={14} />
                                        <span>Total Shipping: {o.total_shipping} EGP</span>
                                    </div>
                                    <div className="order-detail">
                                        <Truck size={14} />
                                        <span>Shipping/piece: {calcShippingPerPiece(o)} EGP</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="customer-meta">
                            {new Date(o.$createdAt).toLocaleDateString()}
                        </div>
                    </div>
                ))}
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
                                <th>Product</th>
                                <th>Price (EGP)</th>
                                <th>Total Order</th>
                                <th>Total Shipping</th>
                                <th>Shipping/Piece</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((o) => (
                                <tr key={o.$id}>
                                    <td>#{o.$id.slice(0, 8)}</td>
                                    <td>{o.client}</td>
                                    <td>{o.product}</td>
                                    <td><strong>{o.price_egp} EGP</strong></td>
                                    <td>{o.total_order || '—'}</td>
                                    <td>{o.total_shipping || '—'}</td>
                                    <td><strong>{calcShippingPerPiece(o)}</strong></td>
                                    <td>{new Date(o.$createdAt).toLocaleDateString()}</td>
                                    <td className="actions">
                                        <button type="button" title="Edit Order" className="btn-icon" onClick={() => openEdit(o)}><Edit size={16} /></button>
                                        <button type="button" title="Delete Order" className="btn-icon danger" onClick={() => handleDelete(o.$id)}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredOrders.length === 0 && (
                                <tr><td colSpan={9} className="empty">No orders yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Order' : 'New Order'}</h2>
                            <button type="button" title='Close' className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {/* Client */}
                            <div className="form-group">
                                <label><User size={14} /> Client *</label>
                                <select
                                    title='Select'
                                    required
                                    value={form.client}
                                    onChange={(e) => setForm({ ...form, client: e.target.value })}
                                >
                                    <option value="">Select client...</option>
                                    {customers.map((c) => (
                                        <option key={c.$id} value={c.name}>
                                            {c.name} ({c.phone})
                                        </option>
                                    ))}
                                </select>
                                <input
                                    style={{ marginTop: 8 }}
                                    placeholder="Or type client name..."
                                    value={form.client}
                                    onChange={(e) => setForm({ ...form, client: e.target.value })}
                                />
                            </div>

                            {/* Product */}
                            <div className="form-group">
                                <label><Package size={14} /> Product *</label>
                                <select
                                    title='Select'
                                    required
                                    value={form.product}
                                    onChange={(e) => handleProductSelect(e.target.value)}
                                >
                                    <option value="">Select product...</option>
                                    {products.map((p) => (
                                        <option key={p.$id} value={p.name}>
                                            {p.name} (¥{p.price_chi} × {p.rate})
                                        </option>
                                    ))}
                                </select>
                                <input
                                    style={{ marginTop: 8 }}
                                    placeholder="Or type product name..."
                                    value={form.product}
                                    onChange={(e) => setForm({ ...form, product: e.target.value })}
                                />
                            </div>

                            {/* Price EGP */}
                            <div className="form-group">
                                <label><DollarSign size={14} /> Price (EGP) *</label>
                                <input
                                    required
                                    placeholder="Price in Egyptian Pounds"
                                    value={form.price_egp}
                                    onChange={(e) => setForm({ ...form, price_egp: e.target.value })}
                                />
                            </div>

                            <div className="form-divider">
                                <span>Shipping Info</span>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label><DollarSign size={14} /> Total Order Price</label>
                                    <input
                                        placeholder="Total price of all items"
                                        value={form.total_order}
                                        onChange={(e) => setForm({ ...form, total_order: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label><Truck size={14} /> Total Shipping Cost</label>
                                    <input
                                        placeholder="Total shipping for order"
                                        value={form.total_shipping}
                                        onChange={(e) => setForm({ ...form, total_shipping: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Live Shipping Calculation */}
                            {form.price_egp && form.total_order && form.total_shipping && (
                                <div className="calc-preview">
                                    <span><Truck size={14} /> Shipping per piece:</span>
                                    <strong>
                                        {(
                                            (parseFloat(form.price_egp) / parseFloat(form.total_order)) *
                                            parseFloat(form.total_shipping)
                                        ).toFixed(2)}{' '}
                                        EGP
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