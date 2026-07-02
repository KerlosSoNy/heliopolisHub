import { useState, useCallback } from 'react';
import {
    Trash2, Edit, Plus, Ship, DollarSign,
    TrendingUp,
    Eye,
} from 'lucide-react';
import { shipmentService } from '../../services/shipmentService';
import { useCollection } from '../../hooks/useCollection';
import type { Shipment, ShipmentProduct } from '../../types';
import { usePagination } from '../../lib/hooks/usePagination';
import Pagination from '../../components/Pagination';
import { useNavigate } from 'react-router-dom';

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

export default function Shipments() {
    const { data: shipments, loading, error, refetch } = useCollection<Shipment>({
        fetchFn: useCallback(() => shipmentService.listAll(), []),
    });
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // ========== HELPERS ==========
    const getProductName = (name: string): string => {
        return name || 'Unknown Product';
    };

    const calcShipmentTotals = (shipment: Shipment) => {
        const parsed = parseProducts(shipment.products);
        const shipmentTotalCost = parseFloat(shipment.total_cost || '0');
        const totalQty = parsed.reduce((sum, sp) => sum + sp.qty, 0);

        return {
            shipmentTotalCost,
            totalQty,
            costPerItem: totalQty > 0 ? shipmentTotalCost / totalQty : 0,
        };
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this shipment?')) return;
        try {
            await shipmentService.remove(id);
            refetch();
        } catch (err) {
            console.error(err);
            alert('Error deleting shipment');
        }
    };

    const filteredShipments = shipments.filter((s: any) => {
        const parsed = parseProducts(s.products);
        const productNames = parsed.map((sp: any) => getProductName(sp.productName).toLowerCase());
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

    const totals = shipments.reduce(
        (acc, s) => {
            const calcs = calcShipmentTotals(s);
            return {
                totalCost: acc.totalCost + calcs.shipmentTotalCost,
                totalItems: acc.totalItems + calcs.totalQty,
            };
        },
        { totalCost: 0, totalItems: 0 }
    );

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
                    <button
                        className="flex w-fit! flex-row cursor-pointer btn bg-blue-700! text-white"
                        onClick={() => navigate('/shipments/create')}
                    >
                        <Plus size={16} /><span className="text-nowrap"> Add Shipment</span>
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
                    <div className="stat-icon red"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Total Cost</p>
                        <p className="stat-value">{totals.totalCost.toFixed(2)} EGP</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue"><TrendingUp size={24} /></div>
                    <div>
                        <p className="stat-label">Total Items</p>
                        <p className="stat-value">{totals.totalItems}</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card mt-4">
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Shipment</th>
                                <th>Products</th>
                                <th>Items</th>
                                <th>Total Cost</th>
                                <th>Cost/Item</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((s) => {
                                const parsed = parseProducts(s.products);
                                const calcs = calcShipmentTotals(s);

                                return (
                                    <tr key={s.$id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="table-avatar-product"><Ship size={16} /></div>
                                                <span
                                                    className="cursor-pointer text-blue-500 hover:underline"
                                                    onClick={() => navigate(`/shipments/${s.$id}`)}
                                                >
                                                    #{s.$id.slice(0, 8)}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="shipment-product-tags-table">
                                                {parsed.map((sp, idx) => (
                                                    <span key={idx} className="shipment-product-tag-sm">
                                                        {/* @ts-ignore */}
                                                        {getProductName(sp.productName)} <strong>×{sp.qty}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td><strong>{calcs.totalQty}</strong></td>
                                        <td><strong>{calcs.shipmentTotalCost.toFixed(2)} EGP</strong></td>
                                        <td><strong>{calcs.costPerItem.toFixed(2)} EGP</strong></td>
                                        <td>{new Date(s.$createdAt).toLocaleDateString()}</td>
                                        <td className="actions">
                                            <button
                                                title="View"
                                                type="button"
                                                className="btn-icon"
                                                onClick={() => navigate(`/shipments/${s.$id}`)}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                title="Edit"
                                                type="button"
                                                className="btn-icon"
                                                onClick={() => navigate(`/shipments/${s.$id}/edit`)}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                title="Delete"
                                                type="button"
                                                className="btn-icon danger"
                                                onClick={() => handleDelete(s.$id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
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
        </div>
    );
}