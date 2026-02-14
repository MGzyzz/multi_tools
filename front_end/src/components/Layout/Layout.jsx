import React, { useState, useEffect } from 'react';
import {
  Moon, Sun, Scan, Home, Users, BarChart3, Settings,
  LogOut, User, ChevronLeft, ChevronRight, Menu, X, Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserProfile } from '../../api/authAPI';


const Layout = ({ children, currentPage = 'home', onLogout, theme, setTheme, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const isDark = theme === 'dark';

  // Получаем данные пользователя из localStorage
  const [user, setUser] = useState(null);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  const menuItems = [
    { id: 'home', icon: Home, label: 'Главная', path: '/' },
    { id: 'tools', icon: Users, label: 'Инструменты', path: '/tools' },
    { id: 'analytics', icon: BarChart3, label: 'Аналитика', path: '/analytics' },
    { id: 'settings', icon: Settings, label: 'Настройки', path: '/settings' }
  ];

  const getInitials = (firstName, lastName) => {
    const first = firstName || '';
    const last = lastName || '';
    return ((first[0] || '') + (last[0] || '')).toUpperCase();
  };


  const getFullName = (firstName, lastName, username) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) return firstName;
    if (lastName) return lastName;
    return username || 'Пользователь';
  };

  const handleNavigation = (path) => {
    if (onNavigate) onNavigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    if (onLogout) onLogout();
  };

  const notifications = [
    {
      id: 'schedule-1',
      title: 'Перенос занятия',
      detail: 'Группа ИС-301: пара по Алгоритмам с 12:10 перенесена на 14:00, аудитория 312.',
      time: 'Сегодня, 09:25',
      isRead: false
    },
    {
      id: 'schedule-2',
      title: 'Замена аудитории',
      detail: 'Группа ИС-202: 15:30 → 15:30, аудитория 404 вместо 402.',
      time: 'Вчера, 18:10',
      isRead: false
    },
    {
      id: 'schedule-3',
      title: 'Отмена занятия',
      detail: 'Группа ИС-303: пара 11:00 отменена, перенос согласовывается.',
      time: '12 фев, 13:40',
      isRead: true
    }
  ];
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isProfileOpen && !e.target.closest('.profile-dropdown')) {
        setIsProfileOpen(false);
      }
      if (isNotificationsOpen && !e.target.closest('.notifications-dropdown')) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isProfileOpen, isNotificationsOpen]);

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem("user") || "null");
    if (cached) setUser(cached);

    getUserProfile()
      .then(setUser)
      .catch((err) => {
        console.error("Failed to fetch user:", err);
      });
  }, []);


  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}>
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 h-full ${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-xl border-r ${isDark ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300 z-40 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo */}
        <Link to="/" className="block">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            {isSidebarOpen ? (
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  <Scan className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    AI Attendance
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    v1.0.0 alpha
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mx-auto">
                <Scan className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${currentPage === item.id
                  ? isDark
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : isDark
                    ? 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
              <item.icon className={`w-5 h-5 ${isSidebarOpen ? '' : 'mx-auto'}`} />
              {isSidebarOpen && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Toggle Sidebar Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`w-full flex items-center justify-center p-3 rounded-xl cursor-pointer transition-all duration-300 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <aside
            className={`fixed left-0 top-0 h-full w-64 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-2xl z-50`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  <Scan className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    AI Attendance
                  </h1>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} cursor-pointer`}
              >
                <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            <nav className="p-4 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${currentPage === item.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : isDark
                        ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Header */}
        <header className={`${isDark ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-xl border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-30`}>
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`lg:hidden p-2 rounded-xl cursor-pointer ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              <Menu className={`w-6 h-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
            </button>

            {/* Right Side */}
            <div className="flex-1"></div>
            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`p-2 rounded-xl cursor-pointer transition-all duration-300 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notifications */}
              <div className="relative notifications-dropdown">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsNotificationsOpen((prev) => !prev);
                  }}
                  className={`p-2 rounded-xl cursor-pointer transition-all duration-300 ${
                    isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } relative`}
                  aria-haspopup="dialog"
                  aria-expanded={isNotificationsOpen}
                >
                  <Bell className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <div
                    role="dialog"
                    aria-label="Уведомления"
                    className={`absolute right-0 mt-3 w-[min(90vw,360px)] rounded-2xl border shadow-2xl overflow-hidden z-50 ${
                      isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div
                      className={`px-4 py-4 border-b ${
                        isDark ? 'border-gray-700/50' : 'border-gray-200'
                      }`}
                    >
                      <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Уведомления
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Изменения расписания
                      </p>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-xl border p-3 transition ${
                            notification.isRead
                              ? isDark
                                ? 'border-gray-700 bg-gray-800/40'
                                : 'border-gray-200 bg-gray-50'
                              : isDark
                                ? 'border-blue-500/40 bg-blue-500/10'
                                : 'border-blue-200 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                notification.isRead
                                  ? isDark
                                    ? 'bg-gray-600'
                                    : 'bg-gray-300'
                                  : 'bg-blue-500'
                              }`}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {notification.title}
                                </h4>
                                <span className={`text-xs whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {notification.time}
                                </span>
                              </div>
                              <p className={`text-xs mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                {notification.detail}
                              </p>
                              <span
                                className={`mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                                  notification.isRead
                                    ? isDark
                                      ? 'border-gray-600 text-gray-400 bg-gray-800'
                                      : 'border-gray-200 text-gray-500 bg-white'
                                    : isDark
                                      ? 'border-blue-400/40 text-blue-300 bg-blue-500/10'
                                      : 'border-blue-200 text-blue-700 bg-blue-100'
                                }`}
                              >
                                {notification.isRead ? 'Прочитано' : 'Непрочитано'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative profile-dropdown">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProfileOpen(!isProfileOpen);
                  }}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user ? getInitials(user.first_name, user.last_name) : '?'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {user ? getFullName(user.first_name, user.last_name, user.username) : 'Загрузка...'}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {user?.role || 'Не указано'}
                    </p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className={`absolute right-0 mt-2 w-64 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-2xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden z-50`}>
                    <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {user ? getInitials(user.first_name, user.last_name) : '?'}
                        </div>
                        <div className="flex-1">
                          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {user ? getFullName(user.first_name, user.last_name, user.username) : '—'}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {user?.email || user?.username || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          if (onNavigate) onNavigate('/teacher-profile');
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-300 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                      >
                        <User className="w-5 h-5" />
                        <span>Мой профиль</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          if (onNavigate) onNavigate('/settings');
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-300 ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                      >
                        <Settings className="w-5 h-5" />
                        <span>Настройки</span>
                      </button>

                      <div className={`my-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}></div>

                      <button
                        onClick={handleLogout}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-300 ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Выйти</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>

    </div>
  );
};

export default Layout;
