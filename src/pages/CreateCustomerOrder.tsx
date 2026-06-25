import { useState, useCallback } from 'react';
import { Plus, Trash2, User, ShoppingCart, DollarSign, Percent } from 'lucide-react';
import { customerService } from '../services/customerService';
import { customerOrderService, type ProductData } from '../services/customerOrderService';
import { useCollection } from '../hooks/useCollection';
import type { Customer } from '../types';

interface ManualProduct extends ProductData {
    id: string;
    profit?: number;
}

export default function CreateCustomerOrder() {
    const { data: customers } = useCollection<Customer>({
        fetchFn: useCallback(() => customerService.listAll(), []),
    });

    // Form state
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [products, setProducts] = useState<ManualProduct[]>([]);
    const [discountPercent, setDiscountPercent] = useState('0');
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [loading, setLoading] = useState(false);

    // Add new product row
    const addProduct = () => {
        const newProduct: ManualProduct = {
            id: Date.now().toString(),
            name: '',
            costPrice: '',
            sellingPrice: '',
            quantity: '1',
        };
        setProducts([...products, newProduct]);
    };

    // Update product field
    const updateProduct = (id: string, field: keyof ManualProduct, value: string) => {
        setProducts(
            products.map((p) =>
                p.id === id
                    ? {
                        ...p,
                        [field]: value,
                        ...(field === 'costPrice' || field === 'sellingPrice' || field === 'quantity'
                            ? {
                                profit: calculateProfit(
                                    field === 'costPrice' ? parseFloat(value) : parseFloat(p.costPrice || '0'),
                                    field === 'sellingPrice' ? parseFloat(value) : parseFloat(p.sellingPrice || '0'),
                                    field === 'quantity' ? parseFloat(value) : parseFloat(p.quantity || '1')
                                ),
                            }
                            : {}),
                    }
                    : p
            )
        );
    };

    // Remove product
    const removeProduct = (id: string) => {
        setProducts(products.filter((p) => p.id !== id));
    };

    // Calculate profit per product
    const calculateProfit = (costPrice: number, sellingPrice: number, qty: number) => {
        return (sellingPrice - costPrice) * qty;
    };

    // Calculate line totals for single product
    const calculateLineTotal = (costPrice: number, sellingPrice: number, qty: number) => {
        return {
            costTotal: costPrice * qty,
            sellingTotal: sellingPrice * qty,
        };
    };

    // Calculate totals
    const calculateTotals = () => {
        let subtotal = 0;
        let totalCost = 0;
        let totalProfit = 0;

        products.forEach((p) => {
            const selling = parseFloat(p.sellingPrice || '0');
            const cost = parseFloat(p.costPrice || '0');
            const qty = parseFloat(p.quantity || '0');

            const lineTotal = selling * qty;
            const lineCost = cost * qty;

            subtotal += lineTotal;
            totalCost += lineCost;
            totalProfit += lineTotal - lineCost;
        });

        // Apply discount
        let discount = 0;
        if (discountPercent && parseFloat(discountPercent) > 0) {
            if (discountType === 'percentage') {
                discount = (subtotal * parseFloat(discountPercent)) / 100;
            } else {
                discount = parseFloat(discountPercent);
            }
        }

        const total = subtotal - discount;
        const finalProfit = total - totalCost;

        return { subtotal, discount, total, totalCost, totalProfit: finalProfit };
    };

    const { subtotal, discount, total, totalCost, totalProfit } = calculateTotals();

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCustomer || products.length === 0) {
            alert('Please select a customer and add at least one product');
            return;
        }

        setLoading(true);
        try {
            // Prepare products data for storage (without the 'id' field)
            const productsForStorage: ProductData[] = products.map((p) => ({
                name: p.name,
                costPrice: p.costPrice,
                sellingPrice: p.sellingPrice,
                quantity: p.quantity,
            }));

            // Prepare data for order service
            const orderData = {
                client: selectedCustomer.name,
                products: productsForStorage,
                price_egp: total.toFixed(2),
                discount: discountPercent,
                discount_type: discountType,
            };

            // Create order
            await customerOrderService.create(orderData);

            alert('Order created successfully!');

            // Reset form
            setSelectedCustomer(null);
            setProducts([]);
            setDiscountPercent('0');
        } catch (err) {
            console.error(err);
            alert('Error creating order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>Create New Order</h1>
            </div>

            <form onSubmit={handleSubmit} className="card">
                {/* ===== CUSTOMER SELECTION ===== */}
                <div className="form-section">
                    <h2>Customer Information</h2>

                    <div className="form-group">
                        <label>
                            <User size={14} /> Select Customer *
                        </label>
                        <select
                            title="Select a customer"
                            required
                            value={selectedCustomer?.$id || ''}
                            onChange={(e) => {
                                const customer = customers.find((c) => c.$id === e.target.value);
                                setSelectedCustomer(customer || null);
                            }}
                            className="form-input"
                        >
                            <option value="">-- Select a customer --</option>
                            {customers.map((c) => (
                                <option key={c.$id} value={c.$id}>
                                    {c.name} - {c.phone}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Customer Summary */}
                    {selectedCustomer && (
                        <div className="customer-summary">
                            <div className="summary-item px-2!">
                                <span>Customer:</span>
                                <strong>{selectedCustomer.name}</strong>
                            </div>
                            <div className="summary-item mt-2! px-2!">
                                <span>Available Deposit:</span>
                                <strong className="text-green">
                                    {parseFloat(selectedCustomer.deposite || '0').toFixed(2)} EGP
                                </strong>
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== PRODUCTS SECTION ===== */}
                <div className="form-section">
                    <h2>Products</h2>

                    {products.length === 0 ? (
                        <div className="empty-state">
                            <ShoppingCart size={32} />
                            <p>No products added yet. Click "Add Product" to start.</p>
                        </div>
                    ) : (
                        <div className="products-table-wrapper">
                            <div className="products-table">
                                <div className="table-header">
                                    <div className="col-row-num">#</div>
                                    <div className="col-name">Product Name</div>
                                    <div className="col-cost">Cost/Unit</div>
                                    <div className="col-selling">Price/Unit</div>
                                    <div className="col-qty">Qty</div>
                                    <div className="col-total">Total</div>
                                    <div className="col-action">Action</div>
                                </div>

                                {products.map((product, index) => {
                                    const cost = parseFloat(product.costPrice || '0');
                                    const selling = parseFloat(product.sellingPrice || '0');
                                    const qty = parseFloat(product.quantity || '0');
                                    const { costTotal, sellingTotal } = calculateLineTotal(cost, selling, qty);

                                    return (
                                        <div key={product.id} className="table-row">
                                            <div className="col-row-num mt-2!">
                                                <span className="row-number">{index + 1}</span>
                                            </div>

                                            <div className="col-name">
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Product name"
                                                    value={product.name}
                                                    onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                                                    className="form-input"
                                                />
                                            </div>

                                            <div className="col-cost">
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    value={product.costPrice}
                                                    onChange={(e) => updateProduct(product.id, 'costPrice', e.target.value)}
                                                    className="form-input"
                                                />
                                                <small className="text-muted">per unit</small>
                                            </div>

                                            <div className="col-selling">
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    value={product.sellingPrice}
                                                    onChange={(e) => updateProduct(product.id, 'sellingPrice', e.target.value)}
                                                    className="form-input"
                                                />
                                                <small className="text-muted">per unit</small>
                                            </div>

                                            <div className="col-qty">
                                                <div className="qty-input-group">
                                                    <input
                                                        required
                                                        type="number"
                                                        step="1"
                                                        min="1"
                                                        placeholder="1"
                                                        value={product.quantity}
                                                        onChange={(e) => updateProduct(product.id, 'quantity', e.target.value)}
                                                        className="form-input"
                                                    />
                                                    <div className="qty-breakdown">
                                                        <small className="text-muted">
                                                            {qty > 0 && selling > 0 ? (
                                                                <span>
                                                                    {selling.toFixed(2)} × {qty} = {sellingTotal.toFixed(2)}
                                                                </span>
                                                            ) : (
                                                                'qty × price'
                                                            )}
                                                        </small>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-total">
                                                <div className="total-display">
                                                    <strong className="text-green">
                                                        {sellingTotal.toFixed(2)} EGP
                                                    </strong>
                                                    <small className="text-muted" style={{ display: 'block', marginTop: 4 }}>
                                                        Cost: {costTotal.toFixed(2)} EGP
                                                    </small>
                                                </div>
                                            </div>

                                            <div className="col-action">
                                                <button
                                                    type="button"
                                                    className="btn-icon danger"
                                                    onClick={() => removeProduct(product.id)}
                                                    title="Remove product"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ===== ADD PRODUCT BUTTON - BELOW TABLE ===== */}
                        </div>
                    )}
                    <button
                        type="button"
                        className="bg-blue-500 mx-auto! flex flex-row items-center gap-2 text-white py-2! px-4! rounded-md hover:bg-blue-600 transition-colors mt-4!"
                        onClick={addProduct}
                    >
                        <Plus size={16} /> Add Product
                    </button>
                </div>

                {/* ===== DISCOUNT SECTION ===== */}
                {products.length > 0 && (
                    <div className="form-section">
                        <h3>Apply Discount (Optional)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="flex! flex-row items-center">
                                    <Percent size={14} /> Deposite Type
                                </label>
                                <select
                                    title="Discount Type"
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                                    className="form-input"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount (EGP)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="flex! flex-row items-center">
                                    <DollarSign size={14} /> Deposite Value
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== ORDER SUMMARY ===== */}
                {products.length > 0 && (
                    <div className="form-section order-summary">
                        <h3>Order Summary (Customer View)</h3>

                        <div className="summary-rows">
                            <div className="summary-row">
                                <span>Subtotal:</span>
                                <strong>{subtotal.toFixed(2)} EGP</strong>
                            </div>

                            {discount > 0 && (
                                <div className="summary-row text-danger">
                                    <span>Deposite:</span>
                                    <strong>-{discount.toFixed(2)} EGP</strong>
                                </div>
                            )}

                            <div className="summary-row summary-total">
                                <span>Total Order Cost:</span>
                                <strong className="text-green ps-2!">{total.toFixed(2)} EGP</strong>
                            </div>
                        </div>

                        {/* Hidden Profit Summary */}
                        <div className="hidden-profit-section">
                            <div className="summary-rows" style={{ opacity: 0.6, borderTop: '1px solid #ddd', paddingTop: 12, marginTop: 12 }}>
                                <div className="summary-row">
                                    <span>Your Total Cost:</span>
                                    <strong className="ps-2!">{totalCost.toFixed(2)} EGP</strong>
                                </div>
                                <div className="summary-row text-green">
                                    <span>Profit:</span>
                                    <strong className="ms-2">{totalProfit.toFixed(2)} EGP</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== FORM ACTIONS ===== */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn"
                        onClick={() => {
                            setSelectedCustomer(null);
                            setProducts([]);
                            setDiscountPercent('0');
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!selectedCustomer || products.length === 0 || loading}
                    >
                        <ShoppingCart size={14} /> {loading ? 'Creating...' : 'Create Order'}
                    </button>
                </div>
            </form>
        </div>
    );
}