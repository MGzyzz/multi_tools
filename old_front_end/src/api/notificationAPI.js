import api from './api';

export const getTeacherNotifications = async (params = {}) => {
  const response = await api.get('/api/notifications/', { params });
  return response.data;
};

export const markTeacherNotificationRead = async (notificationId) => {
  const response = await api.patch(`/api/notifications/${notificationId}/read/`, {});
  return response.data;
};

export const sendDemoNotification = async () => {
  const response = await api.post('/api/demo/send-notification/');
  return response.data;
};

const toBoolean = (value) => String(value).toLowerCase() === 'true';
const DEBUG = toBoolean(import.meta.env.VITE_DEBUG);
const BACKEND_URL = import.meta.env.VITE_NGROK_PATH;
const DEFAULT_LOCAL_BACKEND = 'http://127.0.0.1:8000';

const resolveHttpBase = () => {
  const baseUrl = DEBUG ? DEFAULT_LOCAL_BACKEND : (BACKEND_URL || DEFAULT_LOCAL_BACKEND);
  if (!baseUrl) return null;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const buildNotificationsWsUrl = (token) => {
  const httpBase = resolveHttpBase();
  if (!httpBase || !token) return null;

  const wsBase = httpBase.replace(/^http/i, 'ws');
  return `${wsBase}/ws/notifications/?token=${encodeURIComponent(token)}`;
};

export const connectTeacherNotificationsWS = ({
  onOpen,
  onMessage,
  onClose,
  onError,
} = {}) => {
  const token = localStorage.getItem('access_token');
  const wsUrl = buildNotificationsWsUrl(token);
  if (!wsUrl) return null;

  const socket = new WebSocket(wsUrl);
  socket.onopen = (event) => onOpen?.(event);
  socket.onclose = (event) => onClose?.(event);
  socket.onerror = (event) => onError?.(event);
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage?.(data);
    } catch (error) {
      onError?.(error);
    }
  };

  return socket;
};
