import axios from "axios";


export const getStatusAI = async () => {
    try {
        const response = await axios.get('http://localhost:8002/status');
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}