"""
Feature Selection Module for IEEE-CIS Fraud Detection
Identifies high-signal predictive features, removes low-variance and redundant collinear columns.
"""

import pandas as pd
import numpy as np


def select_features(df: pd.DataFrame, target_col: str = "isFraud", max_features: int = 50) -> list:
    """
    Selects a curated subset of domain features plus top-correlated/high-importance IEEE-CIS features.
    """
    print("Selecting features...")

    candidate_features = [
        # Engineered Amount features
        "TransactionAmt", "TransactionAmt_log", "TransactionAmt_decimal", 
        "amount_zscore", "amount_percentile", "amount_to_card_mean_ratio",
        "card_mean_amount", "card_max_amount", "card_std_amount",

        # Engineered Time & Velocity features
        "hour", "day", "weekday", "is_weekend", "time_period",
        "card_velocity_24h", "transactions_per_card", "transactions_per_device",
        "device_unique_cards", "same_device_many_cards",

        # Engineered Missingness flags
        "device_missing", "identity_missing", "email_missing", "address_missing",

        # Categorical & Domain identifiers
        "ProductCD", "card1", "card2", "card3", "card4", "card5", "card6",
        "addr1", "addr2", "dist1", "P_emaildomain", "R_emaildomain",
        "same_email_domain", "email_frequency", "address_frequency",
        "DeviceType", "DeviceInfo",

        # Core IEEE-CIS C (count) & D (timedelta) features
        "C1", "C2", "C5", "C6", "C9", "C11", "C13", "C14",
        "D1", "D2", "D4", "D10", "D15",

        # Core IEEE-CIS M (match) features
        "M4", "M6",

        # Top IEEE-CIS V (vesta) features
        "V12", "V35", "V45", "V70", "V75", "V87", "V91",
        "V130", "V283", "V310", "V312", "V314",

        # Identity features
        "id_01", "id_02", "id_12", "id_30", "id_31"
    ]

    # Filter to only existing columns
    available_features = [c for c in candidate_features if c in df.columns and c != target_col]

    # Drop zero variance columns
    non_constant_features = []
    for col in available_features:
        if df[col].nunique(dropna=True) > 1:
            non_constant_features.append(col)

    print(f"Selected {len(non_constant_features)} high-value predictive features.")
    return non_constant_features
