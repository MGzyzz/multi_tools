import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Users,
  BarChart3,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Download,
  Settings,
  Calendar,
  CalendarX,
  ChevronRight
} from 'lucide-react';
import { getScheduleList } from '../../api/getScheduleList';
import Loader, { SkeletonCard, SkeletonSession } from '../Loader/Loader';

const Home = ({ isDark = true }) => {
  const navigate = useNavigate();
  const stats = [
    { icon: Users, label: 'Всего студентов', value: '245', trend: '+12', color: 'from-blue-500 to-cyan-500' },
    { icon: CheckCircle, label: 'Присутствуют', value: '198', trend: '+5', color: 'from-green-500 to-emerald-500' },
    { icon: Clock, label: 'Опоздали', value: '8', trend: '-2', color: 'from-orange-500 to-yellow-500' },
    { icon: AlertCircle, label: 'Отсутствуют', value: '39', trend: '+7', color: 'from-red-500 to-pink-500' }
  ];

  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

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

  const quickTools = [
    { icon: Camera, title: 'Начать сканирование', description: 'Запустить проверку посещаемости', gradient: 'from-blue-500 to-blue-600', action: 'scan' },
    { icon: Download, title: 'Экспорт данных', description: 'Выгрузить отчет с аналитикой', gradient: 'from-green-500 to-green-600', action: 'export' },
    { icon: Users, title: 'Управление группами', description: 'Редактировать списки студентов', gradient: 'from-purple-500 to-purple-600', action: 'groups' },
    { icon: Calendar, title: 'Расписание', description: 'Просмотр занятий на неделю', gradient: 'from-orange-500 to-orange-600', action: 'schedule' },
    { icon: BarChart3, title: 'Аналитика', description: 'Статистика и отчеты', gradient: 'from-pink-500 to-pink-600', action: 'analytics' },
    { icon: Settings, title: 'Настройки', description: 'Конфигурация системы', gradient: 'from-gray-500 to-gray-600', action: 'settings' }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            } hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl`}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span
                className={`text-xs sm:text-sm font-semibold px-2 py-1 rounded-lg ${
                  stat.trend.startsWith('+')
                    ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                    : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                }`}
              >
                {stat.trend}
              </span>
            </div>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1 sm:mb-2`}>{stat.label}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Quick Tools */}
        <div className="lg:col-span-2">
          <div
            className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-5 sm:p-6 border ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            } shadow-lg`}
          >
            <h3 className={`text-lg sm:text-xl font-bold mb-4 sm:mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Быстрые инструменты
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {quickTools.map((tool, index) => (
                <button
                  key={index}
                  className={`${isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} rounded-xl p-4 sm:p-5 border ${
                    isDark ? 'border-gray-600' : 'border-gray-200'
                  } cursor-pointer transition-all duration-300 hover:scale-105 shadow-md hover:shadow-xl group`}
                >
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <tool.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h4 className={`text-xs sm:text-sm font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {tool.title}
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                    {tool.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div
          className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-5 sm:p-6 border ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          } shadow-lg flex flex-col`}
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Сегодняшние занятия
            </h3>
            {!isLoading && !error && recentSessions.length > 0 && (
              <span className={`text-xs px-2 py-1 rounded-lg ${
                isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
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
              <div className={`flex-1 ${
                showAll ? 'max-h-[500px] overflow-y-auto' : ''
              } space-y-3 sm:space-y-4 pr-1 ${
                isDark 
                  ? 'scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50' 
                  : 'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
              }`}>
                {displayedSessions.map((session, index) => (
                  <div
                    key={session.id || index}
                    className={`${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} rounded-xl p-3 sm:p-4 border ${
                      isDark ? 'border-gray-600' : 'border-gray-200'
                    } transition-all duration-300 cursor-pointer hover:shadow-lg ${
                      isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {session.group}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-lg font-medium ${
                          session.status === 'active'
                            ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                            : session.status === 'completed'
                            ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                            : isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {session.status === 'active' ? 'Идет' : session.status === 'completed' ? 'Завершено' : 'Скоро'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {session.time}
                      </span>
                      <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {session.present}/{session.total}
                      </span>
                    </div>

                    {session.status === 'active' && (
                      <div className={`mt-2 pt-2 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                        <div className="flex space-x-2">
                          <button className="flex-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-medium cursor-pointer hover:scale-105 transition-all duration-300">
                            Продолжить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Show More/Less Button */}
              {hasMore && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className={`mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl border ${
                    isDark 
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
      </div>

      {/* Actions Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mb-8">
        <button
          onClick={() => navigate('/attendance/scan')}
          className={`${
            isDark
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
          } rounded-2xl p-6 sm:p-8 cursor-pointer transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-purple-500/50 group`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white text-lg sm:text-xl font-bold mb-2">Новая проверка</h4>
              <p className="text-blue-100 text-xs sm:text-sm">Начать сканирование лиц студентов</p>
            </div>
            <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-white group-hover:scale-110 transition-transform duration-300" />
          </div>
        </button>

        <button
          onClick={() => console.log('Export report')}
          className={`${
            isDark
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
          } rounded-2xl p-6 sm:p-8 cursor-pointer transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-green-500/50 group`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white text-lg sm:text-xl font-bold mb-2">Экспорт отчета</h4>
              <p className="text-green-100 text-xs sm:text-sm">Скачать аналитику за период</p>
            </div>
            <Download className="w-10 h-10 sm:w-12 sm:h-12 text-white group-hover:scale-110 transition-transform duration-300" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default Home;