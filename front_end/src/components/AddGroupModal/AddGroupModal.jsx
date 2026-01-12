import React, { useState } from 'react';
import { 
  X, 
  Users, 
  BookOpen, 
  Calendar,
  GraduationCap,
  Check,
  AlertCircle
} from 'lucide-react';


import {createGroup} from '../../api/createGroup';


const AddGroupModal = ({ isOpen, onClose, onCreated ,isDark = false}) => {
  const [formData, setFormData] = useState({
    name: '',
    course: '1',
    specialty: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Название группы обязательно';
    }
    
    if (!formData.specialty.trim()) {
      newErrors.specialty = 'Специальность обязательна';
    }
    
    // if (!formData.startDate) {
    //   newErrors.startDate = 'Дата начала обучения обязательна';
    // }

    return newErrors;
  };

   const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await createGroup(formData.name, formData.course, formData.specialty);
      
      // Формируем объект новой группы для передачи в родительский компонент
      const newGroup = {
        id: String(response.id || response.data?.id || Date.now()),
        name: formData.name,
        course: formData.course,
        specialty: formData.specialty,
        count: 0
      };
      
      // Вызываем коллбэк для обновления списка групп
      if (onCreated) {
        onCreated(newGroup);
      }
      
      // Очищаем форму после успешного создания
      setFormData({
        name: '',
        course: '1',
        specialty: '',
      });
      
      // Закрываем модальное окно
      onClose();
    } catch (error) {
      console.error('Ошибка при создании группы:', error);
      
      // Обрабатываем ошибку от сервера
      const errorMessage = error.response?.data?.name?.[0] 
        || error.response?.data?.message 
        || error.message 
        || 'Не удалось создать группу. Попробуйте снова.';
      
      setErrors({ 
        submit: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div 
        className={`w-full max-w-2xl ${
          isDark ? 'bg-gray-800' : 'bg-white'
        } rounded-2xl shadow-2xl transform transition-all duration-300 animate-slideUp`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Добавить группу
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Создайте новую учебную группу
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } transition-colors`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Название группы */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Название группы *
            </label>
            <div className="relative">
              <BookOpen className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Например: ИС-21-1"
                className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                  errors.name 
                    ? 'border-red-500 focus:ring-red-500/50' 
                    : isDark 
                      ? 'border-gray-600 focus:ring-blue-500/50' 
                      : 'border-gray-300 focus:ring-blue-500/50'
                } ${
                  isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 transition-all`}
              />
            </div>
            {errors.name && (
              <div className="flex items-center space-x-1 mt-2 text-red-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{errors.name}</span>
              </div>
            )}
          </div>

          {/* Курс и Специальность */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Курс *
              </label>
              <div className="relative">
                <GraduationCap className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <select
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    isDark 
                      ? 'border-gray-600 bg-gray-700/50 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer`}
                >
                  <option value="1">1 курс</option>
                  <option value="2">2 курс</option>
                  <option value="3">3 курс</option>
                  <option value="4">4 курс</option>
                  <option value="5">5 курс</option>
                </select>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Специальность *
              </label>
              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="Информационные системы"
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.specialty 
                    ? 'border-red-500 focus:ring-red-500/50' 
                    : isDark 
                      ? 'border-gray-600 focus:ring-blue-500/50' 
                      : 'border-gray-300 focus:ring-blue-500/50'
                } ${
                  isDark ? 'bg-gray-700/50 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 transition-all`}
              />
              {errors.specialty && (
                <div className="flex items-center space-x-1 mt-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.specialty}</span>
                </div>
              )}
            </div>
          </div>

          {/* Дата начала и Количество студентов */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Дата начала обучения *
              </label>
              <div className="relative">
                <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    errors.startDate 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : isDark 
                        ? 'border-gray-600 focus:ring-blue-500/50' 
                        : 'border-gray-300 focus:ring-blue-500/50'
                  } ${
                    isDark ? 'bg-gray-700/50 text-white' : 'bg-white text-gray-900'
                  } focus:outline-none focus:ring-2 transition-all`}
                />
              </div>
              {errors.startDate && (
                <div className="flex items-center space-x-1 mt-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.startDate}</span>
                </div>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Планируемое количество студентов
              </label>
              <div className="relative">
                <Users className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="number"
                  name="studentsCount"
                  value={formData.studentsCount}
                  onChange={handleChange}
                  placeholder="25"
                  min="0"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    isDark 
                      ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400' 
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                />
              </div>
            </div>
          </div> */}

          {/* Info Banner */}
          <div className={`p-4 rounded-xl ${
            isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start space-x-3">
              <AlertCircle className={`w-5 h-5 mt-0.5 ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-900'}`}>
                  После создания группы
                </p>
                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'} mt-1`}>
                  Вы сможете добавить студентов в группу через раздел "Добавить студента" или импортировать список из файла
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
                isDark 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Создание...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Создать группу</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AddGroupModal;