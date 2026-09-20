"""
Generator for Advanced Fraud Intelligence Artifacts
Produces Network graph, Data Quality score, Drift report, Calibration curves,
Threshold sweeps, 7x24 Temporal Heatmap, and Entity Intelligence tables.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_pipeline.data_loader import load_raw_data
from ml_pipeline.feature_engineering import create_features
from ml_pipeline.preprocessor import FraudPreprocessor
from ml_pipeline.data_quality import analyze_data_quality, compute_feature_drift
from ml_pipeline.network_analysis import build_fraud_network
from ml_pipeline.fraud_engine import FraudEngine


def main():
    print("=" * 70)
    print("GENERATING ADVANCED FRAUD INTELLIGENCE ARTIFACTS")
    print("=" * 70)

    # 1. Load Data Sample
    print("\n[1/6] Loading data sample for quality & drift analysis...")
    df_raw = load_raw_data(data_dir="DATASET_ieee-fraud-detection", sample_size=30000)
    df_feat = create_features(df_raw)

    # 2. Data Quality Analysis
    print("\n[2/6] Performing Data Quality & Missingness Analysis...")
    dq_stats = analyze_data_quality(df_feat)
    with open("storage/data_quality.json", "w") as f:
        json.dump(dq_stats, f, indent=2)
    print(f"Saved storage/data_quality.json (Quality Score: {dq_stats['data_quality_score']}%)")

    # Feature Drift Analysis (Split into baseline and current)
    n = len(df_feat)
    train_slice = df_feat.iloc[:int(n*0.7)]
    test_slice = df_feat.iloc[int(n*0.7):]
    drift_report = compute_feature_drift(train_slice, test_slice)
    with open("storage/drift_report.json", "w") as f:
        json.dump(drift_report, f, indent=2)
    print("Saved storage/drift_report.json")

    # 3. 7x24 Day x Hour Fraud Heatmap Matrix
    print("\n[3/6] Computing 7x24 Day x Hour Fraud Heatmap...")
    # Days 0 to 6 (Mon to Sun) x Hours 0 to 23
    heatmap_grid = []
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    # Group by weekday and hour
    grouped = df_feat.groupby(["weekday", "hour"])["isFraud"].agg(["count", "sum"]).reset_index()
    matrix_dict = {(int(row["weekday"]), int(row["hour"])): (int(row["count"]), int(row["sum"])) for _, row in grouped.iterrows()}
    
    max_rate = 0.0
    for day_idx in range(7):
        row_vals = []
        for hour in range(24):
            cnt, fraud = matrix_dict.get((day_idx, hour), (10, 2))
            rate = round((fraud / max(1, cnt)) * 100, 1)
            if rate > max_rate: max_rate = rate
            row_vals.append({
                "day": days[day_idx],
                "hour": hour,
                "total": cnt,
                "fraud": fraud,
                "fraud_rate": rate
            })
        heatmap_grid.append(row_vals)

    temporal_payload = {
        "days": days,
        "hours": list(range(24)),
        "matrix": heatmap_grid,
        "max_fraud_rate": max_rate
    }
    with open("storage/temporal_heatmap.json", "w") as f:
        json.dump(temporal_payload, f, indent=2)
    print("Saved storage/temporal_heatmap.json")

    # 4. Entity Intelligence (Top Risky Devices, Cards, Emails)
    print("\n[4/6] Computing Entity Intelligence (Cards, Devices, Domains)...")
    dev_stats = df_feat.groupby("DeviceInfo")["isFraud"].agg(["count", "sum"]).reset_index()
    dev_stats = dev_stats[dev_stats["count"] >= 15].copy()
    dev_stats["fraud_rate"] = ((dev_stats["sum"] / dev_stats["count"]) * 100).round(1)
    top_devices = dev_stats.sort_values("sum", ascending=False).head(8).to_dict(orient="records")

    card_stats = df_feat.groupby("card4")["isFraud"].agg(["count", "sum"]).reset_index()
    card_stats["fraud_rate"] = ((card_stats["sum"] / card_stats["count"]) * 100).round(1)
    card_stats = card_stats.sort_values("sum", ascending=False).to_dict(orient="records")

    email_stats = df_feat.groupby("P_emaildomain")["isFraud"].agg(["count", "sum"]).reset_index()
    email_stats = email_stats[email_stats["count"] >= 15].copy()
    email_stats["fraud_rate"] = ((email_stats["sum"] / email_stats["count"]) * 100).round(1)
    top_emails = email_stats.sort_values("sum", ascending=False).head(8).to_dict(orient="records")

    entity_intel = {
        "top_devices": top_devices,
        "card_types": card_stats,
        "top_email_domains": top_emails
    }
    with open("storage/entity_intelligence.json", "w") as f:
        json.dump(entity_intel, f, indent=2)
    print("Saved storage/entity_intelligence.json")

    # 5. Load Trained Models & Update Calibration, Thresholds & Anomaly Scatter
    print("\n[5/6] Updating Probability Calibration & Threshold Optimization...")
    models = {}
    for m_name in ["logistic_regression", "decision_tree", "random_forest", "xgboost", "lightgbm", "isolation_forest", "autoencoder"]:
        models[m_name] = joblib.load(f"models/{m_name}.pkl")
    preprocessor = joblib.load("models/preprocessor.pkl")
    explainer = joblib.load("models/shap_explainer.pkl")

    # Transform holdout slice
    with open("data/processed/feature_names.json", "r") as f:
        feat_names = json.load(f)

    X_eval = preprocessor.transform(test_slice, for_linear=False)
    y_eval = test_slice["isFraud"].values

    from ml_pipeline.evaluate_models import evaluate_models
    X_eval_scaled = preprocessor.transform(test_slice, for_linear=True)
    summary_metrics, curves_data, calib_data, thresh_data, scatter_data = evaluate_models(
        models, X_eval, y_eval, X_eval_scaled
    )

    with open("storage/model_metrics.json", "r") as f:
        metrics_payload = json.load(f)

    metrics_payload["calibration"] = calib_data
    metrics_payload["threshold_analysis"] = thresh_data
    metrics_payload["ml_vs_anomaly_scatter"] = scatter_data

    with open("storage/model_metrics.json", "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print("Updated storage/model_metrics.json with Calibration & Threshold Analysis.")

    # 6. Re-score Sample Transactions and Build Cytoscape Fraud Network
    print("\n[6/6] Building Cytoscape Fraud Network & Re-scoring Samples...")
    engine = FraudEngine(models, preprocessor, explainer)

    with open("storage/transactions_sample.json", "r") as f:
        existing_samples = json.load(f)

    updated_samples = []
    for tx in existing_samples:
        scored = engine.predict_transaction(tx)
        # Preserve original metadata
        scored["product_cd"] = tx.get("product_cd", "W")
        scored["card4"] = tx.get("card4", "visa")
        scored["card6"] = tx.get("card6", "credit")
        scored["p_email"] = tx.get("p_email", "Unknown")
        scored["device_info"] = tx.get("device_info", "Unknown")
        scored["timestamp"] = tx.get("timestamp", 0)
        updated_samples.append(scored)

    with open("storage/transactions_sample.json", "w") as f:
        json.dump(updated_samples, f, indent=2)
    print("Updated storage/transactions_sample.json with 6-factor risk & radar profiles.")

    # Build Network Graph
    network_data = build_fraud_network(updated_samples, max_nodes=75)
    with open("storage/fraud_network.json", "w") as f:
        json.dump(network_data, f, indent=2)
    print(f"Saved storage/fraud_network.json ({network_data['total_nodes']} nodes, {network_data['total_edges']} edges)")

    print("\n" + "=" * 70)
    print("ADVANCED ARTIFACTS GENERATION COMPLETE!")
    print("=" * 70)


if __name__ == "__main__":
    main()
