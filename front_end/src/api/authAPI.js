import api from './api';

// Авторизация
export const authLogin = async (username, password) => {
  try {
    const response = await api.post('/api/token/', {
      username,
      password
    });
    
    const { access, refresh } = response.data;
    
    // Сохраняем токены
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    // Получаем данные пользователя после успешного логина
    const userData = await getUserProfile();
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('access', access);
    return { access, refresh, user: userData };
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};

// Обновление access токена
export const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await api.post('/api/token/refresh/', {
      refresh: refreshToken
    });
    
    const { access } = response.data;
    localStorage.setItem('access_token', access);
    
    return access;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

// Получение профиля пользователя (замени endpoint на свой)
export const getUserProfile = async () => {
  try {
    // Замени '/api/user/profile/' на твой реальный endpoint
    const response = await api.get('/api/user/profile/');
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Возвращаем mock данные, если endpoint еще не готов
    return {
      name: 'Иванов Иван Петрович',
      role: 'Преподаватель',
      department: 'Кафедра информационных систем',
      email: 'ivanov@university.edu'
    };
  }
};

// Выход из системы
export const authLogout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

// Проверка авторизации
export const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

// Получение текущего пользователя из localStorage
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};