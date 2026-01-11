import React from 'react';
import { Users, UserPlus, Upload, Download, FileText, Settings, Search, Filter } from 'lucide-react';
import { path } from 'motion/react-client';
import { Link } from 'react-router-dom';

const Tools = ({ isDark = true }) => {
  const tools = [
    // {
    //   icon: Users,
    //   title: 'Управление студентами',
    //   description: 'Добавление, редактирование и удаление студентов',
    //   color: 'from-blue-500 to-blue-600',
    //   action: 'manage-students'
    // },
    // {
    //   icon: UserPlus,
    //   title: 'Добавить студента',
    //   description: 'Регистрация нового студента в системе',
    //   color: 'from-green-500 to-green-600',
    //   action: 'add-student'
    // },
    {
      icon: Upload,
      title: 'Импорт данных',
      description: 'Загрузка списков студентов из Excel/CSV',
      color: 'from-purple-500 to-purple-600',
      action: 'import',
      path: '/test'
    },
    {
      icon: Download,
      title: 'Экспорт отчетов',
      description: 'Выгрузка данных о посещаемости',
      color: 'from-orange-500 to-orange-600',
      action: 'export',
      path: '/attendance'
    },
    {
      icon: FileText,
      title: 'Журнал посещений',
      description: 'Просмотр истории всех занятий',
      color: 'from-pink-500 to-pink-600',
      action: 'journal',
      path: '/attendance'
    },
    {
      icon: Settings,
      title: 'Настройки групп',
      description: 'Конфигурация учебных групп и расписания',
      color: 'from-gray-500 to-gray-600',
      action: 'group-settings',
      path: '/groups'
    }
  ];

  const recentActivities = [
    { action: 'Добавлен студент', detail: 'Петров А.В. в группу ИС-301', time: '10 мин назад' },
    { action: 'Экспорт данных', detail: 'Отчет за декабрь 2025', time: '1 час назад' },
    { action: 'Изменена группа', detail: 'ИС-202: добавлено 3 студента', time: '2 часа назад' },
    { action: 'Импорт данных', detail: 'Загружено 45 студентов', time: '3 часа назад' }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Инструменты управления
        </h1>
        <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Управление студентами, группами и данными системы
        </p>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 sm:mb-8">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Поиск студентов..."
            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300`}
          />
        </div>
        <button className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'} cursor-pointer transition-all duration-300`}>
          <Filter className="w-5 h-5" />
          <span>Фильтры</span>
        </button>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {tools.map((tool, index) => (
          <Link key={index} to={tool.path}>
    <button
      className={`${isDark ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-white hover:bg-gray-50'}
      border ${isDark ? 'border-gray-700' : 'border-gray-200'}
      rounded-2xl p-6 cursor-pointer transition-all duration-300
      hover:scale-105 shadow-lg hover:shadow-xl text-left group w-full`}
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color}
        flex items-center justify-center mb-4 shadow-lg group-hover:scale-110`}>
        <tool.icon className="w-7 h-7 text-white" />
      </div>

      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {tool.title}
      </h3>

      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {tool.description}
      </p>
    </button>
  </Link>
        ))}
      </div>

      {/* Recent Activities */}
      <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} rounded-2xl p-6 shadow-lg`}>
        <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Последние действия
        </h2>
        <div className="space-y-4">
          {recentActivities.map((activity, index) => (
            <div
              key={index}
              className={`flex items-start justify-between p-4 rounded-xl ${isDark ? 'bg-gray-700/30 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100'} transition-all duration-300 cursor-pointer`}
            >
              <div className="flex-1">
                <p className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {activity.action}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {activity.detail}
                </p>
              </div>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} whitespace-nowrap ml-4`}>
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tools;