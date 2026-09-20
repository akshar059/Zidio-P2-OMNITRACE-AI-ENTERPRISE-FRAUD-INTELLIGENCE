"""
Train CatBoost and CatBoost + LightGBM Ensemble
Updates saved models, evaluation metrics leaderboard, ROC curves, calibration, and sample transactions.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from catboost import CatBoostClassifier

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ml_pipeline.data_loader import load_raw_data
from ml_pipeline.feature_engineering import create_features
from ml_pipeline.train_models import split_data_temporal
from ml_pipeline.ensemble import CatBoostLGBMEnsemble
from ml_pipeline.evaluate_models import evaluate_models
from ml_pipeline.fraud_engine import FraudEngine


def main():
    print("=" * 70)
    print("TRAINING CATBOOST & BUILDING CHAMPION ENSEMBLE (CATBOOST + LIGHTGBM)")
    print("=" * 70)

    # 1. Load Data
    print("\n[1/6] Loading 45,000 samples from IEEE-CIS dataset...")
    df_raw = load_raw_data(data_dir="DATASET_ieee-fraud-detection", sample_size=45000)
    df_feat = create_features(df_raw)
    del df_raw

    # 2. Split Data Chronologically
    print("\n[2/6] Performing chronological split...")
    train_df, val_df, test_df = split_data_temporal(df_feat)

    # 3. Transform via Preprocessor
    print("\n[3/6] Preprocessing and transforming features...")
    preprocessor = joblib.load("models/preprocessor.pkl")
    X_train = preprocessor.transform(train_df, for_linear=False)
    y_train = train_df["isFraud"].values

    X_val = preprocessor.transform(val_df, for_linear=False)
    y_val = val_df["isFraud"].values

    X_test = preprocessor.transform(test_df, for_linear=False)
    X_test_scaled = preprocessor.transform(test_df, for_linear=True)
    y_test = test_df["isFraud"].values

    # 4. Train CatBoost
    print("\n[4/6] Training CatBoost Classifier...")
    pos_count = int(np.sum(y_train == 1))
    neg_count = int(np.sum(y_train == 0))
    scale_pos_weight = min(15.0, float(neg_count) / max(1.0, float(pos_count)))

    cat = CatBoostClassifier(
        iterations=300,
        depth=6,
        learning_rate=0.07,
        scale_pos_weight=scale_pos_weight,
        eval_metric="AUC",
        random_seed=42,
        verbose=50,
        thread_count=-1
    )
    cat.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=35)
    joblib.dump(cat, "models/catboost.pkl")
    print("Saved models/catboost.pkl")

    # Load LightGBM
    lgb = joblib.load("models/lightgbm.pkl")

    # Build Ensemble
    print("\n[5/6] Constructing CatBoost + LightGBM Ensemble...")
    ensemble = CatBoostLGBMEnsemble(cat_model=cat, lgb_model=lgb, weight_cat=0.50, weight_lgb=0.50)
    joblib.dump(ensemble, "models/ensemble_cat_lgb.pkl")
    print("Saved models/ensemble_cat_lgb.pkl")

    # 5. Evaluate Complete Suite of Models
    print("\n[6/6] Evaluating all models on holdout test set...")
    all_models = {
        "ensemble_cat_lgb": ensemble,
        "catboost": cat,
        "lightgbm": lgb,
        "xgboost": joblib.load("models/xgboost.pkl"),
        "random_forest": joblib.load("models/random_forest.pkl"),
        "decision_tree": joblib.load("models/decision_tree.pkl"),
        "logistic_regression": joblib.load("models/logistic_regression.pkl"),
        "isolation_forest": joblib.load("models/isolation_forest.pkl"),
        "autoencoder": joblib.load("models/autoencoder.pkl")
    }

    metrics_summary, curves_data, calib_data, thresh_data, scatter_data = evaluate_models(
        all_models, X_test, y_test, X_test_scaled
    )

    # Read existing metrics to retain global feature importance
    existing_metrics = {}
    if os.path.exists("storage/model_metrics.json"):
        with open("storage/model_metrics.json", "r") as f:
            existing_metrics = json.load(f)

    performance_payload = {
        "leaderboard": metrics_summary,
        "curves": curves_data,
        "global_feature_importance": existing_metrics.get("global_feature_importance", []),
        "calibration": calib_data,
        "threshold_analysis": thresh_data,
        "ml_vs_anomaly_scatter": scatter_data,
        "champion_model": "Ensemble (CatBoost + LightGBM)",
        "evaluation_timestamp": datetime.now(timezone.utc).isoformat()
    }

    with open("storage/model_metrics.json", "w") as f:
        json.dump(performance_payload, f, indent=2)
    print("Successfully updated storage/model_metrics.json")

    # Update sample transactions with the new Ensemble
    print("\nRe-scoring sample transactions with CatBoost + LightGBM Ensemble...")
    explainer = joblib.load("models/shap_explainer.pkl") if os.path.exists("models/shap_explainer.pkl") else None
    engine = FraudEngine(all_models, preprocessor, explainer)

    if os.path.exists("storage/transactions_sample.json"):
        with open("storage/transactions_sample.json", "r") as f:
            samples = json.load(f)
        rescored = []
        for tx in samples:
            res = engine.predict_transaction(tx)
            # Preserve raw metadata
            for k in ["product_cd", "card4", "card6", "p_email", "device_info", "timestamp", "channel", "merchant_category", "ip_address"]:
                if k in tx:
                    res[k] = tx[k]
            rescored.append(res)
        with open("storage/transactions_sample.json", "w") as f:
            json.dump(rescored, f, indent=2)
        print(f"Re-scored {len(rescored)} sample transactions in storage/transactions_sample.json")

    print("\n" + "=" * 70)
    print("ENSEMBLE PIPELINE COMPLETED SUCCESSFULLY!")
    print(f"Champion Ensemble ROC-AUC: {metrics_summary['ensemble_cat_lgb']['roc_auc']}")
    print(f"Champion Ensemble PR-AUC:  {metrics_summary['ensemble_cat_lgb']['pr_auc']}")
    print("=" * 70)


if __name__ == "__main__":
    main()
