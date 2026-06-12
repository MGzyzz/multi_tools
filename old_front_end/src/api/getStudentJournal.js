import api from './api';

export const getStudentJournal = async (groupId, subjectId, studentId, signal) => {
  try {
    const response = await api.get(
      `/api/get_group/${groupId}/subjects/${subjectId}/students/${studentId}/journal/`,
      { signal }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching student journal:', error);
    throw error;
  }
};
