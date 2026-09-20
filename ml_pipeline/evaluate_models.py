"""
Model Evaluation Module for IEEE-CIS Fraud Detection
Computes ROC-AUC, PR-AUC, Precision, Recall, F1, Confusion Matrix, and curve coordinates.
"""

import numpy as np
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    confusion_matrix,
    roc_curve,
    precision_recall_curve
)


def evaluate_models(models: dict, X_test, y_test, X_test_scaled):
    """
    Evaluates all trained models against the holdout test set.
    Returns structured results suitable for dashboard tables, ROC curves, and confusion matrices.
    """
    print("Evaluating models on test set...")
    metrics_summary = {}
    curves_data = {}
    confusion_matrices = {}

    for name, model in models.items():
        if name in ["logistic_regression", "autoencoder"]:
            X_eval = X_test_scaled
        else:
            X_eval = X_test

        if name == "isolation_forest":
            # Invert isolation forest score so higher means more anomalous (0 to 1)
            raw_scores = -model.score_samples(X_eval)
            min_s, max_s = raw_scores.min(), raw_scores.max()
            y_probs = (raw_scores - min_s) / (max_s - min_s + 1e-6)
            y_pred = (y_probs >= 0.65).astype(int)
        elif name == "autoencoder":
            # Reconstruction error = mean squared difference
            reconstructed = model.predict(X_eval)
            recon_error = np.mean((X_eval - reconstructed)**2, axis=1)
            min_e, max_e = np.percentile(recon_error, 1), np.percentile(recon_error, 99)
            clipped = np.clip(recon_error, min_e, max_e)
            y_probs = (clipped - min_e) / (max_e - min_e + 1e-6)
            y_pred = (y_probs >= 0.60).astype(int)
        else:
            y_probs = model.predict_proba(X_eval)[:, 1]
            y_pred = (y_probs >= 0.50).astype(int)

        # Compute Core Metrics
        roc_auc = float(roc_auc_score(y_test, y_probs))
        pr_auc = float(average_precision_score(y_test, y_probs))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        acc = float(accuracy_score(y_test, y_pred))

        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = [int(v) for v in cm.ravel()]

        display_name = {
            "ensemble_cat_lgb": "Ensemble (CatBoost + LightGBM)",
            "catboost": "CatBoost",
            "lightgbm": "LightGBM",
            "xgboost": "XGBoost",
            "random_forest": "Random Forest",
            "decision_tree": "Decision Tree",
            "logistic_regression": "Logistic Regression",
            "isolation_forest": "Isolation Forest",
            "autoencoder": "Autoencoder"
        }.get(name, name.replace("_", " ").title())

        metrics_summary[name] = {
            "model_name": display_name,
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(acc, 4),
            "confusion_matrix": {
                "tn": tn,
                "fp": fp,
                "fn": fn,
                "tp": tp,
                "fpr": round(fp / (fp + tn + 1e-6), 4),
                "fnr": round(fn / (fn + tp + 1e-6), 4)
            }
        }

        # Calculate sample curve coordinates (subsampled to 50 points for smooth, lightweight charts)
        fpr_pts, tpr_pts, _ = roc_curve(y_test, y_probs)
        prec_pts, rec_pts, _ = precision_recall_curve(y_test, y_probs)

        step_roc = max(1, len(fpr_pts) // 50)
        step_pr = max(1, len(rec_pts) // 50)

        curves_data[name] = {
            "roc": {
                "fpr": [round(float(x), 3) for x in fpr_pts[::step_roc]],
                "tpr": [round(float(y), 3) for y in tpr_pts[::step_roc]]
            },
            "pr": {
                "recall": [round(float(r), 3) for r in rec_pts[::step_pr]],
                "precision": [round(float(p), 3) for p in prec_pts[::step_pr]]
            }
        }

        print(f"[{name.upper()}] ROC-AUC: {roc_auc:.4f} | PR-AUC: {pr_auc:.4f} | F1: {f1:.4f} | Rec: {rec:.4f} | Prec: {prec:.4f}")

    # 1. Advanced Probability Calibration & Brier Score (on Champion Model)
    calibration_data = {}
    champion_model = models.get("ensemble_cat_lgb") or models.get("lightgbm") or models.get("xgboost")
    if champion_model:
        from sklearn.calibration import calibration_curve
        from sklearn.metrics import brier_score_loss
        champ_probs = champion_model.predict_proba(X_test)[:, 1]
        brier = float(brier_score_loss(y_test, champ_probs))
        prob_true, prob_pred = calibration_curve(y_test, champ_probs, n_bins=10, strategy="uniform")
        calibration_data = {
            "brier_score": round(brier, 4),
            "predicted_probs": [round(float(p), 3) for p in prob_pred],
            "observed_frequencies": [round(float(o), 3) for o in prob_true]
        }

    # 2. Threshold Optimization Analysis (0.10 to 0.90)
    threshold_analysis = []
    if champion_model:
        champ_probs = champion_model.predict_proba(X_test)[:, 1]
        for t in np.arange(0.10, 0.95, 0.05):
            t_val = round(float(t), 2)
            preds_t = (champ_probs >= t).astype(int)
            p_t = float(precision_score(y_test, preds_t, zero_division=0))
            r_t = float(recall_score(y_test, preds_t, zero_division=0))
            f1_t = float(f1_score(y_test, preds_t, zero_division=0))
            cm_t = confusion_matrix(y_test, preds_t)
            tn_t, fp_t, fn_t, tp_t = [int(v) for v in cm_t.ravel()]
            fpr_t = round(fp_t / (fp_t + tn_t + 1e-6), 4)
            fnr_t = round(fn_t / (fn_t + tp_t + 1e-6), 4)
            threshold_analysis.append({
                "threshold": t_val,
                "precision": round(p_t, 4),
                "recall": round(r_t, 4),
                "f1_score": round(f1_t, 4),
                "fpr": fpr_t,
                "fnr": fnr_t,
                "flagged_count": int(tp_t + fp_t)
            })

    # 3. ML vs Anomaly Scatter Data
    ml_vs_anomaly_scatter = []
    iso_model = models.get("isolation_forest")
    if champion_model and iso_model:
        champ_probs = champion_model.predict_proba(X_test)[:, 1]
        raw_iso = -iso_model.score_samples(X_test)
        min_i, max_i = raw_iso.min(), raw_iso.max()
        iso_scores = (raw_iso - min_i) / (max_i - min_i + 1e-6)
        
        # Select 200 diverse sample points for scatter plot
        idx_sample = np.linspace(0, len(y_test)-1, 200, dtype=int)
        for idx in idx_sample:
            ml_vs_anomaly_scatter.append({
                "ml_prob": round(float(champ_probs[idx]), 3),
                "anomaly_score": round(float(iso_scores[idx]), 3),
                "is_fraud": int(y_test[idx])
            })

    return metrics_summary, curves_data, calibration_data, threshold_analysis, ml_vs_anomaly_scatter
