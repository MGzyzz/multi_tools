from keras_facenet import FaceNet
import cv2

class FaceEmbedder:
    def __init__(self):
        self.embedder = FaceNet()

    def get_embedding(self, face_img):
        face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        return self.embedder.embeddings([face_rgb])[0]  # получаем 512-d вектор