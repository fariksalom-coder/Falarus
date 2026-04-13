import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessProvider } from './context/AccessContext';
import { SequentialLessonProvider } from './context/SequentialLessonContext';
import { GrammarCatalogProvider } from './context/GrammarCatalogContext';
import { SequentialAccessEnforcer } from './components/SequentialAccessEnforcer';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminLayout from './pages/admin/AdminLayout';
import AdminGuard from './pages/admin/AdminGuard';
import MainLayout from './components/MainLayout';
import { renderLazyPage } from './routeModules';

function VocabularyPartRoute() {
  const { topicId, subtopicId, partId } = useParams();
  return renderLazyPage('./pages/VocabularyPartPage.tsx', undefined, `${topicId}-${subtopicId}-${partId}`);
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminAuthProvider>
            <Outlet />
          </AdminAuthProvider>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="login" element={renderLazyPage('./pages/admin/AdminLoginPage.tsx')} />
        <Route element={<AdminGuard />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={renderLazyPage('./pages/admin/AdminDashboardPage.tsx')} />
            <Route path="users" element={renderLazyPage('./pages/admin/AdminUsersPage.tsx')} />
            <Route path="users/:id" element={renderLazyPage('./pages/admin/AdminUserProfilePage.tsx')} />
            <Route path="payments" element={renderLazyPage('./pages/admin/AdminPaymentsPage.tsx')} />
            <Route path="subscriptions" element={renderLazyPage('./pages/admin/AdminSubscriptionsPage.tsx')} />
            <Route path="referrals" element={renderLazyPage('./pages/admin/AdminReferralsPage.tsx')} />
            <Route path="support" element={renderLazyPage('./pages/admin/AdminSupportPage.tsx')} />
            <Route path="payment-methods" element={renderLazyPage('./pages/admin/AdminPaymentMethodsPage.tsx')} />
            <Route path="tariff-pricing" element={renderLazyPage('./pages/admin/AdminTariffPricingPage.tsx')} />
            <Route path="pricing" element={renderLazyPage('./pages/admin/AdminPricingPage.tsx')} />
            <Route path="grammar" element={renderLazyPage('./pages/admin/AdminGrammarPage.tsx')} />
          </Route>
        </Route>
      </Route>

      {!user ? (
        <>
          <Route path="/auth" element={renderLazyPage('./pages/AuthPage.tsx')} />
          <Route path="/register" element={renderLazyPage('./pages/AuthPage.tsx')} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<MainLayout />}>
            <Route index element={renderLazyPage('./pages/HomePage.tsx')} />
            <Route path="russian" element={renderLazyPage('./pages/RussianCoursePage.tsx')} />
            <Route path="russian/grammar" element={renderLazyPage('./pages/Dashboard.tsx')} />
            <Route path="partner" element={renderLazyPage('./pages/PartnerPage.tsx')} />
            <Route path="vocabulary" element={renderLazyPage('./pages/VocabularyPage.tsx')} />
            <Route path="vocabulary/:topicId" element={renderLazyPage('./pages/VocabularyTopicPage.tsx')} />
            <Route path="vocabulary/:topicId/:subtopicId" element={renderLazyPage('./pages/VocabularySubtopicPage.tsx')} />
            <Route path="vocabulary/:topicId/:subtopicId/:partId" element={<VocabularyPartRoute />} />
            <Route path="vocabulary/:topicId/:subtopicId/:partId/:mode" element={<VocabularyPartRoute />} />
            <Route path="profile" element={renderLazyPage('./pages/ProfilePage.tsx')} />
            <Route path="profile/settings" element={renderLazyPage('./pages/ProfileSettingsPage.tsx')} />
            <Route path="invite" element={renderLazyPage('./pages/ReferralPage.tsx')} />
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
            <Route path="payment-history" element={renderLazyPage('./pages/PaymentHistoryPage.tsx')} />
            <Route path="reyting" element={<Navigate to="/statistika?tab=leaderboard" replace />} />
            <Route path="preview/lesson/:id" element={renderLazyPage('./pages/LessonPreviewPage.tsx')} />
            <Route path="preview/vocabulary/:subtopicId" element={renderLazyPage('./pages/VocabularySubtopicPreviewPage.tsx')} />
          </Route>

          <Route path="/lesson-1" element={renderLazyPage('./pages/LessonOnePage.tsx')} />
          <Route path="/lesson-2" element={renderLazyPage('./pages/LessonTwoPage.tsx')} />
          <Route path="/lesson-3" element={renderLazyPage('./pages/LessonThreePage.tsx')} />
          <Route path="/lesson-4" element={renderLazyPage('./pages/LessonFourPage.tsx')} />
          <Route path="/lesson-5" element={renderLazyPage('./pages/LessonFivePage.tsx')} />
          <Route path="/lesson-6" element={renderLazyPage('./pages/LessonSixPage.tsx')} />
          <Route path="/lesson-7" element={renderLazyPage('./pages/LessonSevenPage.tsx')} />
          <Route path="/lesson-8" element={renderLazyPage('./pages/LessonEightPage.tsx')} />
          <Route path="/lesson-9" element={renderLazyPage('./pages/LessonNinePage.tsx')} />
          <Route path="/lesson-10" element={renderLazyPage('./pages/LessonTenPage.tsx')} />
          <Route path="/lesson-11" element={renderLazyPage('./pages/LessonElevenPage.tsx')} />
          <Route path="/lesson-12" element={renderLazyPage('./pages/LessonTwelvePage.tsx')} />
          <Route path="/lesson-13" element={renderLazyPage('./pages/LessonThirteenPage.tsx')} />
          <Route path="/lesson-14" element={renderLazyPage('./pages/LessonFourteenPage.tsx')} />
          <Route path="/lesson-15" element={renderLazyPage('./pages/LessonFifteenPage.tsx')} />
          <Route path="/lesson-16" element={renderLazyPage('./pages/LessonSixteenPage.tsx')} />
          <Route path="/lesson-17" element={renderLazyPage('./pages/LessonSeventeenPage.tsx')} />
          <Route path="/lesson-18" element={renderLazyPage('./pages/LessonEighteenPage.tsx')} />
          <Route path="/lesson-19" element={renderLazyPage('./pages/LessonNineteenPage.tsx')} />
          <Route path="/lesson-20" element={renderLazyPage('./pages/LessonTwentyPage.tsx')} />
          <Route path="/lesson-21" element={renderLazyPage('./pages/LessonTwentyOnePage.tsx')} />
          <Route path="/lesson-22" element={renderLazyPage('./pages/LessonTwentyTwoPage.tsx')} />
          <Route path="/lesson-23" element={renderLazyPage('./pages/LessonTwentyThreePage.tsx')} />
          <Route path="/lesson-24" element={renderLazyPage('./pages/LessonTwentyFourPage.tsx')} />
          <Route path="/lesson-1/salomlashish-test" element={renderLazyPage('./pages/GreetingTestPage.tsx')} />
          <Route path="/lesson-1/salomlashish-test/quiz" element={renderLazyPage('./pages/GreetingQuizPage.tsx')} />
          <Route path="/lesson-1/juftini-toping" element={renderLazyPage('./pages/MatchingPairsPage.tsx')} />
          <Route path="/lesson-1/gapni-tuzing" element={renderLazyPage('./pages/SentenceBuilderPage.tsx')} />
          <Route path="/lesson-1/bitta-mashq" element={<Navigate to="/lesson-1/vazifa/1" replace />} />
          <Route path="/lesson-1/mustahkamlash" element={<Navigate to="/lesson-1/vazifa/1" replace />} />
          {/* RR7: `/lesson-:id/vazifa/...` URL bilan `/lesson-1/...` mos kelmaydi; har bir dars uchun aniq yo‘l */}
          {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
            <Route
              key={`vazifa-${n}`}
              path={`/lesson-${n}/vazifa/:vazifaId`}
              element={renderLazyPage('./pages/GrammarLessonTaskPage.tsx')}
            />
          ))}
          <Route path="/lesson-2/mustahkamlash" element={<Navigate to="/lesson-2/vazifa/1" replace />} />
          <Route path="/lesson-3/mustahkamlash" element={<Navigate to="/lesson-3/vazifa/1" replace />} />
          <Route path="/lesson-4/mustahkamlash" element={<Navigate to="/lesson-4/vazifa/1" replace />} />
          <Route path="/lesson-5/mustahkamlash" element={<Navigate to="/lesson-5/vazifa/1" replace />} />
          <Route path="/lesson-6/mustahkamlash" element={<Navigate to="/lesson-6/vazifa/1" replace />} />
          <Route path="/lesson-7/mustahkamlash" element={<Navigate to="/lesson-7/vazifa/1" replace />} />
          <Route path="/lesson-8/mustahkamlash" element={<Navigate to="/lesson-8/vazifa/1" replace />} />
          <Route path="/lesson-9/mustahkamlash" element={<Navigate to="/lesson-9/vazifa/1" replace />} />
          <Route path="/lesson-10/mustahkamlash" element={<Navigate to="/lesson-10/vazifa/1" replace />} />
          {/* RR7: `lesson-:id` inline params ishlamaydi; 11–24 uchun aniq yo'llar */}
          <Route path="/lesson-11/mustahkamlash" element={renderLazyPage('./pages/GrammarLessonTaskPage.tsx')} />
          <Route path="/lesson-11/zadanie-1" element={renderLazyPage('./pages/GrammarLessonTaskPage.tsx')} />
          <Route path="/lesson-15/mustahkamlash" element={renderLazyPage('./pages/GrammarLessonTaskPage.tsx')} />
          {[
            ...Array.from({ length: 14 }, (_, i) => `/lesson-11/topshiriq-${i + 2}`),
            ...Array.from({ length: 1 }, () => `/lesson-12/topshiriq-1`),
            ...Array.from({ length: 1 }, () => `/lesson-13/topshiriq-1`),
            ...Array.from({ length: 16 }, (_, i) => `/lesson-14/topshiriq-${i + 1}`),
            ...Array.from({ length: 7 }, (_, i) => `/lesson-15/topshiriq-${i + 1}`),
            ...Array.from({ length: 3 }, (_, i) => `/lesson-16/topshiriq-${i + 1}`),
            ...Array.from({ length: 17 }, (_, i) => `/lesson-17/topshiriq-${i + 1}`),
            ...Array.from({ length: 5 }, (_, i) => `/lesson-18/topshiriq-${i + 1}`),
            ...Array.from({ length: 16 }, (_, i) => `/lesson-19/topshiriq-${i + 1}`),
            ...Array.from({ length: 7 }, (_, i) => `/lesson-20/topshiriq-${i + 1}`),
            ...Array.from({ length: 1 }, () => `/lesson-21/topshiriq-1`),
            ...Array.from({ length: 12 }, (_, i) => `/lesson-22/topshiriq-${i + 1}`),
            ...Array.from({ length: 2 }, (_, i) => `/lesson-23/topshiriq-${i + 1}`),
            ...Array.from({ length: 4 }, (_, i) => `/lesson-24/topshiriq-${i + 1}`),
          ].map((p) => (
            <Route key={p} path={p} element={renderLazyPage('./pages/GrammarLessonTaskPage.tsx')} />
          ))}
          <Route path="/lesson/:id" element={renderLazyPage('./pages/LessonPage.tsx')} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AccessProvider>
          <SequentialLessonProvider>
            <GrammarCatalogProvider>
              <AppRoutes />
            </GrammarCatalogProvider>
            <SequentialAccessEnforcer />
          </SequentialLessonProvider>
        </AccessProvider>
      </Router>
    </AuthProvider>
  );
}
