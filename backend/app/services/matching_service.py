import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging
from app.config import settings

logger = logging.getLogger("uvicorn")

class MatchingService:
    @staticmethod
    def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two normalized vectors"""
        try:
            a = np.array(vec1, dtype=np.float32)
            b = np.array(vec2, dtype=np.float32)
            dot = np.dot(a, b)
            norm_a = np.linalg.norm(a)
            norm_b = np.linalg.norm(b)
            if norm_a == 0 or norm_b == 0:
                return 0.0
            similarity = dot / (norm_a * norm_b)
            # Map [-1, 1] to [0, 1] score
            score = max(0.0, float(similarity))
            return score
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0

    def find_best_match(
        self, 
        query_embedding: List[float], 
        registered_users: List[Dict[str, Any]]
    ) -> Tuple[Optional[Dict[str, Any]], float, str]:
        """
        Compare query vector against all multi-angle embeddings of registered users.
        Returns: (matched_user_dict, confidence_score, status_action)
        status_action: 'ACCEPT', 'REVIEW', 'REJECT'
        """
        if not registered_users or not query_embedding:
            return None, 0.0, "REJECT"

        best_user = None
        highest_score = 0.0

        for user in registered_users:
            if user.get("status") == "Disabled":
                continue

            embeddings = user.get("face_embeddings", [])
            if not embeddings:
                continue

            # Compare query against all multi-angle samples stored for this user (Front, Left, Right)
            for emb in embeddings:
                score = self.calculate_cosine_similarity(query_embedding, emb)
                if score > highest_score:
                    highest_score = score
                    best_user = user

        # Apply PRD Threshold Policy
        if highest_score >= settings.RECOGNITION_THRESHOLD:
            action = "ACCEPT"
        elif highest_score >= settings.REVIEW_THRESHOLD:
            action = "REVIEW"
        else:
            action = "REJECT"

        return best_user, highest_score, action

matching_service = MatchingService()
