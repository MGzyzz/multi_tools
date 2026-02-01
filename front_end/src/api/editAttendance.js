import api from "./api";

export const editAttendance = async (attendanceId, presense, markedAt) => {
  try {
    const response = await api.patch(`/api/edit_attendance/${attendanceId}/`, {
      presense,
      marked_at: markedAt
    });
    return response.data;
  } catch (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
};
