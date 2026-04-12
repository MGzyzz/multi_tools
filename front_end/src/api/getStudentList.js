import api from './api';

export const getStudentsListGroup = async () => {
    try {
        const response = await api.get('/api/get_students_list/');
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}