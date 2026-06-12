import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  BookOpen,
  Check,
  AlertCircle,
  Users,
  Calendar
} from 'lucide-react';
import {createStudent} from '../../api/createStudent';

const AddStudentModal = ({ isOpen, onClose, isDark = false, groups = [], selectedGroupId = null, onCreated }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    groupId: selectedGroupId || '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Обновляем groupId когда меняется selectedGroupId
  useEffect(() => {
    if (selectedGroupId && selectedGroupId !== 'all') {
      setFormData(prev => ({ ...prev, groupId: selectedGroupId }));
    }
  }, [selectedGroupId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'Имя обязательно';
    if (!formData.lastName.trim()) newErrors.lastName = 'Фамилия обязательна';
    
    if (!formData.age.toString().trim()) {
      newErrors.age = 'Возраст обязателен';
    } else {
      const ageNum = Number(formData.age);
      if (!Number.isInteger(ageNum) || ageNum < 3 || ageNum > 120) {
        newErrors.age = 'Некорректный возраст (от 3 до 120)';
      }
    }
    
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Некорректный email адрес';
    }

    if (!formData.groupId || formData.groupId === 'all') {
      newErrors.groupId = 'Выберите группу';
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const studentData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        age: Number(formData.age),
        group_id: Number(formData.groupId),
      };

      const response = await createStudent(studentData);

      if (response && response.id) {
        // Находим название группы
        const selectedGroupObj = groups.find(g => String(g.id) === String(formData.groupId));
        
        const newStudent = {
          id: response.id,
          firstName: response.first_name,
          lastName: response.last_name,
          name: `${response.first_name} ${response.last_name}`,
          email: response.email,
          age: response.age,
          phone: response.phone || '',
          telegramUsername: response.telegram_username || '',
          group: response.group?.name || selectedGroupObj?.name || '',
          groupId: String(formData.groupId), // ВАЖНО: приводим к строке
          avatar: response.first_name?.[0]?.toUpperCase() || 'S',
          attendance: 0,
          status: 'active',
        };

        if (typeof onCreated === 'function') {
          await onCreated(newStudent);
        }

        // Очищаем форму
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          age: '',
          groupId: selectedGroupId || '',
        });

        onClose();
      } else {
        throw new Error('Некорректный ответ от сервера');
      }
    } catch (error) {
      console.error('Ошибка при создании студента:', error);
      
      let errorMessage = 'Не удалось добавить студента. Попробуйте еще раз.';
      
      if (error?.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          if (data?.email) {
            errorMessage = 'Студент с таким email уже существует';
          } else if (data?.message || data?.detail) {
            errorMessage = data.message || data.detail;
          } else {
            errorMessage = 'Некорректные данные студента';
          }
        } else if (status === 409) {
          errorMessage = 'Студент с такими данными уже существует';
        } else if (status === 403) {
          errorMessage = 'У вас нет прав для добавления студента';
        } else if (status === 404) {
          errorMessage = 'Выбранная группа не найдена';
        } else if (status === 500) {
          errorMessage = 'Ошибка сервера. Попробуйте позже';
        } else if (data?.message || data?.detail) {
          errorMessage = data.message || data.detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  // Фильтруем группы (убираем "Все группы")
  const availableGroups = groups.filter(g => g.id !== 'all');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full max-w-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl transform transition-all duration-300 animate-slideUp`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Добавить студента
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Добавьте нового студента в группу
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-2 rounded-lg ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Ошибка сабмита */}
          {errors.submit && (
            <div
              className={`p-4 rounded-xl ${
                isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                <p className={`${isDark ? 'text-red-300' : 'text-red-700'} text-sm`}>{errors.submit}</p>
              </div>
            </div>
          )}

          {/* Имя и Фамилия */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Имя *
              </label>
              <div className="relative">
                <User
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Иван"
                  disabled={isSubmitting}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    errors.firstName 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : isDark 
                        ? 'border-gray-600 focus:ring-blue-500/50' 
                        : 'border-gray-300 focus:ring-blue-500/50'
                  } ${
                    isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </div>
              {errors.firstName && (
                <div className="flex items-center space-x-1 mt-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.firstName}</span>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Фамилия *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Иванов"
                disabled={isSubmitting}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.lastName 
                    ? 'border-red-500 focus:ring-red-500/50' 
                    : isDark 
                      ? 'border-gray-600 focus:ring-blue-500/50' 
                      : 'border-gray-300 focus:ring-blue-500/50'
                } ${
                  isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {errors.lastName && (
                <div className="flex items-center space-x-1 mt-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.lastName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Email *
            </label>
            <div className="relative">
              <Mail
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@example.com"
                disabled={isSubmitting}
                className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500/50' 
                    : isDark 
                      ? 'border-gray-600 focus:ring-blue-500/50' 
                      : 'border-gray-300 focus:ring-blue-500/50'
                } ${
                  isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
            {errors.email && (
              <div className="flex items-center space-x-1 mt-2 text-red-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.email}</span>
              </div>
            )}
          </div>

          {/* Возраст и Группа */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Возраст *
              </label>
              <div className="relative">
                <Calendar
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                />
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="18"
                  min="3"
                  max="120"
                  disabled={isSubmitting}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    errors.age 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : isDark 
                        ? 'border-gray-600 focus:ring-blue-500/50' 
                        : 'border-gray-300 focus:ring-blue-500/50'
                  } ${
                    isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </div>
              {errors.age && (
                <div className="flex items-center space-x-1 mt-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.age}</span>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Группа *
              </label>
              <div className="relative">
                <Users
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                />
                <select
                  name="groupId"
                  value={formData.groupId}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    errors.groupId 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : isDark 
                        ? 'border-gray-600 focus:ring-blue-500/50' 
                        : 'border-gray-300 focus:ring-blue-500/50'
                  } ${
                    isDark ? 'bg-gray-700/50 text-white' : 'bg-white text-gray-900'
                  } focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">Выберите группу</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} {group.specialty ? `• ${group.specialty}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {errors.groupId && (
                <div className="flex items-center space-x-1 mt-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.groupId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-start space-x-3">
              <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>
                  Важно
                </p>
                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'} mt-1`}>
                  Студент будет добавлен в выбранную группу. Email должен быть уникальным.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`flex-1 px-6 py-3 rounded-xl border ${
                isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Добавление...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Добавить студента</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default AddStudentModal;
