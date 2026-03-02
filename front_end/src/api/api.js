import axios from "axios";

// Основной url бэк-энд
const back_url = import.meta.env.VITE_NGROK_PATH;
const toBoolean = (value) => String(value).toLowerCase() === "true";
const DEBUG = toBoolean(import.meta.env.VITE_DEBUG);
const DEFAULT_LOCAL_BACKEND = "http://127.0.0.1:8000";

const resolveBackendBaseUrl = () => {
  if (DEBUG) return DEFAULT_LOCAL_BACKEND;
  if (back_url) return back_url;
  return DEFAULT_LOCAL_BACKEND;
};

const api = axios.create({
  baseURL: resolveBackendBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    "ngrok-skip-browser-warning": "true",
  }
});

// Interceptor для добавления access токена к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor для обработки ошибок и автоматического обновления токена
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и это не повторный запрос
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          // Если нет refresh токена - перенаправляем на логин
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Пытаемся обновить токен
        const response = await axios.post(`${resolveBackendBaseUrl()}/api/token/refresh/`, {
          refresh: refreshToken
        });

        const { access } = response.data;
        
        // Сохраняем новый access токен
        localStorage.setItem('access_token', access);

        // Повторяем оригинальный запрос с новым токеном
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Если refresh токен тоже невалиден - разлогиниваем
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
