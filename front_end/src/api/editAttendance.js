import api from "./api";

export const editAttendance = async (attendanceId, payloadOrStatus, markedAt) => {
  const payload =
    typeof payloadOrStatus === 'object' && payloadOrStatus !== null
      ? payloadOrStatus
      : {
          status: payloadOrStatus,
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
