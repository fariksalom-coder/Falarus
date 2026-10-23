import { Navigate, useLocation, useParams } from 'react-router-dom';
import { TEACHER_CABINET_PATH, TEACHER_LOGIN_PATH, TEACHER_REGISTER_PATH, TEACHERS_LIST_PATH, teacherProfilePath } from '../constants/teacherPaths';

/**
 * Eski manzillar → yangi (/ustoz — o'qituvchi platformasi, /ustozlar — o'quvchi uchun ro'yxat).
 * O'rnatilgan ilova, xatcho'plar va yuborilgan havolalar ishlayversin: so'rov qatori va #
 * saqlanadi (masalan, kabinet bo'limi).
 */
export default function LegacyTeacherRedirect({ to }: { to: 'list' | 'profile' | 'login' | 'register' | 'cabinet' }) {
  const { teacherId } = useParams();
  const { search, hash } = useLocation();
  const base = { list: TEACHERS_LIST_PATH, profile: teacherProfilePath(teacherId ?? ''), login: TEACHER_LOGIN_PATH, register: TEACHER_REGISTER_PATH, cabinet: TEACHER_CABINET_PATH }[to];
  return <Navigate to={`${base}${search}${hash}`} replace />;
}

/**
 * Mehmon ustozlar katalogi yoki profiliga kirdi → kirish sahifasi; kirgach shu sahifaga qaytadi.
 * Eski `/teachers/...` havolasi qaytish manzilida yangi `/ustozlar/...` ga aylantiriladi.
 */
export function LoginRedirect() {
  const { pathname, search, hash } = useLocation();
  const from = `${pathname.replace(/^\/teachers(?=\/|$)/, TEACHERS_LIST_PATH)}${search}${hash}`;
  return <Navigate to="/login" replace state={{ from }} />;
}
