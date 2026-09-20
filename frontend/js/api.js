/**
 * ArgusGuard AI: Frontend API Client
 * Centralized fetch helper for FastAPI REST endpoints.
 */

const API = {
  baseUrl: '/api',

  async getHealth() {
    const res = await fetch(`${this.baseUrl}/system/health`);
    return await res.json();
  },

  async getSummary() {
    const res = await fetch(`${this.baseUrl}/dashboard/summary`);
    return await res.json();
  },

  async getTransactions(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.page_size) query.set('page_size', params.page_size);
    if (params.search) query.set('search', params.search);
    if (params.risk_level) query.set('risk_level', params.risk_level);
    if (params.prediction) query.set('prediction', params.prediction);
    if (params.min_amount) query.set('min_amount', params.min_amount);
    if (params.max_amount) query.set('max_amount', params.max_amount);
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_order) query.set('sort_order', params.sort_order);

    const res = await fetch(`${this.baseUrl}/transactions?${query.toString()}`);
    return await res.json();
  },

  async getTransactionsStats() {
    const res = await fetch(`${this.baseUrl}/transactions/stats`);
    return await res.json();
  },

  async getTransactionDetails(txId) {
    const res = await fetch(`${this.baseUrl}/transactions/${encodeURIComponent(txId)}`);
    if (!res.ok) throw new Error('Transaction not found');
    return await res.json();
  },

  async predict(transactionData) {
    const res = await fetch(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData)
    });
    if (!res.ok) throw new Error('Prediction failed');
    return await res.json();
  },

  async getAlerts() {
    const res = await fetch(`${this.baseUrl}/alerts`);
    return await res.json();
  },

  async updateAlertStatus(alertId, newStatus) {
    const res = await fetch(`${this.baseUrl}/alerts/${encodeURIComponent(alertId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error('Failed to update alert');
    return await res.json();
  },

  async getModelPerformance() {
    const res = await fetch(`${this.baseUrl}/models/performance`);
    return await res.json();
  },

  async getRiskDistribution() {
    const res = await fetch(`${this.baseUrl}/analytics/risk-distribution`);
    return await res.json();
  },

  async getFraudTrends() {
    const res = await fetch(`${this.baseUrl}/analytics/fraud-trends`);
    return await res.json();
  },

  async startSimulation() {
    const res = await fetch(`${this.baseUrl}/simulation/start`, { method: 'POST' });
    return await res.json();
  },

  async stopSimulation() {
    const res = await fetch(`${this.baseUrl}/simulation/stop`, { method: 'POST' });
    return await res.json();
  },

  async getSimulationStatus() {
    const res = await fetch(`${this.baseUrl}/simulation/status`);
    return await res.json();
  },

  async getTemporalHeatmap() {
    const res = await fetch(`${this.baseUrl}/analytics/temporal-heatmap`);
    return await res.json();
  },

  async getEntityIntelligence() {
    const res = await fetch(`${this.baseUrl}/analytics/entity-intelligence`);
    return await res.json();
  },

  async getMLvsAnomaly() {
    const res = await fetch(`${this.baseUrl}/analytics/ml-vs-anomaly`);
    return await res.json();
  },

  async getAnalyticsDeepDive() {
    const res = await fetch(`${this.baseUrl}/analytics/deep-dive`);
    return await res.json();
  },

  async getDataQuality() {
    const res = await fetch(`${this.baseUrl}/monitoring/data-quality`);
    return await res.json();
  },

  async getDriftReport() {
    const res = await fetch(`${this.baseUrl}/monitoring/drift`);
    return await res.json();
  },

  async recalculateDrift() {
    const res = await fetch(`${this.baseUrl}/monitoring/drift/recalculate`, { method: 'POST' });
    return await res.json();
  },

  async simulateDriftSurge() {
    const res = await fetch(`${this.baseUrl}/monitoring/drift/simulate-surge`, { method: 'POST' });
    return await res.json();
  },

  async resetDrift() {
    const res = await fetch(`${this.baseUrl}/monitoring/drift/reset`, { method: 'POST' });
    return await res.json();
  },

  async getCalibration() {
    const res = await fetch(`${this.baseUrl}/models/calibration`);
    return await res.json();
  },

  async getThresholds() {
    const res = await fetch(`${this.baseUrl}/models/thresholds`);
    return await res.json();
  },

  async getBehaviorProfile(txId) {
    const res = await fetch(`${this.baseUrl}/behavior/profile/${encodeURIComponent(txId)}`);
    return await res.json();
  },

  async getNetworkGraph() {
    const res = await fetch(`${this.baseUrl}/network/graph`);
    return await res.json();
  },

  async getNetworkClusters() {
    const res = await fetch(`${this.baseUrl}/network/clusters`);
    return await res.json();
  },

  async quarantineSyndicateRing(clusterId, rationale = '') {
    const res = await fetch(`${this.baseUrl}/network/quarantine-ring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cluster_id: clusterId,
        officer_id: 'Lead Officer Akshar Patel (FinTech AI Governance)',
        rationale: rationale || 'Statutory preventive freeze under PMLA 2002 Section 12 & PML Rules 2005.'
      })
    });
    return await res.json();
  },

  async getRiskAnalytics() {
    const res = await fetch(`${this.baseUrl}/risk/analytics`);
    return await res.json();
  },

  async getBehavioralAnalytics() {
    const res = await fetch(`${this.baseUrl}/behavioral/analytics`);
    return await res.json();
  },

  async getGlobalExplainability() {
    const res = await fetch(`${this.baseUrl}/explainability/global`);
    return await res.json();
  },

  async getExplainabilityRecentCases() {
    const res = await fetch(`${this.baseUrl}/explainability/recent-cases`);
    return await res.json();
  },

  async getTransactionExplainability(txId) {
    const res = await fetch(`${this.baseUrl}/explainability/transaction/${encodeURIComponent(txId)}`);
    return await res.json();
  },

  async getReportsSummary() {
    const res = await fetch(`${this.baseUrl}/reports/summary`);
    return await res.json();
  },

  async getCostUtility(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${this.baseUrl}/models/cost-utility?${query}`);
    return await res.json();
  },

  async getFinCENSAR(txId) {
    const res = await fetch(`${this.baseUrl}/compliance/sar/${encodeURIComponent(txId)}`);
    return await res.json();
  },

  async injectAttackBurst(scenario = 'carding', count = 15) {
    const res = await fetch(`${this.baseUrl}/simulator/attack-burst`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, count })
    });
    return await res.json();
  },

  async simulateCounterfactual(baseline, perturbations) {
    const res = await fetch(`${this.baseUrl}/counterfactual/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseline, perturbations })
    });
    if (!res.ok) throw new Error('Counterfactual simulation failed');
    return await res.json();
  },

  async quarantineSyndicateRing(clusterId, rationale) {
    const res = await fetch(`${this.baseUrl}/network/quarantine-ring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cluster_id: clusterId,
        officer_id: "PO-ARGUS-702",
        rationale: rationale || "Coordinated multi-card shared device syndicate detected under PMLA Section 12"
      })
    });
    if (!res.ok) throw new Error('Syndicate quarantine directive failed');
    return await res.json();
  }
};
