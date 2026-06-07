import { useState, useCallback } from 'react';
import {
    Trash2, Edit, Plus, Ship, DollarSign,
    TrendingUp,
    Eye,
} from 'lucide-react';
import { shipmentService } from '../../services/shipmentService';
import { productService } from '../../services/productService';
import { useCollection } from '../../hooks/useCollection';
import type { Shipment, ShipmentProduct, Product } from '../../types';
import { usePagination } from '../../lib/hooks/usePagination';
import Pagination from '../../components/Pagination';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    // ========== HELPERS ==========
    const getProductName = (id: string): string => {
        const product = products.find((p) => p.$id === id);
        return product?.name || 'Unknown Product';
    };

    const getProduct = (id: string): Product | undefined => {
        return products.find((p) => p.$id === id);
    };

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

    const calcShipmentProfit = (shipment: Shipment) => {
        const parsed = parseProducts(shipment.products);

        let totalRevenue = 0;
        let hasAnyRevenue = false;

        parsed.forEach((sp) => {
            const product = getProduct(sp.productId);
            if (!product) return;

            const calc = calcProductProfit(product);
            totalRevenue += calc.soldPrice * sp.qty;
            if (calc.hasRevenue) hasAnyRevenue = true;
        });

        const shipmentTotalCost = parseFloat(shipment.total_cost || '0');

        return {
            shipmentTotalCost,
            finalProfit: totalRevenue - shipmentTotalCost,
            profitPercentage: shipmentTotalCost > 0
                ? ((totalRevenue - shipmentTotalCost) / shipmentTotalCost) * 100
                : 0,
            hasRevenue: hasAnyRevenue,
        };
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this shipment?')) return;
        await shipmentService.remove(id);
        refetch();
    };

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

    const totals = shipments.reduce(
        (acc, s) => {
            const profitCalc = calcShipmentProfit(s);
            return {
                totalCost: acc.totalCost + profitCalc.shipmentTotalCost,
                totalProfit: acc.totalProfit + profitCalc.finalProfit,
            };
        },
        { totalCost: 0, totalProfit: 0 }
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
                    <button className=" flex w-fit! flex-row cursor-pointer btn bg-blue-700! text-white" onClick={() => navigate('/shipments/create')}>
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
                    <div className="stat-icon red"><TrendingUp size={24} /></div>
                    <div>
                        <p className="stat-label">Total Cost</p>
                        <p className="stat-value">{totals.totalCost.toFixed(2)} EGP</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue"><DollarSign size={24} /></div>
                    <div>
                        <p className="stat-label">Total Profit</p>
                        <p className={`stat-value ${totals.totalProfit >= 0 ? 'text-green' : 'text-danger'}`}>
                            {totals.totalProfit.toFixed(2)} EGP
                        </p>
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
                                <th>Profit</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((s) => {
                                const parsed = parseProducts(s.products);
                                const totalQty = parsed.reduce((sum, sp) => sum + sp.qty, 0);
                                const profitCalc = calcShipmentProfit(s);

                                return (
                                    <tr key={s.$id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="table-avatar-product"><Ship size={16} /></div>
                                                <span className="cursor-pointer text-blue-500 hover:underline" onClick={() => navigate(`/shipments/${s.$id}`)}>
                                                    #{s.$id.slice(0, 8)}
                                                </span>
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
                                        <td><strong>{profitCalc.shipmentTotalCost.toFixed(2)} EGP</strong></td>
                                        <td>
                                            <strong className={profitCalc.finalProfit >= 0 ? 'text-green' : 'text-danger'}>
                                                {profitCalc.finalProfit.toFixed(2)} EGP
                                            </strong>
                                        </td>
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