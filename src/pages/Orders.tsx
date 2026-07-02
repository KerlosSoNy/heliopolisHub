import { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Trash2, Edit, Plus, X, ShoppingCart, User,
    Package, DollarSign,
    Wallet, CheckCircle,
    CircleDollarSign, Clock,
    Eye, Percent, Tag,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { depositHistoryService } from '../services/depositHistoryService';
import { useCollection } from '../hooks/useCollection';
import type { Order, Customer, Product, SelectedProduct } from '../types';
import { useNavigate } from 'react-router-dom';

interface ManualProduct extends SelectedProduct {
    productName?: string;
    soldPrice?: string;
    costPrice?: string;
}

export default function Orders() {
    const { data: orders, loading, error, refetch } = useCollection<Order>({
        fetchFn: useCallback(() => orderService.listAll(), []),
    });

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [client, setClient] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<ManualProduct[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [useDeposite, setUseDeposite] = useState(false);
    const [depositeAmount, setDepositeAmount] = useState<number>(0);
    const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
    const navigate = useNavigate();

    const [discountValue, setDiscountValue] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');

    const refreshProducts = () => {
        productService.listAll().then(setAllProducts).catch(console.error);
    };

    const refreshCustomers = () => {
        customerService.listAll().then(setCustomers).catch(console.error);
    };

    useEffect(() => {
        refreshCustomers();
        refreshProducts();
    }, []);

    // ========== HELPERS ==========
    const getCustomerByName = (name: string): Customer | undefined =>
        customers.find((c) => c.name.toLowerCase() === name.toLowerCase());

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

    // const getAvailableCount = (product: Product): number =>
    //     parseInt(product.count) || 0;

    // const getDisplayPrice = (product: Product): number => {
    //     const sold = getSoldPerPiece(product);
    //     return sold > 0 ? sold : getCostPerPiece(product);
    // };

    const isPaid = (order: Order): boolean => order.is_paid === 'yes';

    const editingOrder = useMemo(
        () => (editingId ? orders.find((o) => o.$id === editingId) : null),
        [editingId, orders]
    );

    const oldOrderDeposit = useMemo(() => {
        if (!editingOrder) return 0;
        return parseFloat(editingOrder.deposite || '0');
    }, [editingOrder]);

    const selectedCustomer = useMemo(() =>
        getCustomerByName(client), [client, customers]);

    const customerDeposite = useMemo(
        () => parseFloat(selectedCustomer?.deposite || '0'),
        [selectedCustomer]
    );

    const effectiveCustomerDeposit = useMemo(() => {
        if (!selectedCustomer) return 0;

        // If editing the same customer's order, add back the deposit already used in that order
        if (editingOrder && editingOrder.client === selectedCustomer.name) {
            return customerDeposite + oldOrderDeposit;
        }

        return customerDeposite;
    }, [selectedCustomer, customerDeposite, editingOrder, oldOrderDeposit]);

    // ========== TOTALS ==========
    const orderTotal = useMemo(() => {
        return selectedProducts.reduce((sum, sp) => {
            const price = parseFloat(sp.soldPrice || '0');
            return sum + (price > 0 ? price : 0) * sp.qty;
        }, 0);
    }, [selectedProducts]);

    const discountAmount = useMemo(() => {
        if (discountValue <= 0) return 0;
        if (discountType === 'percentage') {
            return Math.min((orderTotal * discountValue) / 100, orderTotal);
        }
        return Math.min(discountValue, orderTotal);
    }, [discountValue, discountType, orderTotal]);

    const totalAfterDiscount = useMemo(() =>
        Math.max(0, orderTotal - discountAmount), [orderTotal, discountAmount]);

    const maxDeposite = useMemo(() => {
        if (!useDeposite || effectiveCustomerDeposit <= 0) return 0;
        return Math.min(effectiveCustomerDeposit, totalAfterDiscount);
    }, [useDeposite, effectiveCustomerDeposit, totalAfterDiscount]);

    const depositeToUse = useMemo(() => {
        if (!useDeposite) return 0;
        return Math.min(depositeAmount, maxDeposite);
    }, [useDeposite, depositeAmount, maxDeposite]);

    const handleDepositeAmountChange = (value: string) => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
            setDepositeAmount(0);
            return;
        }
        setDepositeAmount(Math.min(num, effectiveCustomerDeposit));
    };

    const amountAfterDeposite = useMemo(() =>
        Math.max(0, totalAfterDiscount - depositeToUse), [totalAfterDiscount, depositeToUse]);

    // Summary stats
    const totalPaid = orders
        .filter((o) => o.is_paid === 'yes')
        .reduce((sum, o) => sum + parseFloat(o.price_egp || '0'), 0);

    const totalUnpaid = orders
        .filter((o) => o.is_paid !== 'yes')
        .reduce((sum, o) => sum + parseFloat(o.price_egp || '0'), 0);

    const totalDepositsUsed = orders
        .reduce((sum, o) => sum + parseFloat(o.deposite || '0'), 0);

    const totalDiscounts = orders.reduce((sum, o) => {
        const disc = parseFloat(o.discount || '0');
        if (disc <= 0) return sum;
        return sum + disc;
    }, 0);

    const totalRevenue = orders.reduce(
        (sum, o) => sum + (parseFloat(o.price_egp) || 0), 0);

    // ========== PRODUCT SELECTION ==========
    const addProduct = () => {
        setSelectedProducts([...selectedProducts, {
            productId: '',
            qty: 1,
            productName: '',
            soldPrice: '',
            costPrice: '',
        }]);
    };

    const updateProduct = (index: number, field: keyof ManualProduct, value: any) => {
        setSelectedProducts((prev) =>
            prev.map((p, i) => {
                if (i === index) {
                    const updated = { ...p };
                    if (field === 'qty') {
                        updated.qty = Math.max(1, parseInt(value) || 1);
                    } else {
                        updated[field] = value;
                    }
                    return updated;
                }
                return p;
            })
        );
    };

    const removeProduct = (index: number) => {
        setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
    };

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
        setDepositeAmount(0);
        setEditingId(null);
        setUseDeposite(false);
        setDiscountValue(0);
        setDiscountType('fixed');
        setShowModal(true);
    };

    const openEdit = (order: Order) => {
        setClient(order.client);
        const quantities = order.quantities || [];
        const restored: ManualProduct[] = (order.products || []).map((pid, index) => {
            const product = getProduct(pid);
            return {
                productId: pid,
                qty: parseInt(quantities[index] || '1') || 1,
                productName: product?.name || '',
                soldPrice: product ? getSoldPerPiece(product).toFixed(2) : '',
                costPrice: product ? getCostPerPiece(product).toFixed(2) : '',
            };
        });
        setSelectedProducts(restored);
        setEditingId(order.$id);
        const savedDeposite = parseFloat(order.deposite || '0');
        setUseDeposite(savedDeposite > 0);
        setDepositeAmount(savedDeposite);

        setDiscountValue(parseFloat(order.discount || '0'));
        setDiscountType((order.discount_type as 'fixed' | 'percentage') || 'fixed');

        setShowModal(true);
    };

    useEffect(() => {
        if (editingId) return;
        setDepositeAmount(0);
        setUseDeposite(false);
        setDiscountValue(0);
        setDiscountType('fixed');
    }, [client, editingId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        if (!client.trim()) {
            alert('Please enter customer name');
            return;
        }

        if (selectedProducts.length === 0) {
            alert('Please add at least one product');
            return;
        }

        if (selectedProducts.some(p => !p.productName?.trim() || !p.soldPrice)) {
            alert('Please fill all product details');
            return;
        }

        setSubmitting(true);

        try {
            const productDescription = selectedProducts
                .map((sp) => `${sp.productName} ×${sp.qty}`)
                .join(', ');

            const existingOrder = editingId
                ? orders.find((o) => o.$id === editingId)
                : null;

            const orderData = {
                client,
                product: productDescription,
                products: selectedProducts.map((sp) => sp.productName || ''),
                quantities: selectedProducts.map((sp) => sp.qty.toString()),
                price_egp: amountAfterDeposite.toFixed(2),
                deposite: depositeToUse > 0 ? depositeToUse.toFixed(2) : '0',
                customer_deposite: effectiveCustomerDeposit > 0 ? effectiveCustomerDeposit.toFixed(2) : '0',
                is_paid: existingOrder?.is_paid || 'no',
                discount: discountAmount > 0 ? discountAmount.toFixed(2) : '0',
                discount_type: discountType,
            };

            let orderId: string;

            if (editingId) {
                await orderService.update(editingId, orderData);
                orderId = editingId;

                // Handle deposit reconciliation if customer changed
                if (existingOrder && existingOrder.client !== client) {
                    const oldCustomer = getCustomerByName(existingOrder.client);
                    const oldDeposit = parseFloat(existingOrder.deposite || '0');

                    if (oldCustomer && oldDeposit > 0) {
                        const currentDeposit = parseFloat(oldCustomer.deposite || '0');
                        await customerService.update(oldCustomer.$id, {
                            deposite: (currentDeposit + oldDeposit).toFixed(2),
                        });

                        await depositHistoryService.logRestore(
                            oldCustomer.$id,
                            oldCustomer.name,
                            oldDeposit.toFixed(2),
                            `Restored from updated Order #${editingId.slice(0, 8)} (customer changed)`
                        );
                    }

                    if (selectedCustomer && depositeToUse > 0) {
                        const currentDeposit = parseFloat(selectedCustomer.deposite || '0');
                        if (depositeToUse > currentDeposit) {
                            throw new Error(
                                `${selectedCustomer.name} does not have enough deposit. Available: ${currentDeposit.toFixed(2)} EGP`
                            );
                        }

                        await customerService.update(selectedCustomer.$id, {
                            deposite: (currentDeposit - depositeToUse).toFixed(2),
                        });

                        await depositHistoryService.logUse(
                            selectedCustomer.$id,
                            selectedCustomer.name,
                            depositeToUse.toFixed(2),
                            `Used in updated Order #${orderId.slice(0, 8)} — ${productDescription}`
                        );
                    }
                } else if (selectedCustomer && existingOrder) {
                    // Same customer - reconcile deposit difference
                    const oldDeposit = parseFloat(existingOrder.deposite || '0');
                    const diff = depositeToUse - oldDeposit;

                    if (diff > 0) {
                        const currentDeposit = parseFloat(selectedCustomer.deposite || '0');
                        if (diff > currentDeposit) {
                            throw new Error(
                                `${selectedCustomer.name} does not have enough deposit. Available: ${currentDeposit.toFixed(2)} EGP`
                            );
                        }

                        await customerService.update(selectedCustomer.$id, {
                            deposite: (currentDeposit - diff).toFixed(2),
                        });

                        await depositHistoryService.logUse(
                            selectedCustomer.$id,
                            selectedCustomer.name,
                            diff.toFixed(2),
                            `Additional ${diff.toFixed(2)} EGP used in updated Order #${orderId.slice(0, 8)}`
                        );
                    } else if (diff < 0) {
                        const restoreAmount = Math.abs(diff);
                        const currentDeposit = parseFloat(selectedCustomer.deposite || '0');

                        await customerService.update(selectedCustomer.$id, {
                            deposite: (currentDeposit + restoreAmount).toFixed(2),
                        });

                        await depositHistoryService.logRestore(
                            selectedCustomer.$id,
                            selectedCustomer.name,
                            restoreAmount.toFixed(2),
                            `Restored from updated Order #${orderId.slice(0, 8)}`
                        );
                    }
                }
            } else {
                // Create new order
                const newOrder = await orderService.create({
                    ...orderData,
                    is_paid: 'no',
                });
                orderId = newOrder.$id;

                // Handle deposit for new order
                if (depositeToUse > 0 && selectedCustomer) {
                    const currentDeposit = parseFloat(selectedCustomer.deposite || '0');
                    if (depositeToUse > currentDeposit) {
                        throw new Error(
                            `${selectedCustomer.name} does not have enough deposit. Available: ${currentDeposit.toFixed(2)} EGP`
                        );
                    }

                    await customerService.update(selectedCustomer.$id, {
                        deposite: (currentDeposit - depositeToUse).toFixed(2),
                    });

                    await depositHistoryService.logUse(
                        selectedCustomer.$id,
                        selectedCustomer.name,
                        depositeToUse.toFixed(2),
                        `Used in Order #${orderId.slice(0, 8)} — ${productDescription}`
                    );
                }
            }

            setShowModal(false);
            setSelectedProducts([]);
            setClient('');
            setDepositeAmount(0);
            setUseDeposite(false);
            setDiscountValue(0);
            setDiscountType('fixed');

            refetch();
            refreshProducts();
            refreshCustomers();
        } catch (err) {
            console.error('Order error:', err);
            alert(err instanceof Error ? err.message : 'Failed to save order.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this order?')) return;
        try {
            const order = orders.find((o) => o.$id === id);

            if (order?.deposite && parseFloat(order.deposite) > 0) {
                const customer = getCustomerByName(order.client);
                if (customer) {
                    const currentDeposite = parseFloat(customer.deposite || '0');
                    const restoredAmount = parseFloat(order.deposite);
                    await customerService.update(customer.$id, {
                        deposite: (currentDeposite + restoredAmount).toString(),
                    });
                    await depositHistoryService.logRestore(
                        customer.$id,
                        customer.name,
                        restoredAmount.toFixed(2),
                        `Restored from deleted Order #${id.slice(0, 8)}`
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
                    <div className="stat-icon blue"><Wallet size={24} /></div>
                    <div>
                        <p className="stat-label">Total Deposits Used</p>
                        <p className="stat-value text-blue">{totalDepositsUsed.toFixed(2)}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
                        <Tag size={24} />
                    </div>
                    <div>
                        <p className="stat-label">Total Discounts</p>
                        <p className="stat-value" style={{ color: '#f97316' }}>{totalDiscounts.toFixed(2)}</p>
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
            <div className="flex flex-row items-center gap-4 max-w-full! overflow-x-auto! py-5! my-5!">
                {filteredOrders.map((o) => {
                    const paid = isPaid(o);
                    const depUsed = parseFloat(o.deposite || '0');
                    const totalPrice = parseFloat(o.price_egp || '0');
                    const discountAmt = parseFloat(o.discount || '0');

                    return (
                        <div key={o.$id} className={`order-card shrink-0 min-w-75 ${paid ? 'order-card-paid' : 'order-card-unpaid'}`}>
                            <div className="order-card-header">
                                <div className="order-id">#{o.$id.slice(0, 8)}</div>
                                <div className="customer-card-actions">
                                    <button type="button" title="View Details" className="btn-icon"
                                        onClick={() => navigate(`/orders/new/${o.$id}`)}>
                                        <Eye size={15} />
                                    </button>
                                    <button
                                        className={`btn-icon ${paid ? 'paid-btn' : 'unpaid-btn'}`}
                                        onClick={() => handleTogglePaid(o)}
                                        title={paid ? 'Mark as unpaid' : 'Mark as paid'}
                                    >
                                        {paid ? <CheckCircle size={15} /> : <CircleDollarSign size={15} />}
                                    </button>
                                    <button type="button" title="Edit" className="btn-icon" onClick={() => openEdit(o)}>
                                        <Edit size={15} />
                                    </button>
                                    <button type="button" title="Delete" className="btn-icon danger" onClick={() => handleDelete(o.$id)}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <div className={`payment-badge ${paid ? 'payment-paid' : 'payment-unpaid'}`}>
                                {paid ? <><CheckCircle size={14} /> Paid</> : <><Clock size={14} /> Unpaid</>}
                            </div>

                            <div className="order-details">
                                <div className="order-detail">
                                    <User size={14} />
                                    <span className="order-client-name">{o.client}</span>
                                </div>
                                <div className="order-detail">
                                    <Package size={14} />
                                    <span>{o.products?.length || 0} product(s)</span>
                                </div>
                                <div className="order-numbers">
                                    <div className="order-number-item">
                                        <span>Amount</span>
                                        <strong className={paid ? 'text-green' : 'text-danger'}>
                                            {totalPrice.toFixed(2)} EGP
                                        </strong>
                                    </div>
                                    {discountAmt > 0 && (
                                        <div className="order-number-item">
                                            <span>Discount</span>
                                            <strong style={{ color: '#f97316' }}>−{discountAmt.toFixed(2)} EGP</strong>
                                        </div>
                                    )}
                                    {depUsed > 0 && (
                                        <div className="order-number-item deposite-item">
                                            <span>Deposit Used</span>
                                            <strong className="text-blue">{depUsed.toFixed(2)} EGP</strong>
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
                                <th>Discount</th>
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
                                const depUsed = parseFloat(o.deposite || '0');
                                const discountAmt = parseFloat(o.discount || '0');

                                return (
                                    <tr key={o.$id} className={paid ? 'row-paid' : 'row-unpaid'}>
                                        <td>#{o.$id.slice(0, 8)}</td>
                                        <td><strong>{o.client}</strong></td>
                                        <td><span className="table-items-text">{o.products?.length || '—'}</span></td>
                                        <td>
                                            {discountAmt > 0 ? (
                                                <span style={{ color: '#f97316' }}>−{discountAmt.toFixed(2)}</span>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
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
                                            <button type="button" title="View" className="btn-icon"
                                                onClick={() => navigate(`/orders/${o.$id}`)}>
                                                <Eye size={16} />
                                            </button>
                                            <button type="button" title="Edit" className="btn-icon" onClick={() => openEdit(o)}>
                                                <Edit size={16} />
                                            </button>
                                            <button type="button" title="Delete" className="btn-icon danger" onClick={() => handleDelete(o.$id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredOrders.length === 0 && (
                                <tr><td colSpan={9} className="empty">No orders yet</td></tr>
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
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {/* Client Name Input */}
                            <div className="form-group">
                                <label className='flex! flex-row items-center gap-2'><User size={14} /> Customer Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter customer name"
                                    required
                                    value={client}
                                    onChange={(e) => setClient(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            {/* Deposit Banner */}
                            {selectedCustomer && effectiveCustomerDeposit > 0 && (
                                <div className="deposite-banner">
                                    <div className="deposite-banner-info flex! flex-row items-center gap-2">
                                        <Wallet size={18} />
                                        <div>
                                            <strong>{selectedCustomer.name}</strong> has deposit
                                            <span className="deposite-amount"> {effectiveCustomerDeposit.toFixed(2)} EGP</span>
                                        </div>
                                    </div>
                                    <label className="deposite-toggle">
                                        <input
                                            type="checkbox"
                                            checked={useDeposite}
                                            onChange={(e) => {
                                                setUseDeposite(e.target.checked);
                                                if (!e.target.checked) setDepositeAmount(0);
                                            }}
                                        />
                                        <span>Use deposit</span>
                                    </label>

                                    {useDeposite && (
                                        <div className="deposite-input-group" style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', width: '100%',
                                        }}>
                                            <label style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                Amount to use:
                                            </label>
                                            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    value={depositeAmount || ''}
                                                    placeholder="0.00"
                                                    min={0}
                                                    max={maxDeposite}
                                                    step="0.01"
                                                    onChange={(e) => handleDepositeAmountChange(e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '8px 70px 8px 12px',
                                                        borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px',
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setDepositeAmount(maxDeposite)}
                                                    style={{
                                                        position: 'absolute', right: '4px', padding: '4px 10px',
                                                        fontSize: '12px', fontWeight: 700, borderRadius: '6px',
                                                        border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer',
                                                    }}
                                                >
                                                    Use Max
                                                </button>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                                Max: {maxDeposite.toFixed(2)} EGP
                                            </span>
                                        </div>
                                    )}

                                    {useDeposite && depositeAmount > 0 && (
                                        <div style={{
                                            marginTop: '8px', padding: '8px 12px', borderRadius: '8px',
                                            background: 'rgba(59, 130, 246, 0.1)', fontSize: '13px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <span>Deposit to deduct:</span>
                                            <strong style={{ color: '#3b82f6' }}>{depositeToUse.toFixed(2)} EGP</strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedCustomer && effectiveCustomerDeposit === 0 && (
                                <div className="deposite-banner no-deposite flex! flex-row items-center gap-2 mb-4!">
                                    <Wallet size={16} />
                                    <span><strong>{selectedCustomer.name}</strong> has no deposit</span>
                                </div>
                            )}

                            {/* Discount Section */}
                            <div className="form-group mt-4!">
                                <label className='flex! flex-row items-center gap-2'>
                                    <Tag size={14} /> Discount
                                </label>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px', borderRadius: '12px',
                                    border: '1px solid #e5e7eb', background: '#fefce8',
                                }}>
                                    <div style={{
                                        display: 'flex', borderRadius: '8px', overflow: 'hidden',
                                        border: '1px solid #d1d5db',
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('fixed')}
                                            style={{
                                                padding: '6px 12px', fontSize: '13px', fontWeight: 600,
                                                border: 'none', cursor: 'pointer',
                                                background: discountType === 'fixed' ? '#f97316' : '#fff',
                                                color: discountType === 'fixed' ? '#fff' : '#374151',
                                            }}
                                        >
                                            EGP
                                        </button>
                                        <button
                                            title='Discount'
                                            type="button"
                                            onClick={() => setDiscountType('percentage')}
                                            style={{
                                                padding: '6px 12px', fontSize: '13px', fontWeight: 600,
                                                border: 'none', cursor: 'pointer',
                                                background: discountType === 'percentage' ? '#f97316' : '#fff',
                                                color: discountType === 'percentage' ? '#fff' : '#374151',
                                            }}
                                        >
                                            <Percent size={14} />
                                        </button>
                                    </div>

                                    <input
                                        type="number"
                                        value={discountValue || ''}
                                        placeholder={discountType === 'percentage' ? '0 %' : '0.00 EGP'}
                                        min={0}
                                        max={discountType === 'percentage' ? 100 : orderTotal}
                                        step="0.01"
                                        onChange={(e) => {
                                            let val = parseFloat(e.target.value) || 0;
                                            if (discountType === 'percentage') val = Math.min(val, 100);
                                            else val = Math.min(val, orderTotal);
                                            setDiscountValue(Math.max(0, val));
                                        }}
                                        style={{
                                            flex: 1, padding: '8px 12px', borderRadius: '8px',
                                            border: '1px solid #d1d5db', fontSize: '14px',
                                        }}
                                    />

                                    {discountAmount > 0 && (
                                        <span style={{
                                            fontSize: '13px', fontWeight: 700, color: '#f97316',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            −{discountAmount.toFixed(2)} EGP
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Manual Product Entry */}
                            <div className="form-group mt-4!">
                                <label className='flex! flex-row items-center gap-2'>
                                    <Package size={14} /> Products *
                                    <span className="label-badge">{selectedProducts.length} added</span>
                                </label>

                                {selectedProducts.length === 0 ? (
                                    <div className="empty-state mb-4">
                                        <Package size={24} />
                                        <p>No products added yet</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-gray-100 border-b">
                                                    <th className="px-3 py-2 text-left">#</th>
                                                    <th className="px-3 py-2 text-left">Product Name</th>
                                                    <th className="px-3 py-2 text-left">Qty</th>
                                                    <th className="px-3 py-2 text-left">Price (EGP)</th>
                                                    <th className="px-3 py-2 text-left">Subtotal</th>
                                                    <th className="px-3 py-2 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedProducts.map((sp, idx) => (
                                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                                        <td className="px-3 py-2 font-semibold text-center">{idx + 1}</td>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Product name"
                                                                value={sp.productName || ''}
                                                                onChange={(e) => updateProduct(idx, 'productName', e.target.value)}
                                                                className="form-input text-sm w-full"
                                                                required
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="number"
                                                                placeholder="Qty"
                                                                min="1"
                                                                value={sp.qty}
                                                                onChange={(e) => updateProduct(idx, 'qty', e.target.value)}
                                                                className="form-input text-sm w-16"
                                                                required
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="number"
                                                                placeholder="0.00"
                                                                step="0.01"
                                                                min="0"
                                                                value={sp.soldPrice || ''}
                                                                onChange={(e) => updateProduct(idx, 'soldPrice', e.target.value)}
                                                                className="form-input text-sm w-24"
                                                                required
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 font-semibold">
                                                            {((parseFloat(sp.soldPrice || '0') || 0) * sp.qty).toFixed(2)} EGP
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <button
                                                                type="button"
                                                                className="btn-icon danger"
                                                                onClick={() => removeProduct(idx)}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-secondary w-full"
                                    onClick={addProduct}
                                >
                                    <Plus size={16} /> Add Product
                                </button>
                            </div>

                            {/* Order Summary */}
                            {selectedProducts.length > 0 && (
                                <div className="order-breakdown">
                                    <h4>Order Summary</h4>
                                    {selectedProducts.map((sp, idx) => (
                                        <div key={idx} className="order-breakdown-item">
                                            <div className="breakdown-product-info">
                                                <span className="breakdown-product-name">
                                                    {sp.productName}
                                                    <span className="breakdown-qty mx-2! py-1!">×{sp.qty}</span>
                                                </span>
                                                <span className="breakdown-unit-price">
                                                    {parseFloat(sp.soldPrice || '0').toFixed(2)} EGP/pc
                                                </span>
                                            </div>
                                            <div className="breakdown-item-total">
                                                {((parseFloat(sp.soldPrice || '0') || 0) * sp.qty).toFixed(2)} EGP
                                            </div>
                                        </div>
                                    ))}
                                    <div className="order-breakdown-totals">
                                        <div className="breakdown-total-row">
                                            <span>Subtotal:</span>
                                            <span>{orderTotal.toFixed(2)} EGP</span>
                                        </div>

                                        {discountAmount > 0 && (
                                            <>
                                                <div className="breakdown-total-row" style={{ color: '#f97316' }}>
                                                    <span>
                                                        <Tag size={14} /> Discount
                                                        {discountType === 'percentage' && ` (${discountValue}%)`}:
                                                    </span>
                                                    <span>−{discountAmount.toFixed(2)} EGP</span>
                                                </div>
                                                <div className="breakdown-total-row">
                                                    <span>After Discount:</span>
                                                    <span>{totalAfterDiscount.toFixed(2)} EGP</span>
                                                </div>
                                            </>
                                        )}

                                        {depositeToUse > 0 && (
                                            <div className="breakdown-total-row deposite-deduction">
                                                <span>
                                                    <Wallet size={14} /> Deposit ({depositeToUse.toFixed(2)} of {effectiveCustomerDeposit.toFixed(2)}):
                                                </span>
                                                <span>−{depositeToUse.toFixed(2)} EGP</span>
                                            </div>
                                        )}

                                        <div className="breakdown-total-row sold-total final-total">
                                            <span>Amount to Pay:</span>
                                            <strong>{amountAfterDeposite.toFixed(2)} EGP</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={selectedProducts.length === 0 || !client.trim() || submitting}>
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