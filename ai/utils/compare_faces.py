import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

def find_best_match(embedding, embeddings_db, threshold=0.5):
    best_score = -1
    best_name = None

    for name, db_embedding in embeddings_db.items():
        score = cosine_similarity([embedding], [db_embedding])[0][0]
        if score > best_score and score > threshold:
            best_score = score
            best_name = name

    return best_name
