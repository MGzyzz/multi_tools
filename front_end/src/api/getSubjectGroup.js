import api from './api';

export const getSubjectGroup = async (groupId) => {
    try {
        const response = await api.get(`/api/get_group/${groupId}/subjects/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching subject group:', error);
        throw error;
    }
};
