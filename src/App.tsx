import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Login from './pages/Login';
import AdditionalPage from './pages/Additional';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import OrderDetail from './pages/OrderDetail';
import Transactions from './pages/Transactions';
import ProductHistoryPage from './pages/ProductHistory';
import CurrencyTracker from './pages/CurrencyTracker';
import Returns from './services/Returns';
import Sidebar from './components/Sidebar';

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#f0f2f5]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="w-full md:ml-60! md:w-[calc(100%-240px)] p-4! md:p-8! max-h-screen overflow-y-auto mt-14! md:mt-0!">
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5] gap-4">
        <div className="w-10 h-10 border-4 border-[#e8e8e8] border-t-[#6c63ff] rounded-full animate-spin" />
        <p className="text-gray-500 text-base">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

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
        <div className="max-w-full w-full">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;