"""Comprehensive verification test for ArgusGuard AI platform."""
import urllib.request
import json
import asyncio
import websockets

def test_endpoints():
    print("Testing HTTP Endpoints...")
    base = "http://127.0.0.1:8000"
    
    # 1. HTML Dashboard
    with urllib.request.urlopen(f"{base}/") as r:
        html = r.read().decode()
        assert "Executive Risk Dashboard" in html, "Title missing"
        assert "tab-overview" in html and "tab-transactions" in html and "tab-live" in html
        assert "tab-simulator" in html and "tab-alerts" in html and "tab-analytics" in html
        assert "tab-models" in html and "tab-xai" in html
        print("  [OK] HTML served with all 8 core views")

    # 2. Static CSS and JS
    assets = [
        "/static/css/styles.css",
        "/static/js/api.js",
        "/static/js/charts.js",
        "/static/js/websocket.js",
        "/static/js/simulator.js",
        "/static/js/alerts.js",
        "/static/js/app.js"
    ]
    for path in assets:
        with urllib.request.urlopen(f"{base}{path}") as r:
            assert r.status == 200
        print(f"  [OK] Static asset {path} served (200 OK)")

    # 3. Summary
    with urllib.request.urlopen(f"{base}/api/dashboard/summary") as r:
        summary = json.loads(r.read().decode())
        print(f"  [OK] Summary KPI: total={summary['total_transactions']}, fraud={summary['fraud_detected']}, at_risk=${summary['amount_at_risk']}")

    # 4. Transactions List & Detail
    with urllib.request.urlopen(f"{base}/api/transactions?page=1&page_size=5") as r:
        txs = json.loads(r.read().decode())
        tx_id = txs["items"][0]["transaction_id"]
        print(f"  [OK] Transactions page 1: {len(txs['items'])} items returned (first ID={tx_id})")

    with urllib.request.urlopen(f"{base}/api/transactions/{tx_id}") as r:
        detail = json.loads(r.read().decode())
        print(f"  [OK] Transaction detail for {tx_id}: risk_score={detail['risk_score']}, tier={detail['risk_level']}")

    # 5. Prediction
    req_pred = urllib.request.Request(
        f"{base}/api/predict",
        data=json.dumps({
            "TransactionAmt": 1850.0,
            "ProductCD": "C",
            "card4": "visa",
            "card6": "credit",
            "P_emaildomain": "protonmail.com",
            "card_velocity_24h": 12,
            "device_unique_cards": 4,
            "hour": 3
        }).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_pred) as r:
        pred = json.loads(r.read().decode())
        print(f"  [OK] Live Predict: Score={pred['risk_score']}, Tier={pred['risk_level']}, Rules={len(pred['triggered_rules'])}")

    # 6. Simulation controls
    req = urllib.request.Request(f"{base}/api/simulation/start", method="POST", data=b"")
    with urllib.request.urlopen(req) as r:
        sim_start = json.loads(r.read().decode())
        print(f"  [OK] Simulation started: {sim_start}")

    with urllib.request.urlopen(f"{base}/api/simulation/status") as r:
        sim_stat = json.loads(r.read().decode())
        print(f"  [OK] Simulation status: running={sim_stat['is_running']}, current_idx={sim_stat['current_index']}")

    req = urllib.request.Request(f"{base}/api/simulation/stop", method="POST", data=b"")
    with urllib.request.urlopen(req) as r:
        sim_stop = json.loads(r.read().decode())
        print(f"  [OK] Simulation stopped: {sim_stop}")

test_endpoints()

async def test_ws():
    print("Testing WebSocket /api/ws/live...")
    uri = "ws://127.0.0.1:8000/api/ws/live"
    async with websockets.connect(uri) as ws:
        msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
        data = json.loads(msg)
        print(f"  [OK] WebSocket initial message: {data}")

asyncio.run(test_ws())
print("\n" + "=" * 50)
print("ALL SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY!")
print("=" * 50)
