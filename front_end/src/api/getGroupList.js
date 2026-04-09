import api from './api';



export const getGroupList = async (signal) => {
  try {
    const response = await api.get('api/get_groups_list/', { signal });
    return response.data;
  } catch (error) {
    console.error('Error fetching group list:', error);
    throw error;
  }
}