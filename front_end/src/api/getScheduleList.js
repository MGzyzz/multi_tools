import axios from "axios";


export const getScheduleList = async () => {
    try {
        const response = await axios.get('http://localhost:8000/api/get_schedule_list');
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}