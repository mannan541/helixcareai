import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
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
import CustomAssessmentBuilderPage from './pages/CustomAssessmentBuilderPage';
import CustomAssessmentConductPage from './pages/CustomAssessmentConductPage';
import ResourceLibraryPage from './pages/ResourceLibraryPage';
import ChildResourcesPage from './pages/ChildResourcesPage';
import AdminBillingPage from './pages/AdminBillingPage';
import TherapistAnalyticsPage from './pages/TherapistAnalyticsPage';
import ParentBillingPage from './pages/ParentBillingPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import UsersListPage from './pages/UsersListPage';
import UserFormPage from './pages/UserFormPage';
// Marketing
import MarketingLayout from './components/marketing/MarketingLayout';
import HomePage from './pages/marketing/HomePage';
import AboutPage from './pages/marketing/AboutPage';
import ServicesPage from './pages/marketing/ServicesPage';
import PlatformPage from './pages/marketing/PlatformPage';
import ContactPage from './pages/marketing/ContactPage';
import PrivacyPage from './pages/marketing/PrivacyPage';
import TermsPage from './pages/marketing/TermsPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="mt-20" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="mt-20" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RedirectUserEdit() {
  const { userId } = useParams<{ userId: string }>();
  return <Navigate to={`/admin/users/${userId}/edit`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Marketing site */}
          <Route element={<MarketingLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/platform" element={<PlatformPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
            <Route path="/schedule/therapist" element={<TherapistSchedulePage />} />
            <Route path="/schedule/parent" element={<ParentSchedulePage />} />
            <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
            <Route path="/admin/slots" element={<AdminSlotsPage />} />
            <Route path="/admin/users" element={<UsersListPage />} />
            <Route path="/users" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/users/new" element={<UserFormPage />} />
            <Route path="/users/new" element={<Navigate to="/admin/users/new" replace />} />
            <Route path="/admin/users/:userId/edit" element={<UserFormPage />} />
            <Route path="/users/:userId/edit" element={<RedirectUserEdit />} />
            <Route path="/assessments/admin" element={<AdminAssessmentsPage />} />
            <Route path="/assessments/conduct" element={<AssessmentConductPage />} />
            <Route path="/assessments/conduct/:templateId" element={<AssessmentConductPage />} />
            <Route path="/admin/assessments/conduct/:templateId" element={<AssessmentConductPage />} />
            <Route path="/assessments/conduct/custom" element={<CustomAssessmentConductPage />} />
            <Route path="/assessments/report/:assessmentId" element={<AssessmentReportPage />} />
            <Route path="/admin/assessments/:assessmentId/report" element={<AssessmentReportPage />} />
            <Route path="/assessments/custom/new" element={<CustomAssessmentBuilderPage />} />
            <Route path="/admin/assessments/custom/new" element={<CustomAssessmentBuilderPage />} />
            <Route path="/assessments/custom/:id/edit" element={<CustomAssessmentBuilderPage />} />
            <Route path="/admin/assessments/custom/:id/edit" element={<CustomAssessmentBuilderPage />} />
            <Route path="/billing/admin" element={<AdminBillingPage />} />
            <Route path="/admin/billing" element={<AdminBillingPage />} />
            <Route path="/analytics/therapist" element={<TherapistAnalyticsPage />} />
            <Route path="/billing/parent" element={<ParentBillingPage />} />
            <Route path="/billing/:invoiceId" element={<InvoiceDetailPage />} />
            <Route path="/admin/billing/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
