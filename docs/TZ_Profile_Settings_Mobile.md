# Техническое задание для дизайнера

## Раздел «Профиль и настройки» — FalaRus.uz mobile (Flutter)

**Версия:** 1.0
**Дата:** 1 июня 2026
**Платформа:** iOS + Android (Flutter, нативная сборка)
**Целевая аудитория:** Узбекоязычные пользователи, изучающие русский язык. Возраст 16–45. ~70 % используют недорогие Android-устройства, ~30 % — iPhone.
**Бенчмарки качества:** Duolingo, Babbel, Notion, Linear, Revolut, Стрелка.
**Тон бренда:** дружелюбный, заботливый, премиальный. Без перегруза анимациями.
**Цель раздела:** дать пользователю ощущение, что **его прогресс важен**, что **продукт о нём заботится**, и что **апгрейд тарифа — выгодная инвестиция**. Профиль — это «дом» в приложении, а не свалка ссылок.

---

## 0. Зачем это ТЗ

Сейчас экраны `ProfileScreen` и `ProfileSettingsScreen` сделаны функционально, но визуально это «скучный список форм». Это нормально для MVP, но не для платформы, которая собирается монетизироваться через подписку и удержание.

Цели редизайна:

1. **Удержание.** Профиль должен мотивировать вернуться завтра — через streak, прогресс, badges.
2. **Монетизация.** Тарифный блок должен быть главным героем экрана, а не пунктом списка.
3. **Доверие.** Премиум-визуал = «здесь не страшно заплатить».
4. **Lokalka-friendly.** Локализация Uz/Ru без поломки сетки (русские слова длиннее на 30–40 %).
5. **Готовность к dark mode.** Все компоненты проектируются сразу в двух темах.

---

## 1. Архитектура раздела

Раздел состоит из **1 главного экрана** и **7 sub-экранов**, открываемых из настроек.

```
[Bottom tab «Profil»]
└── ProfileScreen (главный)
    ├── → AccountSettingsScreen          (email / phone / password)
    ├── → NotificationSettingsScreen     (push, reminder time)
    ├── → AppearanceScreen               (тема, язык интерфейса)
    ├── → SoundHapticsScreen             (звук, вибрация)
    ├── → SupportScreen                  (FAQ, чат, написать нам)
    ├── → InviteFriendsScreen            (реферал)
    ├── → PaymentHistoryScreen           (история платежей)
    └── → TariffsScreen                  (выбор тарифа)
```

Навигация — push-translate (Cupertino-style на iOS, Material slide на Android). Все sub-экраны имеют back-arrow в AppBar и заголовок на узбекском.

---

## 2. Дизайн-система (фиксированная)

Эти токены уже зашиты в коде (`mobile/lib/theme/`). Дизайнер обязан использовать **именно их**, новые цвета добавлять только через согласование.

### 2.1 Палитра (Light)

| Назначение         | HEX        | Где используется                          |
|--------------------|------------|-------------------------------------------|
| Brand / Primary    | `#1E3A8A`  | заголовки, акцентные badges               |
| Primary Light      | `#2563EB`  | CTA-кнопки, активный фокус, иконки plan   |
| Primary Deep       | `#1E2D5C`  | hero-градиенты, premium-карточки          |
| Background         | `#FFFFFF`  | основной фон экрана                       |
| Surface Muted      | `#F8FAFC`  | секции внутри карточек, разделители       |
| Card               | `#FFFFFF`  | карточки настроек                         |
| Border             | `#C8DCF3`  | границы инпутов, разделители              |
| Text               | `#0F172A`  | основной текст                            |
| Text Muted         | `#4B4B4B`  | подписи, описания                         |
| Placeholder        | `#9B9B9B`  | placeholder в инпутах                     |
| Success            | `#22A552`  | успешные действия, активный план          |
| Warning            | `#F59E0B`  | «Tekshirilmoqda», истекающий план         |
| Error              | `#EF4444`  | ошибки, кнопка «Chiqish», delete account  |

### 2.2 Палитра (Dark — новая, нужно спроектировать)

Дизайнер предлагает dark-палитру, удовлетворяющую WCAG AA. Базовая опора:

- Background: `#0B1220` (deep navy, не чистый чёрный — у нас бренд navy)
- Card: `#111A2E`
- Border: `#1E2D5C`
- Text: `#F1F5F9`
- Text Muted: `#94A3B8`

Brand-цвет в dark стоит сделать **светлее на 1 шаг** (`#3B82F6` вместо `#2563EB`) — чтобы не «зажигал глаза».

### 2.3 Типографика

Шрифт — **Roboto** (системный, без подгрузки кастомного — экономия трафика).

| Стиль          | Размер | Вес | Line-height | Применение                       |
|----------------|--------|-----|-------------|----------------------------------|
| H1             | 38     | 800 | 1.25        | hero «Salom, Asilbek!»           |
| H2             | 30     | 600 | 1.25        | заголовки sub-экранов            |
| Body Semibold  | 16     | 600 | 1.25        | заголовки карточек, label-ы      |
| Body           | 14–16  | 400 | 1.5         | основной текст                   |
| Caption        | 12     | 500 | 1.4         | подписи под цифрами              |
| Button         | 16     | 600 | 1.25        | CTA                              |

