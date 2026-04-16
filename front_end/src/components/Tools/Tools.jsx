import { BarChart3, CalendarRange, FileText, Settings, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const Tools = ({ isDark = true }) => {
  const tools = [
    {
      icon: FileText,
      title: 'Журнал посещаемости и оценок',
      description: 'Откройте группу, предмет и детальную карточку студента, чтобы вести журнал по занятиям.',
      color: 'from-blue-500 to-indigo-600',
      path: '/groups',
    },
    {
      icon: Users,
      title: 'Группы и студенты',
      description: 'Управление списками студентов, быстрый переход к нужной группе и предмету.',
      color: 'from-emerald-500 to-green-600',
      path: '/groups',
    },
    {
      icon: CalendarRange,
      title: 'Планировщик расписания',
      description: 'Сетка недели для добавления занятий, видимость занятых слотов и шаблон на семестр.',
      color: 'from-fuchsia-500 to-rose-600',
      path: '/schedule-planner',
    },
    {
      icon: BarChart3,
      title: 'Аналитика преподавателя',
      description: 'Сводная картина по посещаемости, рискам и динамике по вашим группам.',
      color: 'from-amber-500 to-orange-600',
      path: '/analytics',
    },
    {
      icon: Settings,
      title: 'Настройки групп',
      description: 'Рабочая зона для учебных групп, предметов и организационной структуры.',
      color: 'from-slate-500 to-slate-600',
      path: '/groups',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Инструменты преподавателя
          </h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Рабочие сценарии собраны вокруг преподавателя: группы, журнал занятий, оценки и аналитика.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {tools.map((tool) => (
            <Link key={tool.title} to={tool.path}>
              <button
                className={`${isDark ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-white hover:bg-gray-50'}
                border ${isDark ? 'border-gray-700' : 'border-gray-200'}
                rounded-2xl p-6 cursor-pointer transition-all duration-300
                hover:scale-[1.02] shadow-lg hover:shadow-xl text-left group w-full h-full`}
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color}
                  flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <tool.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {tool.title}
                </h3>

                <p className={`text-sm leading-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {tool.description}
                </p>
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tools;
