import torch
import numpy as np

def find_best_match(embedding, embeddings_db, threshold=0.7):

    if isinstance(embedding, np.ndarray):
        embedding = torch.from_numpy(embedding).float()

    best_user = None
    best_similarity = -1

    for user_id, db_embedding in embeddings_db.items():
        if isinstance(db_embedding, np.ndarray):
            db_embedding = torch.from_numpy(db_embedding).float()

        similarity = torch.nn.functional.cosine_similarity(embedding, db_embedding, dim=0).item()

        if similarity > best_similarity:
            best_similarity = similarity
            best_user = user_id

    if best_similarity >= threshold:
        return best_user, best_similarity
    else:
        return "Unknown", best_similarity
