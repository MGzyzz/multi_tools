import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Save,
  ShieldAlert,
  UserRound,
  XCircle,
} from 'lucide-react';
import { editAttendance } from '../../api/editAttendance';
import { getStudentJournal } from '../../api/getStudentJournal';

const formatShortDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatMarkedAt = (value) => {
  if (!value) return 'Не отмечено';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Не отмечено';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const normalizeScoreInput = (value) => {
  if (value == null || value === '') return '';
  return String(value);
};

const parseScoreValue = (rawValue) => {
  const normalized = String(rawValue ?? '').trim().replace(',', '.');
  if (!normalized) {
    return { value: null, error: '' };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { value: null, error: 'Оценка должна быть числом.' };
  }
  if (parsed < 0 || parsed > 100) {
    return { value: null, error: 'Допустимый диапазон оценки: от 0 до 100.' };
  }

  return {
    value: Number(parsed.toFixed(2)),
    error: '',
  };
};

const rowsEqual = (currentRow, baselineRow) => {
  if (!baselineRow) return false;

  const currentScore = normalizeScoreInput(currentRow.scoreInput).replace(',', '.');
  const baselineScore = normalizeScoreInput(baselineRow.scoreInput).replace(',', '.');

  return currentRow.presense === baselineRow.presense && currentScore === baselineScore;
};

