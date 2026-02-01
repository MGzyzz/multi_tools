import React from 'react';
import { CheckCircle, Clock, Users, RotateCcw } from 'lucide-react';

const AttendanceHeader = ({ isDark, sessionData, stats, onReset }) => (
  <div className="mb-6 sm:mb-8">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Отметка студентов
        </h1>
        <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {sessionData.group} • {sessionData.subject} • {sessionData.time}
        </p>
      </div>
      <button
        onClick={onReset}
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          } cursor-pointer transition-all duration-300`}
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Сбросить</span>
      </button>
    </div>
    {/* Stats */}
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {/* present */}
      <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-5 border ${isDark ? 'border-gray-700' : 'border-gray-200'
        } shadow-lg hover:scale-105 transition-all duration-300`}>
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {stats.present}
            </span>
          </div>
          <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Присутствуют
          </p>
        </div>
      </div>

      {/* late */}
      <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-5 border ${isDark ? 'border-gray-700' : 'border-gray-200'
        } shadow-lg hover:scale-105 transition-all duration-300`}>
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {stats.late}
            </span>
          </div>
          <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Опоздали
          </p>
        </div>
      </div>

      {/* absent */}
      <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-5 border ${isDark ? 'border-gray-700' : 'border-gray-200'
        } shadow-lg hover:scale-105 transition-all duration-300`}>
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {stats.absent}
            </span>
          </div>
          <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Не отмечены
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default AttendanceHeader;
