import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const outDir = path.join(__dirname, "output");
const previewDir = path.join(__dirname, "previews");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Lectern AI";
pptx.company = "Lectern AI";
pptx.subject = "Система академического мониторинга";
pptx.title = "Lectern AI";
pptx.lang = "ru-RU";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "ru-RU",
};
pptx.defineLayout({ name: "CUSTOM_WIDE", width: 13.333, height: 7.5 });
pptx.layout = "CUSTOM_WIDE";
pptx.defineSlideMaster({
  title: "BLANK",
  background: { color: "F8FAFC" },
  objects: [],
});

const W = 13.333;
const H = 7.5;
const C = {
  ink: "0F172A",
  muted: "64748B",
  faint: "E2E8F0",
  paper: "F8FAFC",
  white: "FFFFFF",
  cyan: "14B8A6",
  blue: "2563EB",
  amber: "F59E0B",
  red: "EF4444",
  green: "22C55E",
  dark: "111827",
};

const slidesForPreview = [];

function addSlide(bg = C.paper) {
  const slide = pptx.addSlide("BLANK");
  slide.background = { color: bg };
  return slide;
}

function txt(slide, text, x, y, w, h, opts = {}) {
  slide.addText(text, {
    x, y, w, h,
    margin: 0,
    fontFace: opts.fontFace || "Aptos",
    fontSize: opts.fontSize || 18,
    color: opts.color || C.ink,
    bold: opts.bold || false,
    breakLine: false,
    fit: "shrink",
    valign: opts.valign || "top",
    align: opts.align || "left",
    paraSpaceAfterPt: 0,
    paraSpaceBeforePt: 0,
    lineSpacingMultiple: opts.lineSpacingMultiple || 0.92,
    rotate: opts.rotate,
  });
}

function rect(slide, x, y, w, h, fill, opts = {}) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color: fill, transparency: opts.transparency || 0 },
    line: { color: opts.line || fill, transparency: opts.lineTransparency ?? 100, width: opts.lineWidth || 0 },
    radius: opts.radius || 0,
  });
}

function line(slide, x1, y1, x2, y2, color = C.faint, width = 1.2, dash) {
  slide.addShape(pptx.ShapeType.line, {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: { color, width, dash },
  });
}

function logo(slide, x, y, s = 0.48, dark = false) {
  const base = dark ? C.white : C.ink;
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: s, h: s,
    rectRadius: 0.06,
    fill: { color: dark ? "FFFFFF" : "0F172A" },
    line: { color: dark ? "FFFFFF" : "0F172A", transparency: 100 },
  });
  txt(slide, "L", x + s * 0.29, y + s * 0.12, s * 0.5, s * 0.35, {
    fontSize: s * 40,
    color: dark ? C.ink : C.white,
    bold: true,
  });
  slide.addShape(pptx.ShapeType.arc, {
    x: x + s * 0.58, y: y + s * 0.14, w: s * 0.28, h: s * 0.28,
    adjustPoint: 0.18,
    line: { color: C.cyan, width: 2 },
  });
  slide.addShape(pptx.ShapeType.arc, {
    x: x + s * 0.14, y: y + s * 0.58, w: s * 0.28, h: s * 0.28,
    adjustPoint: 0.18,
    rotate: 180,
    line: { color: C.amber, width: 2 },
  });
  return base;
}

function header(slide, kicker, title, subtitle) {
  txt(slide, kicker.toUpperCase(), 0.75, 0.45, 3.8, 0.23, {
    fontSize: 8.5,
    bold: true,
    color: C.cyan,
  });
  txt(slide, title, 0.75, 0.76, 10.55, 0.9, {
    fontFace: "Aptos Display",
    fontSize: 30,
    bold: true,
    color: C.ink,
  });
  if (subtitle) {
    txt(slide, subtitle, 0.77, 1.5, 10.35, 0.42, {
      fontSize: 12.5,
      color: C.muted,
    });
  }
  logo(slide, 12.05, 0.46, 0.42);
}

