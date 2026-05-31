import { useState, useCallback, useRef } from 'react';
import {
    X, Trash2, Edit, Plus, Upload, Eye,
    Package, Tag, DollarSign, Image as ImageIcon, ToggleRight, ToggleLeft,
} from 'lucide-react';
import { websiteProductService } from '../services/websiteProductService';
import { useCollection } from '../hooks/useCollection';
import { usePagination } from '../lib/hooks/usePagination';
import Pagination from '../components/Pagination';
import type { WebsiteCategory, WebsiteProduct, WebsiteProductForm } from '../types';
import { websiteCategoryService } from '../services/websiteCategoryService';

const emptyForm: WebsiteProductForm = {
    name: '',
    description: '',
    price: '',
    image_id: '',
    category_id: '',
    stock: '',
    sku: '',
    featured: false,
    status: 'active',
};

export default function WebsiteProducts() {
    const { data: categories } = useCollection<WebsiteCategory>({
        fetchFn: useCallback(() => websiteCategoryService.listAll(), []),
    });

    const activeCategories = categories.filter((c) => c.status === 'active');

    const { data: products, loading, error, refetch } = useCollection<WebsiteProduct>({
        fetchFn: useCallback(() => websiteProductService.listAll(), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<WebsiteProductForm>(emptyForm);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ========== SUMMARY ==========
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.status === 'active').length;
    const featuredProducts = products.filter((p) => p.featured).length;
    const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.price) || 0) * (parseFloat(p.stock) || 0), 0);

    // ========== FILTERING ==========
    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category_id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const {
        currentPage, totalPages, paginatedData, nextPage, prevPage,
        goToPage, startIndex, endIndex, itemsPerPage, setItemsPerPage,
    } = usePagination({ data: filteredProducts, itemsPerPage: 15 });

    // ========== HANDLERS ==========
    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setImageFile(null);
        setImagePreview(null);
        setShowModal(true);
    };



    const openEdit = (p: WebsiteProduct) => {
        setForm({
            name: p.name,
            description: p.description,
            price: p.price,
            image_id: p.image_id || '',
            category_id: p.category_id,
            stock: p.stock,
            sku: p.sku,
            featured: p.featured,
            status: p.status,
        });
        if (p.image_id) {
            try {
                const previewUrl = websiteProductService.getImagePreview(p.image_id);
                setImagePreview(previewUrl);
            } catch (err) {
                setImagePreview(null);
            }
        } else {
            setImagePreview(null);
        }
        setEditingId(p.$id);
        setShowModal(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageId = form.image_id || '';

            if (imageFile) {
                if (editingId && form.image_id) {
                    try {
                        await websiteProductService.deleteImage(form.image_id);
                    } catch { /* ignore */ }
                }
                imageId = await websiteProductService.uploadImage(imageFile);
            }

            const submitData: WebsiteProductForm = {
                ...form,
                image_id: imageId,
            };

            if (editingId) {
                await websiteProductService.update(editingId, submitData);
            } else {
                await websiteProductService.create(submitData);
            }

            setShowModal(false);
            setImageFile(null);
            setImagePreview(null);
            refetch();
        } catch (err) {
            console.error('Failed to save product:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (p: WebsiteProduct) => {
        if (!confirm('Delete this product?')) return;
        await websiteProductService.remove(p.$id);
        refetch();
    };

    const toggleFeatured = async (p: WebsiteProduct) => {
        try {
            await websiteProductService.update(p.$id, { featured: !p.featured });
            refetch();
        } catch (err) {
            console.error('Failed to toggle featured:', err);
        }
    };

    const toggleStatus = async (p: WebsiteProduct) => {
        try {
            const newStatus = p.status === 'active' ? 'inactive' : 'active';
            await websiteProductService.update(p.$id, { status: newStatus });
            refetch();
        } catch (err) {
            console.error('Failed to toggle status:', err);
        }
    };

    if (loading) return <div className="loading">Loading products...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    return (
        <div className="page">
            <div className="page-header">
                <h1><Package size={24} /> Website Products ({products.length})</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Product
                    </button>
                </div>
            </div>

            {/* ========== SUMMARY CARDS ========== */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="stat-grid">
                    <div className="stat-card">
                        <div className="stat-icon blue"><Package size={24} /></div>
                        <div>
                            <p className="stat-label">Total Products</p>
                            <p className="stat-value">{totalProducts}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green"><ToggleRight size={24} /></div>
                        <div>
                            <p className="stat-label">Active</p>
                            <p className="stat-value text-green">{activeProducts}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple"><ImageIcon size={24} /></div>
                        <div>
                            <p className="stat-label">Featured</p>
                            <p className="stat-value">{featuredProducts}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon orange"><DollarSign size={24} /></div>
                        <div>
                            <p className="stat-label">Inventory Value</p>
                            <p className="stat-value">{totalValue.toFixed(2)} EGP</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========== PRODUCTS TABLE ========== */}
            <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📦 Products
                </h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Name</th>
                                <th>SKU</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Value</th>
                                <th>Featured</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((p) => {
                                const value = parseFloat(p.price) * parseFloat(p.stock);
                                return (
                                    <tr key={p.$id}>
                                        <td>
                                            {p.image_id ? (
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => setViewingImage(p.image_id!)}
                                                    title="View Image"
                                                    style={{ color: '#3b82f6' }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            ) : (
                                                <span style={{ color: '#555', fontSize: '12px' }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                                    {p.description.substring(0, 50)}...
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                                                fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                                            }}>
                                                {p.sku}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                                                fontWeight: 600, background: 'rgba(168,85,247,0.1)', color: '#a855f7',
                                            }}>
                                                {p.category_id}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{parseFloat(p.price).toFixed(2)} EGP</strong>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                                                fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                            }}>
                                                {p.stock} units
                                            </span>
                                        </td>
                                        <td>
                                            <strong style={{ color: '#f59e0b' }}>{value.toFixed(2)} EGP</strong>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-icon"
                                                onClick={() => toggleFeatured(p)}
                                                style={{ color: p.featured ? '#f59e0b' : '#555' }}
                                                title={p.featured ? 'Remove from featured' : 'Add to featured'}
                                            >
                                                {p.featured ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                            </button>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                background: p.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                                color: p.status === 'active' ? '#10b981' : '#6b7280',
                                                border: `1px solid ${p.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
                                                cursor: 'pointer',
                                            }}
                                                onClick={() => toggleStatus(p)}
                                            >
                                                {p.status === 'active' ? '● Active' : '● Inactive'}
                                            </span>
                                        </td>
                                        <td className="actions">
                                            <button className="btn-icon" onClick={() => openEdit(p)} title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon danger" onClick={() => handleDelete(p)} title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="empty-state"><p>No products found</p></div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredProducts.length}
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
                            <h2>{editingId ? 'Edit Product' : 'New Product'}</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {/* Name */}
                            <div className="form-group">
                                <label className='flex! items-center gap-2 flex-row'><Tag size={14} /> Product Name *</label>
                                <input required placeholder="Enter product name" value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label>📝 Description *</label>
                                <textarea required placeholder="Detailed product description..." value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px', minHeight: '80px',
                                        background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                                        resize: 'vertical',
                                    }} />
                            </div>

                            <div className="form-row">
                                {/* Price */}
                                <div className="form-group">
                                    <label className='flex! items-center gap-2 flex-row'><DollarSign size={14} /> Price (EGP) *</label>
                                    <input required placeholder="0.00" value={form.price} type="number" step="0.01"
                                        onChange={(e) => setForm({ ...form, price: e.target.value })} />
                                </div>

                                {/* Stock */}
                                <div className="form-group">
                                    <label className='flex! items-center gap-2 flex-row'><Package size={14} /> Stock (Units) *</label>
                                    <input required placeholder="0" value={form.stock} type="number"
                                        onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-row w-full!">
                                {/* SKU */}
                                <div className="form-group w-full!">
                                    <label>SKU *</label>
                                    <input required placeholder="Product SKU" value={form.sku} className='w-full!'
                                        onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>📂 Category *</label>
                                <select title='select' value={form.category_id} required
                                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <option value="">Select a category</option>
                                    {activeCategories.map((cat) => (
                                        <option key={cat.$id} value={cat.$id}>
                                            {cat.icon} {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* Featured */}
                            <div className="flex flex-row">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.featured}
                                        onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                                        style={{ cursor: 'pointer' }} />
                                    <span>Featured Product</span>
                                </label>
                            </div>

                            {/* Status */}
                            <div className="form-group">
                                <label>Status *</label>
                                <select title='select' value={form.status} required
                                    onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            {/* Image Upload */}
                            <div className="form-group">
                                <label className='flex! flex-row items-center gap-2'><ImageIcon size={14} /> Product Image (optional)</label>
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
                                            setImageFile(file);
                                            const reader = new FileReader();
                                            reader.onload = () => setImagePreview(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                >
                                    <input title='File Ref' ref={fileInputRef} type="file" accept="image/*" className='hidden'
                                        onChange={handleFileSelect} />

                                    {imagePreview ? (
                                        <div>
                                            <img
                                                src={form.image_id ? websiteProductService.getImageView(form.image_id) : imagePreview}
                                                alt="Product preview"
                                                className='mx-auto! max-w-50 max-h-37.5 rounded-lg mb-2'
                                            />
                                            <div style={{ fontSize: '12px', color: '#888' }}>
                                                {imageFile ? imageFile.name : 'Current image'}
                                            </div>
                                            <button type="button" onClick={(e) => {
                                                e.stopPropagation();
                                                setImageFile(null);
                                                setImagePreview(null);
                                                setForm({ ...form, image_id: '' });
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
                                            <Upload size={32} style={{ color: '#555', marginBottom: '8px' }} className='mx-auto!' />
                                            <div style={{ color: '#888', fontSize: '13px' }}>
                                                Click or drag & drop to upload image
                                            </div>
                                            <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>
                                                JPG, PNG, WebP — Max 10MB
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

            {/* ========== IMAGE VIEWER MODAL ========== */}
            {viewingImage && (
                <div className="modal-overlay" onClick={() => setViewingImage(null)}>
                    <div className="modal max-w-150 text-center flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header w-full">
                            <h2 className='flex flex-row items-center gap-2'><ImageIcon size={18} /> Product Image</h2>
                            <button title='close' type="button" className="btn-icon" onClick={() => setViewingImage(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <img
                            src={websiteProductService.getImageView(viewingImage)}
                            alt="Product"
                            className=' object-contain max-w-75 max-h-125 rounded-[10px] mx-auto '
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                console.error('Failed to load product image');
                            }}
                        />
                        <div className='flex items-center justify-center gap-2 p-4 mt-4!'>
                            <a
                                href={websiteProductService.getImageView(viewingImage)}
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