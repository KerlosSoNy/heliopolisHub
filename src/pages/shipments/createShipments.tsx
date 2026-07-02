import { useState, useEffect } from 'react';
import {
    Trash2, Plus, Package, DollarSign, Truck, FileText, Save, X, CheckCircle, Circle,
} from 'lucide-react';
import type { ShipmentForm, ShipmentProduct } from '../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { shipmentService } from '../../services/shipmentService';

interface ExtendedShipmentProduct extends ShipmentProduct {
    productName?: string;
    priceInYen?: string;
    exchangeRate?: string;
    priceInEgp?: string;
    soldPrice?: string;
    arrivedInChina?: boolean;
    shippingPrice?: string;
    benefit?: string;
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

    const [form, setForm] = useState<ShipmentForm>(emptyForm);
    const [selectedProducts, setSelectedProducts] = useState<ExtendedShipmentProduct[]>([]);
    const [loading, setLoading] = useState(false);
    const [exchangeRate] = useState('8.3');

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

    const addProduct = () => {
        const newProduct: ExtendedShipmentProduct = {
            productId: '',
            productName: '',
            qty: 1,
            priceInYen: '',
            exchangeRate: exchangeRate,
            priceInEgp: '0.00',
            soldPrice: '',
            arrivedInChina: false,
            shippingPrice: '0.00',
            benefit: '0.00',
        };
        setSelectedProducts([...selectedProducts, newProduct]);
    };

    // Calculate benefit for a product
    const calculateBenefit = (product: ExtendedShipmentProduct): number => {
        const costPerItem = parseFloat(product.priceInEgp || '0') || 0;
        const soldPrice = parseFloat(product.soldPrice || '0') || 0;
        const shippingPrice = parseFloat(product.shippingPrice || '0') || 0;
        const qty = product.qty || 1;

        const benefitPerItem = Math.max(0, soldPrice - costPerItem - shippingPrice);
        return benefitPerItem * qty;
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
                        const rate = parseFloat(field === 'exchangeRate' ? value : (p.exchangeRate || exchangeRate)) || 0;
                        updated.priceInEgp = (yen * rate).toFixed(2);
                    } else if (field === 'soldPrice') {
                        updated.soldPrice = value;
                    } else if (field === 'shippingPrice') {
                        updated.shippingPrice = value;
                    } else if (field === 'arrivedInChina') {
                        updated.arrivedInChina = value;
                    } else {
                        updated[field] = value;
                    }

                    // Recalculate benefit
                    updated.benefit = calculateBenefit(updated).toFixed(2);

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

    // Calculate totals
    const totalQty = selectedProducts.reduce((sum, sp) => sum + sp.qty, 0);
    const totalCostInChina = selectedProducts.reduce((sum, sp) => {
        return sum + ((parseFloat(sp.priceInEgp || '0') || 0) * sp.qty);
    }, 0);
    const totalProductShipping = selectedProducts.reduce((sum, sp) => {
        return sum + (parseFloat(sp.shippingPrice || '0') || 0) * sp.qty;
    }, 0);
    const totalSoldPrice = selectedProducts.reduce((sum, sp) => {
        return sum + ((parseFloat(sp.soldPrice || '0') || 0) * sp.qty);
    }, 0);
    const totalBenefit = selectedProducts.reduce((sum, sp) => {
        return sum + (parseFloat(sp.benefit || '0') || 0);
    }, 0);
    const arrivedCount = selectedProducts.filter(p => p.arrivedInChina).length;

