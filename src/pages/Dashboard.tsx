import { useState, useEffect } from 'react';
import { Users, Package, ShoppingCart, DollarSign } from 'lucide-react';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import type { Order } from '../types';

interface Stats {
    customers: number;
    products: number;
    orders: number;
    totalRevenue: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats>({
        customers: 0,
        products: 0,
        orders: 0,
        totalRevenue: 0,
    });
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const [customers, products, orders, orderList] = await Promise.all([
                    customerService.count(),
                    productService.count(),
                    orderService.count(),
                    orderService.list(5),
                ]);

                const totalRevenue = orderList.reduce(
                    (sum, order) => sum + (parseFloat(order.price_egp) || 0),
                    0
                );

                setStats({ customers, products, orders, totalRevenue });
                setRecentOrders(orderList);
            } catch (err) {
                console.error('Failed to load stats:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) return <div className="loading">Loading dashboard...</div>;

    return (
        <div className="page">
            <h1>Dashboard Overview</h1>

            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><Users size={24} /></div>
                    <div>
                        <p className="stat-label">Customers</p>
                        <p className="stat-value">{stats.customers}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><Package size={24} /></div>
                    <div>
                        <p className="stat-label">Products</p>
                        <p className="stat-value">{stats.products}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><ShoppingCart size={24} /></div>
                    <div>
                        <p className="stat-label">Orders</p>
                        <p className="stat-value">{stats.orders}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Revenue (EGP)</p>
                        <p className="stat-value">{stats.totalRevenue.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="card">
                <h2>Recent Orders</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Client</th>
                            <th>Product</th>
                            <th>Price (EGP)</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentOrders.map((order) => (
                            <tr key={order.$id}>
                                <td>{order.$id.slice(0, 8)}...</td>
                                <td>{order.client}</td>
                                <td>{order.product}</td>
                                <td>{order.price_egp} EGP</td>
                                <td>{new Date(order.$createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {recentOrders.length === 0 && (
                            <tr><td colSpan={5} className="empty">No orders yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}