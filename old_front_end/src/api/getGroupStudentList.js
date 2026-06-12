import api from "./api";

export const getStudentsListGroup = async (groupId, subjectId, signal) => {
    try {
        const response = await api.get(`/api/get_group/${groupId}/subjects/${subjectId}/students/`, { signal });
        return response.data;
    } catch (error) {
        console.error('Error fetching students list for group:', error);
        throw error;
    }
};
