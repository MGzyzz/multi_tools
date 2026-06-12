import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ 
  size = 'md', 
  text = 'Загрузка...', 
  fullScreen = false,
  isDark = true 
}) => {
  // Размеры иконки
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  // Размеры текста
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const loaderContent = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Loader2 
        className={`${sizeClasses[size]} ${isDark ? 'text-blue-400' : 'text-blue-600'} animate-spin`} 
      />
      {text && (
        <p className={`${textSizeClasses[size]} font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {text}
        </p>
      )}
    </div>
  );

  // Полноэкранный loader
  if (fullScreen) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 ${
        isDark ? 'bg-gray-900/80' : 'bg-white/80'
      } backdrop-blur-sm`}>
        {loaderContent}
      </div>
    );
  }

  // Обычный loader (для использования внутри компонентов)
  return (
    <div className="flex items-center justify-center p-8">
      {loaderContent}
    </div>
  );
};

// Компонент скелетона для карточек
export const SkeletonCard = ({ isDark = true }) => {
  return (
    <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-6 border ${
      isDark ? 'border-gray-700' : 'border-gray-200'
    } shadow-lg animate-pulse`}>
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
        <div className={`h-6 w-12 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      </div>
      <div className={`h-3 w-24 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'} mb-2`}></div>
      <div className={`h-8 w-16 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
    </div>
  );
};

// Компонент скелетона для списка занятий
export const SkeletonSession = ({ isDark = true }) => {
  return (
    <div className={`${isDark ? 'bg-gray-700/30' : 'bg-gray-50'} rounded-xl p-3 sm:p-4 border ${
      isDark ? 'border-gray-600' : 'border-gray-200'
    } animate-pulse`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`h-4 w-20 rounded ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
        <div className={`h-5 w-16 rounded-lg ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
      </div>
      <div className="flex items-center justify-between">
        <div className={`h-3 w-12 rounded ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
        <div className={`h-3 w-10 rounded ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
      </div>
    </div>
  );
};

export default Loader;