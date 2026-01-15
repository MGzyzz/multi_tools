import React, { useEffect, useState } from 'react';
import {
  Camera,
  Mail,
  Phone,
  User,
  Briefcase
} from 'lucide-react';

const TeacherProfile = ({ isDark = true }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    telegram: '',
    department: '',
    subject: '',
    position: '',
    experience: '',
    office: '',
    qualification: 'assistant',
    bio: ''
  });

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('user') || 'null');
    if (!cached) return;
    setFormData((prev) => ({
      ...prev,
      firstName: cached.first_name || '',
      lastName: cached.last_name || '',
      email: cached.email || '',
      position: cached.role || ''
    }));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const initials = `${formData.firstName?.[0] || ''}${formData.lastName?.[0] || ''}`.toUpperCase() || '?';
  const fullName = [formData.lastName, formData.firstName].filter(Boolean).join(' ');
  const inputTheme = isDark
    ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const cardClass = `${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6 shadow-lg`;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Профиль учителя
          </h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Обновите данные профиля и учебной информации преподавателя
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            Сохранить изменения
          </button>
          <button
            type="button"
            className={`px-5 py-3 rounded-xl border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800/70' : 'border-gray-200 text-gray-700 hover:bg-gray-50'} transition-all duration-300 cursor-pointer`}
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className={cardClass}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {initials}
              </div>
              <div>
                <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {fullName || 'Преподаватель'}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formData.position || 'Должность не указана'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Кафедра</p>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formData.department || '—'}
                </p>
              </div>
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дисциплина</p>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formData.subject || '—'}
                </p>
              </div>
              {/*
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Кабинет</p>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formData.office || '—'}
                </p>
              </div>
              */}
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-gray-700/40 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Стаж</p>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formData.experience ? `${formData.experience} лет` : '—'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800/70' : 'border-gray-200 text-gray-700 hover:bg-gray-50'} transition-all duration-300 cursor-pointer`}
            >
              <Camera className="w-5 h-5" />
              Обновить фото
            </button>
          </div>

          <div className={cardClass}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Памятка
            </h3>
            <ul className={`space-y-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <li>Укажите актуальные контакты для уведомлений и отчетов.</li>
              <li>Заполните дисциплину и кафедру для корректных отчетов.</li>
              <li>Добавьте краткое описание профиля для студентов.</li>
            </ul>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className={cardClass}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Основная информация
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Имя
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Иван"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Фамилия
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Иванов"
                  className={`w-full px-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                />
              </div>
              {/*
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Отчество
                </label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  placeholder="Сергеевич"
                  className={`w-full px-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                />
              </div>
              */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Должность
                </label>
                <div className="relative">
                  <Briefcase className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    placeholder="Старший преподаватель"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Контакты
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="teacher@college.kz"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Телефон
                </label>
                <div className="relative">
                  <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+7 (777) 000-00-00"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                  />
                </div>
              </div>
              {/*
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Telegram
                </label>
                <input
                  type="text"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleChange}
                  placeholder="@teacher"
                  className={`w-full px-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Кабинет
                </label>
                <div className="relative">
                  <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    name="office"
                    value={formData.office}
                    onChange={handleChange}
                    placeholder="Аудитория 402"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                  />
                </div>
              </div>
              */}
            </div>
          </div>

          {/*
          <div className={cardClass}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Учебная информация
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Кафедра
                </label>
                <div className="relative">
                  <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Информационные технологии"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Дисциплина
                </label>
                <div className="relative">
                  <GraduationCap className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Алгоритмы и структуры данных"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Стаж (лет)
                </label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="5"
                  className={`w-full px-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Квалификация
                </label>
                <select
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                >
                  <option value="assistant">Ассистент</option>
                  <option value="senior">Старший преподаватель</option>
                  <option value="docent">Доцент</option>
                  <option value="professor">Профессор</option>
                </select>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              О себе
            </h2>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Короткое описание опыта и направления работы"
              className={`w-full px-4 py-3 rounded-xl border ${inputTheme} focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all min-h-[120px]`}
            />
          </div>
          */}
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
