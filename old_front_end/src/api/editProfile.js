import api from "./api";



export const editProfileTeacher = async (profileData = {}) => {
    try {
        const token = localStorage.getItem('access_token');
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
        const response = await api.patch(`/api/edit_profile/`, profileData, config);
        return response.data;
    } catch (error) {
        console.error('Error editing profile:', error);
        throw error;
    }
};