### 2.4 Spacing scale

`4 / 8 / 16 / 24 / 32 / 48` (xs/sm/md/lg/xl/xxl). Между карточками — 16, внутри карточки padding 20–24, между секциями — 32.

### 2.5 Радиусы

- Карточки: **24px**
- Кнопки: **16px** (CTA), **25px** (pill для small action)
- Инпуты и chips: **12px**
- Tooltips и small badges: **8px**

### 2.6 Тени

- Card shadow: `0 14px 34px rgba(148,163,184,0.12)`
- Active/hover/elevated: `0 18px 44px rgba(37,99,235,0.28)`
- В dark-теме тени почти не видны — заменяем на **inner border 1px** `rgba(255,255,255,0.06)`.

### 2.7 Иконки

Используем **Lucide** (уже в проекте). Стиль outline, толщина 1.75px, размер базово 20px, в hero — 24px.

### 2.8 Touch targets

Минимум **44×44pt** (iOS HIG). Расстояние между кликабельными элементами — не меньше 8px.

### 2.9 Safe areas

Учитываем notch и home indicator. Top padding = `MediaQuery.padding.top + 8`, bottom (над tab-bar) — `MediaQuery.padding.bottom + 80` (высота bottom nav).

---

## 3. Экран 1 — ProfileScreen (главный)

Это самый важный экран раздела. Он должен **открываться за 1 секунду**, давать **3 мгновенных инсайта** (кто я, как я учусь, что мой тариф) и **1 чёткое действие** (либо «занимайся дальше», либо «продли тариф»).

### 3.1 Структура (сверху вниз)

```
1. Status Bar (transparent, light icons на цветном hero)
2. Hero Header                       ← новая
3. Identity Card (avatar + name)     ← редизайн
4. Stats Row (3 цифры)               ← новая
5. Plan Card                          ← редизайн (главный фокус)
6. Quick Actions Grid (4 плитки)     ← новая
7. Settings List                     ← редизайн
8. Footer (App version + logout)
```

Общий вертикальный отступ между блоками — 16px, между Hero и Identity Card — 0 (Identity Card «висит» на Hero, наполовину перекрывая).

---

### 3.2 Блок Hero Header

**Назначение:** эмоциональное приветствие + статус streak.

**Размеры:**
- Высота: 200pt (без status bar)
- Ширина: full-width
- Background: линейный градиент `#1E3A8A → #2563EB` (135°), поверх — слабый pattern с русскими буквами (А, Б, В, Г, Д) opacity 6 %, размер 80pt, без выхода за границы.

**Содержимое:**
- Слева сверху (после safe-area-top): «Profil» — H3, белый, opacity 80 %
- В центре: «Salom, Asilbek 👋» — H2, белый, weight 700. Эмоджи только в приветствии, больше нигде.
- Справа сверху: иконка `Bell` (notifications inbox, на будущее) — 24pt, белая, тап-зона 44×44.

**Streak chip (правый нижний угол hero):**
- Pill 12×6 padding, background `rgba(255,255,255,0.18)`, blur 8px (если поддерживается), border `1px rgba(255,255,255,0.3)`
- Иконка `Flame` (огонёк) 16pt, оранжевый `#F59E0B`
- Текст: «12 kun» — 14/600, белый
- Тап → открывает StreakDetailScreen (модальное окно с календарём — описано в разделе 11)

**Edge cases:**
- streak = 0: chip скрывается, на его месте — текст «Bugun ham harakat qiling 🔥» 12/500
- streak = 1: текст «1 kunlik streak»
- streak > 100: добавляем 🏆 рядом с цифрой

---

### 3.3 Блок Identity Card

**Назначение:** идентификация и быстрый редирект к настройкам.

**Размеры:**
- Margin-top: -56pt (наполовину перекрывает Hero — даёт эффект «карточки на фоне»)
- Margin-horizontal: 20pt
- Padding: 20pt
- Border-radius: 24pt
- Background: `#FFFFFF` (или `#111A2E` в dark)
- Shadow: card shadow

**Layout (горизонтальный):**
```
[Avatar 64×64]  [Name + meta]              [Edit icon]
```

**Avatar:**
- 64×64pt
- Border-radius 50 %
- Если у пользователя есть фото — `NetworkImage` с placeholder (initials на градиенте brand)
- Если нет фото — круг градиент `#2563EB → #1E3A8A`, в центре буквы (первая буква firstName + первая буква lastName), Roboto 24/700, белые
- В правом нижнем углу — маленький значок 20pt, белая обводка 2pt, синий фон с иконкой Camera (намёк, что можно поменять)
- Тап на avatar → ImagePicker (camera/gallery sheet)

**Name + meta (центр):**
- Имя: «Asilbek Karimov» — 18/700, цвет text
- Под ним: «A2 daraja · 5 oydan beri» — 13/500, textMuted
- (5 oydan beri — рассчитывается от created_at)

