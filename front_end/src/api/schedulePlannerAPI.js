import api from './api';

const buildPlannerParams = ({ groupId, startDate, endDate }) => {
  const params = {
    _ts: Date.now(),
  };

  if (groupId) params.group_id = groupId;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  return params;
};

export const getSchedulePlanner = async ({ groupId, startDate, endDate, signal } = {}) => {
  try {
    const response = await api.get('/api/schedule-planner/', {
      params: buildPlannerParams({ groupId, startDate, endDate }),
      signal,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching schedule planner:', error);
    throw error;
  }
};

export const saveSchedulePlanner = async (payload) => {
  try {
    const response = await api.post('/api/schedule-planner/', payload);
    return response.data;
  } catch (error) {
    console.error('Error saving schedule planner:', error);
    throw error;
  }
};

export const previewSemesterSchedule = async (payload) => {
  try {
    const response = await api.post('/api/schedule-planner/semester/preview/', payload);
    return response.data;
  } catch (error) {
    console.error('Error previewing semester schedule:', error);
    throw error;
  }
};

export const applySemesterSchedule = async (payload) => {
  try {
    const response = await api.post('/api/schedule-planner/semester/apply/', payload);
    return response.data;
  } catch (error) {
    console.error('Error applying semester schedule:', error);
    throw error;
  }
};
