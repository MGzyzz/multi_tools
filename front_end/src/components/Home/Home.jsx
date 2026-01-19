import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarX,
  ChevronRight,
  Clock,
  Info
} from 'lucide-react';
import { getScheduleList } from '../../api/getScheduleList';
import { SkeletonSession } from '../Loader/Loader';

const Home = ({ isDark = true }) => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getScheduleList();
        setSchedule(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error loading schedule:', e);
        setError('Не удалось загрузить расписание');
        setSchedule([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const recentSessions = useMemo(() => {
    const now = new Date();
    // Получаем локальную дату в формате YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    console.log('📅 Текущая дата (локальная):', today);
    console.log('📦 Всего расписаний:', schedule.length);

    const toSeconds = (hhmmss = '00:00:00') => {
      const [h = 0, m = 0, s = 0] = hhmmss.split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };

    const toHHMM = (hhmmss = '00:00:00') => hhmmss.slice(0, 5);

    // Фильтруем только сегодняшние занятия
    const todaySchedule = (schedule || []).filter(item => {
      const itemDate = item?.date;
      console.log('🔍 Проверка:', {
        itemDate,
        today,
        match: itemDate === today,
        group: item?.group?.name
      });
      return itemDate === today;
    });

    console.log('✅ Отфильтровано занятий:', todaySchedule.length);

    const result = todaySchedule
      .map((item) => {
        const lessonSeconds = toSeconds(item?.time);
        const diff = nowSeconds - lessonSeconds;

        let status = 'upcoming';
        if (diff >= 0 && diff <= 90 * 60) status = 'active';
        else if (diff > 90 * 60) status = 'completed';

        const students = item?.group?.students || [];
        return {
          id: item?.id,
          group: item?.group?.name ?? '-',
          time: toHHMM(item?.time ?? '00:00:00'),
          present: 0,
          total: students.length,
          status,
          timeSeconds: lessonSeconds
        };
      })
      .sort((a, b) => a.timeSeconds - b.timeSeconds);

    console.log('📋 Финальный список занятий:', result);
    return result;
  }, [schedule]);

  // Ограничиваем количество отображаемых занятий
  const MAX_VISIBLE_SESSIONS = 5;
  const displayedSessions = showAll
    ? recentSessions
    : recentSessions.slice(0, MAX_VISIBLE_SESSIONS);
  const hasMore = recentSessions.length > MAX_VISIBLE_SESSIONS;
  const activeSession = recentSessions.find((session) => session.status === 'active');
  const nextSession = recentSessions.find((session) => session.status === 'upcoming');
  const focusSession = activeSession || nextSession || null;
  const focusTitle = activeSession ? 'Идет сейчас' : nextSession ? 'Следующее занятие' : 'Сегодня без занятий';
  const focusBadge = activeSession ? 'Активно' : nextSession ? 'Ожидается' : 'Свободное окно';
  const focusBadgeStyle = activeSession
    ? isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
    : nextSession
      ? isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
      : isDark ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-600';
  const cardClass = `${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-lg`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
              Рабочий день преподавателя
            </h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Быстрый доступ к занятиям и отметкам студентов
            </p>
          </div>
          <div className={`px-4 py-2 rounded-xl border ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'} text-sm`}>
            {todayLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`${cardClass} lg:col-span-2 p-5 sm:p-6 flex flex-col`}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Сегодняшние занятия
              </h3>
              {!isLoading && !error && recentSessions.length > 0 && (
                <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                  } font-medium`}>
                  {recentSessions.length}
                </span>
              )}
            </div>

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3 sm:space-y-4">
              <SkeletonSession isDark={isDark} />
              <SkeletonSession isDark={isDark} />
              <SkeletonSession isDark={isDark} />
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-sm font-medium mb-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className={`text-xs ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} cursor-pointer`}
              >
                Попробовать снова
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && recentSessions.length === 0 && (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <CalendarX className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-base font-medium mb-1">Расписание на сегодня пусто</p>
              <p className="text-sm">Занятий не запланировано</p>
            </div>
          )}

          {/* Schedule list with scroll */}
          {!isLoading && !error && recentSessions.length > 0 && (
            <>
              <div className={`flex-1 ${showAll ? 'max-h-[500px] overflow-y-auto' : ''
                } space-y-3 sm:space-y-4 pr-1 ${isDark
                  ? 'scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50'
                  : 'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
                }`}>
                {displayedSessions.map((session, index) => (
                  <div
                    key={session.id || index}
                    onClick={() => navigate(`/attendance/scan/${session.id}`)}
                    className={`${isDark ? 'bg-gray-900/40 border-gray-700 hover:border-blue-500/40' : 'bg-white border-gray-200 hover:border-blue-200'} rounded-2xl p-4 sm:p-5 border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 h-10 w-1.5 rounded-full ${session.status === 'active'
                              ? isDark ? 'bg-green-400' : 'bg-green-600'
                              : session.status === 'completed'
                                ? isDark ? 'bg-blue-400' : 'bg-blue-600'
                                : isDark ? 'bg-gray-500' : 'bg-gray-400'
                            }`}
                        />
                        <div>
                          <p className={`text-sm sm:text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {session.group}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700/60 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                              {session.time}
                            </span>
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Студентов: {session.total}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium ${session.status === 'active'
                            ? isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                            : session.status === 'completed'
                              ? isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                              : isDark ? 'bg-gray-500/20 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {session.status === 'active' ? 'Идет' : session.status === 'completed' ? 'Завершено' : 'Скоро'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Отмечено: {session.present}/{session.total}
                      </span>
                      {session.status === 'active' && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${isDark
                            ? 'border-blue-500/40 text-blue-300 bg-blue-500/10'
                            : 'border-blue-200 text-blue-700 bg-blue-50'
                            }`}
                        >
                          Продолжить
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                  </div>
                ))}
              </div>

              {/* Show More/Less Button */}
              {hasMore && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className={`mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border ${isDark
                      ? 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    } cursor-pointer transition-all duration-300 text-sm font-medium`}
                >
                  <span>{showAll ? `Скрыть` : `Показать все (${recentSessions.length})`}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showAll ? 'rotate-90' : ''}`} />
                </button>
              )}
            </>
          )}
          </div>

          <div className="space-y-6">
            <div className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Фокус дня
                  </p>
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {focusTitle}
                  </h3>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg ${focusBadgeStyle}`}>
                  {focusBadge}
                </span>
              </div>

              {focusSession ? (
                <button
                  type="button"
                  onClick={() => navigate(`/attendance/scan/${focusSession.id}`)}
                  className={`w-full text-left rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900/40 hover:bg-gray-900/60' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    } transition-all duration-300 p-4 cursor-pointer`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {focusSession.group}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {focusSession.time}
                      </p>
                    </div>
                    <Clock className={`w-5 h-5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                  </div>
                  <div className={`mt-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Нажмите, чтобы перейти к отметкам
                  </div>
                </button>
              ) : (
                <div className={`rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'} p-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  В расписании нет занятий. Можно подготовить материалы или обновить планы.
                </div>
              )}
            </div>

            <div className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex items-center gap-2 mb-3">
                <Info className={`w-5 h-5 ${isDark ? 'text-purple-300' : 'text-purple-600'}`} />
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Подсказки
                </h3>
              </div>
              <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <li>Нажмите на занятие, чтобы открыть отметки.</li>
                <li>Статус «Идет» означает, что можно продолжить отметку.</li>
                <li>Список автоматически обновляется после изменения расписания.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