**Edit icon (справа):**
- 24pt, цвет primary
- Тап → AccountSettingsScreen (sub-экран)

---

### 3.4 Блок Stats Row (3 цифры)

**Назначение:** дать почувствовать прогресс. Один взгляд = понимаешь масштаб обучения.

**Размеры:**
- Margin-top: 16pt
- Margin-horizontal: 20pt
- Высота: 88pt
- 3 равные карточки, gap 12pt

**Каждая карточка:**
- Background: `#FFFFFF` (dark — `#111A2E`)
- Border-radius: 20pt
- Padding: 16pt
- Shadow: card shadow (слабее, можно 50 %)
- Layout: сверху — большая цифра, снизу — подпись

**Карточка 1 — XP:**
- Цифра: «2 480» — 22/800, цвет text
- Подпись: «Ball» — 11/600, textMuted, uppercase, letter-spacing 0.5
- Иконка слева сверху (12pt, opacity 40 %) — `Sparkles`, цвет primary

**Карточка 2 — Уровень:**
- Цифра: «A2» — 22/800, цвет text
- Подпись: «Daraja» — 11/600, textMuted, uppercase
- Иконка — `BarChart`, цвет success

**Карточка 3 — Streak:**
- Цифра: «12» — 22/800, цвет text
- Подпись: «Kun streak» — 11/600, textMuted, uppercase
- Иконка — `Flame`, цвет `#F59E0B`

**Tap behavior:** каждая карточка ведёт в StatistikaPage (на нужную вкладку — XP, Level, Streak).

**Empty state:**
- Если XP = 0 — показываем «—» и подпись «Birinchi darsdan boshlang»
- Если streak = 0 — «0» и подпись «Bugun boshlang»

---

### 3.5 Блок Plan Card (главный hero подписки)

**Назначение:** это **главный коммерческий блок** всего раздела. От него зависит конверсия в платёжку. Должен быть визуально сильнее всех остальных карточек.

**Размеры:**
- Margin-top: 24pt
- Margin-horizontal: 20pt
- Padding: 24pt
- Border-radius: 24pt
- Высота: динамическая (ориентировочно 180pt)

#### Состояние А — у пользователя НЕТ активного тарифа (free)

- Background: градиент `#1E2D5C → #2563EB` (135°), плюс декоративный radial-glow в правом верхнем углу `#FBBF24` opacity 25 %
- Поверх: paper-pattern из иконок книги, кофе, флага России (opacity 8 %)
- Layout:
  - Верх: chip «BEPUL» 11/700 white на `rgba(255,255,255,0.15)`, border-radius 8pt, padding 4×8
  - Заголовок: «Premium-ga o'ting» — 22/700, white
  - Подпись (под заголовком, 8pt отступ): «Cheksiz darslar, AI suhbat, sertifikat» — 13/500, opacity 80 %
  - Низ (после отступа 16pt): CTA button «Tariflarni ko'rish» — 16/600, full-width, background `#FBBF24` (золото), text `#1E3A8A`, height 52pt, radius 16pt, активная shadow

**Анимация:** при появлении экрана — плавный fade+slide-up 300ms, easing easeOut. CTA при tap — scale 0.97.

#### Состояние B — активный тариф

- Background: `#FFFFFF`, border 1px `#C8DCF3`, shadow card
- Верх (горизонтально, space-between):
  - Слева chip «AKTIV» — 11/700, цвет `#22A552`, background `#DCFCE7`, radius 8pt, padding 4×8
  - Справа — иконка `Crown` 20pt, цвет `#F59E0B`
- Заголовок (под chip, 12pt): «Premium 1 yil» — 20/700, цвет text
- Под заголовком: «Tugaydi: 14-noyabr 2026 (164 kun qoldi)» — 13/500, textMuted
  - Если < 30 дней — цвет warning `#F59E0B`
  - Если < 7 дней — цвет error `#EF4444`, плюс под текстом — кнопка «Yangilash» pill
- Progress bar (под датой, 16pt отступ): полоса 6pt высотой, background `#E2E8F0`, fill — gradient `#22A552 → #2563EB`, заполнено пропорционально (если 164 из 365 — fill 45 %)
- Низ: outline-кнопка «Tariflarni boshqarish» — 14/600, цвет primary, height 44pt, border 1.5pt primary, radius 16pt

#### Состояние C — pending payment (Tekshirilmoqda)

- Background: `#FFFBEB` (мягкая желтизна), border 1px `#FBBF24`
- Верх chip: «TEKSHIRILMOQDA» 11/700, цвет `#92400E`, background `#FEF3C7`
- Заголовок: «To'lov tasdiqlanmoqda» — 18/700, цвет text
- Под ним: «Premium 1 yil · 30-may, 14:32» — 13/500, textMuted
- Текст-подсказка (внизу): «Odatda 5–10 daqiqada tasdiqlanadi» — 12/500, textMuted
- Иконка слева вверху — `Clock` 20pt, цвет warning, с pulse-анимацией (opacity 1 ↔ 0.6, 1.5s loop)

