import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";
import { CodeTyper, type Token } from "@/lib/code-typer";
import "./landing.css";

// ── Types ────────────────────────────────────────────────────────────────────
type Lang = "ru" | "kk" | "en";
type Dict = Record<string, string>;
type I18n = Record<Lang, Dict>;

// ── Translations ──────────────────────────────────────────────────────────────
const i18n: I18n = {
  ru: {
    "nav.product": "Продукт", "nav.features": "Возможности", "nav.integration": "Интеграция",
    "nav.contact": "Контакты", "nav.contact_cta": "Связаться с нами",
    "hero.eyebrow": "Платформа для университетов",
    "hero.title.1": "Операционная система", "hero.title.2": "академического процесса",
    "hero.sub": "Lectern автоматически фиксирует посещаемость по лицу, выявляет студентов в зоне риска и эскалирует проблему до того, как она станет критичной.",
    "hero.cta.primary": "Связаться с нами", "hero.cta.secondary": "Узнать больше",
    "hero.trust": "Запущено в пилотных программах с университетами Казахстана",
    "hero.mock.workspace": "Рабочее пространство", "hero.mock.home": "Главная",
    "hero.mock.manual": "Ручная перекличка", "hero.mock.scan": "Открыть сканер",
    "hero.mock.classes": "ЗАНЯТИЙ СЕГОДНЯ", "hero.mock.groups": "ГРУППЫ",
    "hero.mock.students": "СТУДЕНТЫ", "hero.mock.attendance": "ПОСЕЩАЕМОСТЬ",
    "hero.mock.live": "В реальном времени",
    "stats.attendance": "на перекличку группы вместо 10", "stats.accuracy": "точность распознавания лиц",
    "stats.workload": "меньше ручной работы куратора", "stats.integration": "подключение к LMS вуза",
    "about.eyebrow": "О компании",
    "about.title": "Мы строим инфраструктуру для академических операций",
    "about.body": "Lectern — это команда, которая делает работу преподавателей и деканатов измеримой. Мы заменяем бумажные журналы, ручные сводки и разрозненные таблицы единым контуром, в котором посещаемость, успеваемость и реакция администрации видны в реальном времени.",
    "about.point.1.t": "Не очередной журнал", "about.point.1.b": "Это система раннего выявления академических рисков, а не электронная ведомость.",
    "about.point.2.t": "Сделано в Казахстане", "about.point.2.b": "Учитывает контекст вузов СНГ — Platonus, расписание по парам, отчётность для деканата.",
    "about.point.3.t": "Прозрачность действий", "about.point.3.b": "Каждое уведомление, оценка и эскалация фиксируются — у каждого решения есть автор и время.",
    "product.eyebrow": "Продукт", "product.title": "Что такое Lectern",
    "product.sub": "Единое рабочее пространство преподавателя и деканата: расписание, посещаемость, аналитика, рассылки и эскалация — без переключения между таблицами.",
    "product.for.title": "Для кого",
    "product.for.1.t": "Преподаватели", "product.for.1.b": "Открыть сканер за 3 секунды, увидеть состав группы, отметить отсутствующих, не открывая Excel.",
    "product.for.2.t": "Деканаты и кураторы", "product.for.2.b": "Видят студентов в зоне риска до экзаменационной сессии, а не после.",
    "product.for.3.t": "ИТ и администрация", "product.for.3.b": "Подключение к Platonus, контроль ролей, экспорт отчётов, история действий.",
    "product.modules.title": "4 модуля, один контур",
    "product.module.1.t": "ИИ-посещаемость", "product.module.1.b": "Распознавание лиц с детектом моргания. Один взгляд в камеру — отметка в журнале.",
    "product.module.2.t": "Аналитика и риски", "product.module.2.b": "Прогноз: кто может не быть допущен к сессии. Причина риска по каждому студенту.",
    "product.module.3.t": "Автоматическая рассылка", "product.module.3.b": "Студент получает одно уведомление при достижении порога — с проблемой, сроком и куратором.",
    "product.module.4.t": "Фиксация и эскалация", "product.module.4.b": "Если проблема не решена — информация уходит куратору и в деканат с историей действий.",
    "features.eyebrow": "Возможности", "features.title": "Каждый модуль — отдельный полноценный контур",
    "features.sub": "Не набор функций, а связанная система: посещаемость кормит аналитику, аналитика — рассылку, рассылка — эскалацию.",
    "f.attendance.title": "Посещаемость", "f.attendance.body": "Журнал, синхронизированный с расписанием. Отметка вручную или сканером лица.",
    "f.attendance.b1": "Ручная перекличка с поиском", "f.attendance.b2": "Импорт из расписания (API)", "f.attendance.b3": "Telegram-привязка студентов",
    "f.face.title": "Распознавание лиц", "f.face.body": "Сканер на базе Mediapipe Face Mesh. Детект моргания защищает от подмены фотографией.",
    "f.face.b1": "Liveness-проверка по морганию", "f.face.b2": "Без отдельного оборудования", "f.face.b3": "Локальная обработка кадра",
    "f.analytics.title": "Аналитика", "f.analytics.body": "Не просто проценты — общий риск студента. Видны причины: пропуски, оценки, оплата.",
    "f.analytics.b1": "Зона риска и прогноз допуска", "f.analytics.b2": "Динамика посещаемости и оценок", "f.analytics.b3": "Эффект рассылки до/после",
    "f.notify.title": "Уведомления", "f.notify.body": "Одно уведомление при достижении порога. В сообщении: проблема, причина, срок исправления.",
    "f.notify.b1": "Telegram, e-mail, in-app", "f.notify.b2": "Триггеры: посещаемость, балл, оплата", "f.notify.b3": "История доставки и реакций",
    "mock.analytics.title": "Аналитика", "mock.analytics.sub": "Состояние групп · текущая неделя",
    "mock.analytics.risk": "В зоне риска", "mock.analytics.attendance": "Средняя посещаемость", "mock.analytics.trend": "Тренд за 4 недели",
    "mock.notify.channel": "Telegram", "mock.notify.title": "Низкая посещаемость",
    "mock.notify.body": "Студент, посещаемость по курсу «Алгоритмы» — 58%. Срок: до конца недели. Куратор: куратор группы.",
    "mock.notify.cta": "Открыть журнал",
    "integration.eyebrow": "Интеграция", "integration.title": "Подключается к вашей платформе за один спринт",
    "integration.sub": "Lectern не заменяет Platonus, Univer или вашу LMS — он подключается к ним и забирает данные о расписании, группах и студентах через API.",
    "integration.platforms.title": "Готовые коннекторы",
    "integration.custom.title": "Свой формат?", "integration.custom.body": "REST API + webhook'и. SSO через SAML/OIDC. Команда внедрения настроит коннектор под ваш формат данных за 2–4 недели.",
    "integration.custom.cta": "Запросить интеграцию",
    "integration.code.title": "Пример: импорт расписания из Platonus", "integration.code.lang": "HTTP",
    "integration.step.1": "Преподаватель авторизуется через SSO вуза", "integration.step.2": "Lectern забирает расписание и группы из API", "integration.step.3": "Посещаемость возвращается обратно в LMS",
    "cta.eyebrow": "Начать", "cta.title": "Покажем Lectern на ваших группах",
    "cta.sub": "Развернём демо-стенд с вашим расписанием за 3 рабочих дня. Без обязательств и без интеграции на старте.",
    "cta.form.name": "ФИО", "cta.form.email": "Рабочая почта", "cta.form.org": "Университет / колледж",
    "cta.form.role": "Роль", "cta.form.role.dean": "Деканат", "cta.form.role.it": "ИТ-отдел", "cta.form.role.teacher": "Преподаватель", "cta.form.role.other": "Другое",
    "cta.form.message": "Что хотите автоматизировать в первую очередь?",
    "cta.form.submit": "Отправить заявку", "cta.form.note": "Ответим в течение одного рабочего дня. Данные не передаём третьим лицам.",
    "cta.form.success": "Заявка отправлена. Свяжемся с вами в течение одного рабочего дня.",
    "footer.tagline": "Операционная система академического процесса.",
    "footer.product": "Продукт", "footer.company": "Компания", "footer.legal": "Документы",
    "footer.rights": "© 2026 Lectern. Все права защищены.", "footer.status": "Все системы работают",
  },
  kk: {
    "nav.product": "Өнім", "nav.features": "Мүмкіндіктер", "nav.integration": "Интеграция",
    "nav.contact": "Байланыс", "nav.contact_cta": "Бізбен байланысу",
    "hero.eyebrow": "Университеттерге арналған платформа",
    "hero.title.1": "Академиялық үдерістің", "hero.title.2": "операциялық жүйесі",
    "hero.sub": "Lectern бет арқылы қатысуды автоматты түрде белгілейді, тәуекел аймағындағы студенттерді анықтайды және мәселе сыни деңгейге жеткенше эскалация жасайды.",
    "hero.cta.primary": "Бізбен байланысу", "hero.cta.secondary": "Толығырақ",
    "hero.trust": "Қазақстан университеттерімен пилоттық бағдарламаларда іске қосылды",
    "hero.mock.workspace": "Жұмыс кеңістігі", "hero.mock.home": "Басты бет",
    "hero.mock.manual": "Қол перекличкасы", "hero.mock.scan": "Сканерді ашу",
    "hero.mock.classes": "БҮГІНГІ САБАҚТАР", "hero.mock.groups": "ТОПТАР",
    "hero.mock.students": "СТУДЕНТТЕР", "hero.mock.attendance": "ҚАТЫСУ",
    "hero.mock.live": "Нақты уақытта",
    "stats.attendance": "топтың перекличкасына 10 емес", "stats.accuracy": "бет тану дәлдігі",
    "stats.workload": "кураторға аз қол жұмысы", "stats.integration": "ЖОО LMS-іне қосылу мерзімі",
    "about.eyebrow": "Компания туралы",
    "about.title": "Біз академиялық операциялар үшін инфрақұрылым құрамыз",
    "about.body": "Lectern — оқытушылар мен деканаттардың жұмысын өлшемді ететін команда.",
    "about.point.1.t": "Тағы бір журнал емес", "about.point.1.b": "Бұл — академиялық тәуекелдерді ерте анықтау жүйесі, электронды ведомость емес.",
    "about.point.2.t": "Қазақстанда жасалған", "about.point.2.b": "ТМД ЖОО контекстін ескереді — Platonus, пара бойынша кесте, деканатқа есептілік.",
    "about.point.3.t": "Әрекеттердің ашықтығы", "about.point.3.b": "Әрбір хабарлама, баға және эскалация тіркеледі — әрбір шешімнің авторы мен уақыты бар.",
    "product.eyebrow": "Өнім", "product.title": "Lectern дегеніміз не",
    "product.sub": "Оқытушы мен деканаттың бірыңғай жұмыс кеңістігі: кесте, қатысу, аналитика, хабарламалар және эскалация.",
    "product.for.title": "Кімге арналған",
    "product.for.1.t": "Оқытушылар", "product.for.1.b": "Сканерді 3 секундта ашу, топ құрамын көру, Excel ашпай-ақ жоқтарды белгілеу.",
    "product.for.2.t": "Деканаттар мен кураторлар", "product.for.2.b": "Тәуекел аймағындағы студенттерді емтихан сессиясынан кейін емес, оған дейін көреді.",
    "product.for.3.t": "АТ және әкімшілік", "product.for.3.b": "Platonus-қа қосылу, рөлдерді бақылау, есептерді экспорттау, әрекеттер тарихы.",
    "product.modules.title": "4 модуль, бір контур",
    "product.module.1.t": "ЖИ-қатысу", "product.module.1.b": "Көзді жұмуды анықтайтын бет тану. Камераға бір қарау — журналда белгі.",
    "product.module.2.t": "Аналитика мен тәуекелдер", "product.module.2.b": "Болжам: кім сессияға жіберілмеуі мүмкін.",
    "product.module.3.t": "Автоматты хабарлама", "product.module.3.b": "Студент шек асқанда бір хабарлама алады — мәселе, мерзім және куратор көрсетіледі.",
    "product.module.4.t": "Тіркеу мен эскалация", "product.module.4.b": "Мәселе шешілмесе — ақпарат куратор мен деканатқа әрекеттер тарихымен жіберіледі.",
    "features.eyebrow": "Мүмкіндіктер", "features.title": "Әр модуль — жеке толыққанды контур",
    "features.sub": "Функциялар жиынтығы емес, байланысқан жүйе.",
    "f.attendance.title": "Қатысу", "f.attendance.body": "Кестеге синхрондалған журнал.",
    "f.attendance.b1": "Іздеуі бар қол перекличкасы", "f.attendance.b2": "Кестеден импорт (API)", "f.attendance.b3": "Студенттердің Telegram-байланысы",
    "f.face.title": "Бет тану", "f.face.body": "Mediapipe Face Mesh негізіндегі сканер.",
    "f.face.b1": "Көзді жұму арқылы liveness-тексеру", "f.face.b2": "Бөлек жабдықсыз", "f.face.b3": "Кадрды жергілікті өңдеу",
    "f.analytics.title": "Аналитика", "f.analytics.body": "Жай ғана пайыз емес — студенттің жалпы тәуекелі.",
    "f.analytics.b1": "Тәуекел аймағы және жіберу болжамы", "f.analytics.b2": "Қатысу мен бағалар динамикасы", "f.analytics.b3": "Хабарлама әсері: дейін/кейін",
    "f.notify.title": "Хабарламалар", "f.notify.body": "Шек асқанда бір хабарлама.",
    "f.notify.b1": "Telegram, e-mail, in-app", "f.notify.b2": "Триггерлер: қатысу, балл, төлем", "f.notify.b3": "Жеткізу мен реакциялар тарихы",
    "mock.analytics.title": "Аналитика", "mock.analytics.sub": "Топтар жағдайы · ағымдағы апта",
    "mock.analytics.risk": "Тәуекел аймағында", "mock.analytics.attendance": "Орташа қатысу", "mock.analytics.trend": "4 апталық тренд",
    "mock.notify.channel": "Telegram", "mock.notify.title": "Төмен қатысу",
    "mock.notify.body": "Студент, «Алгоритмдер» курсы бойынша қатысу — 58%.", "mock.notify.cta": "Журналды ашу",
    "integration.eyebrow": "Интеграция", "integration.title": "Сіздің платформаңызға бір спринтте қосылады",
    "integration.sub": "Lectern Platonus, Univer немесе сіздің LMS-ыңызды ауыстырмайды — оларға қосылып деректерді алады.",
    "integration.platforms.title": "Дайын коннекторлар",
    "integration.custom.title": "Өз форматыңыз бар ма?", "integration.custom.body": "REST API + webhook-тар. SSO арқылы SAML/OIDC.",
    "integration.custom.cta": "Интеграцияны сұрау",
    "integration.code.title": "Мысал: Platonus-тан кестені импорттау", "integration.code.lang": "HTTP",
    "integration.step.1": "Оқытушы ЖОО SSO арқылы кіреді", "integration.step.2": "Lectern API-ден кесте мен топтарды алады", "integration.step.3": "Қатысу LMS-ке қайтарылады",
    "cta.eyebrow": "Бастау", "cta.title": "Lectern-ді сіздің топтарыңызда көрсетеміз",
    "cta.sub": "Сіздің кестеңізбен демо-стендті 3 жұмыс күнінде орналастырамыз.",
    "cta.form.name": "Аты-жөні", "cta.form.email": "Жұмыс поштасы", "cta.form.org": "Университет / колледж",
    "cta.form.role": "Рөл", "cta.form.role.dean": "Деканат", "cta.form.role.it": "АТ-бөлімі", "cta.form.role.teacher": "Оқытушы", "cta.form.role.other": "Басқа",
    "cta.form.message": "Алдымен нені автоматтандырғыңыз келеді?",
    "cta.form.submit": "Өтінім жіберу", "cta.form.note": "Бір жұмыс күні ішінде жауап береміз. Деректерді үшінші тұлғаларға бермейміз.",
    "cta.form.success": "Өтінім жіберілді. Бір жұмыс күні ішінде сізбен байланысамыз.",
    "footer.tagline": "Академиялық үдерістің операциялық жүйесі.",
    "footer.product": "Өнім", "footer.company": "Компания", "footer.legal": "Құжаттар",
    "footer.rights": "© 2026 Lectern. Барлық құқықтар қорғалған.", "footer.status": "Барлық жүйелер жұмыс істейді",
  },
  en: {
    "nav.product": "Product", "nav.features": "Features", "nav.integration": "Integration",
    "nav.contact": "Contact", "nav.contact_cta": "Contact us",
    "hero.eyebrow": "Platform for universities",
    "hero.title.1": "The operating system", "hero.title.2": "for academic operations",
    "hero.sub": "Lectern automatically marks attendance by face, surfaces students at risk, and escalates the problem before it becomes critical.",
    "hero.cta.primary": "Contact us", "hero.cta.secondary": "Learn more",
    "hero.trust": "Running in pilot programs with universities in Kazakhstan",
    "hero.mock.workspace": "Workspace", "hero.mock.home": "Home",
    "hero.mock.manual": "Manual roll-call", "hero.mock.scan": "Open scanner",
    "hero.mock.classes": "CLASSES TODAY", "hero.mock.groups": "GROUPS",
    "hero.mock.students": "STUDENTS", "hero.mock.attendance": "ATTENDANCE",
    "hero.mock.live": "Live",
    "stats.attendance": "for a group roll-call instead of 10", "stats.accuracy": "face-recognition accuracy",
    "stats.workload": "less manual work for tutors", "stats.integration": "to plug into your LMS",
    "about.eyebrow": "About us",
    "about.title": "We build the infrastructure for academic operations",
    "about.body": "Lectern is a team that makes the work of teachers and dean's offices measurable. We replace paper journals, manual reports and scattered spreadsheets with a single loop where attendance, grades and the administration's response are visible in real time.",
    "about.point.1.t": "Not another gradebook", "about.point.1.b": "An early-warning system for academic risk — not an electronic ledger.",
    "about.point.2.t": "Built in Kazakhstan", "about.point.2.b": "Designed for the reality of CIS universities — Platonus, period-based schedules, dean's office reporting.",
    "about.point.3.t": "Accountability by design", "about.point.3.b": "Every notification, grade and escalation is logged. Every decision has an author and a timestamp.",
    "product.eyebrow": "Product", "product.title": "What Lectern is",
    "product.sub": "A single workspace for teachers and dean's offices: schedule, attendance, analytics, notifications and escalation — without switching between spreadsheets.",
    "product.for.title": "Built for",
    "product.for.1.t": "Teachers", "product.for.1.b": "Open the scanner in 3 seconds, see the group, mark absentees — no Excel needed.",
    "product.for.2.t": "Dean's offices and tutors", "product.for.2.b": "See students at risk before the exam session, not after it.",
    "product.for.3.t": "IT and administration", "product.for.3.b": "Connect to Platonus, manage roles, export reports, audit every action.",
    "product.modules.title": "4 modules, one loop",
    "product.module.1.t": "AI attendance", "product.module.1.b": "Face recognition with blink detection. One look at the camera — a mark in the journal.",
    "product.module.2.t": "Analytics & risk", "product.module.2.b": "Predicts who may not be admitted to the session. Reason of risk for every student.",
    "product.module.3.t": "Automated notifications", "product.module.3.b": "The student gets a single message when a threshold is hit — with the issue, deadline and tutor.",
    "product.module.4.t": "Action log & escalation", "product.module.4.b": "If the problem is not resolved — it is escalated to the tutor and the dean's office, with full history.",
    "features.eyebrow": "Features", "features.title": "Each module is a full loop on its own",
    "features.sub": "Not a feature list — a connected system: attendance feeds analytics, analytics feeds notifications, notifications feed escalation.",
    "f.attendance.title": "Attendance", "f.attendance.body": "A journal synced with the schedule. Mark by hand or by face scanner.",
    "f.attendance.b1": "Manual roll-call with search", "f.attendance.b2": "Schedule import via API", "f.attendance.b3": "Telegram link for students",
    "f.face.title": "Face recognition", "f.face.body": "Scanner powered by Mediapipe Face Mesh. Blink detection prevents photo spoofing.",
    "f.face.b1": "Liveness check via blink", "f.face.b2": "No extra hardware", "f.face.b3": "Frames processed locally",
    "f.analytics.title": "Analytics", "f.analytics.body": "Not just percentages — the student's overall risk. The reason is visible: missed classes, grades, payment.",
    "f.analytics.b1": "Risk zone and admission forecast", "f.analytics.b2": "Attendance and grade trends", "f.analytics.b3": "Notification effect — before/after",
    "f.notify.title": "Notifications", "f.notify.body": "One message when a threshold is hit. It carries the issue, the cause, the deadline and the contact.",
    "f.notify.b1": "Telegram, e-mail, in-app", "f.notify.b2": "Triggers: attendance, grade, payment", "f.notify.b3": "Delivery and response history",
    "mock.analytics.title": "Analytics", "mock.analytics.sub": "Group health · this week",
    "mock.analytics.risk": "At risk", "mock.analytics.attendance": "Avg. attendance", "mock.analytics.trend": "4-week trend",
    "mock.notify.channel": "Telegram", "mock.notify.title": "Low attendance",
    "mock.notify.body": "Student, attendance for Algorithms is 58%. Deadline: end of the week. Tutor: group tutor.", "mock.notify.cta": "Open journal",
    "integration.eyebrow": "Integration", "integration.title": "Plugs into your platform in a single sprint",
    "integration.sub": "Lectern doesn't replace Platonus, Univer or your LMS — it connects to them and pulls schedule, groups and student data via API.",
    "integration.platforms.title": "Ready connectors",
    "integration.custom.title": "Different format?", "integration.custom.body": "REST API + webhooks. SSO via SAML/OIDC. Our onboarding team builds a connector for your data in 2–4 weeks.",
    "integration.custom.cta": "Request integration",
    "integration.code.title": "Example: importing schedule from Platonus", "integration.code.lang": "HTTP",
    "integration.step.1": "Teacher signs in with the university SSO", "integration.step.2": "Lectern pulls schedule and groups from the API", "integration.step.3": "Attendance is pushed back to the LMS",
    "cta.eyebrow": "Get started", "cta.title": "We'll show Lectern on your real groups",
    "cta.sub": "We'll spin up a demo with your schedule in 3 working days. No commitment, no integration up front.",
    "cta.form.name": "Full name", "cta.form.email": "Work email", "cta.form.org": "University / college",
    "cta.form.role": "Role", "cta.form.role.dean": "Dean's office", "cta.form.role.it": "IT", "cta.form.role.teacher": "Teacher", "cta.form.role.other": "Other",
    "cta.form.message": "What would you like to automate first?",
    "cta.form.submit": "Send request", "cta.form.note": "We reply within one working day. We never share your data.",
    "cta.form.success": "Request sent. We'll get back to you within one working day.",
    "footer.tagline": "The operating system for academic operations.",
    "footer.product": "Product", "footer.company": "Company", "footer.legal": "Legal",
    "footer.rights": "© 2026 Lectern. All rights reserved.", "footer.status": "All systems operational",
  },
};

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem("lectern.lang") as Lang;
    if (saved === "ru" || saved === "kk" || saved === "en") return saved;
    const nav = (navigator.language || "ru").slice(0, 2);
    if (nav === "kk" || nav === "kz") return "kk";
    if (nav === "en") return "en";
  } catch { /* noop */ }
  return "ru";
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useRevealOnScroll(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

function useCounterAnimation(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-count]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => {
        const target = el.getAttribute("data-count") ?? "0";
        const suffix = el.getAttribute("data-suffix") ?? "";
        el.textContent = target + suffix;
      });
      return;
    }
    const animate = (el: HTMLElement) => {
      if (el.dataset.counted === "1") return;
      el.dataset.counted = "1";
      const target = parseFloat(el.getAttribute("data-count") ?? "0");
      const suffix = el.getAttribute("data-suffix") ?? "";
      const dur = 1200;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = target * eased;
        el.textContent = (target % 1 === 0 ? Math.round(v) : v.toFixed(1)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animate(e.target as HTMLElement);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.3 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8h6" /><path d="M8 5v3" /><path d="M11 14l-2-3-2 3" /><path d="M11 14h-4" />
    <path d="M13 21l4-9 4 9" /><path d="M14.5 18h5" />
  </svg>
);
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const BurgerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

// ── CodeTyper data ────────────────────────────────────────────────────────────
const REQUEST_TOKENS: Token[] = [
  { text: "# Фоновая синхронизация расписания каждые 30 минут\n", cls: "cc" },
  { text: "POST", cls: "cm" }, { text: " ", cls: "" },
  { text: "/api/v1/connectors/platonus/sync\n", cls: "cp" },
  { text: "Authorization", cls: "ck" }, { text: ": Bearer ", cls: "" },
  { text: "eyJhbGciOi...\n", cls: "cs" },
  { text: "Content-Type", cls: "ck" }, { text: ": application/json\n\n", cls: "" },
  { text: "{\n", cls: "" },
  { text: '  "university_id"', cls: "ck" }, { text: ": ", cls: "" }, { text: '"demo"', cls: "cs" }, { text: ",\n", cls: "" },
  { text: '  "endpoint"', cls: "ck" }, { text: ": ", cls: "" }, { text: '"https://platonus.example.kz/rest"', cls: "cs" }, { text: ",\n", cls: "" },
  { text: '  "resources"', cls: "ck" }, { text: ": [", cls: "" },
  { text: '"schedule"', cls: "cs" }, { text: ", ", cls: "" },
  { text: '"groups"', cls: "cs" }, { text: ", ", cls: "" },
  { text: '"students"', cls: "cs" }, { text: "],\n", cls: "" },
  { text: '  "webhook"', cls: "ck" }, { text: ": ", cls: "" },
  { text: '"https://app.lectern.io/hooks/in"', cls: "cs" }, { text: "\n}", cls: "" },
];

const RESPONSE_TOKENS: Token[] = [
  { text: "\n\n", cls: "" },
  { text: "→ HTTP/1.1 200 OK\n", cls: "csuccess" },
  { text: "→ { synced: ", cls: "cc" },
  { text: "248", cls: "cn" },
  { text: " students, ", cls: "cc" },
  { text: "9", cls: "cn" },
  { text: " groups, ", cls: "cc" },
  { text: "62", cls: "cn" },
  { text: " classes }", cls: "cc" },
];

// ── Route ─────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lectern — операционная система академического процесса" },
      { name: "description", content: "ИИ-учёт посещаемости, аналитика рисков, автоматические уведомления — для университетов и колледжей." },
    ],
  }),
  component: LandingGate,
});

