// Local preview only: the real TeacherPanelPage against the canned API in teacherPanelPreview.ts.
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../../src/index.css';
import '../../src/styles/platform-theme.css';
import { AuthProvider } from '../../src/context/AuthContext';
import { LocaleProvider } from '../../src/context/LocaleContext';
import TeacherPanelPage from '../../src/pages/TeacherPanelPage';

localStorage.setItem('token', 'preview');

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <LocaleProvider>
      <AuthProvider>
        <TeacherPanelPage />
      </AuthProvider>
    </LocaleProvider>
  </BrowserRouter>,
);
