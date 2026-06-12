import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Grip,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  applySemesterSchedule,
  getSchedulePlanner,
  previewSemesterSchedule,
  saveSchedulePlanner,
} from '../../api/schedulePlannerAPI';

const DEFAULT_TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
const cardBaseClass = 'rounded-2xl border shadow-lg backdrop-blur-sm transition-all duration-300';
const createDraftId = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const pad = (value) => String(value).padStart(2, '0');

const normalizeDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
};

const toDate = (value) => {
  const normalized = normalizeDate(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
};

const addDays = (value, amount) => {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
};

const startOfWeek = (value) => {
  const next = new Date(value);
  next.setDate(next.getDate() - next.getDay() + (next.getDay() === 0 ? -6 : 1));
  next.setHours(12, 0, 0, 0);
  return next;
};

const getCellKey = (date, time) => `${normalizeDate(date)}|${String(time).slice(0, 5)}`;

const formatDayLabel = (value) =>
  new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: '2-digit', month: 'short' }).format(
    toDate(value)
  );

const formatWeekLabel = (startDate, endDate) => {
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (!start || !end) return 'Неделя';

  return `${new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long' }).format(start)} - ${new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(end)}`;
};

const normalizePlannerEntry = (entry) => ({
  id: entry?.id ?? null,
  clientId: entry?.id ? `entry-${entry.id}` : createDraftId(),
  date: normalizeDate(entry?.date),
  time: String(entry?.time ?? '').slice(0, 5),
  subjectId: entry?.subject?.id ?? entry?.subject_id ?? null,
  subjectName: entry?.subject?.name ?? entry?.subject_name ?? 'Без предмета',
  teacherName: entry?.teacher?.name ?? 'Преподаватель',
  teacherId: entry?.teacher?.id ?? null,
  canEdit: entry?.can_edit === true,
});

const findCellFromPoint = (clientX, clientY) => {
  const target = document.elementFromPoint(clientX, clientY);
  const cell = target?.closest?.('[data-schedule-cell="true"]');
  if (!cell) return null;

  return {
    date: cell.getAttribute('data-date'),
    time: cell.getAttribute('data-time'),
  };
};

const formatRequestError = (error, fallback) => {
  const payload = error?.response?.data;

  if (payload?.conflicts?.length) {
    const firstConflict = payload.conflicts[0];
    return `Слот занят: ${firstConflict.date} ${String(firstConflict.time).slice(0, 5)} — ${firstConflict.subject_name}.`;
  }

  if (typeof payload?.detail === 'string') return payload.detail;
  if (Array.isArray(payload?.non_field_errors) && payload.non_field_errors[0]) {
    return payload.non_field_errors[0];
  }
  if (typeof payload === 'string') return payload;
  return fallback;
};

const buildSavePayload = ({ groupId, startDate, endDate, baselineEntries, draftEntries }) => {
  const baselineMap = new Map(
    baselineEntries.filter((entry) => entry.canEdit && entry.id).map((entry) => [entry.id, entry])
  );
  const currentMap = new Map(
    draftEntries.filter((entry) => entry.canEdit && entry.id).map((entry) => [entry.id, entry])
  );

  return {
    group_id: Number(groupId),
    start_date: startDate,
    end_date: endDate,
    create: draftEntries
      .filter((entry) => entry.canEdit && !entry.id)
      .map((entry) => ({ date: entry.date, time: entry.time, subject_id: entry.subjectId })),
    update: draftEntries
      .filter((entry) => entry.canEdit && entry.id)
      .filter((entry) => {
        const baseline = baselineMap.get(entry.id);
        return (
          baseline &&
          (baseline.date !== entry.date ||
            baseline.time !== entry.time ||
            baseline.subjectId !== entry.subjectId)
        );
      })
      .map((entry) => ({
        id: entry.id,
        date: entry.date,
        time: entry.time,
        subject_id: entry.subjectId,
      })),
    delete: baselineEntries
      .filter((entry) => entry.canEdit && entry.id)
      .filter((entry) => !currentMap.has(entry.id))
      .map((entry) => entry.id),
  };
};