    // Calculate final total cost (Cost in China + Product Shipping + Extra Cost)
    const calcTotal = (): number => {
        return (
            totalCostInChina +
            totalProductShipping +
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

        // Validate that all products have required fields
        if (selectedProducts.some(p => !p.productName?.trim())) {
            alert('Please enter a product name for all products');
            return;
        }

        if (selectedProducts.some(p => !p.soldPrice)) {
            alert('Please enter sold price for all products');
            return;
        }

        setLoading(true);
        try {
            const productsArray = selectedProducts.map((sp) => {
                const { productId, productName, qty, priceInYen, exchangeRate, priceInEgp, soldPrice, arrivedInChina, shippingPrice, benefit } = sp;
                return JSON.stringify({
                    productId: productId || productName,
                    productName,
                    qty,
                    priceInYen,
                    exchangeRate,
                    priceInEgp,
                    soldPrice,
                    arrivedInChina,
                    shippingPrice,
                    benefit,
                });
            });

            const payload: ShipmentForm = {
                ...form,
                products: productsArray,
                shipping: totalProductShipping.toFixed(2),
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
                    <div className="flex! flex-row items-center justify-between mb-4!">
                        <h2>Products</h2>
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold">{arrivedCount}</span> of <span className="font-semibold">{selectedProducts.length}</span> arrived in China
                        </div>
                    </div>

                    {selectedProducts.length === 0 ? (
                        <div className="empty-state">
                            <Package size={32} />
                            <p>No products added yet. Click "Add Product" to start.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-100 border-b">
                                        <th className="px-2 py-2 text-left font-semibold">#</th>
                                        <th className="px-2 py-2 text-center font-semibold">Arrived</th>
                                        <th className="px-2 py-2 text-left font-semibold">Product Name</th>
                                        <th className="px-2 py-2 text-center font-semibold">Qty</th>
                                        <th className="px-2 py-2 text-right font-semibold">Price (¥)</th>
                                        <th className="px-2 py-2 text-right font-semibold">Rate</th>
                                        <th className="px-2 py-2 text-right font-semibold">Cost (EGP)</th>
                                        <th className="px-2 py-2 text-right font-semibold">Ship/Item</th>
                                        <th className="px-2 py-2 text-right font-semibold">Sold Price</th>
                                        <th className="px-2 py-2 text-right font-semibold">Benefit</th>
                                        <th className="px-2 py-2 text-center font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedProducts.map((sp, index) => {
                                        // const costPerItem = parseFloat(sp.priceInEgp || '0') || 0;
                                        // const soldPrice = parseFloat(sp.soldPrice || '0') || 0;
                                        // const shippingPrice = parseFloat(sp.shippingPrice || '0') || 0;
                                        // const benefitPerItem = Math.max(0, soldPrice - costPerItem - shippingPrice);
                                        const benefit = parseFloat(sp.benefit || '0') || 0;

                                        return (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="px-2 py-3 text-center font-semibold">{index + 1}</td>

                                                {/* Arrived Checkbox */}
                                                <td className="px-2 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateProduct(index, 'arrivedInChina', !sp.arrivedInChina)}
                                                        className="btn-icon"
                                                        title={sp.arrivedInChina ? 'Mark as not arrived' : 'Mark as arrived'}
                                                    >
                                                        {sp.arrivedInChina ? (
                                                            <CheckCircle size={16} style={{ color: '#10b981' }} />
                                                        ) : (
                                                            <Circle size={16} style={{ color: '#d1d5db' }} />
                                                        )}
                                                    </button>
                                                </td>

                                                {/* Product Name */}
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Product name"
                                                        required
                                                        value={sp.productName || ''}
                                                        onChange={(e) => updateProduct(index, 'productName', e.target.value)}
                                                        className="form-input text-xs w-full"
                                                        title="Product Name"
                                                    />
                                                </td>

                                                {/* Quantity */}
                                                <td className="px-2 py-3 text-center">
                                                    <input
                                                        title="Quantity"
                                                        required
                                                        type="number"
                                                        step="1"
                                                        min="1"
                                                        value={sp.qty}
                                                        onChange={(e) => updateProduct(index, 'qty', e.target.value)}
                                                        className="form-input text-xs w-14 text-center"
                                                    />
                                                </td>

                                                {/* Price in Yen */}
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={sp.priceInYen || ''}
                                                        onChange={(e) => updateProduct(index, 'priceInYen', e.target.value)}
                                                        className="form-input text-xs w-16"
                                                        title="Price in Yen"
                                                    />
                                                </td>

                                                {/* Exchange Rate */}
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        min="0"
                                                        placeholder="0.33"
                                                        value={sp.exchangeRate || exchangeRate}
                                                        onChange={(e) => updateProduct(index, 'exchangeRate', e.target.value)}
                                                        className="form-input text-xs w-14"
                                                        title="Exchange Rate"
                                                    />
                                                </td>

                                                {/* Cost in EGP (Display) */}
                                                <td className="px-2 py-3 font-semibold text-blue-600 bg-blue-50 rounded text-right">
                                                    {sp.priceInEgp || '0.00'} EGP
                                                </td>

                                                {/* Shipping Per Item (Input) */}
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={sp.shippingPrice || ''}
                                                        onChange={(e) => updateProduct(index, 'shippingPrice', e.target.value)}
                                                        className="form-input text-xs w-16"
                                                        title="Shipping Price Per Item"
                                                    />
                                                </td>

                                                {/* Sold Price (Input) */}
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={sp.soldPrice || ''}
                                                        onChange={(e) => updateProduct(index, 'soldPrice', e.target.value)}
                                                        className="form-input text-xs w-16"
                                                        title="Sold Price (EGP)"
                                                        required
                                                    />
                                                </td>

                                                {/* Benefit (Display) */}
                                                <td className={`px-2 py-3 text-right font-semibold rounded ${benefit > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                                    {benefit > 0 ? '+' : ''}{benefit.toFixed(2)} EGP
                                                </td>

                                                {/* Delete Button */}
                                                <td className="px-2 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        className="btn-icon danger"
                                                        onClick={() => removeProduct(index)}
                                                        title="Remove product"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                            {selectedProducts.length} product(s) added — {totalQty} total items
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
                        <small className="text-gray-500">Auto-calculated from products: {totalCostInChina.toFixed(2)} EGP</small>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="flex! items-center gap-1">
                                <Truck size={14} /> Total Product Shipping (EGP)
                            </label>
                            <input
                                disabled
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Auto-calculated"
                                value={totalProductShipping.toFixed(2)}
                                className="form-input bg-gray-100"
                            />
                            <small className="text-gray-500">Auto-calculated from products shipping per item</small>
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
                        <h3 className="mb-4!">Summary</h3>
                        <div className="summary-rows w-full!">
                            <div className="summary-row">
                                <span>Total Cost in China:</span>
                                <strong>{totalCostInChina.toFixed(2)} EGP</strong>
                            </div>

                            <div className="summary-row">
                                <span className="flex! items-center gap-1">
                                    <Truck size={12} /> Total Product Shipping:
                                </span>
                                <strong>{totalProductShipping.toFixed(2)} EGP</strong>
                            </div>

                            <div className="summary-row">
                                <span className="flex! items-center gap-1">
                                    <FileText size={12} /> Extra Cost:
                                </span>
                                <strong>{parseFloat(form.extra_cost || '0').toFixed(2)} EGP</strong>
                            </div>

                            <div className="summary-row summary-total">
                                <span>Total Shipment Cost:</span>
                                <strong className="text-orange-600">{liveTotal.toFixed(2)} EGP</strong>
                            </div>

                            <div className="summary-row">
                                <span>Total Sold Price:</span>
                                <strong className="text-blue-600">{totalSoldPrice.toFixed(2)} EGP</strong>
                            </div>

                            <div className={`summary-row summary-total ${totalBenefit > 0 ? 'text-green' : 'text-danger'}`}>
                                <span>Total Benefit:</span>
                                <strong>{totalBenefit > 0 ? '+' : ''}{totalBenefit.toFixed(2)} EGP</strong>
                            </div>

                            {totalQty > 0 && (
                                <>
                                    <div className="summary-row">
                                        <span>Cost per item (avg):</span>
                                        <strong>{(liveTotal / totalQty).toFixed(2)} EGP</strong>
                                    </div>
                                    <div className="summary-row">
                                        <span>Benefit per item (avg):</span>
                                        <strong className={totalBenefit / totalQty > 0 ? 'text-green' : 'text-danger'}>
                                            {(totalBenefit / totalQty).toFixed(2)} EGP
                                        </strong>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
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