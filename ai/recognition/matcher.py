import numpy as np
from scipy.spatial.distance import cosine

class FaceMatcher:
    def __init__(self, known_embeddings):
        self.known_embeddings = known_embeddings  # dict: {"user_id": embedding}

    def match(self, embedding, threshold=0.5):
        for user_id, known_emb in self.known_embeddings.items():
            dist = cosine(embedding, known_emb)
            if dist < threshold:
                return user_id
        return None