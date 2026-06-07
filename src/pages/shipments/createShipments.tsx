import { useState, useCallback, useEffect } from 'react';
import {
    Trash2, Plus, Package, DollarSign, Truck, FileText, Save, X,
} from 'lucide-react';
import type { ShipmentForm, ShipmentProduct, Product } from '../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { shipmentService } from '../../services/shipmentService';
import { productService } from '../../services/productService';
import { useCollection } from '../../hooks/useCollection';

interface ExtendedShipmentProduct extends ShipmentProduct {
    priceInYen?: string;
    exchangeRate?: string;
    priceInEgp?: string;
}

const emptyForm: ShipmentForm = {
    products: [],
    extra_cost: '',
    shipping: '',
    cost_in_china: '',
    total_cost: '',
};

const parseProducts = (products: string[]): ExtendedShipmentProduct[] => {
    try {
        return products.map((item) => JSON.parse(item));
    } catch {
        return [];
    }
};

export default function CreateEditShipment() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;

    const { data: products } = useCollection<Product>({
        fetchFn: useCallback(() => productService.listAll(), []),
    });

    const [form, setForm] = useState<ShipmentForm>(emptyForm);
    const [selectedProducts, setSelectedProducts] = useState<ExtendedShipmentProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [exchangeRate,] = useState('8.3');

    // Load shipment if editing
    useEffect(() => {
        if (isEdit && id) {
            const loadShipment = async () => {
                try {
                    const shipment = await shipmentService.get(id);
                    const parsed = parseProducts(shipment.products);
                    setSelectedProducts(parsed);
                    setForm({
                        products: shipment.products,
                        extra_cost: shipment.extra_cost,
                        shipping: shipment.shipping,
                        cost_in_china: shipment.cost_in_china,
                        total_cost: shipment.total_cost,
                    });
                } catch (err) {
                    console.error(err);
                    alert('Error loading shipment');
                    navigate('/shipments');
                }
            };
            loadShipment();
        }
    }, [id, isEdit, navigate]);

    const getProductStock = (productId: string): number => {
        const product = products.find((p: Product) => p.$id === productId);
        return parseInt(product?.count || '0') || 0;
    };

    const addProduct = () => {
        const newProduct: ExtendedShipmentProduct = {
            productId: products[0]?.$id || '',
            qty: 1,
            priceInYen: '',
            exchangeRate: exchangeRate,
            priceInEgp: '0.00',
        };
        setSelectedProducts([...selectedProducts, newProduct]);
    };

    // Update product in table
    const updateProduct = (index: number, field: keyof ExtendedShipmentProduct, value: any) => {
        setSelectedProducts((prev) =>
            prev.map((p, i) => {
                if (i === index) {
                    const updated = { ...p };

                    if (field === 'qty') {
                        updated.qty = parseInt(value) || 1;
                    } else if (field === 'priceInYen' || field === 'exchangeRate') {
                        updated[field] = value;
                        // Auto-calculate EGP price
                        const yen = parseFloat(field === 'priceInYen' ? value : (p.priceInYen || '0')) || 0;
                        const rate = parseFloat(field === 'exchangeRate' ? value : (p.exchangeRate || '0.33')) || 0;
                        updated.priceInEgp = (yen * rate).toFixed(2);
                    } else {
                        updated[field] = value;
                    }

                    return updated;
                }
                return p;
            })
        );
    };

    // Remove product from table
    const removeProduct = (index: number) => {
        setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
    };

    const calcTotal = (): number => {
        return (
            (parseFloat(form.cost_in_china) || 0) +
            (parseFloat(form.shipping) || 0) +
            (parseFloat(form.extra_cost) || 0)
        );
    };

    const liveTotal = calcTotal();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedProducts.length === 0) {
            alert('Please add at least one product');
            return;
        }

        setLoading(true);
        try {
            const productsArray = selectedProducts.map((sp) => JSON.stringify(sp));

            const payload: ShipmentForm = {
                ...form,
                products: productsArray,
                total_cost: liveTotal.toString(),
            };

            if (isEdit && id) {
                await shipmentService.update(id, payload);
                alert('Shipment updated successfully!');
            } else {
                await shipmentService.create(payload);
                alert('Shipment created successfully!');
            }

            navigate('/shipments');
        } catch (err) {
            console.error(err);
            alert('Error saving shipment');
        } finally {
            setLoading(false);
        }
    };

    const totalQty = selectedProducts.reduce((sum, sp) => sum + sp.qty, 0);

    return (
        <div className="page">
            <div className="page-header">
                <h1>{isEdit ? 'Edit Shipment' : 'Create New Shipment'}</h1>
                <button
                    type="button"
                    className="btn"
                    onClick={() => navigate('/shipments')}
                >
                    <X size={16} /> Back
                </button>
            </div>

            <form onSubmit={handleSubmit} className="card">
                {/* ===== PRODUCTS TABLE SECTION ===== */}
                <div className="form-section">
                    <h2>Products</h2>

                    {selectedProducts.length === 0 ? (
                        <div className="empty-state">
                            <Package size={32} />
                            <p>No products added yet. Click "Add Product" to start.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b">
                                        <th className="px-4 py-2 text-left text-sm font-semibold">#</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Product</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Qty</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Price (¥)</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Rate</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Price (EGP)</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Stock</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((sp, index) => (
                                        <tr key={index} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-semibold text-center">{index + 1}</td>

                                            <td className="px-4 py-3">
                                                <select
                                                    title="Select a product"
                                                    required
                                                    value={sp.productId}
                                                    onChange={(e) => updateProduct(index, 'productId', e.target.value)}
                                                    className="form-input text-sm"
                                                >
                                                    <option value="">-- Select --</option>
                                                    {products.map((p: any) => (
                                                        <option key={p.$id} value={p.$id}>
                                                            {p.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="px-4 py-3">
                                                <input
                                                    title="Quantity"
                                                    required
                                                    type="number"
                                                    step="1"
                                                    min="1"
                                                    value={sp.qty}
                                                    onChange={(e) => updateProduct(index, 'qty', e.target.value)}
                                                    className="form-input text-sm w-16"
                                                />
                                            </td>

                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    value={sp.priceInYen || ''}
                                                    onChange={(e) => updateProduct(index, 'priceInYen', e.target.value)}
                                                    className="form-input text-sm w-24"
                                                    title="Price in Yen"
                                                />
                                            </td>

                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    min="0"
                                                    placeholder="0.33"
                                                    value={sp.exchangeRate || exchangeRate}
                                                    onChange={(e) => updateProduct(index, 'exchangeRate', e.target.value)}
                                                    className="form-input text-sm w-20"
                                                    title="Exchange Rate (1 JPY = ? EGP)"
                                                />
                                            </td>

                                            <td className="px-4 py-3 text-[12px]! font-semibold text-blue-600 bg-blue-50">
                                                {sp.priceInEgp || '0.00'} EGP
                                            </td>

                                            <td className="px-4 py-3 text-sm text-gray-600 text-center">
                                                {getProductStock(sp.productId)}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    className="btn-icon danger"
                                                    onClick={() => removeProduct(index)}
                                                    title="Remove product"
                                                >
                                                    <Trash2 size={16} />
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
                        className="bg-blue-500 mx-auto! flex flex-row items-center gap-2 text-white py-2! px-4! rounded-md hover:bg-blue-600 transition-colors mt-4!"
                        onClick={addProduct}
                    >
                        <Plus size={16} /> Add Product
                    </button>

                    {selectedProducts.length > 0 && (
                        <p className="form-hint mt-2!">
                            {selectedProducts.length} product(s) selected — {totalQty} total items
                        </p>
                    )}
                </div>

                {/* ===== COSTS SECTION ===== */}
                <div className="form-section">
                    <h2>Shipment Costs</h2>

                    <div className="form-group">
                        <label className="flex! items-center gap-1">
                            <DollarSign size={14} /> Cost in China (EGP) *
                        </label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Total cost from China"
                            value={form.cost_in_china}
                            onChange={(e) => setForm({ ...form, cost_in_china: e.target.value })}
                            className="form-input"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="flex! items-center gap-1">
                                <Truck size={14} /> Shipping (EGP) *
                            </label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Shipping cost"
                                value={form.shipping}
                                onChange={(e) => setForm({ ...form, shipping: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label className="flex! items-center gap-1">
                                <FileText size={14} /> Extra Cost (EGP)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Any extra fees"
                                value={form.extra_cost}
                                onChange={(e) => setForm({ ...form, extra_cost: e.target.value })}
                                className="form-input"
                            />
                        </div>
                    </div>
                </div>

                {/* ===== COST SUMMARY ===== */}
                {selectedProducts.length > 0 && (
                    <div className="form-section order-summary">

                        <div className="summary-rows w-full!">
                            <div className="summary-row">
                                <span>Cost in China:</span>
                                <strong>{parseFloat(form.cost_in_china || '0').toFixed(2)} EGP</strong>
                            </div>

                            <div className="summary-row">
                                <span className="flex! items-center gap-1">
                                    <Truck size={12} /> Shipping:
                                </span>
                                <strong>{parseFloat(form.shipping || '0').toFixed(2)} EGP</strong>
                            </div>

                            <div className="summary-row">
                                <span className="flex! items-center gap-1">
                                    <FileText size={12} /> Extra Cost:
                                </span>
                                <strong>{parseFloat(form.extra_cost || '0').toFixed(2)} EGP</strong>
                            </div>

                            <div className="summary-row summary-total">
                                <span>Total Cost:</span>
                                <strong className="text-green">{liveTotal.toFixed(2)} EGP</strong>
                            </div>

                            {totalQty > 0 && (
                                <div className="summary-row">
                                    <span>Cost per item (avg):</span>
                                    <strong>{(liveTotal / totalQty).toFixed(2)} EGP</strong>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== FORM ACTIONS ===== */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn"
                        onClick={() => navigate('/shipments')}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={selectedProducts.length === 0 || loading}
                    >
                        <Save size={14} /> {loading ? 'Saving...' : isEdit ? 'Update Shipment' : 'Create Shipment'}
                    </button>
                </div>
            </form>
        </div>
    );
}