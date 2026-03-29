import {
    Trash2, Edit, Plus, X, Phone, User, Wallet,
    History, PlusCircle, MinusCircle, ArrowUpCircle,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import { useCollection } from '../hooks/useCollection';
import type { Customer, CustomerForm, DepositHistory } from '../types';
import { depositHistoryService } from '../services/depositHistoryService';
import { CheckCircle, Clock } from 'lucide-react';
import { orderService } from '../services/orderService';
import type { Order } from '../types';
import { useState, useCallback } from 'react';

const emptyForm: CustomerForm = { name: '', phone: '', deposite: '' };

export default function Customers() {
    const { data: customers, loading, error, refetch } = useCollection<Customer>({
        fetchFn: useCallback(() => customerService.listAll(), []),
    });
    const { data: orders } = useCollection<Order>({
        fetchFn: useCallback(() => orderService.listAll(), []),
    });
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CustomerForm>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');

    // Deposit modal
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositCustomer, setDepositCustomer] = useState<Customer | null>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositNote, setDepositNote] = useState('');
    const [showUseDepositModal, setShowUseDepositModal] = useState(false);
    const [useDepositCustomer, setUseDepositCustomer] = useState<Customer | null>(null);
    const [useDepositAmount, setUseDepositAmount] = useState('');
    const [useDepositNote, setUseDepositNote] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    // History modal
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
    const [history, setHistory] = useState<DepositHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (customer: Customer) => {
        setForm({
            name: customer.name,
            phone: customer.phone,
            deposite: customer.deposite || '',
        });
        setEditingId(customer.$id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await customerService.update(editingId, form);
            } else {
                const newCustomer = await customerService.create(form);

                // Log initial deposit if any
                if (form.deposite && parseFloat(form.deposite) > 0) {
                    await depositHistoryService.logAdd(
                        newCustomer.$id,
                        form.name,
                        form.deposite,
                        'Initial deposit'
                    );
                }
            }
            setShowModal(false);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    const openUseDeposit = (customer: Customer) => {
        setUseDepositCustomer(customer);
        setUseDepositAmount('');
        setUseDepositNote('');
        setSelectedOrderId(null);
        setShowUseDepositModal(true);
    };

    const handleUseDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!useDepositCustomer || !useDepositAmount) return;

        try {
            const currentDeposit = parseFloat(useDepositCustomer.deposite || '0');
            const useAmount = parseFloat(useDepositAmount);

            // Prevent using more than available
            if (useAmount > currentDeposit) {
                alert(`Insufficient deposit! Available: ${currentDeposit.toFixed(2)} EGP`);
                return;
            }

            const newDeposit = currentDeposit - useAmount;

            // 1. Update customer deposit balance
            await customerService.update(useDepositCustomer.$id, {
                deposite: newDeposit.toFixed(2),
            });

            // 2. Log the usage in history
            await depositHistoryService.logUse(
                useDepositCustomer.$id,
                useDepositCustomer.name,
                useAmount.toFixed(2),
                useDepositNote || 'Deposit used for payment'
            );

            // 3. If an order was selected, mark it as paid
            if (selectedOrderId) {
                await orderService.update(selectedOrderId, { is_paid: 'yes' });
            }

            setShowUseDepositModal(false);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this customer?')) return;
        await customerService.remove(id);
        refetch();
    };

    // ========== ADD DEPOSIT ==========
    const openAddDeposit = (customer: Customer) => {
        setDepositCustomer(customer);
        setDepositAmount('');
        setDepositNote('');
        setShowDepositModal(true);
    };

    const handleAddDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!depositCustomer || !depositAmount) return;

        try {
            const currentDeposit = parseFloat(depositCustomer.deposite || '0');
            const addAmount = parseFloat(depositAmount);
            const newDeposit = currentDeposit + addAmount;

            // Update customer deposit
            await customerService.update(depositCustomer.$id, {
                deposite: newDeposit.toString(),
            });

            // Log the deposit
            await depositHistoryService.logAdd(
                depositCustomer.$id,
                depositCustomer.name,
                addAmount.toFixed(2),
                depositNote || 'Deposit added'
            );

            setShowDepositModal(false);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    // ========== VIEW HISTORY ==========
    const openHistory = async (customer: Customer) => {
        setHistoryCustomer(customer);
        setHistoryLoading(true);
        setShowHistoryModal(true);

        try {
            const data = await depositHistoryService.listByCustomer(customer.$id);
            setHistory(data);
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const filteredCustomers = customers.filter(
        (c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm)
    );

    if (loading) return <div className="loading">Loading customers...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>Customers ({customers.length})</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="button" title='Plus' className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Customer
                    </button>
                </div>
            </div>

            {/* Cards */}
            <div className="flex flex-row items-center h-105 gap-4 max-w-full! overflow-x-auto! py-5! my-5!">
                {filteredCustomers.map((c) => {
                    const deposit = parseFloat(c.deposite || '0');

                    return (
                        <div key={c.$id} className="customer-card shrink-0!">
                            <div className="customer-card-header">
                                <div className="customer-avatar">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="customer-card-actions">
                                    <button title='Edit' type="button" className="btn-icon" onClick={() => openEdit(c)}>
                                        <Edit size={15} />
                                    </button>
                                    <button title='Delete' type="button" className="btn-icon danger" onClick={() => handleDelete(c.$id)}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="customer-name">{c.name}</h3>

                            <div className="customer-details">
                                <div className="customer-detail">
                                    <Phone size={14} />
                                    <span>{c.phone}</span>
                                </div>
                                <div className="customer-detail">
                                    <Wallet size={14} />
                                    <span className={deposit > 0 ? 'text-green' : ''}>
                                        Deposit: {deposit > 0 ? `${deposit.toFixed(2)} EGP` : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Deposit Actions */}
                            <div className="deposit-actions">
                                <button
                                    type="button"
                                    title='PlusCircle'
                                    className="btn btn-sm btn-deposit-add"
                                    onClick={() => openAddDeposit(c)}
                                >
                                    <PlusCircle size={14} /> Add Deposit
                                </button>
                                <button
                                    type="button"
                                    title="Use Deposit"
                                    className="btn btn-sm btn-deposit-use"
                                    onClick={() => openUseDeposit(c)}
                                    disabled={parseFloat(c.deposite || '0') <= 0}
                                >
                                    <MinusCircle size={14} /> Use
                                </button>
                                <button
                                    type="button"
                                    title='History'
                                    className="btn btn-sm btn-deposit-history"
                                    onClick={() => openHistory(c)}
                                >
                                    <History size={14} /> History
                                </button>
                            </div>
                            {(() => {
                                const customerOrders = orders.filter((o) => o.client === c.name);
                                const paidTotal = customerOrders
                                    .filter((o) => o.is_paid === 'yes')
                                    .reduce((sum, o) => sum + parseFloat(o.price_egp || '0'), 0);
                                const unpaidTotal = customerOrders
                                    .filter((o) => o.is_paid !== 'yes')
                                    .reduce((sum, o) => sum + parseFloat(o.price_egp || '0'), 0);

                                if (customerOrders.length === 0) return null;

                                return (
                                    <div className="customer-order-stats">
                                        <div className="customer-stat-row">
                                            <span><CheckCircle size={13} /> Paid:</span>
                                            <strong className="text-green">{paidTotal.toFixed(2)} EGP</strong>
                                        </div>
                                        <div className="customer-stat-row">
                                            <span><Clock size={13} /> Unpaid:</span>
                                            <strong className="text-danger">{unpaidTotal.toFixed(2)} EGP</strong>
                                        </div>
                                        <div className="customer-stat-row customer-stat-total">
                                            <span>Total Orders:</span>
                                            <strong>{customerOrders.length}</strong>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="customer-meta">
                                Joined {new Date(c.$createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
                {filteredCustomers.length === 0 && (
                    <div className="empty-state"><p>No customers found</p></div>
                )}
            </div>

            {/* Table */}
            <div className="card">
                <h2>All Customers</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Deposit</th>
                            <th>Paid</th>
                            <th>Unpaid</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map((c) => {
                            const deposit = parseFloat(c.deposite || '0');
                            return (
                                <tr key={c.$id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="table-avatar">{c.name.charAt(0).toUpperCase()}</div>
                                            {c.name}
                                        </div>
                                    </td>
                                    <td>{c.phone}</td>
                                    <td>
                                        <span className={deposit > 0 ? 'deposit-badge-active' : 'deposit-badge-none'}>
                                            <Wallet size={13} />
                                            {deposit > 0 ? `${deposit.toFixed(2)} EGP` : 'No deposit'}
                                        </span>
                                    </td>
                                    <td>{new Date(c.$createdAt).toLocaleDateString()}</td>
                                    <td>
                                        {(() => {
                                            const paid = orders
                                                .filter((o) => o.client === c.name && o.is_paid === 'yes')
                                                .reduce((sum, o) => sum + parseFloat(o.price_egp || '0'), 0);
                                            return paid > 0
                                                ? <strong className="text-green">{paid.toFixed(2)}</strong>
                                                : <span className="text-muted">—</span>;
                                        })()}
                                    </td>
                                    <td>
                                        {(() => {
                                            const unpaid = orders
                                                .filter((o) => o.client === c.name && o.is_paid !== 'yes')
                                                .reduce((sum, o) => sum + parseFloat(o.price_egp || '0'), 0);
                                            return unpaid > 0
                                                ? <strong className="text-danger">{unpaid.toFixed(2)}</strong>
                                                : <span className="text-muted">—</span>;
                                        })()}
                                    </td>
                                    <td className="actions">
                                        <button type="button" className="btn-icon" onClick={() => openAddDeposit(c)} title="Add deposit">
                                            <PlusCircle size={16} />
                                        </button>
                                        <button type="button" className="btn-icon danger" onClick={() => openUseDeposit(c)} title="Use deposit">
                                            <MinusCircle size={16} />
                                        </button>
                                        <button type="button" className="btn-icon" onClick={() => openHistory(c)} title="View history">
                                            <History size={16} />
                                        </button>
                                        <button title='Edit' type="button" className="btn-icon" onClick={() => openEdit(c)}>
                                            <Edit size={16} />
                                        </button>
                                        <button title='Delete' type="button" className="btn-icon danger" onClick={() => handleDelete(c.$id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredCustomers.length === 0 && (
                            <tr><td colSpan={5} className="empty">No customers yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ===== CREATE/EDIT CUSTOMER MODAL ===== */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Customer' : 'New Customer'}</h2>
                            <button type="button" title='Close' className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className='flex flex-row items-center gap-2'><User size={14} /> Name *</label>
                                <input required placeholder="Customer name" value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label><Phone size={14} /> Phone *</label>
                                <input required placeholder="Phone number" value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label><Wallet size={14} /> Initial Deposit (EGP)</label>
                                <input placeholder="Deposit amount" value={form.deposite}
                                    onChange={(e) => setForm({ ...form, deposite: e.target.value })} />
                            </div>
                            <div className="form-actions">
                                <button type="button" title='Cancel' className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" title='Btn' className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== ADD DEPOSIT MODAL ===== */}
            {showDepositModal && depositCustomer && (
                <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Deposit</h2>
                            <button type="button" title='Close' className="btn-icon" onClick={() => setShowDepositModal(false)}><X size={20} /></button>
                        </div>

                        <div className="deposit-modal-customer">
                            <div className="customer-avatar">
                                {depositCustomer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <strong>{depositCustomer.name}</strong>
                                <p className="deposit-current">
                                    Current Deposit: <span className="text-green">
                                        {parseFloat(depositCustomer.deposite || '0').toFixed(2)} EGP
                                    </span>
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleAddDeposit}>
                            <div className="form-group">
                                <label><Wallet size={14} /> Amount to Add (EGP) *</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="Enter deposit amount"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                />
                            </div>

                            {depositAmount && (
                                <div className="deposit-preview">
                                    <div className="deposit-preview-row">
                                        <span>Current:</span>
                                        <span>{parseFloat(depositCustomer.deposite || '0').toFixed(2)} EGP</span>
                                    </div>
                                    <div className="deposit-preview-row text-green">
                                        <span>Adding:</span>
                                        <span>+{parseFloat(depositAmount || '0').toFixed(2)} EGP</span>
                                    </div>
                                    <div className="deposit-preview-row deposit-preview-total">
                                        <span>New Balance:</span>
                                        <strong>
                                            {(parseFloat(depositCustomer.deposite || '0') + parseFloat(depositAmount || '0')).toFixed(2)} EGP
                                        </strong>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Note (optional)</label>
                                <input
                                    placeholder="e.g., Cash payment, Bank transfer..."
                                    value={depositNote}
                                    onChange={(e) => setDepositNote(e.target.value)}
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" title='Close' className="btn" onClick={() => setShowDepositModal(false)}>Cancel</button>
                                <button type="submit" title='PlusCircle' className="btn btn-primary">
                                    <PlusCircle size={14} /> Add Deposit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== DEPOSIT HISTORY MODAL ===== */}
            {showHistoryModal && historyCustomer && (
                <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><History size={18} /> Deposit History</h2>
                            <button type="button" title='Close' className="btn-icon" onClick={() => setShowHistoryModal(false)}><X size={20} /></button>
                        </div>

                        <div className="deposit-modal-customer">
                            <div className="customer-avatar">
                                {historyCustomer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <strong>{historyCustomer.name}</strong>
                                <p className="deposit-current">
                                    Current Balance: <span className="text-green">
                                        {parseFloat(historyCustomer.deposite || '0').toFixed(2)} EGP
                                    </span>
                                </p>
                            </div>
                        </div>

                        {historyLoading ? (
                            <div className="loading">Loading history...</div>
                        ) : history.length === 0 ? (
                            <div className="empty-history">
                                <Wallet size={32} />
                                <p>No deposit history yet</p>
                            </div>
                        ) : (
                            <div className="history-list">
                                {history.map((h) => {
                                    const isAdd = h.type === 'add';
                                    return (
                                        <div key={h.$id} className={`history-item ${isAdd ? 'history-add' : 'history-use'}`}>
                                            <div className="history-icon">
                                                {isAdd ? <ArrowUpCircle size={20} /> : <MinusCircle size={20} />}
                                            </div>
                                            <div className="history-info">
                                                <span className="history-note">{h.note || (isAdd ? 'Deposit added' : 'Used in order')}</span>
                                                <span className="history-date">
                                                    {new Date(h.$createdAt).toLocaleDateString()} •{' '}
                                                    {new Date(h.$createdAt).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className={`history-amount ${isAdd ? 'text-green' : 'text-danger'}`}>
                                                {isAdd ? '+' : '−'}{parseFloat(h.amount).toFixed(2)} EGP
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Summary */}
                        {history.length > 0 && (
                            <div className="history-summary">
                                <div className="history-summary-item">
                                    <span>Total Added:</span>
                                    <strong className="text-green">
                                        {history
                                            .filter((h) => h.type === 'add')
                                            .reduce((sum, h) => sum + parseFloat(h.amount), 0)
                                            .toFixed(2)} EGP
                                    </strong>
                                </div>
                                <div className="history-summary-item">
                                    <span>Total Used:</span>
                                    <strong className="text-danger">
                                        {history
                                            .filter((h) => h.type === 'use')
                                            .reduce((sum, h) => sum + parseFloat(h.amount), 0)
                                            .toFixed(2)} EGP
                                    </strong>
                                </div>
                                <div className="history-summary-item history-summary-balance">
                                    <span>Current Balance:</span>
                                    <strong className="text-green">
                                        {parseFloat(historyCustomer.deposite || '0').toFixed(2)} EGP
                                    </strong>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {showUseDepositModal && useDepositCustomer && (
                <div className="modal-overlay" onClick={() => setShowUseDepositModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><MinusCircle size={18} /> Use Deposit</h2>
                            <button type="button" title="Close" className="btn-icon"
                                onClick={() => setShowUseDepositModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="deposit-modal-customer">
                            <div className="customer-avatar">
                                {useDepositCustomer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <strong>{useDepositCustomer.name}</strong>
                                <p className="deposit-current">
                                    Available Deposit: <span className="text-green">
                                        {parseFloat(useDepositCustomer.deposite || '0').toFixed(2)} EGP
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Show unpaid orders for this customer
                        {(() => {
                            const unpaidOrders = orders.filter(
                                (o) => o.client === useDepositCustomer.name && o.is_paid !== 'yes'
                            );
                            if (unpaidOrders.length === 0) return null;

                            return (
                                <div className="form-group">
                                    <label>Apply to Order (optional)</label>
                                    <select
                                        title='Select'
                                        value={selectedOrderId || ''}
                                        onChange={(e) => {
                                            setSelectedOrderId(e.target.value || null);
                                            if (e.target.value) {
                                                const order = unpaidOrders.find(o => o.$id === e.target.value);
                                                if (order) {
                                                    setUseDepositAmount(order.price_egp || '');
                                                    setUseDepositNote(`Payment for order #${order.$id.slice(-6)}`);
                                                }
                                            }
                                        }}
                                    >
                                        <option value="">-- No specific order --</option>
                                        {unpaidOrders.map((o) => (
                                            <option key={o.$id} value={o.$id}>
                                                Order #{o.$id.slice(-6)} — {parseFloat(o.price_egp || '0').toFixed(2)} EGP
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })()} */}

                        <form onSubmit={handleUseDeposit}>
                            <div className="form-group">
                                <label><Wallet size={14} /> Amount to Deduct (EGP) *</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={useDepositCustomer.deposite || '0'}
                                    placeholder="Enter amount to use"
                                    value={useDepositAmount}
                                    onChange={(e) => setUseDepositAmount(e.target.value)}
                                />
                            </div>

                            {useDepositAmount && (
                                <div className="deposit-preview">
                                    <div className="deposit-preview-row">
                                        <span>Current Balance:</span>
                                        <span>{parseFloat(useDepositCustomer.deposite || '0').toFixed(2)} EGP</span>
                                    </div>
                                    <div className="deposit-preview-row text-danger">
                                        <span>Deducting:</span>
                                        <span>-{parseFloat(useDepositAmount || '0').toFixed(2)} EGP</span>
                                    </div>
                                    <div className="deposit-preview-row deposit-preview-total">
                                        <span>Remaining:</span>
                                        <strong className={
                                            (parseFloat(useDepositCustomer.deposite || '0') - parseFloat(useDepositAmount || '0')) < 0
                                                ? 'text-danger'
                                                : 'text-green'
                                        }>
                                            {(parseFloat(useDepositCustomer.deposite || '0') - parseFloat(useDepositAmount || '0')).toFixed(2)} EGP
                                        </strong>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Note (optional)</label>
                                <input
                                    placeholder="e.g., Payment for order, Refund..."
                                    value={useDepositNote}
                                    onChange={(e) => setUseDepositNote(e.target.value)}
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn"
                                    onClick={() => setShowUseDepositModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-danger">
                                    <MinusCircle size={14} /> Deduct Deposit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}