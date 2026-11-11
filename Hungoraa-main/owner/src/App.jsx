import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppShellLayout from './components/layout/AppShellLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import BookingsPage from './pages/bookings/BookingsPage';
import BookingDetailPage from './pages/bookings/BookingDetailPage';
import MenuPage from './pages/menu/MenuPage';
import TablesPage from './pages/tables/TablesPage';
import OffersPage from './pages/offers/OffersPage';
import ReviewsPage from './pages/reviews/ReviewsPage';
import ReportsPage from './pages/reports/ReportsPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import RestaurantsPage from './pages/restaurants/RestaurantsPage';
import RestaurantFormPage from './pages/restaurants/RestaurantFormPage';

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'owner' && user?.role !== 'admin') return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter basename="/owner">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppShellLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="restaurants/new" element={<RestaurantFormPage />} />
          <Route path="restaurants/:id/edit" element={<RestaurantFormPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
