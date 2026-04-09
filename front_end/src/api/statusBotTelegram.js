import { botApi } from "./api";

export const getStatusBotTelegram = async () => {
    try {
        const response = await botApi.get('/status/');
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}