// Local preview only: the real TeacherPanelPage against the canned API in teacherPanelPreview.ts.
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import '../../src/index.css';
import '../../src/styles/platform-theme.css';
import { AuthProvider } from '../../src/context/AuthContext';
import { LocaleProvider } from '../../src/context/LocaleContext';
import TeacherPanelPage from '../../src/pages/TeacherPanelPage';
import MeetRoomPage from '../../src/pages/MeetRoomPage';

localStorage.setItem('token', new URLSearchParams(window.location.search).get('as') === 'student' ? 'preview-student' : 'preview');

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <LocaleProvider>
      <AuthProvider>
        <Routes>
          <Route path="/dars/l/:lessonId" element={<MeetRoomPage />} />
          <Route path="*" element={<TeacherPanelPage />} />
        </Routes>
      </AuthProvider>
    </LocaleProvider>
  </BrowserRouter>,
);
