import api from "./api";



export const getDetailSchedule = async (schedule_id) => {
    try {
        const response = await api.get(`/api/attendance/schedule/${schedule_id}/`);
        console.log("detail schedule:", response.data)
        return response.data;
    } catch (error) {
        console.error('Error fetching schedule details:', error);
        throw error;
    }
}