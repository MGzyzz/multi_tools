import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  Phone,
  BookOpen,
  TrendingUp,
  UserCheck,
  UserX,
  Loader2,
  UserPlus
} from 'lucide-react';
import AddGroupModal from '../AddGroupModal/AddGroupModal';
import AddStudentModal from '../AddStudentModal/AddStudentModal';
import EditStudentModal from '../EditStudentModal/EditStudentModal';
import SubjectGroup from '../SubjectGroup/SubjectGroup';

const GroupManagement = ({ isDark = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [studentsRefreshKey, setStudentsRefreshKey] = useState(0);

  const [groups, setGroups] = useState([{ id: 'all', name: 'Все группы', count: 0 }]);
  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  // Загрузка списка групп
  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoadingGroups(true);
      try {
        const { getGroupList } = await import('../../api/getGroupList');
        const data = await getGroupList();

        const list = Array.isArray(data) ? data : (data?.groups ?? data?.data ?? []);
        const totalFromApi = Number(data?.total_students ?? 0);

        const normalized = list.map((g) => ({
          id: String(g.id), // ВАЖНО: приводим к строке
          name: g.name,
          count: Number(g.students_count ?? g.count ?? 0),
          course: g.course,
          specialty: g.group_specialty ?? g.specialty,
        }));

        const total = totalFromApi || normalized.reduce((sum, g) => sum + (g.count || 0), 0);

        if (!mounted) return;
        setTotalStudents(total);
        setGroups([{ id: 'all', name: 'Все группы', count: total }, ...normalized]);
      } catch (e) {
        console.error('Ошибка загрузки групп:', e);
        if (!mounted) return;
        setTotalStudents(0);
        setGroups([{ id: 'all', name: 'Все группы', count: 0 }]);
      } finally {
        if (mounted) setIsLoadingGroups(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setSelectedSubject(null);
    setStudents([]);
    setStudentsCount(0);
    setSearchTerm('');
    setActiveDropdown(null);
    setEditingStudent(null);
    setShowEditStudentModal(false);
  }, [selectedGroup]);

  useEffect(() => {
    setSearchTerm('');
    setActiveDropdown(null);
    setEditingStudent(null);
    setShowEditStudentModal(false);
  }, [selectedSubject]);

  useEffect(() => {
    let mounted = true;

    if (selectedGroup === 'all' || !selectedSubject?.id) {
      setStudents([]);
      setStudentsCount(0);
      setIsLoadingStudents(false);
      return () => { mounted = false; };
    }

    (async () => {
      setIsLoadingStudents(true);
      try {
        const { getStudentsListGroup } = await import('../../api/getGroupStudentList');
        const data = await getStudentsListGroup(selectedGroup, selectedSubject.id);

        const list = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];

        const normalizedStudents = list.map((student) => {
          const attendancePercent = Number(student.attendance?.percent ?? student.attendance_percent ?? 0);
          const status = attendancePercent >= 75 ? 'active' : attendancePercent >= 50 ? 'warning' : 'danger';

          return {
            id: student.id,
            firstName: student.first_name ?? "",
            lastName: student.last_name ?? "",
            name: `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Без имени",
            email: student.email ?? "",
            age: student.age ?? "",
            telegramUsername: student.telegram_username ?? "",
            phone: student.phone ?? student.telegram_username ?? "",
            group: selectedGroupData?.name ?? "",
            groupId: String(selectedGroup),
            avatar: (student.first_name?.[0] || student.last_name?.[0] || "S").toUpperCase(),
            attendance: attendancePercent,
            status,
          };
        });

        if (!mounted) return;
        setStudents(normalizedStudents);
        setStudentsCount(Number(data?.count) || normalizedStudents.length);
      } catch (error) {
        console.error('Ошибка загрузки студентов:', error);
        if (!mounted) return;
        setStudents([]);
        setStudentsCount(0);
      } finally {
        if (mounted) setIsLoadingStudents(false);
      }
    })();

    return () => { mounted = false; };
  }, [selectedGroup, selectedSubject?.id, studentsRefreshKey, selectedGroupData]);

  // Обработчик создания новой группы
  const handleGroupCreated = async (newGroup) => {
    setGroups((prevGroups) => {
      const updatedGroups = [...prevGroups];
      updatedGroups.splice(1, 0, newGroup);

      updatedGroups[0] = {
        ...updatedGroups[0],
        count: updatedGroups[0].count + (newGroup.count || 0)
      };

      return updatedGroups;
    });

    setTotalStudents((prev) => prev + (newGroup.count || 0));
    setSelectedGroup(String(newGroup.id)); // ВАЖНО: приводим к строке
  };

  const handleStudentCreated = async (newStudent) => {
    setGroups((prevGroups) => {
      return prevGroups.map((g) => {
        if (String(g.id) === String(newStudent.groupId)) {
          return { ...g, count: g.count + 1 };
        }
        if (g.id === 'all') {
          return { ...g, count: g.count + 1 };
        }
        return g;
      });
    });

    setTotalStudents((prev) => prev + 1);
    if (selectedSubject?.id) {
      setStudentsRefreshKey((prev) => prev + 1);
    }
  };

  const handleStudentUpdated = async (updatedStudent) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) =>
        student.id === updatedStudent.id ? { ...student, ...updatedStudent } : student
      )
    );
    setEditingStudent(updatedStudent);
  };

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.phone.toLowerCase().includes(term) ||
        String(student.group).toLowerCase().includes(term)
      );
    });
  }, [searchTerm, students]);

  const filteredGroups = useMemo(() => {
    const term = groupSearchTerm.trim().toLowerCase();
    if (!term) return groups;
    const baseGroups = groups.filter((group) => group.id !== 'all');
    const matches = baseGroups.filter((group) => {
      return (
        group.name?.toLowerCase().includes(term) ||
        String(group.specialty ?? '').toLowerCase().includes(term) ||
        String(group.course ?? '').toLowerCase().includes(term)
      );
    });
    return [{ id: 'all', name: 'Все группы', count: groups[0]?.count ?? 0 }, ...matches];
  }, [groupSearchTerm, groups]);

  const canShowStudents = selectedGroup !== 'all' && selectedSubject?.id;

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
          <p className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isLoadingGroups ? '...' : totalStudents}
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
            {isLoadingGroups ? '...' : groups.length - 1}
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Groups Sidebar */}
        <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-5 border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg lg:sticky lg:top-24 lg:self-start`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Группы</h3>
            <button
              onClick={() => setShowAddGroupModal(true)}
              className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors cursor-pointer`}
            >
              <Plus className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Поиск групп..."
                value={groupSearchTerm}
                onChange={(e) => setGroupSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl border ${isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent pr-2">
            {isLoadingGroups ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-gray-700/30' : 'bg-gray-100'
                      } animate-pulse`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`h-4 w-24 rounded ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                      <div className={`h-5 w-8 rounded-lg ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(String(group.id))} // ВАЖНО: приводим к строке
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer ${selectedGroup === group.id
                    ? isDark
                      ? 'bg-blue-500/20 border-blue-500/50 border'
                      : 'bg-blue-100 border-blue-300 border'
                    : isDark
                      ? 'hover:bg-gray-700/50 border border-transparent'
                      : 'hover:bg-gray-50 border border-transparent'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium text-sm ${selectedGroup === group.id
                      ? isDark ? 'text-blue-400' : 'text-blue-700'
                      : isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                      {group.name}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
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
              ))
            )}
          </div>
        </div>

        {/* Subjects and Students */}
        <div className="lg:col-span-3 space-y-6">
          <SubjectGroup
            groupId={selectedGroup}
            groupName={selectedGroupData?.name}
            isDark={isDark}
            onSelectSubject={setSelectedSubject}
            selectedSubjectId={selectedSubject?.id}
          />

          {canShowStudents && (
            <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg`}>
              <div className={`p-5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                  <div className="flex-1 relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                      type="text"
                      placeholder="Поиск студентов..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isDark
                        ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                    />
                  </div>
                  <button
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border ${isDark ? 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      } transition-colors cursor-pointer shadow-sm`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm font-medium">Фильтры</span>
                  </button>
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-emerald-500/50 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="text-sm">Добавить студента</span>
                  </button>
                </div>

                {selectedGroupData && (
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Показано студентов: {filteredStudents.length} из {studentsCount}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5 relative">
                {isLoadingStudents ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-600'} animate-spin mb-4`} />
                    <p className={`text-base font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Загрузка студентов...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className={`${isDark ? 'bg-gray-700/30' : 'bg-white'} rounded-xl p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'
                            } hover:shadow-xl transition-all duration-300 cursor-pointer ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50 hover:border-blue-200'
                            }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
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
                                <div className={`absolute right-0 mt-2 w-48 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'
                                  } shadow-xl z-10`}>
                                  <button
                                    onClick={() => {
                                      setEditingStudent(student);
                                      setShowEditStudentModal(true);
                                      setActiveDropdown(null);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} rounded-t-xl transition-colors flex items-center space-x-2 cursor-pointer`}
                                  >
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

                    {filteredStudents.length === 0 && !isLoadingStudents && (
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
          )}
        </div>
      </div>

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <AddGroupModal
          isOpen={showAddGroupModal}
          onClose={() => setShowAddGroupModal(false)}
          onCreated={handleGroupCreated}
          isDark={isDark}
        />
      )}

      {showAddStudentModal && (
        <AddStudentModal
          isOpen={showAddStudentModal}
          onClose={() => setShowAddStudentModal(false)}
          onCreated={handleStudentCreated}
          groups={groups}
          selectedGroupId={selectedGroup}
          isDark={isDark}
        />
      )}

      {showEditStudentModal && (
        <EditStudentModal
          isOpen={showEditStudentModal}
          onClose={() => {
            setShowEditStudentModal(false);
            setEditingStudent(null);
          }}
          onUpdated={handleStudentUpdated}
          student={editingStudent}
          groups={groups}
          isDark={isDark}
        />
      )}

    </div>
  );
};

export default GroupManagement;
