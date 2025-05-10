import axios from "axios";

export const getResultAttendaceAI = async () => {
    try {
        const response = await axios.get('http://localhost:8002/get_recognition_result');
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}