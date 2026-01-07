import api from './api';



export const getGroupList = async () => {
  try {
    const response = await api.get('api/get_groups_list');
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching group list:', error);
    throw error;
  }
}