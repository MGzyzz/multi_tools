import api from "./api";

export const getDetailGroup = async (id) => {
    try {
        const response = await api.get(`/api/get_detail_group/${id}/`);
        return response.data
    } catch (error) {
        console.error('Error fetching detail group:', error);
        throw error;
    }
}
