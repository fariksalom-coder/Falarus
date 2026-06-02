# Задание 1. Asana-доска проекта YouTube

**Курс:** Управление IT-проектами · Проект 4 «Инструменты менеджера проектов»
**Студент:** Farmon
**Дата:** 01.06.2026

---

## 1. Контекст

**Выбранный IT-продукт:** YouTube (видеохостинг и стриминговая платформа Google).

**Выбранный проект внутри продукта:** **«Auto-Chapters AI»** — внедрение функции автоматической генерации глав (тайм-кодов) и краткого AI-саммари для длинных видео (>8 мин). Цель — сократить время поиска нужного фрагмента у зрителя и поднять средний показатель Watch Time на 4–6%.

**Текущая стадия жизненного цикла:** середина (Mid-development / pre-Beta).
Discovery, Design и Architecture закрыты. Идёт активная разработка (backend, ML, mobile, web), часть задач уже в QA. Beta-релиз и GA — ещё в бэклоге.

---

## 2. Этапы проекта (Sections в Asana)

| # | Этап | Статус этапа | Цель |
|---|---|---|---|
| 1 | Discovery & Research | Done | Подтвердить ценность фичи, провести интервью с creators |
| 2 | Product Design | Done | Финальные макеты Web/Mobile, прототип, motion-spec |
| 3 | Technical Architecture | Done | Архитектура ML-pipeline, выбор моделей, нагрузочные требования |
| 4 | Backend & ML Development | **In Progress** | Обучение модели, inference API, кэш, A/B инфра |
| 5 | Frontend Development (Web/iOS/Android) | **In Progress** | Интеграция UI в плеер на всех платформах |
| 6 | QA & Testing | **In Progress** | Функциональное, нагрузочное, локализация, accessibility |
| 7 | Closed Beta (1% creators US/UZ/IN) | To Do | Сбор метрик и фидбэка от ~5 000 каналов |
| 8 | GA Launch + Marketing | Backlog | Глобальный релиз, PR, обновление YouTube Studio Help |

---

## 3. Роли и команда

| Роль | Имя (условно) | Ответственность |
|---|---|---|
| Product Manager (lead) | Анна К. | Общая координация, OKR, стейкхолдеры |
| UX Researcher | Михаил П. | Интервью с creators, юзабилити-тесты |
| Lead Designer | Елена С. | UI/UX, дизайн-система, motion |
| Tech Lead / Architect | Дмитрий В. | Архитектура решения, code review, риски |
| ML Engineer (×2) | Сергей М., Алия Н. | Модель суммаризации и chapter-detection |
| Backend Engineer (×2) | Игорь Р., Тимур А. | Inference API, кэш-слой, A/B-флаги |
| Frontend Web Engineer | Мария Л. | Интеграция в Web-плеер |
| iOS Engineer | Олег Б. | Интеграция в iOS-плеер |
| Android Engineer | Кирилл Д. | Интеграция в Android-плеер |
| QA Engineer (×2) | Татьяна Ж., Руслан Х. | Автотесты, регресс, нагрузочное |
| Data Analyst | Виктор О. | Метрики, A/B, дашборды Watch Time |
| Marketing Manager | Юлия Е. | Анонс, материалы для creators |
| DevOps / SRE | Артём З. | GPU-кластер, мониторинг, rollout |
| Content Policy Lead | Наталья И. | Проверка на риски (галлюцинации, NSFW) |

---

## 4. Статусы задач на доске (колонки)

`Backlog` → `To Do` → `In Progress` → `Code Review` → `QA` → `Blocked` → `Done`

---

## 5. Декомпозиция задач по этапам

### Этап 1. Discovery & Research — *Done*
- D-01. Анализ конкурентов (Spotify Podcast Chapters, TikTok Search) — UX Researcher
- D-02. Интервью с 20 creators 100k+ — UX Researcher + PM
- D-03. Анализ воронки: где зритель «отваливается» на длинных видео — Data Analyst
- D-04. Product Requirements Document (PRD) v1.0 — PM
- D-05. Согласование PRD со стейкхолдерами (VP Product, Legal) — PM

### Этап 2. Product Design — *Done*
- DS-01. User flows: автогенерация vs ручная правка — Designer
- DS-02. Hi-fi макеты Web-плеера (light/dark) — Designer
- DS-03. Hi-fi макеты iOS/Android — Designer
- DS-04. Motion-spec для анимации появления глав — Designer
- DS-05. Юзабилити-тест прототипа (8 респондентов) — UX Researcher
- DS-06. Дизайн-ревью с design-system team — Designer

### Этап 3. Technical Architecture — *Done*
- A-01. Выбор базовой модели (Gemini Flash vs in-house) — ML + Tech Lead
- A-02. Спецификация inference API — Tech Lead
- A-03. Прогноз нагрузки (QPS, GPU-часы, стоимость) — Tech Lead + DevOps
- A-04. Архитектурное ревью с Platform Team — Tech Lead
- A-05. Threat model и privacy-review — Tech Lead + Legal

