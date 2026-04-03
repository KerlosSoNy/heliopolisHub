import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    LogOut,
    Plus,
    ShieldIcon,
    DollarSign,
    History,
    RotateCcw,
    Menu,
    X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/additional', icon: Plus, label: 'Additionals' },
    { to: '/shipments', icon: ShieldIcon, label: 'Shipments' },
    { to: '/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/transactions', icon: DollarSign, label: 'Transactions' },
    { to: '/currency', icon: DollarSign, label: 'Currency Rate' },
    { to: '/returns', icon: RotateCcw, label: 'Returns' },
    { to: '/product-history', icon: History, label: 'Product History' },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setIsOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleNavClick = () => {
        if (isMobile) setIsOpen(false);
    };

    return (
        <>
            {/* ── Mobile Top Bar ── */}
            {isMobile && (
                <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[#1a1a2e] px-4! py-3! text-white shadow-lg">
                    <h2 className="text-lg font-semibold tracking-wide">Heliopolis Hub</h2>
                    <button
                        onClick={() => setIsOpen((prev) => !prev)}
                        className="rounded-md p-1.5 transition-colors hover:bg-white/10 focus:outline-none"
                        aria-label="Toggle sidebar"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>
            )}

            {/* ── Backdrop (mobile only) ── */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside
                className={`
          fixed top-0 left-0 z-50
          flex h-screen w-[240px] flex-col
          bg-[#1a1a2e] text-white
          overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${isMobile
                        ? isOpen
                            ? 'translate-x-0 shadow-2xl'
                            : '-translate-x-full'
                        : 'translate-x-0'
                    }
          ${isMobile ? 'pt-16' : 'pt-0'}
        `}
            >
                <div className="px-2! py-2! border-b border-white/10">
                    <h2 className="text-[1.3rem] font-bold flex items-center gap-2">
                        Heliopolis Hub
                    </h2>
                </div>

                {/* ── Navigation ── */}
                <nav className="flex flex-col gap-0.5 px-2! py-3! flex-1 overflow-y-auto">
                    {navItems.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-4! py-2.5! rounded-lg text-sm
                 no-underline transition-all duration-200
                 ${isActive
                                    ? 'bg-[#6c63ff] text-white shadow-md shadow-[#6c63ff]/30 font-medium'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >
                            <Icon size={18} className="shrink-0" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* ── User Footer ── */}
                <div className="border-t border-white/10 px-2! py-2! mt-auto">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6c63ff] text-sm font-bold uppercase">
                            {user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>

                        {/* User Details */}
                        <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium text-white">
                                {user?.name || 'User'}
                            </span>
                            <span className="truncate text-xs text-white/50">
                                {user?.email}
                            </span>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={logout}
                            title="Logout"
                            className="rounded-md p-1.5! text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-400 focus:outline-none"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}