---

### 3.6 Блок Quick Actions Grid

**Назначение:** быстрый доступ к 4 самым частым действиям. Не дублирует Settings List, а **поверх него** — для горячих сценариев.

**Структура:** 2×2 grid, gap 12pt, margin-horizontal 20pt, margin-top 24pt.

**Каждая плитка:**
- Высота: 88pt
- Background: `#FFFFFF`, shadow card (слабая)
- Radius: 20pt
- Padding: 16pt
- Layout вертикальный: сверху иконка-кружок 36×36 с brand-tint background, снизу label (13/600)

**4 плитки:**

| # | Иконка       | Background иконки    | Label                  | Действие                          |
|---|--------------|----------------------|------------------------|-----------------------------------|
| 1 | `UserPlus`   | `#EFF6FF` blue       | «Do'st taklif qil»     | → InviteFriendsScreen             |
| 2 | `CreditCard` | `#DCFCE7` green      | «Tariflar»             | → TariffsScreen                   |
| 3 | `History`    | `#FEF3C7` amber      | «To'lov tarixi»        | → PaymentHistoryScreen            |
| 4 | `MessageCircle` | `#F3E8FF` purple  | «Yordam»               | → SupportScreen                   |

В dark-режиме backgrounds иконок — тех же цветов, но opacity 20 %.

---

### 3.7 Блок Settings List

**Назначение:** все остальные настройки, сгруппированные. Сейчас в коде это плоский список — нужно сгруппировать.

**Структура:**
- Margin-top: 24pt
- Margin-horizontal: 20pt
- Грouping в **3 секции**, каждая — отдельная карточка с radius 24pt, divider между строками 1px `#F1F5F9`

**Секция 1 — Akkaunt:**

| Иконка   | Label                          | Sub-text (опционально)         | Действие                  |
|----------|--------------------------------|--------------------------------|---------------------------|
| `User`   | Akkaunt ma'lumotlari           | email / phone preview           | → AccountSettingsScreen    |
| `Lock`   | Parolni almashtirish           | —                               | → AccountSettingsScreen (anchor: password) |

**Секция 2 — Sozlamalar:**

| Иконка       | Label                | Sub-text                       | Действие                  |
|--------------|----------------------|--------------------------------|---------------------------|
| `Bell`       | Bildirishnomalar     | «Har kuni 19:00»               | → NotificationSettingsScreen |
| `Palette`    | Ko'rinish            | «Yorug' / Tungi / Avtomatik»   | → AppearanceScreen        |
| `Globe`      | Til                  | «O'zbekcha»                    | → AppearanceScreen (anchor: language) |
| `Volume2`    | Ovoz va vibratsiya   | switch state inline            | → SoundHapticsScreen      |

**Секция 3 — Boshqa:**

| Иконка        | Label                       | Действие                  |
|---------------|-----------------------------|---------------------------|
| `HelpCircle`  | Yordam va FAQ               | → SupportScreen            |
| `Star`        | Ilovaga baho bering          | open native rating modal  |
| `FileText`    | Maxfiylik siyosati          | webview legal page        |
| `Shield`     | Foydalanish shartlari        | webview legal page        |

**Layout каждой строки:**
- Высота: 64pt
- Padding-horizontal: 20pt
- Layout: `[Icon 24pt] [Label + sub-text column] [spacer] [ChevronRight 20pt]`
- Иконка: цвет textMuted, не brand — чтобы не отвлекать
- Label: 15/600, цвет text
- Sub-text: 12/500, цвет textMuted (опционально)
- Hover/press state: background `#F8FAFC` (dark — `rgba(255,255,255,0.04)`)

---

### 3.8 Блок Footer

- Margin-top: 32pt, margin-bottom: 100pt (над tab-bar + safe area)
- По центру:
  - Кнопка-ссылка «Chiqish» — 16/600, цвет error `#EF4444`, без фона, padding 12×24, tap-area 44pt
  - Под ней: «FalaRus v1.4.2 (build 218)» — 11/500, цвет textMuted, opacity 60 %

При тапе на «Chiqish» — confirmation dialog:
- Title: «Chiqishni tasdiqlang»
- Body: «Hisobingizdan chiqasizmi? Sizga keyin yana kirish kerak bo'ladi.»
- Кнопки: «Bekor qilish» (secondary) и «Chiqish» (error, white text on red)

---

### 3.9 Состояния экрана ProfileScreen

| Состояние   | Поведение |
|-------------|-----------|
| **Loading** | Skeleton с shimmer: hero — solid color, identity card — серый прямоугольник, stats row — 3 серых блока, plan card — серый блок. **НЕ** spinner в центре экрана. |
| **Error**   | Сверху toast 64pt с текстом ошибки и кнопкой «Qayta urinish», content area остаётся последним кэшем |
| **Offline** | Banner под hero: «Internet yo'q. Ma'lumotlar yangilanmagan.» — yellow, 40pt, dismiss button |
| **Empty**   | Если у user всё «пусто» (free + 0 XP + 0 streak) — Plan Card в free-состоянии становится **главным** визуально, всё остальное — мутед |

