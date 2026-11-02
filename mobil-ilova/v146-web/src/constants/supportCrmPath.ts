const DEFAULT_SUPPORT_CRM_BASE_PATH = '/support-crm';

function normalizeBasePath(rawPath: string | undefined): string {
  const trimmed = String(rawPath ?? '').trim();
  if (!trimmed) return DEFAULT_SUPPORT_CRM_BASE_PATH;
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const normalized = withSlash.replace(/\/+$/, '');
  if (!normalized || normalized === '/') return DEFAULT_SUPPORT_CRM_BASE_PATH;
  return normalized;
}

export const SUPPORT_CRM_BASE_PATH = normalizeBasePath(import.meta.env.VITE_SUPPORT_CRM_PATH);

export function supportCrmPath(child = ''): string {
  const trimmed = child.trim();
  if (!trimmed || trimmed === '/') return SUPPORT_CRM_BASE_PATH;
  return `${SUPPORT_CRM_BASE_PATH}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}
