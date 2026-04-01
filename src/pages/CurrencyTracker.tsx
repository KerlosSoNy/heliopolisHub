import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    RefreshCw, TrendingUp, TrendingDown, DollarSign,
    Plus, Trash2, Clock, AlertTriangle, ArrowRight,
    ArrowUpRight, ArrowDownRight, Minus, Activity,
    X,
} from 'lucide-react';
import { currencyRateService } from '../services/currencyRateService';
import { useCollection } from '../hooks/useCollection';
import type { CurrencyRate } from '../types';

export default function CurrencyTracker() {
    const { data: rates, loading, error, refetch } = useCollection<CurrencyRate>({
        fetchFn: useCallback(() => currencyRateService.listAll(), []),
    });

    const [liveRate, setLiveRate] = useState<number | null>(null);
    const [fetchingLive, setFetchingLive] = useState(false);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualRate, setManualRate] = useState('');
    const [manualNote, setManualNote] = useState('');
    const [savingManual, setSavingManual] = useState(false);

    // ✅ Fetch live rate on mount
    useEffect(() => {
        handleFetchLive();
    }, []);

    // ✅ Fetch live rate from API
    const handleFetchLive = async () => {
        setFetchingLive(true);
        try {
            const rate = await currencyRateService.fetchLiveRate();
            setLiveRate(rate);
            setLastFetched(new Date());
        } catch (err) {
            console.error('Failed to fetch live rate:', err);
        } finally {
            setFetchingLive(false);
        }
    };

    // ✅ Fetch and save to database
    const handleFetchAndSave = async () => {
        setFetchingLive(true);
        try {
            const saved = await currencyRateService.fetchAndSave();
            setLiveRate(saved.rate);
            setLastFetched(new Date());
            refetch();
        } catch (err) {
            console.error('Failed to fetch and save rate:', err);
        } finally {
            setFetchingLive(false);
        }
    };

    // ✅ Save manual rate
    const handleSaveManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualRate) return;
        setSavingManual(true);
        try {
            await currencyRateService.create({
                from_currency: 'CNY',
                to_currency: 'EGP',
                rate: parseFloat(manualRate),
                source: 'manual',
                note: manualNote || 'Manually entered rate',
            });
            setShowManualModal(false);
            setManualRate('');
            setManualNote('');
            refetch();
        } catch (err) {
            console.error('Failed to save manual rate:', err);
        } finally {
            setSavingManual(false);
        }
    };

    // ✅ Delete rate entry
    const handleDelete = async (id: string) => {
        if (!confirm('Delete this rate entry?')) return;
        try {
            await currencyRateService.remove(id);
            refetch();
        } catch (err) {
            console.error('Failed to delete rate:', err);
        }
    };

    // ✅ Calculate stats
    const stats = useMemo(() => {
        if (rates.length === 0) return null;

        const rateValues = rates.map((r) => r.rate);
        const latest = rates[0]?.rate || 0;
        const previous = rates[1]?.rate || latest;
        const change = latest - previous;
        const changePercent = previous > 0 ? (change / previous) * 100 : 0;

        // Last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const last7 = rates.filter((r) => new Date(r.$createdAt) >= sevenDaysAgo);
        const avg7 = last7.length > 0
            ? last7.reduce((sum, r) => sum + r.rate, 0) / last7.length
            : 0;

        // Last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const last30 = rates.filter((r) => new Date(r.$createdAt) >= thirtyDaysAgo);
        const avg30 = last30.length > 0
            ? last30.reduce((sum, r) => sum + r.rate, 0) / last30.length
            : 0;

        return {
            latest,
            previous,
            change,
            changePercent,
            high: Math.max(...rateValues),
            low: Math.min(...rateValues),
            avg7: avg7,
            avg30: avg30,
            totalEntries: rates.length,
        };
    }, [rates]);

    // ✅ Simple sparkline chart using CSS
    const chartData = useMemo(() => {
        const reversed = [...rates].reverse().slice(-30); // last 30 entries, oldest first
        if (reversed.length === 0) return [];

        const rateValues = reversed.map((r) => r.rate);
        const min = Math.min(...rateValues);
        const max = Math.max(...rateValues);
        const range = max - min || 1;

        return reversed.map((r) => ({
            rate: r.rate,
            date: new Date(r.$createdAt).toLocaleDateString(),
            height: ((r.rate - min) / range) * 100,
            source: r.source,
        }));
    }, [rates]);

    if (loading) return <div className="loading">Loading currency data...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="page">
            <div className="page-header">
                <h1>💱 Currency Rate Tracker</h1>
                <div className="header-actions">
                    <button
                        className="btn"
                        onClick={handleFetchLive}
                        disabled={fetchingLive}
                    >
                        <RefreshCw size={16} className={fetchingLive ? 'spin' : ''} />
                        {fetchingLive ? 'Fetching...' : 'Refresh Rate'}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleFetchAndSave}
                        disabled={fetchingLive}
                    >
                        <DollarSign size={16} />
                        Fetch & Save
                    </button>
                    <button
                        className="btn"
                        onClick={() => setShowManualModal(true)}
                    >
                        <Plus size={16} /> Manual Entry
                    </button>
                </div>
            </div>

            {/* ✅ Live Rate Display */}
            <div className="card" style={{
                padding: '24px',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(59,130,246,0.1) 100%)',
                border: '1px solid rgba(99,102,241,0.2)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                }}>
                    <div>
                        <p style={{ color: '#888', fontSize: '14px', marginBottom: '4px' }}>
                            Live Exchange Rate
                        </p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <span style={{ fontSize: '42px', fontWeight: 700, color: '#fff' }}>
                                {liveRate ? liveRate.toFixed(4) : '—'}
                            </span>
                            <span style={{ fontSize: '18px', color: '#888' }}>
                                CNY → EGP
                            </span>
                        </div>
                        {lastFetched && (
                            <p style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                                <Clock size={11} /> Last fetched: {lastFetched.toLocaleTimeString()}
                            </p>
                        )}
                    </div>

                    {/* Change indicator */}
                    {stats && stats.change !== 0 && (
                        <div style={{
                            padding: '12px 20px',
                            borderRadius: '12px',
                            background: stats.change > 0
                                ? 'rgba(16,185,129,0.1)'
                                : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${stats.change > 0
                                ? 'rgba(16,185,129,0.3)'
                                : 'rgba(239,68,68,0.3)'}`,
                            textAlign: 'center',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: stats.change > 0 ? '#10b981' : '#ef4444',
                                fontSize: '20px',
                                fontWeight: 700,
                            }}>
                                {stats.change > 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                {stats.change > 0 ? '+' : ''}{stats.change.toFixed(4)}
                            </div>
                            <p style={{
                                fontSize: '12px',
                                color: stats.change > 0 ? '#10b981' : '#ef4444',
                                marginTop: '2px',
                            }}>
                                {stats.change > 0 ? '+' : ''}{stats.changePercent.toFixed(2)}% from last
                            </p>
                        </div>
                    )}

                    {/* Quick converter */}
                    <div style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        minWidth: '200px',
                    }}>
                        <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Quick Convert</p>
                        {liveRate && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#ccc' }}>1 ¥</span>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{liveRate.toFixed(2)} EGP</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#ccc' }}>10 ¥</span>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{(liveRate * 10).toFixed(2)} EGP</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#ccc' }}>100 ¥</span>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{(liveRate * 100).toFixed(2)} EGP</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#ccc' }}>1000 ¥</span>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{(liveRate * 1000).toFixed(2)} EGP</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ✅ Stats Grid */}
            {stats && (
                <div className="stat-grid">
                    <div className="stat-card">
                        <div className="stat-icon blue"><DollarSign size={24} /></div>
                        <div>
                            <p className="stat-label">Latest Rate</p>
                            <p className="stat-value">{stats.latest.toFixed(4)}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green"><TrendingUp size={24} /></div>
                        <div>
                            <p className="stat-label">Highest</p>
                            <p className="stat-value" style={{ color: '#10b981' }}>{stats.high.toFixed(4)}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon red"><TrendingDown size={24} /></div>
                        <div>
                            <p className="stat-label">Lowest</p>
                            <p className="stat-value" style={{ color: '#ef4444' }}>{stats.low.toFixed(4)}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple"><Activity size={24} /></div>
                        <div>
                            <p className="stat-label">7-Day Avg</p>
                            <p className="stat-value">{stats.avg7 > 0 ? stats.avg7.toFixed(4) : '—'}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon orange"><Activity size={24} /></div>
                        <div>
                            <p className="stat-label">30-Day Avg</p>
                            <p className="stat-value">{stats.avg30 > 0 ? stats.avg30.toFixed(4) : '—'}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="stat-label">Total Records</p>
                            <p className="stat-value">{stats.totalEntries}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ Rate Chart (CSS-based bar chart) */}
            {chartData.length > 1 && (
                <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                    <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={20} /> Rate History Chart
                    </h2>
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '3px',
                        height: '200px',
                        padding: '0 10px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        {chartData.map((point, i) => (
                            <div
                                key={i}
                                title={`${point.date}: ${point.rate.toFixed(4)}`}
                                style={{
                                    flex: 1,
                                    height: `${Math.max(point.height, 5)}%`,
                                    background: point.source === 'manual'
                                        ? 'rgba(245,158,11,0.6)'
                                        : 'rgba(99,102,241,0.6)',
                                    borderRadius: '3px 3px 0 0',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    minWidth: '8px',
                                }}
                                onMouseEnter={(e) => {
                                    (e.target as HTMLElement).style.background =
                                        point.source === 'manual'
                                            ? 'rgba(245,158,11,0.9)'
                                            : 'rgba(99,102,241,0.9)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.target as HTMLElement).style.background =
                                        point.source === 'manual'
                                            ? 'rgba(245,158,11,0.6)'
                                            : 'rgba(99,102,241,0.6)';
                                }}
                            />
                        ))}
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        fontSize: '11px',
                        color: '#666',
                    }}>
                        <span>{chartData[0]?.date}</span>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(99,102,241,0.6)' }} />
                                Auto
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(245,158,11,0.6)' }} />
                                Manual
                            </span>
                        </div>
                        <span>{chartData[chartData.length - 1]?.date}</span>
                    </div>
                </div>
            )}

            {/* ✅ Custom Converter */}
            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
                <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={20} /> Currency Converter
                </h2>
                <CurrencyConverter rate={liveRate || stats?.latest || 0} />
            </div>

            {/* ✅ Rate History Table */}
            <div className="card" style={{ padding: '20px' }}>
                <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} /> Rate History
                </h2>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>From</th>
                                <th></th>
                                <th>To</th>
                                <th>Rate</th>
                                <th>Change</th>
                                <th>Source</th>
                                <th>Note</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rates.map((r, index) => {
                                const prevRate = rates[index + 1]?.rate;
                                const change = prevRate ? r.rate - prevRate : 0;
                                const changePercent = prevRate ? (change / prevRate) * 100 : 0;

                                return (
                                    <tr key={r.$id}>
                                        <td>
                                            <div>
                                                <span>{new Date(r.$createdAt).toLocaleDateString()}</span>
                                                <br />
                                                <small style={{ color: '#888' }}>
                                                    {new Date(r.$createdAt).toLocaleTimeString()}
                                                </small>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                background: 'rgba(239,68,68,0.1)',
                                                color: '#ef4444',
                                                fontWeight: 600,
                                                fontSize: '13px',
                                            }}>
                                                🇨🇳 CNY
                                            </span>
                                        </td>
                                        <td><ArrowRight size={16} style={{ color: '#666' }} /></td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                background: 'rgba(16,185,129,0.1)',
                                                color: '#10b981',
                                                fontWeight: 600,
                                                fontSize: '13px',
                                            }}>
                                                🇪🇬 EGP
                                            </span>
                                        </td>
                                        <td>
                                            <strong style={{ fontSize: '16px' }}>{r.rate.toFixed(4)}</strong>
                                        </td>
                                        <td>
                                            {change !== 0 ? (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: change > 0 ? '#10b981' : '#ef4444',
                                                    fontSize: '13px',
                                                }}>
                                                    {change > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                    <span>{change > 0 ? '+' : ''}{change.toFixed(4)}</span>
                                                    <small>({changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%)</small>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#666' }}><Minus size={14} /></span>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                background: r.source === 'auto'
                                                    ? 'rgba(99,102,241,0.1)'
                                                    : 'rgba(245,158,11,0.1)',
                                                color: r.source === 'auto' ? '#6366f1' : '#f59e0b',
                                            }}>
                                                {r.source === 'auto' ? '🤖 Auto' : '✏️ Manual'}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ color: '#888', fontSize: '13px' }}>
                                                {r.note || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn-icon danger"
                                                onClick={() => handleDelete(r.$id)}
                                                title="Delete"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {rates.length === 0 && (
                    <div className="empty-state">
                        <p>No rate history yet. Click "Fetch & Save" to start tracking!</p>
                    </div>
                )}
            </div>

            {/* ✅ Manual Entry Modal */}
            {showManualModal && (
                <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Manual Rate Entry</h2>
                            <button type="button" title="Close" className="btn-icon" onClick={() => setShowManualModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveManual}>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <DollarSign size={14} /> Exchange Rate (1 CNY = ? EGP) *
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    required
                                    placeholder="e.g. 6.8500"
                                    value={manualRate}
                                    onChange={(e) => setManualRate(e.target.value)}
                                />
                            </div>

                            {manualRate && (
                                <div className="calc-preview">
                                    <span>Quick check:</span>
                                    <strong>100 ¥ = {(parseFloat(manualRate) * 100).toFixed(2)} EGP</strong>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Note (optional)</label>
                                <input
                                    placeholder="e.g. Rate from money exchanger"
                                    value={manualNote}
                                    onChange={(e) => setManualNote(e.target.value)}
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn" onClick={() => setShowManualModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={savingManual}>
                                    {savingManual ? 'Saving...' : 'Save Rate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ✅ Currency Converter Component
function CurrencyConverter({ rate }: { rate: number }) {
    const [cnyAmount, setCnyAmount] = useState('100');
    const [egpAmount, setEgpAmount] = useState('');
    const [direction, setDirection] = useState<'cny_to_egp' | 'egp_to_cny'>('cny_to_egp');

    const convert = () => {
        if (rate === 0) return;

        if (direction === 'cny_to_egp') {
            const cny = parseFloat(cnyAmount) || 0;
            setEgpAmount((cny * rate).toFixed(2));
        } else {
            const egp = parseFloat(egpAmount) || 0;
            setCnyAmount((egp / rate).toFixed(2));
        }
    };

    useEffect(() => {
        convert();
    }, [cnyAmount, egpAmount, direction, rate]);

    if (rate === 0) {
        return (
            <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                <AlertTriangle size={24} />
                <p>No rate available. Fetch a live rate first.</p>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
        }}>
            {/* From */}
            <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '12px', color: '#888', marginBottom: '6px', display: 'block' }}>
                    {direction === 'cny_to_egp' ? '🇨🇳 CNY (Chinese Yuan)' : '🇪🇬 EGP (Egyptian Pound)'}
                </label>
                <input
                    title='input'
                    type="number"
                    className="search-input"
                    style={{ width: '100%', fontSize: '20px', padding: '12px' }}
                    value={direction === 'cny_to_egp' ? cnyAmount : egpAmount}
                    onChange={(e) => {
                        if (direction === 'cny_to_egp') {
                            setCnyAmount(e.target.value);
                        } else {
                            setEgpAmount(e.target.value);
                        }
                    }}
                />
            </div>

            {/* Swap button */}
            <button
                className="btn"
                onClick={() => setDirection(direction === 'cny_to_egp' ? 'egp_to_cny' : 'cny_to_egp')}
                style={{
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '18px',
                }}
                title="Swap direction"
            >
                <RefreshCw size={18} />
            </button>

            {/* To */}
            <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '12px', color: '#888', marginBottom: '6px', display: 'block' }}>
                    {direction === 'cny_to_egp' ? '🇪🇬 EGP (Egyptian Pound)' : '🇨🇳 CNY (Chinese Yuan)'}
                </label>
                <div style={{
                    padding: '12px',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#6366f1',
                    background: 'rgba(99,102,241,0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(99,102,241,0.2)',
                }}>
                    {direction === 'cny_to_egp'
                        ? `${egpAmount || '0.00'} EGP`
                        : `${cnyAmount || '0.00'} ¥`
                    }
                </div>
            </div>
        </div>
    );
}