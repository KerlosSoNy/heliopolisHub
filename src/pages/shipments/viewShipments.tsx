import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Truck, Edit, X, DollarSign, FileText, Package } from 'lucide-react';
import type { Shipment, ShipmentProduct, Product } from '../../types';
import { useCollection } from '../../hooks/useCollection';
import { productService } from '../../services/productService';
import { shipmentService } from '../../services/shipmentService';

interface ExtendedShipmentProduct extends ShipmentProduct {
    priceInYen?: string;
    exchangeRate?: string;
    priceInEgp?: string;
}

const parseProducts = (products: string[]): ExtendedShipmentProduct[] => {
    try {
        return products.map((item) => JSON.parse(item));
    } catch {
        return [];
    }
};

export default function ViewShipment() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [loading, setLoading] = useState(true);

    const { data: products } = useCollection<Product>({
        fetchFn: useCallback(() => productService.listAll(), []),
    });

    useEffect(() => {
        const loadShipment = async () => {
            if (!id) return;
            try {
                const data = await shipmentService.get(id);
                setShipment(data);
            } catch (err) {
                console.error(err);
                alert('Error loading shipment');
                navigate('/shipments');
            } finally {
                setLoading(false);
            }
        };
        loadShipment();
    }, [id, navigate]);

    if (loading) return <div className="loading">Loading shipment...</div>;
    if (!shipment) return <div className="error">Shipment not found</div>;

    const parsed = parseProducts(shipment.products);
    const getProductName = (productId: string) =>
        products.find((p) => p.$id === productId)?.name || 'Unknown';

    const totalQty = parsed.reduce((sum, sp) => sum + sp.qty, 0);
    const costInChina = parseFloat(shipment.cost_in_china);
    const shipping = parseFloat(shipment.shipping);
    const extraCost = parseFloat(shipment.extra_cost);
    const totalCost = parseFloat(shipment.total_cost);

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <h1>Shipment #{shipment.$id.slice(0, 8)}</h1>
                <div className="flex gap-2">
                    <button
                        className="btn"
                        onClick={() => navigate(`/shipments/${id}/edit`)}
                    >
                        <Edit size={16} /> Edit
                    </button>
                    <button
                        className="btn"
                        onClick={() => navigate('/shipments')}
                    >
                        <X size={16} /> Back
                    </button>
                </div>
            </div>

            <div className="card">
                {/* ===== PRODUCTS SECTION ===== */}
                <div className="form-section">
                    <h2 className="flex items-center gap-2 mb-4">
                        <Package size={18} />
                        Products ({parsed.length})
                    </h2>
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
                                </tr>
                            </thead>
                            <tbody>
                                {parsed.map((sp, idx) => (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-semibold text-center">{idx + 1}</td>
                                        <td className="px-4 py-3 text-sm">{getProductName(sp.productId)}</td>
                                        <td className="px-4 py-3 text-sm font-semibold">{sp.qty}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {sp.priceInYen ? `${sp.priceInYen} ¥` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {sp.exchangeRate ? sp.exchangeRate : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-blue-600 bg-blue-50">
                                            {sp.priceInEgp ? `${sp.priceInEgp} EGP` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="form-hint mt-2!">
                        Total: {totalQty} items
                    </p>
                </div>

                {/* ===== COSTS BREAKDOWN SECTION ===== */}
                <div className="form-section">
                    <h2 className="mb-4">Cost Breakdown</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2! border-b border-gray-200">
                            <span className="flex items-center gap-2 text-gray-700">
                                <DollarSign size={14} /> Cost in China:
                            </span>
                            <strong className="text-gray-900">
                                {costInChina.toFixed(2)} EGP
                            </strong>
                        </div>

                        <div className="flex justify-between items-center py-2! border-b border-gray-200">
                            <span className="flex items-center gap-2 text-gray-700">
                                <Truck size={14} /> Shipping:
                            </span>
                            <strong className="text-gray-900">
                                {shipping.toFixed(2)} EGP
                            </strong>
                        </div>

                        <div className="flex justify-between items-center py-2! border-b border-gray-200">
                            <span className="flex items-center gap-2 text-gray-700">
                                <FileText size={14} /> Extra Cost:
                            </span>
                            <strong className="text-gray-900">
                                {extraCost.toFixed(2)} EGP
                            </strong>
                        </div>

                        <div className="border-t-2 border-gray-300 pt-4 mt-4 space-y-3!">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium">Total Cost:</span>
                                <strong className="text-green-600 text-xl">
                                    {totalCost.toFixed(2)} EGP
                                </strong>
                            </div>
                            {totalQty > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">Cost per item (average):</span>
                                    <strong className="text-gray-900">
                                        {(totalCost / totalQty).toFixed(2)} EGP
                                    </strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===== METADATA SECTION ===== */}
                <div className="form-section bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Information</h3>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                            <p className="text-gray-600 mb-1 text-xs font-medium">Created Date:</p>
                            <p className="font-semibold text-gray-900">
                                {new Date(shipment.$createdAt).toLocaleDateString()}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-600 mb-1 text-xs font-medium">Created Time:</p>
                            <p className="font-semibold text-gray-900">
                                {new Date(shipment.$createdAt).toLocaleTimeString()}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-600 mb-1 text-xs font-medium">Shipment ID:</p>
                            <p className="font-mono font-semibold text-gray-900 break-all">
                                {shipment.$id}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-600 mb-1 text-xs font-medium">Status:</p>
                            <p className="font-semibold text-green-600 flex items-center gap-1">
                                ✓ Active
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}