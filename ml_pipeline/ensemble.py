"""
CatBoost + LightGBM Soft-Voting Ensemble
Combines symmetric oblivious trees (CatBoost) with asymmetric leaf-wise trees (LightGBM)
to produce minimum variance and superior generalization for financial fraud detection.
"""

import numpy as np


class CatBoostLGBMEnsemble:
    """
    Production-grade dual-gradient-boosted ensemble.
    Blends predicted probability distributions from CatBoost and LightGBM.
    """
    def __init__(self, cat_model, lgb_model, weight_cat: float = 0.50, weight_lgb: float = 0.50):
        self.cat_model = cat_model
        self.lgb_model = lgb_model
        self.weight_cat = weight_cat
        self.weight_lgb = weight_lgb
        self.classes_ = np.array([0, 1])

    def predict_proba(self, X):
        """
        Calculates blended probability distribution across classes.
        """
        p_cat = self.cat_model.predict_proba(X)
        p_lgb = self.lgb_model.predict_proba(X)
        
        # Ensure identical array shape
        if p_cat.ndim == 1:
            p_cat = np.vstack([1 - p_cat, p_cat]).T
        if p_lgb.ndim == 1:
            p_lgb = np.vstack([1 - p_lgb, p_lgb]).T
            
        blended = (self.weight_cat * p_cat) + (self.weight_lgb * p_lgb)
        # Re-normalize to ensure exact simplex sum = 1
        sums = np.sum(blended, axis=1, keepdims=True)
        return blended / np.maximum(sums, 1e-9)

    def predict(self, X, threshold: float = 0.50):
        """
        Binary prediction based on decision threshold.
        """
        probs = self.predict_proba(X)[:, 1]
        return (probs >= threshold).astype(int)
