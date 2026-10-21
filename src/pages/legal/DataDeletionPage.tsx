import { Link } from 'react-router-dom';
import { LegalDocShell } from './LegalDocShell';
import { ContactsSection, DataDeletionSection, PRIVACY_UPDATED } from './InstagramPrivacyContent';

export default function DataDeletionPage() {
  return (
    <LegalDocShell title="Удаление данных FalaRus.uz">
      <p className="text-xs text-slate-500">Обновлено: {PRIVACY_UPDATED}</p>
      <DataDeletionSection />
      <ContactsSection />
      <p>Полный текст: <Link className="font-semibold text-[#0B2A6B] underline" to="/privacy">Политика конфиденциальности</Link>.</p>
    </LegalDocShell>
  );
}
