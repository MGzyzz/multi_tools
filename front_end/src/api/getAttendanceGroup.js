import api from './api';

export const getAttendanceGroup = async (schedule_id) => {
    try {
        const response = await api.get(`/api/schedule_and_attendance/${schedule_id}/`);
        return response.data
    } catch (error) {
        console.error('Error fetching attendance group:', error);
        throw error;
    }
}
