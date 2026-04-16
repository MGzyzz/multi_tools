import api from "./api";

export const getScheduleList = async ({ dateFrom, dateTo, groupId, signal } = {}) => {
    try {
        const response = await api.get('api/get_schedule_list/', {
            params: {
                ...(dateFrom ? { date_from: dateFrom } : {}),
                ...(dateTo ? { date_to: dateTo } : {}),
                ...(groupId ? { group_id: groupId } : {}),
                _ts: Date.now(),
            },
            signal,
        });
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}
