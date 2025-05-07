import axios from "axios";


export const getScheduleGroupId = async (id) => {
    try {
        const response = await axios.get(`http://localhost:8000/api/get_schedule_group_id/${id}`);
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}