import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import "./landing.css";
import "./docs.css";

// ── Lang ─────────────────────────────────────────────────────────────────────
type Lang = "ru" | "en";

const copy: Record<Lang, Record<string, string>> = {
  ru: {
    "docs.badge": "Документация",
    "docs.cta": "Связаться",
    "nav.intro": "Введение",
    "nav.auth": "Аутентификация",
    "nav.incoming": "Входящие webhooks",
    "nav.sync": "Синхронизация студента",
    "nav.bulk": "Массовый импорт",
    "nav.subs": "Подписки",
    "nav.events": "Исходящие события",
    "nav.event-attendance": "attendance.marked",
    "nav.errors": "Ошибки",
    "intro.eyebrow": "Введение",
    "intro.title": "Lectern Webhook API",
    "intro.body": "Lectern предоставляет REST API для двусторонней интеграции: внешние платформы могут синхронизировать студентов и группы, а Lectern отправляет события об отметках посещаемости в реальном времени.",
    "intro.base": "Base URL",
    "intro.format": "Все запросы и ответы — JSON. Для входящих webhook используйте заголовок X-Webhook-Secret. Для исходящих — проверяйте подпись X-Lectern-Signature.",
    "auth.eyebrow": "Аутентификация",
    "auth.title": "Аутентификация",
    "auth.incoming.title": "Входящие запросы",
    "auth.incoming.body": "Каждый входящий webhook должен содержать заголовок X-Webhook-Secret со значением, совпадающим с WEBHOOK_SECRET на стороне Lectern. При несовпадении — 403.",
    "auth.outgoing.title": "Исходящие события",
    "auth.outgoing.body": "Каждый исходящий POST-запрос от Lectern содержит заголовок X-Lectern-Signature: sha256=<hex>. Подпись вычисляется как HMAC-SHA256 от тела запроса с вашим секретом подписки.",
    "auth.verify": "Проверка подписи (Python)",
    "incoming.eyebrow": "Входящие webhooks",
    "incoming.title": "Входящие webhooks",
    "incoming.body": "Внешние платформы вызывают эти эндпоинты чтобы создавать или обновлять данные в Lectern.",
    "sync.title": "Синхронизация студента",
    "sync.body": "Создаёт или обновляет запись студента по platonus_id. При совпадении — обновляет поля. Если group_name указан и группа найдена — студент добавляется в неё.",
    "sync.params": "Параметры тела запроса",
    "sync.auth-note": "Требует заголовок X-Webhook-Secret.",
    "bulk.title": "Массовый импорт",
    "bulk.body": "Принимает массив студентов и обрабатывает каждого через update_or_create. Ошибочные записи пропускаются и возвращаются в поле errors.",
    "bulk.params": "Параметры тела запроса",
    "subs.title": "Подписки",
    "subs.body": "Управление подписками на исходящие события. JWT-авторизация (учётные данные преподавателя).",
    "subs.create.title": "Создать подписку",
    "subs.create.body": "Регистрирует внешнюю платформу как подписчика. Секрет возвращается один раз — сохраните его.",
    "subs.list.title": "Список подписок",
    "subs.update.title": "Обновить подписку",
    "subs.delete.title": "Удалить подписку",
    "events.eyebrow": "Исходящие события",
    "events.title": "Исходящие события",
    "events.body": "Lectern отправляет POST на callback_url подписчика когда происходит событие. Доставка асинхронная (Celery), до 3 попыток с интервалом 60 секунд.",
    "event-attendance.title": "attendance.marked",
    "event-attendance.body": "Отправляется после того как преподаватель завершает перекличку занятия. present и absent содержат id и platonus_id каждого студента.",
    "event-attendance.verify": "Для верификации подписи используйте HMAC-SHA256 с вашим секретом подписки.",
    "errors.eyebrow": "Ошибки",
    "errors.title": "Ошибки",
    "errors.body": "Все ошибки возвращают JSON с полем detail.",
    "param.platonus_id": "ID студента во внешней системе",
    "param.first_name": "Имя",
    "param.last_name": "Фамилия",
    "param.email": "Email",
    "param.age": "Возраст",
    "param.phone": "Телефон",
    "param.group_name": "Название группы для записи студента",
    "param.students": "Массив объектов студентов (те же поля что у single sync)",
    "param.platform_name": "Название платформы, напр. «Platonus»",
    "param.callback_url.create": "URL куда Lectern отправит события",
    "param.events": "Список событий, напр. [\"attendance.marked\"]",
    "param.callback_url.update": "Новый URL",
    "param.events.update": "Новый список событий",
    "param.is_active": "Активировать или деактивировать",
    "error.400": "Ошибка валидации — отсутствуют обязательные поля",
    "error.403": "Неверный или отсутствующий X-Webhook-Secret",
    "error.404": "Ресурс не найден",
    "error.500": "Внутренняя ошибка сервера",
    "error.format.label": "Формат ошибки",
  },
  en: {
    "docs.badge": "Docs",
    "docs.cta": "Contact",
    "nav.intro": "Introduction",
    "nav.auth": "Authentication",
    "nav.incoming": "Incoming webhooks",
    "nav.sync": "Student sync",
    "nav.bulk": "Bulk import",
    "nav.subs": "Subscriptions",
    "nav.events": "Outgoing events",
    "nav.event-attendance": "attendance.marked",
    "nav.errors": "Errors",
    "intro.eyebrow": "Introduction",
    "intro.title": "Lectern Webhook API",
    "intro.body": "Lectern provides a REST API for two-way integration: external platforms can sync students and groups, and Lectern pushes attendance events in real time.",
    "intro.base": "Base URL",
    "intro.format": "All requests and responses use JSON. For incoming webhooks use the X-Webhook-Secret header. For outgoing — verify the X-Lectern-Signature.",
    "auth.eyebrow": "Authentication",
    "auth.title": "Authentication",
    "auth.incoming.title": "Incoming requests",
    "auth.incoming.body": "Every incoming webhook must include the X-Webhook-Secret header matching the WEBHOOK_SECRET configured in Lectern. Missing or wrong secret returns 403.",
    "auth.outgoing.title": "Outgoing events",
    "auth.outgoing.body": "Every outgoing POST from Lectern includes X-Lectern-Signature: sha256=<hex>. The signature is HMAC-SHA256 of the raw request body using your subscription secret.",
    "auth.verify": "Signature verification (Python)",
    "incoming.eyebrow": "Incoming webhooks",
    "incoming.title": "Incoming webhooks",
    "incoming.body": "External platforms call these endpoints to create or update data inside Lectern.",
    "sync.title": "Student sync",
    "sync.body": "Creates or updates a student record by platonus_id. If group_name is provided and the group exists, the student is added to it.",
    "sync.params": "Request body parameters",
    "sync.auth-note": "Requires X-Webhook-Secret header.",
    "bulk.title": "Bulk import",
    "bulk.body": "Accepts an array of students and processes each via update_or_create. Invalid entries are skipped and returned in the errors field.",
    "bulk.params": "Request body parameters",
    "subs.title": "Subscriptions",
    "subs.body": "Manage subscriptions to outgoing events. Requires JWT authentication (teacher credentials).",
    "subs.create.title": "Create subscription",
    "subs.create.body": "Registers an external platform as a subscriber. The secret is returned once — store it securely.",
    "subs.list.title": "List subscriptions",
    "subs.update.title": "Update subscription",
    "subs.delete.title": "Delete subscription",
    "events.eyebrow": "Outgoing events",
    "events.title": "Outgoing events",
    "events.body": "Lectern POSTs to the subscriber's callback_url when an event fires. Delivery is async (Celery), up to 3 retries at 60s intervals.",
    "event-attendance.title": "attendance.marked",
    "event-attendance.body": "Fired after a teacher completes roll call for a lesson. present and absent each contain the student's internal id and platonus_id.",
    "event-attendance.verify": "Verify the signature with HMAC-SHA256 using your subscription secret.",
    "errors.eyebrow": "Errors",
    "errors.title": "Errors",
    "errors.body": "All errors return JSON with a detail field.",
    "param.platonus_id": "Student ID in the external system",
    "param.first_name": "First name",
    "param.last_name": "Last name",
    "param.email": "Email",
    "param.age": "Age",
    "param.phone": "Phone",
    "param.group_name": "Group name to enroll the student in",
    "param.students": "Array of student objects (same fields as single sync)",
    "param.platform_name": "Platform name, e.g. «Platonus»",
    "param.callback_url.create": "URL where Lectern will POST events",
    "param.events": "List of events, e.g. [\"attendance.marked\"]",
    "param.callback_url.update": "New URL",
    "param.events.update": "New event list",
    "param.is_active": "Activate or deactivate",
    "error.400": "Validation error — missing required fields",
    "error.403": "Invalid or missing X-Webhook-Secret",
    "error.404": "Resource not found",
    "error.500": "Internal server error",
    "error.format.label": "Error format",
  },
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const WarnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function MethodBadge({ method }: { method: "POST" | "GET" | "PATCH" | "DELETE" }) {
  return <span className={`method-badge ${method.toLowerCase()}`}>{method}</span>;
}

function ParamRow({ name, type, required, desc }: { name: string; type: string; required: boolean; desc: string }) {
  return (
    <tr>
      <td><code className="param-name">{name}</code></td>
      <td><code className="param-type">{type}</code></td>
      <td><span className={`param-req${required ? " required" : ""}`}>{required ? "required" : "optional"}</span></td>
      <td className="param-desc">{desc}</td>
    </tr>
  );
}

function StaticCode({ label, lang, children }: { label: string; lang: string; children: React.ReactNode }) {
  return (
    <div className="docs-static-code">
      <div className="scode-head"><span>{label}</span><span className="scode-lang">{lang}</span></div>
      <pre>{children}</pre>
    </div>
  );
}

// ── Scroll spy ────────────────────────────────────────────────────────────────
const SECTIONS = ["intro", "auth", "incoming", "sync", "bulk", "subs", "events", "event-attendance", "errors"] as const;
type SectionId = typeof SECTIONS[number];

function useScrollSpy(): SectionId {
  const [active, setActive] = useState<SectionId>("intro");
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id as SectionId);
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return active;
}