const buildSemesterPattern = ({ draftEntries, days }) => {
  const weekdayByDate = new Map((days || []).map((day) => [normalizeDate(day.date), day.weekday]));
  const seen = new Set();

  return draftEntries
    .filter((entry) => entry.canEdit)
    .map((entry) => ({
      weekday: weekdayByDate.get(entry.date),
      time: entry.time,
      subject_id: entry.subjectId,
      subjectName: entry.subjectName,
    }))
    .filter((entry) => Number.isInteger(entry.weekday) && entry.subject_id)
    .filter((entry) => {
      const key = `${entry.weekday}|${entry.time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((first, second) =>
      first.weekday === second.weekday
        ? first.time.localeCompare(second.time)
        : first.weekday - second.weekday
    );
};

function SchedulePlanner({ isDark = true }) {
  const initialWeek = useMemo(() => startOfWeek(new Date()), []);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [weekStartDate, setWeekStartDate] = useState(() => normalizeDate(initialWeek));
  const [plannerData, setPlannerData] = useState(null);
  const [baselineEntries, setBaselineEntries] = useState([]);
  const [draftEntries, setDraftEntries] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingPlanner, setIsLoadingPlanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [plannerError, setPlannerError] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [hoveredCellKey, setHoveredCellKey] = useState(null);
  const [plannerReloadKey, setPlannerReloadKey] = useState(0);
  const [semesterPreview, setSemesterPreview] = useState(null);
  const [previewFingerprint, setPreviewFingerprint] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplyingSemester, setIsApplyingSemester] = useState(false);
  const [semesterForm, setSemesterForm] = useState(() => ({
    startDate: normalizeDate(initialWeek),
    endDate: normalizeDate(addDays(initialWeek, 119)),
  }));

  const weekStart = useMemo(() => toDate(weekStartDate), [weekStartDate]);
  const weekEndDate = useMemo(
    () => normalizeDate(addDays(weekStart ?? initialWeek, 5)),
    [initialWeek, weekStart]
  );
  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.id) === String(selectedGroupId)) ?? null,
    [groups, selectedGroupId]
  );
  const days = useMemo(
    () => (Array.isArray(plannerData?.days) ? plannerData.days : []),
    [plannerData]
  );
  const subjects = useMemo(
    () =>
      Array.isArray(plannerData?.available_subjects)
        ? plannerData.available_subjects.map((subject) => ({
            id: subject.id,
            name: subject.name ?? 'Без названия',
            description: subject.description ?? '',
          }))
        : [],
    [plannerData]
  );
  const selectedSubject = useMemo(
    () => subjects.find((subject) => String(subject.id) === String(activeSubjectId)) ?? null,
    [activeSubjectId, subjects]
  );
  const timeSlots = useMemo(() => {
    const current = Array.isArray(plannerData?.time_slots) && plannerData.time_slots.length
      ? plannerData.time_slots.map((slot) => String(slot).slice(0, 5))
      : DEFAULT_TIME_SLOTS;
    return [...new Set(current)].sort((first, second) => first.localeCompare(second));
  }, [plannerData]);
  const entriesByCell = useMemo(() => {
    const map = new Map();
    draftEntries.forEach((entry) => map.set(getCellKey(entry.date, entry.time), entry));
    return map;
  }, [draftEntries]);
  const savePayload = useMemo(
    () =>
      selectedGroupId
        ? buildSavePayload({
            groupId: selectedGroupId,
            startDate: weekStartDate,
            endDate: weekEndDate,
            baselineEntries,
            draftEntries,
          })
        : null,
    [baselineEntries, draftEntries, selectedGroupId, weekEndDate, weekStartDate]
  );
  const hasUnsavedChanges = useMemo(
    () =>
      Boolean(
        savePayload &&
          (savePayload.create.length || savePayload.update.length || savePayload.delete.length)
      ),
    [savePayload]
  );
  const semesterPattern = useMemo(
    () => buildSemesterPattern({ draftEntries, days }),
    [days, draftEntries]
  );
  const semesterPayload = useMemo(
    () => ({
      group_id: Number(selectedGroupId),
      start_date: semesterForm.startDate,
      end_date: semesterForm.endDate,
      pattern: semesterPattern.map(({ weekday, time, subject_id }) => ({
        weekday,
        time,
        subject_id,
      })),
    }),
    [selectedGroupId, semesterForm.endDate, semesterForm.startDate, semesterPattern]
  );
  const semesterFingerprint = useMemo(() => JSON.stringify(semesterPayload), [semesterPayload]);
  const canPreviewSemester =
    Boolean(selectedGroupId) &&
    semesterPattern.length > 0 &&
    semesterForm.startDate &&
    semesterForm.endDate;
  const canApplySemester =
    Boolean(semesterPreview) &&
    previewFingerprint === semesterFingerprint &&
    Number(semesterPreview?.conflict_count ?? 0) === 0 &&
    Number(semesterPreview?.creatable_count ?? 0) > 0;

  useEffect(() => {
    setSemesterPreview(null);
    setPreviewFingerprint('');
  }, [semesterFingerprint]);

  useEffect(() => {
    const controller = new AbortController();
    const loadGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const data = await getSchedulePlanner({ signal: controller.signal });
        const list = Array.isArray(data?.groups) ? data.groups : [];
        if (controller.signal.aborted) return;
        setGroups(list);
        setSelectedGroupId((current) =>
          current && list.some((group) => String(group.id) === String(current))
            ? String(current)
            : list[0]
              ? String(list[0].id)
              : ''
        );
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError' || controller.signal.aborted) return;
        setGroups([]);
        setSelectedGroupId('');
        setPlannerError(formatRequestError(error, 'Не удалось загрузить группы для планировщика.'));
      } finally {
        if (!controller.signal.aborted) setIsLoadingGroups(false);
      }
    };
    loadGroups();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!selectedGroupId) {
      setPlannerData(null);
      setBaselineEntries([]);
      setDraftEntries([]);
      setActiveSubjectId(null);
      return () => controller.abort();
    }
    const loadPlanner = async () => {
      setIsLoadingPlanner(true);
      setPlannerError('');
      try {
        const data = await getSchedulePlanner({
          groupId: selectedGroupId,
          startDate: weekStartDate,
          endDate: weekEndDate,
          signal: controller.signal,
        });
        const normalizedEntries = Array.isArray(data?.entries)
          ? data.entries.map(normalizePlannerEntry)
          : [];
        if (controller.signal.aborted) return;
        setPlannerData(data);
        setBaselineEntries(normalizedEntries);
        setDraftEntries(normalizedEntries);
        setActiveSubjectId((current) =>
          current && data?.available_subjects?.some((subject) => String(subject.id) === String(current))
            ? current
            : data?.available_subjects?.[0]?.id ?? null
        );
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError' || controller.signal.aborted) return;
        setPlannerData(null);
        setBaselineEntries([]);
        setDraftEntries([]);
        setPlannerError(formatRequestError(error, 'Не удалось загрузить расписание для выбранной группы.'));
      } finally {
        if (!controller.signal.aborted) setIsLoadingPlanner(false);
      }
    };
    loadPlanner();
    return () => controller.abort();
  }, [plannerReloadKey, selectedGroupId, weekEndDate, weekStartDate]);

  const placeSubjectIntoCell = useCallback(({ subjectId, subjectName, date, time }) => {
    let blocked = false;
    setDraftEntries((current) => {
      const cellKey = getCellKey(date, time);
      if (current.some((entry) => getCellKey(entry.date, entry.time) === cellKey)) {
        blocked = true;
        return current;
      }
      return [
        ...current,
        {
          id: null,
          clientId: createDraftId(),
          date: normalizeDate(date),
          time: String(time).slice(0, 5),
          subjectId,
          subjectName,
          teacherName: 'Ваш предмет',
          teacherId: null,
          canEdit: true,
        },
      ];
    });
    if (blocked) {
      setStatusMessage({ type: 'error', text: 'Слот уже занят. Выберите другое время.' });
    }
  }, []);

  const applyDrop = useCallback(
    (currentDragState, cell) => {
      if (!currentDragState || !cell?.date || !cell?.time) return;

      if (currentDragState.type === 'subject') {
        const subject = subjects.find((item) => String(item.id) === String(currentDragState.subjectId));
        if (!subject) {
          setStatusMessage({ type: 'error', text: 'Предмет больше недоступен для этой группы.' });
          return;
        }
        placeSubjectIntoCell({
          subjectId: subject.id,
          subjectName: subject.name,
          date: cell.date,
          time: cell.time,
        });
        return;
      }

      if (currentDragState.type === 'entry') {
        let blocked = false;
        setDraftEntries((current) =>
          current.map((entry) => {
            if (entry.clientId !== currentDragState.entryClientId) return entry;
            const targetKey = getCellKey(cell.date, cell.time);
            if (getCellKey(entry.date, entry.time) === targetKey) return entry;

            const occupied = current.find(
              (candidate) =>
                candidate.clientId !== entry.clientId &&
                getCellKey(candidate.date, candidate.time) === targetKey
            );
            if (occupied) {
              blocked = true;
              return entry;
            }

            return { ...entry, date: normalizeDate(cell.date), time: String(cell.time).slice(0, 5) };
          })
        );

        if (blocked) {
          setStatusMessage({
            type: 'error',
            text: 'Слот уже занят. Перенесите занятие в свободную ячейку.',
          });
        }
      }
    },
    [placeSubjectIntoCell, subjects]
  );

  useEffect(() => {
    if (!dragState) return undefined;

    const handlePointerMove = (event) => {
      setDragPosition({ x: event.clientX, y: event.clientY });
      const cell = findCellFromPoint(event.clientX, event.clientY);
      setHoveredCellKey(cell ? getCellKey(cell.date, cell.time) : null);
    };

    const handlePointerUp = (event) => {
      const cell = findCellFromPoint(event.clientX, event.clientY);
      if (cell) applyDrop(dragState, cell);
      setDragState(null);
      setDragPosition(null);
      setHoveredCellKey(null);
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.body.style.userSelect = '';
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [applyDrop, dragState]);

  const startSubjectDrag = (subject, event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    setActiveSubjectId(subject.id);
    setDragState({ type: 'subject', subjectId: subject.id, subjectName: subject.name });
    setDragPosition({ x: event.clientX, y: event.clientY });
  };

  const startEntryDrag = (entry, event) => {
    if (!entry.canEdit) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    setDragState({ type: 'entry', entryClientId: entry.clientId, subjectName: entry.subjectName });
    setDragPosition({ x: event.clientX, y: event.clientY });
  };

  const removeEntry = (clientId) => {
    setDraftEntries((current) => current.filter((entry) => entry.clientId !== clientId));
  };

  const handleCellClick = (date, time) => {
    if (!selectedSubject) return;
    placeSubjectIntoCell({
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      date,
      time,
    });
  };

  const resetDraft = () => {
    setDraftEntries(baselineEntries.map((entry) => ({ ...entry })));
    setStatusMessage({ type: 'info', text: 'Черновик сброшен до сохранённого состояния.' });
  };

  const handleSave = async () => {
    if (!savePayload || !hasUnsavedChanges) {
      setStatusMessage({ type: 'info', text: 'Изменений для сохранения пока нет.' });
      return;
    }
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const response = await saveSchedulePlanner(savePayload);
      const normalizedEntries = Array.isArray(response?.entries)
        ? response.entries.map(normalizePlannerEntry)
        : [];
      setPlannerData(response);
      setBaselineEntries(normalizedEntries);
      setDraftEntries(normalizedEntries);
      setStatusMessage({ type: 'success', text: 'Расписание сохранено.' });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: formatRequestError(error, 'Не удалось сохранить изменения расписания.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewSemester = async () => {
    if (!canPreviewSemester) {
      setStatusMessage({
        type: 'info',
        text: 'Сначала соберите шаблон недели и укажите диапазон семестра.',
      });
      return;
    }
    setIsPreviewLoading(true);
    setStatusMessage(null);
    try {
      const response = await previewSemesterSchedule(semesterPayload);
      setSemesterPreview(response);
      setPreviewFingerprint(semesterFingerprint);
      setStatusMessage({
        type: 'success',
        text:
          Number(response.conflict_count) > 0
            ? 'Предпросмотр готов: есть конфликты.'
            : 'Предпросмотр готов. Можно применять шаблон.',
      });
    } catch (error) {
      setSemesterPreview(null);
      setPreviewFingerprint('');
      setStatusMessage({
        type: 'error',
        text: formatRequestError(error, 'Не удалось подготовить предпросмотр семестра.'),
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleApplySemester = async () => {
    if (!canApplySemester) {
      setStatusMessage({ type: 'info', text: 'Сначала выполните preview без конфликтов.' });
      return;
    }
    if (!window.confirm('Создать расписание на выбранный период по текущему шаблону недели?')) {
      return;
    }
    setIsApplyingSemester(true);
    setStatusMessage(null);
    try {
      const response = await applySemesterSchedule(semesterPayload);
      setSemesterPreview(null);
      setPreviewFingerprint('');
      setPlannerReloadKey((current) => current + 1);
      setStatusMessage({
        type: 'success',
        text: `Создано ${response.created_count} занятий на период семестра.`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: formatRequestError(error, 'Не удалось применить шаблон на семестр.'),
      });
    } finally {
      setIsApplyingSemester(false);
    }
  };

  const summary = {
    total: draftEntries.length,
    own: draftEntries.filter((entry) => entry.canEdit).length,
    locked: draftEntries.filter((entry) => !entry.canEdit).length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Планировщик расписания
            </h1>
            <p className={`mt-2 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Перетаскивайте свои предметы в сетку недели. В базу изменения попадут только после сохранения.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setWeekStartDate(normalizeDate(addDays(weekStart ?? initialWeek, -7)))}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                isDark ? 'border-gray-700 bg-gray-800/60 text-gray-200' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Неделя назад
            </button>
            <div className={`px-4 py-2.5 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800/50 text-gray-200' : 'border-gray-200 bg-white text-gray-700'}`}>
              {formatWeekLabel(weekStartDate, weekEndDate)}
            </div>
            <button
              type="button"
              onClick={() => setWeekStartDate(normalizeDate(addDays(weekStart ?? initialWeek, 7)))}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                isDark ? 'border-gray-700 bg-gray-800/60 text-gray-200' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              Следующая неделя
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${
              statusMessage.type === 'success'
                ? isDark
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : statusMessage.type === 'error'
                  ? isDark
                    ? 'border-red-500/40 bg-red-500/10 text-red-200'
                    : 'border-red-200 bg-red-50 text-red-700'
                  : isDark
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            ) : (
              <Info className="w-5 h-5 mt-0.5 shrink-0" />
            )}
            <p className="text-sm leading-6">{statusMessage.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <section className={`${cardBaseClass} ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Группа и шаблон</h2>
                <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Выберите группу и соберите неделю как черновик.
                </p>
              </div>
              <CalendarDays className={`w-6 h-6 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="sm:col-span-2">
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Группа</span>
                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className={`mt-2 w-full rounded-xl border px-4 py-3 ${
                    isDark ? 'border-gray-600 bg-gray-900/70 text-white' : 'border-gray-200 bg-white text-gray-900'
                  }`}
                >
                  {isLoadingGroups && <option value="">Загрузка групп...</option>}
                  {!isLoadingGroups && groups.length === 0 && <option value="">Группы не найдены</option>}
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} {group.course ? `• ${group.course} курс` : ''} {!group.is_owner ? '• внешний поток' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div className={`rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Состояние</p>
                <p className={`mt-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {hasUnsavedChanges ? 'Есть черновик' : 'Все сохранено'}
                </p>
              </div>
            </div>

            {selectedGroup && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Группа</p>
                  <p className={`mt-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedGroup.name}</p>
                </div>
                <div className={`rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Курс</p>
                  <p className={`mt-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedGroup.course || '—'}</p>
                </div>
                <div className={`rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Специальность</p>
                  <p className={`mt-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedGroup.specialty || '—'}</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className={`px-3 py-2 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900/40 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>Всего: {summary.total}</div>
              <div className={`px-3 py-2 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900/40 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>Мои: {summary.own}</div>
              <div className={`px-3 py-2 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900/40 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>Заблокировано: {summary.locked}</div>
              <button
                type="button"
                onClick={resetDraft}
                disabled={!hasUnsavedChanges}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${
                  hasUnsavedChanges
                    ? isDark
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-800'
                    : 'bg-gray-400/60 text-white cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Сбросить
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${
                  hasUnsavedChanges && !isSaving ? 'bg-blue-600 text-white' : 'bg-gray-400/60 text-white cursor-not-allowed'
                }`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Сохранить
              </button>
            </div>
          </section>

          <section className={`${cardBaseClass} ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Семестр</h2>
                <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Сначала preview, затем применение без конфликтов.
                </p>
              </div>
              <Sparkles className={`w-6 h-6 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label>
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Дата начала</span>
                <input
                  type="date"
                  value={semesterForm.startDate}
                  onChange={(event) => setSemesterForm((current) => ({ ...current, startDate: event.target.value }))}
                  className={`mt-2 w-full rounded-xl border px-4 py-3 ${
                    isDark ? 'border-gray-600 bg-gray-900/70 text-white' : 'border-gray-200 bg-white text-gray-900'
                  }`}
                />
              </label>
              <label>
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Дата конца</span>
                <input
                  type="date"
                  value={semesterForm.endDate}
                  onChange={(event) => setSemesterForm((current) => ({ ...current, endDate: event.target.value }))}
                  className={`mt-2 w-full rounded-xl border px-4 py-3 ${
                    isDark ? 'border-gray-600 bg-gray-900/70 text-white' : 'border-gray-200 bg-white text-gray-900'
                  }`}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePreviewSemester}
                disabled={!canPreviewSemester || isPreviewLoading}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${
                  canPreviewSemester && !isPreviewLoading ? 'bg-amber-500 text-white' : 'bg-gray-400/60 text-white cursor-not-allowed'
                }`}
              >
                {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
                Preview
              </button>
              <button
                type="button"
                onClick={handleApplySemester}
                disabled={!canApplySemester || isApplyingSemester}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl ${
                  canApplySemester && !isApplyingSemester ? 'bg-emerald-600 text-white' : 'bg-gray-400/60 text-white cursor-not-allowed'
                }`}
              >
                {isApplyingSemester ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Применить
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Шаблон</p>
                <p className={`mt-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{semesterPattern.length} слотов</p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Создастся</p>
                <p className={`mt-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{semesterPreview?.creatable_count ?? 0}</p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
                <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Конфликты</p>
                <p className={`mt-2 font-semibold ${Number(semesterPreview?.conflict_count ?? 0) > 0 ? 'text-red-500' : isDark ? 'text-white' : 'text-gray-900'}`}>{semesterPreview?.conflict_count ?? 0}</p>
              </div>
            </div>

            {semesterPreview?.conflicts?.length > 0 && (
              <div className={`mt-4 rounded-xl border p-4 ${isDark ? 'border-red-500/30 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                <div className="space-y-2">
                  {semesterPreview.conflicts.slice(0, 4).map((conflict) => (
                    <div key={`${conflict.date}-${conflict.time}-${conflict.subject_name}`} className={`rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-red-500/20 bg-gray-900/40 text-gray-200' : 'border-red-200 bg-white text-gray-700'}`}>
                      {conflict.date} {String(conflict.time).slice(0, 5)} • {conflict.subject_name} • занято: {conflict.occupied_by}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className={`${cardBaseClass} ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} p-5 sm:p-6`}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Палитра предметов</h2>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Перетащите предмет в ячейку или выберите его и нажмите по свободному слоту.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {selectedSubject && (
                <div className={`px-3 py-2 rounded-xl border ${isDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                  Выбран предмет: {selectedSubject.name}
                </div>
              )}
              <button
                type="button"
                onClick={() => setActiveSubjectId(null)}
                className={`px-3 py-2 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900/50 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}
              >
                Сбросить выбор
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subjects.map((subject) => {
              const isSelected = String(subject.id) === String(activeSubjectId);
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => setActiveSubjectId(subject.id)}
                  onPointerDown={(event) => startSubjectDrag(subject, event)}
                  className={`text-left rounded-2xl border p-4 transition-all duration-300 touch-none ${
                    isSelected
                      ? isDark
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-blue-300 bg-blue-50'
                      : isDark
                        ? 'border-gray-700 bg-gray-900/40'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{subject.name}</p>
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{subject.description || 'Описание не указано.'}</p>
                    </div>
                    <Grip className={`w-5 h-5 shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`${cardBaseClass} ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} p-5 sm:p-6`}>
          {plannerError && (
            <div className={`mb-4 rounded-xl border px-4 py-3 ${isDark ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {plannerError}
            </div>
          )}

          {isLoadingPlanner ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className={`w-10 h-10 animate-spin ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
              <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Загружаем расписание...</p>
            </div>
          ) : !selectedGroupId ? (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'}`}>
              Выберите группу, чтобы открыть сетку расписания.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[980px] gap-px rounded-2xl overflow-hidden" style={{ gridTemplateColumns: `96px repeat(${days.length || 6}, minmax(160px, 1fr))` }}>
                <div className={`px-4 py-4 ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'} text-xs font-semibold uppercase tracking-wide`}>
                  Время
                </div>
                {days.map((day) => (
                  <div key={day.date} className={`px-4 py-4 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="font-semibold capitalize">{formatDayLabel(day.date)}</p>
                  </div>
                ))}
                {timeSlots.map((time) => (
                  <PlannerGridRow
                    key={time}
                    time={time}
                    days={days}
                    entriesByCell={entriesByCell}
                    dragState={dragState}
                    hoveredCellKey={hoveredCellKey}
                    isDark={isDark}
                    onCellClick={handleCellClick}
                    onEntryDrag={startEntryDrag}
                    onRemoveEntry={removeEntry}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {dragState && dragPosition && (
        <div
          className={`fixed left-0 top-0 z-50 pointer-events-none rounded-xl border px-4 py-3 shadow-2xl ${isDark ? 'border-blue-500/40 bg-gray-900/95 text-white' : 'border-blue-200 bg-white text-gray-900'}`}
          style={{ transform: `translate(${dragPosition.x}px, ${dragPosition.y}px)` }}
        >
          <div className="flex items-center gap-2">
            <Grip className={`w-4 h-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
            <span className="text-sm font-semibold">{dragState.subjectName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const PlannerGridRow = ({
  time,
  days,
  entriesByCell,
  dragState,
  hoveredCellKey,
  isDark,
  onCellClick,
  onEntryDrag,
  onRemoveEntry,
}) => (
  <>
    <div className={`px-4 py-5 ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'} text-sm font-semibold`}>
      {time}
    </div>
    {days.map((day) => {
      const cellKey = getCellKey(day.date, time);
      const entry = entriesByCell.get(cellKey);
      const isHovered = hoveredCellKey === cellKey;
      const canDropIntoCell = !entry || (dragState?.type === 'entry' && entry.clientId === dragState.entryClientId);
      const cellTone = isHovered
        ? canDropIntoCell
          ? isDark
            ? 'border-blue-500/50 bg-blue-500/10'
            : 'border-blue-300 bg-blue-50'
          : isDark
            ? 'border-red-500/40 bg-red-500/10'
            : 'border-red-200 bg-red-50'
        : isDark
          ? 'border-gray-800 bg-gray-950/70'
          : 'border-gray-200 bg-white';

      return (
        <div
          key={cellKey}
          role="button"
          tabIndex={0}
          data-schedule-cell="true"
          data-date={normalizeDate(day.date)}
          data-time={time}
          onClick={() => onCellClick(day.date, time)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onCellClick(day.date, time);
            }
          }}
          className={`min-h-[122px] border p-3 text-left transition-all duration-200 cursor-pointer ${cellTone}`}
        >
          {!entry && (
            <div className={`h-full rounded-xl border border-dashed flex items-center justify-center text-center px-4 ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
              <span className="text-sm">Свободный слот</span>
            </div>
          )}
          {entry && (
            <div
              onPointerDown={(event) => onEntryDrag(entry, event)}
              className={`h-full rounded-xl border p-3 touch-none ${
                entry.canEdit
                  ? isDark
                    ? 'border-blue-500/30 bg-blue-500/10'
                    : 'border-blue-200 bg-blue-50'
                  : isDark
                    ? 'border-gray-700 bg-gray-900/60'
                    : 'border-gray-200 bg-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{entry.subjectName}</p>
                  <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{entry.canEdit ? 'Ваш предмет' : entry.teacherName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.canEdit ? (
                    <Grip className={`w-4 h-4 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                  ) : (
                    <Lock className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  )}
                  {entry.canEdit && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveEntry(entry.clientId);
                      }}
                      className={`p-1 rounded-lg ${isDark ? 'hover:bg-red-500/10 text-red-300' : 'hover:bg-red-100 text-red-600'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {!entry.canEdit && (
                <div className={`mt-3 inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'}`}>
                  <Lock className="w-3.5 h-3.5" />
                  Занято другим преподавателем
                </div>
              )}
            </div>
          )}
        </div>
      );
    })}
  </>
);

export default SchedulePlanner;
