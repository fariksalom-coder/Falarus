const DEFAULT_ADMIN_BASE_PATH = '/secure-admin-a9k7x4p2';

function normalizeAdminBasePath(rawPath: string | undefined): string {
  const trimmed = String(rawPath ?? '').trim();
  if (!trimmed) return DEFAULT_ADMIN_BASE_PATH;
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const normalized = withSlash.replace(/\/+$/, '');
  if (!normalized || normalized === '/') return DEFAULT_ADMIN_BASE_PATH;
  return normalized;
}

export const ADMIN_BASE_PATH = normalizeAdminBasePath(import.meta.env.VITE_ADMIN_PATH);

export function adminPath(child = ''): string {
  const trimmed = child.trim();
  if (!trimmed || trimmed === '/') return ADMIN_BASE_PATH;
  return `${ADMIN_BASE_PATH}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}
