"""
Master Pipeline Runner for Financial Fraud Detection
Executes complete Phase 1 through Phase 18 workflow:
Data loading -> Feature Engineering -> Feature Selection -> Time Split ->
Model Training (7 models) -> Evaluation -> SHAP Explainer -> Artifacts Persistence
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from ml_pipeline.data_loader import load_raw_data
from ml_pipeline.feature_engineering import create_features
from ml_pipeline.preprocessor import FraudPreprocessor
from ml_pipeline.feature_selection import select_features
from ml_pipeline.train_models import split_data_temporal, train_all_models
from ml_pipeline.evaluate_models import evaluate_models
from ml_pipeline.explainability import FraudExplainer
from ml_pipeline.fraud_engine import FraudEngine


def main():
    print("=" * 70)
    print("FINANCIAL FRAUD DETECTION: FULL ML & XAI PIPELINE")
    print("=" * 70)

    # 1. Setup Directories
    for d in ["models", "data/processed", "storage"]:
        os.makedirs(d, exist_ok=True)

    # 2. Load and Merge IEEE-CIS Raw Data
    print("\n[STEP 1/7] Loading & Merging IEEE-CIS Dataset...")
    # Sample 80,000 rows preserving all fraud cases for fast, memory-safe execution
    df_raw = load_raw_data(data_dir="DATASET_ieee-fraud-detection", sample_size=80000)

    # 3. Feature Engineering
    print("\n[STEP 2/7] Engineering Features (Amount, Time, Velocity, Device, Card)...")
    df_feat = create_features(df_raw)
    del df_raw

    # 4. Feature Selection
    print("\n[STEP 3/7] Performing Feature Selection...")
    selected_features = select_features(df_feat, target_col="isFraud")
    with open("data/processed/feature_names.json", "w") as f:
        json.dump(selected_features, f, indent=2)

    # 5. Temporal Train/Val/Test Split
    print("\n[STEP 4/7] Splitting Chronologically into Train (70%), Val (15%), Test (15%)...")
    train_df, val_df, test_df = split_data_temporal(df_feat)

    # 6. Preprocessing & Encoding
    print("\n[STEP 5/7] Fitting Imputation, Categorical Encoders & Scalers...")
    preprocessor = FraudPreprocessor()
    preprocessor.fit(train_df, selected_features)
    joblib.dump(preprocessor, "models/preprocessor.pkl")
    print("Saved models/preprocessor.pkl")

    X_train = preprocessor.transform(train_df, for_linear=False)
    X_train_scaled = preprocessor.transform(train_df, for_linear=True)
    y_train = train_df["isFraud"].values

    X_val = preprocessor.transform(val_df, for_linear=False)
    X_val_scaled = preprocessor.transform(val_df, for_linear=True)
    y_val = val_df["isFraud"].values

    X_test = preprocessor.transform(test_df, for_linear=False)
    X_test_scaled = preprocessor.transform(test_df, for_linear=True)
    y_test = test_df["isFraud"].values

    # 7. Train All 7 Models
    print("\n[STEP 6/7] Training 7 Supervised & Anomaly Models...")
    models = train_all_models(X_train, y_train, X_train_scaled, X_val, y_val, X_val_scaled)

    # Save individual models
    for name, model in models.items():
        joblib.dump(model, f"models/{name}.pkl")
        print(f"Saved models/{name}.pkl")

    # 8. Evaluate Models on Test Set
    print("\n[STEP 7/7] Evaluating Models & Generating Leaderboard Metrics...")
    metrics_summary, curves_data = evaluate_models(models, X_test, y_test, X_test_scaled)

    # Fit SHAP Explainer on Champion Model (LightGBM)
    champion_model = models.get("lightgbm")
    print("\nFitting SHAP Explainer on LightGBM Champion...")
    explainer = FraudExplainer(champion_model, selected_features, background_sample=X_train[:200])
    joblib.dump(explainer, "models/shap_explainer.pkl")
    print("Saved models/shap_explainer.pkl")

    global_shap = explainer.get_global_feature_importance(X_test[:200], top_k=15)

    # Assemble Model Performance JSON for Dashboard
    performance_payload = {
        "leaderboard": metrics_summary,
        "curves": curves_data,
        "global_feature_importance": global_shap,
        "champion_model": "LightGBM",
        "evaluation_timestamp": datetime.now(timezone.utc).isoformat()
    }
    with open("storage/model_metrics.json", "w") as f:
        json.dump(performance_payload, f, indent=2)
    print("Saved storage/model_metrics.json")

    # Generate EDA & Risk Analytics Statistics
    print("\nGenerating EDA Analytics for Dashboard...")
    eda_stats = {
        "fraud_distribution": {
            "legitimate": int((df_feat["isFraud"] == 0).sum()),
            "fraud": int((df_feat["isFraud"] == 1).sum()),
            "fraud_rate": round(float(df_feat["isFraud"].mean() * 100), 2)
        },
        "fraud_by_hour": df_feat.groupby("hour")["isFraud"].agg(["count", "sum"]).rename(
            columns={"count": "total", "sum": "fraud"}).to_dict(orient="index"),
        "fraud_by_product": df_feat.groupby("ProductCD")["isFraud"].agg(["count", "sum"]).rename(
            columns={"count": "total", "sum": "fraud"}).to_dict(orient="index") if "ProductCD" in df_feat else {},
        "fraud_by_card_type": df_feat.groupby("card4")["isFraud"].agg(["count", "sum"]).rename(
            columns={"count": "total", "sum": "fraud"}).to_dict(orient="index") if "card4" in df_feat else {},
        "amount_distribution": {
            "legitimate_mean": round(float(df_feat[df_feat["isFraud"] == 0]["TransactionAmt"].mean()), 2),
            "fraud_mean": round(float(df_feat[df_feat["isFraud"] == 1]["TransactionAmt"].mean()), 2),
            "median": round(float(df_feat["TransactionAmt"].median()), 2),
            "p75": round(float(df_feat["TransactionAmt"].quantile(0.75)), 2),
            "p95": round(float(df_feat["TransactionAmt"].quantile(0.95)), 2),
            "max": round(float(df_feat["TransactionAmt"].max()), 2)
        }
    }
    # Convert keys to string for JSON compliance
    eda_stats["fraud_by_hour"] = {str(k): v for k, v in eda_stats["fraud_by_hour"].items()}
    with open("storage/eda_stats.json", "w") as f:
        json.dump(eda_stats, f, indent=2)
    print("Saved storage/eda_stats.json")

    # Generate Sample Transactions & Initial Alert Queue via Fraud Engine
    print("\nScoring sample transactions with FraudEngine...")
    engine = FraudEngine(models, preprocessor, explainer)

    # Take a representative sample from test set for the dashboard explorer
    sample_records = test_df.sample(n=min(1200, len(test_df)), random_state=42).to_dict(orient="records")
    scored_transactions = []
    initial_alerts = []
    alert_counter = 1

    for rec in sample_records:
        scored = engine.predict_transaction(rec)
        # Add display metadata
        scored["timestamp"] = int(rec.get("TransactionDT", 0))
        scored["product_cd"] = str(rec.get("ProductCD", "W"))
        scored["card4"] = str(rec.get("card4", "visa"))
        scored["card6"] = str(rec.get("card6", "debit"))
        scored["device_info"] = str(rec.get("DeviceInfo", "Unknown"))
        scored["p_email"] = str(rec.get("P_emaildomain", "Unknown"))
        scored["actual_fraud"] = int(rec.get("isFraud", 0))
        scored_transactions.append(scored)

        # Trigger alerts for HIGH and CRITICAL risk items
        if scored["risk_level"] in ["HIGH", "CRITICAL"]:
            status = "NEW" if alert_counter % 3 == 0 else ("UNDER REVIEW" if alert_counter % 3 == 1 else "RESOLVED")
            initial_alerts.append({
                "alert_id": f"ALT-{alert_counter:04d}",
                "transaction_id": scored["transaction_id"],
                "amount": scored["amount"],
                "risk_score": scored["risk_score"],
                "risk_level": scored["risk_level"],
                "fraud_probability": scored["fraud_probability"],
                "reason": scored["explanation"]["human_reasons"][0] if scored["explanation"]["human_reasons"] else "High risk composite score",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": status,
                "triggered_rules": scored["triggered_rules"]
            })
            alert_counter += 1

    # Save Scored Transactions
    with open("storage/transactions_sample.json", "w") as f:
        json.dump(scored_transactions, f, indent=2)
    print(f"Saved storage/transactions_sample.json ({len(scored_transactions)} transactions)")

    # Save Alerts
    with open("storage/alerts.json", "w") as f:
        json.dump(initial_alerts[:60], f, indent=2)
    print(f"Saved storage/alerts.json ({len(initial_alerts[:60])} alerts)")

    # Save Real-Time Simulation Stream Sequence (mix of fraud and legitimate)
    sim_stream = [tx for tx in scored_transactions[:150]]
    with open("storage/simulation_stream.json", "w") as f:
        json.dump(sim_stream, f, indent=2)
    print(f"Saved storage/simulation_stream.json ({len(sim_stream)} live stream transactions)")

    print("\n" + "=" * 70)
    print("PIPELINE EXECUTION COMPLETE! ALL ARTIFACTS SUCCESSFULLY GENERATED.")
    print("=" * 70)


if __name__ == "__main__":
    main()
