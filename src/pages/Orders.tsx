import { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Trash2, Edit, Plus, X, ShoppingCart, User,
    Package, DollarSign, Check, Minus,
    Plus as PlusIcon, Wallet, CheckCircle,
    CircleDollarSign, Clock,
    Eye, Percent, Tag,                          // ← ADD Percent, Tag
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { depositHistoryService } from '../services/depositHistoryService';
import { useCollection } from '../hooks/useCollection';
import type { Order, Customer, Product, SelectedProduct } from '../types';
import { useNavigate } from 'react-router-dom';

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
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [useDeposite, setUseDeposite] = useState(true);
    const [depositeAmount, setDepositeAmount] = useState<number>(0);
    const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all');
    const navigate = useNavigate();

    // ← NEW: Discount state
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

    // // ← NEW: Helper to calculate discount amount for any order
    // const getOrderDiscountAmount = (order: Order, subtotal: number): number => {
    //     const discVal = parseFloat(order.discount || '0');
    //     if (discVal <= 0) return 0;
    //     if (order.discount_type === 'percentage') {
    //         return Math.min((subtotal * discVal) / 100, subtotal);
    //     }
    //     return Math.min(discVal, subtotal);
    // };
    const editingOrder = useMemo(
        () => (editingId ? orders.find((o) => o.$id === editingId) : null),
        [editingId, orders]
    );

    const oldOrderDeposit = useMemo(() => {
        if (!editingOrder) return 0;
        return parseFloat(editingOrder.deposite || '0');
    }, [editingOrder]);

    const selectedCustomer = useMemo(() =>
        customers.find((c) => c.name === client), [client, customers]);

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
            const product = getProduct(sp.productId);
            if (!product) return sum;
            return sum + getDisplayPrice(product) * sp.qty;
        }, 0);
    }, [selectedProducts, allProducts]);

    // ← NEW: Calculate discount amount
    const discountAmount = useMemo(() => {
        if (discountValue <= 0) return 0;
        if (discountType === 'percentage') {
            return Math.min((orderTotal * discountValue) / 100, orderTotal);
        }
        return Math.min(discountValue, orderTotal);
    }, [discountValue, discountType, orderTotal]);

    // ← UPDATED: Subtotal after discount
    const totalAfterDiscount = useMemo(() =>
        Math.max(0, orderTotal - discountAmount), [orderTotal, discountAmount]);

    // ← UPDATED: Max deposit now based on discounted total
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

    // ← UPDATED: Final amount = subtotal - discount - deposit
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

    // ← NEW: Total discounts given
    const totalDiscounts = orders.reduce((sum, o) => {
        const disc = parseFloat(o.discount || '0');
        if (disc <= 0) return sum;
        // Recalculate the actual discount amount for percentage-based discounts
        const orderSubtotal = parseFloat(o.price_egp || '0') + parseFloat(o.deposite || '0');
        if (o.discount_type === 'percentage') {
            // For percentage, we need the original subtotal before discount
            // price_egp = subtotal - discount - deposit, so subtotal = price_egp + deposit + discountAmount
            // This is tricky, so we store the actual discount amount instead
            // For now, approximate or store actual amount
            return sum + disc; // We'll store actual amount — see below
        }
        return sum + Math.min(disc, orderSubtotal + disc);
    }, 0);

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
        setDepositeAmount(0);
        setEditingId(null);
        setUseDeposite(true);
        setDiscountValue(0);          // ← NEW
        setDiscountType('fixed');      // ← NEW
        setShowModal(true);
    };

    const openEdit = (order: Order) => {
        setClient(order.client);
        const quantities = order.quantities || [];
        const restored: SelectedProduct[] = (order.products || []).map((pid, index) => ({
            productId: pid,
            qty: parseInt(quantities[index] || '1') || 1,
        }));
        setSelectedProducts(restored);
        setEditingId(order.$id);
        const savedDeposite = parseFloat(order.deposite || '0');
        setUseDeposite(savedDeposite > 0);
        setDepositeAmount(savedDeposite);

        // ← NEW: Restore discount
        setDiscountValue(parseFloat(order.discount || '0'));
        setDiscountType((order.discount_type as 'fixed' | 'percentage') || 'fixed');

        setShowModal(true);
    };

    useEffect(() => {
        if (editingId) return;
        setDepositeAmount(0);
        setUseDeposite(true);
        setDiscountValue(0);          // ← NEW
        setDiscountType('fixed');      // ← NEW
    }, [client, editingId]);

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

            const existingOrder = editingId
                ? orders.find((o) => o.$id === editingId)
                : null;

            const orderData = {
                client,
                product: productDescription,
                products: selectedProducts.map((sp) => sp.productId),
                quantities: selectedProducts.map((sp) => sp.qty.toString()),
                price_egp: amountAfterDeposite.toFixed(2),
                deposite: depositeToUse > 0 ? depositeToUse.toFixed(2) : '0',
                customer_deposite: effectiveCustomerDeposit > 0 ? effectiveCustomerDeposit.toFixed(2) : '0',
                is_paid: existingOrder?.is_paid || 'no', // preserve paid status on edit
                discount: discountAmount > 0 ? discountAmount.toFixed(2) : '0',
                discount_type: discountType,
            };

            let orderId: string;

            if (editingId) {
                if (!existingOrder) {
                    throw new Error('Original order not found');
                }

                // =========================
                // 1) RESTORE OLD STOCK
                // =========================
                const oldProducts = existingOrder.products || [];
                const oldQuantities = existingOrder.quantities || [];

                for (let i = 0; i < oldProducts.length; i++) {
                    const pid = oldProducts[i];
                    const qty = parseInt(oldQuantities[i] || '1') || 1;
                    await productService.increaseCount(pid, qty);
                }

                // =========================
                // 2) VALIDATE NEW STOCK
                // =========================
                const latestProducts = await productService.listAll();

                for (const sp of selectedProducts) {
                    const product = latestProducts.find((p) => p.$id === sp.productId);
                    if (!product) {
                        throw new Error(`Product not found`);
                    }

                    const available = parseInt(product.count || '0') || 0;
                    if (sp.qty > available) {
                        throw new Error(`Not enough stock for ${product.name}. Available: ${available}`);
                    }
                }

                // =========================
                // 3) APPLY NEW STOCK
                // =========================
                for (const sp of selectedProducts) {
                    await productService.decreaseCount(sp.productId, sp.qty);
                }

                // =========================
                // 4) RECONCILE DEPOSIT
                // =========================
                const oldDeposit = parseFloat(existingOrder.deposite || '0');
                const newDeposit = depositeToUse;

                const oldCustomer = customers.find((c) => c.name === existingOrder.client);
                const newCustomer = selectedCustomer;

                // Case A: same customer
                if (oldCustomer && newCustomer && oldCustomer.$id === newCustomer.$id) {
                    const diff = newDeposit - oldDeposit;
                    const currentCustomerDeposit = parseFloat(newCustomer.deposite || '0');

                    if (diff > 0) {
                        // Need to deduct more deposit
                        if (diff > currentCustomerDeposit) {
                            throw new Error(
                                `${newCustomer.name} does not have enough deposit. Available: ${currentCustomerDeposit.toFixed(2)} EGP`
                            );
                        }

                        await customerService.update(newCustomer.$id, {
                            deposite: Math.max(0, currentCustomerDeposit - diff).toFixed(2),
                        });

                        await depositHistoryService.logUse(
                            newCustomer.$id,
                            newCustomer.name,
                            diff.toFixed(2),
                            `Additional ${diff.toFixed(2)} EGP used when updating Order #${editingId.slice(0, 8)} — ${productDescription}`
                        );
                    } else if (diff < 0) {
                        // Need to restore deposit
                        const restoreAmount = Math.abs(diff);

                        await customerService.update(newCustomer.$id, {
                            deposite: (currentCustomerDeposit + restoreAmount).toFixed(2),
                        });

                        await depositHistoryService.logRestore(
                            newCustomer.$id,
                            newCustomer.name,
                            restoreAmount.toFixed(2),
                            `Restored ${restoreAmount.toFixed(2)} EGP when updating Order #${editingId.slice(0, 8)}`
                        );
                    }
                } else {
                    // Case B: customer changed
                    // Restore old deposit to old customer
                    if (oldCustomer && oldDeposit > 0) {
                        const oldCustomerCurrentDeposit = parseFloat(oldCustomer.deposite || '0');

                        await customerService.update(oldCustomer.$id, {
                            deposite: (oldCustomerCurrentDeposit + oldDeposit).toFixed(2),
                        });

                        await depositHistoryService.logRestore(
                            oldCustomer.$id,
                            oldCustomer.name,
                            oldDeposit.toFixed(2),
                            `Restored ${oldDeposit.toFixed(2)} EGP from updated Order #${editingId.slice(0, 8)} (customer changed)`
                        );
                    }

                    // Deduct new deposit from new customer
                    if (newCustomer && newDeposit > 0) {
                        const newCustomerCurrentDeposit = parseFloat(newCustomer.deposite || '0');

                        if (newDeposit > newCustomerCurrentDeposit) {
                            throw new Error(
                                `${newCustomer.name} does not have enough deposit. Available: ${newCustomerCurrentDeposit.toFixed(2)} EGP`
                            );
                        }

                        await customerService.update(newCustomer.$id, {
                            deposite: Math.max(0, newCustomerCurrentDeposit - newDeposit).toFixed(2),
                        });

                        await depositHistoryService.logUse(
                            newCustomer.$id,
                            newCustomer.name,
                            newDeposit.toFixed(2),
                            `Used ${newDeposit.toFixed(2)} EGP when updating Order #${editingId.slice(0, 8)} — ${productDescription}`
                        );
                    }
                }

                // =========================
                // 5) UPDATE ORDER
                // =========================
                await orderService.update(editingId, orderData);
                orderId = editingId;
            } else {
                // =========================
                // CREATE ORDER
                // =========================
                const latestProducts = await productService.listAll();

                for (const sp of selectedProducts) {
                    const product = latestProducts.find((p) => p.$id === sp.productId);
                    if (!product) {
                        throw new Error(`Product not found`);
                    }

                    const available = parseInt(product.count || '0') || 0;
                    if (sp.qty > available) {
                        throw new Error(`Not enough stock for ${product.name}. Available: ${available}`);
                    }
                }

                const newOrder = await orderService.create({
                    ...orderData,
                    is_paid: 'no',
                });
                orderId = newOrder.$id;

                for (const sp of selectedProducts) {
                    await productService.decreaseCount(sp.productId, sp.qty);
                }

                if (depositeToUse > 0 && selectedCustomer) {
                    const remainingDeposite = Math.max(0, customerDeposite - depositeToUse);

                    await customerService.update(selectedCustomer.$id, {
                        deposite: remainingDeposite.toFixed(2),
                    });

                    await depositHistoryService.logUse(
                        selectedCustomer.$id,
                        selectedCustomer.name,
                        depositeToUse.toFixed(2),
                        `Used ${depositeToUse.toFixed(2)} EGP in Order #${orderId.slice(0, 8)} — ${productDescription}`
                    );
                }
            }

            // =========================
            // LINK PRODUCTS TO ORDER
            // =========================
            const productIds = selectedProducts.map((sp) => sp.productId);
            if (productIds.length > 0) {
                await productService.linkToOrder(productIds, orderId);
            }

            // =========================
            // RESET UI
            // =========================
            setShowModal(false);
            setSelectedProducts([]);
            setClient('');
            setDepositeAmount(0);
            setUseDeposite(true);
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
        if (!confirm('Delete this order? Product counts will be restored.')) return;
        try {
            const order = orders.find((o) => o.$id === id);

            if (order?.products && order.products.length > 0) {
                const quantities = order.quantities || [];
                for (let i = 0; i < order.products.length; i++) {
                    const pid = order.products[i];
                    const qty = parseInt(quantities[i] || '1') || 1;
                    await productService.increaseCount(pid, qty);
                }
            }

            if (order?.deposite && parseFloat(order.deposite) > 0) {
                const customer = customers.find((c) => c.name === order.client);
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
                        `Restored ${restoredAmount.toFixed(2)} EGP from deleted Order #${id.slice(0, 8)}`
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
                {/* ← NEW: Total Discounts Stat */}
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
            <div className="order-grid">
                {filteredOrders.map((o) => {
                    const paid = isPaid(o);
                    const depUsed = parseFloat(o.deposite || '0');
                    const totalPrice = parseFloat(o.price_egp || '0');
                    const discountAmt = parseFloat(o.discount || '0');   // ← NEW

                    return (
                        <div key={o.$id} className={`order-card ${paid ? 'order-card-paid' : 'order-card-unpaid'}`}>
                            <div className="order-card-header">
                                <div className="order-id">#{o.$id.slice(0, 8)}</div>
                                <div className="customer-card-actions">
                                    <button type="button" title="View Details" className="btn-icon"
                                        onClick={() => navigate(`/orders/${o.$id}`)}>
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
                                    {/* ← NEW: Show discount on card */}
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
                                <th>Discount</th>    {/* ← NEW */}
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
                                const discountAmt = parseFloat(o.discount || '0');  // ← NEW

                                return (
                                    <tr key={o.$id} className={paid ? 'row-paid' : 'row-unpaid'}>
                                        <td>#{o.$id.slice(0, 8)}</td>
                                        <td><strong>{o.client}</strong></td>
                                        <td><span className="table-items-text">{o.products?.length || '—'}</span></td>
                                        {/* ← NEW: Discount column */}
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
                            {/* Client Select */}
                            <div className="form-group">
                                <label className='flex! flex-row items-center gap-2'><User size={14} /> Client *</label>
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

                            {/* ← NEW: Discount Section */}
                            <div className="form-group mt-4!">
                                <label className='flex! flex-row items-center gap-2'>
                                    <Tag size={14} /> Discount
                                </label>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px', borderRadius: '12px',
                                    border: '1px solid #e5e7eb', background: '#fefce8',
                                }}>
                                    {/* Discount Type Toggle */}
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

                                    {/* Discount Input */}
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

                                    {/* Show calculated discount amount for percentage */}
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

                            {/* Product Selection */}
                            <div className="form-group mt-4!">
                                <label className='flex! flex-row items-center gap-2'>
                                    <Package size={14} /> Select Products *
                                    <span className="label-badge">{selectedProducts.length} selected</span>
                                </label>
                                <div className="grid grid-cols-2 max-h-100 overflow-y-auto border rounded-2xl p-2! border-gray-300 gap-4!">
                                    {allProducts.map((p) => {
                                        const selected = isSelected(p.$id);
                                        const soldPc = getSoldPerPiece(p);
                                        const costPc = getCostPerPiece(p);
                                        const available = getAvailableCount(p);
                                        const qty = getSelectedQty(p.$id);
                                        const displayPrice = getDisplayPrice(p);
                                        const outOfStock = available === 0;

                                        return (
                                            <div key={p.$id} className={`product-select-item ${selected ? 'selected' : 'bg-gray-400'} ${outOfStock ? 'out-of-stock' : ''}`}>
                                                <div className="product-select-check" onClick={() => !outOfStock && toggleProduct(p.$id)}>
                                                    {selected && <Check size={16} />}
                                                </div>
                                                <div className="product-select-info flex! flex-col" onClick={() => !outOfStock && !selected && toggleProduct(p.$id)}>
                                                    <span className="product-select-name flex! flex-col items-center text-center">
                                                        {p.name}
                                                        {soldPc === 0 && <span className="no-sold-badge mt-2!">No sold price</span>}
                                                        {outOfStock && <span className="out-of-stock-badge w-fit mx-auto mt-2!">Out of stock</span>}
                                                    </span>
                                                    <span className="product-select-details">
                                                        {soldPc > 0 ? <>Sold: <strong>{soldPc.toFixed(2)}</strong> EGP/pc</> : <>Cost: {costPc.toFixed(2)} EGP/pc</>}
                                                    </span>
                                                    <span className={`product-select-stock ${outOfStock ? 'stock-zero' : ''}`}>
                                                        Available: <strong>{available}</strong>
                                                    </span>
                                                </div>
                                                {selected && !outOfStock && (
                                                    <div className="qty-picker mx-auto!">
                                                        <button title="Decrease quantity" type="button" className="qty-btn" onClick={() => updateQty(p.$id, qty - 1)} disabled={qty <= 1}><Minus size={14} /></button>
                                                        <input title="Quantity" type="number" className="qty-input text-black!" value={qty} min={1} max={available} onChange={(e) => updateQty(p.$id, parseInt(e.target.value) || 1)} />
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

                            {/* ← UPDATED: Order Summary with Discount */}
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
                                                        <span className="breakdown-qty mx-2! py-1!">×{sp.qty}</span>
                                                    </span>
                                                    <span className="breakdown-unit-price">
                                                        {displayPrice.toFixed(2)} EGP/pc {soldPc > 0 ? '(sold)' : '(cost)'}
                                                    </span>
                                                </div>
                                                <div className="breakdown-item-total">{(displayPrice * sp.qty).toFixed(2)} EGP</div>
                                            </div>
                                        );
                                    })}
                                    <div className="order-breakdown-totals">
                                        <div className="breakdown-total-row">
                                            <span>Subtotal:</span>
                                            <span>{orderTotal.toFixed(2)} EGP</span>
                                        </div>

                                        {/* ← NEW: Discount row */}
                                        {discountAmount > 0 && (
                                            <div className="breakdown-total-row" style={{ color: '#f97316' }}>
                                                <span>
                                                    <Tag size={14} /> Discount
                                                    {discountType === 'percentage' && ` (${discountValue}%)`}:
                                                </span>
                                                <span>−{discountAmount.toFixed(2)} EGP</span>
                                            </div>
                                        )}

                                        {/* ← NEW: After discount subtotal */}
                                        {discountAmount > 0 && (
                                            <div className="breakdown-total-row">
                                                <span>After Discount:</span>
                                                <span>{totalAfterDiscount.toFixed(2)} EGP</span>
                                            </div>
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