// ── Loader / hydration gate ─────────────────────────────────────────────────
// The landing resolves its language from localStorage, which only exists on the
// client. Rendering the page before that is known produced a visible flash
// (default Russian → the user's saved language). The gate shows a lightweight
// spinner (with scroll locked) until mounted, then renders the landing once in
// the correct language — no per-block skeletons, no flash.
function LandingLoader() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

function LandingGate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setReady(true);
    };

    // Wait for the display font before showing the hero — otherwise a cold/hard
    // refresh renders the fallback font first (narrower → "compressed" text) and
    // visibly reflows when Inter swaps in. Capped by a timeout so a slow or
    // failed font fetch never blocks the page.
    const fonts = document.fonts;
    if (fonts?.load) {
      Promise.race([
        Promise.all([fonts.load("400 1rem Inter"), fonts.load("600 1rem Inter")]),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]).finally(reveal);
    } else {
      reveal();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <LandingLoader />;
  return <LandingPage />;
}

// ── Component ─────────────────────────────────────────────────────────────────
function LandingPage() {
  const { theme, toggle } = useTheme();
  const [lang, setLang] = useState<Lang>(getInitialLang);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mockRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => i18n[lang]?.[key] ?? i18n.ru[key] ?? key;

  useRevealOnScroll(rootRef);
  useCounterAnimation(rootRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("lectern.lang", lang); } catch { /* noop */ }
  }, [lang]);

  useEffect(() => {
    const id = setTimeout(() => {
      mockRef.current?.classList.add("in");
    }, 100);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const close = () => setLangOpen(false);
    if (langOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [langOpen]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess(true);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="lp" ref={rootRef}>
      {/* ── HEADER ── */}
      <header data-lp-header data-scrolled={scrolled ? "true" : "false"}>
        <div className="lp-container lp-hdr">
          <a href="#top" className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="lp-logo-mark">L</span>
            <span>
              <div className="lp-logo-name">Lectern</div>
              <div className="lp-logo-sub">Academic operations</div>
            </span>
          </a>
          <nav className="lp-nav">
            {(["product", "features", "integration", "contact"] as const).map((id) => (
              <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(id); }}>
                {t(`nav.${id}`)}
              </a>
            ))}
          </nav>
          <div className="lp-hdr-right">
            <div className="lp-lang-wrap" onClick={(e) => e.stopPropagation()}>
              <button className="lp-lang-btn" onClick={() => setLangOpen((o) => !o)} aria-haspopup="true">
                <GlobeIcon />
                <span>{lang.toUpperCase()}</span>
              </button>
              <div className={`lp-lang-menu${langOpen ? " open" : ""}`}>
                <div className="lp-lang-menu-label">Language</div>
                <hr />
                {(["ru", "kk", "en"] as Lang[]).map((l) => (
                  <button key={l} className={`lp-lang-opt${lang === l ? " active" : ""}`} onClick={() => { setLang(l); setLangOpen(false); }}>
                    <span className="code">{l === "kk" ? "KZ" : l.toUpperCase()}</span>
                    <span>{l === "ru" ? "Русский" : l === "kk" ? "Қазақша" : "English"}</span>
                    <svg className="check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </button>
                ))}
              </div>
            </div>
            <button className="lp-icon-btn" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <a href="#contact" className="lp-btn lp-btn-primary" onClick={(e) => { e.preventDefault(); scrollTo("contact"); }}>
              {t("nav.contact_cta")}
            </a>
            <button className="lp-icon-btn lp-burger" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu">
              <BurgerIcon />
            </button>
          </div>
        </div>
        <div className={`lp-mobile-nav${mobileOpen ? " open" : ""}`}>
          {(["product", "features", "integration", "contact"] as const).map((id) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(id); }}>{t(`nav.${id}`)}</a>
          ))}
        </div>
      </header>

      {/* ── HERO ── */}
      <main id="top">
        <section className="hero">
          <div className="lp-container hero-inner">
            <span className="eyebrow"><span className="dot" /><span>{t("hero.eyebrow")}</span></span>
            <h1>
              <span>{t("hero.title.1")}</span><br />
              <span className="accent">{t("hero.title.2")}</span>
            </h1>
            <p className="lead">{t("hero.sub")}</p>
            <div className="hero-cta">
              <a href="#contact" className="lp-btn lp-btn-primary lp-btn-lg" onClick={(e) => { e.preventDefault(); scrollTo("contact"); }}>
                {t("hero.cta.primary")} <ArrowIcon />
              </a>
              <a href="#product" className="lp-btn lp-btn-ghost lp-btn-lg" onClick={(e) => { e.preventDefault(); scrollTo("product"); }}>
                {t("hero.cta.secondary")}
              </a>
            </div>
            <div className="hero-trust">
              <span>{t("hero.trust")}</span>
            </div>
          </div>

          <div className="lp-container">
            <div className="hero-mock" ref={mockRef}>
              <div className="mock-bar">
                <div className="dots"><span /><span /><span /></div>
                <div className="url">app.lectern.io / workspace</div>
              </div>
              <div className="mock-app">
                <aside className="mock-side">
                  <div className="brand">
                    <div className="mark">L</div>
                    <div><div className="nm">Lectern</div><div className="sb">Academic operations</div></div>
                  </div>
                  <div className="mock-label">{t("hero.mock.workspace")}</div>
                  <div className="mock-item active">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                    <span>{t("hero.mock.home")}</span>
                  </div>
                  <div className="mock-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    <span>Расписание</span>
                  </div>
                  <div className="mock-label">Посещаемость</div>
                  <div className="mock-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                    <span>{t("hero.mock.manual")}</span>
                  </div>
                  <div className="mock-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9 9h.01" /><path d="M15 9h.01" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /></svg>
                    <span>Сканирование лица</span>
                    <span className="ai-badge">AI</span>
                  </div>
                </aside>
                <div className="mock-main">
                  <div className="mock-crumbs"><span>{t("hero.mock.workspace")}</span> &nbsp;›&nbsp; <span>{t("hero.mock.home")}</span></div>
                  <div className="mock-h">
                    <div><h3>{t("hero.mock.home")}</h3><div className="sub">— занятий · — групп · — студентов</div></div>
                    <div className="actions">
                      <button className="mock-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                        <span>{t("hero.mock.manual")}</span>
                      </button>
                      <button className="mock-btn primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /></svg>
                        <span>{t("hero.mock.scan")}</span>
                      </button>
                    </div>
                  </div>
                  <div className="mock-stats">
                    {[
                      { lbl: t("hero.mock.classes"), count: "6", hint: "4 прошло · 2 предстоит" },
                      { lbl: t("hero.mock.groups"), count: "9", hint: "— студентов всего" },
                      { lbl: t("hero.mock.students"), count: "248", hint: "— с фото" },
                      { lbl: t("hero.mock.attendance"), count: "87", suffix: "%", hint: t("hero.mock.live"), live: true },
                    ].map(({ lbl, count, suffix, hint, live }) => (
                      <div key={lbl} className="mock-stat">
                        <div className="lbl"><span>{lbl}</span></div>
                        <div className="num" data-count={count} data-suffix={suffix ?? ""}>{count}{suffix ?? ""}</div>
                        <div className="hint">{live ? <span className="mock-live">{hint}</span> : hint}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mock-row">
                    <div className="mock-card">
                      <h4>Расписание на сегодня</h4>
                      <div className="sub">Актуальный список занятий из API расписания</div>
                      <div className="attn-bars">
                        {[60, 80, 45, 92, 70, 55, 88, 30].map((h, i) => (
                          <div key={i} className="b" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="mock-card">
                      <h4>Зона риска</h4>
                      <div className="sub">— студентов нуждаются в реакции</div>
                      <div className="mock-empty">Демо-данные · уведомления отправлены</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ABOUT ── */}
        <section id="company">
          <div className="lp-container">
            <div className="about-grid">
              <div className="about-body" data-reveal>
                <span className="eyebrow"><span className="dot" /><span>{t("about.eyebrow")}</span></span>
                <h2 style={{ fontSize: "clamp(28px, 3.6vw, 40px)", margin: "16px 0 20px" }}>{t("about.title")}</h2>
                <p>{t("about.body")}</p>
              </div>
              <div className="about-points">
                {([
                  { key: "1", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 L2 7 l10 5 10-5z"/><path d="M2 17 l10 5 10-5"/><path d="M2 12 l10 5 10-5"/></svg> },
                  { key: "2", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2 a15 15 0 0 1 0 20 a15 15 0 0 1 0 -20z"/></svg> },
                  { key: "3", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12 l2 2 4-4"/><path d="M21 12c0 5-3.5 7.5-8.5 9-5-1.5-8.5-4-8.5-9V5l8.5-3 8.5 3z"/></svg> },
                ] as { key: string; icon: React.ReactNode }[]).map(({ key, icon }, i) => (
                  <div key={key} className="point" data-reveal data-reveal-delay={String(i + 1)}>
                    <div className="ico">{icon}</div>
                    <div><h4>{t(`about.point.${key}.t`)}</h4><p>{t(`about.point.${key}.b`)}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="stats-strip">
              {[
                { val: "<2 мин", lbl: t("stats.attendance") },
                { val: "до 99%", lbl: t("stats.accuracy") },
                { val: "4×", lbl: t("stats.workload") },
                { val: "1 спринт", lbl: t("stats.integration") },
              ].map(({ val, lbl }) => (
                <div key={lbl} className="cell" data-reveal>
                  <div className="snum"><span className="accent">{val}</span></div>
                  <div className="slbl">{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCT ── */}
        <section id="product" style={{ background: "var(--lp-surface)", borderTop: "1px solid var(--lp-border)", borderBottom: "1px solid var(--lp-border)" }}>
          <div className="lp-container">
            <div className="section-head" data-reveal>
              <span className="eyebrow"><span className="dot" /><span>{t("product.eyebrow")}</span></span>
              <h2>{t("product.title")}</h2>
              <p>{t("product.sub")}</p>
            </div>
            <h3 style={{ textAlign: "center", fontSize: 14, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--lp-muted-fg)", marginBottom: 16 }}>
              {t("product.for.title")}
            </h3>
            <div className="for-grid">
              {([
                { key: "1", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
                { key: "2", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg> },
                { key: "3", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l3 3 3-3"/></svg> },
              ] as { key: string; icon: React.ReactNode }[]).map(({ key, icon }, i) => (
                <div key={key} className="for-card" data-reveal data-reveal-delay={String(i + 1)}>
                  <div className="ico">{icon}</div>
                  <h4>{t(`product.for.${key}.t`)}</h4>
                  <p>{t(`product.for.${key}.b`)}</p>
                </div>
              ))}
            </div>
            <div className="modules-block" data-reveal>
              <div className="mhead">
                <span className="mnum">04 / 04</span>
                <h3>{t("product.modules.title")}</h3>
              </div>
              <div className="modules-grid">
                {([
                  { step: "01 · INPUT", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M8 16s1.5 2 4 2 4-2 4-2"/></svg> },
                  { step: "02 · DETECT", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
                  { step: "03 · NOTIFY", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg> },
                  { step: "04 · ESCALATE", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 5-3.5 7.5-8.5 9-5-1.5-8.5-4-8.5-9V5l8.5-3 8.5 3z"/><path d="M9 12 l2 2 4-4"/></svg> },
                ] as { step: string; icon: React.ReactNode }[]).map(({ step, icon }, i) => (
                  <div key={step} className="module">
                    {icon}
                    <div className="mstep">{step}</div>
                    <h4>{t(`product.module.${i + 1}.t`)}</h4>
                    <p>{t(`product.module.${i + 1}.b`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features">
          <div className="lp-container">
            <div className="section-head" data-reveal>
              <span className="eyebrow"><span className="dot" /><span>{t("features.eyebrow")}</span></span>
              <h2>{t("features.title")}</h2>
              <p>{t("features.sub")}</p>
            </div>

            {/* Attendance */}
            <div className="feature" data-reveal>
              <div className="feature-text">
                <div className="fnum">01 · ATTENDANCE</div>
                <h3>{t("f.attendance.title")}</h3>
                <p>{t("f.attendance.body")}</p>
                <ul>
                  {["b1", "b2", "b3"].map((b) => (
                    <li key={b}><CheckIcon /><span>{t(`f.attendance.${b}`)}</span></li>
                  ))}
                </ul>
              </div>
              <div className="feature-vis vis-attendance">
                <div className="vh">
                  <div><h5>Курс «Алгоритмы»</h5><div className="sub">LCTN-DEMO · пн 08:00 · 18 студентов</div></div>
                  <span className="mock-live"><span>Live</span></span>
                </div>
                <div className="fstats">
                  {[{ cls: "pres", lbl: "Присутствует", v: "14" }, { cls: "abs", lbl: "Отсутствует", v: "2" }, { cls: "", lbl: "Не отмечено", v: "2" }, { cls: "", lbl: "% посещ.", v: "88" }].map(({ cls, lbl, v }) => (
                    <div key={lbl} className={`fstat${cls ? ` ${cls}` : ""}`}><div className="flbl">{lbl}</div><div className="fv">{v}</div></div>
                  ))}
                </div>
                <div className="roster">
                  {[
                    { ix: 1, av: "A1", nm: "Студент A1", meta: "08:01", absent: false },
                    { ix: 2, av: "B2", nm: "Студент B2", meta: "08:02", absent: false },
                    { ix: 3, av: "C3", nm: "Студент C3", meta: "отсутствует", absent: true },
                    { ix: 4, av: "D4", nm: "Студент D4", meta: "08:03", absent: false },
                  ].map(({ ix, av, nm, meta, absent }) => (
                    <div key={ix} className={`row${absent ? " absent" : ""}`}>
                      <span className="ix">{ix}</span>
                      <span className="av">{av}</span>
                      <span className="nm">{nm}</span>
                      <span className="meta">{meta}</span>
                      <span className="rcheck">
                        {absent
                          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Face */}
            <div className="feature reverse" data-reveal>
              <div className="feature-text">
                <div className="fnum">02 · FACE</div>
                <h3>{t("f.face.title")}</h3>
                <p>{t("f.face.body")}</p>
                <ul>
                  {["b1", "b2", "b3"].map((b) => (
                    <li key={b}><CheckIcon /><span>{t(`f.face.${b}`)}</span></li>
                  ))}
                </ul>
              </div>
              <div className="feature-vis vis-face">
                <div className="cam">
                  <div className="corners" />
                  <div className="live-badge">REC · Liveness</div>
                  <div className="face" />
                </div>
                <div className="finfo">
                  <div className="detected">
                    <div className="dnm">Студент A1</div>
                    <div className="did">LCTN-DEMO · ID 0001</div>
                    <div className="conf"><div className="bar" /></div>
                    <div className="dlbls"><span>Match</span><span>96%</span></div>
                  </div>
                  <div className="fchecks">
                    {[
                      { ok: true, label: "Лицо обнаружено" },
                      { ok: true, label: "Моргание подтверждено" },
                      { ok: true, label: "Совпадение в группе" },
                      { ok: false, label: "Запись в журнал…" },
                    ].map(({ ok, label }) => (
                      <div key={label} className={`fc${ok ? " ok" : ""}`}>
                        {ok
                          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        }
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="feature" data-reveal>
              <div className="feature-text">
                <div className="fnum">03 · ANALYTICS</div>
                <h3>{t("f.analytics.title")}</h3>
                <p>{t("f.analytics.body")}</p>
                <ul>
                  {["b1", "b2", "b3"].map((b) => (
                    <li key={b}><CheckIcon /><span>{t(`f.analytics.${b}`)}</span></li>
                  ))}
                </ul>
              </div>
              <div className="feature-vis vis-analytics">
                <div className="avh">
                  <div><h5>{t("mock.analytics.title")}</h5><div className="asub">{t("mock.analytics.sub")}</div></div>
                </div>
                <div className="kpis">
                  {[
                    { cls: "risk", lbl: t("mock.analytics.risk"), v: "7" },
                    { cls: "", lbl: t("mock.analytics.attendance"), v: "87%" },
                    { cls: "", lbl: t("mock.analytics.trend"), v: "+4.2" },
                  ].map(({ cls, lbl, v }) => (
                    <div key={lbl} className={`kpi${cls ? ` ${cls}` : ""}`}><div className="klbl">{lbl}</div><div className="kv">{v}</div></div>
                  ))}
                </div>
                <div className="chart">
                  <div className="cgrid" />
                  <svg viewBox="0 0 400 100" preserveAspectRatio="none">
                    <path className="area" d="M0,70 L40,55 L80,60 L120,40 L160,45 L200,28 L240,32 L280,18 L320,22 L360,15 L400,10 L400,100 L0,100 Z" />
                    <path className="line" d="M0,70 L40,55 L80,60 L120,40 L160,45 L200,28 L240,32 L280,18 L320,22 L360,15 L400,10" />
                    <circle className="cdot" cx="400" cy="10" r="3" />
                    <circle className="cdot" cx="280" cy="18" r="3" />
                  </svg>
                </div>
                <div className="legend">
                  <div className="lit"><span className="sw" style={{ background: "var(--lp-primary)" }} />Посещаемость</div>
                  <div className="lit"><span className="sw" style={{ background: "var(--lp-warning)" }} />В зоне риска</div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="feature reverse" data-reveal>
              <div className="feature-text">
                <div className="fnum">04 · NOTIFY</div>
                <h3>{t("f.notify.title")}</h3>
                <p>{t("f.notify.body")}</p>
                <ul>
                  {["b1", "b2", "b3"].map((b) => (
                    <li key={b}><CheckIcon /><span>{t(`f.notify.${b}`)}</span></li>
                  ))}
                </ul>
              </div>
              <div className="feature-vis vis-notify">
                <div className="ntoast">
                  <div className="nico tg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>
                  </div>
                  <div>
                    <div className="nhead"><span className="nch">{t("mock.notify.channel")}</span><span className="nt">сейчас</span></div>
                    <h6>{t("mock.notify.title")}</h6>
                    <p>{t("mock.notify.body")}</p>
                    <div className="nactions">
                      <button className="na primary">{t("mock.notify.cta")}</button>
                      <button className="na">Связаться с куратором</button>
                    </div>
                  </div>
                </div>
                <div className="ntoast">
                  <div className="nico warn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div>
                    <div className="nhead"><span className="nch">Эскалация</span><span className="nt">через 48ч без реакции</span></div>
                    <h6>Передано куратору группы</h6>
                    <p>Куратор получил 3 кейса по группе LCTN-DEMO. Деканат уведомлён в копии.</p>
                  </div>
                </div>
                <div className="meta-row"><span className="mdot" />Доставлено 14 · Прочитано 11 · Реакция в течение 24ч 9</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── INTEGRATION ── */}
        <section id="integration" style={{ background: "var(--lp-surface)", borderTop: "1px solid var(--lp-border)", borderBottom: "1px solid var(--lp-border)" }}>
          <div className="lp-container">
            <div className="section-head" data-reveal>
              <span className="eyebrow"><span className="dot" /><span>{t("integration.eyebrow")}</span></span>
              <h2>{t("integration.title")}</h2>
              <p>{t("integration.sub")}</p>
            </div>
            <div className="integ-grid">
              <div className="integ-card" data-reveal>
                <h3>{t("integration.platforms.title")}</h3>
                <div className="platforms">
                  {[
                    { letter: "P", name: "Platonus", bg: "linear-gradient(135deg, #4F46E5, #2A6FDB)" },
                    { letter: "U", name: "Univer", bg: "linear-gradient(135deg, #0EA5E9, #2A6FDB)" },
                    { letter: "M", name: "Moodle", bg: "linear-gradient(135deg, #16A34A, #059669)" },
                    { letter: "1C", name: "1C: Университет", bg: "linear-gradient(135deg, #DC2626, #EA580C)" },
                  ].map(({ letter, name, bg }) => (
                    <div key={name} className="platform">
                      <div className="plg" style={{ background: bg }}>{letter}</div>
                      <div><div className="pnm">{name}</div><div className="pst">Активный коннектор</div></div>
                    </div>
                  ))}
                </div>
                <div className="isteps">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="istep"><div className="in">{n}</div><div className="it">{t(`integration.step.${n}`)}</div></div>
                  ))}
                </div>
              </div>
              <div data-reveal data-reveal-delay="2">
                <CodeTyper
                  titleLabel={t("integration.code.title")}
                  langLabel={t("integration.code.lang")}
                  requestTokens={REQUEST_TOKENS}
                  responseTokens={RESPONSE_TOKENS}
                />
                <div className="integ-card" style={{ marginTop: 16 }}>
                  <h3 style={{ marginBottom: 8 }}>{t("integration.custom.title")}</h3>
                  <p style={{ color: "var(--lp-muted-fg)", fontSize: 14, lineHeight: 1.6 }}>{t("integration.custom.body")}</p>
                  <a href="#contact" className="lp-btn lp-btn-ghost" style={{ marginTop: 16 }} onClick={(e) => { e.preventDefault(); scrollTo("contact"); }}>
                    {t("integration.custom.cta")}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="contact" className="cta-section">
          <div className="lp-container">
            <div className="cta-grid">
              <div data-reveal>
                <span className="eyebrow"><span className="dot" /><span>{t("cta.eyebrow")}</span></span>
                <h2>{t("cta.title")}</h2>
                <p className="lead">{t("cta.sub")}</p>
                <div style={{ marginTop: 32, display: "grid", gap: 14 }}>
                  {[
                    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, lbl: "E-mail", val: "team@lectern.io" },
                    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>, lbl: "Telegram", val: "@lectern_sales" },
                    { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, lbl: "Алматы", val: "+7 727 311 22 33" },
                  ].map(({ icon, lbl, val }) => (
                    <div key={lbl} className="contact-row">
                      <div className="contact-icon">{icon}</div>
                      <div><div className="contact-lbl">{lbl}</div><div className="contact-val">{val}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <form className="cta-form" onSubmit={handleFormSubmit} data-reveal data-reveal-delay="2">
                <div className="lp-field">
                  <label>{t("cta.form.name")}</label>
                  <input type="text" required placeholder={t("cta.form.name")} />
                </div>
                <div className="lp-field-row">
                  <div className="lp-field">
                    <label>{t("cta.form.email")}</label>
                    <input type="email" required placeholder={t("cta.form.email")} />
                  </div>
                  <div className="lp-field">
                    <label>{t("cta.form.org")}</label>
                    <input type="text" placeholder={t("cta.form.org")} />
                  </div>
                </div>
                <div className="lp-field">
                  <label>{t("cta.form.role")}</label>
                  <select>
                    <option>{t("cta.form.role.dean")}</option>
                    <option>{t("cta.form.role.it")}</option>
                    <option>{t("cta.form.role.teacher")}</option>
                    <option>{t("cta.form.role.other")}</option>
                  </select>
                </div>
                <div className="lp-field">
                  <label>{t("cta.form.message")}</label>
                  <textarea placeholder={t("cta.form.message")} />
                </div>
                <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg" style={{ width: "100%" }}>
                  {t("cta.form.submit")}
                </button>
                <div className={`form-note${formSuccess ? " success" : ""}`}>
                  {formSuccess ? t("cta.form.success") : t("cta.form.note")}
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer>
        <div className="lp-container">
          <div className="foot-top">
            <div className="fbrand">
              <a href="#top" className="lp-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                <span className="lp-logo-mark">L</span>
                <span><div className="lp-logo-name">Lectern</div><div className="lp-logo-sub">Academic operations</div></span>
              </a>
              <p>{t("footer.tagline")}</p>
            </div>
            <div className="foot-col">
              <h5>{t("footer.product")}</h5>
              {[
                { href: "features", label: t("f.attendance.title") },
                { href: "features", label: t("f.face.title") },
                { href: "features", label: t("f.analytics.title") },
                { href: "features", label: t("f.notify.title") },
              ].map(({ href, label }) => (
                <a key={label} href={`#${href}`} onClick={(e) => { e.preventDefault(); scrollTo(href); }}>{label}</a>
              ))}
            </div>
            <div className="foot-col">
              <h5>{t("footer.company")}</h5>
              <a href="#company" onClick={(e) => { e.preventDefault(); scrollTo("company"); }}>{t("about.eyebrow")}</a>
              <a href="#integration" onClick={(e) => { e.preventDefault(); scrollTo("integration"); }}>{t("nav.integration")}</a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); scrollTo("contact"); }}>{t("nav.contact")}</a>
            </div>
            <div className="foot-col">
              <h5>{t("footer.legal")}</h5>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">DPA</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>{t("footer.rights")}</span>
            <span className="fstatus">{t("footer.status")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
