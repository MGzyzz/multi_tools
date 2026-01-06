import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  UserPlus,
  X,
  Check,
  ChevronDown,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  TrendingUp,
  UserCheck,
  UserX
} from 'lucide-react';

const GroupManagement = ({ isDark = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Mock data
  const groups = [
    { id: 'all', name: 'Все группы', count: 245 },
    { id: 'cs-301', name: 'CS-301', count: 32, course: 3, specialty: 'Computer Science' },
    { id: 'cs-302', name: 'CS-302', count: 28, course: 3, specialty: 'Computer Science' },
    { id: 'it-201', name: 'IT-201', count: 35, course: 2, specialty: 'Information Technology' },
    { id: 'it-202', name: 'IT-202', count: 30, course: 2, specialty: 'Information Technology' },
    { id: 'se-401', name: 'SE-401', count: 25, course: 4, specialty: 'Software Engineering' },
    { id: 'se-402', name: 'SE-402', count: 27, course: 4, specialty: 'Software Engineering' },
    { id: 'ds-101', name: 'DS-101', count: 38, course: 1, specialty: 'Data Science' },
    { id: 'ds-102', name: 'DS-102', count: 30, course: 1, specialty: 'Data Science' }
  ];

  const students = [
    { id: 1, name: 'Айдар Бекзатов', email: 'aidar.b@edu.kz', phone: '+7 701 234 5678', group: 'CS-301', avatar: '👨‍🎓', attendance: 95, status: 'active' },
    { id: 2, name: 'Динара Сагынбаева', email: 'dinara.s@edu.kz', phone: '+7 702 345 6789', group: 'CS-301', avatar: '👩‍🎓', attendance: 92, status: 'active' },
    { id: 3, name: 'Ерлан Нұрланов', email: 'erlan.n@edu.kz', phone: '+7 703 456 7890', group: 'IT-201', avatar: '👨‍🎓', attendance: 88, status: 'active' },
    { id: 4, name: 'Жанар Қасымова', email: 'zhanar.k@edu.kz', phone: '+7 704 567 8901', group: 'IT-201', avatar: '👩‍🎓', attendance: 97, status: 'active' },
    { id: 5, name: 'Мұрат Әлімов', email: 'murat.a@edu.kz', phone: '+7 705 678 9012', group: 'SE-401', avatar: '👨‍🎓', attendance: 85, status: 'warning' },
    { id: 6, name: 'Айгерім Тоқтарова', email: 'aigerim.t@edu.kz', phone: '+7 706 789 0123', group: 'SE-401', avatar: '👩‍🎓', attendance: 98, status: 'active' },
    { id: 7, name: 'Дәулет Мұхамедов', email: 'daulet.m@edu.kz', phone: '+7 707 890 1234', group: 'DS-101', avatar: '👨‍🎓', attendance: 72, status: 'danger' },
    { id: 8, name: 'Сауле Жұмабаева', email: 'saule.zh@edu.kz', phone: '+7 708 901 2345', group: 'DS-101', avatar: '👩‍🎓', attendance: 94, status: 'active' },
    { id: 9, name: 'Бауыржан Сейдахметов', email: 'bauyrzhan.s@edu.kz', phone: '+7 709 012 3456', group: 'CS-302', avatar: '👨‍🎓', attendance: 90, status: 'active' },
    { id: 10, name: 'Назерке Абдуллина', email: 'nazerke.a@edu.kz', phone: '+7 700 123 4567', group: 'CS-302', avatar: '👩‍🎓', attendance: 96, status: 'active' }
  ];

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.group.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup = selectedGroup === 'all' || student.group === selectedGroup;
      return matchesSearch && matchesGroup;
    });
  }, [searchTerm, selectedGroup]);

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  const getAttendanceColor = (attendance) => {
    if (attendance >= 90) return isDark ? 'text-green-400' : 'text-green-600';
    if (attendance >= 75) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
      warning: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
      danger: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
    };
    const labels = {
      active: 'Активен',
      warning: 'Внимание',
      danger: 'Риск'
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            Управление группами
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Редактирование списков студентов и групп
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/50 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Добавить студента</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg hover:shadow-xl transition-shadow`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Всего студентов</p>
          <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>245</p>
        </div>

        <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Активных групп</p>
          <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>8</p>
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
          <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>12</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Groups Sidebar */}
        <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-5 border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Группы</h3>
            <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors cursor-pointer`}>
              <Plus className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>

          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
                  selectedGroup === group.id
                    ? isDark 
                      ? 'bg-blue-500/20 border-blue-500/50 border' 
                      : 'bg-blue-100 border-blue-300 border'
                    : isDark 
                      ? 'hover:bg-gray-700/50 border border-transparent' 
                      : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm ${
                    selectedGroup === group.id
                      ? isDark ? 'text-blue-400' : 'text-blue-700'
                      : isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {group.name}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-lg ${
                    isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {group.count}
                  </span>
                </div>
                {group.specialty && (
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {group.course} курс • {group.specialty}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Students List */}
        <div className="lg:col-span-3">
          <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg`}>
            {/* Search and Filters */}
            <div className="p-5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Поиск студентов..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                      isDark 
                        ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                  />
                </div>
                <button className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border ${
                  isDark ? 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                } transition-colors cursor-pointer shadow-sm`}>
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Фильтры</span>
                </button>
              </div>

              {selectedGroup !== 'all' && selectedGroupData && (
                <div className="mt-3 flex items-center space-x-2">
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Показано студентов: {filteredStudents.length} из {selectedGroupData.count}
                  </span>
                </div>
              )}
            </div>

            {/* Students Grid */}
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className={`${isDark ? 'bg-gray-700/30' : 'bg-white'} rounded-xl p-4 border ${
                      isDark ? 'border-gray-600' : 'border-gray-200'
                    } hover:shadow-xl transition-all duration-300 cursor-pointer ${
                      isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50 hover:border-blue-200'
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl shadow-lg">
                          {student.avatar}
                        </div>
                        <div>
                          <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {student.name}
                          </h4>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {student.group}
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === student.id ? null : student.id);
                          }}
                          className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} transition-colors cursor-pointer`}
                        >
                          <MoreVertical className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                        
                        {activeDropdown === student.id && (
                          <div className={`absolute right-0 mt-2 w-48 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl border ${
                            isDark ? 'border-gray-700' : 'border-gray-200'
                          } shadow-xl z-10`}>
                            <button className={`w-full text-left px-4 py-2.5 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} rounded-t-xl transition-colors flex items-center space-x-2 cursor-pointer`}>
                              <Edit2 className="w-4 h-4" />
                              <span className="text-sm">Редактировать</span>
                            </button>
                            <button className={`w-full text-left px-4 py-2.5 ${isDark ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-50 text-red-600'} rounded-b-xl transition-colors flex items-center space-x-2 cursor-pointer`}>
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
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {student.email}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {student.phone}
                        </span>
                      </div>
                    </div>

                    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'} flex items-center justify-between`}>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className={`w-4 h-4 ${getAttendanceColor(student.attendance)}`} />
                        <span className={`text-sm font-medium ${getAttendanceColor(student.attendance)}`}>
                          {student.attendance}% посещаемость
                        </span>
                      </div>
                      {getStatusBadge(student.status)}
                    </div>
                  </div>
                ))}
              </div>

              {filteredStudents.length === 0 && (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-base font-medium mb-1">Студенты не найдены</p>
                  <p className="text-sm">Попробуйте изменить критерии поиска</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManagement;