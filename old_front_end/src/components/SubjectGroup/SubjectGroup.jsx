import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Search } from 'lucide-react';
import { getSubjectGroup } from '../../api/getSubjectGroup';

const SubjectGroup = ({ groupId, groupName, isDark = false, onSelectSubject, selectedSubjectId }) => {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState('');

  const hasGroup = groupId && groupId !== 'all';

  useEffect(() => {
    const controller = new AbortController();

    if (!hasGroup) {
      setSubjects([]);
      setIsLoading(false);
      setLoadError('');
      setSearchTerm('');
      return () => controller.abort();
    }

    setSearchTerm('');

    (async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const data = await getSubjectGroup(groupId, controller.signal);
        const list = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : (data?.data ?? []);

        const normalized = list.map((subject) => ({
          id: subject.id,
          name: subject.name ?? 'Без названия',
          description: subject.description ?? '',
        }));

        if (controller.signal.aborted) return;
        setSubjects(normalized);
      } catch (error) {
        if (error.name === 'CanceledError' || error.name === 'AbortError') return;
        console.error('Ошибка загрузки предметов:', error);
        if (controller.signal.aborted) return;
        setSubjects([]);
        setLoadError('Не удалось загрузить предметы.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [groupId, hasGroup]);

  const filteredSubjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return subjects;
    return subjects.filter((subject) => {
      return (
        subject.name.toLowerCase().includes(term) ||
        subject.description.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, subjects]);

  return (
    <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg`}>
      <div className={`p-5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Предметы группы
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {hasGroup ? `Группа: ${groupName ?? groupId}` : 'Выберите группу слева'}
            </p>
          </div>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {hasGroup ? `Всего предметов: ${subjects.length}` : '—'}
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Поиск предметов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!hasGroup}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${isDark
                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-60`}
            />
          </div>
        </div>
      </div>

      <div className="p-5">
        {!hasGroup && (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <BookOpen className="w-14 h-14 mx-auto mb-4 opacity-50" />
            <p className="text-base font-medium mb-1">Выберите группу</p>
            <p className="text-sm">Чтобы увидеть список предметов</p>
          </div>
        )}

        {hasGroup && isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className={`w-12 h-12 ${isDark ? 'text-blue-400' : 'text-blue-600'} animate-spin mb-4`} />
            <p className={`text-base font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Загрузка предметов...
            </p>
          </div>
        )}

        {hasGroup && !isLoading && loadError && (
          <div className={`text-center py-12 ${isDark ? 'text-red-300' : 'text-red-600'}`}>
            <p className="text-base font-medium">{loadError}</p>
          </div>
        )}

        {hasGroup && !isLoading && !loadError && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubjects.map((subject) => {
                const isSelected = String(selectedSubjectId) === String(subject.id);
                return (
                  <div
                    key={subject.id}
                    onClick={() => {
                      if (typeof onSelectSubject === 'function') {
                        onSelectSubject(subject);
                      }
                    }}
                    className={`${isDark ? 'bg-gray-700/30' : 'bg-white'} rounded-xl p-4 border ${isSelected ? (isDark ? 'border-blue-500/60 bg-blue-500/10' : 'border-blue-300 bg-blue-50') : (isDark ? 'border-gray-600' : 'border-gray-200')} hover:shadow-xl transition-all duration-300 cursor-pointer ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50 hover:border-blue-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {subject.name}
                          </h4>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            ID: {subject.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className={`mt-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {subject.description || 'Описание отсутствует.'}
                    </p>
                  </div>
                );
              })}
            </div>

            {filteredSubjects.length === 0 && (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <BookOpen className="w-14 h-14 mx-auto mb-4 opacity-50" />
                <p className="text-base font-medium mb-1">Предметы не найдены</p>
                <p className="text-sm">Измените параметры поиска</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubjectGroup;
