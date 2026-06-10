import { LegalDocShell } from './LegalDocShell';

export default function LegalPrivacyPage() {
  return (
    <LegalDocShell title="MAXFIYLIK SIYOSATI">
      <section>
        <h2 className="text-base font-bold text-slate-900">1. Ma’lumotlarni yig‘ish</h2>
        <p className="mt-2">Biz quyidagi ma’lumotlarni yig‘amiz:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>telefon raqami</li>
          <li>email manzil</li>
          <li>foydalanuvchi faoliyati</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">2. To‘lov ma’lumotlari</h2>
        <p className="mt-2">To‘lovlar Rahmat to‘lov servisi orqali amalga oshiriladi.</p>
        <p className="mt-2">Karta ma’lumotlari bizda saqlanmaydi.</p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">3. Ma’lumotlardan foydalanish</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>xizmat ko‘rsatish</li>
          <li>foydalanuvchi bilan aloqa</li>
          <li>xizmatni yaxshilash</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">4. Uchinchi tomonlarga uzatish</h2>
        <p className="mt-2">
          Ma’lumotlar faqat to‘lov tizimlari va qonunchilik talablariga muvofiq uzatiladi.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">5. Ma’lumotlarni himoya qilish</h2>
        <p className="mt-2">
          Biz foydalanuvchi ma’lumotlarini himoya qilish uchun texnik va tashkiliy choralar ko‘ramiz.
        </p>
      </section>
    </LegalDocShell>
  );
}
