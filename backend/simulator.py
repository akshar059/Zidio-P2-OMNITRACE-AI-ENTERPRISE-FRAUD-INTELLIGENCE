"""
Real-Time Transaction Simulator & Dynamic Fraud Stream Engine
Continuously generates live financial transactions, scores them in real-time,
updates global application state across all modules, and broadcasts WebSocket telemetry.
"""

import asyncio
import json
import os
import random
from datetime import datetime, timezone
from typing import List, Set, Callable, Optional
from fastapi import WebSocket


class TransactionSimulator:
    def __init__(self, stream_file: str = "storage/simulation_stream.json"):
        self.stream_file = stream_file
        self.transactions: List[dict] = []
        self.active_connections: Set[WebSocket] = set()
        self.is_running: bool = False
        self.interval_seconds: float = 1.5
        self.current_index: int = 0
        self.tx_counter: int = 3008000
        self.task: Optional[asyncio.Task] = None
        self.alerts_history: List[dict] = []
        self.on_transaction_callback: Optional[Callable] = None
        self._load_stream_data()

    def _load_stream_data(self):
        """Loads baseline transactions from storage for feature reference."""
        if os.path.exists(self.stream_file):
            try:
                with open(self.stream_file, "r") as f:
                    self.transactions = json.load(f)
                print(f"[SIMULATOR] Loaded {len(self.transactions)} baseline stream transactions.")
            except Exception as e:
                print(f"[SIMULATOR] Error loading stream data: {e}")
                self.transactions = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        await websocket.send_json({
            "type": "SYSTEM_STATUS",
            "is_running": self.is_running,
            "interval_seconds": self.interval_seconds,
            "total_stream_tx": self.current_index,
            "message": "Connected to Fraud Intelligence Real-Time Live Stream"
        })

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        """Broadcasts a JSON message to all currently connected WebSocket clients."""
        disconnected = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        self.active_connections -= disconnected

    def generate_dynamic_transaction(self) -> dict:
        """Generates a realistic, infinitely unique dynamic financial transaction."""
        self.tx_counter += 1
        now_utc = datetime.now(timezone.utc)
        time_str = now_utc.strftime("%H:%M:%S")

        # Dynamic risk distribution: 75% clean/medium, 25% suspicious/critical
        roll = random.random()

        if roll < 0.10:
            # Critical Tier (Score >= 81)
            risk_score = random.randint(81, 98)
            risk_lvl = "CRITICAL"
            prediction = "FRAUD"
            fraud_prob = round(random.uniform(0.85, 0.99), 3)
            anomaly_score = round(random.uniform(0.70, 0.98), 2)
            amount = round(random.choice([
                random.uniform(25000.0, 98000.0), # High capital exposure
                random.uniform(7500.0, 24000.0),
                random.uniform(85.0, 450.0)       # Rapid carding testing
            ]), 2)
            trigger = random.choice([
                f"Velocity Surge: {random.randint(9, 24)} transactions linked to card in 10 minutes",
                f"Device Risk: {random.randint(14, 64)} payment cards associated with this device",
                "Syndicated Attack Ring: Coordinated multi-merchant card cycling",
                "3D Secure 2.0 Challenge Bypass & Tor Anonymizer Routing",
                "Topological Outlier: Graph Clustering Coefficient Exceeds 99.8th Percentile",
                "Synthetic Identity Anomaly: High-velocity velocity burst on fresh account"
            ])
            action = "DECLINE"
            email_domain = random.choice(["tempmail.org", "guerrillamail.com", "anonymous.com", "proton.me", "10minutemail.net", "trashmail.com"])
        elif roll < 0.25:
            # High Risk Tier (Score 61-80)
            risk_score = random.randint(61, 80)
            risk_lvl = "HIGH"
            prediction = "FRAUD"
            fraud_prob = round(random.uniform(0.62, 0.84), 3)
            anomaly_score = round(random.uniform(0.40, 0.72), 2)
            amount = round(random.uniform(1500.0, 18500.0), 2)
            trigger = random.choice([
                f"Elevated Card Activity: {random.randint(4, 9)} transactions in 24 hours",
                f"Device Risk: {random.randint(4, 12)} payment cards recorded on device",
                "Cross-Border Geolocation Mismatch: Card issuing country differs from IP",
                "High-Value Anomaly: Uncharacteristic transaction velocity burst",
                "Repeated 2FA Challenge Failures prior to approval"
            ])
            action = "FLAG"
            email_domain = random.choice(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"])
        elif roll < 0.50:
            # Medium Surveillance (Score 31-60)
            risk_score = random.randint(31, 60)
            risk_lvl = "MEDIUM"
            prediction = "LEGITIMATE"
            fraud_prob = round(random.uniform(0.25, 0.48), 3)
            anomaly_score = round(random.uniform(0.18, 0.42), 2)
            amount = round(random.uniform(450.0, 4800.0), 2)
            trigger = random.choice([
                "Behavioral Anomaly: Time-of-day discrepancy against cardholder baseline",
                "Merchant Category Novelty: First transaction in high-risk digital services",
                "Velocity Watchlist: 3 transactions attempted within 2 hours",
                "Unusual IP Subnet Shift: New ISP route detected"
            ])
            action = "REVIEW"
            email_domain = random.choice(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"])
        else:
            # Low Risk Safe Harbor (Score <= 30)
            risk_score = random.randint(3, 30)
            risk_lvl = "LOW"
            prediction = "LEGITIMATE"
            fraud_prob = round(random.uniform(0.01, 0.20), 3)
            anomaly_score = round(random.uniform(0.02, 0.20), 2)
            amount = round(random.uniform(180.0, 8500.0), 2)
            trigger = "Frictionless Pass: 3D Secure Authenticated & Verified Device Token"
            action = "ALLOW"
            email_domain = random.choice(["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "corporate.in", "t-online.de"])

        card_network = random.choice(["visa", "mastercard", "rupay", "discover", "amex"])
        card_type = random.choice(["debit", "credit"])
        product_cd = random.choice(["W", "C", "R", "H", "S"])
        device_info = random.choice(["Windows 11 / Edge", "iOS 18 / Safari", "Android 15 / Chrome", "macOS Sonoma / Safari", "Windows 10 / Chrome"])

        return {
            "transaction_id": str(self.tx_counter),
            "stream_time": time_str,
            "amount": amount,
            "card": f"{card_network} ({card_type})",
            "card4": card_network,
            "card6": card_type,
            "card1": random.randint(1000, 9999),
            "product_cd": product_cd,
            "P_emaildomain": email_domain,
            "p_email": email_domain,
            "device_info": device_info,
            "risk_score": risk_score,
            "risk_level": risk_lvl,
            "fraud_probability": fraud_prob,
            "anomaly_score": anomaly_score,
            "prediction": prediction,
            "action": action,
            "primary_trigger": trigger,
            "triggered_rules": [trigger],
            "hour": now_utc.hour,
            "explanation": {
                "human_reasons": [trigger],
                "risk_factors": [
                    {"feature": "TransactionAmt", "value": amount, "contribution": round(fraud_prob * 0.45, 2), "direction": "RISK_INCREASE" if risk_lvl in ["HIGH", "CRITICAL"] else "RISK_DECREASE"},
                    {"feature": "card_velocity_24h", "value": random.randint(1, 15), "contribution": 0.35 if risk_lvl in ["HIGH", "CRITICAL"] else 0.05, "direction": "RISK_INCREASE" if risk_lvl in ["HIGH", "CRITICAL"] else "RISK_DECREASE"}
                ]
            },
            "behavior_profile": {
                "labels": ["Amount Deviation", "Time Anomaly", "Velocity Surge", "Device Novelty", "Location Risk", "Product Category"],
                "current_transaction": [risk_score, random.randint(20, 85), min(99, risk_score + 8), random.randint(30, 80), random.randint(10, 75), random.randint(20, 70)],
                "historical_baseline": [25, 20, 15, 12, 18, 22]
            }
        }

    async def _run_loop(self):
        """Continuously streams live dynamic transactions while is_running is True."""
        print("[SIMULATOR] Starting live dynamic transaction streaming loop...")
        while self.is_running:
            self.current_index += 1
            tx = self.generate_dynamic_transaction()

            # 1. Ingest into backend global state (ledger, alerts, network, reports)
            if self.on_transaction_callback:
                try:
                    self.on_transaction_callback(tx)
                except Exception as e:
                    print(f"[SIMULATOR] Error in on_transaction_callback: {e}")

            # 2. Broadcast transaction event to all WebSocket clients
            await self.broadcast({
                "type": "TRANSACTION",
                "data": tx
            })

            # 3. Broadcast alert event if high or critical
            if tx.get("risk_level") in ["HIGH", "CRITICAL"]:
                alert_obj = {
                    "alert_id": f"ALT-LIVE-{tx['transaction_id']}",
                    "transaction_id": tx["transaction_id"],
                    "amount": tx["amount"],
                    "risk_score": tx["risk_score"],
                    "risk_level": tx["risk_level"],
                    "fraud_probability": tx["fraud_probability"],
                    "reason": tx["primary_trigger"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "NEW",
                    "triggered_rules": tx["triggered_rules"]
                }
                await self.broadcast({
                    "type": "NEW_ALERT",
                    "alert": alert_obj
                })

            await asyncio.sleep(self.interval_seconds)

    def start(self):
        if not self.is_running:
            self.is_running = True
            self.task = asyncio.create_task(self._run_loop())
            print("[SIMULATOR] Dynamic simulation stream started.")
            asyncio.create_task(self.broadcast({"type": "SIM_STATUS", "is_running": True}))
        return {"status": "started", "interval": self.interval_seconds}

    def stop(self):
        if self.is_running:
            self.is_running = False
            if self.task and not self.task.done():
                self.task.cancel()
            print("[SIMULATOR] Dynamic simulation stream paused.")
            asyncio.create_task(self.broadcast({"type": "SIM_STATUS", "is_running": False}))
        return {"status": "stopped"}

    def set_interval(self, seconds: float):
        self.interval_seconds = max(0.2, min(10.0, float(seconds)))
        return {"status": "interval_updated", "interval": self.interval_seconds}

    def get_status(self):
        return {
            "is_running": self.is_running,
            "interval_seconds": self.interval_seconds,
            "connected_clients": len(self.active_connections),
            "stream_length": self.current_index,
            "current_index": self.current_index
        }
