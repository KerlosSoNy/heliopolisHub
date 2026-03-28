import { useState, useCallback } from 'react';
import { Trash2, Edit, Plus, X, Phone, User, Wallet } from 'lucide-react';
import { customerService } from '../services/customerService';
import { useCollection } from '../hooks/useCollection';
import type { Customer, CustomerForm } from '../types';

const emptyForm: CustomerForm = { name: '', phone: '', deposite: '' };

export default function Customers() {
    const { data: customers, loading, error, refetch } = useCollection<Customer>({
        fetchFn: useCallback(() => customerService.list(), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CustomerForm>(emptyForm);
    const [searchTerm, setSearchTerm] = useState('');

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
                await customerService.create(form);
            }
            setShowModal(false);
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

    // Filter customers by search
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
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Customer
                    </button>
                </div>
            </div>

            {/* Customer Cards Grid */}
            <div className="customer-grid">
                {filteredCustomers.map((c) => (
                    <div key={c.$id} className="customer-card">
                        <div className="customer-card-header">
                            <div className="customer-avatar">
                                {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="customer-card-actions">
                                <button
                                    type='button'
                                    title='edit'
                                    className="btn-icon" onClick={() => openEdit(c)}>
                                    <Edit size={15} />
                                </button>
                                <button
                                    type='button'
                                    title='delete'
                                    className="btn-icon danger"
                                    onClick={() => handleDelete(c.$id)}
                                >
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
                                <span>Deposit: {c.deposite || '—'}</span>
                            </div>
                        </div>

                        <div className="customer-meta">
                            Joined {new Date(c.$createdAt).toLocaleDateString()}
                        </div>
                    </div>
                ))}

                {filteredCustomers.length === 0 && (
                    <div className="empty-state">
                        <p>No customers found</p>
                    </div>
                )}
            </div>

            {/* Also keep table view */}
            <div className="card" style={{ marginTop: 24 }}>
                <h2>All Customers</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Deposit</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map((c) => (
                            <tr key={c.$id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="table-avatar">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        {c.name}
                                    </div>
                                </td>
                                <td>{c.phone}</td>
                                <td>{c.deposite || '—'}</td>
                                <td>{new Date(c.$createdAt).toLocaleDateString()}</td>
                                <td className="actions">
                                    <button
                                        type="button"
                                        title="Edit"
                                        className="btn-icon" onClick={() => openEdit(c)}>
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        title="Delete"
                                        className="btn-icon danger"
                                        onClick={() => handleDelete(c.$id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredCustomers.length === 0 && (
                            <tr>
                                <td colSpan={5} className="empty">
                                    No customers yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Customer' : 'New Customer'}</h2>
                            <button
                                type="button"
                                title="Close"
                                className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>
                                    <User size={14} /> Name *
                                </label>
                                <input
                                    required
                                    placeholder="Customer name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <Phone size={14} /> Phone *
                                </label>
                                <input
                                    required
                                    placeholder="Phone number"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <Wallet size={14} /> Deposit
                                </label>
                                <input
                                    placeholder="Deposit amount"
                                    value={form.deposite}
                                    onChange={(e) =>
                                        setForm({ ...form, deposite: e.target.value })
                                    }
                                />
                            </div>
                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}