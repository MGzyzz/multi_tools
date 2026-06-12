import { Search, Plus } from 'lucide-react';

const GroupsSidebar = ({ isDark, filteredGroups, selectedGroup, isLoading, groupSearchTerm, onSearchChange, onSelectGroup, onAddGroup }) => (
  <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm rounded-2xl p-5 border ${isDark ? 'border-gray-700' : 'border-white/50'} shadow-lg lg:sticky lg:top-24 lg:self-start`}>
    <div className="flex items-center justify-between mb-4">
      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Группы</h3>
      <button
        onClick={onAddGroup}
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
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-9 pr-3 py-2 rounded-xl border ${isDark
            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400'
            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
          } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
        />
      </div>
    </div>

    <div className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent pr-2">
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-full px-4 py-3 rounded-xl ${isDark ? 'bg-gray-700/30' : 'bg-gray-100'} animate-pulse`}
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
            onClick={() => onSelectGroup(String(group.id))}
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
              <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
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
);

export default GroupsSidebar;
