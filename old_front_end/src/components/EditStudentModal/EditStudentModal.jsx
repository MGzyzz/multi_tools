import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Mail,
  Calendar,
  Users,
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { editStudent } from '../../api/editStudent';

const EditStudentModal = ({ isOpen, onClose, isDark = false, student, groups = [], onUpdated }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    telegramUsername: '',
    groupId: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;
    setFormData({
      firstName: student.firstName ?? student.name?.split(' ')[0] ?? '',
      lastName: student.lastName ?? student.name?.split(' ').slice(1).join(' ') ?? '',
      email: student.email ?? '',
      age: student.age ?? '',
      telegramUsername: student.telegramUsername ?? '',
      groupId: student.groupId ?? '',
    });
    setErrors({});
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Некорректный email адрес';
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
      const payload = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        age: Number(formData.age),
        telegram_username: formData.telegramUsername.trim(),
      };

      const response = await editStudent(student.id, payload);

      const firstName = formData.firstName.trim();
      const lastName = formData.lastName.trim();
      const updatedStudent = {
        ...student,
        firstName: response?.first_name ?? firstName,
        lastName: response?.last_name ?? lastName,
        name: `${response?.first_name ?? firstName} ${response?.last_name ?? lastName}`.trim() || 'Без имени',
        email: response?.email ?? formData.email.trim(),
        age: response?.age ?? Number(formData.age),
        telegramUsername: response?.telegram_username ?? formData.telegramUsername.trim(),
        phone: response?.phone ?? formData.phone?.trim() ?? student.phone ?? '',
        avatar: ((response?.first_name ?? firstName)?.[0] || (response?.last_name ?? lastName)?.[0] || 'S').toUpperCase(),
      };

      if (typeof onUpdated === 'function') {
        await onUpdated(updatedStudent);
      }

      onClose();
    } catch (error) {
      console.error('Ошибка при обновлении студента:', error);
      setErrors({ submit: 'Не удалось сохранить изменения. Попробуйте еще раз.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const groupName = groups.find((group) => String(group.id) === String(formData.groupId))?.name
    || student.group
    || '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full max-w-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl transform transition-all duration-300 animate-slideUp`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Редактировать студента
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Обновите данные студента
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Имя *
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Иван"
                  disabled={isSubmitting}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${errors.firstName
                    ? 'border-red-500 focus:ring-red-500/50'
                    : isDark
                      ? 'border-gray-600 focus:ring-blue-500/50'
                      : 'border-gray-300 focus:ring-blue-500/50'
                    } ${isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
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
                className={`w-full px-4 py-3 rounded-xl border ${errors.lastName
                  ? 'border-red-500 focus:ring-red-500/50'
                  : isDark
                    ? 'border-gray-600 focus:ring-blue-500/50'
                    : 'border-gray-300 focus:ring-blue-500/50'
                  } ${isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {errors.lastName && (
                <div className="flex items-center space-x-1 mt-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.lastName}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Email *
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@example.com"
                disabled={isSubmitting}
                className={`w-full pl-11 pr-4 py-3 rounded-xl border ${errors.email
                  ? 'border-red-500 focus:ring-red-500/50'
                  : isDark
                    ? 'border-gray-600 focus:ring-blue-500/50'
                    : 'border-gray-300 focus:ring-blue-500/50'
                  } ${isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
            {errors.email && (
              <div className="flex items-center space-x-1 mt-2 text-red-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.email}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Возраст *
              </label>
              <div className="relative">
                <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="18"
                  min="3"
                  max="120"
                  disabled={isSubmitting}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${errors.age
                    ? 'border-red-500 focus:ring-red-500/50'
                    : isDark
                      ? 'border-gray-600 focus:ring-blue-500/50'
                      : 'border-gray-300 focus:ring-blue-500/50'
                    } ${isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
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
                Telegram
              </label>
              <div className="relative">
                <MessageCircle className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  name="telegramUsername"
                  value={formData.telegramUsername}
                  onChange={handleChange}
                  placeholder="@username"
                  disabled={isSubmitting}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${isDark
                    ? 'border-gray-600 focus:ring-blue-500/50'
                    : 'border-gray-300 focus:ring-blue-500/50'
                    } ${isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'} focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Группа
            </label>
            <div className="relative">
              <Users className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                value={groupName}
                disabled
                className={`w-full pl-11 pr-4 py-3 rounded-xl border ${isDark
                  ? 'border-gray-600'
                  : 'border-gray-300'
                  } ${isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-700'} focus:outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed`}
              />
            </div>
          </div>

          {errors.submit && (
            <div className={`p-4 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start space-x-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                    {errors.submit}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className={`flex-1 px-4 py-3 rounded-xl font-medium border ${isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                } transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 transition-all duration-300 hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditStudentModal;