---

## 4. Экран 2 — AccountSettingsScreen

**Назначение:** редактирование email, телефона, пароля.
**Маршрут:** `/profile/settings`
**AppBar:** title «Akkaunt», back-arrow слева

### 4.1 Структура

```
1. Hero block (краткий) — Avatar (большой 96×96) + name + tap «Rasmni o'zgartirish»
2. Section: «Email» — карточка
3. Section: «Telefon raqami» — карточка
4. Section: «Parol» — карточка
5. Danger zone — карточка
```

### 4.2 Hero block

- Margin-top: 24pt (после AppBar)
- Avatar 96×96 по центру, бордюр 4pt белый, shadow active (28%)
- Под ним button-link «Rasmni o'zgartirish» — 14/600, цвет primary, padding 8×16, tap-area 44pt
- Под ним «Asilbek Karimov» 18/700 + «id: AS-2480» 12/500 textMuted

### 4.3 Карточка Email

- Padding 20pt, radius 24pt, background `#FFFFFF`, shadow card
- Заголовок «Email» 16/600
- Подпись «Foydalanuvchi nomingiz va hisobni tiklash uchun» 12/500 textMuted
- Input field:
  - Label: «Email manzili»
  - Placeholder: «sizning@email.com»
  - Validation: regex `/^[^@]+@[^@]+\.[^@]+$/` + livecheck (debounce 500ms на дубликат через API)
  - State error: border `#EF4444` 1.5pt, под полем — 12/500 error «Email noto'g'ri formatda»
- CTA «Saqlash» — full-width, primary, disabled пока email не изменился
- Confirmation после успеха: green banner «Email yangilandi ✓» на 3 секунды, потом fade

### 4.4 Карточка Telefon

- Аналогично email
- Поле — international phone input с country code picker (default +998)
- Mask: +998 (XX) XXX-XX-XX
- Validation: длина = 12 цифр (без +)
- CTA «Saqlash»
- **Дополнительно:** под полем — verify chip «✓ Tasdiqlangan» (если verified) или кнопка-ссылка «SMS orqali tasdiqlash» (если нет)

### 4.5 Карточка Parol

- Заголовок «Parolni almashtirish» 16/600
- 3 поля password (стандартные с eye-toggle):
  - «Joriy parol»
  - «Yangi parol» — под полем strength meter (4 deli, color от red → green)
  - «Yangi parolni tasdiqlash»
- Под полями — checklist «Parol talablari»:
  - ✓ Kamida 8 belgi (или ○ серый если не выполнено)
  - ✓ Katta harf
  - ✓ Raqam
  - (опционально для премиум-фила) ✓ Maxsus belgi
- CTA «Parolni yangilash» — disabled пока не все требования + match

### 4.6 Danger Zone

- Карточка с border 1.5pt `#FECACA` (light red), background `#FEF2F2`
- Заголовок «Xavfli zona» 14/700, цвет error
- 2 строки:
  - **«Hisobni o'chirish»** — sub-text «Barcha ma'lumotlaringiz o'chiriladi. Bu amalni qaytarib bo'lmaydi.» 12/500 textMuted
    - CTA «O'chirish» 14/600 error, outline-style
    - При tap — 2-step confirmation: вводишь email для подтверждения, потом 5-секундный countdown на кнопке «Tasdiqlayman»
  - **«Ma'lumotlarni eksport qilish»** — sub-text «GDPR talabiga muvofiq» 12/500 textMuted
    - CTA «Yuklab olish» 14/600 primary, outline
    - При tap — модалка «Sizga email orqali yuboramiz»

---

## 5. Экран 3 — NotificationSettingsScreen

**Назначение:** управление push и напоминаниями.

### 5.1 Структура

```
1. Section: «Push bildirishnomalar» — master toggle
2. Section: «Kunlik eslatma» — time picker
3. Section: «Bildirishnoma turlari»
```

### 5.2 Master toggle

- Карточка, padding 20pt
- Layout горизонтальный: иконка `Bell` 24pt + текст-блок + toggle
- Текст: «Push bildirishnomalar» 16/600
- Sub: «Yangi darslar, eslatmalar va yangiliklar» 12/500 textMuted
- Toggle — стандартный Material switch, цвет primary
- При выключении — все нижние секции серые (opacity 40%), не интерактивные

### 5.3 Time picker

- Заголовок секции «Kunlik eslatma» 14/700 textMuted, uppercase
- Карточка:
  - Иконка `Clock` 24pt
  - Label «Eslatma vaqti» 15/600
  - Справа — chip с временем «19:00» 14/600 цвет primary, при tap — open time picker (native Cupertino/Material wheel)
- Под карточкой — мини-row: «Hafta kunlari» с 7 chip-кружками (Du, Se, Cho, Pa, Ju, Sh, Ya), выбранные — fill primary, невыбранные — outline border `#C8DCF3`

### 5.4 Notification types

