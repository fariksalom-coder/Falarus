import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';
import LessonPage from './pages/LessonPage';
import LessonOnePage from './pages/LessonOnePage';
import LessonTwoPage from './pages/LessonTwoPage';
import LessonThreePage from './pages/LessonThreePage';
import LessonFourPage from './pages/LessonFourPage';
import LessonFivePage from './pages/LessonFivePage';
import LessonSixPage from './pages/LessonSixPage';
import LessonSevenPage from './pages/LessonSevenPage';
import LessonEightPage from './pages/LessonEightPage';
import LessonNinePage from './pages/LessonNinePage';
import LessonTenPage from './pages/LessonTenPage';
import LessonElevenPage from './pages/LessonElevenPage';
import LessonTwelvePage from './pages/LessonTwelvePage';
import LessonThirteenPage from './pages/LessonThirteenPage';
import LessonFourteenPage from './pages/LessonFourteenPage';
import LessonFifteenPage from './pages/LessonFifteenPage';
import GreetingTestPage from './pages/GreetingTestPage';
import GreetingQuizPage from './pages/GreetingQuizPage';
import MatchingPairsPage from './pages/MatchingPairsPage';
import SentenceBuilderPage from './pages/SentenceBuilderPage';
import UnifiedLessonPracticePage from './pages/UnifiedLessonPracticePage';
import UnifiedLessonTwoPracticePage from './pages/UnifiedLessonTwoPracticePage';
import UnifiedLessonThreePracticePage from './pages/UnifiedLessonThreePracticePage';
import UnifiedLessonFourPracticePage from './pages/UnifiedLessonFourPracticePage';
import UnifiedLessonFivePracticePage from './pages/UnifiedLessonFivePracticePage';
import UnifiedLessonSixPracticePage from './pages/UnifiedLessonSixPracticePage';
import UnifiedLessonSevenPracticePage from './pages/UnifiedLessonSevenPracticePage';
import UnifiedLessonEightPracticePage from './pages/UnifiedLessonEightPracticePage';
import UnifiedLessonNinePracticePage from './pages/UnifiedLessonNinePracticePage';
import UnifiedLessonTenPracticePage from './pages/UnifiedLessonTenPracticePage';
import UnifiedLessonElevenPracticePage from './pages/UnifiedLessonElevenPracticePage';
import LessonElevenTaskOnePage from './pages/LessonElevenTaskOnePage';
import LessonElevenTaskTwoPage from './pages/LessonElevenTaskTwoPage';
import LessonElevenTaskThreePage from './pages/LessonElevenTaskThreePage';
import LessonElevenTaskFourPage from './pages/LessonElevenTaskFourPage';
import LessonElevenTaskFivePage from './pages/LessonElevenTaskFivePage';
import LessonElevenTaskSixPage from './pages/LessonElevenTaskSixPage';
import LessonElevenTaskSevenPage from './pages/LessonElevenTaskSevenPage';
import LessonElevenTaskEightPage from './pages/LessonElevenTaskEightPage';
import LessonElevenTaskNinePage from './pages/LessonElevenTaskNinePage';
import LessonElevenTaskTenPage from './pages/LessonElevenTaskTenPage';
import LessonElevenTaskElevenPage from './pages/LessonElevenTaskElevenPage';
import LessonElevenTaskTwelvePage from './pages/LessonElevenTaskTwelvePage';
import LessonElevenTaskThirteenPage from './pages/LessonElevenTaskThirteenPage';
import LessonElevenTaskFourteenPage from './pages/LessonElevenTaskFourteenPage';
import LessonElevenTaskFifteenPage from './pages/LessonElevenTaskFifteenPage';
import LessonTwelveTaskOnePage from './pages/LessonTwelveTaskOnePage';
import LessonThirteenTaskOnePage from './pages/LessonThirteenTaskOnePage';
import LessonFourteenTaskOnePage from './pages/LessonFourteenTaskOnePage';
import LessonFourteenTaskTwoPage from './pages/LessonFourteenTaskTwoPage';
import LessonFourteenTaskThreePage from './pages/LessonFourteenTaskThreePage';
import LessonFourteenTaskFourPage from './pages/LessonFourteenTaskFourPage';
import LessonFourteenTaskFivePage from './pages/LessonFourteenTaskFivePage';
import LessonFourteenTaskSixPage from './pages/LessonFourteenTaskSixPage';
import LessonFourteenTaskSevenPage from './pages/LessonFourteenTaskSevenPage';
import LessonFourteenTaskEightPage from './pages/LessonFourteenTaskEightPage';
import LessonFourteenTaskNinePage from './pages/LessonFourteenTaskNinePage';
import LessonFourteenTaskTenPage from './pages/LessonFourteenTaskTenPage';
import LessonFourteenTaskElevenPage from './pages/LessonFourteenTaskElevenPage';
import LessonFourteenTaskTwelvePage from './pages/LessonFourteenTaskTwelvePage';
import LessonFourteenTaskThirteenPage from './pages/LessonFourteenTaskThirteenPage';
import LessonFourteenTaskFourteenPage from './pages/LessonFourteenTaskFourteenPage';
import LessonFourteenTaskFifteenPage from './pages/LessonFourteenTaskFifteenPage';
import LessonFourteenTaskSixteenPage from './pages/LessonFourteenTaskSixteenPage';
import VocabularyPage from './pages/VocabularyPage';
import ProfilePage from './pages/ProfilePage';
import CourseMapPage from './pages/CourseMapPage';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  if (!user.onboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/lesson-1" element={<LessonOnePage />} />
      <Route path="/lesson-2" element={<LessonTwoPage />} />
      <Route path="/lesson-3" element={<LessonThreePage />} />
      <Route path="/lesson-4" element={<LessonFourPage />} />
      <Route path="/lesson-5" element={<LessonFivePage />} />
      <Route path="/lesson-6" element={<LessonSixPage />} />
      <Route path="/lesson-7" element={<LessonSevenPage />} />
      <Route path="/lesson-8" element={<LessonEightPage />} />
      <Route path="/lesson-9" element={<LessonNinePage />} />
      <Route path="/lesson-10" element={<LessonTenPage />} />
      <Route path="/lesson-11" element={<LessonElevenPage />} />
      <Route path="/lesson-12" element={<LessonTwelvePage />} />
      <Route path="/lesson-13" element={<LessonThirteenPage />} />
      <Route path="/lesson-14" element={<LessonFourteenPage />} />
      <Route path="/lesson-15" element={<LessonFifteenPage />} />
      <Route path="/lesson-1/salomlashish-test" element={<GreetingTestPage />} />
      <Route path="/lesson-1/salomlashish-test/quiz" element={<GreetingQuizPage />} />
      <Route path="/lesson-1/juftini-toping" element={<MatchingPairsPage />} />
      <Route path="/lesson-1/gapni-tuzing" element={<SentenceBuilderPage />} />
      <Route path="/lesson-1/bitta-mashq" element={<UnifiedLessonPracticePage />} />
      <Route path="/lesson-2/mustahkamlash" element={<UnifiedLessonTwoPracticePage />} />
      <Route path="/lesson-3/mustahkamlash" element={<UnifiedLessonThreePracticePage />} />
      <Route path="/lesson-4/mustahkamlash" element={<UnifiedLessonFourPracticePage />} />
      <Route path="/lesson-5/mustahkamlash" element={<UnifiedLessonFivePracticePage />} />
      <Route path="/lesson-6/mustahkamlash" element={<UnifiedLessonSixPracticePage />} />
      <Route path="/lesson-7/mustahkamlash" element={<UnifiedLessonSevenPracticePage />} />
      <Route path="/lesson-8/mustahkamlash" element={<UnifiedLessonEightPracticePage />} />
      <Route path="/lesson-9/mustahkamlash" element={<UnifiedLessonNinePracticePage />} />
      <Route path="/lesson-10/mustahkamlash" element={<UnifiedLessonTenPracticePage />} />
      <Route path="/lesson-11/mustahkamlash" element={<UnifiedLessonElevenPracticePage />} />
      <Route path="/lesson-11/zadanie-1" element={<LessonElevenTaskOnePage />} />
      <Route path="/lesson-11/topshiriq-2" element={<LessonElevenTaskTwoPage />} />
      <Route path="/lesson-11/topshiriq-3" element={<LessonElevenTaskThreePage />} />
      <Route path="/lesson-11/topshiriq-4" element={<LessonElevenTaskFourPage />} />
      <Route path="/lesson-11/topshiriq-5" element={<LessonElevenTaskFivePage />} />
      <Route path="/lesson-11/topshiriq-6" element={<LessonElevenTaskSixPage />} />
      <Route path="/lesson-11/topshiriq-7" element={<LessonElevenTaskSevenPage />} />
      <Route path="/lesson-11/topshiriq-8" element={<LessonElevenTaskEightPage />} />
      <Route path="/lesson-11/topshiriq-9" element={<LessonElevenTaskNinePage />} />
      <Route path="/lesson-11/topshiriq-10" element={<LessonElevenTaskTenPage />} />
      <Route path="/lesson-11/topshiriq-11" element={<LessonElevenTaskElevenPage />} />
      <Route path="/lesson-11/topshiriq-12" element={<LessonElevenTaskTwelvePage />} />
      <Route path="/lesson-11/topshiriq-13" element={<LessonElevenTaskThirteenPage />} />
      <Route path="/lesson-11/topshiriq-14" element={<LessonElevenTaskFourteenPage />} />
      <Route path="/lesson-11/topshiriq-15" element={<LessonElevenTaskFifteenPage />} />
      <Route path="/lesson-12/topshiriq-1" element={<LessonTwelveTaskOnePage />} />
      <Route path="/lesson-13/topshiriq-1" element={<LessonThirteenTaskOnePage />} />
      <Route path="/lesson-14/topshiriq-1" element={<LessonFourteenTaskOnePage />} />
      <Route path="/lesson-14/topshiriq-2" element={<LessonFourteenTaskTwoPage />} />
      <Route path="/lesson-14/topshiriq-3" element={<LessonFourteenTaskThreePage />} />
      <Route path="/lesson-14/topshiriq-4" element={<LessonFourteenTaskFourPage />} />
      <Route path="/lesson-14/topshiriq-5" element={<LessonFourteenTaskFivePage />} />
      <Route path="/lesson-14/topshiriq-6" element={<LessonFourteenTaskSixPage />} />
      <Route path="/lesson-14/topshiriq-7" element={<LessonFourteenTaskSevenPage />} />
      <Route path="/lesson-14/topshiriq-8" element={<LessonFourteenTaskEightPage />} />
      <Route path="/lesson-14/topshiriq-9" element={<LessonFourteenTaskNinePage />} />
      <Route path="/lesson-14/topshiriq-10" element={<LessonFourteenTaskTenPage />} />
      <Route path="/lesson-14/topshiriq-11" element={<LessonFourteenTaskElevenPage />} />
      <Route path="/lesson-14/topshiriq-12" element={<LessonFourteenTaskTwelvePage />} />
      <Route path="/lesson-14/topshiriq-13" element={<LessonFourteenTaskThirteenPage />} />
      <Route path="/lesson-14/topshiriq-14" element={<LessonFourteenTaskFourteenPage />} />
      <Route path="/lesson-14/topshiriq-15" element={<LessonFourteenTaskFifteenPage />} />
      <Route path="/lesson-14/topshiriq-16" element={<LessonFourteenTaskSixteenPage />} />
      <Route path="/lesson/:id" element={<LessonPage />} />
      <Route path="/vocabulary" element={<VocabularyPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/course-map" element={<CourseMapPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
