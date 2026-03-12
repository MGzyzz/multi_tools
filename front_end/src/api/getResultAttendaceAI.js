import { aiApi } from "./api";

export const getResultAttendaceAI = async () => {
    try {
        const response = await aiApi.get('/get_recognition_result/');
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}