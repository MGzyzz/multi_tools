import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

const Analytics = ({ isDark = false }) => {
  const periodOptions = [
    { id: 'today', label: 'Сегодня' },
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
    { id: 'semester', label: 'Семестр' }
  ];

  const dataByPeriod = {
    today: {
      groupAttendance: [
        { id: 1, name: 'ИКТ-21', attendance: 94, students: 24, delta: 3, marked: 18, pending: 1 },
        { id: 2, name: 'СПЗ-12', attendance: 88, students: 21, delta: 1, marked: 15, pending: 2 },
        { id: 3, name: 'ПИ-13', attendance: 84, students: 19, delta: -1, marked: 13, pending: 2 },
        { id: 4, name: 'ИКТ-11', attendance: 80, students: 26, delta: -2, marked: 16, pending: 3 }
      ],
      attendanceTrend: [
        { label: '08:00', marked: 4, missed: 0 },
        { label: '10:00', marked: 6, missed: 1 },
        { label: '12:00', marked: 7, missed: 1 },
        { label: '14:00', marked: 5, missed: 2 },
        { label: '16:00', marked: 4, missed: 1 }
      ],
      attendanceTrendByGroup: {
        '1': [
          { label: '08:00', marked: 5, missed: 0 },
          { label: '10:00', marked: 6, missed: 0 },
          { label: '12:00', marked: 7, missed: 1 },
          { label: '14:00', marked: 5, missed: 1 },
          { label: '16:00', marked: 4, missed: 0 }
        ],
        '2': [
          { label: '08:00', marked: 4, missed: 1 },
          { label: '10:00', marked: 5, missed: 1 },
          { label: '12:00', marked: 6, missed: 1 },
          { label: '14:00', marked: 4, missed: 2 },
          { label: '16:00', marked: 3, missed: 1 }
        ],
        '3': [
          { label: '08:00', marked: 3, missed: 1 },
          { label: '10:00', marked: 4, missed: 2 },
          { label: '12:00', marked: 5, missed: 2 },
          { label: '14:00', marked: 4, missed: 2 },
          { label: '16:00', marked: 2, missed: 1 }
        ],
        '4': [
          { label: '08:00', marked: 4, missed: 1 },
          { label: '10:00', marked: 5, missed: 2 },
          { label: '12:00', marked: 6, missed: 2 },
          { label: '14:00', marked: 4, missed: 2 },
          { label: '16:00', marked: 3, missed: 1 }
        ]
      },
      riskStudents: [
        { id: 1, name: 'Айдана Сулейменова', group: 'СПЗ-12', groupId: 2, attendance: 42, missed: 2 },
        { id: 2, name: 'Илья Громов', group: 'ИКТ-11', groupId: 4, attendance: 48, missed: 2 },
        { id: 3, name: 'Диас Калымов', group: 'ИКТ-21', groupId: 1, attendance: 55, missed: 1 }
      ]
    },
    week: {
      groupAttendance: [
        { id: 1, name: 'ИКТ-21', attendance: 96, students: 24, delta: 4, marked: 62, pending: 3 },
        { id: 2, name: 'СПЗ-12', attendance: 92, students: 21, delta: 2, marked: 55, pending: 4 },
        { id: 3, name: 'ПИ-13', attendance: 89, students: 19, delta: -1, marked: 49, pending: 5 },
        { id: 4, name: 'ИКТ-11', attendance: 86, students: 26, delta: -3, marked: 58, pending: 6 }
      ],
      attendanceTrend: [
        { label: 'Пн', marked: 18, missed: 2 },
        { label: 'Вт', marked: 16, missed: 3 },
        { label: 'Ср', marked: 20, missed: 1 },
        { label: 'Чт', marked: 17, missed: 4 },
        { label: 'Пт', marked: 19, missed: 2 },
        { label: 'Сб', marked: 12, missed: 1 },
        { label: 'Вс', marked: 8, missed: 0 }
      ],
      attendanceTrendByGroup: {
        '1': [
          { label: 'Пн', marked: 5, missed: 0 },
          { label: 'Вт', marked: 6, missed: 0 },
          { label: 'Ср', marked: 7, missed: 0 },
          { label: 'Чт', marked: 6, missed: 1 },
          { label: 'Пт', marked: 7, missed: 0 },
          { label: 'Сб', marked: 4, missed: 0 },
          { label: 'Вс', marked: 3, missed: 0 }
        ],
        '2': [
          { label: 'Пн', marked: 5, missed: 1 },
          { label: 'Вт', marked: 4, missed: 1 },
          { label: 'Ср', marked: 6, missed: 1 },
          { label: 'Чт', marked: 5, missed: 1 },
          { label: 'Пт', marked: 6, missed: 1 },
          { label: 'Сб', marked: 3, missed: 1 },
          { label: 'Вс', marked: 2, missed: 0 }
        ],
        '3': [
          { label: 'Пн', marked: 4, missed: 1 },
          { label: 'Вт', marked: 4, missed: 2 },
          { label: 'Ср', marked: 5, missed: 1 },
          { label: 'Чт', marked: 4, missed: 2 },
          { label: 'Пт', marked: 5, missed: 1 },
          { label: 'Сб', marked: 3, missed: 1 },
          { label: 'Вс', marked: 2, missed: 0 }
        ],
        '4': [
          { label: 'Пн', marked: 4, missed: 1 },
          { label: 'Вт', marked: 4, missed: 1 },
          { label: 'Ср', marked: 5, missed: 1 },
          { label: 'Чт', marked: 4, missed: 2 },
          { label: 'Пт', marked: 5, missed: 1 },
          { label: 'Сб', marked: 2, missed: 1 },
          { label: 'Вс', marked: 1, missed: 0 }
        ]
      },
      riskStudents: [
        { id: 1, name: 'Айдана Сулейменова', group: 'СПЗ-12', groupId: 2, attendance: 42, missed: 6 },
        { id: 2, name: 'Илья Громов', group: 'ИКТ-11', groupId: 4, attendance: 48, missed: 5 },
        { id: 3, name: 'Аружан Касымова', group: 'ПИ-13', groupId: 3, attendance: 51, missed: 4 },
        { id: 4, name: 'Диас Калымов', group: 'ИКТ-21', groupId: 1, attendance: 55, missed: 3 },
        { id: 5, name: 'Мадина Турсын', group: 'СПЗ-12', groupId: 2, attendance: 58, missed: 3 }
      ]
    },
    month: {
      groupAttendance: [
        { id: 1, name: 'ИКТ-21', attendance: 93, students: 24, delta: 3, marked: 260, pending: 12 },
        { id: 2, name: 'СПЗ-12', attendance: 90, students: 21, delta: 1, marked: 232, pending: 15 },
        { id: 3, name: 'ПИ-13', attendance: 86, students: 19, delta: -2, marked: 210, pending: 18 },
        { id: 4, name: 'ИКТ-11', attendance: 82, students: 26, delta: -4, marked: 248, pending: 20 }
      ],
      attendanceTrend: [
        { label: '1 нед', marked: 70, missed: 10 },
        { label: '2 нед', marked: 68, missed: 12 },
        { label: '3 нед', marked: 72, missed: 9 },
        { label: '4 нед', marked: 65, missed: 14 }
      ],
      attendanceTrendByGroup: {
        '1': [
          { label: '1 нед', marked: 20, missed: 2 },
          { label: '2 нед', marked: 18, missed: 3 },
          { label: '3 нед', marked: 21, missed: 2 },
          { label: '4 нед', marked: 19, missed: 3 }
        ],
        '2': [
          { label: '1 нед', marked: 18, missed: 3 },
          { label: '2 нед', marked: 17, missed: 4 },
          { label: '3 нед', marked: 19, missed: 3 },
          { label: '4 нед', marked: 16, missed: 4 }
        ],
        '3': [
          { label: '1 нед', marked: 16, missed: 3 },
          { label: '2 нед', marked: 15, missed: 4 },
          { label: '3 нед', marked: 17, missed: 3 },
          { label: '4 нед', marked: 14, missed: 4 }
        ],
        '4': [
          { label: '1 нед', marked: 19, missed: 4 },
          { label: '2 нед', marked: 18, missed: 5 },
          { label: '3 нед', marked: 20, missed: 4 },
          { label: '4 нед', marked: 16, missed: 5 }
        ]
      },
      riskStudents: [
        { id: 1, name: 'Айдана Сулейменова', group: 'СПЗ-12', groupId: 2, attendance: 39, missed: 12 },
        { id: 2, name: 'Илья Громов', group: 'ИКТ-11', groupId: 4, attendance: 45, missed: 10 },
        { id: 3, name: 'Аружан Касымова', group: 'ПИ-13', groupId: 3, attendance: 49, missed: 9 },
        { id: 4, name: 'Диас Калымов', group: 'ИКТ-21', groupId: 1, attendance: 53, missed: 7 },
        { id: 5, name: 'Мадина Турсын', group: 'СПЗ-12', groupId: 2, attendance: 56, missed: 8 }
      ]
    },
    semester: {
      groupAttendance: [
        { id: 1, name: 'ИКТ-21', attendance: 91, students: 24, delta: 2, marked: 1180, pending: 44 },
        { id: 2, name: 'СПЗ-12', attendance: 88, students: 21, delta: 0, marked: 1050, pending: 52 },
        { id: 3, name: 'ПИ-13', attendance: 84, students: 19, delta: -3, marked: 990, pending: 60 },
        { id: 4, name: 'ИКТ-11', attendance: 81, students: 26, delta: -5, marked: 1120, pending: 70 }
      ],
      attendanceTrend: [
        { label: 'Сент', marked: 220, missed: 40 },
        { label: 'Окт', marked: 240, missed: 35 },
        { label: 'Нояб', marked: 210, missed: 50 },
        { label: 'Дек', marked: 190, missed: 60 },
        { label: 'Янв', marked: 170, missed: 65 }
      ],
      attendanceTrendByGroup: {
        '1': [
          { label: 'Сент', marked: 60, missed: 10 },
          { label: 'Окт', marked: 62, missed: 8 },
          { label: 'Нояб', marked: 55, missed: 12 },
          { label: 'Дек', marked: 50, missed: 15 },
          { label: 'Янв', marked: 45, missed: 16 }
        ],
        '2': [
          { label: 'Сент', marked: 55, missed: 12 },
          { label: 'Окт', marked: 58, missed: 10 },
          { label: 'Нояб', marked: 52, missed: 13 },
          { label: 'Дек', marked: 48, missed: 16 },
          { label: 'Янв', marked: 40, missed: 17 }
        ],
        '3': [
          { label: 'Сент', marked: 50, missed: 13 },
          { label: 'Окт', marked: 52, missed: 12 },
          { label: 'Нояб', marked: 47, missed: 15 },
          { label: 'Дек', marked: 42, missed: 17 },
          { label: 'Янв', marked: 38, missed: 18 }
        ],
        '4': [
          { label: 'Сент', marked: 55, missed: 14 },
          { label: 'Окт', marked: 60, missed: 11 },
          { label: 'Нояб', marked: 56, missed: 14 },
          { label: 'Дек', marked: 50, missed: 17 },
          { label: 'Янв', marked: 47, missed: 18 }
        ]
      },
      riskStudents: [
        { id: 1, name: 'Айдана Сулейменова', group: 'СПЗ-12', groupId: 2, attendance: 38, missed: 18 },
        { id: 2, name: 'Илья Громов', group: 'ИКТ-11', groupId: 4, attendance: 44, missed: 16 },
        { id: 3, name: 'Аружан Касымова', group: 'ПИ-13', groupId: 3, attendance: 47, missed: 15 },
        { id: 4, name: 'Диас Калымов', group: 'ИКТ-21', groupId: 1, attendance: 52, missed: 12 },
        { id: 5, name: 'Мадина Турсын', group: 'СПЗ-12', groupId: 2, attendance: 55, missed: 13 }
      ]
    }
  };

  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [trendChartType, setTrendChartType] = useState('line');

  const currentData = dataByPeriod[selectedPeriod];
  const groupOptions = [
    { id: 'all', label: 'Все группы' },
    ...currentData.groupAttendance.map((group) => ({ id: String(group.id), label: group.name }))
  ];
  const selectedGroupLabel = groupOptions.find((group) => String(group.id) === String(selectedGroupId))?.label || 'Все группы';

  useEffect(() => {
    const exists = groupOptions.some((group) => String(group.id) === String(selectedGroupId));
    if (!exists) setSelectedGroupId('all');
  }, [groupOptions, selectedGroupId]);

  const filteredGroupAttendance = useMemo(() => {
    if (selectedGroupId === 'all') return currentData.groupAttendance;
    return currentData.groupAttendance.filter((group) => String(group.id) === String(selectedGroupId));
  }, [currentData, selectedGroupId]);

  const filteredRiskStudents = useMemo(() => {
    if (selectedGroupId === 'all') return currentData.riskStudents;
    return currentData.riskStudents.filter((student) => String(student.groupId) === String(selectedGroupId));
  }, [currentData, selectedGroupId]);

  const summary = useMemo(() => {
    const totals = filteredGroupAttendance.reduce(
      (acc, group) => {
        acc.marked += group.marked;
        acc.pending += group.pending;
        return acc;
      },
      { marked: 0, pending: 0 }
    );
    return {
      totalGroups: filteredGroupAttendance.length,
      markedTotal: totals.marked,
      pendingLessons: totals.pending,
      riskStudents: filteredRiskStudents.length
    };
  }, [filteredGroupAttendance, filteredRiskStudents]);

  const highAttendanceGroups = filteredGroupAttendance.filter((group) => group.attendance >= 90);
  const trendData = useMemo(() => {
    if (selectedGroupId === 'all') return currentData.attendanceTrend;
    return currentData.attendanceTrendByGroup?.[String(selectedGroupId)] ?? currentData.attendanceTrend;
  }, [currentData, selectedGroupId]);

  const chartGrid = isDark ? '#374151' : '#E5E7EB';
  const chartText = isDark ? '#D1D5DB' : '#6B7280';
  const barFillDefault = 'url(#attendanceGradient)';
  const barFillHighlight = 'url(#attendanceHighlight)';
  const tooltipStyle = {
    backgroundColor: isDark ? '#111827' : '#FFFFFF',
    border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
    borderRadius: '12px',
    color: isDark ? '#F9FAFB' : '#111827',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  };
  const tooltipLabelStyle = { color: isDark ? '#E5E7EB' : '#6B7280' };
  const tooltipItemStyle = { color: isDark ? '#FFFFFF' : '#111827' };

  const getAttendanceColor = (value) => {
    if (value >= 90) return isDark ? 'text-green-400' : 'text-green-600';
    if (value >= 75) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  const getRiskBadge = (value) => {
    if (value >= 55) return isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700';
    return isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700';
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50'}`}>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Аналитика посещаемости
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Сводка групп, динамика и список студентов с риском пропусков
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Группа
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className={`min-w-[180px] px-3 py-2 rounded-xl border ${isDark
                ? 'bg-gray-800/70 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer`}
            >
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Период
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className={`min-w-[150px] px-3 py-2 rounded-xl border ${isDark
                ? 'bg-gray-800/70 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer`}
            >
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Групп в работе</p>
          <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {summary.totalGroups}
          </p>
        </div>

        {/* <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Отметок за период</p>
          <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {summary.markedTotal}
          </p>
        </div> */}

        {/* <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Неотмеченные занятия</p>
          <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {summary.pendingLessons}
          </p>
        </div> */}

        <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Проблемные студенты</p>
          <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {summary.riskStudents}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Посещаемость по группам
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Видно, какие группы стабильно посещают занятия
                </p>
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Обновлено 2 часа назад</div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData.groupAttendance} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDark ? '#60A5FA' : '#3B82F6'} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={isDark ? '#A78BFA' : '#8B5CF6'} stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="attendanceHighlight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDark ? '#22D3EE' : '#06B6D4'} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={isDark ? '#38BDF8' : '#3B82F6'} stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: chartText, fontSize: 12 }} axisLine={{ stroke: chartGrid }} />
                  <YAxis tick={{ fill: chartText, fontSize: 12 }} axisLine={{ stroke: chartGrid }} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                  <Bar dataKey="attendance" radius={[8, 8, 0, 0]}>
                    {currentData.groupAttendance.map((group) => {
                      const isSelected = selectedGroupId !== 'all' && String(group.id) === String(selectedGroupId);
                      return (
                        <Cell
                          key={`cell-${group.id}`}
                          fill={isSelected ? barFillHighlight : barFillDefault}
                          fillOpacity={selectedGroupId === 'all' || isSelected ? 1 : 0.35}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {highAttendanceGroups.map((group) => (
                <div
                  key={group.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-white border-gray-200'}`}
                >
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {group.name}
                  </span>
                  <span className={`text-xs ${getAttendanceColor(group.attendance)}`}>
                    {group.attendance}%
                  </span>
                  <span className={`flex items-center text-xs ${group.delta >= 0 ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                    {group.delta >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(group.delta)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg p-6`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Динамика отметок
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedGroupId === 'all' ? 'Сколько отметок сделано за период' : `Группа: ${selectedGroupLabel}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Последние 7 дней</div>
                <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
                  <button
                    type="button"
                    onClick={() => setTrendChartType('line')}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${trendChartType === 'line'
                      ? isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'
                      : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Линия
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendChartType('area')}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${trendChartType === 'area'
                      ? isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'
                      : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Площадь
                  </button>
                </div>
              </div>
            </div> */}

            {/* <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                {trendChartType === 'line' ? (
                  <LineChart data={trendData} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                    <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: chartText, fontSize: 12 }} axisLine={{ stroke: chartGrid }} />
                    <YAxis tick={{ fill: chartText, fontSize: 12 }} axisLine={{ stroke: chartGrid }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="marked" stroke={isDark ? '#60A5FA' : '#2563EB'} strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="missed" stroke={isDark ? '#F97316' : '#EA580C'} strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                ) : (
                  <AreaChart data={trendData} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="markedArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? '#60A5FA' : '#2563EB'} stopOpacity={0.5} />
                        <stop offset="95%" stopColor={isDark ? '#60A5FA' : '#2563EB'} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="missedArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? '#F97316' : '#EA580C'} stopOpacity={0.5} />
                        <stop offset="95%" stopColor={isDark ? '#F97316' : '#EA580C'} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: chartText, fontSize: 12 }} axisLine={{ stroke: chartGrid }} />
                    <YAxis tick={{ fill: chartText, fontSize: 12 }} axisLine={{ stroke: chartGrid }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="marked" stroke={isDark ? '#60A5FA' : '#2563EB'} fill="url(#markedArea)" strokeWidth={2} />
                    <Area type="monotone" dataKey="missed" stroke={isDark ? '#F97316' : '#EA580C'} fill="url(#missedArea)" strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div> */}
        </div>

        <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg p-6`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Требуют внимания
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Студенты с низкой посещаемостью
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              {filteredRiskStudents.length} студентов
            </span>
          </div>

          <div className="space-y-3">
            {filteredRiskStudents.map((student) => (
              <div
                key={student.id}
                className={`${isDark ? 'bg-gray-700/30' : 'bg-white'} rounded-xl p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'} hover:shadow-lg transition-all duration-300`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{student.group}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${getRiskBadge(student.attendance)}`}>
                    {student.attendance}%
                  </span>
                </div>
                <div className={`mt-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Пропусков за месяц: <span className="font-semibold">{student.missed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
