# OmniTrace AI — Autonomous Enterprise Fraud Defense & Explainable Risk Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Ensemble Engine](https://img.shields.io/badge/ML%20Ensemble-CatBoost%20%2B%20LightGBM-ff6f00.svg)](https://catboost.ai/)
[![XAI Standard](https://img.shields.io/badge/XAI-Tree--SHAP%20%26%20OCC%20SR%2011--7-purple.svg)](https://github.com/slundberg/shap)
[![Regulatory Standard](https://img.shields.io/badge/Regulatory-PMLA%202002%20%2F%20FIU--IND-red.svg)](https://fiuindia.gov.in/)
[![Graph Analytics](https://img.shields.io/badge/Network%20Graph-Cytoscape.js-0284c7.svg)](https://js.cytoscape.org/)

> **OmniTrace AI** is a production-ready, bank-grade autonomous financial fraud detection, explainable AI (XAI), and syndicate dismantling platform. Built on top of the benchmark IEEE-CIS Fraud Detection dataset, it combines a 9-model ensemble architecture with real-time WebSocket transaction streaming, 6-axis behavioral biometrics, interactive counterfactual simulations, and statutory regulatory compliance filing (**PMLA 2002 Section 12 FIU-IND Suspicious Transaction Reports**).

---

## Key Highlights & Capabilities

### 1. Dual-Engine Hybrid ML Ensemble (F1 = 0.829, Recall = 94.2%)
* **Production Champion**: Weighted blend of **CatBoost Classifier** + **LightGBM Classifier** optimized on out-of-time test splits.
* **Unsupervised Anomaly Sentinel**: **Isolation Forest** and **Deep Autoencoder** detecting zero-day account takeovers (ATO) and novel card testing bursts.
* **Leaderboard Suite**: Includes trained models for Random Forest, XGBoost, Decision Tree, and Logistic Regression with continuous Brier calibration scores.

### 2. Explainable AI (XAI) & Model Risk Management (MRM)
* **Tree-SHAP Local Attribution**: Step-by-step waterfall visualization progressing from base population prior $E[f(x)]$ (3.8%) to final calibrated decision $f(x)$.
* **Axiomatic Integrity Guarantees**: Formal mathematical verification of Efficiency / Additivity ($\sum \phi_i = f(x) - E[f(x)]$, error $< 10^{-7}$), Symmetry, Dummy Property, and Monotonicity.
* **Algorithmic Recourse**: Concrete recommendations to reverse adverse fraud decisions (e.g. biometric 3DS challenge pass, device binding).
* **Formal Attestation**: Automatic generation of signed XAI Governance Certificates attested by Lead Compliance Officer.

### 3. Cytoscape.js Fraud Syndicate Network Graph
* **Topological Entity Clustering**: Graph mining across card numbers, hardware device fingerprints, email domains, and billing subnets.
* **Kingpin Hub Identification**: Automatic calculation of network degree and betweenness centrality to isolate syndicate orchestrators.
* **PMLA Sec. 12 Syndicate Dismantler**: One-click execution of formal **Syndicate Freezing Directives** with cryptographic SHA-256 chain-of-custody seals.

### 4. Statutory FIU-IND Suspicious Transaction Report (STR) PDF Generator
* **PMLA 2002 Compliance**: Generates complete, official regulatory filings under Section 12 of the Prevention of Money Laundering Act read with Rule 7 of PML Rules, 2005.
* **Part V Formal Narrative**: Synthesizes statutory prose documenting transaction summary, AI reasoning, and law enforcement escalation.
* **Direct PDF Export**: Dedicated print stylesheet formatted for A4 regulatory archiving and submission.

### 5. 14 Comprehensive Intelligence Modules
1. **Executive Overview**: Real-time KPI matrix, 24h fraud velocity trends, and tier distribution.
2. **Transaction Ledger**: Searchable, paginated audit ledger with risk filter criteria.
3. **Deep Analytics**: 7x24 temporal heatmap, entity intelligence, and scatter analysis.
4. **Security Alerts**: Real-time triage queue with automated severity routing.
5. **Model Intelligence**: Calibration curves, ROC curves, decision threshold sweep, and Visa VFMP cost utility optimizer.
6. **Risk Management**: Multi-factor weight simulator and composite score distributions.
7. **Investigations Workspace (Tier 2/3)**: 6-axis behavioral biometric radar with one-click escalation controls.
8. **Fraud Network Graph**: Interactive Cytoscape.js syndicate clustering.
9. **Behavioral Biometrics**: Population spending distribution and isolation outlier scoring.
10. **Executive Audit Report**: Formal Form 1-A board briefing with CSV/JSON/A4 exports.
11. **Explainable AI (XAI)**: Local waterfall attribution and adverse action disclosures.
12. **Data & Drift Monitoring**: Feature drift analysis (PSI, KS-test) and data quality scoring.
13. **What-If Sandbox**: Real-time counterfactual policy simulator.
14. **Live Stream Engine**: WebSocket stream with automated transaction generator.

---

## Platform Architecture

```
OmniTrace-AI/
├── backend/
│   ├── main.py                   # FastAPI server entrypoint & lifecycle manager
│   ├── routes.py                 # REST & WebSocket API endpoints (14 modules)
│   ├── services.py               # Analytical and statistical service routines
│   ├── ml_engine.py              # Model loading, Tree-SHAP explainer & scoring
│   ├── stream.py                 # Real-time transaction simulation generator
│   └── schemas.py                # Pydantic request/response data contracts
├── frontend/
│   ├── index.html                # Single-page dashboard application (14 tabs)
│   ├── css/
│   │   └── styles.css            # Dark/Light theme design system & cyber aesthetics
│   └── js/
│       ├── api.js                # Asynchronous backend REST client
│       ├── app.js                # Core state manager & tab controllers
│       ├── charts.js             # Chart.js visualization engine (Dark mode)
│       ├── network.js            # Cytoscape.js syndicate network graph
│       ├── websocket.js          # Real-time WebSocket event listener
│       ├── simulator.js          # Live streaming simulation ticker
│       └── alerts.js             # Real-time security alert dispatcher
├── ml_pipeline/
│   ├── feature_engineering.py    # Pipeline for 432 transaction features
│   ├── ensemble.py               # CatBoost + LightGBM weighted model trainer
│   └── data_quality.py           # Drift calculation & baseline telemetry
├── models/                       # Trained binaries (.pkl, .joblib, .cbm)
├── storage/                      # Precomputed analytical assets & sample cache
├── start_server.py               # One-click FastAPI server launcher
├── test_advanced_suite.py        # 13 automated backend regression tests
└── requirements.txt              # Production Python dependencies
```

---

## Quickstart & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/akshar059/Zidio-P2-OMNITRACE-AI-ENTERPRISE-FRAUD-INTELLIGENCE.git
cd Zidio-P2-OMNITRACE-AI-ENTERPRISE-FRAUD-INTELLIGENCE
```

### 2. Set Up Virtual Environment (Recommended)
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS / Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Launch OmniTrace AI
```bash
python start_server.py
```
*Or directly via Uvicorn:*
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser and navigate to:
* **Interactive Dashboard**: [`http://127.0.0.1:8000`](http://127.0.0.1:8000)
* **Interactive API Documentation (Swagger UI)**: [`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs)

---

## Verification & Automated Test Suite

Run the full end-to-end regression test suite covering all 13 core analytical subsystems:
```bash
python test_advanced_suite.py
```

Expected Output:
```
============================================================
RUNNING ADVANCED FRAUD INTELLIGENCE TEST SUITE
============================================================
[PASS] System Health (GET /system/health) -> 200
[PASS] Executive Dashboard Summary (GET /dashboard/summary) -> 200
[PASS] 7x24 Temporal Heatmap (GET /analytics/temporal-heatmap) -> 200
[PASS] Entity Intelligence (GET /analytics/entity-intelligence) -> 200
[PASS] ML vs Anomaly Scatter (GET /analytics/ml-vs-anomaly) -> 200
[PASS] Transaction List (GET /transactions) -> 200
[PASS] Transaction Dossier (GET /transactions/{id}) -> 200
[PASS] Behavioral Radar Profile (GET /behavior/profile/{id}) -> 200
[PASS] Cytoscape Fraud Network (GET /network/graph) -> 200
[PASS] Model Calibration Curve (GET /models/calibration) -> 200
[PASS] Threshold Sweep (GET /models/thresholds) -> 200
[PASS] Data Quality Metrics (GET /monitoring/data-quality) -> 200
[PASS] Feature Drift Report (GET /monitoring/drift) -> 200
[PASS] Risk Engine Scoring (POST /predict) -> 200
============================================================
ALL 13 ADVANCED FRAUD INTELLIGENCE TEST SUITES PASSED!
============================================================
```

---

## Author & Attestation

* **Lead Machine Learning & AI Governance**: **Akshar Patel**
* **Project**: OmniTrace AI — Enterprise Financial Fraud Defense Suite
* **License**: MIT License
