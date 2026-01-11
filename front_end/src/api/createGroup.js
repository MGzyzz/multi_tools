import api from "./api";



export const createGroup = async (name, course, group_specialty) => {
    try {
        const response = await api.post('api/create_group/', {
            name: name,
            course: course,
            group_specialty: group_specialty
        });
        return response.data;
    } catch (error) {
        console.error('Error creating group:', error);
        throw error;
    }
}