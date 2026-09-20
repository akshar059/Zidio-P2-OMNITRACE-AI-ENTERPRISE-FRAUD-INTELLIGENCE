"""
Feature Engineering Module for IEEE-CIS Fraud Detection
Generates amount, time, velocity, card, device, email, address, and interaction features.
"""

import numpy as np
import pandas as pd


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """Computes all domain-specific fraud features on the merged dataset."""
    print("Engineering features...")
    df = df.copy()

    # 1. Missing Value Indicators
    df["device_missing"] = df["DeviceInfo"].isna().astype(np.int8) if "DeviceInfo" in df.columns else 0
    df["identity_missing"] = df["id_01"].isna().astype(np.int8) if "id_01" in df.columns else 1
    df["email_missing"] = df["P_emaildomain"].isna().astype(np.int8) if "P_emaildomain" in df.columns else 0
    df["address_missing"] = df["addr1"].isna().astype(np.int8) if "addr1" in df.columns else 0

    # 2. Transaction Amount Features
    if "TransactionAmt" in df.columns:
        df["TransactionAmt_log"] = np.log1p(df["TransactionAmt"].clip(lower=0)).astype(np.float32)
        df["TransactionAmt_decimal"] = (df["TransactionAmt"] - np.floor(df["TransactionAmt"])).astype(np.float32)
        mean_amt = df["TransactionAmt"].mean()
        std_amt = df["TransactionAmt"].std() + 1e-5
        df["amount_zscore"] = ((df["TransactionAmt"] - mean_amt) / std_amt).astype(np.float32)
        df["amount_percentile"] = (df["TransactionAmt"].rank(pct=True)).astype(np.float32)

    # 3. Time-Based Features (TransactionDT is seconds from start)
    if "TransactionDT" in df.columns:
        # 3600 seconds = 1 hour, 86400 seconds = 1 day
        df["hour"] = ((df["TransactionDT"] // 3600) % 24).astype(np.int8)
        df["day"] = (df["TransactionDT"] // 86400).astype(np.int16)
        df["weekday"] = (df["day"] % 7).astype(np.int8)
        df["is_weekend"] = (df["weekday"] >= 5).astype(np.int8)

        # Time period: 0: Night (0-6), 1: Morning (6-12), 2: Afternoon (12-18), 3: Evening (18-24)
        df["time_period"] = pd.cut(
            df["hour"],
            bins=[-1, 6, 12, 18, 24],
            labels=[0, 1, 2, 3]
        ).astype(np.int8)

    # 4. Email Features
    if "P_emaildomain" in df.columns:
        df["P_emaildomain"] = df["P_emaildomain"].fillna("Unknown").astype(str)
        p_freq = df["P_emaildomain"].value_counts(normalize=True).to_dict()
        df["email_frequency"] = df["P_emaildomain"].map(p_freq).astype(np.float32)
    else:
        df["email_frequency"] = 0.0

    if "P_emaildomain" in df.columns and "R_emaildomain" in df.columns:
        df["R_emaildomain"] = df["R_emaildomain"].fillna("Unknown").astype(str)
        df["same_email_domain"] = (
            (df["P_emaildomain"] == df["R_emaildomain"]) & 
            (df["P_emaildomain"] != "Unknown")
        ).astype(np.int8)
    else:
        df["same_email_domain"] = 0

    # 5. Card-Based Features & Aggregations
    if "card1" in df.columns:
        card_counts = df["card1"].value_counts().to_dict()
        df["transactions_per_card"] = df["card1"].map(card_counts).astype(np.int32)

        # Card group-by stats on TransactionAmt
        if "TransactionAmt" in df.columns:
            card_stats = df.groupby("card1")["TransactionAmt"].agg(["mean", "max", "std"]).reset_index()
            card_stats.columns = ["card1", "card_mean_amount", "card_max_amount", "card_std_amount"]
            card_stats["card_std_amount"] = card_stats["card_std_amount"].fillna(0)
            df = df.merge(card_stats, on="card1", how="left")
            df["card_mean_amount"] = df["card_mean_amount"].astype(np.float32)
            df["card_max_amount"] = df["card_max_amount"].astype(np.float32)
            df["card_std_amount"] = df["card_std_amount"].astype(np.float32)

            # Ratio of transaction amount to card average
            df["amount_to_card_mean_ratio"] = (
                df["TransactionAmt"] / (df["card_mean_amount"] + 1e-5)
            ).clip(upper=50).astype(np.float32)

    # 6. Device Features
    if "DeviceInfo" in df.columns:
        df["DeviceInfo"] = df["DeviceInfo"].fillna("Unknown").astype(str)
        dev_freq = df["DeviceInfo"].value_counts().to_dict()
        df["transactions_per_device"] = df["DeviceInfo"].map(dev_freq).astype(np.int32)

        # Unique cards used on this device
        if "card1" in df.columns:
            dev_cards = df.groupby("DeviceInfo")["card1"].nunique().to_dict()
            df["device_unique_cards"] = df["DeviceInfo"].map(dev_cards).fillna(1).astype(np.int16)
            df["same_device_many_cards"] = (df["device_unique_cards"] > 3).astype(np.int8)
        else:
            df["device_unique_cards"] = 1
            df["same_device_many_cards"] = 0
    else:
        df["transactions_per_device"] = 1
        df["device_unique_cards"] = 1
        df["same_device_many_cards"] = 0

    # 7. Address Features
    if "addr1" in df.columns:
        addr_counts = df["addr1"].value_counts().to_dict()
        df["address_frequency"] = df["addr1"].map(addr_counts).fillna(0).astype(np.int32)
    else:
        df["address_frequency"] = 0

    # 8. Velocity features (Proxy velocity across cards over time window)
    if "card1" in df.columns and "day" in df.columns:
        card_day_counts = df.groupby(["card1", "day"])["TransactionID"].transform("count")
        df["card_velocity_24h"] = card_day_counts.astype(np.int16)
    else:
        df["card_velocity_24h"] = 1

    print(f"Feature engineering complete. New shape: {df.shape}")
    return df
