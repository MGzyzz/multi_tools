import axios from 'axios';


export const getAttendanceGroup = async (schedule_id) => {
    try {
        const response = await axios.get(`http://localhost:8000/api/schedule_and_attendance/${schedule_id}`);
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}