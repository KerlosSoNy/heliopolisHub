import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { customerOrderService, type ProductData } from '../services/customerOrderService';
import type { Order } from '../types';
import { Wallet, Package, Percent } from 'lucide-react';

export default function OrderDetail() {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [products, setProducts] = useState<ProductData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) return;
            try {
                const fetchedOrder = await customerOrderService.get(id);
                setOrder(fetchedOrder);

                // Parse products from JSON string
                const parsedProducts = customerOrderService.parseProducts(fetchedOrder.products as unknown as string);
                setProducts(parsedProducts);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id]);

    if (loading) return <div className="loading">Loading order...</div>;
    if (!order) return <div className="error">Order not found</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Order Details</h1>
            </div>

            <div className="card">
                {/* Order Header */}
                <div className="order-header">
                    <div>
                        <h2>{order.client}</h2>
                        <p className="text-muted">Order #{order.$id.slice(-6)}</p>
                    </div>
                    <div className="order-status">
                        <span className={order.is_paid === 'yes' ? 'badge-paid' : 'badge-unpaid'}>
                            {order.is_paid === 'yes' ? 'PAID' : 'UNPAID'}
                        </span>
                    </div>
                </div>

                {/* Products */}
                <div className="section">
                    <h3><Package size={18} /> Products</h3>
                    <table className="products-table">
                        <thead>
                            <tr>
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
                                const total = qty * price;

                                return (
                                    <tr key={idx}>
                                        <td>{product.name}</td>
                                        <td>{price.toFixed(2)} EGP</td>
                                        <td>{qty}</td>
                                        <td className="text-green">{total.toFixed(2)} EGP</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Order Summary */}
                <div className="section order-summary">
                    <h3><Wallet size={18} /> Order Summary</h3>

                    <div className="summary-rows">
                        <div className="summary-row">
                            <span>Subtotal:</span>
                            <strong>{parseFloat(order.price_egp || '0').toFixed(2)} EGP</strong>
                        </div>

                        {order.discount && parseFloat(order.discount) > 0 && (
                            <div className="summary-row text-danger">
                                <span>
                                    <Percent size={14} /> Discount ({order.discount_type}):
                                </span>
                                <strong>
                                    {order.discount_type === 'percentage'
                                        ? `-${((parseFloat(order.price_egp || '0') * parseFloat(order.discount)) / 100).toFixed(2)}`
                                        : `-${order.discount}`}{' '}
                                    EGP
                                </strong>
                            </div>
                        )}

                        <div className="summary-row summary-total">
                            <span>Total:</span>
                            <strong className="text-green">{parseFloat(order.price_egp || '0').toFixed(2)} EGP</strong>
                        </div>
                    </div>
                </div>

                {/* Order Meta */}
                <div className="section">
                    <div className="meta-info">
                        <p>
                            <strong>Created:</strong> {new Date(order.$createdAt).toLocaleDateString()}
                        </p>
                        <p>
                            <strong>Status:</strong> {order.is_paid === 'yes' ? '✓ Paid' : '✗ Unpaid'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}