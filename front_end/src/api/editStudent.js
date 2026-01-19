import api from "./api";



export const editStudent = async (studentId, studentData) => {
    try {
        const response = await api.patch(`/api/edit_student/${studentId}/`, studentData);
        return response.data;
    } catch (error) {
        console.error('Error editing student:', error);
        throw error;
    }
}