import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
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
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Login from './pages/Login';
import './App.css';
import AdditionalPage from './pages/Additional';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import OrderDetail from './pages/OrderDetail';
import Transactions from './pages/Transactions';
import ProductHistoryPage from './pages/ProductHistory';
import CurrencyTracker from './pages/CurrencyTracker';
import Returns from './services/Returns';

function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo border-0! flex flex-row items-center">
          Dashboard</h2>
        <nav className=' border-t! pt-3! border-gray-600! '>
          <NavLink to="/" end>
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          <NavLink to="/customers">
            <Users size={18} /> Customers
          </NavLink>
          <NavLink to="/products">
            <Package size={18} /> Products
          </NavLink>
          <NavLink to="/additional">
            <Plus size={18} /> Additionals
          </NavLink>
          <NavLink to="/shipments">
            <ShieldIcon size={18} /> Shipments
          </NavLink>
          <NavLink to="/orders">
            <ShoppingCart size={18} /> Orders
          </NavLink>
          <NavLink to="/transactions">
            <DollarSign size={18} /> Transactions
          </NavLink>
          <NavLink to="/currency">
            <DollarSign size={18} />
            <span>Currency Rate</span>
          </NavLink>
          <NavLink to="/returns">
            <RotateCcw size={18} />
            <span>Returns</span>
          </NavLink>
          <NavLink to="/product-history">
            <History size={18} /> Product History
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="w-[calc(100%-240px)] p-8! max-h-screen overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/additional" element={<AdditionalPage />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="/shipments/:id" element={<ShipmentDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/currency" element={<CurrencyTracker />} />
          <Route path="/product-history" element={<ProductHistoryPage />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  // 👇 Show loading while checking auth
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // 👇 Not logged in → show login on ANY route
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 👇 Logged in → show dashboard
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className='max-w-full w-full'>
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;