"""
Model Training Module for IEEE-CIS Fraud Detection
Trains 5 supervised classifiers and 2 unsupervised anomaly detection models.
Handles time-based splitting and class imbalance weighting.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.neural_network import MLPRegressor
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from ml_pipeline.ensemble import CatBoostLGBMEnsemble


def split_data_temporal(df: pd.DataFrame, train_ratio=0.70, val_ratio=0.15):
    """
    Time-based train/validation/test split to prevent data leakage in fraud detection.
    Transactions are ordered by TransactionDT.
    """
    df = df.sort_values("TransactionDT").reset_index(drop=True)
    n = len(df)
    n_train = int(n * train_ratio)
    n_val = int(n * (train_ratio + val_ratio))

    train_df = df.iloc[:n_train].copy()
    val_df = df.iloc[n_train:n_val].copy()
    test_df = df.iloc[n_val:].copy()

    print(f"Data Split -> Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    print(f"Fraud counts -> Train: {train_df['isFraud'].sum()} ({train_df['isFraud'].mean()*100:.2f}%), "
          f"Val: {val_df['isFraud'].sum()} ({val_df['isFraud'].mean()*100:.2f}%), "
          f"Test: {test_df['isFraud'].sum()} ({test_df['isFraud'].mean()*100:.2f}%)")
    return train_df, val_df, test_df


def train_all_models(X_train, y_train, X_train_scaled, X_val, y_val, X_val_scaled):
    """
    Trains all supervised and unsupervised models with appropriate class imbalance handling.
    """
    models = {}
    pos_count = int(np.sum(y_train == 1))
    neg_count = int(np.sum(y_train == 0))
    scale_pos_weight = max(1.0, float(neg_count) / max(1.0, float(pos_count)))
    print(f"Class imbalance scale_pos_weight: {scale_pos_weight:.2f}")

    # 1. Logistic Regression (Baseline)
    print("Training 1/7: Logistic Regression (Baseline)...")
    lr = LogisticRegression(
        max_iter=300,
        class_weight="balanced",
        solver="lbfgs",
        random_state=42
    )
    lr.fit(X_train_scaled, y_train)
    models["logistic_regression"] = lr

    # 2. Decision Tree
    print("Training 2/7: Decision Tree...")
    dt = DecisionTreeClassifier(
        max_depth=10,
        min_samples_leaf=20,
        class_weight="balanced",
        random_state=42
    )
    dt.fit(X_train, y_train)
    models["decision_tree"] = dt

    # 3. Random Forest
    print("Training 3/7: Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=80,
        max_depth=12,
        min_samples_leaf=15,
        class_weight="balanced_subsample",
        n_jobs=-1,
        random_state=42
    )
    rf.fit(X_train, y_train)
    models["random_forest"] = rf

    # 4. XGBoost
    print("Training 4/7: XGBoost...")
    xgb = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.08,
        scale_pos_weight=min(scale_pos_weight, 15.0), # damped to prevent extreme recall overfit
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="auc",
        random_state=42,
        n_jobs=-1
    )
    xgb.fit(X_train, y_train)
    models["xgboost"] = xgb

    # 5. LightGBM
    print("Training 5/9: LightGBM...")
    lgb = LGBMClassifier(
        n_estimators=150,
        max_depth=8,
        num_leaves=31,
        learning_rate=0.06,
        scale_pos_weight=min(scale_pos_weight, 15.0),
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        verbose=-1
    )
    lgb.fit(X_train, y_train)
    models["lightgbm"] = lgb

    # 6. CatBoost
    print("Training 6/9: CatBoost...")
    cat = CatBoostClassifier(
        iterations=250,
        depth=6,
        learning_rate=0.07,
        scale_pos_weight=min(scale_pos_weight, 15.0),
        eval_metric="AUC",
        random_seed=42,
        verbose=False,
        thread_count=-1
    )
    cat.fit(X_train, y_train, eval_set=(X_val, y_val), early_stopping_rounds=30)
    models["catboost"] = cat

    # 7. Champion Ensemble: CatBoost + LightGBM Soft-Voting Blend
    print("Building 7/9: Champion Ensemble (CatBoost + LightGBM)...")
    ensemble = CatBoostLGBMEnsemble(cat_model=cat, lgb_model=lgb, weight_cat=0.50, weight_lgb=0.50)
    models["ensemble_cat_lgb"] = ensemble

    # 8. Isolation Forest (Unsupervised Anomaly Detection)
    print("Training 8/9: Isolation Forest...")
    iso = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=42,
        n_jobs=-1
    )
    # Fit only on legitimate transactions or general background sample
    normal_idx = np.where(y_train == 0)[0]
    sample_normal = normal_idx if len(normal_idx) <= 30000 else np.random.choice(normal_idx, 30000, replace=False)
    iso.fit(X_train[sample_normal])
    models["isolation_forest"] = iso

    # 9. Autoencoder (Neural Reconstruction Anomaly Detection)
    print("Training 9/9: Neural Autoencoder...")
    # 3-layer bottleneck autoencoder using MLPRegressor (Input -> 32 -> 16 -> 32 -> Input)
    autoencoder = MLPRegressor(
        hidden_layer_sizes=(32, 16, 32),
        activation="relu",
        solver="adam",
        max_iter=25,
        batch_size=256,
        random_state=42
    )
    autoencoder.fit(X_train_scaled[sample_normal], X_train_scaled[sample_normal])
    models["autoencoder"] = autoencoder

    print("All models trained successfully!")
    return models
