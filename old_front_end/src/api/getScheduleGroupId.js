import api from "./api";

export const getScheduleGroupId = async (id) => {
    try {
        const response = await api.get(`api/get_schedule_group_id/${id}`);
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}