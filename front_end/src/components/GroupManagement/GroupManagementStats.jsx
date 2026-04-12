import { Users, BookOpen, UserCheck, UserX } from 'lucide-react';

const GroupManagementStats = ({ isDark, totalStudents, groupsCount, isLoading }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
    <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
      <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Всего студентов</p>
      <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {isLoading ? '...' : totalStudents}
      </p>
    </div>

    <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
      <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Активных групп</p>
      <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {isLoading ? '...' : groupsCount}
      </p>
    </div>

    <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
          <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
      <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Средняя посещаемость</p>
      <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>91%</p>
    </div>

    <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
          <UserX className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
      <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Требуют внимания</p>
      <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-yellow-300' : 'text-gray-900'}`}>В разработке</p>
    </div>
  </div>
);

export default GroupManagementStats;
