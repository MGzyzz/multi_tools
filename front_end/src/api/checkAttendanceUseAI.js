import { aiApi } from "./api";

export const check_attendance_use_ai = async () => {
    try {
        const response = await aiApi.post('/check_attendance_use_ai/');
        return response.data
    } catch (error) {
        console.error('Error starting AI attendance check:', error);
        throw error;
    }
}
