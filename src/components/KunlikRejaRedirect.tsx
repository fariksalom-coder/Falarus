import { Navigate, useSearchParams } from 'react-router-dom';
import { isValidDailyCourseDay } from '../../shared/dailyCourseDay';

/** Legacy `/kunlik-reja` → new home at `/` (preserves `?kun=`). */
export default function KunlikRejaRedirect() {
  const [searchParams] = useSearchParams();
  const kunRaw = searchParams.get('kun');
  const kun = kunRaw != null ? Number(kunRaw) : null;
  const to = kun != null && isValidDailyCourseDay(kun) ? `/?kun=${kun}` : '/';
  return <Navigate to={to} replace />;
}
