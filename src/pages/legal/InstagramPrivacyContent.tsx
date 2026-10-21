import type { ReactNode } from 'react';

/**
 * Privacy policy for FalaRus.uz including the Instagram assistant (text from the owner,
 * 21.10.2026). Public URLs /privacy and /data-deletion are given to Meta in the app settings.
 */
export const PRIVACY_UPDATED = '21.10.2026';
const INSTAGRAM = { handle: '@falarus.uz', url: 'https://www.instagram.com/falarus.uz/' };
const TELEGRAM = { handle: '@falarus_admin', url: 'https://t.me/falarus_admin' };
export const INSTAGRAM_RETENTION_MONTHS = 12;

const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className="font-semibold text-[#0B2A6B] underline" href={href} target="_blank" rel="noopener noreferrer">{children}</a>
);
const H2 = ({ children }: { children: ReactNode }) => <h2 className="text-base font-bold text-slate-900">{children}</h2>;
const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="mt-2 list-disc space-y-1 pl-5">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
);

export function DataDeletionSection({ number }: { number?: string }) {
  return (
    <section id="udalenie-dannyh">
      <H2>{number ? `${number}. ` : ''}Ваши права и удаление данных</H2>
      <p className="mt-2">Вы можете в любой момент узнать, какие данные о вас у нас есть, исправить их, отказаться от автоматических сообщений или потребовать удалить данные.</p>
      <p className="mt-3 font-semibold text-slate-900">Как удалить данные:</p>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        <li>Напишите в Direct аккаунту <A href={INSTAGRAM.url}>{INSTAGRAM.handle}</A> слово «O‘chirish» или «Удалить», либо напишите в Telegram <A href={TELEGRAM.url}>{TELEGRAM.handle}</A> с текстом «Удаление данных» и укажите своё имя пользователя Instagram.</li>
        <li>Мы удалим переписку и данные, связанные с вашим аккаунтом, в течение 30 дней и сообщим об этом.</li>
      </ol>
      <p className="mt-3">Чтобы отключить доступ нашего приложения в Instagram, откройте «Настройки» → «Приложения и сайты».</p>
    </section>
  );
}

export function ContactsSection({ number }: { number?: string }) {
  return (
    <section>
      <H2>{number ? `${number}. ` : ''}Контакты и изменения</H2>
      <p className="mt-2">По любым вопросам о данных пишите в Telegram <A href={TELEGRAM.url}>{TELEGRAM.handle}</A> или в Direct <A href={INSTAGRAM.url}>{INSTAGRAM.handle}</A>.</p>
      <p className="mt-2">Мы можем обновлять эту политику. Новая версия публикуется на этой странице с датой обновления.</p>
    </section>
  );
}

export function InstagramPrivacyContent() {
  return (
    <>
      <p className="text-xs text-slate-500">Обновлено: {PRIVACY_UPDATED}</p>
      <section>
        <H2>1. Кто мы</H2>
        <p className="mt-2">FalaRus.uz — онлайн-платформа для изучения русского языка на узбекском языке, далее «FalaRus», «мы».</p>
        <p className="mt-2">Эта политика объясняет, как мы обрабатываем данные, когда вы пользуетесь сайтом FalaRus.uz, приложением FalaRus и общаетесь с нами в Instagram (комментарии и Direct), в том числе через наш автоматический помощник.</p>
      </section>
      <section>
        <H2>2. Какие данные мы получаем</H2>
        <p className="mt-2">Из Instagram (только то, что вы сами отправили нашему аккаунту):</p>
        <List items={[
          'имя пользователя и идентификатор аккаунта Instagram;',
          'текст комментариев под нашими публикациями;',
          'сообщения в Direct: текст, голосовые, фото и файлы, включая фото чеков об оплате;',
          'ответы на вопросы помощника, например страна проживания и цель изучения языка.',
        ]} />
        <p className="mt-3">На сайте и в приложении: имя, номер телефона, данные для входа, прогресс обучения и результаты заданий.</p>
        <p className="mt-2">Мы не получаем доступ к вашим подпискам, личным сообщениям с другими людьми и другим данным Instagram, которые вы нам не отправляли.</p>
      </section>
      <section>
        <H2>3. Зачем мы используем данные</H2>
        <List items={[
          'Отвечать на ваши комментарии и сообщения, в том числе автоматически.',
          'Рассказывать о платформе, тарифах и помогать выбрать подходящий вариант.',
          'Отправлять напоминания в Direct, пока продолжается наш с вами диалог.',
          'Проверять оплату и открывать доступ к обучению.',
          'Улучшать ответы помощника и качество обслуживания.',
        ]} />
        <p className="mt-3">Мы не продаём ваши данные и не используем их для рекламы третьих лиц.</p>
      </section>
      <section>
        <H2>4. Искусственный интеллект и третьи лица</H2>
        <p className="mt-2">Часть ответов в Instagram готовит ИИ-помощник. Для этого текст вашего сообщения и история диалога передаются поставщику ИИ, которого мы используем: Google (Gemini), OpenAI или Anthropic. Поставщик обрабатывает данные только для подготовки ответа. Сложные вопросы и оплату проверяет сотрудник FalaRus.</p>
        <p className="mt-2">Мы также передаём данные только тем сервисам, без которых платформа не работает:</p>
        <List items={[
          'Meta Platforms — доставка сообщений и комментариев в Instagram;',
          'хостинг и база данных — хранение диалогов и учётных записей;',
          'банк или платёжный сервис — при оплате обучения.',
        ]} />
        <p className="mt-3">Данные могут быть раскрыты государственным органам только в случаях, прямо предусмотренных законом.</p>
      </section>
      <section>
        <H2>5. Хранение и защита</H2>
        <List items={[
          'Данные хранятся на защищённых серверах, доступ к ним есть только у сотрудников FalaRus, которым он нужен для работы.',
          `Переписка из Instagram хранится до ${INSTAGRAM_RETENTION_MONTHS} месяцев после последнего сообщения, затем удаляется.`,
          'Данные учётной записи хранятся, пока вы пользуетесь платформой, и удаляются по вашему запросу.',
          'Сведения об оплате хранятся столько, сколько требует законодательство.',
        ]} />
        <p className="mt-3">Мы обрабатываем персональные данные в соответствии с законодательством Республики Узбекистан о персональных данных.</p>
      </section>
      <DataDeletionSection number="6" />
      <ContactsSection number="7" />
    </>
  );
}
