"""
Fraud Intelligence Engine
Unifies Machine Learning, Anomaly Detection, Rule-Based Detection,
Risk Scoring (0-100), and Explainable AI into a production-grade inference service.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List


class FraudEngine:
    def __init__(self, models: dict, preprocessor, explainer=None):
        self.models = models
        self.preprocessor = preprocessor
        self.explainer = explainer
        self.cat_model = models.get("catboost")
        self.lgb_model = models.get("lightgbm")
        self.ensemble_model = models.get("ensemble_cat_lgb")
        self.ml_model = self.ensemble_model or self.lgb_model or self.cat_model or models.get("xgboost") or models.get("random_forest")
        self.iso_forest = models.get("isolation_forest")
        self.autoencoder = models.get("autoencoder")

    def evaluate_rules(self, tx: Dict[str, Any]) -> tuple:
        """
        Rule-Based Fraud Detection System.
        Applies expert heuristics and domain guardrails.
        Returns: (rule_score: float in [0, 1], triggered_rules: list of str)
        """
        score = 0.0
        triggered = []

        amt = float(tx.get("TransactionAmt", 0))
        velocity = float(tx.get("card_velocity_24h", 1))
        dev_cards = float(tx.get("device_unique_cards", 1))
        p_email = str(tx.get("P_emaildomain", "")).lower()
        r_email = str(tx.get("R_emaildomain", "")).lower()
        hour = int(tx.get("hour", 12))
        id_missing = int(tx.get("identity_missing", 0))

        # Rule 1: Extreme Transaction Amount
        if amt >= 2000.0:
            score += 0.35
            triggered.append(f"High-Value Anomaly: Amount ${amt:,.2f} exceeds $2,000 threshold")
        elif amt >= 1000.0:
            score += 0.20
            triggered.append(f"Elevated Amount: ${amt:,.2f} requires extra verification")

        # Rule 2: Rapid Velocity Spike
        if velocity >= 8:
            score += 0.30
            triggered.append(f"Velocity Surge: {int(velocity)} transactions linked to card in 24 hours")
        elif velocity >= 4:
            score += 0.15
            triggered.append(f"Elevated Card Activity: {int(velocity)} transactions in 24 hours")

        # Rule 3: Multi-Card Single Device Fingerprint
        if dev_cards >= 4:
            score += 0.30
            triggered.append(f"Device Risk: {int(dev_cards)} payment cards associated with this device")
        elif dev_cards >= 2:
            score += 0.10
            triggered.append(f"Shared Device: {int(dev_cards)} cards recorded on device")

        # Rule 4: Suspicious / Disposable Email or Discordant Domain
        suspicious_domains = ["mailinator.com", "protonmail.com", "yandex.ru", "anonymous.com", "10minutemail.com"]
        if any(dom in p_email for dom in suspicious_domains):
            score += 0.25
            triggered.append(f"High-Risk Email Domain: Provider '{p_email}' flagged for elevated fraud")

        if p_email and r_email and p_email != "unknown" and r_email != "unknown" and p_email != r_email:
            score += 0.15
            triggered.append(f"Domain Mismatch: Purchaser '{p_email}' does not match recipient '{r_email}'")

        # Rule 5: High Value with Missing Identity / Device Profile
        if amt > 500.0 and id_missing == 1:
            score += 0.15
            triggered.append("Verification Deficit: Large transaction with zero device/identity metadata")

        # Rule 6: Late Night Off-Hours Spike
        if hour in [1, 2, 3, 4] and amt > 350.0:
            score += 0.10
            triggered.append(f"Off-Hours Activity: High-value charge placed during early morning (0{hour}:00)")

        # Enterprise Signal 7: CVV / CVC Verification Result
        cvv = str(tx.get("cvv_result", "M")).upper()
        if cvv == "N":
            score += 0.40
            triggered.append("CVV Mismatch: Security code does not match card record (High Compromised Card Signature)")
        elif cvv == "P" and amt > 75.0:
            score += 0.15
            triggered.append("CVV Missing: Transaction attempted without security code verification")

        # Enterprise Signal 8: Address Verification System (AVS)
        avs = str(tx.get("avs_result", "Y")).upper()
        if avs == "N":
            score += 0.30
            triggered.append("AVS Failure: Billing address street and postal code failed verification")
        elif avs in ["A", "Z"]:
            score += 0.12
            triggered.append("AVS Partial Match: Street address or postal code mismatch")

        # Enterprise Signal 9: Geolocation Discordance & Proxy/VPN Anonymizer
        ip_country = str(tx.get("ip_country", "US")).upper()
        bill_country = str(tx.get("billing_country", "US")).upper()
        ship_country = str(tx.get("shipping_country", "US")).upper()
        is_vpn = bool(tx.get("is_vpn_proxy", False))

        if is_vpn:
            score += 0.35
            triggered.append("Network Anonymizer: Anonymous Tor Exit Node / Commercial Datacenter Proxy detected")

        if ip_country != bill_country or ip_country != ship_country:
            score += 0.25
            triggered.append(f"Geo-Mismatch: IP Origin ({ip_country}) differs from Billing ({bill_country}) or Shipping ({ship_country})")

        # Enterprise Signal 10: 3D Secure 2.0 / SCA Protocol
        three_ds = str(tx.get("three_ds_status", "FRICTIONLESS")).upper()
        if three_ds == "CHALLENGE_FAILED":
            score += 0.45
            triggered.append("3D Secure 2.0 Failure: Cardholder failed two-factor step-up challenge")
        elif three_ds in ["FRICTIONLESS", "CHALLENGE_SUCCESS"]:
            score = max(0.0, score - 0.20)
            triggered.append("3D Secure Authenticated: Verified digital identity; liability shifted to card issuer")

        # Enterprise Signal 11: 1-Hour Burst Velocity
        vel_1h = int(tx.get("velocity_1h", 1))
        if vel_1h >= 5:
            score += 0.35
            triggered.append(f"Carding Burst Velocity: {vel_1h} transactions attempted within the last 60 minutes")

        norm_score = min(1.0, score)
        return norm_score, triggered

    def calculate_anomaly_score(self, x_vector: np.ndarray, x_vector_scaled: np.ndarray) -> float:
        """Computes combined anomaly score from Isolation Forest and Autoencoder."""
        iso_score = 0.0
        if self.iso_forest:
            try:
                raw_s = -self.iso_forest.score_samples(x_vector)[0]
                # Map raw score approx [0.35, 0.75] -> [0, 1]
                iso_score = float(np.clip((raw_s - 0.38) / 0.32, 0.0, 1.0))
            except Exception:
                iso_score = 0.2

        ae_score = 0.0
        if self.autoencoder:
            try:
                recon = self.autoencoder.predict(x_vector_scaled)
                mse = float(np.mean((x_vector_scaled - recon) ** 2))
                ae_score = float(np.clip(mse / 4.0, 0.0, 1.0))
            except Exception:
                ae_score = 0.2

        if self.autoencoder and self.iso_forest:
            return round(0.6 * iso_score + 0.4 * ae_score, 4)
        return round(iso_score, 4)

    def predict_transaction(self, tx_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Full inference pipeline for a single transaction.
        Returns complete diagnostic dossier with ML probability, anomaly score,
        risk score (0-100), risk tier, triggered rules, and SHAP explanation.
        """
        # Ensure transaction has default engineered features if not supplied
        tx = dict(tx_data)
        tx_id = str(tx.get("TransactionID") or tx.get("transaction_id") or tx.get("id") or "TX-UNKNOWN")
        amt = float(tx.get("TransactionAmt") or tx.get("amount") or 0.0)

        # Basic feature derivations if raw
        if "TransactionAmt_log" not in tx:
            tx["TransactionAmt_log"] = float(np.log1p(max(0.0, amt)))
        if "hour" not in tx:
            dt = tx.get("TransactionDT", 3600 * 12)
            tx["hour"] = int((dt // 3600) % 24)

        # 1. Transform features via preprocessor
        x_vec = self.preprocessor.transform_single(tx, for_linear=False)
        x_vec_scaled = self.preprocessor.transform_single(tx, for_linear=True)

        # 2. Supervised ML Fraud Probability (Dual Ensemble)
        cat_prob = None
        lgb_prob = None
        if self.cat_model and hasattr(self.cat_model, "predict_proba"):
            try:
                cat_prob = round(float(self.cat_model.predict_proba(x_vec)[0, 1]), 4)
            except Exception:
                pass
        if self.lgb_model and hasattr(self.lgb_model, "predict_proba"):
            try:
                lgb_prob = round(float(self.lgb_model.predict_proba(x_vec)[0, 1]), 4)
            except Exception:
                pass

        if self.ml_model and hasattr(self.ml_model, "predict_proba"):
            ml_prob = float(self.ml_model.predict_proba(x_vec)[0, 1])
        elif cat_prob is not None and lgb_prob is not None:
            ml_prob = 0.50 * cat_prob + 0.50 * lgb_prob
        elif lgb_prob is not None:
            ml_prob = lgb_prob
        elif cat_prob is not None:
            ml_prob = cat_prob
        else:
            ml_prob = 0.05
        ml_prob = round(ml_prob, 4)

        # 3. Unsupervised Anomaly Score
        anomaly_score = self.calculate_anomaly_score(x_vec, x_vec_scaled)

        # 4. Rule-Based Engine
        rule_score, triggered_rules = self.evaluate_rules(tx)

        # 5. Multi-Component Risk Decomposition
        ml_risk = int(round(np.clip(ml_prob * 100, 0, 100)))
        vel_risk = int(round(np.clip(float(tx.get("card_velocity_24h", 1)) * 11.0, 5, 100)))
        dev_risk = int(round(np.clip(float(tx.get("device_unique_cards", 1)) * 22.0 + (25 if tx.get("device_missing") else 0), 10, 100)))
        beh_risk = int(round(np.clip(float(tx.get("amount_to_card_mean_ratio", 1.0)) * 22.0, 5, 100)))
        net_risk = int(round(np.clip((anomaly_score * 65.0) + (25.0 if float(tx.get("device_unique_cards", 1)) > 2 else 10.0), 5, 100)))
        rule_risk = int(round(np.clip(rule_score * 100, 0, 100)))

        # Weighted Composite Risk Score (0–100 scale)
        # 35% ML + 20% Velocity + 15% Device + 15% Behavior + 10% Network + 5% Rules
        raw_risk = (
            0.35 * ml_risk +
            0.20 * vel_risk +
            0.15 * dev_risk +
            0.15 * beh_risk +
            0.10 * net_risk +
            0.05 * rule_risk
        )
        final_risk_score = int(round(np.clip(raw_risk, 0, 100)))

        # 6. Categorize Risk Tier & Enterprise Policy Recommendation
        if final_risk_score <= 30:
            risk_level = "LOW"
            action = "APPROVE"
        elif final_risk_score <= 60:
            risk_level = "MEDIUM"
            action = "REVIEW"
        elif final_risk_score <= 80:
            risk_level = "HIGH"
            action = "FLAG"
        else:
            risk_level = "CRITICAL"
            action = "DECLINE"

        prediction = "FRAUD" if (final_risk_score >= 55 or ml_prob >= 0.50) else "LEGITIMATE"

        # Automated Decision Policy Recommendation
        cvv = str(tx.get("cvv_result", "M")).upper()
        three_ds = str(tx.get("three_ds_status", "FRICTIONLESS")).upper()
        is_vpn = bool(tx.get("is_vpn_proxy", False))

        if final_risk_score >= 80 or cvv == "N" or (is_vpn and final_risk_score >= 60):
            policy_action = "HARD DECLINE"
            policy_status = "DECLINED"
            policy_color = "crit"
            policy_reason = "Transaction blocked automatically. High probability of stolen payment instrument or carding bot."
        elif final_risk_score >= 60 or three_ds == "CHALLENGE_FAILED":
            policy_action = "CHALLENGE (3DS STEP-UP)"
            policy_status = "CHALLENGE"
            policy_color = "orange"
            policy_reason = "Elevated risk detected. Mandatory 2FA biometric or SMS OTP authentication required."
        elif final_risk_score >= 35:
            policy_action = "MANUAL REVIEW QUEUE"
            policy_status = "REVIEW"
            policy_color = "yellow"
            policy_reason = "Borderline anomaly. Dispatched to Tier-2 Fraud Analyst triage queue for manual inspection."
        else:
            policy_action = "AUTO-APPROVE (FRICTIONLESS)"
            policy_status = "APPROVED"
            policy_color = "green"
            policy_reason = "Low risk profile. High cardholder integrity, valid AVS/CVV, frictionless authentication."

        # Financial Exposure & Liability Shift
        dispute_fee = 25.00
        liability = "ISSUER_LIABLE" if three_ds in ["FRICTIONLESS", "CHALLENGE_SUCCESS"] else "MERCHANT_LIABLE"
        protected_exposure = round(amt + dispute_fee, 2) if final_risk_score >= 60 else 0.0

        financial_exposure = {
            "order_amount": round(amt, 2),
            "dispute_admin_fee": dispute_fee,
            "liability_shift": liability,
            "liability_shift_label": "Issuer Liable (3DS Protected)" if liability == "ISSUER_LIABLE" else "Merchant Liable (Dispute Exposure)",
            "potential_chargeback_loss": round(amt + dispute_fee, 2),
            "protected_loss": protected_exposure,
            "settlement_risk": "CRITICAL" if final_risk_score >= 80 else ("ELEVATED" if final_risk_score >= 60 else "MINIMAL")
        }

        policy_recommendation = {
            "action": policy_action,
            "status": policy_status,
            "badge_color": policy_color,
            "rationale": policy_reason,
            "rule_triggers_count": len(triggered_rules)
        }

        # 7. Explainable AI SHAP Breakdown
        explanation = {}
        if self.explainer:
            explanation = self.explainer.explain_transaction(x_vec, raw_features=tx)
        else:
            explanation = {
                "risk_factors": [],
                "mitigating_factors": [],
                "human_reasons": triggered_rules if triggered_rules else ["Transaction conforms to standard patterns"]
            }

        # 8. Behavioral Radar Profile (Current vs Historical Baseline)
        vel_1h = int(tx.get("velocity_1h", 1))
        geo_diff = 1 if (str(tx.get("ip_country", "US")).upper() != str(tx.get("billing_country", "US")).upper()) else 0
        auth_risk = 95 if cvv == "N" else (65 if cvv == "P" else (15 if three_ds == "FRICTIONLESS" else 55))

        behavior_profile = {
            "labels": [
                "Transaction Velocity",
                "Device Multi-Card",
                "Geo Discordance",
                "Auth & CVV Risk",
                "Network Anonymity",
                "Amount Deviation"
            ],
            "current_transaction": [
                int(min(100, max(10, float(tx.get("card_velocity_24h", 1)) * 8 + vel_1h * 12))),
                int(min(100, max(10, float(tx.get("device_unique_cards", 1)) * 25))),
                int(min(100, max(10, 85 if geo_diff else 15))),
                int(min(100, max(10, auth_risk))),
                int(min(100, max(10, 95 if is_vpn else 12))),
                int(min(100, max(10, (amt / 350.0) * 45)))
            ],
            "historical_baseline": [20, 15, 12, 10, 8, 22]
        }

        return {
            "transaction_id": tx_id,
            "amount": amt,
            "fraud_probability": ml_prob,
            "catboost_probability": cat_prob,
            "lightgbm_probability": lgb_prob,
            "model_engine": "Ensemble (CatBoost + LightGBM)" if (self.ensemble_model or (cat_prob is not None and lgb_prob is not None)) else "LightGBM",
            "anomaly_score": anomaly_score,
            "rule_score": round(rule_score, 4),
            "risk_score": final_risk_score,
            "risk_level": risk_level,
            "action": action,
            "prediction": prediction,
            "triggered_rules": triggered_rules,
            "explanation": explanation,
            "policy_recommendation": policy_recommendation,
            "financial_exposure": financial_exposure,
            "risk_factors": {
                "ml_risk": ml_risk,
                "velocity_risk": vel_risk,
                "device_risk": dev_risk,
                "behavior_risk": beh_risk,
                "network_risk": net_risk,
                "rule_risk": rule_risk
            },
            "risk_decomposition": {
                "ml_risk": ml_risk,
                "velocity_risk": vel_risk,
                "device_risk": dev_risk,
                "behavior_risk": beh_risk,
                "network_risk": net_risk,
                "rule_risk": rule_risk
            },
            "behavior_profile": behavior_profile
        }
