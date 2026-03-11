import api from "./api";

export const sendPhotoAI = async (faceBlob) => {
  try {
    const formData = new FormData();
    formData.append('file', faceBlob, 'face.jpg');

    const response = await api.post(
      '/api/students/recognize_face/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          "ngrok-skip-browser-warning": "true",
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending face image:', error);
    throw error;
  }
};
