import { LegalDocShell } from './LegalDocShell';

export default function LegalPrivacyPage() {
  return <LegalDocShell title="MAXFIYLIK SIYOSATI">
    <p>FalaRus rus tilini o‘rganish xizmatidir. Ushbu siyosat sayt, iPhone va iPad ilovalarida ma’lumotlardan qanday foydalanilishini tushuntiradi.</p>
    <section><h2 className="text-base font-bold">1. Yig‘iladigan ma’lumotlar</h2>
      <ul className="mt-2 list-inside list-disc space-y-1">
        <li>Hisob: ism, telefon yoki email, hisob identifikatori va kirish usuli. Apple orqali kirishda haqiqiy email o‘rniga Apple yashirin email manzilini tanlashingiz mumkin.</li>
        <li>O‘qish: javoblar, dars natijalari, ballar, o‘yin natijalari va o‘qish faoliyati.</li>
        <li>O‘zingiz yuborgan materiallar: profil rasmi, chat xabarlari, ovoz, video va ustoz sifatida yuklangan hujjatlar.</li>
        <li>Xarid: mahsulot, tranzaksiya raqami, obuna muddati va to‘lov holati.</li>
        <li>Texnik xatolar: ilovadagi xato tavsifi, texnik stack, sahifa yo‘li va brauzer/qurilma dasturi haqidagi ma’lumotlar. Bu diagnostika so‘roviga hisob identifikatori yoki kirish tokeni qo‘shilmaydi; maqsad ilovadagi nosozliklarni aniqlashdir.</li>
      </ul>
    </section>
    <section><h2 className="text-base font-bold">2. Maqsad va ruxsatlar</h2>
      <p className="mt-2">Ma’lumotlar hisobga kirish, darslar va natijalarni saqlash, xaridlarni tasdiqlash, suhbat va yordam ko‘rsatish uchun ishlatiladi. Kamera, mikrofon va tanlangan fayllarga ruxsat tegishli funksiyani ishga tushirganingizda so‘raladi. Ruxsatni qurilma sozlamalarida o‘zgartirishingiz mumkin.</p>
      <p className="mt-2">Hamjamiyatga joylangan xabar va videolarni boshqa a’zolar ko‘rishi mumkin. Maxfiy hujjatlar yoki parollarni ochiq chatga yubormang.</p>
    </section>
    <section><h2 className="text-base font-bold">3. Apple orqali kirish va to‘lov</h2>
      <p className="mt-2">Ilovadagi to‘lov havolasi Rahmat to‘lov sahifasini ochadi. To‘lov ma’lumotlari to‘lov provayderi tomonidan qayta ishlanadi; FalaRus xarid va obuna holatini saqlaydi. Apple kirish ruxsati serverda shifrlanib saqlanadi va hisobni o‘chirishda bekor qilinadi.</p>
      <p className="mt-2">Saytdagi va yakka ustoz darsi kabi tegishli xizmatlarning to‘lovlari Rahmat yoki boshqa ko‘rsatilgan to‘lov provayderi orqali amalga oshirilishi mumkin. Yuborilgan to‘lov cheki shaxsiy ma’lumotlarni o‘z ichiga olishi mumkin.</p>
      <p className="mt-2">Agar sizda Apple orqali olingan obuna mavjud bo‘lsa, hisobni o‘chirish uni avtomatik bekor qilmaydi. Keyingi to‘lovni to‘xtatish uchun Apple obunalarini boshqarish bo‘limida uni bekor qiling.</p>
    </section>
    <section><h2 className="text-base font-bold">4. AI va boshqa xizmatlar</h2>
      <p className="mt-2">AI mashqlarida matn javoblari va topshiriq mazmuni, ovozni aniqlashda yozilgan audio, jonli AI suhbatida esa mikrofon ovozi Google Gemini va/yoki OpenAI xizmatlariga qayta ishlash uchun yuboriladi. iPhone va iPad ilovalarida bunday uzatishdan oldin alohida rozilik so‘raladi. Rozilikni Profil sozlamalarida bekor qilish mumkin; AI funksiyasidan keyingi foydalanish uchun qayta rozilik talab qilinadi.</p>
      <p className="mt-2">Google kirishi yoqilgan bo‘lsa, kirish Google orqali tekshiriladi. Ustoz bilan video darsda ovoz va video Jitsi/8x8 infratuzilmasi orqali uzatilishi mumkin. FalaRus serverlari hisob, o‘qish natijalari va yuborilgan materiallarni saqlaydi. Xizmat provayderlari ma’lumotlarni boshqa davlatlarda qayta ishlashi mumkin.</p>
      <p className="mt-2">iPhone va iPad ilovalarida Google Analytics va Yandex Metrika veb kuzatuv skriptlari yuklanmaydi. Saytda ular yoqilgan bo‘lsa, sayt faoliyati tahlil qilinishi mumkin.</p>
      <p className="mt-2">Provayderlar siyosati: <a className="underline" href="https://www.apple.com/legal/privacy/">Apple</a>, <a className="underline" href="https://policies.google.com/privacy">Google</a>, <a className="underline" href="https://openai.com/policies/privacy-policy/">OpenAI</a>, <a className="underline" href="https://jitsi.org/meet-jit-si-privacy/">Jitsi</a>.</p>
    </section>
    <section id="hisobni-ochirish"><h2 className="text-base font-bold">5. Hisobni va ma’lumotlarni o‘chirish</h2>
      <p className="mt-2">Profil → Profil sozlamalari → «Hisobni o‘chirish» orqali o‘zingiz so‘rov yuborishingiz mumkin. Tasdiqlanganda asosiy hisob va unga bazada bog‘langan ma’lumotlar o‘chiriladi, eski kirish tokeni ishlamaydi. Profil, yordam chati va hamjamiyatdagi siz yuklagan fayllar tozalash navbatiga qo‘yiladi; vaqtinchalik texnik xatoda tozalash qayta bajariladi.</p>
      <p className="mt-2">Xaridning takroran boshqa hisobga ishlatilishini oldini olish uchun hisobga bog‘lanmagan tranzaksiya identifikatori saqlanishi mumkin. Server zaxiralari va qonun talab qiladigan yozuvlar asosiy hisobdan alohida boshqariladi. Saqlash va o‘chirish holatini aniqlashtirish uchun yordam xizmatiga murojaat qiling.</p>
      <p className="mt-2">Ilovaga kira olmasangiz, hisobingizga bog‘langan telefon yoki email bilan Telegram orqali <a className="underline" href="https://t.me/falarus_admin">@falarus_admin</a> ga murojaat qiling. Maxfiy parol yoki Apple tasdiqlash kodini yubormang.</p>
    </section>
    <section><h2 className="text-base font-bold">6. Ma’lumotlarni himoya qilish va aloqa</h2>
      <p className="mt-2">Tarmoq so‘rovlari HTTPS orqali yuboriladi. Xarid holati serverda tekshiriladi, kirish tokenlari autentifikatsiya uchun ishlatiladi. Ma’lumotlaringiz, rozilik yoki o‘chirish bo‘yicha savollar uchun <a className="underline" href="https://t.me/falarus_admin">@falarus_admin</a> bilan bog‘laning.</p>
    </section>
  </LegalDocShell>;
}