function pill(slide, text, x, y, w, color, textColor = C.white) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.34,
    rectRadius: 0.16,
    fill: { color },
    line: { color, transparency: 100 },
  });
  txt(slide, text, x, y + 0.075, w, 0.16, { fontSize: 8.5, bold: true, color: textColor, align: "center" });
}

function bullet(slide, text, x, y, w, color = C.cyan) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x, y: y + 0.04, w: 0.11, h: 0.11,
    fill: { color },
    line: { color, transparency: 100 },
  });
  txt(slide, text, x + 0.22, y - 0.01, w - 0.22, 0.32, { fontSize: 13, color: C.ink });
}

function previewText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function addPreview(name, svg) {
  slidesForPreview.push({ name, svg: svg.replace(/&/g, "&amp;") });
}

// 1 Cover
{
  const s = addSlide(C.dark);
  rect(s, 0, 0, W, H, C.dark);
  rect(s, 0, 0, 4.25, H, "0B1220");
  line(s, 4.25, 0, 4.25, H, "223044", 1);
  for (let i = 0; i < 7; i++) line(s, 4.7 + i * 0.85, 1.0, 4.7 + i * 0.85, 6.55, "263449", 0.6, "dash");
  for (let i = 0; i < 5; i++) line(s, 4.4, 1.25 + i * 1.0, 11.7, 1.25 + i * 1.0, "263449", 0.6, "dash");
  logo(s, 0.85, 0.78, 0.62, true);
  txt(s, "LECTERN AI", 1.65, 0.86, 2.3, 0.28, { fontSize: 13, bold: true, color: C.white });
  txt(s, "academic monitoring", 1.65, 1.18, 2.3, 0.18, { fontSize: 8.5, color: "A7B2C3" });
  txt(s, "Lectern", 0.78, 2.32, 3.0, 0.72, { fontFace: "Aptos Display", fontSize: 44, bold: true, color: C.white });
  txt(s, "AI", 3.24, 2.34, 0.72, 0.68, { fontFace: "Aptos Display", fontSize: 42, bold: true, color: C.cyan });
  txt(s, "Интеллектуальная система академического мониторинга", 0.84, 3.22, 3.1, 0.62, { fontSize: 16, color: "D8E4F0", bold: true });
  txt(s, "AI-учет посещаемости, аналитика рисков и уведомления студентам в едином рабочем контуре преподавателя.", 0.86, 4.15, 3.05, 0.82, { fontSize: 11.5, color: "B4C0D0" });
  pill(s, "face recognition", 5.0, 2.23, 1.55, C.cyan);
  pill(s, "risk analytics", 7.04, 3.28, 1.36, C.amber);
  pill(s, "notifications", 9.26, 2.74, 1.34, C.blue);
  pill(s, "teacher actions", 8.06, 5.0, 1.54, "334155");
  line(s, 6.55, 2.4, 7.04, 3.45, C.cyan, 1.4);
  line(s, 8.4, 3.45, 9.26, 2.91, C.amber, 1.4);
  line(s, 8.7, 3.62, 8.6, 5.0, C.blue, 1.4);
  txt(s, "Готовая презентация проекта", 0.86, 6.65, 2.5, 0.2, { fontSize: 8.5, color: "94A3B8" });
  addPreview("01-cover", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#111827"/><rect width="612" height="1080" fill="#0B1220"/><text x="120" y="430" fill="#fff" font-family="Arial" font-size="104" font-weight="700">Lectern <tspan fill="#14B8A6">AI</tspan></text><text x="124" y="548" fill="#D8E4F0" font-family="Arial" font-size="42" font-weight="700">Интеллектуальная система</text><text x="124" y="606" fill="#D8E4F0" font-family="Arial" font-size="42" font-weight="700">академического мониторинга</text><text x="720" y="360" fill="#14B8A6" font-family="Arial" font-size="34" font-weight="700">face recognition</text><text x="1010" y="510" fill="#F59E0B" font-family="Arial" font-size="34" font-weight="700">risk analytics</text><text x="1330" y="450" fill="#60A5FA" font-family="Arial" font-size="34" font-weight="700">notifications</text></svg>`);
}

// 2 Problem
{
  const s = addSlide();
  header(s, "Проблема", "Контроль учебного процесса распадается на ручные действия", "Преподаватель тратит время на отметки, администрация поздно видит риски, студент получает сигнал уже после накопления проблем.");
  const items = [
    ["Посещаемость", "ручной учет, ошибки, потеря времени на занятии", C.blue],
    ["Успеваемость", "нет раннего сигнала по студентам в зоне риска", C.amber],
    ["Коммуникация", "уведомления зависят от памяти и загруженности", C.cyan],
    ["Ответственность", "сложно доказать, что меры были приняты вовремя", "475569"],
  ];
  items.forEach((it, idx) => {
    const x = 0.95 + idx * 3.05;
    txt(s, String(idx + 1).padStart(2, "0"), x, 2.35, 0.54, 0.32, { fontSize: 18, bold: true, color: it[2] });
    line(s, x, 2.85, x + 2.36, 2.85, it[2], 2.2);
    txt(s, it[0], x, 3.15, 2.4, 0.28, { fontSize: 18, bold: true, color: C.ink });
    txt(s, it[1], x, 3.63, 2.42, 0.75, { fontSize: 12.5, color: C.muted });
  });
  txt(s, "Итог: система нужна не как «еще один журнал», а как ранний контур выявления академических рисков.", 1.08, 5.55, 11.0, 0.56, { fontSize: 21, bold: true, color: C.ink, align: "center" });
  addPreview("02-problem", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#F8FAFC"/><text x="108" y="178" fill="#0F172A" font-family="Arial" font-size="60" font-weight="700">Контроль учебного процесса распадается на ручные действия</text><text x="155" y="500" fill="#2563EB" font-size="36" font-family="Arial" font-weight="700">01 Посещаемость</text><text x="595" y="500" fill="#F59E0B" font-size="36" font-family="Arial" font-weight="700">02 Успеваемость</text><text x="1035" y="500" fill="#14B8A6" font-size="36" font-family="Arial" font-weight="700">03 Коммуникация</text><text x="1450" y="500" fill="#475569" font-size="36" font-family="Arial" font-weight="700">04 Ответственность</text><text x="190" y="820" fill="#0F172A" font-size="40" font-family="Arial" font-weight="700">Система нужна как ранний контур выявления академических рисков</text></svg>`);
}

// 3 Solution
{
  const s = addSlide();
  header(s, "Решение", "Lectern AI объединяет учет, аналитику и реакцию", "Платформа закрывает полный цикл: от фиксации присутствия до уведомления и эскалации.");
  const cx = 6.65, cy = 4.1;
  slideCircle(s, cx, cy, 1.2, C.ink, "Lectern\nAI", C.white, 26);
  const nodes = [
    ["AI-скан", 3.05, 2.25, C.cyan],
    ["Журнал", 7.95, 2.03, C.blue],
    ["Риски", 9.6, 4.55, C.amber],
    ["Уведомления", 5.1, 5.78, C.green],
    ["Эскалация", 2.95, 4.75, "475569"],
  ];
  nodes.forEach(([label, x, y, col]) => {
    line(s, cx, cy, x + 0.68, y + 0.38, col, 1.8);
    slideCircle(s, x + 0.66, y + 0.38, 0.46, col, "", C.white, 12);
    txt(s, label, x, y + 0.88, 1.35, 0.24, { fontSize: 13, bold: true, color: C.ink, align: "center" });
  });
  txt(s, "Ключевая идея", 0.95, 6.55, 1.4, 0.2, { fontSize: 9, bold: true, color: C.cyan });
  txt(s, "Преподаватель видит не только факт отсутствия, а состояние группы и следующий нужный шаг.", 2.25, 6.47, 8.8, 0.32, { fontSize: 14, bold: true, color: C.ink });
  addPreview("03-solution", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#F8FAFC"/><text x="108" y="178" fill="#0F172A" font-family="Arial" font-size="60" font-weight="700">Lectern AI объединяет учет, аналитику и реакцию</text><circle cx="960" cy="590" r="145" fill="#0F172A"/><text x="880" y="580" fill="#fff" font-family="Arial" font-size="54" font-weight="700">Lectern</text><text x="930" y="640" fill="#14B8A6" font-family="Arial" font-size="54" font-weight="700">AI</text><text x="430" y="420" fill="#14B8A6" font-size="34" font-family="Arial" font-weight="700">AI-скан</text><text x="1130" y="395" fill="#2563EB" font-size="34" font-family="Arial" font-weight="700">Журнал</text><text x="1390" y="760" fill="#F59E0B" font-size="34" font-family="Arial" font-weight="700">Риски</text></svg>`);
}

function slideCircle(slide, x, y, r, fill, label, color, fs) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x: x - r, y: y - r, w: r * 2, h: r * 2,
    fill: { color: fill },
    line: { color: fill, transparency: 100 },
  });
  if (label) txt(slide, label, x - r * 0.75, y - r * 0.27, r * 1.5, r * 0.55, { fontSize: fs, bold: true, color, align: "center", valign: "mid" });
}

