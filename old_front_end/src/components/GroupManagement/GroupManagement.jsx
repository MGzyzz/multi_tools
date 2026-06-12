import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AddGroupModal from '../AddGroupModal/AddGroupModal';
import AddStudentModal from '../AddStudentModal/AddStudentModal';
import EditStudentModal from '../EditStudentModal/EditStudentModal';
import SubjectGroup from '../SubjectGroup/SubjectGroup';
import GroupManagementStats from './GroupManagementStats';
import GroupsSidebar from './GroupsSidebar';
import StudentsPanel from './StudentsPanel';

const GroupManagement = ({ isDark = false }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
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

  const selectedGroupData = groups.find((g) => g.id === selectedGroup);
  const canShowStudents = selectedGroup !== 'all' && selectedSubject?.id;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setIsLoadingGroups(true);
      try {
        const { getGroupList } = await import('../../api/getGroupList');
        const data = await getGroupList(controller.signal);
        const list = Array.isArray(data) ? data : (data?.groups ?? data?.data ?? []);
        const totalFromApi = Number(data?.total_students ?? 0);
        const normalized = list.map((g) => ({
          id: String(g.id),
          name: g.name,
          count: Number(g.students_count ?? g.count ?? 0),
          course: g.course,
          specialty: g.group_specialty ?? g.specialty,
        }));
        const total = totalFromApi || normalized.reduce((sum, g) => sum + (g.count || 0), 0);
        if (controller.signal.aborted) return;
        setTotalStudents(total);
        setGroups([{ id: 'all', name: 'Все группы', count: total }, ...normalized]);
      } catch (e) {
        if (e.name === 'CanceledError' || e.name === 'AbortError') return;
        console.error('Ошибка загрузки групп:', e);
        if (controller.signal.aborted) return;
        setTotalStudents(0);
        setGroups([{ id: 'all', name: 'Все группы', count: 0 }]);
      } finally {
        if (!controller.signal.aborted) setIsLoadingGroups(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    const controller = new AbortController();
    if (selectedGroup === 'all' || !selectedSubject?.id) {
      setStudents([]);
      setStudentsCount(0);
      setIsLoadingStudents(false);
      return () => controller.abort();
    }
    (async () => {
      setIsLoadingStudents(true);
      try {
        const { getStudentsListGroup } = await import('../../api/getGroupStudentList');
        const data = await getStudentsListGroup(selectedGroup, selectedSubject.id, controller.signal);
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        const normalizedStudents = list.map((student) => {
          const attendancePercent = Number(student.attendance?.percent ?? student.attendance_percent ?? 0);
          const status = attendancePercent >= 75 ? 'active' : attendancePercent >= 50 ? 'warning' : 'danger';
          return {
            id: student.id,
            firstName: student.first_name ?? '',
            lastName: student.last_name ?? '',
            name: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Без имени',
            email: student.email ?? '',
            age: student.age ?? '',
            telegramUsername: student.telegram_username ?? '',
            phone: student.phone ?? student.telegram_username ?? '',
            group: selectedGroupData?.name ?? '',
            groupId: String(selectedGroup),
            avatar: (student.first_name?.[0] || student.last_name?.[0] || 'S').toUpperCase(),
            attendance: attendancePercent,
            status,
          };
        });
        if (controller.signal.aborted) return;
        setStudents(normalizedStudents);
        setStudentsCount(Number(data?.count) || normalizedStudents.length);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error('Ошибка загрузки студентов:', error);
        if (controller.signal.aborted) return;
        setStudents([]);
        setStudentsCount(0);
      } finally {
        if (!controller.signal.aborted) setIsLoadingStudents(false);
      }
    })();
    return () => controller.abort();
  }, [selectedGroup, selectedSubject?.id, studentsRefreshKey, selectedGroupData]);

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => {
      const updated = [...prev];
      updated.splice(1, 0, newGroup);
      updated[0] = { ...updated[0], count: updated[0].count + (newGroup.count || 0) };
      return updated;
    });
    setTotalStudents((prev) => prev + (newGroup.count || 0));
    setSelectedGroup(String(newGroup.id));
  };

  const handleStudentCreated = (newStudent) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (String(g.id) === String(newStudent.groupId) || g.id === 'all') {
          return { ...g, count: g.count + 1 };
        }
        return g;
      })
    );
    setTotalStudents((prev) => prev + 1);
    if (selectedSubject?.id) setStudentsRefreshKey((prev) => prev + 1);
  };

  const handleStudentUpdated = (updatedStudent) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s)));
    setEditingStudent(updatedStudent);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setShowEditStudentModal(true);
    setActiveDropdown(null);
  };

  const handleToggleDropdown = (studentId) => {
    setActiveDropdown(activeDropdown === studentId ? null : studentId);
  };

  const handleOpenStudentJournal = (student) => {
    if (!selectedSubject?.id || selectedGroup === 'all') return;

    navigate(
      `/groups/${selectedGroup}/subjects/${selectedSubject.id}/students/${student.id}`,
      {
        state: {
          studentName: student.name,
          groupName: selectedGroupData?.name ?? '',
          subjectName: selectedSubject?.name ?? '',
        },
      }
    );
  };
  const filteredStudents = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.phone.toLowerCase().includes(term) ||
      String(s.group).toLowerCase().includes(term)
    );
  }, [debouncedSearchTerm, students]);

  const filteredGroups = useMemo(() => {
    const term = groupSearchTerm.trim().toLowerCase();
    if (!term) return groups;
    const matches = groups
      .filter((g) => g.id !== 'all')
      .filter((g) =>
        g.name?.toLowerCase().includes(term) ||
        String(g.specialty ?? '').toLowerCase().includes(term) ||
        String(g.course ?? '').toLowerCase().includes(term)
      );
    return [{ id: 'all', name: 'Все группы', count: groups[0]?.count ?? 0 }, ...matches];
  }, [groupSearchTerm, groups]);

  return (
    <div className={`p-4 sm:p-6 lg:p-8 min-h-screen ${isDark ? 'bg-gray-900' : 'bg-linear-to-br from-gray-50 via-blue-50 to-purple-50'}`}>
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

      <GroupManagementStats
        isDark={isDark}
        totalStudents={totalStudents}
        groupsCount={groups.length - 1}
        isLoading={isLoadingGroups}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <GroupsSidebar
          isDark={isDark}
          filteredGroups={filteredGroups}
          selectedGroup={selectedGroup}
          isLoading={isLoadingGroups}
          groupSearchTerm={groupSearchTerm}
          onSearchChange={setGroupSearchTerm}
          onSelectGroup={setSelectedGroup}
          onAddGroup={() => setShowAddGroupModal(true)}
        />

        <div className="lg:col-span-3 space-y-6">
          <SubjectGroup
            groupId={selectedGroup}
            groupName={selectedGroupData?.name}
            isDark={isDark}
            onSelectSubject={setSelectedSubject}
            selectedSubjectId={selectedSubject?.id}
          />

          {canShowStudents && (
            <StudentsPanel
              isDark={isDark}
              filteredStudents={filteredStudents}
              studentsCount={studentsCount}
              isLoading={isLoadingStudents}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedGroupData={selectedGroupData}
              onAddStudent={() => setShowAddStudentModal(true)}
              onEditStudent={handleEditStudent}
              onOpenStudentJournal={handleOpenStudentJournal}
              activeDropdown={activeDropdown}
              onToggleDropdown={handleToggleDropdown}
            />
          )}
        </div>
      </div>

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
          onClose={() => { setShowEditStudentModal(false); setEditingStudent(null); }}
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
