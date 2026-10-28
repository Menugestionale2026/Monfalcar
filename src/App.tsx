import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireAdmin } from './lib/auth';
import { SiteInfoProvider } from './lib/siteInfo';
import { ScrollToTop, SiteLayout } from './components/Layout';
import { HomePage } from './pages/Home';
import { ServicesPage } from './pages/Services';
import { CarsPage } from './pages/Cars';
import { CarDetailPage } from './pages/CarDetail';
import { BookingPage } from './pages/Booking';
import { ContactsPage } from './pages/Contacts';
import { PrivacyPage } from './pages/Privacy';
import { NotFoundPage } from './pages/NotFound';
import { AdminLoginPage } from './pages/admin/Login';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/Dashboard';
import { AdminBookingsPage } from './pages/admin/Bookings';
import { AdminCarsPage } from './pages/admin/Cars';
import { AdminCarFormPage } from './pages/admin/CarForm';
import { AdminRequestsPage } from './pages/admin/Requests';
import { AdminHoursPage } from './pages/admin/Hours';
import { AdminBusinessPage } from './pages/admin/Business';
import { AdminAccountPage } from './pages/admin/Account';
import { AdminNotificationsPage } from './pages/admin/Notifications';

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <SiteInfoProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="servizi" element={<ServicesPage />} />
            <Route path="auto" element={<CarsPage />} />
            <Route path="auto/:id" element={<CarDetailPage />} />
            <Route path="prenota" element={<BookingPage />} />
            <Route path="contatti" element={<ContactsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route
            path="admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="prenotazioni" element={<AdminBookingsPage />} />
            <Route path="auto" element={<AdminCarsPage />} />
            <Route path="auto/nuova" element={<AdminCarFormPage />} />
            <Route path="auto/:id" element={<AdminCarFormPage />} />
            <Route path="richieste" element={<AdminRequestsPage />} />
            <Route path="orari" element={<AdminHoursPage />} />
            <Route path="attivita" element={<AdminBusinessPage />} />
            <Route path="notifiche" element={<AdminNotificationsPage />} />
            <Route path="account" element={<AdminAccountPage />} />
          </Route>
        </Routes>
        </SiteInfoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
