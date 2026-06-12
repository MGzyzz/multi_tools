import api from "./api";



export const getAllStudentsListGroup = async () => {
    try {
        const response = await api.get('api/get_all_students/');
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}