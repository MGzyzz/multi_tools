import axios from "axios";
import api from "./api";

export const sendPhotoAI = async (faceBlob) => {
  try {
    const formData = new FormData();
    formData.append('file', faceBlob, 'face.jpg');

    const token = localStorage.getItem('access_token');
    const headers = {
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const response = await axios.post(
      `${api.defaults.baseURL}/api/students/recognize_face/`,
      formData,
      { headers }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending face image:', error);
    throw error;
  }
};
