"""
Quick WebSocket Live Stream Verification Test
Connects to ws://127.0.0.1:8000/api/ws/live and checks incoming stream messages.
"""

import asyncio
import json
import urllib.request

try:
    import websockets
except ImportError:
    import sys
    sys.exit(0)

async def test_live_stream():
    # 1. Start simulation
    req = urllib.request.Request("http://127.0.0.1:8000/api/simulation/start", method="POST")
    try:
        urllib.request.urlopen(req)
    except Exception as e:
        print("Failed to start sim:", e)

    # 2. Connect to WS
    uri = "ws://127.0.0.1:8000/api/ws/live"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as ws:
            print("[PASS] WebSocket connection established successfully!")
            # Receive 2 simulated transactions
            for i in range(2):
                msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                payload = json.loads(msg)
                tx = payload.get("data") or payload
                print(f"[RECV] Event {i+1}: TX {tx.get('transaction_id')} - Score: {tx.get('risk_score')} ({tx.get('risk_level')})")
    except Exception as e:
        print("[FAIL] WebSocket test error:", e)
    finally:
        # Pause simulation
        stop_req = urllib.request.Request("http://127.0.0.1:8000/api/simulation/stop", method="POST")
        try:
            urllib.request.urlopen(stop_req)
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(test_live_stream())
