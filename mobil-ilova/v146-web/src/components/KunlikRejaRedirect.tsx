import { Navigate, useSearchParams } from 'react-router-dom';
import { kunlikRejaPath } from '../utils/kunlikNavigation';

/** Eski `/kunlik-reja` (va `?kun=`) → kunning bloklari sahifasiga. */
export default function KunlikRejaRedirect() {
  const [searchParams] = useSearchParams();
  const kunRaw = searchParams.get('kun');
  const kun = kunRaw != null ? Number(kunRaw) : null;
  return <Navigate to={kunlikRejaPath(kun ?? undefined)} replace />;
}
