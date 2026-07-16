import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EditProfilePage from './pages/EditProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import ChildrenListPage from './pages/ChildrenListPage';
import ChildDetailPage from './pages/ChildDetailPage';
import ChildFormPage from './pages/ChildFormPage';
import SessionsPage from './pages/SessionsPage';
import SessionFormPage from './pages/SessionFormPage';
import SessionDetailPage from './pages/SessionDetailPage';
import ChatPage from './pages/ChatPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ChildReportPage from './pages/ChildReportPage';
import ChildTimelinePage from './pages/ChildTimelinePage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import TherapistSchedulePage from './pages/TherapistSchedulePage';
import ParentSchedulePage from './pages/ParentSchedulePage';
import ChildSchedulePage from './pages/ChildSchedulePage';
import AdminAppointmentsPage from './pages/AdminAppointmentsPage';
import AdminSlotsPage from './pages/AdminSlotsPage';
import AdminAssessmentsPage from './pages/AdminAssessmentsPage';
import AssessmentConductPage from './pages/AssessmentConductPage';
import AssessmentReportPage from './pages/AssessmentReportPage';
import ResourceLibraryPage from './pages/ResourceLibraryPage';
import ChildResourcesPage from './pages/ChildResourcesPage';
import AdminBillingPage from './pages/AdminBillingPage';
import ParentBillingPage from './pages/ParentBillingPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import UsersListPage from './pages/UsersListPage';
import UserFormPage from './pages/UserFormPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="mt-20" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="mt-20" />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<EditProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/children" element={<ChildrenListPage />} />
            <Route path="/children/new" element={<ChildFormPage />} />
            <Route path="/children/:childId" element={<ChildDetailPage />} />
            <Route path="/children/:childId/edit" element={<ChildFormPage />} />
            <Route path="/children/:childId/timeline" element={<ChildTimelinePage />} />
            <Route path="/children/:childId/sessions" element={<SessionsPage />} />
            <Route path="/children/:childId/sessions/new" element={<SessionFormPage />} />
            <Route path="/children/:childId/sessions/:sessionId" element={<SessionDetailPage />} />
            <Route path="/children/:childId/sessions/:sessionId/edit" element={<SessionFormPage />} />
            <Route path="/children/:childId/analytics" element={<AnalyticsPage />} />
            <Route path="/children/:childId/report" element={<ChildReportPage />} />
            <Route path="/children/:childId/chat" element={<ChatPage />} />
            <Route path="/children/:childId/schedule" element={<ChildSchedulePage />} />
            <Route path="/children/:childId/resources" element={<ChildResourcesPage />} />
            <Route path="/resources" element={<ResourceLibraryPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/appointments/book" element={<BookAppointmentPage />} />
            <Route path="/schedule" element={<TherapistSchedulePage />} />
            <Route path="/parent/schedule" element={<ParentSchedulePage />} />
            <Route path="/billing" element={<ParentBillingPage />} />
            <Route path="/billing/invoices/:invoiceId" element={<InvoiceDetailPage />} />
            <Route path="/admin/billing" element={<AdminBillingPage />} />
            <Route path="/admin/billing/invoices/:invoiceId" element={<InvoiceDetailPage />} />
            <Route path="/admin/assessments" element={<AdminAssessmentsPage />} />
            <Route path="/admin/assessments/conduct/:typeId" element={<AssessmentConductPage />} />
            <Route path="/admin/assessments/:assessmentId/report" element={<AssessmentReportPage />} />
            <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
            <Route path="/admin/slots" element={<AdminSlotsPage />} />
            <Route path="/users" element={<UsersListPage />} />
            <Route path="/users/new" element={<UserFormPage />} />
            <Route path="/users/:userId/edit" element={<UserFormPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
