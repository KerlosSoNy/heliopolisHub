import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Eye,
    Trash2,
    Plus,
    ShoppingCart,
    User,
    Check,
    Clock,
    Search,
} from 'lucide-react';
import { customerOrderService, type ProductData } from '../services/customerOrderService';
import { useCollection } from '../hooks/useCollection';
import type { Order } from '../types';

export default function CustomerOrders() {
    const navigate = useNavigate();
    const { data: orders, loading, error, refetch } = useCollection<Order>({
        fetchFn: useCallback(() => customerOrderService.listAll(), []),
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');

    // Filter orders
    const filteredOrders = orders.filter((order) => {
        const matchesSearch =
            order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.product.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'paid' && order.is_paid === 'yes') ||
            (filterStatus === 'unpaid' && order.is_paid !== 'yes');

        return matchesSearch && matchesStatus;
    });

    // Delete order
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this order?')) return;
        try {
            await customerOrderService.remove(id);
            refetch();
        } catch (err) {
            console.error(err);
            alert('Error deleting order');
        }
    };

    // Mark as paid
    const handleMarkPaid = async (id: string) => {
        try {
            await customerOrderService.markAsPaid(id);
            refetch();
        } catch (err) {
            console.error(err);
            alert('Error updating order');
        }
    };

    if (loading) return <div className="loading">Loading orders...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Customer Orders ({orders.length})</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/orders/create')}
                    title="Create Order"
                >
                    <Plus size={16} /> Create Order
                </button>
            </div>

            {/* ===== SEARCH & FILTER ===== */}
            <div className="card search-filter-section">
                <div className="search-group">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by customer name or product..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <button
                        className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        All Orders
                    </button>
                    <button
                        className={`filter-btn ${filterStatus === 'paid' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('paid')}
                    >
                        <Check size={14} /> Paid
                    </button>
                    <button
                        className={`filter-btn ${filterStatus === 'unpaid' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('unpaid')}
                    >
                        <Clock size={14} /> Unpaid
                    </button>
                </div>
            </div>

            {/* ===== ORDERS TABLE ===== */}
            {filteredOrders.length === 0 ? (
                <div className="empty-state card">
                    <ShoppingCart size={48} />
                    <h2>No orders found</h2>
                    <p>Start by creating a new order</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/orders/create')}
                    >
                        <Plus size={16} /> Create Order
                    </button>
                </div>
            ) : (
                <div className="card">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Products</th>
                                <th>Total Amount</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order) => {
                                const productCount = (() => {
                                    try {
                                        const products = JSON.parse(order.products as unknown as string) as ProductData[];
                                        return products.length;
                                    } catch {
                                        return 0;
                                    }
                                })();

                                return (
                                    <tr key={order.$id}>
                                        <td>
                                            <span className="order-id">#{order.$id.slice(-6)}</span>
                                        </td>
                                        <td>
                                            <div className="customer-cell">
                                                <User size={14} />
                                                {order.client}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="product-count">
                                                {productCount} {productCount === 1 ? 'item' : 'items'}
                                            </span>
                                        </td>
                                        <td>
                                            <strong className="amount-green">
                                                {parseFloat(order.price_egp || '0').toFixed(2)} EGP
                                            </strong>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    order.is_paid === 'yes'
                                                        ? 'badge badge-paid'
                                                        : 'badge badge-unpaid'
                                                }
                                            >
                                                {order.is_paid === 'yes' ? (
                                                    <>
                                                        <Check size={12} /> Paid
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock size={12} /> Unpaid
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="text-muted">
                                            {new Date(order.$createdAt).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    type="button"
                                                    className="btn-icon"
                                                    onClick={() => navigate(`/orders/${order.$id}`)}
                                                    title="View order"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                {order.is_paid !== 'yes' && (
                                                    <button
                                                        type="button"
                                                        className="btn-icon success"
                                                        onClick={() => handleMarkPaid(order.$id)}
                                                        title="Mark as paid"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="btn-icon danger"
                                                    onClick={() => handleDelete(order.$id)}
                                                    title="Delete order"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}