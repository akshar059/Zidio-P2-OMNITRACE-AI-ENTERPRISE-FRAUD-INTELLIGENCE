"""
Re-score authentic transaction samples from IEEE-CIS dataset with full metadata,
build Cytoscape network graph, and update alerts.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np

from ml_pipeline.data_loader import load_raw_data
from ml_pipeline.feature_engineering import create_features
from ml_pipeline.fraud_engine import FraudEngine
from ml_pipeline.network_analysis import build_fraud_network

def main():
    print("[1/4] Loading models and preprocessor...")
    models = {}
    for name in ["logistic_regression", "decision_tree", "random_forest", "xgboost", "lightgbm", "catboost", "ensemble_cat_lgb", "isolation_forest", "autoencoder"]:
        path = f"models/{name}.pkl"
        if os.path.exists(path):
            models[name] = joblib.load(path)
    preprocessor = joblib.load("models/preprocessor.pkl")
    explainer = joblib.load("models/shap_explainer.pkl")
    engine = FraudEngine(models, preprocessor, explainer)

    print("[2/4] Sampling authentic IEEE-CIS transactions...")
    df_raw = load_raw_data("DATASET_ieee-fraud-detection", sample_size=30000)
    df_feat = create_features(df_raw)

    # Sample 600 fraud + 600 legitimate transactions
    fraud_sample = df_feat[df_feat["isFraud"] == 1].head(500)
    legit_sample = df_feat[df_feat["isFraud"] == 0].head(500)
    sample_df = pd.concat([fraud_sample, legit_sample]).sample(frac=1.0, random_state=42)

    print(f"[3/4] Scoring {len(sample_df)} transactions through 6-factor risk engine...")
    records = sample_df.to_dict(orient="records")
    scored_list = []

    for tx in records:
        scored = engine.predict_transaction(tx)
        # Retain original metadata
        scored["transaction_id"] = str(tx.get("TransactionID"))
        scored["amount"] = float(tx.get("TransactionAmt", 0.0))
        scored["product_cd"] = str(tx.get("ProductCD", "W"))
        scored["card4"] = str(tx.get("card4", "visa")) if pd.notnull(tx.get("card4")) else "visa"
        scored["card6"] = str(tx.get("card6", "credit")) if pd.notnull(tx.get("card6")) else "credit"
        scored["p_email"] = str(tx.get("P_emaildomain", "Unknown")) if pd.notnull(tx.get("P_emaildomain")) else "Unknown"
        scored["device_info"] = str(tx.get("DeviceInfo", "Unknown")) if pd.notnull(tx.get("DeviceInfo")) else "Unknown"
        scored["is_fraud"] = int(tx.get("isFraud", 0))
        scored_list.append(scored)

    # Save to storage/transactions_sample.json
    with open("storage/transactions_sample.json", "w") as f:
        json.dump(scored_list, f, indent=2)
    print(f"Saved {len(scored_list)} records to storage/transactions_sample.json")

    # Generate Alerts from High & Critical transactions
    alerts = []
    alert_counter = 1
    for s in scored_list:
        if s.get("risk_level") in ["HIGH", "CRITICAL"]:
            rule_str = s["triggered_rules"][0] if s.get("triggered_rules") else f"Elevated ML risk ({int(s['fraud_probability']*100)}%)"
            status = "NEW" if alert_counter <= 20 else ("UNDER REVIEW" if alert_counter <= 35 else "CONFIRMED FRAUD")
            alerts.append({
                "alert_id": f"ALT-{1000 + alert_counter}",
                "transaction_id": s["transaction_id"],
                "amount": s["amount"],
                "risk_score": s["risk_score"],
                "risk_level": s["risk_level"],
                "reason": rule_str,
                "status": status,
                "timestamp": 1540000000 + alert_counter * 3600
            })
            alert_counter += 1
            if len(alerts) >= 50:
                break

    with open("storage/alerts.json", "w") as f:
        json.dump(alerts, f, indent=2)
    print(f"Saved {len(alerts)} alerts to storage/alerts.json")

    print("[4/4] Building Cytoscape Fraud Network Graph...")
    network_data = build_fraud_network(scored_list[:150], max_nodes=75)
    with open("storage/fraud_network.json", "w") as f:
        json.dump(network_data, f, indent=2)
    print(f"Saved storage/fraud_network.json ({network_data['total_nodes']} nodes, {network_data['total_edges']} edges)")

    print("\nRESCORE SAMPLES COMPLETE!")

if __name__ == "__main__":
    main()
