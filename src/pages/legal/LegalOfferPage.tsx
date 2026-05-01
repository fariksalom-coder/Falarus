import { LegalDocShell } from './LegalDocShell';

export default function LegalOfferPage() {
  return (
    <LegalDocShell title="OMMAVIY OFERTA">
      <p className="font-medium text-slate-800">
        Mazkur hujjat FalaRus platformasi (keyingi o‘rinlarda «Xizmat») tomonidan taqdim etilayotgan onlayn xizmatlardan
        foydalanish shartlarini belgilaydi.
      </p>

      <section>
        <h2 className="text-base font-bold text-slate-900">1. Umumiy qoidalar</h2>
        <p className="mt-2">
          Ushbu oferta jismoniy shaxs (keyingi o‘rinlarda «Foydalanuvchi») tomonidan qabul qilingan paytdan boshlab kuchga
          kiradi.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">2. Xizmat tavsifi</h2>
        <p className="mt-2">
          Foydalanuvchiga rus tilini o‘rganish uchun onlayn kurslar va materiallarga kirish taqdim etiladi.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">3. To‘lov shartlari</h2>
        <p className="mt-2">Xizmat pullik asosda taqdim etiladi. Tariflar:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>1 oy</li>
          <li>1 yil</li>
        </ul>
        <p className="mt-2">To‘lov Click orqali amalga oshiriladi.</p>
      </section>

      <section id="avtomatik-tolov" className="scroll-mt-24">
        <h2 className="text-base font-bold text-slate-900">4. Avtomatik to‘lov (abonent to‘lovi)</h2>
        <p className="mt-2">
          Foydalanuvchi xizmatni sotib olayotganda avtomatik ravishda keyingi davr uchun to‘lov yechib olinishi mumkinligiga
          rozilik bildiradi.
        </p>
        <p className="mt-2">Foydalanuvchi istalgan vaqtda obunani bekor qilishi mumkin.</p>
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-slate-800">
          <p className="font-semibold text-slate-900">To‘lovni amalga oshirish orqali siz quyidagilarga rozilik bildirasiz:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Sizning kartangizdan tanlangan tarif asosida avtomatik ravishda mablag‘ yechib olinadi.</li>
            <li>To‘lov davriy ravishda (oylik / yillik) amalga oshiriladi.</li>
            <li>Siz istalgan vaqtda obunani bekor qilishingiz mumkin.</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">5. Xizmatni taqdim etish</h2>
        <p className="mt-2">To‘lov amalga oshirilgandan so‘ng xizmat darhol faollashtiriladi.</p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">6. Javobgarlik</h2>
        <p className="mt-2">
          Xizmatdan noto‘g‘ri foydalanish natijasida yuzaga kelgan muammolar uchun xizmat ko‘rsatuvchi javobgar emas.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">7. Yakuniy qoidalar</h2>
        <p className="mt-2">Ushbu oferta O‘zbekiston Respublikasi qonunchiligiga muvofiq tartibga solinadi.</p>
      </section>
    </LegalDocShell>
  );
}