- Заголовок «Bildirishnoma turlari» 14/700 textMuted
- Карточка-список, каждая строка с inline toggle:
  - «Streak xavfda!» — sub «Streak yo'qotmaslik uchun ogohlantirish» — default ON
  - «Yangi dars» — «Yangi dars chiqqanda» — default ON
  - «Aksiyalar va chegirmalar» — «Tariflarga aksiyalar» — default OFF (важно — opt-in)
  - «Do'stlar faoliyati» — «Do'stingiz yangi daraja olganida» — default ON

---

## 6. Экран 4 — AppearanceScreen

**Назначение:** тема и язык интерфейса.

### 6.1 Структура

```
1. Section: «Mavzu» — 3 опции
2. Section: «Til» — 2 опции
3. Section: «Matn o'lchami» — 3 опции (опционально для accessibility)
```

### 6.2 Mavzu (тема)

- Заголовок «Mavzu» 14/700 textMuted
- 3 карточки в горизонтальный grid (1×3, gap 12pt):
  - **Yorug'** — preview-картинка 100×120pt белый интерьер карточки + selected ring
  - **Tungi** — preview тёмная карточка
  - **Avtomatik** — preview split-картинка половина светлая, половина тёмная
- Каждая карточка: radius 20pt, padding 12pt, border 2pt (primary если выбрана, border-color иначе)
- Под preview — label 13/600 + radio-circle indicator справа сверху
- При смене темы — плавный crossfade 250ms по всему приложению

### 6.3 Til (язык)

- Заголовок «Til» 14/700 textMuted
- Карточка, 2 строки:
  - 🇺🇿 O'zbekcha (latin) — radio + label, selected — primary fill
  - 🇷🇺 Русский — radio + label
- Sub-text внизу карточки: «O'zgartirgandan keyin ilova qayta yuklanadi» 12/500 textMuted
- При смене — confirmation modal «Tilni o'zgartirsizmi?» с Cancel/Confirm

### 6.4 Matn o'lchami (опционально, для дальнейших итераций)

- 3 опции: «Kichik / O'rtacha / Katta»
- Slider или 3 chip-а
- Превью карточки сверху, которая меняется в реальном времени

---

## 7. Экран 5 — SoundHapticsScreen

**Назначение:** звуки и тактильная отдача.

### 7.1 Структура (минималистичная — 1 карточка с 4 toggle)

- Карточка, padding 20pt
- Заголовок «Ovoz va vibratsiya» 16/600
- 4 строки с inline toggle:
  - «Ta'lim ovozlari» (звуки правильного/неправильного ответа) — default ON
  - «Tugma bosish ovozlari» — default OFF
  - «Vibratsiya» — default ON
  - «Streak ovozi» — default ON
- Под каждой строкой — sub-text 12/500 textMuted
- Внизу карточки — «Sinab ko'rish» button 14/600 outline primary → проигрывает тестовый звук + вибрацию

---

## 8. Экран 6 — SupportScreen

**Назначение:** помощь, FAQ, обратная связь.

### 8.1 Структура

```
1. Hero (smaller) — «Sizga qanday yordam beramiz?»
2. Поиск в FAQ
3. Top 5 FAQ
4. CTA: чат / письмо / Telegram
5. «Ilovaga baho bering»
```

### 8.2 Hero

- Padding 24pt, background `#EFF6FF` (light blue tint), radius 20pt, margin 20pt
- Иконка `MessageCircleQuestion` 32pt primary в центре
- Заголовок «Sizga qanday yordam beramiz?» 18/700 центрированный
- Sub «Quyidagi savollardan boshlang yoki bizga yozing» 13/500 textMuted

### 8.3 Поиск

- Sticky search bar 48pt, radius 12pt, background `#F8FAFC`
- Иконка `Search` 18pt textMuted слева
- Placeholder «Savolingizni yozing» 14/500 placeholder
- При фокусе — фильтрует FAQ ниже + suggestions

### 8.4 Top FAQ

- Заголовок «Tez-tez beriladigan savollar» 14/700 textMuted
- Карточка с accordion-строками:
  - «Tarifni qanday yangilashim mumkin?»
  - «To'lov o'tmadi, nima qilay?»
  - «Sertifikatni qanday olishim mumkin?»
  - «Boshqa qurilmada kirish mumkinmi?»
  - «Hisobni qanday o'chiraman?»
- Каждая строка 56pt, tap → expand, иконка `ChevronDown` поворачивается на 180° при открытии

### 8.5 Связь с поддержкой

- 3 карточки в столбик:
  - **Telegram** — иконка + «@FalaRus_support» + sub «Eng tez javob, ~10 daqiqa», CTA «Telegramda yozish» → deeplink
  - **Email** — «support@falarus.uz» + sub «1 ish kuni ichida», CTA «Xat yozish» → mailto
  - **Chat in-app** — (если планируется) «Onlayn yordam» + sub «Hozir ishlamayapti» (or «Faol»), CTA «Boshlash»

### 8.6 Rate the app

- Карточка золотистая `#FEF3C7`, border `#FBBF24`
- Иконка `Star` 24pt amber
- Текст: «Ilovamiz yoqdimi? Bizga 5 yulduz qoldiring» 14/600
- CTA «Baho berish» → open native Store rating sheet

