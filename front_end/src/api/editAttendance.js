import api from "./api";

export const editAttendance = async (attendanceId, payloadOrPresence, markedAt) => {
  const payload =
    typeof payloadOrPresence === 'object' && payloadOrPresence !== null
      ? payloadOrPresence
      : {
          presense: payloadOrPresence,
          marked_at: markedAt,
        };

  try {
    const response = await api.patch(`/api/edit_attendance/${attendanceId}/`, payload);
    return response.data;
  } catch (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
};
