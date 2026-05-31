import { useState, useCallback, useRef } from 'react';
import {
    X, Trash2, Edit, Plus, Upload, Eye,
    Folder, Smile,
} from 'lucide-react';
import { websiteCategoryService } from '../services/websiteCategoryService';
import { useCollection } from '../hooks/useCollection';
import { usePagination } from '../lib/hooks/usePagination';
import Pagination from '../components/Pagination';
import type { WebsiteCategory, WebsiteCategoryForm } from '../types';

const emptyForm: WebsiteCategoryForm = {
    name: '',
    description: '',
    image_id: '',
    icon: '📦',
    slug: '',
    status: 'active',
};

export default function WebsiteCategories() {
    const { data: categories, loading, error, refetch } = useCollection<WebsiteCategory>({
        fetchFn: useCallback(() => websiteCategoryService.listAll(), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<WebsiteCategoryForm>(emptyForm);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const commonIcons = ['📦', '👕', '👟', '🎒', '⌚', '🎁', '💻', '📱', '🎮', '📚', '🏠', '🍽️'];

    // ========== FILTERING ==========
    const filteredCategories = categories.filter((c) => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.slug.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const {
        currentPage, totalPages, paginatedData, nextPage, prevPage,
        goToPage, startIndex, endIndex, itemsPerPage, setItemsPerPage,
    } = usePagination({ data: filteredCategories, itemsPerPage: 15 });

    // ========== HANDLERS ==========
    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setImageFile(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const openEdit = (c: WebsiteCategory) => {
        setForm({
            name: c.name,
            description: c.description,
            image_id: c.image_id || '',
            icon: c.icon,
            slug: c.slug,
            status: c.status,
        });
        setEditingId(c.$id);
        setImageFile(null);
        if (c.image_id) {
            try {
                setImagePreview(websiteCategoryService.getImagePreview(c.image_id));
            } catch {
                setImagePreview(null);
            }
        } else {
            setImagePreview(null);
        }
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

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageId = form.image_id || '';

            if (imageFile) {
                if (editingId && form.image_id) {
                    try {
                        await websiteCategoryService.deleteImage(form.image_id);
                    } catch { /* ignore */ }
                }
                imageId = await websiteCategoryService.uploadImage(imageFile);
            }

            const submitData: WebsiteCategoryForm = {
                ...form,
                image_id: imageId,
                slug: form.slug || generateSlug(form.name),
            };

            if (editingId) {
                await websiteCategoryService.update(editingId, submitData);
            } else {
                await websiteCategoryService.create(submitData);
            }

            setShowModal(false);
            setImageFile(null);
            setImagePreview(null);
            refetch();
        } catch (err) {
            console.error('Failed to save category:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (c: WebsiteCategory) => {
        if (!confirm('Delete this category?')) return;
        await websiteCategoryService.remove(c.$id);
        refetch();
    };

    const toggleStatus = async (c: WebsiteCategory) => {
        try {
            const newStatus = c.status === 'active' ? 'inactive' : 'active';
            await websiteCategoryService.update(c.$id, { status: newStatus });
            refetch();
        } catch (err) {
            console.error('Failed to toggle status:', err);
        }
    };

    if (loading) return <div className="loading">Loading categories...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1><Folder size={24} /> Website Categories ({categories.length})</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search categories..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Category
                    </button>
                </div>
            </div>

            {/* ========== CATEGORIES TABLE ========== */}
            <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    📂 Categories
                </h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Icon</th>
                                <th>Name</th>
                                <th>Slug</th>
                                <th>Description</th>
                                <th>Image</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((c) => (
                                <tr key={c.$id}>
                                    {/* Icon */}
                                    <td>
                                        <div style={{ fontSize: '28px', textAlign: 'center' }}>
                                            {c.icon}
                                        </div>
                                    </td>

                                    {/* Name */}
                                    <td>
                                        <strong>{c.name}</strong>
                                    </td>

                                    {/* Slug */}
                                    <td>
                                        <span style={{
                                            padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                                            fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                                        }}>
                                            {c.slug}
                                        </span>
                                    </td>

                                    {/* Description */}
                                    <td>
                                        <div style={{ fontSize: '12px', color: '#888', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {c.description}
                                        </div>
                                    </td>

                                    {/* Image */}
                                    <td>
                                        {c.image_id ? (
                                            <button
                                                className="btn-icon"
                                                onClick={() => setViewingImage(c.image_id!)}
                                                title="View Image"
                                                style={{ color: '#3b82f6' }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                        ) : (
                                            <span style={{ color: '#555', fontSize: '12px' }}>—</span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td>
                                        <span
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                background: c.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                                color: c.status === 'active' ? '#10b981' : '#6b7280',
                                                border: `1px solid ${c.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => toggleStatus(c)}
                                        >
                                            {c.status === 'active' ? '● Active' : '● Inactive'}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="actions">
                                        <button className="btn-icon" onClick={() => openEdit(c)} title="Edit">
                                            <Edit size={16} />
                                        </button>
                                        <button className="btn-icon danger" onClick={() => handleDelete(c)} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredCategories.length === 0 && (
                    <div className="empty-state"><p>No categories found</p></div>
                )}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredCategories.length}
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
                            <h2>{editingId ? 'Edit Category' : 'New Category'}</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            {/* Name */}
                            <div className="form-group">
                                <label>📝 Category Name *</label>
                                <input required placeholder="Enter category name" value={form.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setForm({ ...form, name, slug: generateSlug(name) });
                                    }} />
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label>📄 Description *</label>
                                <textarea required placeholder="Category description..." value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px', minHeight: '80px',
                                        background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                                        resize: 'vertical',
                                    }} />
                            </div>

                            {/* Slug */}
                            <div className="form-group">
                                <label>🔗 Slug *</label>
                                <input required placeholder="category-slug" value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                                <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>
                                    Auto-generated from name
                                </small>
                            </div>

                            {/* Icon */}
                            <div className="form-group">
                                <label><Smile size={14} /> Icon Emoji *</label>
                                <div style={{
                                    display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px',
                                    padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                                }}>
                                    {commonIcons.map((icon) => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setForm({ ...form, icon })}
                                            style={{
                                                width: '40px', height: '40px', fontSize: '24px',
                                                border: form.icon === icon ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.2)',
                                                background: form.icon === icon ? 'rgba(99,102,241,0.2)' : 'transparent',
                                                borderRadius: '8px', cursor: 'pointer',
                                            }}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                                <input required placeholder="Or paste emoji here" value={form.icon}
                                    onChange={(e) => setForm({ ...form, icon: e.target.value })} />
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
                                <label className='flex flex-row items-center gap-2'>🖼️ Category Image (optional)</label>
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
                                            <img src={imagePreview} alt="Category preview"
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
                                            <Upload size={32} style={{ color: '#555', marginBottom: '8px' }} />
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
                            <h2 className='flex flex-row items-center gap-2'>🖼️ Category Image</h2>
                            <button title='close' type="button" className="btn-icon" onClick={() => setViewingImage(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <img
                            src={websiteCategoryService.getImageView(viewingImage)}
                            alt="Category"
                            className=' object-contain max-w-75 max-h-125 rounded-[10px] mx-auto '
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                console.error('Failed to load category image');
                            }}
                        />
                        <div className='flex items-center justify-center gap-2 p-4'>
                            <a
                                href={websiteCategoryService.getImageView(viewingImage)}
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