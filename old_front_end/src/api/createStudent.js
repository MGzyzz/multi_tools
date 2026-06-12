import api from "./api";

export const createStudent = async (studentData) => {
    try {
        const response = await api.post('api/create_student/', {
            first_name: studentData.first_name,
            last_name: studentData.last_name,
            email: studentData.email,
            age: studentData.age,
            // phone: studentData.phone,
            group_id: studentData.group_id
        });
        return response.data;
    } catch (error) {
        console.error('Error creating student:', error);
        throw error;
    }
}