---

## 9. Экран 7 — InviteFriendsScreen

**Назначение:** реферал. Это **второй важный коммерческий блок** (после Plan Card).

### 9.1 Структура

```
1. Hero illustration
2. Reward chip
3. Referral code card
4. Steps explainer (1-2-3)
5. Stats (приглашено, конверсия)
6. Share CTA
```

### 9.2 Hero

- SVG-иллюстрация 200×160 (два персонажа с книгой) — заказывается отдельно или используется Storyset/Undraw
- Заголовок «Do'stingizni taklif qiling» H2 18/700 центр
- Sub «Siz va do'stingiz 1 oy Premium yutib olasiz» 14/500 textMuted

### 9.3 Reward chip

- Pill background gradient `#FBBF24 → #F59E0B`, padding 8×16
- Иконка `Gift` + текст «+30 kun Premium» 14/700 white

### 9.4 Referral code card

- Background `#F8FAFC`, dashed border 2pt `#C8DCF3`, padding 20pt, radius 16pt
- Код «ASILBEK2026» — 24/800 monospace, центрированный, цвет primary
- Под ним 2 кнопки:
  - «Nusxa olish» — outline primary
  - «Ulashish» — solid primary (open native share sheet)

### 9.5 Steps explainer

- 3 строки с иконкой-кружком (1, 2, 3) и текстом:
  - 1. «Do'stingizga kodingizni yuboring»
  - 2. «U ro'yxatdan o'tib, birinchi tarifni xarid qiladi»
  - 3. «Ikkalangizga ham 30 kun Premium qo'shiladi»

### 9.6 Stats

- Карточка с 3 столбцами:
  - Taklif qilingan: 8
  - Ro'yxatdan o'tgan: 5
  - Premium oldi: 3
- Sub «Tabriklayman! 90 kun yutdingiz» при > 0

---

## 10. Анимации и микровзаимодействия

### 10.1 Page transitions

- iOS — Cupertino slide-from-right, 350ms
- Android — Material shared axis X, 300ms

### 10.2 Появление контента (mount)

- Hero — opacity 0→1 + translateY -8→0, 350ms, easeOutCubic
- Identity card — delay 80ms, fade+slide, 300ms
- Stats — staggered 60ms между карточками
- Plan card — последняя, scale 0.96→1 + fade, 400ms easeOutBack (мягкий «прыжок»)

### 10.3 Тап-фидбек

- Все интерактивные элементы: scale 1→0.97, 150ms, ease, без отскока
- Карточки настроек — background → `#F8FAFC` за 100ms при press
- Кнопки — opacity 1→0.85 при press

### 10.4 Streak chip animation

- При первом появлении — flame icon делает 1 «flicker» (scale 1→1.15→1, 400ms)
- Если streak увеличился сегодня — full bounce + confetti один раз при открытии экрана

### 10.5 Загрузка

- Skeleton shimmer (gradient pass) — 1.4s loop
- Не использовать spinner-by-default — только если ответ > 600ms

### 10.6 Успех / ошибка

- Banner (60pt height) сверху, slide-from-top 250ms
- Success — `#DCFCE7` background, `#15803D` text, иконка `CheckCircle`
- Error — `#FEE2E2` background, `#B91C1C` text, иконка `XCircle`
- Auto-dismiss через 3 секунды, swipe-up для ручного закрытия

### 10.7 Pull-to-refresh

- На ProfileScreen — стандартный native refresh control с custom indicator (flame иконка вместо стрелки)

### 10.8 Dark mode transition

- Smooth crossfade 250ms между палитрами всего экрана

---

## 11. Дополнительный экран — StreakDetailScreen (bonus)

При тапе на streak chip — открывается модальное окно sheet (75 % высоты экрана):

- Drag handle сверху
- Big number «12 kun» — 48/800 + flame 32pt
- Subtitle «Eng uzun streak: 21 kun» 14/500 textMuted
- Календарь месяца: 7×5 grid с днями
  - Завершённые дни — fill primary `#2563EB`, белая цифра
  - Сегодня — border 2pt primary, цвет primary
  - Streak freeze (если есть) — иконка снежинки
  - Будущие — серые
- Внизу — «Streak freeze: 2 ta qoldi» с CTA «Qo'shimcha sotib olish» (премиум-фича)

---

## 12. Локализация

### 12.1 Ключи

Все строки выносятся в `lib/l10n/app_en.arb`, `app_uz.arb`, `app_ru.arb`. Нумерация — по экранам:

- `profile.hero.greeting`: «Salom, {name} 👋»
- `profile.streak.chip`: «{count} kun»
- `profile.stats.xp.label`: «Ball»
- … и т.д.

### 12.2 Pluralisation

- Streak: `{count, plural, one{1 kun} other{# kun}}`
- Дни до окончания тарифа: `{count, plural, one{1 kun qoldi} other{# kun qoldi}}`

### 12.3 Длина строк