// 4 Architecture
{
  const s = addSlide();
  header(s, "Архитектура", "Проект состоит из четырех согласованных подсистем", "Frontend, backend, AI-сервис и Telegram/email-уведомления работают как единый образовательный workflow.");
  const cols = [
    ["Teacher Hub", "React / TanStack\nDashboard, группы, журнал,\nрасписание, сканирование", C.blue],
    ["Back End", "Django REST\nмодели, API, права,\nзадачи и WebSocket", C.ink],
    ["AI Service", "YOLO + FaceNet\nдетекция лица, embedding,\nсравнение с базой", C.cyan],
    ["Bot & Mail", "Telegram / email\nуведомления студентам,\nдоставка и статусы", C.amber],
  ];
  cols.forEach(([title, body, color], i) => {
    const x = 0.78 + i * 3.13;
    rect(s, x, 2.33, 2.62, 3.0, C.white, { line: C.faint, lineTransparency: 0, lineWidth: 0.7, radius: 0.08 });
    rect(s, x, 2.33, 2.62, 0.12, color);
    txt(s, title, x + 0.25, 2.72, 2.12, 0.32, { fontSize: 16, bold: true, color: C.ink });
    txt(s, body, x + 0.25, 3.25, 2.05, 1.0, { fontSize: 11.6, color: C.muted });
    if (i < cols.length - 1) {
      line(s, x + 2.62, 3.85, x + 3.13, 3.85, "94A3B8", 1.5);
      txt(s, "→", x + 2.74, 3.67, 0.25, 0.25, { fontSize: 16, color: C.muted });
    }
  });
  txt(s, "Docker Compose связывает сервисы в воспроизводимую среду: БД, backend, frontend, AI и коммуникационный слой.", 1.08, 6.1, 11.2, 0.32, { fontSize: 13.5, color: C.ink, bold: true, align: "center" });
  addPreview("04-architecture", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#F8FAFC"/><text x="108" y="178" fill="#0F172A" font-family="Arial" font-size="60" font-weight="700">Проект состоит из четырех согласованных подсистем</text><text x="160" y="455" fill="#2563EB" font-size="38" font-family="Arial" font-weight="700">Teacher Hub</text><text x="610" y="455" fill="#0F172A" font-size="38" font-family="Arial" font-weight="700">Back End</text><text x="1030" y="455" fill="#14B8A6" font-size="38" font-family="Arial" font-weight="700">AI Service</text><text x="1450" y="455" fill="#F59E0B" font-size="38" font-family="Arial" font-weight="700">Bot & Mail</text></svg>`);
}

// 5 AI attendance
{
  const s = addSlide();
  header(s, "AI-посещаемость", "Сканирование лица превращает отметку в быстрый подтверждаемый факт", "Преподаватель открывает занятие, камера фиксирует лицо, сервис возвращает статус распознавания.");
  const steps = [
    ["01", "Камера", "получение изображения"],
    ["02", "Детекция", "YOLO находит лицо"],
    ["03", "Embedding", "FaceNet строит вектор"],
    ["04", "Сравнение", "поиск ближайшего студента"],
    ["05", "Отметка", "attendance сохраняется"],
  ];
  steps.forEach(([n, title, body], i) => {
    const x = 0.86 + i * 2.45;
    slideCircle(s, x + 0.42, 3.1, 0.36, i === 0 ? C.blue : i === 4 ? C.green : C.cyan, n, C.white, 15);
    txt(s, title, x, 3.72, 1.28, 0.26, { fontSize: 14, bold: true, color: C.ink, align: "center" });
    txt(s, body, x - 0.08, 4.14, 1.42, 0.36, { fontSize: 10.5, color: C.muted, align: "center" });
    if (i < steps.length - 1) line(s, x + 0.8, 3.1, x + 2.05, 3.1, "CBD5E1", 1.6);
  });
  txt(s, "Статусы API: recognized, not_recognized, no_face, empty_embeddings. Это позволяет показывать честный результат без подмены данных.", 1.18, 5.72, 10.85, 0.5, { fontSize: 16.5, bold: true, color: C.ink, align: "center" });
  addPreview("05-ai", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#F8FAFC"/><text x="108" y="178" fill="#0F172A" font-family="Arial" font-size="60" font-weight="700">Сканирование лица превращает отметку в подтверждаемый факт</text><text x="180" y="540" fill="#2563EB" font-size="38" font-family="Arial" font-weight="700">01 Камера</text><text x="510" y="540" fill="#14B8A6" font-size="38" font-family="Arial" font-weight="700">02 Детекция</text><text x="850" y="540" fill="#14B8A6" font-size="38" font-family="Arial" font-weight="700">03 Embedding</text><text x="1210" y="540" fill="#14B8A6" font-size="38" font-family="Arial" font-weight="700">04 Сравнение</text><text x="1590" y="540" fill="#22C55E" font-size="38" font-family="Arial" font-weight="700">05 Отметка</text></svg>`);
}

// 6 Risk analytics
{
  const s = addSlide();
  header(s, "Аналитика", "Система показывает не данные ради данных, а студентов в зоне риска", "Риск формируется из посещаемости, оценок и событий; преподаватель получает понятную причину и действие.");
  txt(s, "Что видит преподаватель", 0.95, 2.26, 3.2, 0.32, { fontSize: 19, bold: true, color: C.ink });
  bullet(s, "процент посещаемости по студенту и группе", 1.02, 2.95, 4.6, C.blue);
  bullet(s, "динамику успеваемости и средний балл", 1.02, 3.45, 4.6, C.cyan);
  bullet(s, "причину риска: пропуски, низкие оценки, задолженность", 1.02, 3.95, 4.9, C.amber);
  bullet(s, "статус реакции и историю действий", 1.02, 4.45, 4.6, "475569");
  const x0 = 7.0, y0 = 5.78;
  const bars = [
    ["Посещаемость", 78, C.blue],
    ["Оценки", 62, C.cyan],
    ["Риск", 36, C.amber],
    ["Реакция", 84, C.green],
  ];
  bars.forEach(([label, val, color], i) => {
    const y = 2.55 + i * 0.75;
    txt(s, label, 6.65, y + 0.03, 1.35, 0.18, { fontSize: 10.5, color: C.muted });
    rect(s, 8.1, y, 3.45, 0.18, "E2E8F0");
    rect(s, 8.1, y, 3.45 * (val / 100), 0.18, color);
    txt(s, `${val}%`, 11.75, y - 0.03, 0.45, 0.2, { fontSize: 10.5, color: C.ink, bold: true });
  });
  line(s, 8.1, x0, 11.55, x0, C.faint, 1);
  txt(s, "Риск-инцидент создается автоматически и закрывается, когда показатель восстановлен.", 6.65, 5.95, 5.65, 0.44, { fontSize: 14.5, bold: true, color: C.ink });
  addPreview("06-analytics", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#F8FAFC"/><text x="108" y="178" fill="#0F172A" font-family="Arial" font-size="60" font-weight="700">Система показывает студентов в зоне риска</text><text x="150" y="385" fill="#0F172A" font-size="42" font-family="Arial" font-weight="700">Что видит преподаватель</text><rect x="1160" y="370" width="500" height="26" fill="#2563EB"/><rect x="1160" y="480" width="400" height="26" fill="#14B8A6"/><rect x="1160" y="590" width="250" height="26" fill="#F59E0B"/><rect x="1160" y="700" width="535" height="26" fill="#22C55E"/></svg>`);
}

// 7 Notifications and responsibility
{
  const s = addSlide();
  header(s, "Уведомления", "Система фиксирует не только проблему, но и реакцию на нее", "Это важная часть защиты проекта: платформа подтверждает своевременные действия преподавателя.");
  const stages = [
    ["1", "Порог риска", "посещаемость ниже нормы"],
    ["2", "Уведомление", "студент получает причину и срок"],
    ["3", "Фиксация", "сохраняется факт отправки"],
    ["4", "Эскалация", "если проблема не решена"],
  ];
  stages.forEach(([n, title, body], i) => {
    const x = 1.0 + i * 3.0;
    txt(s, n, x, 2.44, 0.42, 0.48, { fontSize: 31, bold: true, color: i === 3 ? C.amber : C.cyan });
    txt(s, title, x + 0.58, 2.55, 1.9, 0.26, { fontSize: 15.5, bold: true, color: C.ink });
    txt(s, body, x + 0.58, 2.96, 1.8, 0.36, { fontSize: 10.8, color: C.muted });
    if (i < stages.length - 1) line(s, x + 2.35, 2.75, x + 2.85, 2.75, "CBD5E1", 1.6);
  });
  rect(s, 1.06, 4.75, 11.2, 0.05, C.faint);
  txt(s, "Корректная формулировка для защиты", 1.1, 5.22, 3.7, 0.28, { fontSize: 12, bold: true, color: C.cyan });
  txt(s, "Функция не освобождает преподавателя от ответственности. Она подтверждает, что проблема была замечена, студент уведомлен, а действия сохранены в истории.", 1.1, 5.72, 10.8, 0.56, { fontSize: 18, bold: true, color: C.ink, align: "center" });
  addPreview("07-notifications", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#F8FAFC"/><text x="108" y="178" fill="#0F172A" font-family="Arial" font-size="60" font-weight="700">Система фиксирует проблему и реакцию на нее</text><text x="170" y="430" fill="#14B8A6" font-size="72" font-family="Arial" font-weight="700">1</text><text x="590" y="430" fill="#14B8A6" font-size="72" font-family="Arial" font-weight="700">2</text><text x="1010" y="430" fill="#14B8A6" font-size="72" font-family="Arial" font-weight="700">3</text><text x="1430" y="430" fill="#F59E0B" font-size="72" font-family="Arial" font-weight="700">4</text><text x="180" y="830" fill="#0F172A" font-size="40" font-family="Arial" font-weight="700">Проблема замечена, студент уведомлен, действия сохранены</text></svg>`);
}

// 8 Interface
{
  const s = addSlide();
  header(s, "Интерфейс", "Teacher Hub собран как рабочее место преподавателя", "Первый экран — не лендинг, а операционный dashboard с быстрым доступом к занятиям и отметкам.");
  rect(s, 0.95, 2.2, 11.45, 4.3, C.white, { line: C.faint, lineTransparency: 0, lineWidth: 0.8, radius: 0.08 });
  rect(s, 0.95, 2.2, 1.85, 4.3, "111827");
  logo(s, 1.2, 2.48, 0.36, true);
  txt(s, "Lectern", 1.68, 2.55, 0.85, 0.18, { fontSize: 9.5, bold: true, color: C.white });
  ["Dashboard", "Schedule", "Attendance", "Scan AI", "Groups", "Analytics"].forEach((n, i) => {
    txt(s, n, 1.22, 3.1 + i * 0.39, 1.15, 0.16, { fontSize: 7.6, color: i === 2 ? C.cyan : "CBD5E1", bold: i === 2 });
  });
  txt(s, "Рабочий день преподавателя", 3.18, 2.56, 3.2, 0.28, { fontSize: 18, bold: true, color: C.ink });
  rect(s, 3.18, 3.15, 2.05, 0.86, "F1F5F9", { line: "E2E8F0", lineTransparency: 0, lineWidth: 0.5 });
  rect(s, 5.52, 3.15, 2.05, 0.86, "F1F5F9", { line: "E2E8F0", lineTransparency: 0, lineWidth: 0.5 });
  rect(s, 7.86, 3.15, 2.05, 0.86, "F1F5F9", { line: "E2E8F0", lineTransparency: 0, lineWidth: 0.5 });
  txt(s, "Занятий сегодня", 3.38, 3.37, 1.35, 0.16, { fontSize: 7.6, color: C.muted });
  txt(s, "4", 3.38, 3.58, 0.45, 0.28, { fontSize: 20, bold: true, color: C.ink });
  txt(s, "Группы", 5.72, 3.37, 1.0, 0.16, { fontSize: 7.6, color: C.muted });
  txt(s, "6", 5.72, 3.58, 0.45, 0.28, { fontSize: 20, bold: true, color: C.ink });
  txt(s, "С фото лица", 8.06, 3.37, 1.0, 0.16, { fontSize: 7.6, color: C.muted });
  txt(s, "82%", 8.06, 3.58, 0.65, 0.28, { fontSize: 20, bold: true, color: C.ink });
  rect(s, 3.18, 4.45, 4.22, 1.35, "FFFFFF", { line: "E2E8F0", lineTransparency: 0, lineWidth: 0.5 });
  txt(s, "Следующее занятие", 3.38, 4.72, 2.1, 0.16, { fontSize: 8, color: C.muted });
  txt(s, "Математический анализ · ИСП-21", 3.38, 5.02, 2.9, 0.24, { fontSize: 12.2, bold: true, color: C.ink });
  pill(s, "Открыть скан", 6.0, 5.05, 1.05, C.cyan);
  rect(s, 7.8, 4.45, 3.85, 1.35, "FFFFFF", { line: "E2E8F0", lineTransparency: 0, lineWidth: 0.5 });
  txt(s, "Зона риска", 8.0, 4.72, 1.1, 0.16, { fontSize: 8, color: C.muted });
  rect(s, 8.0, 5.12, 2.3, 0.12, "E2E8F0");
  rect(s, 8.0, 5.12, 1.34, 0.12, C.amber);
  txt(s, "не перегружает, а ведет к следующему действию", 4.15, 6.85, 5.1, 0.18, { fontSize: 9.5, color: C.muted, align: "center" });
  addPreview("08-interface", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#F8FAFC"/><text x="108" y="178" fill="#0F172A" font-family="Arial" font-size="60" font-weight="700">Teacher Hub — рабочее место преподавателя</text><rect x="140" y="315" width="1645" height="620" fill="#fff" stroke="#E2E8F0"/><rect x="140" y="315" width="270" height="620" fill="#111827"/><text x="500" y="410" fill="#0F172A" font-family="Arial" font-size="38" font-weight="700">Рабочий день преподавателя</text><rect x="500" y="505" width="300" height="125" fill="#F1F5F9"/><rect x="840" y="505" width="300" height="125" fill="#F1F5F9"/><rect x="1180" y="505" width="300" height="125" fill="#F1F5F9"/></svg>`);
}

// 9 Value
{
  const s = addSlide();
  header(s, "Ценность", "Проект снижает ручную нагрузку и повышает управляемость обучения", "Польза распределена между преподавателем, студентом и администрацией.");
  const roles = [
    ["Преподаватель", "быстрее отмечает посещаемость\nвидит проблемных студентов\nфиксирует свои действия", C.blue],
    ["Студент", "получает ранний сигнал\nпонимает причину риска\nможет исправить ситуацию", C.cyan],
    ["Администрация", "видит группы с проблемами\nконтролирует эскалацию\nполучает историю действий", C.amber],
  ];
  roles.forEach(([role, body, color], i) => {
    const x = 1.1 + i * 4.05;
    txt(s, role, x, 2.62, 2.6, 0.32, { fontSize: 22, bold: true, color });
    line(s, x, 3.12, x + 2.7, 3.12, color, 2);
    txt(s, body, x, 3.55, 2.65, 1.0, { fontSize: 13, color: C.ink });
  });
  txt(s, "Главный эффект", 1.15, 5.9, 1.5, 0.22, { fontSize: 9.5, bold: true, color: C.cyan });
  txt(s, "Реакция на академический риск становится не случайной, а системной.", 2.6, 5.8, 8.6, 0.42, { fontSize: 23, bold: true, color: C.ink });
  addPreview("09-value", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#F8FAFC"/><text x="108" y="178" fill="#0F172A" font-family="Arial" font-size="60" font-weight="700">Проект снижает ручную нагрузку и повышает управляемость</text><text x="180" y="450" fill="#2563EB" font-size="48" font-family="Arial" font-weight="700">Преподаватель</text><text x="765" y="450" fill="#14B8A6" font-size="48" font-family="Arial" font-weight="700">Студент</text><text x="1290" y="450" fill="#F59E0B" font-size="48" font-family="Arial" font-weight="700">Администрация</text><text x="360" y="850" fill="#0F172A" font-size="48" font-family="Arial" font-weight="700">Реакция на риск становится системной</text></svg>`);
}

// 10 Final
{
  const s = addSlide(C.dark);
  rect(s, 0, 0, W, H, C.dark);
  logo(s, 0.88, 0.78, 0.58, true);
  txt(s, "LECTERN AI", 1.6, 0.88, 2.1, 0.25, { fontSize: 12, bold: true, color: C.white });
  txt(s, "Что уже демонстрирует проект", 0.9, 2.05, 5.4, 0.52, { fontFace: "Aptos Display", fontSize: 34, bold: true, color: C.white });
  bulletDark(s, "единый кабинет преподавателя", 1.0, 3.08);
  bulletDark(s, "ручной и AI-учет посещаемости", 1.0, 3.6);
  bulletDark(s, "аналитику студентов и групп", 1.0, 4.12);
  bulletDark(s, "уведомления и фиксацию действий", 1.0, 4.64);
  txt(s, "Lectern AI — не набор отдельных функций, а контур раннего выявления и сопровождения академических рисков.", 6.95, 2.55, 4.9, 1.65, { fontSize: 27, bold: true, color: C.white });
  line(s, 6.95, 4.72, 11.4, 4.72, C.cyan, 2.4);
  txt(s, "Готово для защиты: проблема, решение, архитектура, модули, ценность.", 6.98, 5.25, 4.55, 0.42, { fontSize: 15, color: "C8D3E1" });
  addPreview("10-final", `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#111827"/><text x="130" y="360" fill="#fff" font-family="Arial" font-size="74" font-weight="700">Что уже демонстрирует проект</text><text x="1000" y="445" fill="#fff" font-family="Arial" font-size="58" font-weight="700">Lectern AI — контур</text><text x="1000" y="515" fill="#fff" font-family="Arial" font-size="58" font-weight="700">раннего выявления</text><text x="1000" y="585" fill="#14B8A6" font-family="Arial" font-size="58" font-weight="700">академических рисков</text></svg>`);
}

function bulletDark(slide, textValue, x, y) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x, y: y + 0.06, w: 0.12, h: 0.12,
    fill: { color: C.cyan },
    line: { color: C.cyan, transparency: 100 },
  });
  txt(slide, textValue, x + 0.28, y, 3.8, 0.26, { fontSize: 15, color: "E2E8F0" });
}

async function writePreviews() {
  for (let i = 0; i < slidesForPreview.length; i++) {
    const { name, svg } = slidesForPreview[i];
    const file = path.join(previewDir, `${String(i + 1).padStart(2, "0")}-${name}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
  }
}

async function main() {
  const pptxPath = path.join(outDir, "Lectern_AI_presentation.pptx");
  await pptx.writeFile({ fileName: pptxPath });
  await writePreviews();
  console.log(JSON.stringify({
    pptx: pptxPath,
    previews: previewDir,
    slides: pptx._slides.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
