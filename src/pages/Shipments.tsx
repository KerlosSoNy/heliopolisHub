import { useState, useCallback } from 'react';
import {
    Trash2, Edit, Plus, X, Ship, DollarSign,
    Package, Truck, Save, FileText, TrendingUp,
    Minus,
} from 'lucide-react';
import { shipmentService } from '../services/shipmentService';
import { productService } from '../services/productService';
import { useCollection } from '../hooks/useCollection';
import type { Shipment, ShipmentForm, ShipmentProduct, Product } from '../types';
import { usePagination } from '../lib/hooks/usePagination';
import Pagination from '../components/Pagination';

const emptyForm: ShipmentForm = {
    products: [],
    extra_cost: '',
    shipping: '',
    cost_in_china: '',
    total_cost: '',
};

// Helper: parse products JSON safely
const parseProducts = (products: string[]): ShipmentProduct[] => {
    try {
        return products.map((item) => JSON.parse(item));
    } catch {
        return [];
    }
};

export default function Shipments() {
    const { data: shipments, loading, error, refetch } = useCollection<Shipment>({
        fetchFn: useCallback(() => shipmentService.listAll(), []),
    });
    const { data: products } = useCollection<Product>({
        fetchFn: useCallback(() => productService.listAll(), []),
    });

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ShipmentForm>(emptyForm);
    const [selectedProducts, setSelectedProducts] = useState<ShipmentProduct[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // ========== HELPERS ==========
    const getProductName = (id: string): string => {
        const product = products.find((p) => p.$id === id);
        return product?.name || 'Unknown Product';
    };

    const getProductStock = (id: string): number => {
        const product = products.find((p) => p.$id === id);
        return parseInt(product?.count || '0') || 0;
    };

    const calcTotal = (costInChina: string, shipping: string, extraCost: string): number => {
        return (
            (parseFloat(costInChina) || 0) +
            (parseFloat(shipping) || 0) +
            (parseFloat(extraCost) || 0)
        );
    };

    // ========== PRODUCT SELECTION ==========
    const toggleProduct = (productId: string) => {
        setSelectedProducts((prev) => {
            const exists = prev.find((sp) => sp.productId === productId);
            if (exists) {
                return prev.filter((sp) => sp.productId !== productId);
            }
            return [...prev, { productId, qty: 1 }];
        });
    };

    const updateProductQty = (productId: string, qty: number) => {
        if (qty < 1) return;
        setSelectedProducts((prev) =>
            prev.map((sp) =>
                sp.productId === productId ? { ...sp, qty } : sp
            )
        );
    };

    // ========== HANDLERS ==========
    const openCreate = () => {
        setForm(emptyForm);
        setSelectedProducts([]);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (shipment: Shipment) => {
        const parsed = parseProducts(shipment.products);
        setSelectedProducts(parsed);
        setForm({
            products: shipment.products,
            extra_cost: shipment.extra_cost,
            shipping: shipment.shipping,
            cost_in_china: shipment.cost_in_china,
            total_cost: shipment.total_cost,
        });
        setEditingId(shipment.$id);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const total = calcTotal(form.cost_in_china, form.shipping, form.extra_cost).toString();
            const productsArray = selectedProducts.map((sp) => JSON.stringify(sp));

            const payload: ShipmentForm = {
                ...form,
                products: productsArray,
                total_cost: total,
            };


            if (editingId) {
                await shipmentService.update(editingId, payload);
            } else {
                await shipmentService.create(payload);
            }
            setShowModal(false);
            refetch();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this shipment?')) return;
        await shipmentService.remove(id);
        refetch();
    };

    // ========== FILTERING & PAGINATION ==========
    const filteredShipments = shipments.filter((s) => {
        const parsed = parseProducts(s.products);
        const productNames = parsed.map((sp) => getProductName(sp.productId).toLowerCase());
        return productNames.some((name) => name.includes(searchTerm.toLowerCase()));
    });

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
        data: filteredShipments,
        itemsPerPage: 10,
    });

    // ========== TOTALS ==========
    const totals = shipments.reduce(
        (acc, s) => ({
            totalCostInChina: acc.totalCostInChina + (parseFloat(s.cost_in_china) || 0),
            totalShipping: acc.totalShipping + (parseFloat(s.shipping) || 0),
            totalExtra: acc.totalExtra + (parseFloat(s.extra_cost) || 0),
            totalCost: acc.totalCost + (parseFloat(s.total_cost) || 0),
        }),
        { totalCostInChina: 0, totalShipping: 0, totalExtra: 0, totalCost: 0 }
    );

    const totalSelectedQty = selectedProducts.reduce((sum, sp) => sum + sp.qty, 0);
    const liveTotal = calcTotal(form.cost_in_china, form.shipping, form.extra_cost);

    if (loading) return <div className="loading">Loading shipments...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <h1>Shipments ({shipments.length})</h1>
                <div className="header-actions">
                    <input
                        type="text"
                        placeholder="Search by product name..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Add Shipment
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><Ship size={24} /></div>
                    <div>
                        <p className="stat-label">Total Shipments</p>
                        <p className="stat-value">{shipments.length}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Cost in China</p>
                        <p className="stat-value">{totals.totalCostInChina.toFixed(2)} EGP</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><Truck size={24} /></div>
                    <div>
                        <p className="stat-label">Total Shipping</p>
                        <p className="stat-value">{totals.totalShipping.toFixed(2)} EGP</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><TrendingUp size={24} /></div>
                    <div>
                        <p className="stat-label">Total Cost</p>
                        <p className="stat-value">{totals.totalCost.toFixed(2)} EGP</p>
                    </div>
                </div>
            </div>

            {/* Cards View */}
            <div className="flex flex-row items-center h-95 gap-4 !max-w-full !overflow-x-auto py-5! my-5!">
                {filteredShipments.map((s) => {
                    const total = parseFloat(s.total_cost) || 0;
                    const parsed = parseProducts(s.products);
                    const totalQty = parsed.reduce((sum, sp) => sum + sp.qty, 0);

                    return (
                        <div key={s.$id} className="product-card w-75 h-full shrink-0">
                            <div className="product-card-header">
                                <div className="product-icon"><Ship size={22} /></div>
                                <div className="customer-card-actions">
                                    <button type="button" title="Edit" className="btn-icon" onClick={() => openEdit(s)}>
                                        <Edit size={15} />
                                    </button>
                                    <button type="button" title="Delete" className="btn-icon danger" onClick={() => handleDelete(s.$id)}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="product-name">
                                Shipment #{s.$id.slice(0, 8)}
                            </h3>

                            {/* Products with Quantities */}
                            <div className="shipment-products-list">
                                <span className="product-stat-label !flex flex-row items-center gap-2">
                                    <Package size={12} /> Products ({parsed.length}) — {totalQty} items
                                </span>
                            </div>

                            {/* Cost Breakdown */}
                            <div className="price-breakdown mt-2!">
                                <div className="breakdown-row">
                                    <span>Cost in China</span>
                                    <span>{parseFloat(s.cost_in_china).toFixed(2)} EGP</span>
                                </div>
                                <div className="breakdown-row">
                                    <span><Truck size={12} /> Shipping</span>
                                    <span>{parseFloat(s.shipping).toFixed(2)} EGP</span>
                                </div>
                                <div className="breakdown-row">
                                    <span><FileText size={12} /> Extra Cost</span>
                                    <span>{parseFloat(s.extra_cost).toFixed(2)} EGP</span>
                                </div>
                                <div className="breakdown-row breakdown-total">
                                    <span><strong>Total Cost</strong></span>
                                    <span><strong>{total.toFixed(2)} EGP</strong></span>
                                </div>
                            </div>

                            <div className="customer-meta">
                                Created {new Date(s.$createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
                {filteredShipments.length === 0 && (
                    <div className="empty-state"><p>No shipments found</p></div>
                )}
            </div>

            {/* Detailed Table */}
            <div className="card mt-4">
                <h2>All Shipments — Detailed</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Shipment</th>
                                <th>Products</th>
                                <th>Total Items</th>
                                <th>Cost in China</th>
                                <th>Shipping</th>
                                <th>Extra Cost</th>
                                <th>Total Cost</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((s) => {
                                const parsed = parseProducts(s.products);
                                const totalQty = parsed.reduce((sum, sp) => sum + sp.qty, 0);

                                return (
                                    <tr key={s.$id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="table-avatar-product"><Ship size={16} /></div>
                                                <span>#{s.$id.slice(0, 8)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="shipment-product-tags-table">
                                                {parsed.map((sp, idx) => (
                                                    <span key={idx} className="shipment-product-tag-sm">
                                                        {getProductName(sp.productId)} <strong>×{sp.qty}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td><strong>{totalQty}</strong></td>
                                        <td>{parseFloat(s.cost_in_china).toFixed(2)} EGP</td>
                                        <td>{parseFloat(s.shipping).toFixed(2)} EGP</td>
                                        <td>{parseFloat(s.extra_cost).toFixed(2)} EGP</td>
                                        <td><strong>{parseFloat(s.total_cost).toFixed(2)} EGP</strong></td>
                                        <td>{new Date(s.$createdAt).toLocaleDateString()}</td>
                                        <td className="actions">
                                            <button title="Edit" type="button" className="btn-icon" onClick={() => openEdit(s)}>
                                                <Edit size={16} />
                                            </button>
                                            <button title="Delete" type="button" className="btn-icon danger" onClick={() => handleDelete(s.$id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredShipments.length === 0 && (
                                <tr>
                                    <td colSpan={9}>
                                        <div className="empty-state"><p>No shipments found</p></div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {filteredShipments.length > 0 && (
                            <tfoot>
                                <tr className="totals-row">
                                    <td><strong>TOTALS</strong></td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td><strong>{totals.totalCostInChina.toFixed(2)} EGP</strong></td>
                                    <td><strong>{totals.totalShipping.toFixed(2)} EGP</strong></td>
                                    <td><strong>{totals.totalExtra.toFixed(2)} EGP</strong></td>
                                    <td><strong>{totals.totalCost.toFixed(2)} EGP</strong></td>
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
                totalItems={filteredShipments.length}
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
                <div className="modal-overlay " onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg !max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Shipment' : 'New Shipment'}</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>

                            {/* Product Selection with Quantity */}
                            <div className="form-group">
                                <label><Package size={14} /> Select Products & Quantities *</label>
                                <div className="product-select-grid">
                                    {products.map((p) => {
                                        const selected = selectedProducts.find((sp) => sp.productId === p.$id);
                                        const isSelected = !!selected;
                                        const stock = getProductStock(p.$id);

                                        return (
                                            <div
                                                key={p.$id}
                                                className={`product-select-item ${isSelected ? 'product-select-active' : ''}`}
                                            >
                                                {/* Click to toggle selection */}
                                                <div
                                                    className="product-select-info"
                                                    onClick={() => toggleProduct(p.$id)}
                                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}
                                                >
                                                    <Package size={14} />
                                                    <span>{p.name}</span>
                                                    <span className="product-select-count">Stock: {stock}</span>
                                                    {isSelected && <span className="product-select-check">✓</span>}
                                                </div>

                                                {/* Quantity Controls */}
                                                {isSelected && (
                                                    <div className="qty-controls justify-center !gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            title='Minus'
                                                            onClick={() => updateProductQty(p.$id, (selected?.qty || 1) - 1)}
                                                            disabled={(selected?.qty || 1) <= 1}
                                                        >
                                                            <Minus size={12} color='black' />
                                                        </button>
                                                        <input
                                                            title='Count'
                                                            type="number"
                                                            className="qty-input !border-0 !max-w-[50%] !text-black"
                                                            value={selected?.qty || 1}
                                                            min={1}
                                                            onChange={(e) => updateProductQty(p.$id, parseInt(e.target.value) || 1)}
                                                        />
                                                        <button
                                                            title='Plus'
                                                            type="button"
                                                            onClick={() => updateProductQty(p.$id, (selected?.qty || 1) + 1)}
                                                        >
                                                            <Plus size={12} color='black' />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {selectedProducts.length > 0 && (
                                    <p className="form-hint">
                                        {selectedProducts.length} product(s) selected — {totalSelectedQty} total items
                                    </p>
                                )}
                            </div>

                            {/* Selected Products Summary */}
                            {selectedProducts.length > 0 && (
                                <div className="selected-products-summary">
                                    <div className="selected-products-header">
                                        <h4>
                                            <Package size={14} />
                                            Selected Products ({selectedProducts.length}) — {totalSelectedQty} items
                                        </h4>
                                        <button
                                            type="button"
                                            className="btn btn-sm danger"
                                            onClick={() => setSelectedProducts([])}
                                        >
                                            <Trash2 size={12} /> Clear All
                                        </button>
                                    </div>
                                    <div className="selected-products-list">
                                        {selectedProducts.map((sp) => (
                                            <div key={sp.productId} className="selected-product-row">
                                                <div className="selected-product-info">
                                                    <Package size={14} />
                                                    <span className="selected-product-name !text-black">
                                                        {getProductName(sp.productId)}
                                                    </span>
                                                    {/* ✅ Show qty badge */}
                                                    <span className="shipment-qty-badge !text-white">×{sp.qty}</span>
                                                    <span className="selected-product-stock">
                                                        Stock: {getProductStock(sp.productId)}
                                                    </span>
                                                </div>
                                                <div className="selected-product-controls">
                                                    <div className="qty-controls">
                                                        <button
                                                            title='Minus'
                                                            type="button"
                                                            className="qty-btn"
                                                            onClick={() => updateProductQty(sp.productId, sp.qty - 1)}
                                                            disabled={sp.qty <= 1}
                                                        >
                                                            <Minus size={12} color='black' />
                                                        </button>
                                                        <input
                                                            title='Qty'
                                                            type="number"
                                                            className="qty-input !text-gray-800"
                                                            value={sp.qty}
                                                            min={1}
                                                            onChange={(e) =>
                                                                updateProductQty(sp.productId, parseInt(e.target.value) || 1)
                                                            }
                                                        />
                                                        <button
                                                            title='Plus'
                                                            type="button"
                                                            className="qty-btn"
                                                            onClick={() => updateProductQty(sp.productId, sp.qty + 1)}
                                                        >
                                                            <Plus size={12} color='black' />
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-icon danger"
                                                        onClick={() => toggleProduct(sp.productId)}
                                                        title="Remove"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cost Fields */}
                            <div className="form-group">
                                <label><DollarSign size={14} /> Cost in China (EGP) *</label>
                                <input
                                    required
                                    placeholder="Total cost from China"
                                    value={form.cost_in_china}
                                    onChange={(e) => setForm({ ...form, cost_in_china: e.target.value })}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label><Truck size={14} /> Shipping (EGP) *</label>
                                    <input
                                        required
                                        placeholder="Shipping cost"
                                        value={form.shipping}
                                        onChange={(e) => setForm({ ...form, shipping: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label><FileText size={14} /> Extra Cost (EGP) *</label>
                                    <input
                                        required
                                        placeholder="Any extra fees"
                                        value={form.extra_cost}
                                        onChange={(e) => setForm({ ...form, extra_cost: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Live Total Preview */}
                            <div className="profit-preview-box">
                                <div className="profit-preview-row">
                                    <span>Cost in China:</span>
                                    <span>{parseFloat(form.cost_in_china || '0').toFixed(2)} EGP</span>
                                </div>
                                <div className="profit-preview-row">
                                    <span><Truck size={12} /> Shipping:</span>
                                    <span>{parseFloat(form.shipping || '0').toFixed(2)} EGP</span>
                                </div>
                                <div className="profit-preview-row">
                                    <span><FileText size={12} /> Extra Cost:</span>
                                    <span>{parseFloat(form.extra_cost || '0').toFixed(2)} EGP</span>
                                </div>
                                <div className="profit-preview-row profit-preview-total">
                                    <span><strong>Total Cost:</strong></span>
                                    <strong>{liveTotal.toFixed(2)} EGP</strong>
                                </div>
                                {totalSelectedQty > 0 && (
                                    <div className="profit-preview-row">
                                        <span>Cost per item (avg):</span>
                                        <span>{(liveTotal / totalSelectedQty).toFixed(2)} EGP</span>
                                    </div>
                                )}
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