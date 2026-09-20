/**
 * ArgusGuard AI: Chart.js Visualizations & Interactive Analytics
 * High-performance dark mode charts with glowing gradients, heatmaps, radar profiles, and calibration curves.
 */

const FraudCharts = {
  instances: {},

  currentTheme: 'dark',

  initGlobalDefaults(theme = 'dark') {
    if (typeof Chart === 'undefined') return;
    this.currentTheme = theme;
    const isLight = theme === 'light';

    Chart.defaults.color = isLight ? '#475569' : '#94a3b8';
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.tooltip.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(12, 18, 34, 0.95)';
    Chart.defaults.plugins.tooltip.titleColor = isLight ? '#0f172a' : '#ffffff';
    Chart.defaults.plugins.tooltip.bodyColor = isLight ? '#334155' : '#cbd5e1';
    Chart.defaults.plugins.tooltip.borderColor = isLight ? 'rgba(203, 213, 225, 0.8)' : 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  },

  updateTheme(theme = 'dark') {
    this.initGlobalDefaults(theme);
    const isLight = theme === 'light';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.05)';
    const tickColor = isLight ? '#475569' : '#94a3b8';

    Object.values(this.instances).forEach(chart => {
      if (!chart || !chart.options) return;
      if (chart.options.scales) {
        Object.values(chart.options.scales).forEach(scale => {
          if (scale.grid) scale.grid.color = gridColor;
          if (scale.ticks) scale.ticks.color = tickColor;
          if (scale.pointLabels) scale.pointLabels.color = tickColor;
          if (scale.angleLines) scale.angleLines.color = gridColor;
        });
      }
      chart.update('none');
    });
  },

  renderMiniTrend(ctxId, trendsData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const hours = Object.keys(trendsData || {}).sort((a, b) => Number(a) - Number(b));
    const totals = hours.map(h => trendsData[h]?.total || 0);
    const frauds = hours.map(h => trendsData[h]?.fraud || 0);

    this.instances[ctxId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours.map(h => `${h}:00`),
        datasets: [
          {
            label: 'Total Transactions',
            data: totals,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 2
          },
          {
            label: 'Fraud Flagged',
            data: frauds,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Hour of Day (UTC 24-Hour Observation Window)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            }
          },
          y: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Transaction Volume & Fraud Interceptions (Count)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            }
          }
        }
      }
    });
  },

  renderRiskDonut(ctxId, tiersData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const tiers = tiersData || { LOW: 700, MEDIUM: 300, HIGH: 120, CRITICAL: 80 };
    this.instances[ctxId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Low Risk (0-30)', 'Medium Risk (31-60)', 'High Risk (61-80)', 'Critical Risk (81-100)'],
        datasets: [{
          data: [tiers.LOW || 0, tiers.MEDIUM || 0, tiers.HIGH || 0, tiers.CRITICAL || 0],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(249, 115, 22, 0.85)',
            'rgba(239, 68, 68, 0.9)'
          ],
          borderColor: 'rgba(12, 18, 34, 0.9)',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }
        },
        cutout: '68%'
      }
    });
  },

  renderRiskHistogram(ctxId, histogramData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const labels = histogramData?.labels || ["0-10", "11-20", "21-30", "31-40", "41-50", "51-60", "61-70", "71-80", "81-90", "91-100"];
    const counts = histogramData?.counts || [120, 250, 310, 180, 120, 95, 80, 60, 45, 30];

    const bgColors = counts.map((_, idx) => {
      if (idx < 3) return 'rgba(16, 185, 129, 0.7)';
      if (idx < 6) return 'rgba(245, 158, 11, 0.7)';
      if (idx < 8) return 'rgba(249, 115, 22, 0.8)';
      return 'rgba(239, 68, 68, 0.85)';
    });

    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Transaction Count',
          data: counts,
          backgroundColor: bgColors,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            grid: { display: false }, 
            title: { 
              display: true, 
              text: 'Composite Risk Score Range (0 – 100 Calibrated)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Transaction Frequency (Volume Count)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            }
          }
        }
      }
    });
  },

  // Helper: Smooth continuous multi-stop color grading for authentic fraud heatmap
  getHeatmapColor(rate) {
    const r = Number(rate) || 0;
    if (r <= 1.5) {
      // Baseline safe: Deep slate navy to subtle indigo
      const t = Math.min(1.0, Math.max(0.0, r / 1.5));
      const bgR = Math.round(20 + t * (45 - 20));
      const bgG = Math.round(28 + t * (40 - 28));
      const bgB = Math.round(48 + t * (85 - 48));
      const alpha = (0.7 + t * 0.2).toFixed(2);
      return {
        bg: `rgba(${bgR}, ${bgG}, ${bgB}, ${alpha})`,
        border: `rgba(99, 102, 241, ${(0.15 + t * 0.15).toFixed(2)})`,
        tier: 'LOW',
        tierLabel: 'Normal Baseline',
        tierColor: '#94a3b8',
        glow: 'none'
      };
    } else if (r <= 3.5) {
      // Low to Normal: Indigo to Soft Violet
      const t = Math.min(1.0, (r - 1.5) / 2.0);
      const bgR = Math.round(79 + t * (124 - 79));
      const bgG = Math.round(70 + t * (58 - 70));
      const bgB = Math.round(229 + t * (237 - 229));
      const alpha = (0.42 + t * 0.22).toFixed(2);
      return {
        bg: `rgba(${bgR}, ${bgG}, ${bgB}, ${alpha})`,
        border: `rgba(${bgR}, ${bgG}, ${bgB}, 0.55)`,
        tier: 'NORMAL',
        tierLabel: 'Standard Flow',
        tierColor: '#a78bfa',
        glow: 'none'
      };
    } else if (r <= 6.5) {
      // Elevated: Warm Amber to Orange
      const t = Math.min(1.0, (r - 3.5) / 3.0);
      const bgR = Math.round(245 + t * (234 - 245));
      const bgG = Math.round(158 + t * (88 - 158));
      const bgB = Math.round(11 + t * (12 - 11));
      const alpha = (0.65 + t * 0.18).toFixed(2);
      return {
        bg: `rgba(${bgR}, ${bgG}, ${bgB}, ${alpha})`,
        border: `rgba(245, 158, 11, 0.7)`,
        tier: 'ELEVATED',
        tierLabel: 'Elevated Risk',
        tierColor: '#fbbf24',
        glow: '0 0 6px rgba(245, 158, 11, 0.35)'
      };
    } else {
      // High Threat / Spike: Vivid Coral to Radiant Crimson
      const t = Math.min(1.0, (r - 6.5) / 4.0);
      const alpha = (0.85 + t * 0.12).toFixed(2);
      return {
        bg: `rgba(239, 68, 68, ${alpha})`,
        border: '#f87171',
        tier: 'CRITICAL',
        tierLabel: 'Critical Threat Spike',
        tierColor: '#f87171',
        glow: '0 0 10px rgba(239, 68, 68, 0.65)'
      };
    }
  },

  // 7x24 Day of Week x Hour of Day Heatmap Grid
  renderTemporalHeatmap(containerId, temporalData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const days = temporalData?.days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const matrix = temporalData?.matrix || [];

    // Determine current UTC live window for dynamic streaming highlight
    const now = new Date();
    const utcDayIdx = (now.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
    const utcHour = now.getUTCHours();
    const activeDayIdx = typeof temporalData?.current_day_idx === 'number' ? temporalData.current_day_idx : utcDayIdx;
    const activeHour = typeof temporalData?.current_hour === 'number' ? temporalData.current_hour : utcHour;

    // Update live badge text if element exists
    const badgeTextEl = document.getElementById('heatmapLiveBadgeText');
    if (badgeTextEl && days[activeDayIdx] !== undefined) {
      badgeTextEl.textContent = `Streaming Live: ${days[activeDayIdx]} ${String(activeHour).padStart(2, '0')}:00 UTC`;
    }

    let html = `<div class="heatmap-grid-container" id="heatmapGrid">`;
    
    // Header Row: 24 columns with 1-to-1 pixel alignment
    html += `<div class="heatmap-header-row"><div class="heatmap-day-label"></div>`;
    for (let h = 0; h < 24; h++) {
      if (h % 2 === 0) {
        html += `<div class="heatmap-hour-label">${h}:00</div>`;
      } else {
        html += `<div class="heatmap-hour-label" style="opacity: 0.3;">·</div>`;
      }
    }
    html += `</div>`;

    // 7 Rows (Mon to Sun)
    days.forEach((day, dIdx) => {
      html += `<div class="heatmap-row"><div class="heatmap-day-label">${day}</div>`;
      const rowData = matrix[dIdx] || [];
      
      for (let h = 0; h < 24; h++) {
        const cell = rowData[h] || { day, hour: h, total: 20, fraud: 0, fraud_rate: 0, avg_risk: 15 };
        const rate = Number(cell.fraud_rate) || 0;
        const col = this.getHeatmapColor(rate);
        const isLive = (dIdx === activeDayIdx && h === activeHour);
        const liveClass = isLive ? ' heatmap-cell-live' : '';
        const shadowStyle = col.glow !== 'none' ? `box-shadow: ${col.glow};` : '';

        html += `
          <div id="hcell-${dIdx}-${h}"
               class="heatmap-cell${liveClass}"
               style="background: ${col.bg}; border: 1px solid ${col.border}; ${shadowStyle}"
               data-day="${day}"
               data-day-idx="${dIdx}"
               data-hour="${h}"
               data-total="${cell.total || 0}"
               data-fraud="${cell.fraud || 0}"
               data-rate="${rate.toFixed(2)}"
               data-risk="${cell.avg_risk || 20}"
               data-tier="${col.tierLabel}"
               data-tier-color="${col.tierColor}"
               data-is-live="${isLive ? '1' : '0'}"
               onmouseenter="FraudCharts.showHeatmapTooltip(event, this)"
               onmousemove="FraudCharts.moveHeatmapTooltip(event)"
               onmouseleave="FraudCharts.hideHeatmapTooltip()">
          </div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;

    // Append floating custom tooltip container
    html += `<div id="heatmapFloatingTooltip" class="heatmap-tooltip"></div>`;

    container.innerHTML = html;
  },

  showHeatmapTooltip(event, el) {
    const tip = document.getElementById('heatmapFloatingTooltip');
    if (!tip) return;

    const day = el.getAttribute('data-day');
    const hour = parseInt(el.getAttribute('data-hour'), 10);
    const nextHour = (hour + 1) % 24;
    const total = parseInt(el.getAttribute('data-total'), 10).toLocaleString();
    const fraud = parseInt(el.getAttribute('data-fraud'), 10).toLocaleString();
    const rate = el.getAttribute('data-rate');
    const risk = el.getAttribute('data-risk');
    const tier = el.getAttribute('data-tier');
    const tierColor = el.getAttribute('data-tier-color');
    const isLive = el.getAttribute('data-is-live') === '1';

    tip.innerHTML = `
      <div class="heatmap-tooltip-title">
        <span>${day} ${String(hour).padStart(2, '0')}:00 – ${String(nextHour).padStart(2, '0')}:00 UTC</span>
        ${isLive ? '<span style="color:#06b6d4; font-size:9px; background:rgba(6,182,212,0.18); padding:1px 6px; border-radius:10px; border:1px solid #06b6d4;">LIVE</span>' : ''}
      </div>
      <div class="heatmap-tooltip-row">
        <span>Risk Assessment:</span>
        <span class="val" style="color:${tierColor};">${tier}</span>
      </div>
      <div class="heatmap-tooltip-row">
        <span>Empirical Fraud Rate:</span>
        <span class="val" style="color:#f87171;">${rate}%</span>
      </div>
      <div class="heatmap-tooltip-row">
        <span>Analyzed Volume:</span>
        <span class="val">${total} txs (${fraud} fraud)</span>
      </div>
      <div class="heatmap-tooltip-row">
        <span>Calibrated Risk Score:</span>
        <span class="val" style="color:#38bdf8;">${risk} / 100</span>
      </div>
      ${isLive ? '<div style="margin-top:5px; font-size:10px; color:#38bdf8; text-align:center; border-top:1px solid rgba(255,255,255,0.1); padding-top:3px;">● Ingesting Live Simulated Transactions</div>' : ''}
    `;
    tip.style.display = 'block';
    this.moveHeatmapTooltip(event);
  },

  moveHeatmapTooltip(event) {
    const tip = document.getElementById('heatmapFloatingTooltip');
    if (!tip || tip.style.display !== 'block') return;

    const wrapper = tip.parentElement;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    
    let x = event.clientX - rect.left + 14;
    let y = event.clientY - rect.top + 14;

    // Boundary check so tooltip doesn't overflow container
    if (x + 210 > rect.width) {
      x = event.clientX - rect.left - 215;
    }
    if (y + 130 > rect.height) {
      y = event.clientY - rect.top - 130;
    }

    tip.style.left = `${Math.max(6, x)}px`;
    tip.style.top = `${Math.max(6, y)}px`;
  },

  hideHeatmapTooltip() {
    const tip = document.getElementById('heatmapFloatingTooltip');
    if (tip) tip.style.display = 'none';
  },

  // Dynamic real-time cell update when a streamed transaction arrives
  updateTemporalHeatmapLive(tx) {
    try {
      const now = new Date();
      let dayIdx = (now.getUTCDay() + 6) % 7;
      let hour = now.getUTCHours();

      if (typeof tx?.weekday === 'number') {
        dayIdx = tx.weekday % 7;
      }
      if (typeof tx?.hour === 'number') {
        hour = tx.hour % 24;
      }

      const cellEl = document.getElementById(`hcell-${dayIdx}-${hour}`);
      if (!cellEl) return;

      // Update counters
      let curTot = parseInt(cellEl.getAttribute('data-total') || '0', 10) + 1;
      let curFraud = parseInt(cellEl.getAttribute('data-fraud') || '0', 10);
      const isFraud = (tx.prediction === 'FRAUD' || tx.risk_level === 'HIGH' || tx.risk_level === 'CRITICAL' || tx.is_fraud === 1);
      if (isFraud) {
        curFraud += 1;
      }

      const newRate = (curFraud / Math.max(1, curTot)) * 100;
      const col = this.getHeatmapColor(newRate);

      let curRisk = parseFloat(cellEl.getAttribute('data-risk') || '25.0');
      const txRisk = parseFloat(tx.risk_score || 30.0);
      const newRisk = ((curRisk * 0.95) + (txRisk * 0.05)).toFixed(1);

      cellEl.setAttribute('data-total', curTot);
      cellEl.setAttribute('data-fraud', curFraud);
      cellEl.setAttribute('data-rate', newRate.toFixed(2));
      cellEl.setAttribute('data-risk', newRisk);
      cellEl.setAttribute('data-tier', col.tierLabel);
      cellEl.setAttribute('data-tier-color', col.tierColor);

      // Smooth color transition
      cellEl.style.background = col.bg;
      cellEl.style.borderColor = col.border;
      if (col.glow !== 'none') {
        cellEl.style.boxShadow = col.glow;
      }

      // Add gentle live flash ripple
      cellEl.classList.remove('heatmap-cell-flash');
      void cellEl.offsetWidth; // trigger reflow
      cellEl.classList.add('heatmap-cell-flash');
      setTimeout(() => cellEl.classList.remove('heatmap-cell-flash'), 550);
    } catch (err) {
      console.warn("[HEATMAP] Live update error:", err);
    }
  },

  // 6-Axis Behavioral Radar Profile (Current vs Historical Baseline)
  renderBehaviorRadar(ctxId, profile) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const labels = profile?.labels || ["Amount Deviation", "Time Anomaly", "Velocity Surge", "Device Novelty", "Location Risk", "Product Category"];
    const currentVals = profile?.current_transaction || [75, 45, 80, 60, 20, 40];
    const baseVals = profile?.historical_baseline || [25, 20, 15, 12, 18, 22];

    this.instances[ctxId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Current Transaction',
            data: currentVals,
            backgroundColor: 'rgba(239, 68, 68, 0.25)',
            borderColor: '#ef4444',
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#fff',
            borderWidth: 2
          },
          {
            label: 'Customer Historical Baseline',
            data: baseVals,
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderColor: '#10b981',
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            borderWidth: 1.5,
            borderDash: [4, 4]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            pointLabels: { color: '#cbd5e1', font: { size: 10 } },
            ticks: { display: false, min: 0, max: 100 }
          }
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  },

  // Probability Calibration Curve (Predicted vs Observed Fraud Frequency)
  renderCalibrationCurve(ctxId, calib) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const predProbs = calib?.predicted_probs || [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95];
    const obsFreqs = calib?.observed_frequencies || [0.03, 0.12, 0.24, 0.36, 0.44, 0.57, 0.68, 0.79, 0.88, 0.96];
    const points = predProbs.map((p, i) => ({ x: p, y: obsFreqs[i] }));

    this.instances[ctxId] = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: `LightGBM (Brier Score: ${calib?.brier_score || 0.098})`,
            data: points,
            borderColor: '#06b6d4',
            backgroundColor: '#06b6d4',
            showLine: true,
            borderWidth: 2,
            pointRadius: 4
          },
          {
            label: 'Perfect Calibration (y = x)',
            data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
            borderColor: 'rgba(255, 255, 255, 0.25)',
            borderDash: [5, 5],
            showLine: true,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            min: 0, 
            max: 1, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Mean Predicted Fraud Probability (0.0 – 1.0)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            min: 0, 
            max: 1, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Observed Empirical Fraud Frequency (0.0 – 1.0)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          }
        }
      }
    });
  },

  // Threshold Optimization Sweep Curves (Precision, Recall, F1 vs Threshold)
  renderThresholdAnalysis(ctxId, thresholdsList) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const list = Array.isArray(thresholdsList) ? thresholdsList : (thresholdsList?.thresholds || thresholdsList?.threshold_analysis || []);
    const tVals = list.map(item => item.threshold);
    const precisions = list.map(item => item.precision);
    const recalls = list.map(item => item.recall);
    const f1s = list.map(item => item.f1_score);

    this.instances[ctxId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: tVals,
        datasets: [
          { label: 'Precision', data: precisions, borderColor: '#06b6d4', borderWidth: 2, pointRadius: 2 },
          { label: 'Recall', data: recalls, borderColor: '#10b981', borderWidth: 2, pointRadius: 2 },
          { label: 'F1-Score', data: f1s, borderColor: '#f59e0b', borderWidth: 2.5, pointRadius: 3 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } } },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Classification Decision Cutoff Threshold (0.0 – 1.0)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            min: 0, 
            max: 1, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Validation Metric Performance Score (0.0 – 1.0)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          }
        }
      }
    });
  },

  // Rupee-Weighted Financial Cost-Utility Curve
  renderCostUtilityCurve(ctxId, costData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const curve = costData?.cost_curve || [];
    const thresholds = curve.map(c => c.threshold);
    const netSavings = curve.map(c => c.net_savings_usd);
    const fraudPrevented = curve.map(c => c.fraud_prevented_usd);
    const frictionLosses = curve.map(c => c.friction_losses_usd);
    const disputeRatios = curve.map(c => c.dispute_ratio_pct);

    this.instances[ctxId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: thresholds,
        datasets: [
          {
            label: 'Net Financial Savings (₹)',
            data: netSavings,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            fill: true,
            borderWidth: 3,
            pointRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Gross Fraud Intercepted (₹)',
            data: fraudPrevented,
            borderColor: '#06b6d4',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 2,
            yAxisID: 'y'
          },
          {
            label: 'Customer Friction Cost (₹)',
            data: frictionLosses,
            borderColor: '#f59e0b',
            borderWidth: 2,
            pointRadius: 2,
            yAxisID: 'y'
          },
          {
            label: 'Visa VFMP Dispute Ratio (%)',
            data: disputeRatios,
            borderColor: '#ef4444',
            borderWidth: 2,
            borderDash: [2, 2],
            pointRadius: 3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.dataset.yAxisID === 'y1') {
                  return `${context.dataset.label}: ${context.raw}% ${context.raw < 0.9 ? '(Compliant)' : '(VIOLATION: >0.9%)'}`;
                }
                return `${context.dataset.label}: ₹${Number(context.raw).toLocaleString('en-IN')}`;
              }
            }
          }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Decision Threshold Cutoff (0.0 – 1.0)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: {
            title: { 
              display: true, 
              text: 'Net Financial Impact & Value (₹ INR)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            },
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { callback: (v) => `₹${(v / 1000).toFixed(0)}k` }
          },
          y1: {
            position: 'right',
            min: 0,
            max: 3.0,
            title: { 
              display: true, 
              text: 'Visa VFMP Dispute Ratio (%)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            },
            grid: { display: false },
            ticks: { callback: (v) => `${v}%` }
          }
        }
      }
    });
  },

  // ML Probability vs Anomaly Score Scatter Plot
  renderMLvsAnomalyScatter(ctxId, scatterData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const fraudPts = (scatterData || []).filter(d => d.is_fraud === 1).map(d => ({ x: d.ml_prob, y: d.anomaly_score }));
    const legitPts = (scatterData || []).filter(d => d.is_fraud === 0).map(d => ({ x: d.ml_prob, y: d.anomaly_score }));

    this.instances[ctxId] = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Fraudulent Transactions',
            data: fraudPts,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            pointRadius: 4
          },
          {
            label: 'Legitimate Transactions',
            data: legitPts,
            backgroundColor: 'rgba(16, 185, 129, 0.4)',
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            min: 0, 
            max: 1, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Supervised ML Probability (0.0 – 1.0)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            min: 0, 
            max: 1, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Isolation Forest Anomaly Score', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          }
        }
      }
    });
  },

  // Top Risky Devices Horizontal Bar Chart
  renderTopDevices(ctxId, devices) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const items = (devices || []).slice(0, 7);
    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: items.map(d => d.DeviceInfo || 'Unknown'),
        datasets: [{
          label: 'Fraud Count',
          data: items.map(d => d.sum || d.count || 0),
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' }, 
            title: { 
              display: true, 
              text: 'Confirmed Fraud Cases (Count)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            grid: { display: false },
            title: { display: false },
            ticks: {
              color: '#e2e8f0',
              font: { size: 10.5, weight: '500' }
            }
          }
        }
      }
    });
  },

  // Top Risky Email Domains Horizontal Bar Chart
  renderTopEmailDomains(ctxId, domains) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const items = (domains || []).slice(0, 7);
    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: items.map(d => d.P_emaildomain || 'Unknown'),
        datasets: [{
          label: 'Fraud Rate %',
          data: items.map(d => d.fraud_rate || 0),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' }, 
            title: { 
              display: true, 
              text: 'Empirical Fraud Rate (%)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            grid: { display: false },
            title: { display: false },
            ticks: {
              color: '#e2e8f0',
              font: { size: 10.5, weight: '500' }
            }
          }
        }
      }
    });
  },

  renderROCCurves(ctxId, curves) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const colors = {
      ensemble_cat_lgb: '#ec4899',
      catboost: '#8b5cf6',
      lightgbm: '#10b981',
      xgboost: '#06b6d4',
      random_forest: '#6366f1',
      decision_tree: '#f59e0b',
      logistic_regression: '#94a3b8'
    };

    const labelMap = {
      ensemble_cat_lgb: 'CHAMPION ENSEMBLE (CATBOOST + LIGHTGBM)',
      catboost: 'CATBOOST',
      lightgbm: 'LIGHTGBM',
      xgboost: 'XGBOOST',
      random_forest: 'RANDOM FOREST',
      decision_tree: 'DECISION TREE',
      logistic_regression: 'LOGISTIC REGRESSION'
    };

    const datasets = [];
    for (const [model, data] of Object.entries(curves || {})) {
      if (data.roc && colors[model]) {
        const pts = data.roc.fpr.map((fpr, i) => ({ x: fpr, y: data.roc.tpr[i] }));
        datasets.push({
          label: labelMap[model] || model.replace('_', ' ').toUpperCase(),
          data: pts,
          borderColor: colors[model],
          borderWidth: model === 'ensemble_cat_lgb' ? 3.5 : (model === 'catboost' || model === 'lightgbm' ? 2.5 : 1.5),
          tension: 0.1,
          pointRadius: 0,
          fill: false
        });
      }
    }

    datasets.push({
      label: 'Random Guess (AUC = 0.50)',
      data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderDash: [5, 5],
      borderWidth: 1,
      pointRadius: 0,
      fill: false
    });

    this.instances[ctxId] = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        showLine: true,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } }
        },
        scales: {
          x: { 
            min: 0, 
            max: 1, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'False Positive Rate (FPR = FP / [FP + TN])', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            min: 0, 
            max: 1, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'True Positive Rate / Recall (TPR = TP / [TP + FN])', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          }
        }
      }
    });
  },

  renderGlobalSHAP(ctxId, shapItems) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const rawList = Array.isArray(shapItems) ? shapItems : (shapItems?.top_features || shapItems?.global_feature_importance || []);
    const items = rawList.slice(0, 14).reverse();
    const labels = items.map(i => i.name || i.feature || 'Feature');
    const values = items.map(i => Number(i.importance ?? 0));
    const bgColors = items.map(i => {
      if (i.direction === 'increases_risk') return 'rgba(239, 68, 68, 0.82)';
      if (i.direction === 'decreases_risk') return 'rgba(16, 185, 129, 0.82)';
      return 'rgba(99, 102, 241, 0.82)';
    });
    const hoverColors = items.map(i => {
      if (i.direction === 'increases_risk') return '#f87171';
      if (i.direction === 'decreases_risk') return '#34d399';
      return '#818cf8';
    });

    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Mean |SHAP Value| (Impact on Model Output)',
          data: values,
          backgroundColor: bgColors,
          hoverBackgroundColor: hoverColors,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = items[context.dataIndex];
                return [
                  ` Attribution: ${context.raw.toFixed(4)} |SHAP|`,
                  ` Category: ${item.category || 'Predictor'}`,
                  ` Impact: ${item.direction === 'increases_risk' ? '⚠️ Increases Fraud Probability' : (item.direction === 'decreases_risk' ? '🛡️ Decreases Fraud Probability (Trust Anchor)' : 'Neutral Factor')}`
                ];
              },
              afterLabel: (context) => {
                const item = items[context.dataIndex];
                return item.description ? ` Details: ${item.description}` : '';
              }
            }
          }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' }, 
            title: { 
              display: true, 
              text: 'Attribution Weight: Mean |SHAP Value| Across N=15,000 Holdout Set', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            grid: { display: false },
            title: { display: false },
            ticks: {
              color: '#e2e8f0',
              font: { size: 10, weight: '500' }
            }
          }
        }
      }
    });
  },

  renderMissingnessBar(ctxId, missingList) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const items = (missingList || []).slice(0, 10).reverse();
    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: items.map(m => m.feature),
        datasets: [{
          label: 'Missing Rate (%)',
          data: items.map(m => m.missing_pct),
          backgroundColor: 'rgba(249, 115, 22, 0.8)',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            min: 0, 
            max: 100, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' }, 
            title: { 
              display: true, 
              text: 'Data Null / Missing Rate (%)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            grid: { display: false },
            title: { display: false },
            ticks: {
              color: '#e2e8f0',
              font: { size: 10, weight: '500' }
            }
          }
        }
      }
    });
  },

  renderRiskTrendChart(ctxId, trendData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    let hours = [];
    let avgScores = [];
    let highRiskPct = [];

    const rawList = Array.isArray(trendData) ? trendData : (trendData?.risk_trend || trendData?.risk_trend_24h || []);
    if (rawList.length > 0) {
      hours = rawList.map(t => {
        if (t.hour !== undefined) {
          const s = String(t.hour);
          return s.includes(':') ? s : `${s.padStart(2, '0')}:00`;
        }
        return '00:00';
      });
      avgScores = rawList.map(t => Number(t.avg_risk ?? t.score ?? 0));
      highRiskPct = rawList.map(t => Number(t.high_risk_pct ?? t.fraud_pct ?? 12));
    } else if (trendData && Array.isArray(trendData.labels)) {
      hours = trendData.labels;
      avgScores = (trendData.scores || []).map(Number);
      highRiskPct = (trendData.high_risk_pct || avgScores.map(s => Math.round(s * 0.4))).map(Number);
    }

    this.instances[ctxId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Avg Calibrated Risk Score',
            data: avgScores,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            yAxisID: 'y'
          },
          {
            label: 'High/Crit Risk Incidence (%)',
            data: highRiskPct,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            borderDash: [4, 4],
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Time of Day (UTC 24-Hour Observation Window)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            min: 0, 
            max: 100, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' }, 
            title: { 
              display: true, 
              text: 'Mean Calibrated Risk Score (0 – 100)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y1: { 
            min: 0, 
            max: 50, 
            position: 'right', 
            grid: { display: false }, 
            title: { 
              display: true, 
              text: 'High / Critical Risk Incidence Rate (%)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          }
        }
      }
    });
  },

  renderRiskFactorChart(ctxId, factors) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const factorMap = factors || {
      'Supervised ML': 35,
      'Anomaly Detection': 20,
      'Velocity Burst': 20,
      'Device Fingerprint': 10,
      'Network / Geo': 10,
      'Heuristic Rules': 5
    };

    const labels = Object.keys(factorMap);
    const weights = Object.values(factorMap);

    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Average Ensemble Contribution (%)',
          data: weights,
          backgroundColor: [
            'rgba(99, 102, 241, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(236, 72, 153, 0.85)',
            'rgba(6, 182, 212, 0.85)',
            'rgba(249, 115, 22, 0.85)'
          ],
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { 
            min: 0, 
            max: 40, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' }, 
            title: { 
              display: true, 
              text: 'Weighted Ensemble Contribution Factor (%)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            grid: { display: false },
            title: { display: false },
            ticks: {
              color: '#e2e8f0',
              font: { size: 11, weight: '600' }
            }
          }
        }
      }
    });
  },

  renderBehavioralRadar(ctxId, normalProfile, fraudProfile) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const labels = ['Amount Variance', '1h Velocity', '24h Velocity', 'Device Sharing', 'Geo Distance', 'Auth Failures'];
    const normalData = Array.isArray(normalProfile) ? normalProfile : [20, 15, 25, 10, 12, 5];
    const fraudData = Array.isArray(fraudProfile) ? fraudProfile : [85, 92, 78, 88, 75, 95];

    this.instances[ctxId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Legitimate Cardholder Baseline',
            data: normalData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderWidth: 2,
            pointBackgroundColor: '#10b981'
          },
          {
            label: 'Flagged / Fraudulent Profile',
            data: fraudData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.25)',
            borderWidth: 2,
            pointBackgroundColor: '#ef4444'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } }
        },
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            pointLabels: { color: '#94a3b8', font: { size: 10 } },
            ticks: { display: false, max: 100 }
          }
        }
      }
    });
  },

  renderBehavioralScatter(ctxId, scatterData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const rawList = Array.isArray(scatterData) ? scatterData : (scatterData?.scatter_points || scatterData?.anomaly_scatter_sample || []);
    const normalPts = rawList.filter(p => !p.is_fraud).map(p => ({ x: Number(p.amount ?? p.x ?? 0), y: Number(p.anomaly_score ?? p.y ?? 0) }));
    const fraudPts = rawList.filter(p => p.is_fraud).map(p => ({ x: Number(p.amount ?? p.x ?? 0), y: Number(p.anomaly_score ?? p.y ?? 0) }));

    this.instances[ctxId] = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Normal Transactions',
            data: normalPts,
            backgroundColor: 'rgba(16, 185, 129, 0.65)',
            pointRadius: 3
          },
          {
            label: 'Confirmed Fraud Outliers',
            data: fraudPts,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            pointRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, usePointStyle: true } }
        },
        scales: {
          x: { 
            type: 'linear', 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Transaction Ticket Value (₹ INR)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            min: 0, 
            max: 100, 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Isolation Forest Anomaly Score (0 – 100)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          }
        }
      }
    });
  },

  renderBehavioralDistChart(ctxId, distData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const buckets = distData?.buckets || distData?.labels || ['<₹2,000', '₹2,000-5,000', '₹5,000-10,000', '₹10,000-25,000', '₹25,000-50,000', '₹50,000-1,00,000', '>₹1,00,000'];
    const normalVals = distData?.normal || distData?.normal_spending || [35, 28, 20, 11, 4, 1.5, 0.5];
    const fraudVals = distData?.fraud || distData?.fraud_spending || [12, 10, 15, 24, 21, 12, 6];

    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: buckets,
        datasets: [
          {
            label: 'Legitimate Spending (%)',
            data: normalVals,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderRadius: 4
          },
          {
            label: 'Fraudulent Spending (%)',
            data: fraudVals,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, usePointStyle: true } }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Transaction Ticket Value Bracket (₹ INR)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' }, 
            title: { 
              display: true, 
              text: 'Share of Population Volume (%)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          }
        }
      }
    });
  },

  renderTxTimelineChart(ctxId, timelineData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const hours = timelineData?.hours || ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const vol = timelineData?.volume || [120, 95, 45, 60, 210, 480, 620, 580, 640, 590, 420, 230];
    const fraud = timelineData?.fraud || [8, 12, 11, 6, 7, 14, 18, 16, 21, 25, 19, 14];

    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [
          {
            type: 'bar',
            label: 'Processed Volume',
            data: vol,
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Fraud Interceptions',
            data: fraud,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, usePointStyle: true } }
        },
        scales: {
          x: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: { 
              display: true, 
              text: 'Transaction Timeline Window (UTC 24-Hour Observation)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y: { 
            grid: { color: 'rgba(255, 255, 255, 0.04)' }, 
            title: { 
              display: true, 
              text: 'Processed Transaction Volume (Count)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          },
          y1: { 
            position: 'right', 
            min: 0, 
            grid: { display: false }, 
            title: { 
              display: true, 
              text: 'Fraud Flagged (Incidents Count)', 
              color: '#94a3b8', 
              font: { size: 10, weight: '600' } 
            } 
          }
        }
      }
    });
  },

  renderTxDistChart(ctxId, distData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const ranges = distData?.ranges || distData?.labels || ['<₹2,000', '₹2,000-₹5,000', '₹5,000-₹10,000', '₹10,000-₹25,000', '₹25,000-₹50,000', '₹50,000+'];
    const counts = distData?.counts || [1840, 2120, 1540, 980, 420, 180];

    this.instances[ctxId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ranges,
        datasets: [{
          data: counts,
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(6, 182, 212, 0.8)',
            'rgba(99, 102, 241, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: 'rgba(12, 18, 34, 0.9)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }
        }
      }
    });
  },

  incrementLiveTrend(tx) {
    ['overviewTrendChart', 'analyticsTrendChart'].forEach(chartId => {
      const chart = this.instances[chartId];
      if (!chart || !chart.data || !chart.data.datasets || !chart.data.datasets[0]) return;
      const h = (tx.hour !== undefined ? tx.hour : new Date().getHours()) % 24;
      if (chart.data.datasets[0].data[h] !== undefined) {
        chart.data.datasets[0].data[h] = (chart.data.datasets[0].data[h] || 0) + 1;
        if (tx.prediction === 'FRAUD' || tx.risk_level === 'CRITICAL' || tx.risk_level === 'HIGH') {
          if (chart.data.datasets[1] && chart.data.datasets[1].data[h] !== undefined) {
            chart.data.datasets[1].data[h] = (chart.data.datasets[1].data[h] || 0) + 1;
          }
        }
        chart.update('none');
      }
    });
  },

  incrementLiveDonut(tx) {
    ['overviewRiskDonutChart', 'riskMgmtTierDonut'].forEach(chartId => {
      const chart = this.instances[chartId];
      if (!chart || !chart.data || !chart.data.datasets || !chart.data.datasets[0]) return;
      const tier = String(tx.risk_level || 'LOW').toUpperCase();
      const idx = tier === 'CRITICAL' ? 3 : tier === 'HIGH' ? 2 : tier === 'MEDIUM' ? 1 : 0;
      if (chart.data.datasets[0].data[idx] !== undefined) {
        chart.data.datasets[0].data[idx] = (chart.data.datasets[0].data[idx] || 0) + 1;
        chart.update('none');
      }
    });
  },

  incrementLiveHistogram(tx) {
    ['analyticsHistChart', 'riskMgmtHistChart'].forEach(chartId => {
      const chart = this.instances[chartId];
      if (!chart || !chart.data || !chart.data.datasets || !chart.data.datasets[0]) return;
      const score = Math.max(0, Math.min(100, Number(tx.risk_score || 0)));
      const binIdx = Math.min(9, Math.floor(score / 10));
      if (chart.data.datasets[0].data[binIdx] !== undefined) {
        chart.data.datasets[0].data[binIdx] = (chart.data.datasets[0].data[binIdx] || 0) + 1;
        chart.update('none');
      }
    });
  },

  incrementLiveTxCharts(tx) {
    // 1. txTimelineChart
    const timelineChart = this.instances['txTimelineChart'];
    if (timelineChart && timelineChart.data && timelineChart.data.datasets && timelineChart.data.datasets[0]) {
      const h = (tx.hour !== undefined ? tx.hour : new Date().getUTCHours()) % 24;
      if (timelineChart.data.datasets[0].data[h] !== undefined) {
        timelineChart.data.datasets[0].data[h] = (timelineChart.data.datasets[0].data[h] || 0) + 1;
        if (tx.prediction === 'FRAUD' || tx.risk_level === 'CRITICAL' || tx.risk_level === 'HIGH') {
          if (timelineChart.data.datasets[1] && timelineChart.data.datasets[1].data[h] !== undefined) {
            timelineChart.data.datasets[1].data[h] = (timelineChart.data.datasets[1].data[h] || 0) + 1;
          }
        }
        timelineChart.update('none');
      }
    }

    // 2. txAmountDistChart
    const distChart = this.instances['txAmountDistChart'];
    if (distChart && distChart.data && distChart.data.datasets && distChart.data.datasets[0]) {
      const amt = Number(tx.amount || 0);
      let bIdx = 0;
      if (amt < 2000) bIdx = 0;
      else if (amt < 5000) bIdx = 1;
      else if (amt < 10000) bIdx = 2;
      else if (amt < 25000) bIdx = 3;
      else if (amt < 50000) bIdx = 4;
      else bIdx = 5;

      if (distChart.data.datasets[0].data[bIdx] !== undefined) {
        distChart.data.datasets[0].data[bIdx] = (distChart.data.datasets[0].data[bIdx] || 0) + 1;
        distChart.update('none');
      }
    }
  },

  renderCardBrandChart(ctxId, cardData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const items = cardData || [
      { network: 'Visa', volume: 19389, fraud_count: 1337, fraud_rate: 6.9 },
      { network: 'Mastercard', volume: 9542, fraud_count: 650, fraud_rate: 6.8 },
      { network: 'RuPay', volume: 12410, fraud_count: 412, fraud_rate: 3.3 },
      { network: 'Discover', volume: 635, fraud_count: 51, fraud_rate: 8.0 },
      { network: 'Amex', volume: 372, fraud_count: 24, fraud_rate: 6.4 }
    ];

    const labels = items.map(c => c.network);
    const volumes = items.map(c => c.volume);
    const rates = items.map(c => c.fraud_rate);

    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: 'Processed Volume',
            data: volumes,
            backgroundColor: 'rgba(99, 102, 241, 0.75)',
            hoverBackgroundColor: '#818cf8',
            borderRadius: 5,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Chargeback / Fraud Rate (%)',
            data: rates,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2.5,
            pointRadius: 5,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#ffffff',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.yAxisID === 'y1') {
                  return ` Chargeback Rate: ${ctx.raw}%`;
                }
                return ` Volume: ${Number(ctx.raw).toLocaleString()} txs`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: {
              display: true,
              text: 'Payment Card Network & Clearing Scheme (Visa, Mastercard, RuPay, Amex, Discover)',
              color: '#94a3b8',
              font: { size: 10, weight: '600' }
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: {
              display: true,
              text: 'Processed Transaction Volume (Count)',
              color: '#94a3b8',
              font: { size: 10, weight: '600' }
            }
          },
          y1: {
            position: 'right',
            min: 0,
            max: 12,
            grid: { display: false },
            title: {
              display: true,
              text: 'Observed Fraud Chargeback Rate (%)',
              color: '#94a3b8',
              font: { size: 10, weight: '600' }
            },
            ticks: {
              callback: (v) => `${v}%`
            }
          }
        }
      }
    });
  },

  renderGeoRiskChart(ctxId, geoData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const items = geoData || [
      { state: 'Maharashtra', legitimate: 14200, fraud: 940 },
      { state: 'Karnataka', legitimate: 11800, fraud: 780 },
      { state: 'Delhi NCR', legitimate: 9400, fraud: 890 },
      { state: 'Tamil Nadu', legitimate: 8200, fraud: 420 },
      { state: 'Telangana', legitimate: 7100, fraud: 460 },
      { state: 'Gujarat', legitimate: 6800, fraud: 390 },
      { state: 'Uttar Pradesh', legitimate: 5400, fraud: 510 },
      { state: 'West Bengal', legitimate: 4200, fraud: 360 }
    ];

    const labels = items.map(g => g.state);
    const cleanVals = items.map(g => g.legitimate);
    const fraudVals = items.map(g => g.fraud);

    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Legitimate Volume',
            data: cleanVals,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            hoverBackgroundColor: '#34d399',
            borderRadius: 4
          },
          {
            label: 'Intercepted Fraud',
            data: fraudVals,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            hoverBackgroundColor: '#f87171',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString()} txs`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: {
              display: true,
              text: 'Geographic Commercial Corridor / Indian State',
              color: '#94a3b8',
              font: { size: 10, weight: '600' }
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: {
              display: true,
              text: 'Transaction Volume & Interceptions (Count)',
              color: '#94a3b8',
              font: { size: 10, weight: '600' }
            }
          }
        }
      }
    });
  },

  renderVelocityRiskChart(ctxId, velData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const items = velData || [
      { velocity: '1 tx/hr', fraud_rate: 1.2, intercepted_lakhs: 4.2 },
      { velocity: '2 tx/hr', fraud_rate: 3.8, intercepted_lakhs: 9.6 },
      { velocity: '3 tx/hr', fraud_rate: 9.4, intercepted_lakhs: 22.1 },
      { velocity: '4 tx/hr', fraud_rate: 21.6, intercepted_lakhs: 48.5 },
      { velocity: '5 tx/hr', fraud_rate: 46.2, intercepted_lakhs: 92.0 },
      { velocity: '6 tx/hr', fraud_rate: 68.9, intercepted_lakhs: 138.4 },
      { velocity: '8 tx/hr', fraud_rate: 84.5, intercepted_lakhs: 186.2 },
      { velocity: '10+ tx/hr', fraud_rate: 96.8, intercepted_lakhs: 242.0 }
    ];

    const labels = items.map(v => v.velocity);
    const rates = items.map(v => v.fraud_rate);
    const lossVals = items.map(v => v.intercepted_lakhs);

    this.instances[ctxId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Empirical Fraud Risk (%)',
            data: rates,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#ef4444',
            yAxisID: 'y'
          },
          {
            label: 'Intercepted Capital at Risk (₹ Lakhs)',
            data: lossVals,
            borderColor: '#f59e0b',
            borderDash: [4, 4],
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#f59e0b',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.yAxisID === 'y1') {
                  return ` Intercepted: ₹${ctx.raw} Lakhs`;
                }
                return ` Fraud Risk: ${ctx.raw}%`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: {
              display: true,
              text: '1-Hour Burst Card Velocity (Consecutive Authorization Attempts)',
              color: '#94a3b8',
              font: { size: 10, weight: '600' }
            }
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: {
              display: true,
              text: 'Empirical Fraud Probability Rate (%)',
              color: '#94a3b8',
              font: { size: 10, weight: '600' }
            },
            ticks: { callback: (v) => `${v}%` }
          },
          y1: {
            position: 'right',
            grid: { display: false },
            title: {
              display: true,
              text: 'Intercepted Capital at Risk (₹ Lakhs)',
              color: '#94a3b8',
              font: { size: 10, weight: '600' }
            },
            ticks: { callback: (v) => `₹${v}L` }
          }
        }
      }
    });
  },

  renderMccRiskChart(ctxId, mccData) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;
    if (this.instances[ctxId]) this.instances[ctxId].destroy();

    const items = mccData || [
      { category: 'Crypto / P2P Exchanges', fraud_rate: 14.8, avg_ticket: 38400 },
      { category: 'Digital Goods & Gaming', fraud_rate: 12.4, avg_ticket: 4250 },
      { category: 'Luxury Electronics & Gems', fraud_rate: 9.7, avg_ticket: 54200 },
      { category: 'Cross-Border Remittance', fraud_rate: 8.2, avg_ticket: 28900 },
      { category: 'Travel & Airlines', fraud_rate: 5.6, avg_ticket: 21600 },
      { category: 'Utilities & Essential Retail', fraud_rate: 0.8, avg_ticket: 1850 }
    ];

    const labels = items.map(m => m.category);
    const rates = items.map(m => m.fraud_rate);

    this.instances[ctxId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Fraud Incident Rate (%)',
          data: rates,
          backgroundColor: [
            'rgba(239, 68, 68, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(236, 72, 153, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(6, 182, 212, 0.85)',
            'rgba(16, 185, 129, 0.85)'
          ],
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const item = items[ctx.dataIndex];
                return [
                  ` Fraud Incident Rate: ${ctx.raw}%`,
                  ` Average Ticket: ₹${Number(item.avg_ticket || 0).toLocaleString('en-IN')}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 18,
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            title: {
              display: true,
              text: 'Empirical Fraud Incident Rate (% of Vertical Volume)',
              color: '#94a3b8',
              font: { size: 10, weight: '600' }
            },
            ticks: { callback: (v) => `${v}%` }
          },
          y: {
            grid: { display: false },
            title: { display: false },
            ticks: { 
              color: '#e2e8f0',
              font: { size: 10, weight: '500' } 
            }
          }
        }
      }
    });
  }
};
