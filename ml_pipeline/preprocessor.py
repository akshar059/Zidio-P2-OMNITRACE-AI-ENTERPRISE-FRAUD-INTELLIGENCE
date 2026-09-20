"""
Preprocessor Module for IEEE-CIS Fraud Detection
Handles missing value imputation, categorical encoding, scaling, and transformation state serialization.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler


class FraudPreprocessor:
    def __init__(self, cat_cols=None, num_cols=None):
        self.cat_cols = cat_cols or [
            "ProductCD", "card4", "card6", "P_emaildomain", "R_emaildomain",
            "DeviceType", "DeviceInfo"
        ]
        self.num_cols = num_cols or []
        self.medians = {}
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.feature_names = []

    def fit(self, df: pd.DataFrame, feature_cols: list):
        """Fit imputation values, categorical encoders, and numerical scaler on training set."""
        self.feature_names = [col for col in feature_cols if col in df.columns]
        
        # Automatically detect categorical vs numerical columns
        self.active_cat_cols = [
            c for c in self.feature_names 
            if df[c].dtype == object or str(df[c].dtype) == "category" or c in self.cat_cols
        ]
        self.active_num_cols = [c for c in self.feature_names if c not in self.active_cat_cols]

        # 1. Learn medians for numerical columns
        for col in self.active_num_cols:
            s_num = pd.to_numeric(df[col], errors="coerce")
            median_val = s_num.median()
            self.medians[col] = 0.0 if pd.isna(median_val) else float(median_val)

        # 2. Learn LabelEncoders for categorical columns
        for col in self.active_cat_cols:
            le = LabelEncoder()
            # Stringify and append 'Unknown' to ensure out-of-vocabulary handling
            vals = df[col].fillna("Unknown").astype(str).values
            unique_vals = list(np.unique(vals))
            if "Unknown" not in unique_vals:
                unique_vals.append("Unknown")
            le.fit(unique_vals)
            self.label_encoders[col] = le

        # 3. Fit scaler on imputed numerical data
        X_num = pd.DataFrame(index=df.index)
        for col in self.active_num_cols:
            s_num = pd.to_numeric(df[col], errors="coerce").fillna(self.medians[col])
            X_num[col] = s_num
        # Replace inf with large finite numbers
        X_num_mat = np.nan_to_num(X_num.values.astype(np.float32), nan=0.0, posinf=1e6, neginf=-1e6)
        self.scaler.fit(X_num_mat)

        return self

    def transform(self, df: pd.DataFrame, for_linear: bool = False) -> np.ndarray:
        """
        Transforms input dataframe into model-ready matrix.
        If for_linear=True, applies StandardScaler to numerical columns.
        """
        df_out = pd.DataFrame(index=df.index)

        # Process numerical features
        for col in self.active_num_cols:
            if col in df.columns:
                series = pd.Series(df[col], index=df.index)
            else:
                series = pd.Series([self.medians.get(col, 0.0)] * len(df), index=df.index)
            df_out[col] = pd.to_numeric(series, errors="coerce").fillna(self.medians.get(col, 0.0))

        # Process categorical features
        for col in self.active_cat_cols:
            le = self.label_encoders.get(col)
            if col in df.columns:
                raw_vals = pd.Series(df[col], index=df.index).fillna("Unknown").astype(str)
            else:
                raw_vals = pd.Series(["Unknown"] * len(df), index=df.index)
            
            # Map unseen categories to 'Unknown'
            classes = set(le.classes_)
            safe_vals = raw_vals.map(lambda x: x if x in classes else "Unknown")
            df_out[col] = le.transform(safe_vals)

        # Ensure column order matches feature_names
        df_out = df_out[self.feature_names]
        X_mat = np.nan_to_num(df_out.values, nan=0.0, posinf=1e6, neginf=-1e6)

        if for_linear:
            # Scale numerical features
            num_indices = [self.feature_names.index(c) for c in self.active_num_cols]
            X_mat[:, num_indices] = self.scaler.transform(X_mat[:, num_indices])

        return X_mat

    def transform_single(self, transaction_dict: dict, for_linear: bool = False) -> np.ndarray:
        """Transforms a single transaction dictionary into 1xN feature vector."""
        df = pd.DataFrame([transaction_dict])
        return self.transform(df, for_linear=for_linear)
