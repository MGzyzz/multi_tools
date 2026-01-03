import React, { useState } from 'react';
import { Moon, Sun, Scan, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authLogin } from '../../api/authAPI';

const Auth = ({ onLogin, theme, setTheme }) => {
  const isDark = theme === 'dark';
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Очищаем ошибки при вводе
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (loginError) {
      setLoginError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.login.trim()) {
      newErrors.login = 'Введите логин';
    }
    
    if (!formData.password) {
      newErrors.password = 'Введите пароль';
    }
    
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setLoginError('');
    
    try {
      // Реальный запрос к API
      const result = await authLogin(formData.login, formData.password);
      
      // Успешная авторизация
      if (onLogin) {
        onLogin(result.user);
      }
    } catch (error) {
      console.error('Login failed:', error);
      
      // Обработка разных типов ошибок
      if (error.response) {
        // Сервер ответил с ошибкой
        if (error.response.status === 401) {
          setLoginError('Неверный логин или пароль');
        } else if (error.response.status === 400) {
          setLoginError('Проверьте правильность введенных данных');
        } else {
          setLoginError('Ошибка сервера. Попробуйте позже');
        }
      } else if (error.request) {
        // Запрос был отправлен, но ответа не получено
        setLoginError('Не удается подключиться к серверу');
      } else {
        setLoginError('Произошла ошибка. Попробуйте снова');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} p-4`}>
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`fixed top-6 right-6 p-3 rounded-xl cursor-pointer transition-all duration-300 z-50 ${
          isDark 
            ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
            : 'bg-white hover:bg-gray-100 text-gray-700'
        } shadow-lg hover:shadow-xl hover:scale-105`}
      >
        {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      <div className={`w-full max-w-md ${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-xl rounded-3xl shadow-2xl border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-8 sm:p-10 transition-all duration-300`}>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-xl">
              <Scan className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            AI Attendance System
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Войдите в систему управления посещаемостью
          </p>
        </div>

        {/* Общая ошибка авторизации */}
        {loginError && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center text-red-500">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{loginError}</span>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Логин
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <input
                type="text"
                name="login"
                value={formData.login}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                placeholder="Введите ваш логин"
                disabled={isLoading}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                  errors.login 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                    : isDark 
                      ? 'border-gray-600 focus:border-blue-500 focus:ring-blue-500/20' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                } ${
                  isDark ? 'bg-gray-700/50 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
            {errors.login && (
              <div className="flex items-center mt-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span>{errors.login}</span>
              </div>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Пароль
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                placeholder="Введите ваш пароль"
                disabled={isLoading}
                className={`w-full pl-12 pr-12 py-3 rounded-xl border ${
                  errors.password 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                    : isDark 
                      ? 'border-gray-600 focus:border-blue-500 focus:ring-blue-500/20' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                } ${
                  isDark ? 'bg-gray-700/50 text-white placeholder-gray-500' : 'bg-gray-50 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <EyeOff className={`w-5 h-5 ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200`} />
                ) : (
                  <Eye className={`w-5 h-5 ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors duration-200`} />
                )}
              </button>
            </div>
            {errors.password && (
              <div className="flex items-center mt-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span>{errors.password}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                disabled={isLoading}
                className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className={`ml-2 text-sm ${isDark ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-700'} transition-colors duration-200`}>
                Запомнить меня
              </span>
            </label>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => console.log('Forgot password')}
              className={`text-sm font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Забыли пароль?
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`w-full py-3.5 rounded-xl font-semibold text-white cursor-pointer transition-all duration-300 ${
              isLoading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-purple-500/50'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Вход...</span>
              </div>
            ) : (
              'Войти в систему'
            )}
          </button>
        </div>

        <div className="relative my-8">
          <div className={`absolute inset-0 flex items-center`}>
            <div className={`w-full border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-4 ${isDark ? 'bg-gray-800/50 text-gray-400' : 'bg-white text-gray-500'}`}>
              Корпоративная авторизация
            </span>
          </div>
        </div>

        <div className="text-center space-y-3">
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Используйте учетные данные, выданные администрацией университета
          </p>
          <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>
            Возникли проблемы? <button 
              type="button"
              onClick={() => console.log('Contact support')}
              className={`${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} font-medium cursor-pointer transition-colors duration-200`}
            >
              Связаться с поддержкой
            </button>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className={`absolute top-20 left-10 w-72 h-72 ${isDark ? 'bg-blue-500/10' : 'bg-blue-500/5'} rounded-full blur-3xl`}></div>
        <div className={`absolute bottom-20 right-10 w-96 h-96 ${isDark ? 'bg-purple-500/10' : 'bg-purple-500/5'} rounded-full blur-3xl`}></div>
      </div>
    </div>
  );
};

export default Auth;