### Этап 4. Backend & ML Development — *In Progress*
- B-01. Обучение модели chapter-detection v1 — ML
- B-02. Обучение модели summary-generation v1 — ML
- B-03. Eval-сет 500 видео (точность глав ≥ 0.85) — ML + QA
- B-04. Inference API (gRPC) — Backend
- B-05. Кэш-слой Redis для готовых саммари — Backend
- B-06. Интеграция A/B-флага через Google Internal — Backend
- B-07. Метрики и алёрты (latency p95 < 800 мс) — Backend + DevOps
- B-08. Локализация саммари (en, ru, uz, hi, es) — ML

### Этап 5. Frontend Development — *In Progress*
- F-01. UI-компонент «Chapter chip» в Web-плеере — Web FE
- F-02. Drawer с AI-саммари (Web) — Web FE
- F-03. UI «Chapter chip» в iOS-плеере — iOS
- F-04. UI «Chapter chip» в Android-плеере — Android
- F-05. Drawer с AI-саммари (iOS) — iOS
- F-06. Drawer с AI-саммари (Android) — Android
- F-07. Кнопка фидбэка «Глава неточная» — все платформы
- F-08. Accessibility (VoiceOver / TalkBack) — все платформы

### Этап 6. QA & Testing — *In Progress*
- Q-01. Тест-план и чек-листы — QA Lead
- Q-02. Автотесты для inference API — QA + Backend
- Q-03. UI-автотесты Web (Playwright) — QA
- Q-04. Регресс на iOS/Android (TestFlight, Internal Track) — QA
- Q-05. Нагрузочное тестирование (10k RPS) — QA + DevOps
- Q-06. Тест локализаций — QA
- Q-07. Accessibility audit — QA
- Q-08. Content-policy edge cases (NSFW, медицина, политика) — QA + Content Policy

### Этап 7. Closed Beta — *To Do*
- BT-01. Отбор 5 000 каналов-участников — PM + Marketing
- BT-02. In-product onboarding для бета-юзеров — Designer + FE
- BT-03. Дашборд метрик беты — Data Analyst
- BT-04. Канал сбора фидбэка (форма + чат) — PM
- BT-05. Постбета-ретро — PM

### Этап 8. GA Launch + Marketing — *Backlog*
- L-01. Финальный rollout-план (1% → 10% → 50% → 100%) — PM + DevOps
- L-02. PR-материалы и блог-пост — Marketing
- L-03. Обновление Help Center — Marketing
- L-04. Видео-туториал для creators — Marketing
- L-05. Дашборд post-launch метрик — Data Analyst

---

## 6. Snapshot доски на середине жизненного цикла

Состояние Kanban-доски на текущий момент (зависимости учтены — задачи, у которых блокеры ещё в работе, не передвинуты дальше своего блокера).

| Backlog | To Do | In Progress | Code Review | QA | Blocked | Done |
|---|---|---|---|---|---|---|
| L-01 | BT-01 | B-01 (ML) | B-04 (Backend) | Q-02 | F-07 *(ждёт B-04)* | D-01…D-05 |
| L-02 | BT-02 | B-02 (ML) | F-01 (Web) | Q-03 | Q-05 *(ждёт прод-кластер от DevOps)* | DS-01…DS-06 |
| L-03 | BT-03 | B-05 (Backend) | F-03 (iOS) | Q-04 |  | A-01…A-05 |
| L-04 | BT-04 | B-08 (ML) | F-04 (Android) |  |  | B-03 (eval-сет v0) |
| L-05 | BT-05 | F-02 (Web Drawer) |  |  |  | B-06 (A/B-флаг) |
|  | Q-06 | F-05 (iOS Drawer) |  |  |  | Q-01 (тест-план) |
|  | Q-07 | F-06 (Android Drawer) |  |  |  |  |
|  | Q-08 | F-08 (Accessibility) |  |  |  |  |
|  |  | B-07 (метрики) |  |  |  |  |

### Ключевые зависимости

- **F-07 «Кнопка фидбэка»** заблокирована до мерджа `B-04 Inference API` — без живого endpoint некуда отправлять events.
- **Q-05 Нагрузочное** заблокировано — DevOps готовит прод-аналог GPU-кластера (ETA +3 дня).
- **BT-02 Onboarding** в `To Do`, не уйдёт в работу, пока не закроется хотя бы 80% задач этапов 4–5.
- **L-01 Rollout-план** в `Backlog` — двигается только после успешной Closed Beta.
- **B-08 Локализация** идёт параллельно с B-01/B-02, но ru/uz/hi требуют доп. eval-сетов от Data Analyst.

---

## 7. Краткие выводы PM

1. Команда в фазе максимальной нагрузки — параллельно идут ML, Backend, 3 frontend-платформы, QA.
2. Критический путь сейчас: **B-04 Inference API → F-07 → Q-02 → BT-02**. Сдвиг B-04 двигает весь Beta-релиз.
3. Главный риск — Q-05 (нагрузка): без GPU-кластера невозможно подтвердить SLA p95 < 800 мс.
4. PM фокусируется на unblock'е DevOps и ежедневном статусе по B-04 / F-02 / F-05 / F-06.

---

*Документ оформлен для сдачи в формате `.md`. При необходимости конвертируется в `.pdf` без потери структуры (все таблицы — стандартный GFM-markdown).*
