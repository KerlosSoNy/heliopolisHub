import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Ship, Package, Truck, FileText,
    DollarSign, TrendingUp, Tag,
} from 'lucide-react';
import { shipmentService } from '../services/shipmentService';
import { productService } from '../services/productService';
import { useCollection } from '../hooks/useCollection';
import type { Shipment, ShipmentProduct, Product } from '../types';

// Helper: parse products array safely
const parseProducts = (products: any): ShipmentProduct[] => {
    try {
        if (typeof products === 'string') {
            return JSON.parse(products);
        }
        if (Array.isArray(products)) {
            return products.map((item) => {
                if (typeof item === 'object' && item !== null) {
                    return { productId: item.productId, qty: Number(item.qty) || 1 };
                }
                if (typeof item === 'string') {
                    const parsed = JSON.parse(item);
                    return { productId: parsed.productId, qty: Number(parsed.qty) || 1 };
                }
                return null;
            }).filter(Boolean) as ShipmentProduct[];
        }
        return [];
    } catch {
        return [];
    }
};

export default function ShipmentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: shipments, loading: loadingShipment, error } = useCollection<Shipment>({
        fetchFn: useCallback(() => shipmentService.listAll(), []),
    });

    const { data: products, loading: loadingProducts } = useCollection<Product>({
        fetchFn: useCallback(() => productService.listAll(), []),
    });

    const shipment = shipments.find((s) => s.$id === id);
    const loading = loadingShipment || loadingProducts;

    // ========== HELPERS ==========
    const getProduct = (productId: string): Product | undefined => {
        return products.find((p) => p.$id === productId);
    };


    // ========== PROFIT CALCULATIONS (same as Products page) ==========
    const calcProductProfit = (product: Product) => {
        const priceEgp = (parseFloat(product.price_chi) || 0) * (parseFloat(product.rate) || 0);
        const totalOrder = parseFloat(product.total_order || '0');
        const totalShipping = parseFloat(product.total_shipping || '0');

        let shippingPerPiece = 0;
        if (totalOrder > 0 && totalShipping > 0) {
            shippingPerPiece = (priceEgp / totalOrder) * totalShipping;
        }

        const totalCostPerPiece = priceEgp + shippingPerPiece;
        const soldPrice = parseFloat(product.sold_price || '0');
        const profitPerPiece = soldPrice > 0 ? soldPrice - totalCostPerPiece : 0;

        return {
            priceEgp,
            shippingPerPiece,
            totalCostPerPiece,
            soldPrice,
            profitPerPiece,
            hasRevenue: soldPrice > 0,
        };
    };

    const calcProductInShipment = (sp: ShipmentProduct) => {
        const product = getProduct(sp.productId);
        if (!product) return null;

        const calc = calcProductProfit(product);

        return {
            name: product.name,
            qty: sp.qty,
            priceChi: product.price_chi,
            rate: product.rate,
            priceEgp: calc.priceEgp,
            shippingPerPiece: calc.shippingPerPiece,
            totalCostPerPiece: calc.totalCostPerPiece,
            soldPrice: calc.soldPrice,
            profitPerPiece: calc.profitPerPiece,
            totalCost: calc.totalCostPerPiece * sp.qty,
            totalRevenue: calc.soldPrice * sp.qty,
            totalProfit: calc.profitPerPiece * sp.qty,
            hasRevenue: calc.hasRevenue,
        };
    };

    const calcShipmentProfit = (shipment: Shipment) => {
        const parsed = parseProducts(shipment.products);
        let totalRevenue = 0;
        let hasAnyRevenue = false;

        parsed.forEach((sp) => {
            const calc = calcProductInShipment(sp);
            if (!calc) return;
            totalRevenue += calc.totalRevenue;
            if (calc.hasRevenue) hasAnyRevenue = true;
        });

        const shipmentTotalCost = parseFloat(shipment.total_cost || '0');
        const finalProfit = totalRevenue - shipmentTotalCost;

        return {
            totalRevenue,
            shipmentTotalCost,
            finalProfit,
            profitPercentage: shipmentTotalCost > 0
                ? (finalProfit / shipmentTotalCost) * 100
                : 0,
            hasRevenue: hasAnyRevenue,
        };
    };

    // ========== LOADING / ERROR ==========
    if (loading) return <div className="loading">Loading shipment...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (!shipment) return (
        <div className="page">
            <div className="error">
                Shipment not found.
                <button className="btn btn-primary" style={{ marginLeft: 12 }} onClick={() => navigate('/shipments')}>
                    <ArrowLeft size={14} /> Back to Shipments
                </button>
            </div>
        </div>
    );

    const parsed = parseProducts(shipment.products);
    const totalQty = parsed.reduce((sum, sp) => sum + sp.qty, 0);
    const profitCalc = calcShipmentProfit(shipment);

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn-icon" onClick={() => navigate('/shipments')} title="Back">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className='flex flex-row items-center gap-2'><Ship size={24} /> Shipment #{shipment.$id.slice(0, 8)}</h1>
                </div>
                <div className="customer-meta">
                    Created {new Date(shipment.$createdAt).toLocaleDateString()}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="flex flex-row items-center flex-wrap gap-3 mb-5!">
                <div className="stat-card w-87.5">
                    <div className="stat-icon orange"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Cost in China</p>
                        <p className="stat-value">{parseFloat(shipment.cost_in_china).toFixed(2)} EGP</p>
                    </div>
                </div>
                <div className="stat-card w-95">
                    <div className="stat-icon blue"><Package size={24} /></div>
                    <div>
                        <p className="stat-label">Products</p>
                        <p className="stat-value">{parsed.length} products — {totalQty} items</p>
                    </div>
                </div>
                <div className="stat-card w-87.5">
                    <div className="stat-icon purple"><Truck size={24} /></div>
                    <div>
                        <p className="stat-label">Shipping</p>
                        <p className="stat-value">{parseFloat(shipment.shipping).toFixed(2)} EGP</p>
                    </div>
                </div>
                <div className="stat-card w-87.5">
                    <div className="stat-icon red"><FileText size={24} /></div>
                    <div>
                        <p className="stat-label">Extra Cost</p>
                        <p className="stat-value">{parseFloat(shipment.extra_cost).toFixed(2)} EGP</p>
                    </div>
                </div>
                <div className="stat-card w-87.5">
                    <div className="stat-icon orange"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Total Cost</p>
                        <p className="stat-value">{profitCalc.shipmentTotalCost.toFixed(2)} EGP</p>
                    </div>
                </div>
                {profitCalc.hasRevenue && (
                    <>
                        <div className="stat-card w-87.5">
                            <div className="stat-icon blue"><DollarSign size={24} /></div>
                            <div>
                                <p className="stat-label">Total Revenue</p>
                                <p className="stat-value">{profitCalc.totalRevenue.toFixed(2)} EGP</p>
                            </div>
                        </div>
                        <div className="stat-card w-87.5">
                            <div className={`stat-icon ${profitCalc.finalProfit >= 0 ? 'green' : 'red'}`}>
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="stat-label">Shipment Profit</p>
                                <p className={`stat-value ${profitCalc.finalProfit >= 0 ? 'text-green' : 'text-danger'}`}>
                                    {profitCalc.finalProfit.toFixed(2)} EGP
                                </p>
                            </div>
                        </div>
                        <div className="stat-card w-87.5">
                            <div className={`stat-icon ${profitCalc.profitPercentage >= 0 ? 'green' : 'red'}`}>
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="stat-label">Margin</p>
                                <p className={`stat-value ${profitCalc.profitPercentage >= 0 ? 'text-green' : 'text-danger'}`}>
                                    {profitCalc.profitPercentage.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Products Table */}
            <div className="card mt-4">
                <h2 className='flex flex-row items-center gap-2'><Package size={18} /> Products in this Shipment</h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>CNY</th>
                                <th>Rate</th>
                                <th>Cost/pc (EGP)</th>
                                <th>Ship/pc</th>
                                <th>Total Cost/pc</th>
                                <th>Sold/pc</th>
                                <th>Profit/pc</th>
                                <th>Total Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parsed.map((sp, idx) => {
                                const calc = calcProductInShipment(sp);
                                if (!calc) {
                                    return (
                                        <tr key={idx}>
                                            <td colSpan={10}>
                                                <span className="text-muted">Product not found: {sp.productId}</span>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={idx}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="table-avatar-product"><Package size={16} /></div>
                                                <span>{calc.name}</span>
                                            </div>
                                        </td>
                                        <td><strong>{calc.qty}</strong></td>
                                        <td>{calc.priceChi} ¥</td>
                                        <td>{calc.rate}</td>
                                        <td>{calc.priceEgp.toFixed(2)}</td>
                                        <td>{calc.shippingPerPiece > 0 ? calc.shippingPerPiece.toFixed(2) : '—'}</td>
                                        <td><strong>{calc.totalCostPerPiece.toFixed(2)}</strong></td>
                                        <td>{calc.hasRevenue ? calc.soldPrice.toFixed(2) : '—'}</td>
                                        <td>
                                            {calc.hasRevenue ? (
                                                <span className={calc.profitPerPiece >= 0 ? 'text-green' : 'text-danger'}>
                                                    {calc.profitPerPiece.toFixed(2)}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            {calc.hasRevenue ? (
                                                <strong className={calc.totalProfit >= 0 ? 'text-green' : 'text-danger'}>
                                                    {calc.totalProfit.toFixed(2)} EGP
                                                </strong>
                                            ) : '—'}
                                        </td>
                                    </tr >
                                );
                            })}
                        </tbody >
                        <tfoot>
                            <tr className="totals-row">
                                <td><strong>TOTALS</strong></td>
                                <td><strong>{totalQty}</strong></td>
                                <td colSpan={5}>—</td>
                                <td>
                                    {profitCalc.hasRevenue && (
                                        <strong>{profitCalc.totalRevenue.toFixed(2)}</strong>
                                    )}
                                </td>
                                <td>—</td>
                                <td>
                                    {profitCalc.hasRevenue ? (
                                        <strong className={profitCalc.finalProfit >= 0 ? 'text-green' : 'text-danger'}>
                                            {profitCalc.finalProfit.toFixed(2)} EGP
                                        </strong>
                                    ) : (
                                        <span className="text-muted">—</span>
                                    )}
                                </td>
                            </tr>
                        </tfoot>
                    </table >
                </div >
            </div >

            {/* Profit Summary Card */}
            <div className="card mt-4" >
                <h2 className='flex flex-row items-center gap-2'><TrendingUp size={18} /> Profit Summary</h2>
                <div className="profit-preview-box">
                    <div className="profit-preview-row">
                        <span>Cost in China:</span>
                        <span>{parseFloat(shipment.cost_in_china).toFixed(2)} EGP</span>
                    </div>
                    <div className="profit-preview-row">
                        <span><Truck size={12} /> Shipping:</span>
                        <span>{parseFloat(shipment.shipping).toFixed(2)} EGP</span>
                    </div>
                    <div className="profit-preview-row">
                        <span><FileText size={12} /> Extra Cost:</span>
                        <span>{parseFloat(shipment.extra_cost).toFixed(2)} EGP</span>
                    </div>
                    <div className="profit-preview-row profit-preview-total">
                        <span><strong>Total Cost:</strong></span>
                        <strong>{profitCalc.shipmentTotalCost.toFixed(2)} EGP</strong>
                    </div>

                    {profitCalc.hasRevenue ? (
                        <>
                            <div className="profit-preview-row" style={{ marginTop: 12 }}>
                                <span><Tag size={12} /> Total Revenue:</span>
                                <span>{profitCalc.totalRevenue.toFixed(2)} EGP</span>
                            </div>
                            <div className={`profit-preview-row profit-preview-total ${profitCalc.finalProfit >= 0 ? 'profit-positive' : 'profit-negative'
                                }`}>
                                <span><TrendingUp size={12} /> Shipment Profit:</span>
                                <strong>{profitCalc.finalProfit.toFixed(2)} EGP</strong>
                            </div>
                            <div className={`profit-preview-row ${profitCalc.profitPercentage >= 0 ? 'profit-positive' : 'profit-negative'
                                }`}>
                                <span>Profit Margin:</span>
                                <strong>{profitCalc.profitPercentage.toFixed(1)}%</strong>
                            </div>
                        </>
                    ) : (
                        <div className="profit-preview-row profit-preview-total" style={{ marginTop: 12 }}>
                            <span>Profit:</span>
                            <span className="text-muted">No sold prices set on products yet</span>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}