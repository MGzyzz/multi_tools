import { aiApi } from "./api";

export const getStatusAI = async () => {
    try {
        const response = await aiApi.get('/status/');
        return response.data
    } catch (error) {
        console.error('Error fetching AI status:', error);
        throw error;
    }
}
