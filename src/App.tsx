import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessProvider } from './context/AccessContext';
import { SequentialLessonProvider } from './context/SequentialLessonContext';
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
          <Route path="/lesson-15/mustahkamlash" element={renderLazyPage('./pages/LessonFifteenPracticePage.tsx')} />
          <Route path="/lesson-15/topshiriq-1" element={renderLazyPage('./pages/LessonFifteenTaskOnePage.tsx')} />
          <Route path="/lesson-15/topshiriq-2" element={renderLazyPage('./pages/LessonFifteenTaskTwoPage.tsx')} />
          <Route path="/lesson-15/topshiriq-3" element={renderLazyPage('./pages/LessonFifteenTaskThreePage.tsx')} />
          <Route path="/lesson-15/topshiriq-4" element={renderLazyPage('./pages/LessonFifteenTaskFourPage.tsx')} />
          <Route path="/lesson-15/topshiriq-5" element={renderLazyPage('./pages/LessonFifteenTaskFivePage.tsx')} />
          <Route path="/lesson-15/topshiriq-6" element={renderLazyPage('./pages/LessonFifteenTaskSixPage.tsx')} />
          <Route path="/lesson-15/topshiriq-7" element={renderLazyPage('./pages/LessonFifteenTaskSevenPage.tsx')} />
          <Route path="/lesson-16" element={renderLazyPage('./pages/LessonSixteenPage.tsx')} />
          <Route path="/lesson-16/topshiriq-1" element={renderLazyPage('./pages/LessonSixteenTaskOnePage.tsx')} />
          <Route path="/lesson-16/topshiriq-2" element={renderLazyPage('./pages/LessonSixteenTaskTwoPage.tsx')} />
          <Route path="/lesson-16/topshiriq-3" element={renderLazyPage('./pages/LessonSixteenTaskThreePage.tsx')} />
          <Route path="/lesson-17" element={renderLazyPage('./pages/LessonSeventeenPage.tsx')} />
          <Route path="/lesson-17/topshiriq-1" element={renderLazyPage('./pages/LessonSeventeenTaskOnePage.tsx')} />
          <Route path="/lesson-17/topshiriq-2" element={renderLazyPage('./pages/LessonSeventeenTaskTwoPage.tsx')} />
          <Route path="/lesson-17/topshiriq-3" element={renderLazyPage('./pages/LessonSeventeenTaskThreePage.tsx')} />
          <Route path="/lesson-17/topshiriq-4" element={renderLazyPage('./pages/LessonSeventeenTaskFourPage.tsx')} />
          <Route path="/lesson-17/topshiriq-5" element={renderLazyPage('./pages/LessonSeventeenTaskFivePage.tsx')} />
          <Route path="/lesson-17/topshiriq-6" element={renderLazyPage('./pages/LessonSeventeenTaskSixPage.tsx')} />
          <Route path="/lesson-17/topshiriq-7" element={renderLazyPage('./pages/LessonSeventeenTaskSevenPage.tsx')} />
          <Route path="/lesson-17/topshiriq-8" element={renderLazyPage('./pages/LessonSeventeenTaskEightPage.tsx')} />
          <Route path="/lesson-17/topshiriq-9" element={renderLazyPage('./pages/LessonSeventeenTaskNinePage.tsx')} />
          <Route path="/lesson-17/topshiriq-10" element={renderLazyPage('./pages/LessonSeventeenTaskTenPage.tsx')} />
          <Route path="/lesson-17/topshiriq-11" element={renderLazyPage('./pages/LessonSeventeenTaskElevenPage.tsx')} />
          <Route path="/lesson-17/topshiriq-12" element={renderLazyPage('./pages/LessonSeventeenTaskTwelvePage.tsx')} />
          <Route path="/lesson-17/topshiriq-13" element={renderLazyPage('./pages/LessonSeventeenTaskThirteenPage.tsx')} />
          <Route path="/lesson-17/topshiriq-14" element={renderLazyPage('./pages/LessonSeventeenTaskFourteenPage.tsx')} />
          <Route path="/lesson-17/topshiriq-15" element={renderLazyPage('./pages/LessonSeventeenTaskFifteenPage.tsx')} />
          <Route path="/lesson-17/topshiriq-16" element={renderLazyPage('./pages/LessonSeventeenTaskSixteenPage.tsx')} />
          <Route path="/lesson-17/topshiriq-17" element={renderLazyPage('./pages/LessonSeventeenTaskSeventeenPage.tsx')} />
          <Route path="/lesson-18" element={renderLazyPage('./pages/LessonEighteenPage.tsx')} />
          <Route path="/lesson-18/topshiriq-1" element={renderLazyPage('./pages/LessonEighteenTaskOnePage.tsx')} />
          <Route path="/lesson-18/topshiriq-2" element={renderLazyPage('./pages/LessonEighteenTaskTwoPage.tsx')} />
          <Route path="/lesson-18/topshiriq-3" element={renderLazyPage('./pages/LessonEighteenTaskThreePage.tsx')} />
          <Route path="/lesson-18/topshiriq-4" element={renderLazyPage('./pages/LessonEighteenTaskFourPage.tsx')} />
          <Route path="/lesson-18/topshiriq-5" element={renderLazyPage('./pages/LessonEighteenTaskFivePage.tsx')} />
          <Route path="/lesson-19" element={renderLazyPage('./pages/LessonNineteenPage.tsx')} />
          <Route path="/lesson-19/topshiriq-1" element={renderLazyPage('./pages/LessonNineteenTaskOnePage.tsx')} />
          <Route path="/lesson-19/topshiriq-2" element={renderLazyPage('./pages/LessonNineteenTaskTwoPage.tsx')} />
          <Route path="/lesson-19/topshiriq-3" element={renderLazyPage('./pages/LessonNineteenTaskThreePage.tsx')} />
          <Route path="/lesson-19/topshiriq-4" element={renderLazyPage('./pages/LessonNineteenTaskFourPage.tsx')} />
          <Route path="/lesson-19/topshiriq-5" element={renderLazyPage('./pages/LessonNineteenTaskFivePage.tsx')} />
          <Route path="/lesson-19/topshiriq-6" element={renderLazyPage('./pages/LessonNineteenTaskSixPage.tsx')} />
          <Route path="/lesson-19/topshiriq-7" element={renderLazyPage('./pages/LessonNineteenTaskSevenPage.tsx')} />
          <Route path="/lesson-19/topshiriq-8" element={renderLazyPage('./pages/LessonNineteenTaskEightPage.tsx')} />
          <Route path="/lesson-19/topshiriq-9" element={renderLazyPage('./pages/LessonNineteenTaskNinePage.tsx')} />
          <Route path="/lesson-19/topshiriq-10" element={renderLazyPage('./pages/LessonNineteenTaskTenPage.tsx')} />
          <Route path="/lesson-19/topshiriq-11" element={renderLazyPage('./pages/LessonNineteenTaskElevenPage.tsx')} />
          <Route path="/lesson-19/topshiriq-12" element={renderLazyPage('./pages/LessonNineteenTaskTwelvePage.tsx')} />
          <Route path="/lesson-19/topshiriq-13" element={renderLazyPage('./pages/LessonNineteenTaskThirteenPage.tsx')} />
          <Route path="/lesson-19/topshiriq-14" element={renderLazyPage('./pages/LessonNineteenTaskFourteenPage.tsx')} />
          <Route path="/lesson-19/topshiriq-15" element={renderLazyPage('./pages/LessonNineteenTaskFifteenPage.tsx')} />
          <Route path="/lesson-19/topshiriq-16" element={renderLazyPage('./pages/LessonNineteenTaskSixteenPage.tsx')} />
          <Route path="/lesson-20" element={renderLazyPage('./pages/LessonTwentyPage.tsx')} />
          <Route path="/lesson-20/topshiriq-1" element={renderLazyPage('./pages/LessonTwentyTaskOnePage.tsx')} />
          <Route path="/lesson-20/topshiriq-2" element={renderLazyPage('./pages/LessonTwentyTaskTwoPage.tsx')} />
          <Route path="/lesson-20/topshiriq-3" element={renderLazyPage('./pages/LessonTwentyTaskThreePage.tsx')} />
          <Route path="/lesson-20/topshiriq-4" element={renderLazyPage('./pages/LessonTwentyTaskFourPage.tsx')} />
          <Route path="/lesson-20/topshiriq-5" element={renderLazyPage('./pages/LessonTwentyTaskFivePage.tsx')} />
          <Route path="/lesson-20/topshiriq-6" element={renderLazyPage('./pages/LessonTwentyTaskSixPage.tsx')} />
          <Route path="/lesson-20/topshiriq-7" element={renderLazyPage('./pages/LessonTwentyTaskSevenPage.tsx')} />
          <Route path="/lesson-21" element={renderLazyPage('./pages/LessonTwentyOnePage.tsx')} />
          <Route path="/lesson-21/topshiriq-1" element={renderLazyPage('./pages/LessonTwentyOneTaskOnePage.tsx')} />
          <Route path="/lesson-22" element={renderLazyPage('./pages/LessonTwentyTwoPage.tsx')} />
          <Route path="/lesson-22/topshiriq-1" element={renderLazyPage('./pages/LessonTwentyTwoTaskOnePage.tsx')} />
          <Route path="/lesson-22/topshiriq-2" element={renderLazyPage('./pages/LessonTwentyTwoTaskTwoPage.tsx')} />
          <Route path="/lesson-22/topshiriq-3" element={renderLazyPage('./pages/LessonTwentyTwoTaskThreePage.tsx')} />
          <Route path="/lesson-22/topshiriq-4" element={renderLazyPage('./pages/LessonTwentyTwoTaskFourPage.tsx')} />
          <Route path="/lesson-22/topshiriq-5" element={renderLazyPage('./pages/LessonTwentyTwoTaskFivePage.tsx')} />
          <Route path="/lesson-22/topshiriq-6" element={renderLazyPage('./pages/LessonTwentyTwoTaskSixPage.tsx')} />
          <Route path="/lesson-22/topshiriq-7" element={renderLazyPage('./pages/LessonTwentyTwoTaskSevenPage.tsx')} />
          <Route path="/lesson-22/topshiriq-8" element={renderLazyPage('./pages/LessonTwentyTwoTaskEightPage.tsx')} />
          <Route path="/lesson-22/topshiriq-9" element={renderLazyPage('./pages/LessonTwentyTwoTaskNinePage.tsx')} />
          <Route path="/lesson-22/topshiriq-10" element={renderLazyPage('./pages/LessonTwentyTwoTaskTenPage.tsx')} />
          <Route path="/lesson-22/topshiriq-11" element={renderLazyPage('./pages/LessonTwentyTwoTaskElevenPage.tsx')} />
          <Route path="/lesson-22/topshiriq-12" element={renderLazyPage('./pages/LessonTwentyTwoTaskTwelvePage.tsx')} />
          <Route path="/lesson-23" element={renderLazyPage('./pages/LessonTwentyThreePage.tsx')} />
          <Route path="/lesson-23/topshiriq-1" element={renderLazyPage('./pages/LessonTwentyThreeTaskOnePage.tsx')} />
          <Route path="/lesson-23/topshiriq-2" element={renderLazyPage('./pages/LessonTwentyThreeTaskTwoPage.tsx')} />
          <Route path="/lesson-24" element={renderLazyPage('./pages/LessonTwentyFourPage.tsx')} />
          <Route path="/lesson-24/topshiriq-1" element={renderLazyPage('./pages/LessonTwentyFourTaskOnePage.tsx')} />
          <Route path="/lesson-24/topshiriq-2" element={renderLazyPage('./pages/LessonTwentyFourTaskTwoPage.tsx')} />
          <Route path="/lesson-24/topshiriq-3" element={renderLazyPage('./pages/LessonTwentyFourTaskThreePage.tsx')} />
          <Route path="/lesson-24/topshiriq-4" element={renderLazyPage('./pages/LessonTwentyFourTaskFourPage.tsx')} />
          <Route path="/lesson-1/salomlashish-test" element={renderLazyPage('./pages/GreetingTestPage.tsx')} />
          <Route path="/lesson-1/salomlashish-test/quiz" element={renderLazyPage('./pages/GreetingQuizPage.tsx')} />
          <Route path="/lesson-1/juftini-toping" element={renderLazyPage('./pages/MatchingPairsPage.tsx')} />
          <Route path="/lesson-1/gapni-tuzing" element={renderLazyPage('./pages/SentenceBuilderPage.tsx')} />
          <Route path="/lesson-1/bitta-mashq" element={renderLazyPage('./pages/UnifiedLessonPracticePage.tsx')} />
          <Route path="/lesson-2/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonTwoPracticePage.tsx')} />
          <Route path="/lesson-3/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonThreePracticePage.tsx')} />
          <Route path="/lesson-4/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonFourPracticePage.tsx')} />
          <Route path="/lesson-5/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonFivePracticePage.tsx')} />
          <Route path="/lesson-6/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonSixPracticePage.tsx')} />
          <Route path="/lesson-7/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonSevenPracticePage.tsx')} />
          <Route path="/lesson-8/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonEightPracticePage.tsx')} />
          <Route path="/lesson-9/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonNinePracticePage.tsx')} />
          <Route path="/lesson-10/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonTenPracticePage.tsx')} />
          <Route path="/lesson-11/mustahkamlash" element={renderLazyPage('./pages/UnifiedLessonElevenPracticePage.tsx')} />
          <Route path="/lesson-11/zadanie-1" element={renderLazyPage('./pages/LessonElevenTaskOnePage.tsx')} />
          <Route path="/lesson-11/topshiriq-2" element={renderLazyPage('./pages/LessonElevenTaskTwoPage.tsx')} />
          <Route path="/lesson-11/topshiriq-3" element={renderLazyPage('./pages/LessonElevenTaskThreePage.tsx')} />
          <Route path="/lesson-11/topshiriq-4" element={renderLazyPage('./pages/LessonElevenTaskFourPage.tsx')} />
          <Route path="/lesson-11/topshiriq-5" element={renderLazyPage('./pages/LessonElevenTaskFivePage.tsx')} />
          <Route path="/lesson-11/topshiriq-6" element={renderLazyPage('./pages/LessonElevenTaskSixPage.tsx')} />
          <Route path="/lesson-11/topshiriq-7" element={renderLazyPage('./pages/LessonElevenTaskSevenPage.tsx')} />
          <Route path="/lesson-11/topshiriq-8" element={renderLazyPage('./pages/LessonElevenTaskEightPage.tsx')} />
          <Route path="/lesson-11/topshiriq-9" element={renderLazyPage('./pages/LessonElevenTaskNinePage.tsx')} />
          <Route path="/lesson-11/topshiriq-10" element={renderLazyPage('./pages/LessonElevenTaskTenPage.tsx')} />
          <Route path="/lesson-11/topshiriq-11" element={renderLazyPage('./pages/LessonElevenTaskElevenPage.tsx')} />
          <Route path="/lesson-11/topshiriq-12" element={renderLazyPage('./pages/LessonElevenTaskTwelvePage.tsx')} />
          <Route path="/lesson-11/topshiriq-13" element={renderLazyPage('./pages/LessonElevenTaskThirteenPage.tsx')} />
          <Route path="/lesson-11/topshiriq-14" element={renderLazyPage('./pages/LessonElevenTaskFourteenPage.tsx')} />
          <Route path="/lesson-11/topshiriq-15" element={renderLazyPage('./pages/LessonElevenTaskFifteenPage.tsx')} />
          <Route path="/lesson-12/topshiriq-1" element={renderLazyPage('./pages/LessonTwelveTaskOnePage.tsx')} />
          <Route path="/lesson-13/topshiriq-1" element={renderLazyPage('./pages/LessonThirteenTaskOnePage.tsx')} />
          <Route path="/lesson-14/topshiriq-1" element={renderLazyPage('./pages/LessonFourteenTaskOnePage.tsx')} />
          <Route path="/lesson-14/topshiriq-2" element={renderLazyPage('./pages/LessonFourteenTaskTwoPage.tsx')} />
          <Route path="/lesson-14/topshiriq-3" element={renderLazyPage('./pages/LessonFourteenTaskThreePage.tsx')} />
          <Route path="/lesson-14/topshiriq-4" element={renderLazyPage('./pages/LessonFourteenTaskFourPage.tsx')} />
          <Route path="/lesson-14/topshiriq-5" element={renderLazyPage('./pages/LessonFourteenTaskFivePage.tsx')} />
          <Route path="/lesson-14/topshiriq-6" element={renderLazyPage('./pages/LessonFourteenTaskSixPage.tsx')} />
          <Route path="/lesson-14/topshiriq-7" element={renderLazyPage('./pages/LessonFourteenTaskSevenPage.tsx')} />
          <Route path="/lesson-14/topshiriq-8" element={renderLazyPage('./pages/LessonFourteenTaskEightPage.tsx')} />
          <Route path="/lesson-14/topshiriq-9" element={renderLazyPage('./pages/LessonFourteenTaskNinePage.tsx')} />
          <Route path="/lesson-14/topshiriq-10" element={renderLazyPage('./pages/LessonFourteenTaskTenPage.tsx')} />
          <Route path="/lesson-14/topshiriq-11" element={renderLazyPage('./pages/LessonFourteenTaskElevenPage.tsx')} />
          <Route path="/lesson-14/topshiriq-12" element={renderLazyPage('./pages/LessonFourteenTaskTwelvePage.tsx')} />
          <Route path="/lesson-14/topshiriq-13" element={renderLazyPage('./pages/LessonFourteenTaskThirteenPage.tsx')} />
          <Route path="/lesson-14/topshiriq-14" element={renderLazyPage('./pages/LessonFourteenTaskFourteenPage.tsx')} />
          <Route path="/lesson-14/topshiriq-15" element={renderLazyPage('./pages/LessonFourteenTaskFifteenPage.tsx')} />
          <Route path="/lesson-14/topshiriq-16" element={renderLazyPage('./pages/LessonFourteenTaskSixteenPage.tsx')} />
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
            <AppRoutes />
            <SequentialAccessEnforcer />
          </SequentialLessonProvider>
        </AccessProvider>
      </Router>
    </AuthProvider>
  );
}
