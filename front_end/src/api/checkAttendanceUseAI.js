import axios from "axios";


export const check_attendance_use_ai = async () => {
    try {
        const response = await axios.post('http://localhost:8002/check_attendance_use_ai');
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}