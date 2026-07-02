import { useState, useCallback } from 'react';
import {
    Trash2, Edit, DollarSign, TrendingUp, ArrowLeft, Package
} from 'lucide-react';
import { shipmentService } from '../../services/shipmentService';
import type { Shipment, ShipmentProduct } from '../../types';
import { useNavigate, useParams } from 'react-router-dom';

interface ExtendedShipmentProduct extends ShipmentProduct {
    productName?: string;
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

export default function ShipmentDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load shipment on mount
    const loadShipment = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await shipmentService.get(id);
            setShipment(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to load shipment');
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Initial load
    useState(() => {
        loadShipment();
    });

    const handleDelete = async () => {
        if (!shipment || !confirm('Delete this shipment? This action cannot be undone.')) return;

        try {
            await shipmentService.remove(shipment.$id);
            alert('Shipment deleted successfully!');
            navigate('/shipments');
        } catch (err) {
            console.error(err);
            alert('Error deleting shipment');
        }
    };

    if (loading) return <div className="loading">Loading shipment details...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!shipment) return <div className="error">Shipment not found</div>;

    const parsed = parseProducts(shipment.products);
    const totalQty = parsed.reduce((sum, sp) => sum + sp.qty, 0);
    const totalCost = parseFloat(shipment.total_cost || '0');

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="btn"
                        onClick={() => navigate('/shipments')}
                        title="Back to shipments"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1>Shipment #{shipment.$id.slice(0, 8)}</h1>
                        <p className="text-gray-500 text-sm">
                            Created: {new Date(shipment.$createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/shipments/${shipment.$id}/edit`)}
                    >
                        <Edit size={16} /> Edit
                    </button>
                    <button
                        className="btn danger"
                        onClick={handleDelete}
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                </div>
            </div>

            {/* Products Section */}
            <div className="card">
                <div className="form-section">
                    <h2 className="flex items-center gap-2">
                        <Package size={20} /> Products ({parsed.length})
                    </h2>

                    {parsed.length === 0 ? (
                        <div className="empty-state">
                            <Package size={32} />
                            <p>No products in this shipment</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b">
                                        <th className="px-4 py-2 text-left text-sm font-semibold">#</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Product Name</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Qty</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Price (¥)</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Rate</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Price (EGP)</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsed.map((sp, index) => {
                                        const itemTotal = (parseFloat(sp.priceInEgp || '0') || 0) * sp.qty;
                                        return (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm font-semibold text-center">{index + 1}</td>
                                                <td className="px-4 py-3 text-sm font-medium">
                                                    {sp.productName || 'Unknown Product'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center">{sp.qty}</td>
                                                <td className="px-4 py-3 text-sm">¥{parseFloat(sp.priceInYen || '0').toFixed(2)}</td>
                                                <td className="px-4 py-3 text-sm">{parseFloat(sp.exchangeRate || '0').toFixed(4)}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-blue-600 bg-blue-50">
                                                    {parseFloat(sp.priceInEgp || '0').toFixed(2)} EGP
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold">
                                                    {itemTotal.toFixed(2)} EGP
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Costs Section */}
            <div className="card">
                <div className="form-section">
                    <h2 className="flex items-center gap-2">
                        <DollarSign size={20} /> Shipment Costs
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-gray-600 text-sm">Cost in China</p>
                            <p className="text-2xl font-bold">
                                {parseFloat(shipment.cost_in_china || '0').toFixed(2)} EGP
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">Shipping</p>
                            <p className="text-2xl font-bold">
                                {parseFloat(shipment.shipping || '0').toFixed(2)} EGP
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600 text-sm">Extra Cost</p>
                            <p className="text-2xl font-bold">
                                {parseFloat(shipment.extra_cost || '0').toFixed(2)} EGP
                            </p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-gray-600 text-sm">Total Cost</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {totalCost.toFixed(2)} EGP
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><Package size={24} /></div>
                    <div>
                        <p className="stat-label">Total Items</p>
                        <p className="stat-value">{totalQty}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Total Cost</p>
                        <p className="stat-value">{totalCost.toFixed(2)} EGP</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue"><TrendingUp size={24} /></div>
                    <div>
                        <p className="stat-label">Cost per Item</p>
                        <p className="stat-value">{totalQty > 0 ? (totalCost / totalQty).toFixed(2) : '0.00'} EGP</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
                <button
                    type="button"
                    className="btn"
                    onClick={() => navigate('/shipments')}
                >
                    Back to List
                </button>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate(`/shipments/${shipment.$id}/edit`)}
                >
                    <Edit size={16} /> Edit Shipment
                </button>
            </div>
        </div>
    );
}