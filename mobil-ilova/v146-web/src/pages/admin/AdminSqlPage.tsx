/**
 * AdminSqlPage — SQL konsolining alohida sahifasi (`/<admin>/sql`).
 *
 * Asosiy joyi — "Kurs kontenti" panelining "SQL" tabi. Bu sahifa to'g'ridan-to'g'ri
 * havola bilan kirish uchun qoldirilgan; mantiq `components/admin/SqlConsole.tsx` da.
 */
import SqlConsole from '../../components/admin/SqlConsole';

export default function AdminSqlPage() {
  return <SqlConsole />;
}
