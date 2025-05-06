import torch
import cv2
import numpy as np
from torchvision import transforms
from facenet_pytorch import InceptionResnetV1

class FaceEmbedder:
    def __init__(self, device=None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((160, 160)),
            transforms.ToTensor(),
            transforms.Normalize([0.5], [0.5])
        ])
        print(f"[INFO] FaceNet загружен на {self.device}")

    def get_embedding(self, face_img):
        try:
            img_tensor = self.transform(face_img).unsqueeze(0).to(self.device)
            with torch.no_grad():
                embedding = self.model(img_tensor)
            return embedding.squeeze().cpu()
        except Exception as e:
            print(f"[ERROR] Ошибка в get_embedding: {e}")
            return None
