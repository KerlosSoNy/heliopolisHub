import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ShoppingCart, User, Package, DollarSign,
    TrendingUp, Wallet, CheckCircle,
    Clock, Phone, Calendar,
    Tag,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { useCollection } from '../hooks/useCollection';
import type { Order, Customer, Product } from '../types';
import { useState, useCallback, useRef } from 'react';
import { Printer } from 'lucide-react';
import logo from '../../public/logo.png';

export default function OrderDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [, setShowInvoice] = useState(false);

    const handlePrint = () => {
        setShowInvoice(true);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const { data: orders, loading: loadingOrders, error } = useCollection<Order>({
        fetchFn: useCallback(() => orderService.listAll(), []),
    });

    const { data: customers, loading: loadingCustomers } = useCollection<Customer>({
        fetchFn: useCallback(() => customerService.listAll(), []),
    });

    const { data: products, loading: loadingProducts } = useCollection<Product>({
        fetchFn: useCallback(() => productService.listAll(), []),
    });

    const loading = loadingOrders || loadingCustomers || loadingProducts;
    const order = orders.find((o) => o.$id === id);

    const getProduct = (productId: string): Product | undefined =>
        products.find((p) => p.$id === productId);

    const getCustomer = (clientName: string): Customer | undefined =>
        customers.find((c) => c.name === clientName);

    const calcProductProfit = (product: Product) => {
        const priceEgp = (parseFloat(product.price_chi) || 0) * (parseFloat(product.rate) || 0);
        const totalOrder = parseFloat(product.total_order || '0');
        const totalShipping = parseFloat(product.total_shipping || '0');

        let shippingPerPiece = 0;
        if (totalOrder > 0 && totalShipping > 0) {
            shippingPerPiece = (priceEgp / totalOrder) * totalShipping;
        }

        const totalCostPerPiece = priceEgp + shippingPerPiece;
        const soldPrice = parseFloat(product.sold_price || '0');
        const profitPerPiece = soldPrice > 0 ? soldPrice - totalCostPerPiece : 0;

        return {
            priceEgp,
            shippingPerPiece,
            totalCostPerPiece,
            soldPrice,
            profitPerPiece,
            hasRevenue: soldPrice > 0,
        };
    };

    if (loading) return <div className="loading">Loading order details...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (!order) return (
        <div className="page">
            <div className="error">
                Order not found.
                <button className="btn btn-primary" style={{ marginLeft: 12 }} onClick={() => navigate('/orders')}>
                    <ArrowLeft size={14} /> Back to Orders
                </button>
            </div>
        </div>
    );

    const customer = getCustomer(order.client);
    const paid = order.is_paid === 'yes';
    const depUsed = parseFloat(order.deposite || '0');
    const customerOriginalDeposite = parseFloat(order.customer_deposite || '0');
    const totalPrice = parseFloat(order.price_egp || '0');
    const orderProducts = (order.products || []).map((pid) => getProduct(pid)).filter(Boolean) as Product[];

    let orderTotalCost = 0;
    let orderTotalRevenue = 0;
    let orderTotalProfit = 0;

    const orderQuantities = order.quantities || [];

    const productRows = orderProducts.map((product) => {
        const calc = calcProductProfit(product);
        const productIndex = (order.products || []).indexOf(product.$id);
        const qty = productIndex >= 0
            ? (parseInt(orderQuantities[productIndex] || '1') || 1)
            : 1;

        const totalCost = calc.totalCostPerPiece * qty;
        const totalRevenue = calc.soldPrice * qty;
        const totalProfit = calc.profitPerPiece * qty;

        orderTotalCost += totalCost;
        orderTotalRevenue += totalRevenue;
        orderTotalProfit += totalProfit;

        return { product, calc, qty, totalCost, totalRevenue, totalProfit };
    });

    const orderProfit = orderTotalProfit;

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className='flex flex-row items-center gap-2'>
                    <button className="btn-icon" onClick={() => navigate('/orders')} title="Back">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className='flex flex-row items-center gap-2'><ShoppingCart size={24} /> Order #{order.$id.slice(0, 8)}</h1>
                    <div className={`payment-badge my-auto! ${paid ? 'payment-paid' : 'payment-unpaid'}`}>
                        {paid ? <><CheckCircle size={14} /> Paid</> : <><Clock size={14} /> Unpaid</>}
                    </div>
                </div>
                <div className="customer-meta flex! flex-row items-center text-black! gap-2">
                    <button
                        className="flex items-center gap-2 px-4 py-2 text-black rounded-lg transition-colors text-sm font-semibold"
                        onClick={handlePrint}
                    >
                        <Printer size={16} /> Print Invoice
                    </button>
                    <div className='w-px h-4 bg-black' />
                    <Calendar size={14} /> {new Date(order.$createdAt).toLocaleDateString()}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><User size={24} /></div>
                    <div>
                        <p className="stat-label">Client</p>
                        <p className="stat-value">{order.client}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><Package size={24} /></div>
                    <div>
                        <p className="stat-label">Products</p>
                        <p className="stat-value">{orderProducts.length} items</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className={`stat-icon ${paid ? 'green' : 'red'}`}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="stat-label">Amount {paid ? 'Paid' : 'To Pay'}</p>
                        <p className={`stat-value ${paid ? 'text-green' : 'text-danger'}`}>
                            {totalPrice.toFixed(2)} EGP
                        </p>
                    </div>
                </div>
                {depUsed > 0 && (
                    <div className="stat-card">
                        <div className="stat-icon blue"><Wallet size={24} /></div>
                        <div>
                            <p className="stat-label">Deposit Used</p>
                            <p className="stat-value text-blue">
                                {depUsed.toFixed(2)} / {customerOriginalDeposite.toFixed(2)} EGP
                            </p>
                        </div>
                    </div>
                )}
                {orderTotalRevenue > 0 && (
                    <div className="stat-card">
                        <div className={`stat-icon ${orderTotalProfit >= 0 ? 'green' : 'red'}`}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Order Profit</p>
                            <p className={`stat-value ${orderTotalProfit >= 0 ? 'text-green' : 'text-danger'}`}>
                                {orderTotalProfit.toFixed(2)} EGP
                            </p>
                        </div>
                    </div>
                )}
                {parseFloat(order.discount || '0') > 0 && (
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
                            <Tag size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Discount Applied</p>
                            <p className="stat-value" style={{ color: '#f97316' }}>
                                −{parseFloat(order.discount || '0').toFixed(2)} EGP
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {/* Client Info Card */}
            {customer && (
                <div className="card mt-4">
                    <h2 className='flex flex-row items-center gap-2'><User size={18} /> Client Information</h2>
                    <div className="client-info-grid">
                        <div className="client-info-item">
                            <User size={16} />
                            <div>
                                <p className="client-info-label">Name</p>
                                <p className="client-info-value text-black!">{customer.name}</p>
                            </div>
                        </div>
                        <div className="client-info-item">
                            <Phone size={16} />
                            <div>
                                <p className="client-info-label">Phone</p>
                                <p className="client-info-value text-black!">{customer.phone}</p>
                            </div>
                        </div>
                        <div className="client-info-item">
                            <Wallet size={16} />
                            <div>
                                <p className="client-info-label">Current Deposit</p>
                                <p className="client-info-value text-black!">
                                    {parseFloat(customer.deposite || '0').toFixed(2)} EGP
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Deposit Breakdown Card */}
            {depUsed > 0 && (
                <div className="card mt-4">
                    <h2 className='flex flex-row items-center gap-2'><Wallet size={18} /> Deposit Breakdown</h2>
                    <div className="profit-preview-box">
                        <div className="profit-preview-row">
                            <span>Customer Deposit at Order Time:</span>
                            <span>{customerOriginalDeposite.toFixed(2)} EGP</span>
                        </div>
                        <div className="profit-preview-row" style={{ color: '#60a5fa' }}>
                            <span><Wallet size={12} /> Amount Used in This Order:</span>
                            <strong>{depUsed.toFixed(2)} EGP</strong>
                        </div>
                        <div className="profit-preview-row">
                            <span>Remaining After This Order:</span>
                            <span>{(customerOriginalDeposite - depUsed).toFixed(2)} EGP</span>
                        </div>
                        {customerOriginalDeposite > 0 && (
                            <div className="profit-preview-row">
                                <span>% of Deposit Used:</span>
                                <span style={{ color: '#60a5fa' }}>
                                    {((depUsed / customerOriginalDeposite) * 100).toFixed(1)}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Order Description */}
            {order.product && (
                <div className="card mt-4">
                    <h2><ShoppingCart size={18} /> Order Description</h2>
                    <p className="order-description-text">{order.product}</p>
                </div>
            )}

            {/* Products Table */}
            <div className="card mt-4">
                <h2 className='flex flex-row items-center gap-2'><Package size={18} /> Products in this Order</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>CNY</th>
                                <th>Rate</th>
                                <th>Cost/pc (EGP)</th>
                                <th>Ship/pc</th>
                                <th>Total Cost/pc</th>
                                <th>Sold/pc</th>
                                <th>Profit/pc</th>
                                <th>Total Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productRows.map(({ product, calc, qty, totalProfit }, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="table-avatar-product"><Package size={16} /></div>
                                            <span>{product.name}</span>
                                        </div>
                                    </td>
                                    <td><strong>{qty}</strong></td>
                                    <td>{product.price_chi} ¥</td>
                                    <td>{product.rate}</td>
                                    <td>{calc.priceEgp.toFixed(2)}</td>
                                    <td>
                                        {calc.shippingPerPiece > 0
                                            ? calc.shippingPerPiece.toFixed(2)
                                            : <span className="text-muted">—</span>
                                        }
                                    </td>
                                    <td><strong>{calc.totalCostPerPiece.toFixed(2)}</strong></td>
                                    <td>
                                        {calc.hasRevenue
                                            ? calc.soldPrice.toFixed(2)
                                            : <span className="text-muted">—</span>
                                        }
                                    </td>
                                    <td>
                                        {calc.hasRevenue ? (
                                            <span className={calc.profitPerPiece >= 0 ? 'text-green' : 'text-danger'}>
                                                {calc.profitPerPiece.toFixed(2)}
                                            </span>
                                        ) : <span className="text-muted">—</span>}
                                    </td>
                                    <td>
                                        {calc.hasRevenue ? (
                                            <strong className={totalProfit >= 0 ? 'text-green' : 'text-danger'}>
                                                {totalProfit.toFixed(2)} EGP
                                            </strong>
                                        ) : <span className="text-muted">—</span>}
                                    </td>
                                </tr>
                            ))}
                            {orderProducts.length === 0 && (
                                <tr>
                                    <td colSpan={10}>
                                        <div className="empty-state"><p>No products linked to this order</p></div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {orderProducts.length > 0 && (
                            <tfoot>
                                <tr className="totals-row">
                                    <td><strong>TOTALS</strong></td>
                                    <td><strong>{productRows.reduce((sum, r) => sum + r.qty, 0)}</strong></td>
                                    <td colSpan={4}>—</td>
                                    <td><strong>{orderTotalCost.toFixed(2)}</strong></td>
                                    <td><strong>{orderTotalRevenue.toFixed(2)}</strong></td>
                                    <td>—</td>
                                    <td>
                                        <strong className={orderTotalProfit >= 0 ? 'text-green' : 'text-danger'}>
                                            {orderTotalProfit.toFixed(2)} EGP
                                        </strong>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Payment Summary */}
            <div className="card mt-4">
                <h2 className='flex flex-row items-center gap-2'><DollarSign size={18} /> Payment Summary</h2>
                <div className="profit-preview-box">
                    <div className="profit-preview-row">
                        <span><Package size={12} /> Products Total Cost:</span>
                        <span>{orderTotalCost.toFixed(2)} EGP</span>
                    </div>

                    {orderTotalRevenue > 0 && (
                        <>
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
                            <div className={`profit-preview-row profit-preview-total ${orderTotalProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                                <span><TrendingUp size={12} /> Order Profit:</span>
                                <strong>{orderTotalProfit.toFixed(2)} EGP</strong>
                            </div>
                            <div className="profit-preview-row">
                                <span>Profit Margin:</span>
                                <span className={orderTotalProfit >= 0 ? 'text-green' : 'text-danger'}>
                                    {orderTotalCost > 0 ? ((orderTotalProfit / orderTotalCost) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </>
                    )}

                    <div className="profit-preview-row profit-preview-total">
                        <span><strong>Order Amount:</strong></span>
                        <strong>{(totalPrice + depUsed + Math.abs(+(order?.discount || '0') || 0)).toFixed(2)} EGP</strong>
                    </div>

                    {order?.discount && (
                        <>
                            <div className="profit-preview-row" style={{ color: 'red' }}>
                                <span><Wallet size={12} /> Discount Used:</span>
                                <span>−{order?.discount || '0'}</span>
                            </div>
                        </>
                    )}
                    {depUsed > 0 && (
                        <>
                            <div className="profit-preview-row" style={{ color: '#60a5fa' }}>
                                <span><Wallet size={12} /> Deposit Used:</span>
                                <span>−{depUsed.toFixed(2)} EGP</span>
                            </div>
                            <div className="profit-preview-row" style={{ color: '#9ca3af', fontSize: '12px' }}>
                                <span>({depUsed.toFixed(2)} of {customerOriginalDeposite.toFixed(2)} deposit balance)</span>
                                <span>{((depUsed / customerOriginalDeposite) * 100).toFixed(1)}% used</span>
                            </div>
                        </>
                    )}

                    <div className={`profit-preview-row profit-preview-total ${paid ? 'profit-positive' : 'profit-negative'}`}>
                        <span>{paid ? '✅ Amount Paid:' : '⏳ Amount To Pay:'}</span>
                        <strong>{totalPrice.toFixed(2)} EGP</strong>
                    </div>

                    {orderTotalRevenue > 0 && (
                        <>
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
                            <div className={`profit-preview-row profit-preview-total ${orderProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                                <span><TrendingUp size={12} /> Order Profit:</span>
                                <strong>{orderProfit.toFixed(2)} EGP</strong>
                            </div>
                            <div className="profit-preview-row">
                                <span>Profit Margin:</span>
                                <span className={orderProfit >= 0 ? 'text-green' : 'text-danger'}>
                                    {orderTotalCost > 0 ? ((orderProfit / orderTotalCost) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </>
                    )}

                </div>
            </div>

            {/* ========== PRINTABLE INVOICE ========== */}
            <div
                ref={invoiceRef}
                className="bg-white hidden print:block text-black p-8 min-h-screen"
            >
                {/* Invoice Header */}
                <div className="flex items-start justify-between border-b border-black pb-4! mb-6">
                    <img src={logo} alt="Heliopolis Hub" className="w-45 mx-auto!" />
                    <h1 className="text-3xl font-black tracking-tight -mt-5!">INVOICE</h1>
                    <div className='flex! flex-row justify-between w-full'>
                        <div className='w-fit'>
                            <p className="text-sm text-gray-500 mt-1">Heliopolis Hub</p>
                            <p className="text-sm text-gray-500">kerlosssony@email.com</p>
                            <p className="text-sm text-gray-500">+20 101 908 5973</p>
                        </div>
                        <div className="text-right w-fit">
                            <div className="text-sm text-gray-500">Invoice No.</div>
                            <div className="text-lg font-bold">#{order.$id.slice(0, 8).toUpperCase()}</div>
                            <div className="text-sm text-gray-500 mt-2">Date</div>
                            <div className="text-sm font-semibold">
                                {new Date(order.$createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bill To */}
                <div className="mt-2! flex! items-center flex-row w-full justify-between">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Bill To
                    </div>
                    <div>
                        <div className="text-lg font-bold">{order.client}</div>
                        {customer && (
                            <div className="text-sm text-gray-600 text-right">{customer.phone}</div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8 mt-2!">
                    <thead>
                        <tr className="border-b-2 border-gray-300">
                            <th className="text-left py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Item
                            </th>
                            <th className="text-center py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Qty
                            </th>
                            <th className="text-right! py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Unit Price
                            </th>
                            <th className="text-right! py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {productRows.map(({ product, calc, qty }, idx) => {
                            const unitPrice = calc.hasRevenue ? calc.soldPrice : calc.totalCostPerPiece;
                            const lineTotal = unitPrice * qty;

                            return (
                                <tr key={idx} className="border-b border-gray-200">
                                    <td className="py-3">
                                        <div className="font-semibold text-sm">{product.name}</div>
                                    </td>
                                    <td className="py-3 text-center text-sm">{qty}</td>
                                    <td className="py-3 text-right text-sm">{unitPrice.toFixed(2)} EGP</td>
                                    <td className="py-3 text-right text-sm font-semibold">
                                        {lineTotal.toFixed(2)} EGP
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex flex-row justify-start">
                    <div className="full flex! flex-row! justify-between items-center w-full">
                        {/* Subtotal */}
                        <div className="flex justify-between flex-col items-center py-2 text-sm mt-4! w-fit">
                            <span className="text-gray-500 text-center">Subtotal</span>
                            <span>{(totalPrice + depUsed + Math.abs(+(order?.discount || '0') || 0)).toFixed(2)} EGP</span>
                        </div>
                        {parseFloat(order.discount || '0') > 0 && (
                            <div className="flex justify-between mt-4! text-center! py-2 flex-col items-center text-sm w-fit">
                                <span style={{ color: '#f97316' }}>Discount</span>
                                <span style={{ color: '#f97316' }}>−{parseFloat(order.discount || '0').toFixed(2)} EGP</span>
                            </div>
                        )}
                        {/* Deposit */}
                        {depUsed > 0 && (
                            <div className="flex justify-between mt-4! text-center! py-2 flex-col items-center text-sm w-fit">
                                <span>Deposit Applied</span>
                                <span>−{depUsed.toFixed(2)} EGP</span>
                                <span className="text-xs text-gray-400">
                                    ({depUsed.toFixed(2)} of {customerOriginalDeposite.toFixed(2)} balance)
                                </span>
                            </div>
                        )}

                        {/* Amount Due */}
                        <div className="flex justify-between flex-col items-center py-2 text-sm mt-4! w-fit">
                            <span className="text-gray-500 text-center">
                                {paid ? 'Amount Paid' : 'Amount Due'}
                            </span>
                            <span className="font-bold text-base">{totalPrice.toFixed(2)} EGP</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16! pt-6">
                    <div className="text-center">
                        <p className="text-sm text-gray-500">Thank you!</p>
                        <p className="text-xs text-gray-400 mt-1">
                            This invoice was generated on {new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}