// ── Route ─────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "API Docs — Lectern" },
      { name: "description", content: "Lectern Webhook API documentation for developers integrating external platforms." },
    ],
  }),
  component: DocsPage,
});

// ── Component ─────────────────────────────────────────────────────────────────
function DocsPage() {
  const { theme, toggle } = useTheme();
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const s = localStorage.getItem("lectern.lang");
      return s === "en" ? "en" : "ru";
    } catch { return "ru"; }
  });
  const active = useScrollSpy();
  const t = (key: string) => {
    const val = copy[lang][key] ?? copy.ru[key];
    if (val === undefined && process.env.NODE_ENV === "development") {
      console.warn(`[docs i18n] missing key: "${key}"`);
    }
    return val ?? key;
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navLink = (id: SectionId, label: string, indent = false) => (
    <button
      key={id}
      className={`docs-nav-link${active === id ? " active" : ""}`}
      style={indent ? { paddingLeft: 28 } : undefined}
      onClick={() => scrollTo(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="lp" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* HEADER */}
      <header className="docs-header">
        <div className="docs-header-inner">
          <a href="/" className="docs-logo">
            <span className="docs-logo-mark">L</span>
            <span className="docs-logo-name">Lectern</span>
            <span className="docs-logo-badge">{t("docs.badge")}</span>
          </a>
          <div className="docs-header-right">
            <button className="docs-lang-btn" onClick={() => setLang((l) => {
              const next = l === "ru" ? "en" : "ru";
              try { localStorage.setItem("lectern.lang", next); } catch { /* noop */ }
              return next;
            })}>
              {lang.toUpperCase()}
            </button>
            <button className="docs-icon-btn" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="docs-body">
        {/* SIDEBAR */}
        <nav className="docs-sidebar">
          <div className="docs-nav-group">
            {navLink("intro", t("nav.intro"))}
            {navLink("auth", t("nav.auth"))}
          </div>
          <div className="docs-nav-group">
            <div className="docs-nav-group-label">{t("nav.incoming")}</div>
            {navLink("sync", t("nav.sync"), true)}
            {navLink("bulk", t("nav.bulk"), true)}
            {navLink("subs", t("nav.subs"), true)}
          </div>
          <div className="docs-nav-group">
            <div className="docs-nav-group-label">{t("nav.events")}</div>
            {navLink("event-attendance", t("nav.event-attendance"), true)}
          </div>
          <div className="docs-nav-group">
            {navLink("errors", t("nav.errors"))}
          </div>
        </nav>

        {/* CONTENT */}
        <main className="docs-content">

          {/* INTRO */}
          <section id="intro" className="docs-section">
            <div className="docs-section-eyebrow">{t("intro.eyebrow")}</div>
            <h2>{t("intro.title")}</h2>
            <p>{t("intro.body")}</p>
            <StaticCode label={t("intro.base")} lang="URL">
              <span style={{ color: "oklch(0.78 0.13 130)" }}>https://app.lectern.io/api</span>
            </StaticCode>
            <p>{t("intro.format")}</p>
          </section>

          {/* AUTH */}
          <section id="auth" className="docs-section">
            <div className="docs-section-eyebrow">{t("auth.eyebrow")}</div>
            <h2>{t("auth.title")}</h2>
            <h3>{t("auth.incoming.title")}</h3>
            <p>{t("auth.incoming.body")}</p>
            <StaticCode label="Header" lang="HTTP">
              <span style={{ color: "oklch(0.78 0.13 280)" }}>X-Webhook-Secret</span>
              <span>{": "}</span>
              <span style={{ color: "oklch(0.78 0.13 130)" }}>your-configured-secret</span>
            </StaticCode>
            <h3>{t("auth.outgoing.title")}</h3>
            <p>{t("auth.outgoing.body")}</p>
            <StaticCode label={t("auth.verify")} lang="Python">
              <span style={{ color: "oklch(0.7 0.12 255)" }}>{"import"}</span>
              {" hmac, hashlib, json\n\n"}
              <span style={{ color: "oklch(0.55 0.01 260)" }}># Verify incoming Lectern event</span>
              {"\n"}
              <span style={{ color: "oklch(0.78 0.13 280)" }}>{"def"}</span>
              {" "}
              <span style={{ color: "oklch(0.78 0.13 130)" }}>verify_signature</span>
              {"(secret: str, body: bytes, header: str) -> bool:\n    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()\n    return hmac.compare_digest(f\"sha256={'{sig}'}\", header)\n"}
            </StaticCode>
          </section>

          {/* INCOMING */}
          <section id="incoming" className="docs-section">
            <div className="docs-section-eyebrow">{t("incoming.eyebrow")}</div>
            <h2>{t("incoming.title")}</h2>
            <p>{t("incoming.body")}</p>
          </section>

          {/* SYNC */}
          <section id="sync" className="docs-section">
            <h2>{t("sync.title")}</h2>
            <p>{t("sync.body")}</p>
            <div className="docs-auth-note">
              <span className="icon"><WarnIcon /></span>
              <span>{t("sync.auth-note")}</span>
            </div>
            <div className="docs-endpoint">
              <MethodBadge method="POST" />
              <span className="ep-path">/api/webhooks/student-sync/</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--lp-fg)", marginBottom: 8 }}>{t("sync.params")}</p>
            <div className="docs-param-wrap">
              <table className="docs-param-table">
                <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Description</th></tr></thead>
                <tbody>
                  <ParamRow name="platonus_id" type="int" required desc={t("param.platonus_id")} />
                  <ParamRow name="first_name" type="string" required desc={t("param.first_name")} />
                  <ParamRow name="last_name" type="string" required desc={t("param.last_name")} />
                  <ParamRow name="email" type="string" required desc={t("param.email")} />
                  <ParamRow name="age" type="int" required desc={t("param.age")} />
                  <ParamRow name="phone" type="string" required={false} desc={t("param.phone")} />
                  <ParamRow name="group_name" type="string" required={false} desc={t("param.group_name")} />
                </tbody>
              </table>
            </div>
            <StaticCode label={lang === "ru" ? "Пример запроса" : "Request example"} lang="HTTP">
              <span className="cm">POST</span>{" "}<span className="cp">/api/webhooks/student-sync/{"\n"}</span>
              <span className="ck">X-Webhook-Secret</span>{": "}<span className="cs">your-secret{"\n"}</span>
              <span className="ck">Content-Type</span>{": application/json\n\n"}
              {"{\n"}
              {"  "}<span className="ck">"platonus_id"</span>{": "}<span className="cn">123</span>{",\n"}
              {"  "}<span className="ck">"first_name"</span>{": "}<span className="cs">"Алибек"</span>{",\n"}
              {"  "}<span className="ck">"last_name"</span>{": "}<span className="cs">"Жаксыбеков"</span>{",\n"}
              {"  "}<span className="ck">"email"</span>{": "}<span className="cs">"ali@uni.kz"</span>{",\n"}
              {"  "}<span className="ck">"age"</span>{": "}<span className="cn">20</span>{",\n"}
              {"  "}<span className="ck">"group_name"</span>{": "}<span className="cs">"ИС-21"</span>{"\n}\n\n"}
              <span className="csuccess">{"→ HTTP/1.1 200 OK\n"}</span>
              <span className="cc">{'→ { "action": '}</span><span className="cs">"created"</span><span className="cc">{', "student_id": '}</span><span className="cn">5</span><span className="cc">{" }"}</span>
            </StaticCode>
          </section>

          {/* BULK */}
          <section id="bulk" className="docs-section">
            <h2>{t("bulk.title")}</h2>
            <p>{t("bulk.body")}</p>
            <div className="docs-endpoint">
              <MethodBadge method="POST" />
              <span className="ep-path">/api/webhooks/students-bulk/</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--lp-fg)", marginBottom: 8 }}>{t("bulk.params")}</p>
            <div className="docs-param-wrap">
              <table className="docs-param-table">
                <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Description</th></tr></thead>
                <tbody>
                  <ParamRow name="students" type="array" required desc={t("param.students")} />
                </tbody>
              </table>
            </div>
            <StaticCode label={lang === "ru" ? "Пример запроса" : "Request example"} lang="HTTP">
              <span className="cm">POST</span>{" "}<span className="cp">/api/webhooks/students-bulk/{"\n"}</span>
              <span className="ck">X-Webhook-Secret</span>{": "}<span className="cs">your-secret{"\n"}</span>
              <span className="ck">Content-Type</span>{": application/json\n\n"}
              {"{\n  "}<span className="ck">"students"</span>{": [\n    { "}
              <span className="ck">"platonus_id"</span>{": "}<span className="cn">124</span>
              {', '}<span className="ck">"first_name"</span>{": "}<span className="cs">"Айгерим"</span>
              {', '}<span className="ck">"last_name"</span>{": "}<span className="cs">"Бекова"</span>
              {',\n      '}<span className="ck">"email"</span>{": "}<span className="cs">"ai@uni.kz"</span>
              {', '}<span className="ck">"age"</span>{": "}<span className="cn">21</span>{" }\n  ]\n}\n\n"}
              <span className="csuccess">{"→ HTTP/1.1 200 OK\n"}</span>
              <span className="cc">{"→ { "}</span><span className="ck">"created"</span><span className="cc">{": "}</span><span className="cn">5</span>
              <span className="cc">{', '}</span><span className="ck">"updated"</span><span className="cc">{": "}</span><span className="cn">12</span>
              <span className="cc">{', "errors": [] }'}</span>
            </StaticCode>
          </section>

          {/* SUBSCRIPTIONS */}
          <section id="subs" className="docs-section">
            <h2>{t("subs.title")}</h2>
            <p>{t("subs.body")}</p>

            <h3>{t("subs.create.title")}</h3>
            <p>{t("subs.create.body")}</p>
            <div className="docs-endpoint"><MethodBadge method="POST" /><span className="ep-path">/api/webhooks/subscriptions/</span></div>
            <div className="docs-param-wrap">
              <table className="docs-param-table">
                <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Description</th></tr></thead>
                <tbody>
                  <ParamRow name="platform_name" type="string" required desc={t("param.platform_name")} />
                  <ParamRow name="callback_url" type="URL" required desc={t("param.callback_url.create")} />
                  <ParamRow name="events" type="string[]" required desc={t("param.events")} />
                </tbody>
              </table>
            </div>
            <StaticCode label={lang === "ru" ? "Пример запроса" : "Request example"} lang="HTTP">
              <span className="cm">POST</span>{" "}<span className="cp">/api/webhooks/subscriptions/{"\n"}</span>
              <span className="ck">Authorization</span>{": Bearer "}<span className="cs">eyJhbGciOi...{"\n"}</span>
              <span className="ck">Content-Type</span>{": application/json\n\n"}
              {"{\n"}
              {"  "}<span className="ck">"platform_name"</span>{": "}<span className="cs">"Platonus"</span>{",\n"}
              {"  "}<span className="ck">"callback_url"</span>{": "}<span className="cs">"https://platonus.kz/hooks/lectern"</span>{",\n"}
              {"  "}<span className="ck">"events"</span>{": ["}<span className="cs">"attendance.marked"</span>{"]\n}\n\n"}
              <span className="csuccess">{"→ HTTP/1.1 201 Created\n"}</span>
              <span className="cc">{"→ {\n"}</span>
              <span className="cc">{"     "}</span><span className="ck">"id"</span><span className="cc">{": "}</span><span className="cn">1</span><span className="cc">{",\n"}</span>
              <span className="cc">{"     "}</span><span className="ck">"platform_name"</span><span className="cc">{": "}</span><span className="cs">"Platonus"</span><span className="cc">{",\n"}</span>
              <span className="cc">{"     "}</span><span className="ck">"secret"</span><span className="cc">{": "}</span><span className="cs">"a3f9...shown-once"</span><span className="cc">{"\n   }"}</span>
            </StaticCode>

            <h3>{t("subs.list.title")}</h3>
            <div className="docs-endpoint"><MethodBadge method="GET" /><span className="ep-path">/api/webhooks/subscriptions/</span></div>

            <h3>{t("subs.update.title")}</h3>
            <div className="docs-endpoint"><MethodBadge method="PATCH" /><span className="ep-path">/api/webhooks/subscriptions/{"<id>/"}</span></div>
            <div className="docs-param-wrap">
              <table className="docs-param-table">
                <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Description</th></tr></thead>
                <tbody>
                  <ParamRow name="callback_url" type="URL" required={false} desc={t("param.callback_url.update")} />
                  <ParamRow name="events" type="string[]" required={false} desc={t("param.events.update")} />
                  <ParamRow name="is_active" type="boolean" required={false} desc={t("param.is_active")} />
                </tbody>
              </table>
            </div>

            <h3>{t("subs.delete.title")}</h3>
            <div className="docs-endpoint"><MethodBadge method="DELETE" /><span className="ep-path">/api/webhooks/subscriptions/{"<id>/"}</span></div>
          </section>

          {/* EVENTS */}
          <section id="events" className="docs-section">
            <div className="docs-section-eyebrow">{t("events.eyebrow")}</div>
            <h2>{t("events.title")}</h2>
            <p>{t("events.body")}</p>
          </section>

          {/* ATTENDANCE.MARKED */}
          <section id="event-attendance" className="docs-section">
            <h2>{t("event-attendance.title")}</h2>
            <p>{t("event-attendance.body")}</p>
            <StaticCode label="Payload" lang="JSON">
              {"{\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"event"</span>{": "}<span style={{ color: "oklch(0.78 0.13 130)" }}>"attendance.marked"</span>{",\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"timestamp"</span>{": "}<span style={{ color: "oklch(0.78 0.13 130)" }}>"2026-05-08T10:15:00Z"</span>{",\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"schedule_id"</span>{": "}<span style={{ color: "oklch(0.78 0.13 60)" }}>42</span>{",\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"group_name"</span>{": "}<span style={{ color: "oklch(0.78 0.13 130)" }}>"ИС-21"</span>{",\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"present"</span>{": [{ "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"id"</span>{": "}<span style={{ color: "oklch(0.78 0.13 60)" }}>1</span>{", "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"platonus_id"</span>{": "}<span style={{ color: "oklch(0.78 0.13 60)" }}>101</span>{" }],\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"absent"</span>{"  "}{": [{ "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"id"</span>{": "}<span style={{ color: "oklch(0.78 0.13 60)" }}>2</span>{", "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"platonus_id"</span>{": "}<span style={{ color: "oklch(0.55 0.01 260)" }}>null</span>{" }]\n}"}
            </StaticCode>
            <StaticCode label={lang === "ru" ? "Заголовок подписи" : "Signature header"} lang="HTTP">
              <span style={{ color: "oklch(0.78 0.13 280)" }}>X-Lectern-Signature</span>
              <span>{": sha256="}</span>
              <span style={{ color: "oklch(0.78 0.13 130)" }}>e3b0c44298fc1c149afb...</span>
            </StaticCode>
            <p>{t("event-attendance.verify")}</p>
          </section>

          {/* ERRORS */}
          <section id="errors" className="docs-section">
            <div className="docs-section-eyebrow">{t("errors.eyebrow")}</div>
            <h2>{t("errors.title")}</h2>
            <p>{t("errors.body")}</p>
            <div className="docs-error-wrap">
              <table className="docs-error-table">
                <tbody>
                  <tr><td><code className="err-code err-400">400</code></td><td style={{ color: "var(--lp-muted-fg)" }}>{t("error.400")}</td></tr>
                  <tr><td><code className="err-code err-403">403</code></td><td style={{ color: "var(--lp-muted-fg)" }}>{t("error.403")}</td></tr>
                  <tr><td><code className="err-code err-404">404</code></td><td style={{ color: "var(--lp-muted-fg)" }}>{t("error.404")}</td></tr>
                  <tr><td><code className="err-code err-500">500</code></td><td style={{ color: "var(--lp-muted-fg)" }}>{t("error.500")}</td></tr>
                </tbody>
              </table>
            </div>
            <StaticCode label={t("error.format.label")} lang="JSON">
              {"{ "}<span style={{ color: "oklch(0.78 0.13 280)" }}>"detail"</span>{": "}<span style={{ color: "oklch(0.78 0.13 130)" }}>"Invalid or missing webhook secret."</span>{" }"}
            </StaticCode>
          </section>

        </main>
      </div>
    </div>
  );
}
