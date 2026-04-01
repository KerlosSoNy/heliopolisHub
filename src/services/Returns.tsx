import { useState, useCallback, useMemo } from 'react';
import {
    Plus, X, Edit, Trash2, Search, Filter,
    Package, DollarSign, User, AlertTriangle,
    RefreshCw, RotateCcw,
    Clock, TrendingDown,
    Eye, Truck, Hash,
    ThumbsUp, ThumbsDown,
    PackageX, AlertOctagon, HelpCircle, Heart,
    Ban, CreditCard,
} from 'lucide-react';
import { returnService } from '../services/returnService';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { useCollection } from '../hooks/useCollection';
import { usePagination } from '../lib/hooks/usePagination';
import Pagination from '../components/Pagination';
import type { Return, ReturnForm, Product, Order } from '../types';

// ✅ Reason categories config
const reasonCategories = {
    defective: { label: 'Defective / Broken', icon: AlertOctagon, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    wrong_item: { label: 'Wrong Item Sent', icon: PackageX, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    not_as_described: { label: 'Not as Described', icon: HelpCircle, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    changed_mind: { label: 'Changed Mind', icon: Heart, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    damaged_shipping: { label: 'Damaged in Shipping', icon: Truck, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
    other: { label: 'Other', icon: HelpCircle, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

// ✅ Status config
const statusConfig = {
    pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: Clock },
    approved: { label: 'Approved', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: ThumbsUp },
    rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: ThumbsDown },
    refunded: { label: 'Refunded', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: CreditCard },
    replaced: { label: 'Replaced', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', icon: RefreshCw },
};

// ✅ Action config
const actionConfig = {
    refund: { label: 'Refund', color: '#10b981', icon: DollarSign },
    replace: { label: 'Replace', color: '#3b82f6', icon: RefreshCw },
    store_credit: { label: 'Store Credit', color: '#8b5cf6', icon: CreditCard },
    none: { label: 'No Action', color: '#6b7280', icon: Ban },
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'refunded' | 'replaced';

const emptyForm: ReturnForm = {
    product_id: '',
    product_name: '',
    order_id: '',
    client: '',
    quantity: 1,
    reason: '',
    reason_category: 'defective',
    status: 'pending',
    refund_amount: '',
    original_price: '',
    action: 'none',
    restock: false,
    note: '',
    resolved_at: '',
};

export default function Returns() {
    const { data: returns, loading, error, refetch } = useCollection<Return>({
        fetchFn: useCallback(() => returnService.listAll(), []),
    });

    const { data: products } = useCollection<Product>({
        fetchFn: useCallback(() => productService.listAll(), []),
    });

    const { data: orders } = useCollection<Order>({
        fetchFn: useCallback(() => orderService.listAll(), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState<Return | null>(null);
    const [showApproveModal, setShowApproveModal] = useState<Return | null>(null);
    const [showRejectModal, setShowRejectModal] = useState<Return | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ReturnForm>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [reasonFilter, setReasonFilter] = useState<string>('all');
    const [customerFilter, setCustomerFilter] = useState<string>('all');

    // Approve modal state
    const [approveAction, setApproveAction] = useState<string>('refund');
    const [approveRefundAmount, setApproveRefundAmount] = useState('');
    const [approveRestock, setApproveRestock] = useState(true);

    // Reject modal state
    const [rejectNote, setRejectNote] = useState('');

    // ✅ Unique customers from returns
    const uniqueCustomers = useMemo(() => {
        const set = new Set<string>();
        returns.forEach((r) => {
            if (r.client) set.add(r.client);
        });
        return Array.from(set).sort();
    }, [returns]);

    // ✅ Status counts
    const statusCounts = useMemo(() => ({
        all: returns.length,
        pending: returns.filter((r) => r.status === 'pending').length,
        approved: returns.filter((r) => r.status === 'approved').length,
        rejected: returns.filter((r) => r.status === 'rejected').length,
        refunded: returns.filter((r) => r.status === 'refunded').length,
        replaced: returns.filter((r) => r.status === 'replaced').length,
    }), [returns]);

    // ✅ Stats
    const stats = useMemo(() => {
        const totalRefunded = returns
            .filter((r) => r.status === 'refunded' || r.status === 'approved')
            .reduce((sum, r) => sum + (r.refund_amount || 0), 0);

        const totalOriginal = returns.reduce((sum, r) => sum + (r.original_price || 0) * (r.quantity || 1), 0);

        const totalQuantity = returns.reduce((sum, r) => sum + (r.quantity || 1), 0);

        const returnRate = products.length > 0
            ? ((returns.length / products.length) * 100)
            : 0;

        // Most returned product
        const productCounts: Record<string, number> = {};
        returns.forEach((r) => {
            productCounts[r.product_name] = (productCounts[r.product_name] || 0) + r.quantity;
        });
        const mostReturned = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

        // Most common reason
        const reasonCounts: Record<string, number> = {};
        returns.forEach((r) => {
            reasonCounts[r.reason_category] = (reasonCounts[r.reason_category] || 0) + 1;
        });
        const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];

        return {
            totalReturns: returns.length,
            totalRefunded,
            totalOriginal,
            totalQuantity,
            returnRate,
            mostReturned: mostReturned ? { name: mostReturned[0], count: mostReturned[1] } : null,
            topReason: topReason ? { category: topReason[0], count: topReason[1] } : null,
            avgRefund: returns.length > 0 ? totalRefunded / returns.filter((r) => r.refund_amount > 0).length : 0,
        };
    }, [returns, products]);

    // ✅ Filtered returns
    const filteredReturns = useMemo(() => {
        return returns.filter((r) => {
            const matchesSearch =
                r.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.reason.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (reasonFilter !== 'all' && r.reason_category !== reasonFilter) return false;
            if (customerFilter !== 'all' && r.client !== customerFilter) return false;

            return true;
        });
    }, [returns, searchTerm, statusFilter, reasonFilter, customerFilter]);

    const {
        currentPage,
        totalPages,
        paginatedData: paginatedReturns,
        nextPage,
        prevPage,
        goToPage,
        startIndex,
        endIndex,
        itemsPerPage,
        setItemsPerPage,
    } = usePagination({
        data: filteredReturns,
        itemsPerPage: 10,
    });

    // ✅ Handlers
    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (ret: Return) => {
        setForm({
            product_id: ret.product_id,
            product_name: ret.product_name,
            order_id: ret.order_id || '',
            client: ret.client,
            quantity: ret.quantity,
            reason: ret.reason,
            reason_category: ret.reason_category,
            status: ret.status,
            refund_amount: ret.refund_amount || '',
            original_price: ret.original_price || '',
            action: ret.action,
            restock: ret.restock,
            note: ret.note || '',
            resolved_at: ret.resolved_at || '',
        });
        setEditingId(ret.$id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await returnService.update(editingId, form);
            } else {
                await returnService.create(form);
            }
            setShowModal(false);
            refetch();
        } catch (err) {
            console.error('Failed to save return:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this return request?')) return;
        try {
            await returnService.remove(id);
            refetch();
        } catch (err) {
            console.error('Failed to delete return:', err);
        }
    };

    const handleApprove = async () => {
        if (!showApproveModal) return;
        try {
            await returnService.approve(
                showApproveModal.$id,
                approveAction,
                parseFloat(approveRefundAmount) || 0,
                approveRestock
            );
            setShowApproveModal(null);
            refetch();
        } catch (err) {
            console.error('Failed to approve return:', err);
        }
    };

    const handleReject = async () => {
        if (!showRejectModal) return;
        try {
            await returnService.reject(showRejectModal.$id, rejectNote);
            setShowRejectModal(null);
            setRejectNote('');
            refetch();
        } catch (err) {
            console.error('Failed to reject return:', err);
        }
    };

    const handleMarkRefunded = async (id: string) => {
        try {
            await returnService.markRefunded(id);
            refetch();
        } catch (err) {
            console.error('Failed to mark as refunded:', err);
        }
    };

    const handleMarkReplaced = async (id: string) => {
        try {
            await returnService.markReplaced(id);
            refetch();
        } catch (err) {
            console.error('Failed to mark as replaced:', err);
        }
    };

    // ✅ When product is selected, auto-fill details
    const handleProductSelect = (productId: string) => {
        const product = products.find((p) => p.$id === productId);
        if (product) {
            const order = product.order_id ? orders.find((o) => o.$id === product.order_id) : null;
            setForm({
                ...form,
                product_id: product.$id,
                product_name: product.name,
                order_id: product.order_id || '',
                client: order?.client || form.client,
                original_price: product.sold_price || '',
            });
        }
    };

    if (loading) return <div className="loading">Loading returns...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>🔄 Returns & Refunds ({returns.length})</h1>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> New Return
                    </button>
                </div>
            </div>

            {/* ✅ Stats Grid */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                        <RotateCcw size={24} />
                    </div>
                    <div>
                        <p className="stat-label">Total Returns</p>
                        <p className="stat-value">{stats.totalReturns}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="stat-label">Pending</p>
                        <p className="stat-value" style={{ color: '#f59e0b' }}>{statusCounts.pending}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="stat-label">Total Refunded</p>
                        <p className="stat-value" style={{ color: '#10b981' }}>{stats.totalRefunded.toFixed(2)} EGP</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="stat-label">Return Rate</p>
                        <p className="stat-value" style={{ color: '#ef4444' }}>{stats.returnRate.toFixed(1)}%</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="stat-label">Items Returned</p>
                        <p className="stat-value">{stats.totalQuantity}</p>
                    </div>
                </div>
                {stats.topReason && (
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Top Reason</p>
                            <p className="stat-value" style={{ fontSize: '14px' }}>
                                {reasonCategories[stats.topReason.category as keyof typeof reasonCategories]?.label || stats.topReason.category}
                                <span style={{ fontSize: '12px', color: '#888' }}> ({stats.topReason.count})</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ Filters */}
            <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                        <Search size={16} style={{
                            position: 'absolute', left: '12px', top: '50%',
                            transform: 'translateY(-50%)', color: '#888',
                        }} />
                        <input
                            type="text"
                            placeholder="Search returns..."
                            className="search-input"
                            style={{ paddingLeft: '36px', width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        title="Filter by Status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="search-input"
                        style={{ minWidth: '180px' }}
                    >
                        <option value="all">All Status ({statusCounts.all})</option>
                        <option value="pending">⏳ Pending ({statusCounts.pending})</option>
                        <option value="approved">👍 Approved ({statusCounts.approved})</option>
                        <option value="rejected">👎 Rejected ({statusCounts.rejected})</option>
                        <option value="refunded">💰 Refunded ({statusCounts.refunded})</option>
                        <option value="replaced">🔄 Replaced ({statusCounts.replaced})</option>
                    </select>

                    {/* Reason Filter */}
                    <select
                        title="Filter by Reason"
                        value={reasonFilter}
                        onChange={(e) => setReasonFilter(e.target.value)}
                        className="search-input"
                        style={{ minWidth: '180px' }}
                    >
                        <option value="all">All Reasons</option>
                        {Object.entries(reasonCategories).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>

                    {/* Customer Filter */}
                    <select
                        title="Filter by Customer"
                        value={customerFilter}
                        onChange={(e) => setCustomerFilter(e.target.value)}
                        className="search-input"
                        style={{ minWidth: '160px' }}
                    >
                        <option value="all">All Customers</option>
                        {uniqueCustomers.map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>

                    {/* Clear */}
                    {(searchTerm || statusFilter !== 'all' || reasonFilter !== 'all' || customerFilter !== 'all') && (
                        <button className="btn btn-sm" onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setReasonFilter('all');
                            setCustomerFilter('all');
                        }}>
                            <X size={14} /> Clear
                        </button>
                    )}
                </div>

                {(statusFilter !== 'all' || reasonFilter !== 'all' || customerFilter !== 'all') && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Filter size={12} />
                        <span>Showing {filteredReturns.length} of {returns.length} returns</span>
                    </div>
                )}
            </div>

            {/* ✅ Returns Table */}
            <div className="card">
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Client</th>
                                <th>Qty</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Action</th>
                                <th>Original Price</th>
                                <th>Refund Amount</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedReturns.map((r) => {
                                const status = statusConfig[r.status as keyof typeof statusConfig] || statusConfig.pending;
                                const StatusIcon = status.icon;
                                const reason = reasonCategories[r.reason_category as keyof typeof reasonCategories] || reasonCategories.other;
                                const ReasonIcon = reason.icon;
                                const action = actionConfig[r.action as keyof typeof actionConfig] || actionConfig.none;
                                const ActionIcon = action.icon;

                                return (
                                    <tr key={r.$id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div className="table-avatar-product"><Package size={16} /></div>
                                                <div>
                                                    <span style={{ fontWeight: 600 }}>{r.product_name}</span>
                                                    {r.order_id && (
                                                        <div style={{ fontSize: '11px', color: '#888' }}>
                                                            Order #{r.order_id.slice(0, 8)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <User size={13} />
                                                {r.client}
                                            </div>
                                        </td>
                                        <td>
                                            <strong>{r.quantity}</strong>
                                        </td>
                                        <td>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                padding: '4px 10px', borderRadius: '8px', fontSize: '11px',
                                                fontWeight: 600, background: reason.bg, color: reason.color,
                                            }}>
                                                <ReasonIcon size={12} />
                                                {reason.label}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
                                                fontWeight: 600, background: status.bg, color: status.color,
                                                border: `1px solid ${status.border}`,
                                            }}>
                                                <StatusIcon size={12} />
                                                {status.label}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                fontSize: '12px', color: action.color,
                                            }}>
                                                <ActionIcon size={12} />
                                                {action.label}
                                            </div>
                                            {r.restock && (
                                                <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>
                                                    ✅ Restocked
                                                </div>
                                            )}
                                        </td>
                                        <td>{r.original_price > 0 ? `${r.original_price.toFixed(2)} EGP` : '—'}</td>
                                        <td>
                                            {r.refund_amount > 0 ? (
                                                <strong style={{ color: '#ef4444' }}>-{r.refund_amount.toFixed(2)} EGP</strong>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>
                                                {new Date(r.$createdAt).toLocaleDateString()}
                                            </div>
                                            {r.resolved_at && (
                                                <div style={{ fontSize: '10px', color: '#10b981' }}>
                                                    Resolved: {new Date(r.resolved_at).toLocaleDateString()}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {/* View Details */}
                                                <button
                                                    className="btn-icon"
                                                    title="View Details"
                                                    onClick={() => setShowDetailModal(r)}
                                                >
                                                    <Eye size={15} />
                                                </button>

                                                {/* Approve (only for pending) */}
                                                {r.status === 'pending' && (
                                                    <>
                                                        <button
                                                            className="btn-icon"
                                                            title="Approve"
                                                            onClick={() => {
                                                                setShowApproveModal(r);
                                                                setApproveRefundAmount(r.original_price?.toString() || '');
                                                                setApproveAction('refund');
                                                                setApproveRestock(true);
                                                            }}
                                                            style={{ color: '#10b981' }}
                                                        >
                                                            <ThumbsUp size={15} />
                                                        </button>
                                                        <button
                                                            className="btn-icon"
                                                            title="Reject"
                                                            onClick={() => setShowRejectModal(r)}
                                                            style={{ color: '#ef4444' }}
                                                        >
                                                            <ThumbsDown size={15} />
                                                        </button>
                                                    </>
                                                )}

                                                {/* Mark as refunded/replaced (only for approved) */}
                                                {r.status === 'approved' && r.action === 'refund' && (
                                                    <button
                                                        className="btn-icon"
                                                        title="Mark as Refunded"
                                                        onClick={() => handleMarkRefunded(r.$id)}
                                                        style={{ color: '#10b981' }}
                                                    >
                                                        <CreditCard size={15} />
                                                    </button>
                                                )}
                                                {r.status === 'approved' && r.action === 'replace' && (
                                                    <button
                                                        className="btn-icon"
                                                        title="Mark as Replaced"
                                                        onClick={() => handleMarkReplaced(r.$id)}
                                                        style={{ color: '#8b5cf6' }}
                                                    >
                                                        <RefreshCw size={15} />
                                                    </button>
                                                )}

                                                <button className="btn-icon" title="Edit" onClick={() => openEdit(r)}>
                                                    <Edit size={15} />
                                                </button>
                                                <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(r.$id)}>
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredReturns.length === 0 && (
                    <div className="empty-state">
                        <RotateCcw className='mx-auto!' size={48} style={{ color: '#444', marginBottom: '30px' }} />
                        <p>No returns found</p>
                    </div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredReturns.length}
                startIndex={startIndex}
                endIndex={endIndex}
                itemsPerPage={itemsPerPage}
                onNext={nextPage}
                onPrev={prevPage}
                onGoToPage={goToPage}
                onItemsPerPageChange={setItemsPerPage}
            />

            {/* ✅ Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Return' : 'New Return Request'}</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {/* Product Selection */}
                            <div className="form-group">
                                <label className="flex! flex-row! items-center gap-2">
                                    <Package size={14} /> Select Product *
                                </label>
                                <select
                                    title="Select Product"
                                    required
                                    value={form.product_id}
                                    onChange={(e) => handleProductSelect(e.target.value)}
                                    className="search-input"
                                    style={{ width: '100%' }}
                                >
                                    <option value="">— Choose a product —</option>
                                    {products.map((p) => (
                                        <option key={p.$id} value={p.$id}>
                                            {p.name} (Stock: {p.count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Client */}
                            <div className="form-group">
                                <label className="flex! flex-row! items-center gap-2">
                                    <User size={14} /> Client Name *
                                </label>
                                <input
                                    required
                                    placeholder="Customer name"
                                    value={form.client}
                                    onChange={(e) => setForm({ ...form, client: e.target.value })}
                                />
                            </div>

                            <div className="form-row">
                                {/* Quantity */}
                                <div className="form-group">
                                    <label className="flex! flex-row! items-center gap-2">
                                        <Hash size={14} /> Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        placeholder="1"
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                    />
                                </div>

                                {/* Original Price */}
                                <div className="form-group">
                                    <label className="flex! flex-row! items-center gap-2">
                                        <DollarSign size={14} /> Original Price/pc (EGP)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Original sold price"
                                        value={form.original_price}
                                        onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Reason Category */}
                            <div className="form-group">
                                <label className="flex! flex-row! items-center gap-2">
                                    <AlertTriangle size={14} /> Reason Category *
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {Object.entries(reasonCategories).map(([key, val]) => {
                                        const Icon = val.icon;
                                        const selected = form.reason_category === key;
                                        return (
                                            <label
                                                key={key}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                                                    fontSize: '13px', fontWeight: selected ? 600 : 400,
                                                    background: selected ? val.bg : 'transparent',
                                                    color: selected ? val.color : '#888',
                                                    border: `1px solid ${selected ? val.color : 'rgba(255,255,255,0.1)'}`,
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="reason_category"
                                                    value={key}
                                                    checked={selected}
                                                    onChange={(e) => setForm({ ...form, reason_category: e.target.value })}
                                                    style={{ display: 'none' }}
                                                />
                                                <Icon size={14} />
                                                {val.label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Reason Detail */}
                            <div className="form-group">
                                <label>Reason Details *</label>
                                <textarea
                                    required
                                    placeholder="Describe the issue in detail..."
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#fff', resize: 'vertical',
                                    }}
                                />
                            </div>

                            {/* Note */}
                            <div className="form-group">
                                <label>Internal Note (optional)</label>
                                <input
                                    placeholder="Internal note..."
                                    value={form.note}
                                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                                />
                            </div>

                            {/* Refund preview */}
                            {form.original_price && form.quantity && (
                                <div className="calc-preview">
                                    <span>Total value:</span>
                                    <strong>
                                        {(parseFloat(form.original_price as string) * parseInt(form.quantity as string)).toFixed(2)} EGP
                                    </strong>
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {editingId ? 'Update Return' : 'Submit Return'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ✅ Detail Modal */}
            {showDetailModal && (() => {
                const r = showDetailModal;
                const status = statusConfig[r.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = status.icon;
                const reason = reasonCategories[r.reason_category as keyof typeof reasonCategories] || reasonCategories.other;
                const ReasonIcon = reason.icon;
                const action = actionConfig[r.action as keyof typeof actionConfig] || actionConfig.none;
                const ActionIcon = action.icon;

                return (
                    <div className="modal-overlay" onClick={() => setShowDetailModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Return Details</h2>
                                <button type="button" title="Close" className="btn-icon" onClick={() => setShowDetailModal(null)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Status Badge */}
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', borderRadius: '12px', fontSize: '14px',
                                    fontWeight: 600, background: status.bg, color: status.color,
                                    border: `1px solid ${status.border}`, alignSelf: 'flex-start',
                                }}>
                                    <StatusIcon size={16} />
                                    {status.label}
                                </div>

                                {/* Product Info */}
                                <div style={{
                                    padding: '16px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}>
                                    <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Package size={16} /> {r.product_name}
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                                        <div><span style={{ color: '#888' }}>Client:</span> <strong>{r.client}</strong></div>
                                        <div><span style={{ color: '#888' }}>Quantity:</span> <strong>{r.quantity}</strong></div>
                                        <div><span style={{ color: '#888' }}>Original Price:</span> <strong>{r.original_price > 0 ? `${r.original_price.toFixed(2)} EGP` : '—'}</strong></div>
                                        <div><span style={{ color: '#888' }}>Refund Amount:</span> <strong style={{ color: '#ef4444' }}>{r.refund_amount > 0 ? `-${r.refund_amount.toFixed(2)} EGP` : '—'}</strong></div>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div style={{
                                    padding: '12px 16px', borderRadius: '10px',
                                    background: reason.bg, border: `1px solid ${reason.color}22`,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: reason.color, fontWeight: 600, marginBottom: '6px' }}>
                                        <ReasonIcon size={14} /> {reason.label}
                                    </div>
                                    <p style={{ color: '#ccc', fontSize: '13px' }}>{r.reason}</p>
                                </div>

                                {/* Action */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                    <span style={{ color: '#888' }}>Action:</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: action.color, fontWeight: 600 }}>
                                        <ActionIcon size={14} /> {action.label}
                                    </span>
                                    {r.restock && (
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '8px', fontSize: '11px',
                                            background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600,
                                        }}>
                                            ✅ Restocked
                                        </span>
                                    )}
                                </div>

                                {/* Note */}
                                {r.note && (
                                    <div style={{ fontSize: '13px', color: '#888' }}>
                                        <strong>Note:</strong> {r.note}
                                    </div>
                                )}

                                {/* Dates */}
                                <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '16px' }}>
                                    <span>Created: {new Date(r.$createdAt).toLocaleString()}</span>
                                    {r.resolved_at && <span>Resolved: {new Date(r.resolved_at).toLocaleString()}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ✅ Approve Modal */}
            {showApproveModal && (
                <div className="modal-overlay" onClick={() => setShowApproveModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Approve Return</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowApproveModal(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{
                                padding: '12px', borderRadius: '8px',
                                background: 'rgba(59,130,246,0.1)',
                                border: '1px solid rgba(59,130,246,0.2)',
                                fontSize: '13px',
                            }}>
                                <strong>{showApproveModal.product_name}</strong> × {showApproveModal.quantity}
                                <br />
                                <span style={{ color: '#888' }}>Client: {showApproveModal.client}</span>
                            </div>

                            {/* Action Selection */}
                            <div className="form-group">
                                <label style={{ fontWeight: 600, marginBottom: '8px' }}>Resolution Action</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {Object.entries(actionConfig).filter(([k]) => k !== 'none').map(([key, val]) => {
                                        const Icon = val.icon;
                                        const selected = approveAction === key;
                                        return (
                                            <label
                                                key={key}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
                                                    fontSize: '13px', fontWeight: selected ? 600 : 400,
                                                    background: selected ? `${val.color}15` : 'transparent',
                                                    color: selected ? val.color : '#888',
                                                    border: `1px solid ${selected ? val.color : 'rgba(255,255,255,0.1)'}`,
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="approve_action"
                                                    value={key}
                                                    checked={selected}
                                                    onChange={(e) => setApproveAction(e.target.value)}
                                                    style={{ display: 'none' }}
                                                />
                                                <Icon size={14} />
                                                {val.label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Refund Amount (only for refund/store_credit) */}
                            {(approveAction === 'refund' || approveAction === 'store_credit') && (
                                <div className="form-group">
                                    <label className="flex! flex-row! items-center gap-2">
                                        <DollarSign size={14} /> Refund Amount (EGP)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Refund amount"
                                        value={approveRefundAmount}
                                        onChange={(e) => setApproveRefundAmount(e.target.value)}
                                    />
                                    {showApproveModal.original_price > 0 && (
                                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                                            Original price: {showApproveModal.original_price.toFixed(2)} EGP ×
                                            {showApproveModal.quantity} = {(showApproveModal.original_price * showApproveModal.quantity).toFixed(2)} EGP
                                            <button
                                                type="button"
                                                className="btn btn-sm"
                                                style={{ marginLeft: '8px', fontSize: '11px' }}
                                                onClick={() => setApproveRefundAmount(
                                                    (showApproveModal.original_price * showApproveModal.quantity).toString()
                                                )}
                                            >
                                                Use Full Amount
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Restock */}
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                cursor: 'pointer', fontSize: '14px',
                                padding: '10px 14px', borderRadius: '8px',
                                background: approveRestock ? 'rgba(16,185,129,0.1)' : 'transparent',
                                color: approveRestock ? '#10b981' : '#888',
                                border: `1px solid ${approveRestock ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                                transition: 'all 0.2s',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={approveRestock}
                                    onChange={(e) => setApproveRestock(e.target.checked)}
                                    style={{ accentColor: '#10b981' }}
                                />
                                <Package size={16} />
                                Return items to stock (+{showApproveModal.quantity})
                            </label>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={() => setShowApproveModal(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleApprove}>
                                    <ThumbsUp size={14} /> Approve Return
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ Reject Modal */}
            {showRejectModal && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Reject Return</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowRejectModal(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{
                                padding: '12px', borderRadius: '8px',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                fontSize: '13px',
                            }}>
                                <strong>{showRejectModal.product_name}</strong> × {showRejectModal.quantity}
                                <br />
                                <span style={{ color: '#888' }}>Client: {showRejectModal.client}</span>
                                <br />
                                <span style={{ color: '#888' }}>Reason: {showRejectModal.reason}</span>
                            </div>

                            <div className="form-group">
                                <label>Rejection Reason *</label>
                                <textarea
                                    required
                                    placeholder="Why is this return being rejected?"
                                    value={rejectNote}
                                    onChange={(e) => setRejectNote(e.target.value)}
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#fff', resize: 'vertical',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={() => setShowRejectModal(null)}>Cancel</button>
                                <button
                                    className="btn"
                                    style={{ background: '#ef4444', color: '#fff' }}
                                    onClick={handleReject}
                                    disabled={!rejectNote}
                                >
                                    <ThumbsDown size={14} /> Reject Return
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}