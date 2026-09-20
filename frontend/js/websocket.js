/**
 * ArgusGuard AI: Real-Time WebSocket Streaming Client
 * Connects to live transaction feed, pushes dynamic updates, and triggers alerts.
 */

const FraudSocket = {
  ws: null,
  reconnectTimer: null,
  isLive: false,
  soundEnabled: true,
  txCount: 0,
  fraudCount: 0,
  audioCtx: null,

  init() {
    this.connect();
    this.initAudio();
  },

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.audioCtx = new AudioContext();
    } catch (e) {
      console.warn("Web Audio not supported", e);
    }
  },

  playAlertSound() {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // High alert tone
      osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.2);
    } catch (e) {
      // Audio context might be blocked prior to user interaction
    }
  },

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || '127.0.0.1:8000';
    const wsUrl = `${protocol}//${host}/api/ws/live`;

    console.log(`[WS] Connecting to ${wsUrl}...`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("[WS] Live streaming transport established.");
      clearTimeout(this.reconnectTimer);
      this.setStreamState(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.handleMessage(payload);
      } catch (err) {
        console.error("[WS] Message parsing error:", err);
      }
    };

    this.ws.onclose = () => {
      console.warn("[WS] Disconnected. Retrying in 2s...");
      const indicator = document.getElementById('liveStatusPill');
      const label = document.getElementById('liveStatusLabel');
      const simPill = document.getElementById('simStatusPill');
      if (indicator) {
        indicator.textContent = 'CONNECTING...';
        indicator.style.color = 'var(--risk-med)';
      }
      if (label) label.textContent = 'CONNECTING...';
      this.reconnectTimer = setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error("[WS] Error:", err);
      this.ws.close();
    };
  },

  setStreamState(isStreaming) {
    this.isLive = isStreaming;
    const indicator = document.getElementById('liveStatusPill');
    const label = document.getElementById('liveStatusLabel');
    const simPill = document.getElementById('simStatusPill');
    const toggleBtn = document.getElementById('simToggleBtn');

    if (isStreaming) {
      if (indicator) {
        indicator.textContent = 'STREAM LIVE';
        indicator.style.color = 'var(--risk-low)';
        indicator.classList.add('active');
      }
      if (label) label.textContent = 'STREAM LIVE';
      if (simPill) simPill.classList.add('active');
      if (toggleBtn) {
        toggleBtn.innerHTML = '<span style="width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block; box-shadow: 0 0 8px #22c55e;"></span> Stream Active';
        toggleBtn.className = 'btn-sm btn-danger';
        toggleBtn.title = 'Autonomous stream is running. Click to pause.';
      }
      if (window.App) window.App.simActive = true;
    } else {
      if (indicator) {
        indicator.textContent = 'PAUSED';
        indicator.style.color = 'var(--cyan)';
        indicator.classList.remove('active');
      }
      if (label) label.textContent = 'STREAM PAUSED';
      if (simPill) simPill.classList.remove('active');
      if (toggleBtn) {
        toggleBtn.innerHTML = '<span style="width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span> Resume Stream';
        toggleBtn.className = 'btn-sm btn-primary';
        toggleBtn.title = 'Click to resume live stream';
      }
      if (window.App) window.App.simActive = false;
    }
  },

  handleMessage(msg) {
    if (msg.type === 'SYSTEM_STATUS' || msg.type === 'SIM_STATUS') {
      this.setStreamState(!!msg.is_running);
    } else if (msg.type === 'TRANSACTION') {
      this.setStreamState(true);
      this.onTransaction(msg.data);
    } else if (msg.type === 'NEW_ALERT') {
      this.onAlert(msg.alert);
    }
  },

  onTransaction(tx) {
    this.txCount++;
    const isFraud = (tx.prediction === 'FRAUD' || tx.risk_level === 'CRITICAL' || tx.risk_level === 'HIGH');
    const amt = Number(tx.amount || 0);
    if (isFraud) {
      this.fraudCount++;
      this.totalExposure = (this.totalExposure || 0) + amt;
    }

    // Ensure status reflects live data reception
    const indicator = document.getElementById('liveStatusPill');
    if (indicator && indicator.textContent !== 'STREAM LIVE') {
      indicator.textContent = 'STREAM LIVE';
      indicator.style.color = 'var(--risk-low)';
      indicator.classList.add('active');
    }

    // Update live counter badges in header / views
    const countEl = document.getElementById('liveStreamTxCount');
    if (countEl) countEl.textContent = this.txCount.toLocaleString();

    const fraudEl = document.getElementById('liveStreamFraudCount');
    if (fraudEl) fraudEl.textContent = this.fraudCount.toLocaleString();

    const expEl = document.getElementById('liveStreamAmountAtRisk');
    if (expEl) {
      expEl.textContent = `₹${(this.totalExposure || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // 1. Prepend row to Live Stream Feed Table (Tab 02)
    const tbody = document.getElementById('liveFeedTableBody');
    if (tbody) {
      const tr = document.createElement('tr');
      tr.className = 'new-entry';
      tr.onclick = () => window.App?.showTransactionModal(tx.transaction_id);

      const timeStr = tx.stream_time || new Date().toLocaleTimeString();
      tr.innerHTML = `
        <td class="mono">${timeStr}</td>
        <td class="mono font-semibold">${tx.transaction_id || 'TX-LIVE'}</td>
        <td>₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${tx.card4 || 'visa'} / ${tx.product_cd || 'W'}</td>
        <td class="mono">${(Number(tx.fraud_probability || 0) * 100).toFixed(1)}%</td>
        <td class="mono font-bold">${tx.risk_score || 0}</td>
        <td><span class="risk-pill ${tx.risk_level}">${tx.risk_level}</span></td>
        <td><span class="status-tag ${tx.prediction === 'FRAUD' ? 'text-red' : 'text-green'}">${tx.prediction}</span></td>
      `;

      tbody.insertBefore(tr, tbody.firstChild);
      while (tbody.children.length > 50) {
        tbody.removeChild(tbody.lastChild);
      }
    }

    // 2. Dynamic Update: Executive Dashboard (Tab 01)
    const kpiTx = document.getElementById('kpiTotalTx');
    if (kpiTx) {
      let currentVal = parseInt(kpiTx.textContent.replace(/,/g, ''), 10);
      if (isNaN(currentVal)) currentVal = 1000;
      kpiTx.textContent = (currentVal + 1).toLocaleString();
    }

    const kpiFraud = document.getElementById('kpiFraudDetected');
    const kpiRate = document.getElementById('kpiFraudRate');
    const kpiExp = document.getElementById('kpiAmountAtRisk');
    const kpiHighCrit = document.getElementById('kpiHighCritical');
    const kpiAvgRisk = document.getElementById('kpiAvgRisk');

    if (tx.risk_level === 'HIGH' || tx.risk_level === 'CRITICAL') {
      if (kpiHighCrit) {
        let curCrit = parseInt(kpiHighCrit.textContent.replace(/,/g, ''), 10);
        if (isNaN(curCrit)) curCrit = 200;
        kpiHighCrit.textContent = (curCrit + 1).toLocaleString();
      }
    }

    if (kpiAvgRisk && tx.risk_score) {
      let curAvg = parseFloat(kpiAvgRisk.textContent);
      if (isNaN(curAvg)) curAvg = 28.5;
      const newAvg = (curAvg * 0.98) + (Number(tx.risk_score) * 0.02);
      kpiAvgRisk.textContent = newAvg.toFixed(1);
    }

    if (isFraud) {
      if (kpiFraud) {
        let currentFraud = parseInt(kpiFraud.textContent.replace(/,/g, ''), 10);
        if (isNaN(currentFraud)) currentFraud = 50;
        kpiFraud.textContent = (currentFraud + 1).toLocaleString();

        if (kpiTx && kpiRate) {
          const total = parseInt(kpiTx.textContent.replace(/,/g, ''), 10) || 1001;
          kpiRate.textContent = `${((currentFraud + 1) / total * 100).toFixed(2)}%`;
        }
      }
      if (kpiExp) {
        let rawExp = parseFloat(kpiExp.textContent.replace(/[₹,]/g, ''));
        if (isNaN(rawExp)) rawExp = 64103.88;
        kpiExp.textContent = `₹${(rawExp + amt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    // 2b. Dynamic Live Charts Update
    if (window.FraudCharts) {
      FraudCharts.incrementLiveTrend(tx);
      FraudCharts.incrementLiveDonut(tx);
      FraudCharts.incrementLiveHistogram(tx);
      if (typeof FraudCharts.incrementLiveTxCharts === 'function') {
        FraudCharts.incrementLiveTxCharts(tx);
      }
      if (typeof FraudCharts.updateTemporalHeatmapLive === 'function') {
        FraudCharts.updateTemporalHeatmapLive(tx);
      }
    }

    // 2c. Dynamic Live Fraud Network Update
    if (isFraud && window.FraudNetwork && typeof FraudNetwork.addLiveEntity === 'function') {
      FraudNetwork.addLiveEntity(tx);
    }

    // 2d. Dynamic Live Investigations Case Queue Update (Tab 07)
    if (isFraud && window.App && typeof window.App.prependInvestigationCase === 'function') {
      window.App.prependInvestigationCase(tx);
    }

    // 3. Dynamic Update: Transactions Ledger (Tab 04)
    const txTbody = document.getElementById('txTableBody');
    if (txTbody) {
      const tr = document.createElement('tr');
      tr.className = 'new-entry';
      tr.onclick = () => window.App?.showTransactionModal(tx.transaction_id);
      tr.innerHTML = `
        <td class="mono font-semibold" style="color: var(--cyan);">${tx.transaction_id || 'TX-LIVE'}</td>
        <td class="font-bold">₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${tx.card4 || 'visa'} / ${tx.card6 || 'credit'}</td>
        <td>${tx.P_emaildomain || tx.p_email || 'anonymous.com'}</td>
        <td class="mono">${(Number(tx.fraud_probability || 0) * 100).toFixed(1)}%</td>
        <td class="mono font-bold">${tx.risk_score || 0}</td>
        <td><span class="risk-pill ${tx.risk_level}">${tx.risk_level}</span></td>
        <td><span class="status-tag ${tx.prediction === 'FRAUD' ? 'text-red' : 'text-green'}">${tx.action || 'FLAG'}</span></td>
      `;
      txTbody.insertBefore(tr, txTbody.firstChild);
      while (txTbody.children.length > 50) {
        txTbody.removeChild(txTbody.lastChild);
      }
    }

    // 4. Dynamic Update: Executive Reports & Audit Export (Tab 14)
    const repTx = document.getElementById('reportKpiTotalTx');
    if (repTx) {
      let cur = parseInt(repTx.textContent.replace(/,/g, ''), 10);
      if (!isNaN(cur)) repTx.textContent = (cur + 1).toLocaleString();
    }

    if (isFraud) {
      const repExp = document.getElementById('reportKpiExposure');
      if (repExp) {
        let curExp = parseFloat(repExp.textContent.replace(/[₹,]/g, ''));
        if (isNaN(curExp)) curExp = 64103.88;
        const newExp = curExp + amt;
        repExp.textContent = `₹${newExp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const briefExp = document.getElementById('reportBriefingExposure');
        if (briefExp) briefExp.textContent = `₹${newExp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      const repCases = document.getElementById('reportKpiCasesCount');
      if (repCases) {
        let curCases = parseInt(repCases.textContent, 10);
        if (isNaN(curCases)) curCases = 50;
        repCases.textContent = `${curCases + 1} Logged`;
        const briefCases = document.getElementById('reportBriefingCases');
        if (briefCases) briefCases.textContent = (curCases + 1).toString();
      }

      const repTbody = document.getElementById('reportTableBody');
      if (repTbody) {
        const tr = document.createElement('tr');
        tr.className = 'new-entry';
        tr.innerHTML = `
          <td class="mono font-bold" style="color: var(--cyan);">${tx.transaction_id}</td>
          <td class="font-bold">₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${tx.card || (tx.card4 + ' (' + (tx.card6 || 'credit') + ')')}</td>
          <td>${tx.P_emaildomain || tx.p_email || 'anonymous.com'}</td>
          <td class="mono font-bold">${tx.risk_score}</td>
          <td><span class="risk-pill ${tx.risk_level}">${tx.risk_level}</span></td>
          <td class="mono">${Number(tx.anomaly_score || 0.65).toFixed(2)}</td>
          <td style="font-size: 11px; color: var(--text-muted);">${tx.primary_trigger || 'Velocity Surge & Model Consensus'}</td>
        `;
        repTbody.insertBefore(tr, repTbody.firstChild);
        while (repTbody.children.length > 50) {
          repTbody.removeChild(repTbody.lastChild);
        }
      }

      // Keep window.App.reportDataCache updated for printouts
      if (window.App) {
        if (!window.App.reportDataCache) {
          window.App.reportDataCache = { top_flagged_fraud_cases: [] };
        }
        if (!window.App.reportDataCache.top_flagged_fraud_cases) {
          window.App.reportDataCache.top_flagged_fraud_cases = [];
        }
        window.App.reportDataCache.top_flagged_fraud_cases.unshift({
          transaction_id: tx.transaction_id,
          amount: amt,
          card: tx.card || `${tx.card4} (${tx.card6 || 'credit'})`,
          email_domain: tx.P_emaildomain || tx.p_email || 'anonymous.com',
          risk_score: tx.risk_score,
          risk_level: tx.risk_level,
          anomaly_score: tx.anomaly_score || 0.65,
          primary_trigger: tx.primary_trigger || 'Velocity Burst & Model Consensus'
        });
      }
    }
  },

  onAlert(alert) {
    this.playAlertSound();
    this.showToast(alert);

    // Increment Alert Nav Badge
    const badge = document.getElementById('alertNavBadge');
    if (badge) {
      const current = parseInt(badge.textContent || '0', 10);
      badge.textContent = (current + 1).toString();
      badge.style.display = 'inline-block';
    }

    // Prepend to Alert Center table if active
    if (window.AlertsManager) {
      window.AlertsManager.prependAlert(alert);
    }
  },

  showToast(alert) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    if (window.App) {
      window.App.recentAlerts = window.App.recentAlerts || {};
      window.App.recentAlerts[alert.transaction_id] = alert;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <span class="risk-pill ${alert.risk_level}" style="font-size: 10px; padding: 2px 8px;">${alert.risk_level} ALERT</span>
          <span style="font-size: 10px; color: var(--text-dim);">${new Date().toLocaleTimeString()}</span>
        </div>
        <div style="font-weight: 700; font-size: 13px; color: #ffffff;">${alert.transaction_id} — ₹${Number(alert.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">${alert.reason || 'High anomaly indicator'}</div>
      </div>
      <button class="btn-sm btn-secondary inspect-btn">Inspect</button>
    `;

    const inspectBtn = toast.querySelector('.inspect-btn');
    if (inspectBtn) {
      inspectBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.App && window.App.showTransactionModal) {
          window.App.showTransactionModal(alert.transaction_id);
        }
      };
    }

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 8000);
  }
};
