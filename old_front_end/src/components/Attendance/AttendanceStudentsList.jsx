import React from 'react';
import { Download, CheckCircle, Clock } from 'lucide-react';

const AttendanceStudentsList = ({ isDark, students, stats, sessionData, onMarkStudent }) => (
  <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-5 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'
    } shadow-lg flex flex-col max-h-[600px]`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Список студентов
      </h3>
      <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
        } font-medium`}>
        {stats.present + stats.late}/{sessionData.totalStudents}
      </span>
    </div>

    <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
      {students.map((student) => (
        <div
          key={student.id}
          className={`rounded-xl p-3 border transition-all duration-300 ${student.status === 'present'
            ? isDark
              ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
            : student.status === 'late'
              ? isDark
                ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
              : isDark
                ? 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`font-semibold text-sm ${student.status
              ? student.status === 'present'
                ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                : isDark ? 'text-amber-400' : 'text-amber-700'
              : isDark ? 'text-white' : 'text-gray-900'
              }`}>
              {student.name}
            </span>
            {student.status && (
              <span className="text-xs text-gray-500">
                {student.scanTime}
              </span>
            )}
          </div>

          {!student.status && (
            <div className="flex space-x-2">
              <button
                onClick={() => onMarkStudent(student.id, 'present')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-300 ${isDark
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300'
                  }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Присутствует</span>
                </div>
              </button>
              <button
                onClick={() => onMarkStudent(student.id, 'late')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-300 ${isDark
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300'
                  }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Опоздал</span>
                </div>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>

    <button
      className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg"
    >
      <Download className="w-5 h-5" />
      <span>Экспорт отчета</span>
    </button>
  </div>
);

export default AttendanceStudentsList;
