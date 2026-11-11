import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AdminShellLayout from './components/layout/AdminShellLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import UserDetailPage from './pages/users/UserDetailPage';
import RestaurantsPage from './pages/restaurants/RestaurantsPage';
import RestaurantDetailPage from './pages/restaurants/RestaurantDetailPage';
import CreateRestaurantPage from './pages/restaurants/CreateRestaurantPage';
import BookingsPage from './pages/bookings/BookingsPage';
import ReviewsPage from './pages/reviews/ReviewsPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import CommissionsPage from './pages/commissions/CommissionsPage';
import SettlementsPage from './pages/settlements/SettlementsPage';
import OfferApprovalPage from './pages/offers/OfferApprovalPage';
import OffersManagePage from './pages/offers/OffersManagePage';
import DiscountAnalytics from './pages/analytics/DiscountAnalytics';
import RevenueAnalytics from './pages/analytics/RevenueAnalytics';

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? '/admin-panel' : undefined}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AdminShellLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="restaurants/new" element={<CreateRestaurantPage />} />
          <Route path="restaurants/:id" element={<RestaurantDetailPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="commissions" element={<CommissionsPage />} />
          <Route path="settlements" element={<SettlementsPage />} />
          <Route path="offers" element={<OffersManagePage />} />
          <Route path="offers/approval" element={<OfferApprovalPage />} />
          <Route path="analytics/discounts" element={<DiscountAnalytics />} />
          <Route path="analytics/revenue" element={<RevenueAnalytics />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
