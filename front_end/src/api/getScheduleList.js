import api from "./api";

export const getScheduleList = async () => {
    try {
        const response = await api.get('api/get_schedule_list/');
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}