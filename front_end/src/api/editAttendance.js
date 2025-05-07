// editAttendance.js
import axios from "axios";

export const editAttendance = async (attendanceId, status, markedAt) => {
    try {
        const response = await axios.patch(`http://localhost:8000/api/edit_attendance/${attendanceId}`, {
            presense: status,
            marked_at: markedAt
        });
        return response.data;
    } catch (error) {
        console.error('Error updating attendance:', error);
        throw error;
    }
};
