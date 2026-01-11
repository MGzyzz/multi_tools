import React, { useState, useEffect } from 'react';
import {
  Moon, Sun, Scan, Home, Camera, Users, BarChart3, Settings,
  LogOut, User, ChevronLeft, ChevronRight, Menu, X, Bell, Search
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

  const isDark = theme === 'dark';

  // Получаем данные пользователя из localStorage
  const [user, setUser] = useState(null);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  const menuItems = [
    { id: 'home', icon: Home, label: 'Главная', path: '/' },
    { id: 'attendance', icon: Camera, label: 'Посещаемость', path: '/attendance' },
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

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isProfileOpen && !e.target.closest('.profile-dropdown')) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isProfileOpen]);

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

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-xl mx-4">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Поиск студентов, групп..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl border ${isDark ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-300`}
                />
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`p-2 rounded-xl cursor-pointer transition-all duration-300 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notifications */}
              <button className={`p-2 rounded-xl cursor-pointer transition-all duration-300 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} relative`}>
                <Bell className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

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
                          if (onNavigate) onNavigate('/settings');
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