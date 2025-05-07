import axios from "axios";



export const getStatusBotTelegram = async () => {
    try {
        const response = await axios.get('http://localhost:8001/status');
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}