Дизайнер должен предусмотреть **+40 % длины** для русских вариантов. Например, «Bildirishnomalar» (14 символов) → «Уведомления» (11), но «Tariflarni boshqarish» (21) → «Управлять тарифами» (18). В среднем русский в этом продукте короче, но **немецкий-стиль accommodation** (то есть запас) обязателен.

---

## 13. Accessibility

- Все интерактивные элементы — `Semantics(label: …, button: true)`
- Контрастность — все цвета пары проверены через AA (4.5:1 на текст < 18pt)
- Поддержка `MediaQuery.textScaleFactor` — текст масштабируется до 130 %, layout не ломается (карточки могут увеличиваться по высоте)
- VoiceOver / TalkBack — каждый экран начинается с заголовка, focus-порядок сверху вниз, для toggle — состояние («yoqilgan» / «o'chirilgan»)
- Reduce motion — отключает все scale-, slide-анимации, оставляет fade

---

## 14. Технические ограничения

- Все экраны должны работать **offline-first** через локальный кеш `auth_controller` (текущий пользователь, тариф)
- Изменения email/phone/password — требуют online
- Avatar upload — до 5 MB, сжимаем до 512×512 перед upload
- Время загрузки ProfileScreen с кеша — < 100ms, с сети — < 800ms на 3G

---

## 15. Deliverables дизайнера

1. **Figma file** с раскладкой на iPhone 14 (390×844) и Android Pixel 6 (412×915), а также Galaxy A50 (360×800 — самый «тесный» case у нашей аудитории).
2. **Light + Dark theme** для каждого экрана.
3. **Состояния:** default, loading (skeleton), error, empty.
4. **Прототип** в Figma — кликабельные переходы между всеми экранами раздела (главный → 7 sub).
5. **Specification page** с токенами (если что-то отступило от текущей дизайн-системы — обоснование).
6. **Иллюстрации** для InviteFriendsScreen и empty states — векторные, упакованы как SVG, цвета через CSS variables (чтобы работали в обеих темах).
7. **Иконки** — список используемых из Lucide (если нужны кастомные — отдельный SVG-сет).
8. **Анимационные референсы** — для streak, mount, transitions — в виде Lottie JSON или 5-секундный видео-референс (можно ссылку на конкретные моменты Duolingo / Babbel).

### Формат сдачи:
- Figma-ссылка с правами view + comment для команды
- Экспорт всех экранов в PNG 2× в zip
- Краткое описание дизайн-решений (3–5 страниц) — где какие отступы и почему

---

## 16. Дедлайн и процесс

1. **Неделя 1.** Lo-fi wireframes + структура (главный экран + 2 ключевых sub)
2. **Неделя 2.** Hi-fi дизайн главного экрана + Plan Card в 3 состояниях + design tokens validation
3. **Неделя 3.** Все sub-экраны + dark theme + анимации
4. **Неделя 4.** Прототип + handoff + iterations по фидбеку команды

Промежуточные ревью — конец каждой недели, async через Figma comments. Финальное синк-демо — конец недели 4.

---

## 17. Что НЕ делать

- ❌ Не использовать чисто чёрный `#000` нигде — у нас deep navy
- ❌ Не добавлять gradients на каждую кнопку — gradient только на hero + plan card в free-состоянии + reward chip
- ❌ Не использовать эмоджи в UI кроме приветствия (Salom 👋), флагов (🇺🇿 🇷🇺) и геймификации (🔥 для streak, 🏆 для milestone)
- ❌ Не делать shadow глубже 24px — тяжело смотрится
- ❌ Не использовать оранжевый/красный для не-error/warning элементов (мы зарезервировали их под flame и плохие новости)
- ❌ Не использовать другие шрифты кроме Roboto (системный) — fontPack экономия
- ❌ Не делать кнопки с тенью drop-shadow в dark mode — только border-glow
- ❌ Не превращать ProfileScreen в admin-panel — должен оставаться эмоциональным «домом»

---

## 18. Референсы (внимательно посмотреть перед стартом)

- **Duolingo iOS** — Profile tab → streak handling, league widget, friends quest
- **Babbel** — Settings hierarchy, premium card placement
- **Notion mobile** — Settings list grouping (compact, отступы)
- **Linear mobile** — Account settings, dark theme качество
- **Revolut** — карточка тарифа (Premium / Metal cards) — золото-градиент на black
- **Stripe Dashboard mobile** — danger zone treatment
- **Cal AI / Calm** — empty states с иллюстрациями

---

## 19. KPI редизайна (как меряем успех)

- Увеличение конверсии free → paid через кнопку «Tariflarni ko'rish» в Plan Card — цель +20 %
- Активация push-уведомлений в первые 7 дней — цель 65 % (сейчас ~40 %)
- Время до первого изменения настроек (email/phone) — сократить с 4 экранов до 2
- Активные реферал-приглашения — рост в 2× после редизайна InviteFriendsScreen
- Rating в Store через in-app prompt — > 4.6

---

**Конец ТЗ.** Все вопросы — Farmon, fariksalom@gmail.com.
