"""
Pydantic Schemas for FastAPI Backend
Defines request and response data models for fraud scoring, transactions, and alerts.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TransactionInput(BaseModel):
    TransactionID: Optional[str] = Field(default="TX-SIM-001", description="Unique transaction ID")
    TransactionAmt: float = Field(..., gt=0, description="Transaction amount in USD", example=250.75)
    ProductCD: str = Field(default="W", description="Product code (W, C, R, H, S)", example="W")
    card1: Optional[int] = Field(default=10000, description="Card issue number / bin", example=13550)
    card4: str = Field(default="visa", description="Card brand (visa, mastercard, discover, american express)", example="visa")
    card6: str = Field(default="credit", description="Card type (credit, debit)", example="credit")
    P_emaildomain: str = Field(default="gmail.com", description="Purchaser email domain", example="gmail.com")
    R_emaildomain: Optional[str] = Field(default="gmail.com", description="Recipient email domain", example="gmail.com")
    DeviceType: Optional[str] = Field(default="desktop", description="Device type (desktop, mobile)", example="desktop")
    DeviceInfo: Optional[str] = Field(default="Windows", description="Device / OS information", example="Windows")
    card_velocity_24h: Optional[int] = Field(default=1, description="Transactions on this card in last 24h", example=2)
    device_unique_cards: Optional[int] = Field(default=1, description="Number of distinct cards on this device", example=1)
    hour: Optional[int] = Field(default=14, ge=0, le=23, description="Hour of the day (0-23)", example=14)
    addr1: Optional[float] = Field(default=299.0, description="Billing region / zipcode", example=299.0)
    # Enterprise Payment & Identity Verification Signals
    cvv_result: Optional[str] = Field(default="M", description="CVV match: M (Match), N (Mismatch), P (Not Provided)", example="M")
    avs_result: Optional[str] = Field(default="Y", description="AVS check: Y (Full Match), Z (Postal Match), A (Street Match), N (No Match), U (Unavailable)", example="Y")
    three_ds_status: Optional[str] = Field(default="FRICTIONLESS", description="3DS status: FRICTIONLESS, CHALLENGE_SUCCESS, CHALLENGE_FAILED, NOT_ENROLLED", example="FRICTIONLESS")
    ip_country: Optional[str] = Field(default="US", description="IP origin country code", example="US")
    billing_country: Optional[str] = Field(default="US", description="Billing country code", example="US")
    shipping_country: Optional[str] = Field(default="US", description="Shipping country code", example="US")
    is_vpn_proxy: Optional[bool] = Field(default=False, description="Tor / VPN / Anonymous Proxy flag", example=False)
    velocity_1h: Optional[int] = Field(default=1, description="Card attempts in last 1 hour", example=1)
    account_age_days: Optional[int] = Field(default=180, description="Customer account age in days", example=180)


class RiskFactor(BaseModel):
    feature: str
    contribution: float
    value: float
    direction: str


class ExplanationResponse(BaseModel):
    risk_factors: List[RiskFactor] = []
    mitigating_factors: List[RiskFactor] = []
    human_reasons: List[str] = []


class PredictionResponse(BaseModel):
    transaction_id: str
    amount: float
    fraud_probability: float
    anomaly_score: float
    rule_score: float
    risk_score: int
    risk_level: str
    action: str
    prediction: str
    triggered_rules: List[str] = []
    risk_factors: Optional[Dict[str, float]] = None
    risk_decomposition: Optional[Dict[str, float]] = None
    behavior_profile: Optional[Dict[str, Any]] = None
    policy_recommendation: Optional[Dict[str, Any]] = None
    financial_exposure: Optional[Dict[str, Any]] = None
    explanation: ExplanationResponse


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., description="New alert status: NEW, UNDER REVIEW, CONFIRMED FRAUD, FALSE POSITIVE, RESOLVED")


class SimulationControl(BaseModel):
    interval_seconds: float = Field(default=1.5, ge=0.2, le=10.0, description="Seconds between simulated transactions")
    active: bool = Field(default=True, description="Simulation running state")


class CounterfactualRequest(BaseModel):
    baseline: Dict[str, Any] = Field(..., description="Original baseline transaction data")
    perturbations: Dict[str, Any] = Field(..., description="Altered feature adjustments to test counterfactual impact")


class CounterfactualDelta(BaseModel):
    feature: str
    baseline_value: Any
    perturbed_value: Any
    score_impact_points: int
    direction: str
    narrative: str


class CounterfactualResponse(BaseModel):
    baseline_risk_score: int
    counterfactual_risk_score: int
    current_score: Optional[int] = None
    points_to_approval: Optional[int] = None
    score_delta: int
    baseline_action: str
    counterfactual_action: str
    catboost_probability: float
    lightgbm_probability: float
    ensemble_probability: float
    anomaly_score: float
    rule_score: float
    risk_level: str
    counterfactual_deltas: List[CounterfactualDelta]
    minimum_path_to_approval: List[Any] = Field(default_factory=list)
    flip_achieved: bool
    status_summary: str


class SyndicateQuarantineRequest(BaseModel):
    cluster_id: str = Field(..., description="ID of the syndicate ring to quarantine, e.g. RING-01")
    officer_id: Optional[str] = Field(default="PO-ARGUS-702", description="Authorizing compliance officer identifier")
    rationale: Optional[str] = Field(default="Coordinated multi-card shared device syndicate detected under PMLA Section 12", description="Legal/Forensic rationale for freezing order")


class SyndicateQuarantineResponse(BaseModel):
    cluster_id: str
    cluster_name: Optional[str] = None
    status: str
    quarantined_at: str
    kingpin_node: Optional[str] = None
    capital_at_risk_inr: Optional[float] = None
    directing_officer_id: Optional[str] = None
    statutory_rationale: Optional[str] = None
    quarantined_devices: List[str] = Field(default_factory=list)
    quarantined_cards: List[str] = Field(default_factory=list)
    quarantined_emails: List[str] = Field(default_factory=list)
    quarantined_nodes: List[str] = Field(default_factory=list)
    quarantined_nodes_count: int
    regulatory_reference: str
    directive_reference: Optional[str] = None
    audit_hash: str
    audit_hash_sha256: Optional[str] = None
    directive_summary: str

