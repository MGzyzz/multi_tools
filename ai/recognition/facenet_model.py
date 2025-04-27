import torch
import torchvision.transforms as transforms
import cv2
from facenet_pytorch import InceptionResnetV1  # ВАЖНО: это готовая FaceNet модель!

class FaceEmbedder:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)

        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((160, 160)),
            transforms.ToTensor(),
            transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
        ])

    def get_embedding(self, face_img):
        face_rgb = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        face_tensor = self.transform(face_rgb).unsqueeze(0).to(self.device)

        with torch.no_grad():
            embedding = self.model(face_tensor)
        return embedding.cpu().numpy().flatten()