const getRiskStatusMeta = (status, isDark) => {
  const palette = {
    OPEN: isDark ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200',
    ACKNOWLEDGED: isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
    ESCALATED: isDark ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200',
    RESOLVED: isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const labels = {
    OPEN: 'Открыт',
    ACKNOWLEDGED: 'Подтвержден',
    ESCALATED: 'Эскалирован',
    RESOLVED: 'Закрыт',
  };

  return {
    className: palette[status] || (isDark ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200'),
    label: labels[status] || status || 'Статус неизвестен',
  };
};

const SummaryCard = ({ label, value, hint, accentClass, isDark }) => (
  <div className={`${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-white/50'} rounded-2xl border p-5 shadow-lg backdrop-blur-sm`}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className={`mt-2 text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
      <div className={`h-12 w-12 rounded-2xl ${accentClass}`} />
    </div>
    <p className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
      {hint}
    </p>
  </div>
);

const StudentJournal = ({ isDark = true }) => {
  const navigate = useNavigate();
  const { groupId, subjectId, studentId } = useParams();

  const [pageData, setPageData] = useState(null);
  const [journalRows, setJournalRows] = useState([]);
  const [baselineRows, setBaselineRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [savingRows, setSavingRows] = useState({});
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    const loadJournal = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await getStudentJournal(groupId, subjectId, studentId, controller.signal);
        const normalizedRows = Array.isArray(data?.journal)
          ? data.journal.map((row) => ({
              ...row,
              scoreInput: normalizeScoreInput(row.score),
            }))
          : [];

        if (controller.signal.aborted) return;

        setPageData(data);
        setJournalRows(normalizedRows);
        setBaselineRows(normalizedRows);
        setRowErrors({});
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error('Failed to load student journal:', error);
        if (controller.signal.aborted) return;
        setLoadError('Не удалось загрузить детальную карточку студента.');
        setPageData(null);
        setJournalRows([]);
        setBaselineRows([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadJournal();
    return () => controller.abort();
  }, [groupId, subjectId, studentId, refreshKey]);

  const baselineMap = useMemo(
    () => new Map(baselineRows.map((row) => [row.id, row])),
    [baselineRows]
  );

  const summary = useMemo(() => {
    const totalLessons = journalRows.length;
    const attendedLessons = journalRows.filter((row) => row.presense).length;
    const missedLessons = totalLessons - attendedLessons;

    const scoreValues = journalRows
      .map((row) => parseScoreValue(row.scoreInput))
      .filter((item) => !item.error && item.value != null)
      .map((item) => item.value);

    const averageScore = scoreValues.length
      ? (scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length).toFixed(1)
      : '—';

    const attendancePercent = totalLessons
      ? Math.round((attendedLessons / totalLessons) * 100)
      : 0;

    const openRisks = Array.isArray(pageData?.risk_incidents)
      ? pageData.risk_incidents.filter((item) => item.status !== 'RESOLVED').length
      : 0;

    return {
      totalLessons,
      attendedLessons,
      missedLessons,
      gradedLessons: scoreValues.length,
      averageScore,
      attendancePercent,
      openRisks,
    };
  }, [journalRows, pageData]);

  const handlePresenceChange = (rowId, nextPresence) => {
    setJournalRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, presense: nextPresence } : row))
    );
    setRowErrors((prev) => ({ ...prev, [rowId]: '' }));
  };

  const handleScoreChange = (rowId, nextValue) => {
    setJournalRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, scoreInput: nextValue } : row))
    );
    setRowErrors((prev) => ({ ...prev, [rowId]: '' }));
  };

  const handleResetRow = (rowId) => {
    const baselineRow = baselineMap.get(rowId);
    if (!baselineRow) return;

    setJournalRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...baselineRow } : row))
    );
    setRowErrors((prev) => ({ ...prev, [rowId]: '' }));
  };

  const handleSaveRow = async (rowId) => {
    const currentRow = journalRows.find((row) => row.id === rowId);
    const baselineRow = baselineMap.get(rowId);

    if (!currentRow || !baselineRow) return;

    const parsedScore = parseScoreValue(currentRow.scoreInput);
    if (parsedScore.error) {
      setRowErrors((prev) => ({ ...prev, [rowId]: parsedScore.error }));
      return;
    }

    const payload = {};

    if (currentRow.presense !== baselineRow.presense) {
      payload.presense = currentRow.presense;
    }

    const baselineScore = parseScoreValue(baselineRow.scoreInput);
    if (parsedScore.value !== baselineScore.value) {
      payload.score = parsedScore.value;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    setSavingRows((prev) => ({ ...prev, [rowId]: true }));
    setRowErrors((prev) => ({ ...prev, [rowId]: '' }));

    try {
      const response = await editAttendance(rowId, payload);
      const updatedAttendance = response?.attendance;

      const nextRow = {
        ...currentRow,
        presense: updatedAttendance?.presense ?? currentRow.presense,
        marked_at:
          updatedAttendance?.marked_at ??
          (Object.prototype.hasOwnProperty.call(payload, 'presense')
            ? new Date().toISOString()
            : currentRow.marked_at),
        scoreInput: normalizeScoreInput(
          updatedAttendance?.score ?? (parsedScore.value == null ? '' : parsedScore.value)
        ),
      };

      setJournalRows((prev) => prev.map((row) => (row.id === rowId ? nextRow : row)));
      setBaselineRows((prev) => prev.map((row) => (row.id === rowId ? nextRow : row)));
    } catch (error) {
      console.error('Failed to save student journal row:', error);
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        'Не удалось сохранить изменения по занятию.';
      setRowErrors((prev) => ({ ...prev, [rowId]: message }));
    } finally {
      setSavingRows((prev) => ({ ...prev, [rowId]: false }));
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/groups');
  };

  const cardClass = `${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-white/50'} rounded-2xl border shadow-lg backdrop-blur-sm`;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto min-h-[60vh] flex flex-col items-center justify-center text-center">
          <Loader2 className={`w-12 h-12 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <p className={`mt-4 text-base font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            Загружается детальная карточка студента...
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className={`${cardClass} p-8 text-center`}>
            <AlertTriangle className={`w-14 h-14 mx-auto ${isDark ? 'text-red-300' : 'text-red-600'}`} />
            <h1 className={`mt-4 text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Страница недоступна
            </h1>
            <p className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {loadError}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setRefreshKey((prev) => prev + 1)}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                Повторить
              </button>
              <button
                type="button"
                onClick={handleBack}
                className={`px-5 py-3 rounded-xl border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'} font-medium transition-colors cursor-pointer`}
              >
                Вернуться к группам
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const student = pageData?.student ?? {};
  const group = pageData?.group ?? {};
  const subject = pageData?.subject ?? {};
  const riskIncidents = Array.isArray(pageData?.risk_incidents) ? pageData.risk_incidents : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={handleBack}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-white'} transition-colors cursor-pointer`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>
            <h1 className={`mt-4 text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {student.full_name || 'Карточка студента'}
            </h1>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Детальная страница преподавателя: посещаемость, оценки и текущие риски по выбранному предмету.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-gray-800 text-gray-200 border border-gray-700' : 'bg-white text-gray-700 border border-gray-200'}`}>
              Группа: {group.name || '—'}
            </span>
            <span className={`px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-gray-800 text-gray-200 border border-gray-700' : 'bg-white text-gray-700 border border-gray-200'}`}>
              Предмет: {subject.name || '—'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard
            label="Посещаемость"
            value={`${summary.attendancePercent}%`}
            hint={`${summary.attendedLessons} из ${summary.totalLessons} занятий отмечены как посещенные.`}
            accentClass="bg-gradient-to-br from-blue-500/30 to-cyan-500/10"
            isDark={isDark}
          />
          <SummaryCard
            label="Пропуски"
            value={summary.missedLessons}
            hint="Число занятий, где студент отмечен как отсутствующий."
            accentClass="bg-gradient-to-br from-rose-500/30 to-orange-500/10"
            isDark={isDark}
          />
          <SummaryCard
            label="Средняя оценка"
            value={summary.averageScore}
            hint={`${summary.gradedLessons} занятий уже содержат оценку преподавателя.`}
            accentClass="bg-gradient-to-br from-emerald-500/30 to-green-500/10"
            isDark={isDark}
          />
          <SummaryCard
            label="Открытые риски"
            value={summary.openRisks}
            hint="Инциденты, по которым преподавателю ещё нужно действие."
            accentClass="bg-gradient-to-br from-amber-500/30 to-yellow-500/10"
            isDark={isDark}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Журнал посещаемости и оценок
                  </h2>
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Пока журнал посещаемости используется и как рабочий журнал оценок по занятиям.
                  </p>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Всего записей: {journalRows.length}
                </div>
              </div>

              <div className="space-y-4">
                {journalRows.map((row) => {
                  const baselineRow = baselineMap.get(row.id);
                  const isDirty = !rowsEqual(row, baselineRow);
                  const isSaving = savingRows[row.id] === true;
                  const rowError = rowErrors[row.id];

                  return (
                    <div
                      key={row.id}
                      className={`${isDark ? 'bg-gray-900/40 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border p-4 transition-all duration-300`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {formatShortDate(row.date)}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                              <Clock3 className="w-3.5 h-3.5" />
                              {String(row.time || '').slice(0, 5) || '—'}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
                                row.presense
                                  ? isDark
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isDark
                                    ? 'bg-red-500/10 text-red-300 border-red-500/20'
                                    : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {row.presense ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {row.presense ? 'Был на занятии' : 'Не был на занятии'}
                            </span>
                          </div>
                          <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Последняя отметка: {formatMarkedAt(row.marked_at)}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                          <div>
                            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Посещение
                            </label>
                            <div className={`inline-flex rounded-xl border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} p-1`}>
                              <button
                                type="button"
                                onClick={() => handlePresenceChange(row.id, true)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                  row.presense
                                    ? 'bg-emerald-600 text-white'
                                    : isDark
                                      ? 'text-gray-300 hover:bg-gray-700'
                                      : 'text-gray-700 hover:bg-white'
                                }`}
                              >
                                Был
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePresenceChange(row.id, false)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                  !row.presense
                                    ? 'bg-red-600 text-white'
                                    : isDark
                                      ? 'text-gray-300 hover:bg-gray-700'
                                      : 'text-gray-700 hover:bg-white'
                                }`}
                              >
                                Не был
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Оценка
                            </label>
                            <input
                              type="text"
                              value={row.scoreInput}
                              onChange={(event) => handleScoreChange(row.id, event.target.value)}
                              placeholder="0-100"
                              className={`w-28 px-3 py-2.5 rounded-xl border ${
                                rowError
                                  ? 'border-red-500 focus:ring-red-500/40'
                                  : isDark
                                    ? 'border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:ring-blue-500/40'
                                    : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500/40'
                              } focus:outline-none focus:ring-2 transition-all`}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveRow(row.id)}
                              disabled={!isDirty || isSaving}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Сохранить
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResetRow(row.id)}
                              disabled={!isDirty || isSaving}
                              className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                                isDark
                                  ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              } disabled:opacity-50`}
                            >
                              Отменить
                            </button>
                          </div>
                        </div>
                      </div>

                      {rowError && (
                        <div className={`mt-3 rounded-xl px-4 py-3 text-sm ${isDark ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {rowError}
                        </div>
                      )}
                    </div>
                  );
                })}

                {journalRows.length === 0 && (
                  <div className={`rounded-2xl border border-dashed p-8 text-center ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                    Пока нет занятий по этому предмету для выбранной группы.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex items-start gap-4">
                {student.face_image ? (
                  <img
                    src={student.face_image}
                    alt={student.full_name || 'Student'}
                    className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                    {(student.first_name?.[0] || student.last_name?.[0] || 'S').toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {student.full_name || 'Студент'}
                  </h2>
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Возраст: {student.age ?? '—'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Mail className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span>{student.email || 'Email не указан'}</span>
                </div>
                <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Phone className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span>{student.phone || 'Телефон не указан'}</span>
                </div>
                <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <MessageCircle className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span>{student.telegram_username || 'Telegram не указан'}</span>
                </div>
                <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <UserRound className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span>ID студента: {student.id ?? '—'}</span>
                </div>
              </div>

              <div className={`mt-6 rounded-2xl p-4 ${isDark ? 'bg-gray-900/40 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <BookOpen className={`w-5 h-5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Контекст страницы
                  </p>
                </div>
                <p className={`mt-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {subject.name || 'Предмет не выбран'} • {group.name || 'Группа не выбрана'}
                </p>
                <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Оценки сохраняются прямо в журнале занятий, без отдельной временной сущности.
                </p>
              </div>
            </div>

            <div className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-5 h-5 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Риски по студенту
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                {riskIncidents.map((incident) => {
                  const statusMeta = getRiskStatusMeta(incident.status, isDark);
                  return (
                    <div
                      key={incident.id}
                      className={`rounded-2xl border p-4 ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {incident.problem || incident.reason || 'Риск без описания'}
                          </p>
                          <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {incident.metric_name
                              ? `${incident.metric_name}: ${incident.metric_value ?? '—'} / ${incident.threshold_value ?? '—'} ${incident.metric_unit || ''}`.trim()
                              : 'Метрика не указана'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-xs font-medium ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className={`mt-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Создано: {formatMarkedAt(incident.created_at)}
                      </p>
                    </div>
                  );
                })}

                {riskIncidents.length === 0 && (
                  <div className={`rounded-2xl border border-dashed p-5 text-sm ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                    По выбранному предмету сейчас нет открытых или исторических risk incidents.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentJournal;
