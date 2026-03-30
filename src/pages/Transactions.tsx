import { useState, useCallback, useRef } from 'react';
import {
    X, Trash2, Edit, DollarSign,
    ArrowUpCircle, ArrowDownCircle, CreditCard, Smartphone, Banknote,
    User, FileText, Image, Upload, Eye, Filter, Calendar,
    Receipt, PieChart,
} from 'lucide-react';
import { transactionService } from '../services/transactionService';
import { useCollection } from '../hooks/useCollection';
import { usePagination } from '../lib/hooks/usePagination';
import Pagination from '../components/Pagination';
import type {
    Transaction,
    TransactionForm,
    TransactionType,
    PaymentMethod,
    TransactionCategory,
} from '../types';

// ========== CONFIG ==========
const paymentMethodConfig: Record<PaymentMethod, { label: string; icon: typeof CreditCard; color: string; bg: string }> = {
    instapay: { label: 'InstaPay', icon: CreditCard, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    vodafone_cash: { label: 'Vodafone Cash', icon: Smartphone, color: '#e11d48', bg: 'rgba(225,29,72,0.1)' },
    cash: { label: 'Cash', icon: Banknote, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

const categoryConfig: Record<TransactionCategory, { label: string; color: string }> = {
    store_payment: { label: 'Store Payment', color: '#f59e0b' },
    customer_payment: { label: 'Customer Payment', color: '#10b981' },
    shipping: { label: 'Shipping', color: '#3b82f6' },
    refund: { label: 'Refund', color: '#ef4444' },
    other: { label: 'Other', color: '#8b5cf6' },
};

const emptyForm: TransactionForm = {
    type: 'expense',
    category: 'store_payment',
    description: '',
    amount: '',
    payment_method: 'cash',
    person: '',
    receipt_id: '',
    note: '',
};

type FilterType = 'all' | TransactionType;
type FilterMethod = 'all' | PaymentMethod;

export default function Transactions() {
    const { data: transactions, loading, error, refetch } = useCollection<Transaction>({
        fetchFn: useCallback(() => transactionService.listAll(), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<TransactionForm>(emptyForm);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [filterMethod, setFilterMethod] = useState<FilterMethod>('all');
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ========== FINANCIAL SUMMARY ==========
    const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const totalExpense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const netBalance = totalIncome - totalExpense;

    // By payment method
    const byMethod = (Object.keys(paymentMethodConfig) as PaymentMethod[]).map((method) => {
        const methodTransactions = transactions.filter((t) => t.payment_method === method);
        const income = methodTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const expense = methodTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        return { method, count: methodTransactions.length, income, expense, net: income - expense };
    });

    // By category
    const byCategory = (Object.keys(categoryConfig) as TransactionCategory[]).map((cat) => {
        const catTransactions = transactions.filter((t) => t.category === cat);
        const total = catTransactions.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        return { category: cat, count: catTransactions.length, total };
    }).filter((c) => c.count > 0);

    // ========== FILTERING ==========
    const filteredTransactions = transactions.filter((t) => {
        const matchesSearch =
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.person.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || t.type === filterType;
        const matchesMethod = filterMethod === 'all' || t.payment_method === filterMethod;
        return matchesSearch && matchesType && matchesMethod;
    });

    const {
        currentPage, totalPages, paginatedData, nextPage, prevPage,
        goToPage, startIndex, endIndex, itemsPerPage, setItemsPerPage,
    } = usePagination({ data: filteredTransactions, itemsPerPage: 15 });

    // ========== HANDLERS ==========
    const openCreate = (type: TransactionType = 'expense') => {
        setForm({
            ...emptyForm,
            type,
            category: type === 'income' ? 'customer_payment' : 'store_payment',
        });
        setEditingId(null);
        setReceiptFile(null);
        setReceiptPreview(null);
        setShowModal(true);
    };

    const openEdit = (t: Transaction) => {
        setForm({
            type: t.type,
            category: t.category,
            description: t.description,
            amount: t.amount,
            payment_method: t.payment_method,
            person: t.person,
            receipt_id: t.receipt_id || '',
            note: t.note || '',
        });
        setEditingId(t.$id);
        setReceiptFile(null);
        setReceiptPreview(t.receipt_id ? transactionService.getReceiptPreview(t.receipt_id) : null);
        setShowModal(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setReceiptFile(file);
        // Local preview
        const reader = new FileReader();
        reader.onload = () => setReceiptPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let receiptId = form.receipt_id || '';

            // Upload new receipt if selected
            if (receiptFile) {
                // Delete old receipt if replacing
                if (editingId && form.receipt_id) {
                    try {
                        await transactionService.deleteReceipt(form.receipt_id);
                    } catch { /* ignore */ }
                }
                receiptId = await transactionService.uploadReceipt(receiptFile);
            }

            const submitData: TransactionForm = {
                ...form,
                receipt_id: receiptId,
            };

            if (editingId) {
                await transactionService.update(editingId, submitData);
            } else {
                await transactionService.create(submitData);
            }

            setShowModal(false);
            setReceiptFile(null);
            setReceiptPreview(null);
            refetch();
        } catch (err) {
            console.error('Failed to save transaction:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (t: Transaction) => {
        if (!confirm('Delete this transaction?')) return;
        await transactionService.remove(t.$id);
        refetch();
    };

    if (loading) return <div className="loading">Loading transactions...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1><Receipt size={24} /> Transactions ({transactions.length})</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn" onClick={() => openCreate('expense')}
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <ArrowDownCircle size={16} /> Add Expense
                    </button>
                    <button className="btn" onClick={() => openCreate('income')}
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <ArrowUpCircle size={16} /> Add Income
                    </button>
                </div>
            </div>

            {/* ========== FINANCIAL SUMMARY TABLE ========== */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <PieChart size={20} /> Financial Summary
                </h2>

                <div className="stat-grid">
                    <div className="stat-card">
                        <div className="stat-icon green"><ArrowUpCircle size={24} /></div>
                        <div>
                            <p className="stat-label">Total Income</p>
                            <p className="stat-value text-green">{totalIncome.toFixed(2)} EGP</p>
                            <p style={{ fontSize: '11px', color: '#888' }}>
                                From customers
                            </p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon red"><ArrowDownCircle size={24} /></div>
                        <div>
                            <p className="stat-label">Total Expenses</p>
                            <p className="stat-value text-danger">{totalExpense.toFixed(2)} EGP</p>
                            <p style={{ fontSize: '11px', color: '#888' }}>
                                Paid to stores & shipping
                            </p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className={`stat-icon ${netBalance >= 0 ? 'green' : 'red'}`}>
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Net Balance</p>
                            <p className={`stat-value ${netBalance >= 0 ? 'text-green' : 'text-danger'}`}>
                                {netBalance.toFixed(2)} EGP
                            </p>
                            <p style={{ fontSize: '11px', color: '#888' }}>
                                {netBalance >= 0 ? 'Profit' : 'Loss'}
                            </p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon blue"><Receipt size={24} /></div>
                        <div>
                            <p className="stat-label">Total Transactions</p>
                            <p className="stat-value">{transactions.length}</p>
                        </div>
                    </div>
                </div>

                {/* Payment Method Breakdown */}
                <h3 style={{ margin: '20px 0 12px', fontSize: '15px', color: '#ccc' }}>
                    💳 By Payment Method
                </h3>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Method</th>
                                <th>Transactions</th>
                                <th>Income</th>
                                <th>Expenses</th>
                                <th>Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byMethod.map((m) => {
                                const config = paymentMethodConfig[m.method];
                                const Icon = config.icon;
                                return (
                                    <tr key={m.method}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    width: '30px', height: '30px', borderRadius: '8px',
                                                    background: config.bg, display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Icon size={16} style={{ color: config.color }} />
                                                </div>
                                                <span>{config.label}</span>
                                            </div>
                                        </td>
                                        <td>{m.count}</td>
                                        <td className="text-green">{m.income.toFixed(2)}</td>
                                        <td className="text-danger">{m.expense.toFixed(2)}</td>
                                        <td>
                                            <strong className={m.net >= 0 ? 'text-green' : 'text-danger'}>
                                                {m.net.toFixed(2)}
                                            </strong>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Category Breakdown */}
                {byCategory.length > 0 && (
                    <>
                        <h3 style={{ margin: '20px 0 12px', fontSize: '15px', color: '#ccc' }}>
                            📂 By Category
                        </h3>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {byCategory.map((c) => {
                                const config = categoryConfig[c.category];
                                return (
                                    <div key={c.category} style={{
                                        padding: '12px 16px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${config.color}33`,
                                        minWidth: '150px',
                                    }}>
                                        <div style={{ fontSize: '12px', color: config.color, fontWeight: 600 }}>
                                            {config.label}
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '4px 0' }}>
                                            {c.total.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#888' }}>
                                            {c.count} transaction{c.count > 1 ? 's' : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* ========== FILTER TABS ========== */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 0', flexWrap: 'wrap', alignItems: 'center' }}>
                <Filter size={16} style={{ color: '#888' }} />

                {/* Type filter */}
                {(['all', 'income', 'expense'] as FilterType[]).map((type) => {
                    const isActive = filterType === type;
                    const colors: Record<string, string> = { all: '#6366f1', income: '#10b981', expense: '#ef4444' };
                    const labels: Record<string, string> = { all: 'All', income: '↑ Income', expense: '↓ Expenses' };
                    return (
                        <button key={type} onClick={() => setFilterType(type)} style={{
                            padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                            border: `2px solid ${isActive ? colors[type] : 'rgba(255,255,255,0.1)'}`,
                            background: isActive ? `${colors[type]}20` : 'transparent',
                            color: isActive ? colors[type] : '#888', cursor: 'pointer',
                        }}>
                            {labels[type]}
                        </button>
                    );
                })}

                <span style={{ color: '#555', margin: '0 4px' }}>|</span>

                {/* Method filter */}
                <button onClick={() => setFilterMethod('all')} style={{
                    padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                    border: `2px solid ${filterMethod === 'all' ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                    background: filterMethod === 'all' ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: filterMethod === 'all' ? '#6366f1' : '#888', cursor: 'pointer',
                }}>
                    All Methods
                </button>
                {(Object.keys(paymentMethodConfig) as PaymentMethod[]).map((method) => {
                    const config = paymentMethodConfig[method];
                    const isActive = filterMethod === method;
                    const Icon = config.icon;
                    return (
                        <button key={method} onClick={() => setFilterMethod(method)} style={{
                            padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                            border: `2px solid ${isActive ? config.color : 'rgba(255,255,255,0.1)'}`,
                            background: isActive ? config.bg : 'transparent',
                            color: isActive ? config.color : '#888', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px',
                        }}>
                            <Icon size={13} /> {config.label}
                        </button>
                    );
                })}
            </div>

            {/* ========== TRANSACTIONS TABLE ========== */}
            <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 Transaction Log
                </h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Person</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Receipt</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((t) => {
                                const methodConfig = paymentMethodConfig[t.payment_method];
                                const catConfig = categoryConfig[t.category];
                                const MethodIcon = methodConfig.icon;
                                const isIncome = t.type === 'income';

                                return (
                                    <tr key={t.$id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                <Calendar size={13} style={{ color: '#888' }} />
                                                <div>
                                                    <div style={{ fontSize: '13px' }}>
                                                        {new Date(t.$createdAt).toLocaleDateString()}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#888' }}>
                                                        {new Date(t.$createdAt).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                background: isIncome ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: isIncome ? '#10b981' : '#ef4444',
                                                border: `1px solid ${isIncome ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                            }}>
                                                {isIncome ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                                                {isIncome ? 'Income' : 'Expense'}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: '8px', fontSize: '11px',
                                                fontWeight: 600, color: catConfig.color,
                                                background: `${catConfig.color}15`,
                                            }}>
                                                {catConfig.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{t.description}</div>
                                                {t.note && (
                                                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                                        {t.note}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <User size={13} style={{ color: '#888' }} />
                                                <span>{t.person}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <strong className={isIncome ? 'text-green' : 'text-danger'}
                                                style={{ fontSize: '15px' }}>
                                                {isIncome ? '+' : '-'}{parseFloat(t.amount).toFixed(2)}
                                            </strong>
                                            <span style={{ fontSize: '11px', color: '#888', marginLeft: '3px' }}>EGP</span>
                                        </td>
                                        <td>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                padding: '4px 10px', borderRadius: '8px',
                                                background: methodConfig.bg,
                                                color: methodConfig.color, fontSize: '12px', fontWeight: 600,
                                            }}>
                                                <MethodIcon size={13} />
                                                {methodConfig.label}
                                            </div>
                                        </td>
                                        <td>
                                            {t.receipt_id ? (
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => setViewingReceipt(t.receipt_id!)}
                                                    title="View Receipt"
                                                    style={{ color: '#3b82f6' }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            ) : (
                                                <span style={{ color: '#555', fontSize: '12px' }}>—</span>
                                            )}
                                        </td>
                                        <td className="actions">
                                            <button className="btn-icon" onClick={() => openEdit(t)} title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon danger" onClick={() => handleDelete(t)} title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredTransactions.length === 0 && (
                    <div className="empty-state"><p>No transactions found</p></div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredTransactions.length}
                startIndex={startIndex}
                endIndex={endIndex}
                itemsPerPage={itemsPerPage}
                onNext={nextPage}
                onPrev={prevPage}
                onGoToPage={goToPage}
                onItemsPerPageChange={setItemsPerPage}
            />

            {/* ========== CREATE/EDIT MODAL ========== */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Transaction' : 'New Transaction'}</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {/* Type Toggle */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <button type="button" onClick={() => setForm({ ...form, type: 'expense', category: 'store_payment' })}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer',
                                        border: `2px solid ${form.type === 'expense' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                        background: form.type === 'expense' ? 'rgba(239,68,68,0.1)' : 'transparent',
                                        color: form.type === 'expense' ? '#ef4444' : '#888',
                                        fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    }}>
                                    <ArrowDownCircle size={18} /> Expense
                                </button>
                                <button type="button" onClick={() => setForm({ ...form, type: 'income', category: 'customer_payment' })}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer',
                                        border: `2px solid ${form.type === 'income' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                                        background: form.type === 'income' ? 'rgba(16,185,129,0.1)' : 'transparent',
                                        color: form.type === 'income' ? '#10b981' : '#888',
                                        fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    }}>
                                    <ArrowUpCircle size={18} /> Income
                                </button>
                            </div>

                            {/* Category */}
                            <div className="form-group">
                                <label><FileText size={14} /> Category *</label>
                                <select title='select' value={form.category} required
                                    onChange={(e) => setForm({ ...form, category: e.target.value as TransactionCategory })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {form.type === 'expense' ? (
                                        <>
                                            <option value="store_payment">Store Payment</option>
                                            <option value="shipping">Shipping</option>
                                            <option value="other">Other</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="customer_payment">Customer Payment</option>
                                            <option value="refund">Refund</option>
                                            <option value="other">Other</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label><FileText size={14} /> Description *</label>
                                <input required placeholder="What was this transaction for?" value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>

                            <div className="form-row">
                                {/* Amount */}
                                <div className="form-group">
                                    <label><DollarSign size={14} /> Amount (EGP) *</label>
                                    <input required placeholder="0.00" value={form.amount} type="number" step="0.01"
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                                </div>

                                {/* Person */}
                                <div className="form-group">
                                    <label><User size={14} /> Person *</label>
                                    <input required placeholder="Who made this transaction?" value={form.person}
                                        onChange={(e) => setForm({ ...form, person: e.target.value })} />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="form-group">
                                <label><CreditCard size={14} /> Payment Method *</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(Object.keys(paymentMethodConfig) as PaymentMethod[]).map((method) => {
                                        const config = paymentMethodConfig[method];
                                        const Icon = config.icon;
                                        const isSelected = form.payment_method === method;
                                        return (
                                            <button key={method} type="button"
                                                onClick={() => setForm({ ...form, payment_method: method })}
                                                style={{
                                                    flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
                                                    border: `2px solid ${isSelected ? config.color : 'rgba(255,255,255,0.1)'}`,
                                                    background: isSelected ? config.bg : 'transparent',
                                                    color: isSelected ? config.color : '#888',
                                                    fontWeight: 600, display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', gap: '6px', fontSize: '12px',
                                                    transition: 'all 0.2s',
                                                }}>
                                                <Icon size={20} />
                                                {config.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Note */}
                            <div className="form-group">
                                <label><FileText size={14} /> Note (optional)</label>
                                <textarea placeholder="Additional notes..." value={form.note}
                                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px', minHeight: '60px',
                                        background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                                        resize: 'vertical',
                                    }} />
                            </div>

                            {/* Receipt Upload */}
                            <div className="form-group">
                                <label className='flex flex-row items-center gap-2'><Image size={14} /> Receipt Image (optional)</label>
                                <div style={{
                                    border: '2px dashed rgba(255,255,255,0.15)',
                                    borderRadius: '10px', padding: '16px', textAlign: 'center',
                                    cursor: 'pointer', transition: 'border-color 0.2s',
                                }}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
                                    onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                        const file = e.dataTransfer.files[0];
                                        if (file) {
                                            setReceiptFile(file);
                                            const reader = new FileReader();
                                            reader.onload = () => setReceiptPreview(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                >
                                    <input title='File Ref' ref={fileInputRef} type="file" accept="image/*,.pdf" className='hidden'
                                        onChange={handleFileSelect} />

                                    {receiptPreview ? (
                                        <div>
                                            <img src={receiptPreview} alt="Receipt preview"
                                                className='mx-auto! max-w-50 max-h-37.5 rounded-lg mb-2'
                                            />
                                            <div style={{ fontSize: '12px', color: '#888' }}>
                                                {receiptFile ? receiptFile.name : 'Current receipt'}
                                            </div>
                                            <button type="button" onClick={(e) => {
                                                e.stopPropagation();
                                                setReceiptFile(null);
                                                setReceiptPreview(null);
                                                setForm({ ...form, receipt_id: '' });
                                            }} style={{
                                                marginTop: '8px', padding: '4px 12px', borderRadius: '6px',
                                                border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)',
                                                color: '#ef4444', cursor: 'pointer', fontSize: '12px',
                                            }}>
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <Upload size={32} style={{ color: '#555', marginBottom: '8px' }} />
                                            <div style={{ color: '#888', fontSize: '13px' }}>
                                                Click or drag & drop to upload receipt
                                            </div>
                                            <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>
                                                JPG, PNG, WebP, PDF — Max 10MB
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={uploading}>
                                    {uploading ? 'Uploading...' : editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========== RECEIPT VIEWER MODAL ========== */}
            {viewingReceipt && (
                <div className="modal-overlay" onClick={() => setViewingReceipt(null)}>
                    <div className="modal max-w-150 text-center flex flex-col items-center" onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header w-full">
                            <h2 className='flex flex-row items-center gap-2'><Image size={18} /> Receipt</h2>
                            <button title='close' type="button" className="btn-icon" onClick={() => setViewingReceipt(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <img
                            src={transactionService.getReceiptView(viewingReceipt)}
                            alt="Receipt"
                            className=' object-contain max-w-75 max-h-125 rounded-[10px] mx-auto '
                            onError={(e) => {
                                // ✅ Fallback if image fails
                                (e.target as HTMLImageElement).style.display = 'none';
                                console.error('Failed to load receipt image');
                            }}
                        />
                        <div className='flex items-center justify-center gap-2 p-4'>
                            <a
                                href={transactionService.getReceiptView(viewingReceipt)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                            >
                                <Eye size={14} /> Open Full Size
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}