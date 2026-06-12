import api from "./api";

export const getStudentByUsername = async (username) => {
  try {
    const response = await api.get(`/api/get_student_information/${username}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching student information:', error);
    throw error;
  }
};
