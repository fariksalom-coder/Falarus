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
import LessonFifteenPracticePage from './pages/LessonFifteenPracticePage';
import LessonFifteenTaskOnePage from './pages/LessonFifteenTaskOnePage';
import LessonFifteenTaskTwoPage from './pages/LessonFifteenTaskTwoPage';
import LessonFifteenTaskThreePage from './pages/LessonFifteenTaskThreePage';
import LessonFifteenTaskFourPage from './pages/LessonFifteenTaskFourPage';
import LessonFifteenTaskFivePage from './pages/LessonFifteenTaskFivePage';
import LessonFifteenTaskSixPage from './pages/LessonFifteenTaskSixPage';
import LessonFifteenTaskSevenPage from './pages/LessonFifteenTaskSevenPage';
import LessonSixteenPage from './pages/LessonSixteenPage';
import LessonSixteenTaskOnePage from './pages/LessonSixteenTaskOnePage';
import LessonSeventeenPage from './pages/LessonSeventeenPage';
import LessonSeventeenTaskOnePage from './pages/LessonSeventeenTaskOnePage';
import LessonSeventeenTaskTwoPage from './pages/LessonSeventeenTaskTwoPage';
import LessonSeventeenTaskThreePage from './pages/LessonSeventeenTaskThreePage';
import LessonSeventeenTaskFourPage from './pages/LessonSeventeenTaskFourPage';
import LessonSeventeenTaskFivePage from './pages/LessonSeventeenTaskFivePage';
import LessonSeventeenTaskSixPage from './pages/LessonSeventeenTaskSixPage';
import LessonSeventeenTaskSevenPage from './pages/LessonSeventeenTaskSevenPage';
import LessonSeventeenTaskEightPage from './pages/LessonSeventeenTaskEightPage';
import LessonSeventeenTaskNinePage from './pages/LessonSeventeenTaskNinePage';
import LessonSeventeenTaskTenPage from './pages/LessonSeventeenTaskTenPage';
import LessonSeventeenTaskElevenPage from './pages/LessonSeventeenTaskElevenPage';
import LessonSeventeenTaskTwelvePage from './pages/LessonSeventeenTaskTwelvePage';
import LessonSeventeenTaskThirteenPage from './pages/LessonSeventeenTaskThirteenPage';
import LessonSeventeenTaskFourteenPage from './pages/LessonSeventeenTaskFourteenPage';
import LessonSeventeenTaskFifteenPage from './pages/LessonSeventeenTaskFifteenPage';
import LessonSeventeenTaskSixteenPage from './pages/LessonSeventeenTaskSixteenPage';
import LessonSeventeenTaskSeventeenPage from './pages/LessonSeventeenTaskSeventeenPage';
import LessonEighteenPage from './pages/LessonEighteenPage';
import LessonEighteenTaskOnePage from './pages/LessonEighteenTaskOnePage';
import LessonEighteenTaskTwoPage from './pages/LessonEighteenTaskTwoPage';
import LessonEighteenTaskThreePage from './pages/LessonEighteenTaskThreePage';
import LessonEighteenTaskFourPage from './pages/LessonEighteenTaskFourPage';
import LessonEighteenTaskFivePage from './pages/LessonEighteenTaskFivePage';
import LessonNineteenPage from './pages/LessonNineteenPage';
import LessonNineteenTaskOnePage from './pages/LessonNineteenTaskOnePage';
import LessonNineteenTaskTwoPage from './pages/LessonNineteenTaskTwoPage';
import LessonNineteenTaskThreePage from './pages/LessonNineteenTaskThreePage';
import LessonNineteenTaskFourPage from './pages/LessonNineteenTaskFourPage';
import LessonNineteenTaskFivePage from './pages/LessonNineteenTaskFivePage';
import LessonNineteenTaskSixPage from './pages/LessonNineteenTaskSixPage';
import LessonNineteenTaskSevenPage from './pages/LessonNineteenTaskSevenPage';
import LessonNineteenTaskEightPage from './pages/LessonNineteenTaskEightPage';
import LessonNineteenTaskNinePage from './pages/LessonNineteenTaskNinePage';
import LessonNineteenTaskTenPage from './pages/LessonNineteenTaskTenPage';
import LessonNineteenTaskElevenPage from './pages/LessonNineteenTaskElevenPage';
import LessonNineteenTaskTwelvePage from './pages/LessonNineteenTaskTwelvePage';
import LessonNineteenTaskThirteenPage from './pages/LessonNineteenTaskThirteenPage';
import LessonNineteenTaskFourteenPage from './pages/LessonNineteenTaskFourteenPage';
import LessonNineteenTaskFifteenPage from './pages/LessonNineteenTaskFifteenPage';
import LessonNineteenTaskSixteenPage from './pages/LessonNineteenTaskSixteenPage';
import LessonTwentyPage from './pages/LessonTwentyPage';
import LessonTwentyTaskOnePage from './pages/LessonTwentyTaskOnePage';
import LessonTwentyTaskTwoPage from './pages/LessonTwentyTaskTwoPage';
import LessonTwentyTaskThreePage from './pages/LessonTwentyTaskThreePage';
import LessonTwentyTaskFourPage from './pages/LessonTwentyTaskFourPage';
import LessonTwentyTaskFivePage from './pages/LessonTwentyTaskFivePage';
import LessonTwentyTaskSixPage from './pages/LessonTwentyTaskSixPage';
import LessonTwentyTaskSevenPage from './pages/LessonTwentyTaskSevenPage';
import LessonTwentyOnePage from './pages/LessonTwentyOnePage';
import LessonTwentyOneTaskOnePage from './pages/LessonTwentyOneTaskOnePage';
import LessonTwentyTwoPage from './pages/LessonTwentyTwoPage';
import LessonTwentyTwoTaskOnePage from './pages/LessonTwentyTwoTaskOnePage';
import LessonTwentyTwoTaskTwoPage from './pages/LessonTwentyTwoTaskTwoPage';
import LessonTwentyTwoTaskThreePage from './pages/LessonTwentyTwoTaskThreePage';
import LessonTwentyTwoTaskFourPage from './pages/LessonTwentyTwoTaskFourPage';
import LessonTwentyTwoTaskFivePage from './pages/LessonTwentyTwoTaskFivePage';
import LessonTwentyTwoTaskSixPage from './pages/LessonTwentyTwoTaskSixPage';
import LessonTwentyTwoTaskSevenPage from './pages/LessonTwentyTwoTaskSevenPage';
import LessonTwentyTwoTaskEightPage from './pages/LessonTwentyTwoTaskEightPage';
import LessonTwentyTwoTaskNinePage from './pages/LessonTwentyTwoTaskNinePage';
import LessonTwentyTwoTaskTenPage from './pages/LessonTwentyTwoTaskTenPage';
import LessonTwentyTwoTaskElevenPage from './pages/LessonTwentyTwoTaskElevenPage';
import LessonTwentyTwoTaskTwelvePage from './pages/LessonTwentyTwoTaskTwelvePage';
import LessonTwentyThreePage from './pages/LessonTwentyThreePage';
import LessonTwentyThreeTaskOnePage from './pages/LessonTwentyThreeTaskOnePage';
import LessonTwentyThreeTaskTwoPage from './pages/LessonTwentyThreeTaskTwoPage';
import LessonTwentyFourPage from './pages/LessonTwentyFourPage';
import LessonTwentyFourTaskOnePage from './pages/LessonTwentyFourTaskOnePage';
import LessonTwentyFourTaskTwoPage from './pages/LessonTwentyFourTaskTwoPage';
import LessonTwentyFourTaskThreePage from './pages/LessonTwentyFourTaskThreePage';
import LessonTwentyFourTaskFourPage from './pages/LessonTwentyFourTaskFourPage';
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
import VocabularyTopicPage from './pages/VocabularyTopicPage';
import VocabularySubtopicPage from './pages/VocabularySubtopicPage';
import VocabularyPartPage from './pages/VocabularyPartPage';
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
      <Route path="/lesson-15/mustahkamlash" element={<LessonFifteenPracticePage />} />
      <Route path="/lesson-15/topshiriq-1" element={<LessonFifteenTaskOnePage />} />
      <Route path="/lesson-15/topshiriq-2" element={<LessonFifteenTaskTwoPage />} />
      <Route path="/lesson-15/topshiriq-3" element={<LessonFifteenTaskThreePage />} />
      <Route path="/lesson-15/topshiriq-4" element={<LessonFifteenTaskFourPage />} />
      <Route path="/lesson-15/topshiriq-5" element={<LessonFifteenTaskFivePage />} />
      <Route path="/lesson-15/topshiriq-6" element={<LessonFifteenTaskSixPage />} />
      <Route path="/lesson-15/topshiriq-7" element={<LessonFifteenTaskSevenPage />} />
      <Route path="/lesson-16" element={<LessonSixteenPage />} />
      <Route path="/lesson-16/topshiriq-1" element={<LessonSixteenTaskOnePage />} />
      <Route path="/lesson-17" element={<LessonSeventeenPage />} />
      <Route path="/lesson-17/topshiriq-1" element={<LessonSeventeenTaskOnePage />} />
      <Route path="/lesson-17/topshiriq-2" element={<LessonSeventeenTaskTwoPage />} />
      <Route path="/lesson-17/topshiriq-3" element={<LessonSeventeenTaskThreePage />} />
      <Route path="/lesson-17/topshiriq-4" element={<LessonSeventeenTaskFourPage />} />
      <Route path="/lesson-17/topshiriq-5" element={<LessonSeventeenTaskFivePage />} />
      <Route path="/lesson-17/topshiriq-6" element={<LessonSeventeenTaskSixPage />} />
      <Route path="/lesson-17/topshiriq-7" element={<LessonSeventeenTaskSevenPage />} />
      <Route path="/lesson-17/topshiriq-8" element={<LessonSeventeenTaskEightPage />} />
      <Route path="/lesson-17/topshiriq-9" element={<LessonSeventeenTaskNinePage />} />
      <Route path="/lesson-17/topshiriq-10" element={<LessonSeventeenTaskTenPage />} />
      <Route path="/lesson-17/topshiriq-11" element={<LessonSeventeenTaskElevenPage />} />
      <Route path="/lesson-17/topshiriq-12" element={<LessonSeventeenTaskTwelvePage />} />
      <Route path="/lesson-17/topshiriq-13" element={<LessonSeventeenTaskThirteenPage />} />
      <Route path="/lesson-17/topshiriq-14" element={<LessonSeventeenTaskFourteenPage />} />
      <Route path="/lesson-17/topshiriq-15" element={<LessonSeventeenTaskFifteenPage />} />
      <Route path="/lesson-17/topshiriq-16" element={<LessonSeventeenTaskSixteenPage />} />
      <Route path="/lesson-17/topshiriq-17" element={<LessonSeventeenTaskSeventeenPage />} />
      <Route path="/lesson-18" element={<LessonEighteenPage />} />
      <Route path="/lesson-18/topshiriq-1" element={<LessonEighteenTaskOnePage />} />
      <Route path="/lesson-18/topshiriq-2" element={<LessonEighteenTaskTwoPage />} />
      <Route path="/lesson-18/topshiriq-3" element={<LessonEighteenTaskThreePage />} />
      <Route path="/lesson-18/topshiriq-4" element={<LessonEighteenTaskFourPage />} />
      <Route path="/lesson-18/topshiriq-5" element={<LessonEighteenTaskFivePage />} />
      <Route path="/lesson-19" element={<LessonNineteenPage />} />
      <Route path="/lesson-19/topshiriq-1" element={<LessonNineteenTaskOnePage />} />
      <Route path="/lesson-19/topshiriq-2" element={<LessonNineteenTaskTwoPage />} />
      <Route path="/lesson-19/topshiriq-3" element={<LessonNineteenTaskThreePage />} />
      <Route path="/lesson-19/topshiriq-4" element={<LessonNineteenTaskFourPage />} />
      <Route path="/lesson-19/topshiriq-5" element={<LessonNineteenTaskFivePage />} />
      <Route path="/lesson-19/topshiriq-6" element={<LessonNineteenTaskSixPage />} />
      <Route path="/lesson-19/topshiriq-7" element={<LessonNineteenTaskSevenPage />} />
      <Route path="/lesson-19/topshiriq-8" element={<LessonNineteenTaskEightPage />} />
      <Route path="/lesson-19/topshiriq-9" element={<LessonNineteenTaskNinePage />} />
      <Route path="/lesson-19/topshiriq-10" element={<LessonNineteenTaskTenPage />} />
      <Route path="/lesson-19/topshiriq-11" element={<LessonNineteenTaskElevenPage />} />
      <Route path="/lesson-19/topshiriq-12" element={<LessonNineteenTaskTwelvePage />} />
      <Route path="/lesson-19/topshiriq-13" element={<LessonNineteenTaskThirteenPage />} />
      <Route path="/lesson-19/topshiriq-14" element={<LessonNineteenTaskFourteenPage />} />
      <Route path="/lesson-19/topshiriq-15" element={<LessonNineteenTaskFifteenPage />} />
      <Route path="/lesson-19/topshiriq-16" element={<LessonNineteenTaskSixteenPage />} />
      <Route path="/lesson-20" element={<LessonTwentyPage />} />
      <Route path="/lesson-20/topshiriq-1" element={<LessonTwentyTaskOnePage />} />
      <Route path="/lesson-20/topshiriq-2" element={<LessonTwentyTaskTwoPage />} />
      <Route path="/lesson-20/topshiriq-3" element={<LessonTwentyTaskThreePage />} />
      <Route path="/lesson-20/topshiriq-4" element={<LessonTwentyTaskFourPage />} />
      <Route path="/lesson-20/topshiriq-5" element={<LessonTwentyTaskFivePage />} />
      <Route path="/lesson-20/topshiriq-6" element={<LessonTwentyTaskSixPage />} />
      <Route path="/lesson-20/topshiriq-7" element={<LessonTwentyTaskSevenPage />} />
      <Route path="/lesson-21" element={<LessonTwentyOnePage />} />
      <Route path="/lesson-21/topshiriq-1" element={<LessonTwentyOneTaskOnePage />} />
      <Route path="/lesson-22" element={<LessonTwentyTwoPage />} />
      <Route path="/lesson-22/topshiriq-1" element={<LessonTwentyTwoTaskOnePage />} />
      <Route path="/lesson-22/topshiriq-2" element={<LessonTwentyTwoTaskTwoPage />} />
      <Route path="/lesson-22/topshiriq-3" element={<LessonTwentyTwoTaskThreePage />} />
      <Route path="/lesson-22/topshiriq-4" element={<LessonTwentyTwoTaskFourPage />} />
      <Route path="/lesson-22/topshiriq-5" element={<LessonTwentyTwoTaskFivePage />} />
      <Route path="/lesson-22/topshiriq-6" element={<LessonTwentyTwoTaskSixPage />} />
      <Route path="/lesson-22/topshiriq-7" element={<LessonTwentyTwoTaskSevenPage />} />
      <Route path="/lesson-22/topshiriq-8" element={<LessonTwentyTwoTaskEightPage />} />
      <Route path="/lesson-22/topshiriq-9" element={<LessonTwentyTwoTaskNinePage />} />
      <Route path="/lesson-22/topshiriq-10" element={<LessonTwentyTwoTaskTenPage />} />
      <Route path="/lesson-22/topshiriq-11" element={<LessonTwentyTwoTaskElevenPage />} />
      <Route path="/lesson-22/topshiriq-12" element={<LessonTwentyTwoTaskTwelvePage />} />
      <Route path="/lesson-23" element={<LessonTwentyThreePage />} />
      <Route path="/lesson-23/topshiriq-1" element={<LessonTwentyThreeTaskOnePage />} />
      <Route path="/lesson-23/topshiriq-2" element={<LessonTwentyThreeTaskTwoPage />} />
      <Route path="/lesson-24" element={<LessonTwentyFourPage />} />
      <Route path="/lesson-24/topshiriq-1" element={<LessonTwentyFourTaskOnePage />} />
      <Route path="/lesson-24/topshiriq-2" element={<LessonTwentyFourTaskTwoPage />} />
      <Route path="/lesson-24/topshiriq-3" element={<LessonTwentyFourTaskThreePage />} />
      <Route path="/lesson-24/topshiriq-4" element={<LessonTwentyFourTaskFourPage />} />
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
      <Route path="/vocabulary/:topicId" element={<VocabularyTopicPage />} />
      <Route path="/vocabulary/:topicId/:subtopicId" element={<VocabularySubtopicPage />} />
      <Route path="/vocabulary/:topicId/:subtopicId/:partId" element={<VocabularyPartPage />} />
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
