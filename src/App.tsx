import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AnalyticsScripts } from './components/AnalyticsScripts';
import { GlobalSeo } from './components/GlobalSeo';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocaleProvider } from './context/LocaleContext';
import { ThemeProvider } from './context/ThemeContext';
import { TextScaleProvider } from './context/TextScaleContext';
import { AccessProvider } from './context/AccessContext';
import { PaymentStatusProvider } from './context/PaymentStatusContext';
import { SequentialLessonProvider } from './context/SequentialLessonContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminLayout from './pages/admin/AdminLayout';
import AdminGuard from './pages/admin/AdminGuard';
import MainLayout from './components/MainLayout';
import NotFoundPage from './pages/NotFoundPage';
import KunlikRejaRedirect from './components/KunlikRejaRedirect';
import { renderLazyPage } from './routeModules';
import { ADMIN_BASE_PATH, adminPath } from './constants/adminPath';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/huquqiy/ommaviy-oferta" element={renderLazyPage('./pages/legal/LegalOfferPage.tsx')} />
      <Route path="/huquqiy/maxfiylik" element={renderLazyPage('./pages/legal/LegalPrivacyPage.tsx')} />
      <Route path="/huquqiy/qaytarish" element={renderLazyPage('./pages/legal/LegalRefundPage.tsx')} />
      <Route path="/teacher-login" element={renderLazyPage('./pages/TeacherLoginPage.tsx')} />
      <Route path="/teacher-register" element={renderLazyPage('./pages/TeacherRegisterPage.tsx')} />
      <Route path="/teacher-cabinet" element={renderLazyPage('./pages/TeacherCabinetPage.tsx')} />
      <Route
        path={ADMIN_BASE_PATH}
        element={
          <AdminAuthProvider>
            <Outlet />
          </AdminAuthProvider>
        }
      >
        <Route index element={<Navigate to={adminPath('/dashboard')} replace />} />
        <Route path="login" element={renderLazyPage('./pages/admin/AdminLoginPage.tsx')} />
        <Route element={<AdminGuard />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={renderLazyPage('./pages/admin/AdminDashboardPage.tsx')} />
            <Route path="users" element={renderLazyPage('./pages/admin/AdminUsersPage.tsx')} />
            <Route path="users/create" element={renderLazyPage('./pages/admin/AdminCreateUserPage.tsx')} />
            <Route path="users/:id" element={renderLazyPage('./pages/admin/AdminUserProfilePage.tsx')} />
            <Route path="payments" element={renderLazyPage('./pages/admin/AdminPaymentsPage.tsx')} />
            <Route path="click-logs" element={renderLazyPage('./pages/admin/AdminClickLogsPage.tsx')} />
            <Route path="referrals" element={renderLazyPage('./pages/admin/AdminReferralsPage.tsx')} />
            <Route path="support" element={renderLazyPage('./pages/admin/AdminSupportPage.tsx')} />
            <Route path="payment-methods" element={renderLazyPage('./pages/admin/AdminPaymentMethodsPage.tsx')} />
            <Route path="tariff-pricing" element={renderLazyPage('./pages/admin/AdminTariffPricingPage.tsx')} />
            <Route path="teachers" element={renderLazyPage('./pages/admin/AdminTeachersPage.tsx')} />
            <Route path="teacher-trials" element={renderLazyPage('./pages/admin/AdminTeacherTrialsPage.tsx')} />
          </Route>
        </Route>
      </Route>

      {!user ? (
        <>
          <Route path="/" element={renderLazyPage('./pages/LandingPage.tsx')} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/welcome" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={renderLazyPage('./pages/LoginPage.tsx')} />
          <Route path="/register" element={renderLazyPage('./pages/RegisterPage.tsx')} />
          <Route path="/forgot-password" element={renderLazyPage('./pages/ForgotPasswordPage.tsx')} />
          <Route path="/teachers" element={renderLazyPage('./pages/TeachersPage.tsx')} />
          <Route path="/teachers/:teacherId" element={renderLazyPage('./pages/TeacherProfilePage.tsx')} />
          <Route path="*" element={<NotFoundPage />} />
        </>
      ) : (
        <>
          <Route path="/" element={<MainLayout />}>
            <Route index element={renderLazyPage('./pages/HomePage.tsx')} />
            <Route path="kunlik-reja" element={<KunlikRejaRedirect />} />
            <Route
              path="kunlik-reja/kun/:dayNum/grammatika/test-variantlar"
              element={renderLazyPage('./pages/DailyGrammarRuleMcqPage.tsx')}
            />
            <Route
              path="kunlik-reja/kun/:dayNum/grammatika/juftlik"
              element={renderLazyPage('./pages/DailyGrammarMatchPage.tsx')}
            />
            <Route
              path="kunlik-reja/kun/:dayNum/grammatika/gap-tuzish"
              element={renderLazyPage('./pages/DailyGrammarSentenceArrangePage.tsx')}
            />
            <Route
              path="kunlik-reja/kun/:dayNum/lugat/tanishish"
              element={renderLazyPage('./pages/DailyVocabTanishishPage.tsx')}
            />
            <Route path="kunlik-reja/kun/:dayNum/lugat/test" element={renderLazyPage('./pages/DailyVocabTestPage.tsx')} />
            <Route path="kunlik-reja/kun/:dayNum/lugat/juftlik" element={renderLazyPage('./pages/DailyVocabPairsPage.tsx')} />
            <Route path="kunlik-reja/kun/:dayNum/:section" element={renderLazyPage('./pages/DailyKunSectionPage.tsx')} />
            <Route path="partner" element={renderLazyPage('./pages/PartnerPage.tsx')} />
            <Route path="games" element={renderLazyPage('./pages/GamesPage.tsx')} />
            <Route path="games/word-swipe" element={renderLazyPage('./pages/WordSwipeRedirectPage.tsx')} />
            <Route
              path="games/word-swipe/:levelNumber/:stageNumber"
              element={renderLazyPage('./pages/WordSwipeGamePage.tsx')}
            />
            <Route path="teachers" element={renderLazyPage('./pages/TeachersPage.tsx')} />
            <Route path="teachers/:teacherId" element={renderLazyPage('./pages/TeacherProfilePage.tsx')} />
            <Route path="help" element={renderLazyPage('./pages/HelpPage.tsx')} />
            <Route path="help/:chatId" element={renderLazyPage('./pages/HelpPage.tsx')} />
            <Route path="profile" element={renderLazyPage('./pages/ProfilePage.tsx')} />
            <Route path="profile/settings" element={renderLazyPage('./pages/ProfileSettingsPage.tsx')} />
            <Route path="invite" element={renderLazyPage('./pages/InvitePage.tsx')} />
            <Route path="statistika" element={renderLazyPage('./pages/StatistikaPage.tsx')} />
            <Route path="kurslar" element={renderLazyPage('./pages/CoursesPage.tsx')} />
            <Route path="kurslar/patent" element={renderLazyPage('./pages/PatentCoursePage.tsx')} />
            <Route path="kurslar/patent/:variantNumber" element={renderLazyPage('./pages/PatentCourseVariantPage.tsx')} />
            <Route path="kurslar/vnzh" element={renderLazyPage('./pages/VnzhCoursePage.tsx')} />
            <Route path="kurslar/vnzh/:sectionSlug" element={renderLazyPage('./pages/VnzhCourseSectionPage.tsx')} />
            <Route path="kurslar/vnzh/:sectionSlug/:taskSlug" element={renderLazyPage('./pages/VnzhCourseTaskPage.tsx')} />
            <Route path="tariflar" element={renderLazyPage('./pages/PricingPage.tsx')} />
            <Route path="pricing" element={renderLazyPage('./pages/PricingPage.tsx')} />
            <Route path="payment" element={renderLazyPage('./pages/PaymentPage.tsx')} />
            <Route path="payment/rahmat/done" element={renderLazyPage('./pages/RahmatReturnPage.tsx')} />
            <Route path="payment-history" element={renderLazyPage('./pages/PaymentHistoryPage.tsx')} />
            <Route path="reyting" element={<Navigate to="/statistika" replace />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <LocaleProvider>
      <ThemeProvider>
        <TextScaleProvider>
        <AuthProvider>
        <Router>
          <GlobalSeo />
          <AnalyticsScripts />
          <AccessProvider>
            <PaymentStatusProvider>
              <SequentialLessonProvider>
                <AppRoutes />
              </SequentialLessonProvider>
            </PaymentStatusProvider>
          </AccessProvider>
        </Router>
        </AuthProvider>
        </TextScaleProvider>
      </ThemeProvider>
      </LocaleProvider>
    </HelmetProvider>
  );
}
