import {
  Search,
  Filter,
  Users,
  Mail,
  Phone,
  TrendingUp,
  Loader2,
  Edit2,
  Trash2,
  MoreVertical,
  UserPlus,
  FileText,
} from 'lucide-react';

const getAttendanceColor = (attendance, isDark) => {
  if (attendance >= 90) return isDark ? 'text-green-400' : 'text-green-600';
  if (attendance >= 75) return isDark ? 'text-yellow-400' : 'text-yellow-600';
  return isDark ? 'text-red-400' : 'text-red-600';
};

const StatusBadge = ({ status, isDark }) => {
  const styles = {
    active: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
    warning: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    danger: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700',
  };
  const labels = { active: 'Активен', warning: 'Внимание', danger: 'Риск' };
  return (
    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const StudentsPanel = ({
  isDark,
  filteredStudents,
  studentsCount,
  isLoading,
  searchTerm,
  onSearchChange,
  selectedGroupData,
  onAddStudent,
  onEditStudent,
  onOpenStudentJournal,
  activeDropdown,
  onToggleDropdown,
}) => (
  <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg`}>
    <div className={`p-5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Поиск студентов..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isDark
              ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
          />
        </div>
        <button
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border ${isDark
            ? 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          } transition-colors cursor-pointer shadow-sm`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Фильтры</span>
        </button>
        <button
          onClick={onAddStudent}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-emerald-500/50 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span className="text-sm">Добавить студента</span>
        </button>
      </div>
      {selectedGroupData && (
        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Показано студентов: {filteredStudents.length} из {studentsCount}
        </span>
      )}
    </div>

    <div className="p-5 relative">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-600'} animate-spin mb-4`} />
          <p className={`text-base font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка студентов...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => onOpenStudentJournal?.(student)}
                className={`${isDark ? 'bg-gray-700/30' : 'bg-white'} rounded-xl p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'} hover:shadow-xl transition-all duration-300 cursor-pointer ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50 hover:border-blue-200'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                      {student.avatar}
                    </div>
                    <div>
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</h4>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{student.group}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDropdown(student.id);
                      }}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} transition-colors cursor-pointer`}
                    >
                      <MoreVertical className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                    </button>
                    {activeDropdown === student.id && (
                      <div className={`absolute right-0 mt-2 w-52 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-xl z-10`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenStudentJournal?.(student);
                          }}
                          className={`w-full text-left px-4 py-2.5 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} transition-colors flex items-center space-x-2 cursor-pointer rounded-t-xl`}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">Открыть журнал</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditStudent(student);
                          }}
                          className={`w-full text-left px-4 py-2.5 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} transition-colors flex items-center space-x-2 cursor-pointer`}
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-sm">Редактировать</span>
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className={`w-full text-left px-4 py-2.5 ${isDark ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-50 text-red-600'} rounded-b-xl transition-colors flex items-center space-x-2 cursor-pointer`}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm">Удалить</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Mail className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{student.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{student.phone}</span>
                  </div>
                </div>

                <div className={`mt-3 rounded-xl px-3 py-2 flex items-center justify-between ${isDark ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <FileText className="w-4 h-4" />
                    <span>Детальная страница студента</span>
                  </div>
                  <span className="text-[11px] opacity-80">Открыть</span>
                </div>

                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'} flex items-center justify-between`}>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className={`w-4 h-4 ${getAttendanceColor(student.attendance, isDark)}`} />
                    <span className={`text-sm font-medium ${getAttendanceColor(student.attendance, isDark)}`}>
                      {student.attendance}% посещаемость
                    </span>
                  </div>
                  <StatusBadge status={student.status} isDark={isDark} />
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && !isLoading && (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-base font-medium mb-1">Студенты не найдены</p>
              <p className="text-sm">Попробуйте изменить критерии поиска</p>
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

export default StudentsPanel;
