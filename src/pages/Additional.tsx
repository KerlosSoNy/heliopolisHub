import { useState, useCallback } from 'react';
import {
    Trash2, Edit, Plus, X, FileText, DollarSign, Save,
} from 'lucide-react';
import { additionalService } from '../services/additionalService';
import { useCollection } from '../hooks/useCollection';
import type { Additional, AdditionalForm } from '../types';
import { usePagination } from '../lib/hooks/usePagination';
import Pagination from '../components/Pagination';

const emptyForm: AdditionalForm = {
    note: '',
    cost: '',
};

export default function AdditionalPage() {
    const { data: items, loading, error, refetch } = useCollection<Additional>({
        fetchFn: useCallback(() => additionalService.listAll(), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<AdditionalForm>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');

    // ========== HANDLERS ==========
    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (item: Additional) => {
        setForm({
            note: item.note,
            cost: item.cost,
        });
        setEditingId(item.$id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await additionalService.update(editingId, form);
            } else {
                await additionalService.create(form);
            }
            setShowModal(false);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this item?')) return;
        await additionalService.remove(id);
        refetch();
    };

    // ========== FILTERING & PAGINATION ==========
    const filteredItems = items.filter((item) =>
        item.note.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const {
        currentPage,
        totalPages,
        paginatedData,
        nextPage,
        prevPage,
        goToPage,
        startIndex,
        endIndex,
        itemsPerPage,
        setItemsPerPage,
    } = usePagination({
        data: filteredItems,
        itemsPerPage: 10,
    });

    // ========== TOTALS ==========
    const totalCost = items.reduce((sum, item) => {
        return sum + (parseFloat(item.cost) || 0);
    }, 0);

    if (loading) return <div className="loading">Loading additional costs...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <h1>Additional Costs ({items.length})</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search by note..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Cost
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><FileText size={24} /></div>
                    <div>
                        <p className="stat-label">Total Entries</p>
                        <p className="stat-value">{items.length}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Total Cost</p>
                        <p className="stat-value">{totalCost.toFixed(2)} EGP</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card mt-4">
                <h2>All Additional Costs</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Note</th>
                                <th>Cost (EGP)</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item) => (
                                <tr key={item.$id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="table-avatar-product"><FileText size={16} /></div>
                                            <span>{item.note}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <strong>{parseFloat(item.cost).toFixed(2)} EGP</strong>
                                    </td>
                                    <td>{new Date(item.$createdAt).toLocaleDateString()}</td>
                                    <td className="actions">
                                        <button
                                            title="Edit"
                                            type="button"
                                            className="btn-icon"
                                            onClick={() => openEdit(item)}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            title="Delete"
                                            type="button"
                                            className="btn-icon danger"
                                            onClick={() => handleDelete(item.$id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={4}>
                                        <div className="empty-state"><p>No additional costs found</p></div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {filteredItems.length > 0 && (
                            <tfoot>
                                <tr className="totals-row">
                                    <td><strong>TOTAL</strong></td>
                                    <td><strong>{totalCost.toFixed(2)} EGP</strong></td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredItems.length}
                startIndex={startIndex}
                endIndex={endIndex}
                itemsPerPage={itemsPerPage}
                onNext={nextPage}
                onPrev={prevPage}
                onGoToPage={goToPage}
                onItemsPerPageChange={setItemsPerPage}
            />

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Additional Cost' : 'New Additional Cost'}</h2>
                            <button
                                type="button"
                                title="Close"
                                className="btn-icon"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label><FileText size={14} /> Note *</label>
                                <input
                                    required
                                    placeholder="What is this cost for?"
                                    value={form.note}
                                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label><DollarSign size={14} /> Cost (EGP) *</label>
                                <input
                                    required
                                    placeholder="Amount in EGP"
                                    value={form.cost}
                                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={14} /> {editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}