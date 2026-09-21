/** Parameterized search, shared by count and paginated results. Wildcards are literal. */
export function salesLeadSearch(raw: string | undefined, params: unknown[]): string | null {
  const query = (raw || '').normalize('NFC').trim().slice(0, 160);
  if (!query) return null;
  const bind = (value: string) => { params.push(value); return `$${params.length}`; };
  if (/^[+\d\s().-]+$/.test(query) && /\d/.test(query)) {
    const phone = bind(`%${query.replace(/\D/g, '')}%`);
    return `(regexp_replace(COALESCE(l.phone_normalized,''), '[^0-9]', '', 'g') LIKE ${phone} OR regexp_replace(COALESCE(u.phone,''), '[^0-9]', '', 'g') LIKE ${phone})`;
  }
  return '(' + query.split(/\s+/).map(word => {
    const value = bind('%' + word.replace(/[\\%_]/g, '\\$&') + '%');
    return `(COALESCE(u.first_name,'') ILIKE ${value} OR COALESCE(u.last_name,'') ILIKE ${value})`;
  }).join(' AND ') + ')';
}
