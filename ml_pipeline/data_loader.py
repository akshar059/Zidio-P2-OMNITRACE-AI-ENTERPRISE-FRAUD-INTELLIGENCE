"""
Data Loader for IEEE-CIS Fraud Detection Dataset
Handles chunked/optimized reading, data type downcasting, and left join merging.
"""

import os
import pandas as pd
import numpy as np


def reduce_mem_usage(df: pd.DataFrame, verbose: bool = True) -> pd.DataFrame:
    """Downcast numeric columns to int32/int16/int8 or float32 to reduce memory footprint."""
    start_mem = df.memory_usage().sum() / 1024**2
    for col in df.columns:
        col_type = df[col].dtype
        if col_type != object and not pd.api.types.is_categorical_dtype(df[col]):
            c_min = df[col].min()
            c_max = df[col].max()
            if str(col_type)[:3] == "int":
                if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                    df[col] = df[col].astype(np.int8)
                elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                    df[col] = df[col].astype(np.int16)
                elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                    df[col] = df[col].astype(np.int32)
                else:
                    df[col] = df[col].astype(np.int64)
            else:
                if c_min > np.finfo(np.float32).min and c_max < np.finfo(np.float32).max:
                    df[col] = df[col].astype(np.float32)
                else:
                    df[col] = df[col].astype(np.float64)
    end_mem = df.memory_usage().sum() / 1024**2
    if verbose:
        print(f"Memory usage decreased from {start_mem:.2f} MB to {end_mem:.2f} MB ({(start_mem - end_mem)/start_mem*100:.1f}% reduction)")
    return df


def load_raw_data(data_dir: str = "DATASET_ieee-fraud-detection", sample_size: int = 150000) -> pd.DataFrame:
    """
    Loads train_transaction.csv and train_identity.csv, performs left join on TransactionID.
    If sample_size is provided, preserves all fraud cases and samples legitimate transactions
    to create a balanced, high-signal, memory-safe training set.
    """
    tr_path = os.path.join(data_dir, "train_transaction.csv")
    id_path = os.path.join(data_dir, "train_identity.csv")

    if not os.path.exists(tr_path):
        raise FileNotFoundError(f"Transaction file not found: {tr_path}")
    if not os.path.exists(id_path):
        raise FileNotFoundError(f"Identity file not found: {id_path}")

    print("Loading train_identity.csv...")
    df_id = pd.read_csv(id_path)
    df_id = reduce_mem_usage(df_id, verbose=False)

    print("Loading train_transaction.csv...")
    # First inspect fraud vs non-fraud to stratify / sample if needed
    if sample_size and sample_size < 590000:
        print(f"Sampling high-signal subset (~{sample_size} records, preserving all fraud)...")
        chunks = []
        chunksize = 100000
        for chunk in pd.read_csv(tr_path, chunksize=chunksize):
            chunks.append(chunk)
        df_tr_full = pd.concat(chunks, ignore_index=True)
        del chunks

        fraud_df = df_tr_full[df_tr_full["isFraud"] == 1]
        non_fraud_df = df_tr_full[df_tr_full["isFraud"] == 0]

        n_non_fraud = min(sample_size - len(fraud_df), len(non_fraud_df))
        non_fraud_sample = non_fraud_df.sample(n=n_non_fraud, random_state=42)

        df_tr = pd.concat([fraud_df, non_fraud_sample], ignore_index=True)
        # Sort by TransactionDT to preserve true temporal sequence
        df_tr = df_tr.sort_values("TransactionDT").reset_index(drop=True)
        del df_tr_full, fraud_df, non_fraud_df, non_fraud_sample
    else:
        df_tr = pd.read_csv(tr_path)

    df_tr = reduce_mem_usage(df_tr, verbose=False)

    print(f"Merging transactions ({df_tr.shape}) with identity ({df_id.shape}) on TransactionID (Left Join)...")
    merged_df = df_tr.merge(df_id, on="TransactionID", how="left")
    merged_df = reduce_mem_usage(merged_df, verbose=True)

    print(f"Merged dataset shape: {merged_df.shape}")
    print(f"Fraud count: {merged_df['isFraud'].sum()} ({merged_df['isFraud'].mean()*100:.2f}%)")
    return merged_df
