import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Package, Percent, User, Calendar, Edit } from 'lucide-react';
import { customerOrderService, type ProductData } from '../services/customerOrderService';
import type { Order } from '../types';

export default function OrderDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [products, setProducts] = useState<ProductData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) {
                setError('No order ID provided');
                setLoading(false);
                return;
            }

            try {
                console.log('Fetching order with ID:', id);
                const fetchedOrder = await customerOrderService.get(id);
                console.log('Order fetched:', fetchedOrder);

                setOrder(fetchedOrder);

                // Parse products from JSON string
                if (fetchedOrder.products) {
                    try {
                        const parsedProducts = customerOrderService.parseProducts(
                            fetchedOrder.products as unknown as string
                        );
                        console.log('Parsed products:', parsedProducts);
                        setProducts(parsedProducts);
                    } catch (parseErr) {
                        console.error('Error parsing products:', parseErr);
                        setProducts([]);
                    }
                }
            } catch (err) {
                console.error('Error fetching order:', err);
                setError('Order not found or error loading order');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id]);

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading order details...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="page">
                <div className="error-container">
                    <h2>❌ {error || 'Order not found'}</h2>
                    <p>The order you're looking for doesn't exist or couldn't be loaded.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/customer-orders')}>
                        <ArrowLeft size={16} /> Back to Orders
                    </button>
                </div>
            </div>
        );
    }

    const calculateOrderTotals = () => {
        let subtotal = 0;

        products.forEach((p) => {
            const selling = parseFloat(p.sellingPrice || '0');
            const qty = parseFloat(p.quantity || '0');
            subtotal += selling * qty;
        });

        let discount = 0;
        if (order.discount && parseFloat(order.discount) > 0) {
            if (order.discount_type === 'percentage') {
                discount = (subtotal * parseFloat(order.discount)) / 100;
            } else {
                discount = parseFloat(order.discount);
            }
        }

        const total = subtotal - discount;

        return { subtotal, discount, total };
    };

    const { subtotal, discount, total } = calculateOrderTotals();

    return (
        <div className="page">
            <div className="page-header">
                <button
                    className="flex flex-row items-center gap-2 cursor-pointer"
                    onClick={() => navigate('/customer-orders')}
                    title="Back to orders"
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <h1>Order Details</h1>
            </div>

            <div className="card order-detail-container">
                {/* Order Header */}
                <div className="order-header">
                    <div className="header-left">
                        <h2>Order #{order.$id.slice(-6)}</h2>
                        <p className="text-muted">
                            Created on {new Date(order.$createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="header-right">
                        <button
                            className="btn btn-edit"
                            onClick={() => navigate(`/orders/${order.$id}/edit`)}
                            title="Edit order"
                        >
                            <Edit size={16} /> Edit
                        </button>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="section">
                    <h3>
                        <User size={18} /> Customer Information
                    </h3>
                    <div className="customer-info">
                        <div className="info-item">
                            <span className="label">Customer Name:</span>
                            <span className="value">{order.client}</span>
                        </div>
                    </div>
                </div>

                {/* Products */}
                <div className="section">
                    <h3>
                        <Package size={18} /> Products ({products.length})
                    </h3>
                    {products.length === 0 ? (
                        <p className="text-muted">No products in this order</p>
                    ) : (
                        <div className="products-table-wrapper">
                            <table className="products-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Product Name</th>
                                        <th>Price/Unit</th>
                                        <th>Quantity</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product, idx) => {
                                        const qty = parseFloat(product.quantity || '0');
                                        const price = parseFloat(product.sellingPrice || '0');
                                        const lineTotal = qty * price;

                                        return (
                                            <tr key={idx}>
                                                <td className="text-center">{idx + 1}</td>
                                                <td>{product.name}</td>
                                                <td>{price.toFixed(2)} EGP</td>
                                                <td className="text-center">{qty}</td>
                                                <td className="text-green font-bold">
                                                    {lineTotal.toFixed(2)} EGP
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Order Summary */}
                <div className="section">
                    <h3>
                        <Wallet size={18} /> Order Summary
                    </h3>
                    <div className="summary-box">
                        <div className="summary-row">
                            <span>Subtotal:</span>
                            <strong>{subtotal.toFixed(2)} EGP</strong>
                        </div>

                        {discount > 0 && (
                            <div className="summary-row text-danger">
                                <span className="flex! flex-row items-center gap-1">
                                    <Percent size={14} /> Downpayment ({order.discount_type}):
                                </span>
                                <strong>-{discount.toFixed(2)} EGP</strong>
                            </div>
                        )}

                        <div className="summary-row summary-total">
                            <span>Total Amount:</span>
                            <strong className="text-green">{total.toFixed(2)} EGP</strong>
                        </div>
                    </div>
                </div>

                {/* Order Meta */}
                <div className="section">
                    <h3>
                        <Calendar size={18} /> Order Information
                    </h3>
                    <div className="meta-grid">
                        <div className="meta-item">
                            <span className="label">Order ID:</span>
                            <span className="value">{order.$id}</span>
                        </div>
                        <div className="meta-item">
                            <span className="label">Created Date:</span>
                            <span className="value">
                                {new Date(order.$createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="meta-item">
                            <span className="label">Last Updated:</span>
                            <span className="value">
                                {new Date(order.$updatedAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="w-full flex flex-row items-center justify-between">
                            <span className="label">Status:</span>
                            <span
                                className={
                                    order.is_paid === 'yes'
                                        ? 'value badge-paid'
                                        : 'value badge-unpaid'
                                }
                            >
                                {order.is_paid === 'yes' ? 'Paid' : 'Unpaid'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}