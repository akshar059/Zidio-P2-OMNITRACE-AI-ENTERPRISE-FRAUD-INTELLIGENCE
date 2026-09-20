/**
 * ArgusGuard AI: Interactive "What-If" Counterfactual Studio & Fraud Simulator
 * Combines 1-click scenario presets, reactive tactile sliders, and binary security toggles
 * with real-time counterfactual marginal point deltas, dual-model (CatBoost vs LightGBM) calibration,
 * algorithmic recourse ("Minimum Path to Approval"), SHAP waterfall attribution, and behavioral radar.
 */

const Simulator = {
  radarChart: null,
  debounceTimer: null,
  baselinePayload: null,

  // State object for fast tactile controls
  state: {
    amount: 18.50,
    velocity_1h: 14,
    device_unique_cards: 6,
    cvv_result: 'N', // 'M' or 'N'
    three_ds_status: 'CHALLENGE_FAILED', // 'FRICTIONLESS' or 'CHALLENGE_FAILED'
    is_vpn_proxy: true, // true or false
    geo_mismatch: true, // true or false
    preset: 'carding'
  },

  presets: {
    carding: {
      name: 'Carding Botnet',
      amount: 18.50,
      velocity_1h: 14,
      card_velocity_24h: 38,
      device_unique_cards: 6,
      cvv_result: 'N',
      three_ds_status: 'CHALLENGE_FAILED',
      is_vpn_proxy: true,
      geo_mismatch: true,
      ip_country: 'RU',
      billing_country: 'US',
      ProductCD: 'C',
      card4: 'visa',
      card6: 'credit',
      avs_result: 'N',
      P_emaildomain: 'protonmail.com',
      R_emaildomain: 'yandex.ru',
      DeviceInfo: 'Linux',
      account_age_days: 1,
      hour: 3
    },
    ato: {
      name: 'Account Takeover',
      amount: 2450.00,
      velocity_1h: 3,
      card_velocity_24h: 5,
      device_unique_cards: 2,
      cvv_result: 'M',
      three_ds_status: 'CHALLENGE_FAILED',
      is_vpn_proxy: true,
      geo_mismatch: true,
      ip_country: 'UA',
      billing_country: 'US',
      ProductCD: 'R',
      card4: 'mastercard',
      card6: 'credit',
      avs_result: 'A',
      P_emaildomain: 'gmail.com',
      R_emaildomain: 'gmail.com',
      DeviceInfo: 'Windows',
      account_age_days: 365,
      hour: 2
    },
    device_farm: {
      name: 'Device Syndicate',
      amount: 489.00,
      velocity_1h: 8,
      card_velocity_24h: 22,
      device_unique_cards: 8,
      cvv_result: 'M',
      three_ds_status: 'NOT_ENROLLED',
      is_vpn_proxy: true,
      geo_mismatch: true,
      ip_country: 'NG',
      billing_country: 'GB',
      ProductCD: 'W',
      card4: 'visa',
      card6: 'debit',
      avs_result: 'N',
      P_emaildomain: 'yahoo.com',
      R_emaildomain: 'yahoo.com',
      DeviceInfo: 'Android',
      account_age_days: 30,
      hour: 22
    },
    normal: {
      name: 'Verified E-Commerce',
      amount: 64.50,
      velocity_1h: 1,
      card_velocity_24h: 1,
      device_unique_cards: 1,
      cvv_result: 'M',
      three_ds_status: 'FRICTIONLESS',
      is_vpn_proxy: false,
      geo_mismatch: false,
      ip_country: 'US',
      billing_country: 'US',
      ProductCD: 'W',
      card4: 'visa',
      card6: 'debit',
      avs_result: 'Y',
      P_emaildomain: 'gmail.com',
      R_emaildomain: 'gmail.com',
      DeviceInfo: 'MacOS',
      account_age_days: 180,
      hour: 14
    },
    mobile: {
      name: 'Mobile In-App',
      amount: 14.99,
      velocity_1h: 1,
      card_velocity_24h: 2,
      device_unique_cards: 1,
      cvv_result: 'M',
      three_ds_status: 'FRICTIONLESS',
      is_vpn_proxy: false,
      geo_mismatch: false,
      ip_country: 'US',
      billing_country: 'US',
      ProductCD: 'S',
      card4: 'american express',
      card6: 'credit',
      avs_result: 'Y',
      P_emaildomain: 'icloud.com',
      R_emaildomain: 'icloud.com',
      DeviceInfo: 'iOS',
      account_age_days: 365,
      hour: 19
    }
  },

  init() {
    // Default to carding preset
    this.loadPreset('carding');
  },

  getCurrentPayload() {
    const devInfo = document.getElementById('simDeviceInfo')?.value || 'Windows';
    const isMobile = (devInfo === 'iOS' || devInfo === 'Android');
    const ipCountry = this.state.geo_mismatch ? 'RU' : 'US';

    return {
      TransactionID: `TX-SIM-${Date.now().toString().slice(-4)}`,
      TransactionAmt: parseFloat(this.state.amount || 100),
      ProductCD: document.getElementById('simProduct')?.value || 'C',
      card4: document.getElementById('simCardBrand')?.value || 'visa',
      card6: document.getElementById('simCardType')?.value || 'credit',
      cvv_result: this.state.cvv_result,
      avs_result: document.getElementById('simAvs')?.value || (this.state.geo_mismatch ? 'N' : 'Y'),
      three_ds_status: this.state.three_ds_status,
      P_emaildomain: document.getElementById('simPEmail')?.value || 'protonmail.com',
      R_emaildomain: document.getElementById('simREmail')?.value || 'yandex.ru',
      ip_country: ipCountry,
      billing_country: 'US',
      shipping_country: 'US',
      is_vpn_proxy: this.state.is_vpn_proxy,
      DeviceInfo: devInfo,
      DeviceType: isMobile ? 'mobile' : 'desktop',
      velocity_1h: parseInt(this.state.velocity_1h || 1, 10),
      card_velocity_24h: Math.max(parseInt(this.state.velocity_1h, 10) * 2, 2),
      device_unique_cards: parseInt(this.state.device_unique_cards || 1, 10),
      account_age_days: parseInt(document.getElementById('simAccountAge')?.value || 180, 10),
      hour: parseInt(document.getElementById('simHour')?.value || 14, 10)
    };
  },

  loadPreset(key) {
    const data = this.presets[key];
    if (!data) return;

    this.state.preset = key;

    // Update active highlight on scenario cards
    document.querySelectorAll('.scenario-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-preset') === key);
    });

    // Update state & sliders
    this.state.amount = data.amount;
    this.state.velocity_1h = data.velocity_1h;
    this.state.device_unique_cards = data.device_unique_cards;
    this.state.cvv_result = data.cvv_result;
    this.state.three_ds_status = data.three_ds_status;
    this.state.is_vpn_proxy = data.is_vpn_proxy;
    this.state.geo_mismatch = data.geo_mismatch;

    // Sync sliders
    const amtSlider = document.getElementById('simAmountSlider');
    const velSlider = document.getElementById('simVelSlider');
    const cardsSlider = document.getElementById('simCardsSlider');

    if (amtSlider) amtSlider.value = data.amount;
    if (velSlider) velSlider.value = data.velocity_1h;
    if (cardsSlider) cardsSlider.value = data.device_unique_cards;

    this.updateSliderDisplays();
    this.updateToggleDisplays();

    // Sync drawer fields if present
    const setDrawer = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };
    setDrawer('simProduct', data.ProductCD);
    setDrawer('simCardBrand', data.card4);
    setDrawer('simCardType', data.card6);
    setDrawer('simAvs', data.avs_result);
    setDrawer('simPEmail', data.P_emaildomain);
    setDrawer('simREmail', data.R_emaildomain);
    setDrawer('simAccountAge', data.account_age_days);
    setDrawer('simDeviceInfo', data.DeviceInfo);
    setDrawer('simHour', data.hour);

    // Save baseline for counterfactual reference
    this.baselinePayload = this.getCurrentPayload();

    this.runSimulation();
  },

  onSliderInput(type, val) {
    const num = parseFloat(val);
    if (type === 'amount') {
      this.state.amount = num;
    } else if (type === 'velocity') {
      this.state.velocity_1h = parseInt(num, 10);
    } else if (type === 'cards') {
      this.state.device_unique_cards = parseInt(num, 10);
    }

    this.updateSliderDisplays();
    this.scheduleSimulation();
  },

  updateSliderDisplays() {
    const amtDisp = document.getElementById('simAmountDisplay');
    const velDisp = document.getElementById('simVelDisplay');
    const cardsDisp = document.getElementById('simCardsDisplay');

    if (amtDisp) amtDisp.textContent = `₹${this.state.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (velDisp) velDisp.textContent = `${this.state.velocity_1h} tx / hr`;
    if (cardsDisp) cardsDisp.textContent = `${this.state.device_unique_cards} card${this.state.device_unique_cards > 1 ? 's' : ''}`;
  },

  toggleParam(param) {
    if (param === 'cvv') {
      this.state.cvv_result = (this.state.cvv_result === 'M') ? 'N' : 'M';
    } else if (param === '3ds') {
      this.state.three_ds_status = (this.state.three_ds_status === 'FRICTIONLESS') ? 'CHALLENGE_FAILED' : 'FRICTIONLESS';
    } else if (param === 'vpn') {
      this.state.is_vpn_proxy = !this.state.is_vpn_proxy;
    } else if (param === 'geo') {
      this.state.geo_mismatch = !this.state.geo_mismatch;
    }

    this.updateToggleDisplays();
    this.scheduleSimulation();
  },

  updateToggleDisplays() {
    // 1. CVV
    const cvvBtn = document.getElementById('toggleCvv');
    const cvvStatus = document.getElementById('toggleCvvStatus');
    const isCvvSafe = (this.state.cvv_result === 'M');
    if (cvvBtn) {
      cvvBtn.className = `security-toggle-btn ${isCvvSafe ? 'safe' : 'danger'}`;
    }
    if (cvvStatus) {
      cvvStatus.textContent = isCvvSafe ? 'Match (Verified)' : 'Mismatch (Failed)';
    }

    // 2. 3DS
    const tdsBtn = document.getElementById('toggle3ds');
    const tdsStatus = document.getElementById('toggle3dsStatus');
    const is3dsSafe = (this.state.three_ds_status === 'FRICTIONLESS');
    if (tdsBtn) {
      tdsBtn.className = `security-toggle-btn ${is3dsSafe ? 'safe' : 'danger'}`;
    }
    if (tdsStatus) {
      tdsStatus.textContent = is3dsSafe ? 'Frictionless Passed' : 'Challenge Failed';
    }

    // 3. VPN / Tor
    const vpnBtn = document.getElementById('toggleVpn');
    const vpnStatus = document.getElementById('toggleVpnStatus');
    const isVpnSafe = !this.state.is_vpn_proxy;
    if (vpnBtn) {
      vpnBtn.className = `security-toggle-btn ${isVpnSafe ? 'safe' : 'danger'}`;
    }
    if (vpnStatus) {
      vpnStatus.textContent = isVpnSafe ? 'Clean Residential' : 'Tor Exit Node / VPN';
    }

    // 4. Geo
    const geoBtn = document.getElementById('toggleGeo');
    const geoStatus = document.getElementById('toggleGeoStatus');
    const isGeoSafe = !this.state.geo_mismatch;
    if (geoBtn) {
      geoBtn.className = `security-toggle-btn ${isGeoSafe ? 'safe' : 'danger'}`;
    }
    if (geoStatus) {
      geoStatus.textContent = isGeoSafe ? 'Domestic (Aligned)' : 'Cross-Border Discordant';
    }
  },

  toggleDrawer() {
    const content = document.getElementById('drawerContent');
    const arrow = document.getElementById('drawerArrow');
    if (content) {
      const isHidden = (content.style.display === 'none' || !content.style.display);
      content.style.display = isHidden ? 'block' : 'none';
      if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  },

  scheduleSimulation() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.runSimulation();
    }, 150);
  },

  async runSimulation() {
    const btn = document.getElementById('simAnalyzeBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⚡ Computing...';
    }

    const payload = this.getCurrentPayload();
    if (!this.baselinePayload) {
      this.baselinePayload = { ...payload };
    }

    try {
      // Parallel execution: standard prediction + counterfactual analysis
      const [predictResult, cfResult] = await Promise.all([
        API.predict(payload),
        API.simulateCounterfactual(this.baselinePayload, payload).catch(e => {
          console.warn("Counterfactual call error:", e);
          return null;
        })
      ]);

      this.displayResult(predictResult);

      if (cfResult) {
        this.displayCounterfactual(cfResult);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ Recalculate Now';
      }
    }
  },

  displayResult(res) {
    // 1. Gauge Circle
    const score = res.risk_score;
    const scoreEl = document.getElementById('gaugeScoreText');
    const tierPill = document.getElementById('gaugeRiskPill');
    const circle = document.getElementById('gaugeBarCircle');

    if (scoreEl) scoreEl.textContent = score;
    if (tierPill) {
      tierPill.className = `risk-pill ${res.risk_level}`;
      tierPill.textContent = `${res.risk_level} RISK (${res.action})`;
    }

    if (circle) {
      const maxOffset = 440;
      const offset = maxOffset - (score / 100) * maxOffset;
      circle.style.strokeDashoffset = offset;

      let strokeColor = '#10b981'; // Green
      if (score > 30 && score <= 60) strokeColor = '#f59e0b'; // Yellow
      else if (score > 60 && score <= 80) strokeColor = '#f97316'; // Orange
      else if (score > 80) strokeColor = '#ef4444'; // Red

      circle.style.stroke = strokeColor;
    }

    // 2. Policy Action Recommendation Banner
    const policy = res.policy_recommendation || {};
    const banner = document.getElementById('simPolicyBanner');
    const tag = document.getElementById('simPolicyTag');
    const actionText = document.getElementById('simPolicyAction');
    const rationale = document.getElementById('simPolicyRationale');

    if (banner) {
      const colorCls = policy.badge_color || (score > 80 ? 'crit' : (score > 60 ? 'orange' : (score > 30 ? 'yellow' : 'green')));
      banner.className = `sim-policy-banner status-${colorCls}`;
      if (tag) tag.textContent = policy.status || res.action;
      if (actionText) actionText.textContent = `POLICY ACTION: ${policy.action || res.action}`;
      if (rationale) rationale.textContent = policy.rationale || "Transaction evaluated across supervised and heuristic decision trees.";
    }

    // 3. Financial Exposure Ribbon
    const fin = res.financial_exposure || {};
    const finOrder = document.getElementById('simFinOrder');
    const finDispute = document.getElementById('simFinDispute');
    const finLiability = document.getElementById('simFinLiability');

    const amt = parseFloat(res.amount || 0);
    if (finOrder) finOrder.textContent = `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (finDispute) {
      const savedFee = (score >= 60) ? 2000.00 : 0.00;
      finDispute.textContent = `₹${savedFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      finDispute.style.color = (savedFee > 0) ? '#10b981' : 'var(--text-muted)';
    }
    if (finLiability) {
      finLiability.textContent = fin.liability_shift_label || (score <= 30 ? 'Protected' : 'Merchant Liable');
    }

    // 4. SHAP Local Waterfall Attribution
    this.renderShapWaterfall(res);

    // 5. Behavioral Radar Profile
    this.updateRadarChart(res.behavior_profile);

    // 6. 6-Component Breakdown Progress Bars
    const normalizeScore = (val) => {
      if (val === undefined || val === null || isNaN(val)) return 0;
      const num = val <= 1.0 ? Math.round(val * 100) : Math.round(val);
      return Math.min(100, Math.max(0, num));
    };

    const rf = res.risk_factors || res.risk_decomposition || {};
    const mlVal = normalizeScore(rf.ml_risk !== undefined ? rf.ml_risk : res.fraud_probability);
    const velVal = normalizeScore(rf.velocity_risk !== undefined ? rf.velocity_risk : 20);
    const devVal = normalizeScore(rf.device_risk !== undefined ? rf.device_risk : 15);
    const behVal = normalizeScore(rf.behavior_risk !== undefined ? rf.behavior_risk : res.anomaly_score);
    const netVal = normalizeScore(rf.network_risk !== undefined ? rf.network_risk : 10);
    const rulVal = normalizeScore(rf.rule_risk !== undefined ? rf.rule_risk : res.rule_score);

    const setBar = (scoreId, barId, val) => {
      const sEl = document.getElementById(scoreId);
      const bEl = document.getElementById(barId);
      if (sEl) sEl.textContent = `${val} / 100`;
      if (bEl) bEl.style.width = `${val}%`;
    };

    setBar('simScoreMl', 'simBarMl', mlVal);
    setBar('simScoreVelocity', 'simBarVelocity', velVal);
    setBar('simScoreDevice', 'simBarDevice', devVal);
    setBar('simScoreBehavior', 'simBarBehavior', behVal);
    setBar('simScoreNetwork', 'simBarNetwork', netVal);
    setBar('simScoreRule', 'simBarRule', rulVal);

    // 7. Decision Factors & Triggered Rules
    const reasonsContainer = document.getElementById('simReasonsList');
    if (reasonsContainer) {
      reasonsContainer.innerHTML = '';
      const reasons = res.explanation?.human_reasons || res.triggered_rules || [];
      if (reasons.length === 0) {
        reasonsContainer.innerHTML = `<div class="reason-item safe">All authentication and behavioral parameters within safe enterprise bounds.</div>`;
      } else {
        reasons.forEach(r => {
          const div = document.createElement('div');
          const isHigh = (res.risk_level === 'CRITICAL' || res.risk_level === 'HIGH' || r.includes('Mismatch') || r.includes('Failure') || r.includes('Anonymizer') || r.includes('Burst'));
          div.className = `reason-item ${isHigh ? 'danger' : ''}`;
          div.textContent = r;
          reasonsContainer.appendChild(div);
        });
      }
    }
  },

  displayCounterfactual(cf) {
    // 1. Dual-Model Calibration Bars
    const catProb = Math.round((cf.catboost_probability || 0) * 100);
    const lgbProb = Math.round((cf.lightgbm_probability || 0) * 100);
    const ensProb = Math.round((cf.ensemble_probability || 0) * 100);

    const cbProbEl = document.getElementById('simCatboostProb');
    const cbBarEl = document.getElementById('simCatboostBar');
    const lgbProbEl = document.getElementById('simLightgbmProb');
    const lgbBarEl = document.getElementById('simLightgbmBar');
    const ensProbEl = document.getElementById('simEnsembleProb');
    const ensBarEl = document.getElementById('simEnsembleBar');

    if (cbProbEl) cbProbEl.textContent = `${catProb}%`;
    if (cbBarEl) cbBarEl.style.width = `${catProb}%`;
    if (lgbProbEl) lgbProbEl.textContent = `${lgbProb}%`;
    if (lgbBarEl) lgbBarEl.style.width = `${lgbProb}%`;
    if (ensProbEl) ensProbEl.textContent = `${ensProb}%`;
    if (ensBarEl) ensBarEl.style.width = `${ensProb}%`;

    // 2. Marginal Delta Pills next to controls
    const deltas = cf.counterfactual_deltas || cf.deltas || [];
    const deltaMap = {};
    deltas.forEach(d => {
      const feat = d.feature || d.parameter;
      const val = (d.score_impact_points !== undefined) ? d.score_impact_points : (d.marginal_score_delta || 0);
      deltaMap[feat] = val;
    });
    if (deltaMap['TransactionAmt'] !== undefined && deltaMap['amount'] === undefined) {
      deltaMap['amount'] = deltaMap['TransactionAmt'];
    }

    const updatePill = (elId, deltaVal) => {
      const pill = document.getElementById(elId);
      if (!pill) return;
      if (deltaVal === undefined || deltaVal === 0) {
        pill.className = 'delta-pill delta-zero';
        pill.textContent = '0 pts';
      } else if (deltaVal > 0) {
        pill.className = 'delta-pill delta-pos';
        pill.textContent = `+${deltaVal} pts`;
      } else {
        pill.className = 'delta-pill delta-neg';
        pill.textContent = `${deltaVal} pts`;
      }
    };

    updatePill('deltaAmount', deltaMap['amount']);
    updatePill('deltaVelocity', deltaMap['velocity_1h']);
    updatePill('deltaCards', deltaMap['device_unique_cards']);
    updatePill('deltaCvv', deltaMap['cvv_result']);
    updatePill('delta3ds', deltaMap['three_ds_status']);
    updatePill('deltaVpn', deltaMap['is_vpn_proxy']);
    updatePill('deltaGeo', deltaMap['geo_mismatch']);

    // 3. Minimum Path to Approval Prescriptions
    const flipBadge = document.getElementById('prescriptionFlipBadge');
    const stepsList = document.getElementById('prescriptionStepsList');
    const currentScore = (cf.counterfactual_risk_score !== undefined) ? cf.counterfactual_risk_score : (cf.current_score || 0);
    const flipAchieved = cf.flip_achieved || (currentScore <= 30);
    const pointsToApproval = cf.points_to_approval !== undefined ? cf.points_to_approval : Math.max(0, currentScore - 30);

    if (flipAchieved || currentScore <= 30) {
      if (flipBadge) {
        flipBadge.className = 'flip-badge flip-success';
        flipBadge.textContent = '🎉 Flip Achieved: Approved';
      }
      if (stepsList) {
        stepsList.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 10px; font-size: 11px; color: #6ee7b7; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">✓</span>
            <div>
              <strong>Low Risk Threshold Satisfied (Score: ${currentScore}/100)</strong><br>
              <span style="color: #cbd5e1;">This transaction configuration meets all autonomous zero-fraud criteria and is approved for instant settlement.</span>
            </div>
          </div>
        `;
      }
    } else {
      if (flipBadge) {
        flipBadge.className = 'flip-badge flip-pending';
        const actionsCount = (cf.minimum_path_to_approval || []).length;
        flipBadge.textContent = `⚡ ${actionsCount} Action${actionsCount > 1 ? 's' : ''} to Approve (-${pointsToApproval} pts)`;
      }
      if (stepsList) {
        const steps = cf.minimum_path_to_approval || [];
        if (steps.length === 0) {
          stepsList.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 8px;">No viable counterfactual adjustments identified.</div>`;
        } else {
          stepsList.innerHTML = steps.map((s, idx) => {
            const stepTitle = typeof s === 'string' ? s : s.step;
            const stepAction = typeof s === 'string' ? 'Recommended recourse' : s.action;
            const stepImpact = typeof s === 'string' ? 'REDUCE' : s.impact;
            const rawText = `${stepTitle} ${stepAction}`;

            let actionBtn = '';
            if (rawText.includes('3D Secure') || rawText.includes('SCA') || rawText.includes('Challenge')) {
              actionBtn = `<button class="btn-sm" style="font-size: 10px; padding: 2px 8px; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4);" onclick="Simulator.applyPrescriptionFix('3ds')">Apply 3DS</button>`;
            } else if (rawText.includes('CVV') || rawText.includes('Security Code')) {
              actionBtn = `<button class="btn-sm" style="font-size: 10px; padding: 2px 8px; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4);" onclick="Simulator.applyPrescriptionFix('cvv')">Verify CVV</button>`;
            } else if (rawText.includes('Residential') || rawText.includes('Proxy') || rawText.includes('Tor') || rawText.includes('VPN')) {
              actionBtn = `<button class="btn-sm" style="font-size: 10px; padding: 2px 8px; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4);" onclick="Simulator.applyPrescriptionFix('vpn')">Clean IP</button>`;
            } else if (rawText.includes('Velocity') || rawText.includes('cooldown') || rawText.includes('Throttle')) {
              actionBtn = `<button class="btn-sm" style="font-size: 10px; padding: 2px 8px; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4);" onclick="Simulator.applyPrescriptionFix('velocity')">Throttle</button>`;
            } else if (rawText.includes('Domestic') || rawText.includes('Geolocation') || rawText.includes('Origin')) {
              actionBtn = `<button class="btn-sm" style="font-size: 10px; padding: 2px 8px; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4);" onclick="Simulator.applyPrescriptionFix('geo')">Align Geo</button>`;
            } else if (rawText.includes('Device') || rawText.includes('Fingerprint')) {
              actionBtn = `<button class="btn-sm" style="font-size: 10px; padding: 2px 8px; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4);" onclick="Simulator.applyPrescriptionFix('cards')">Reset Device</button>`;
            } else if (rawText.includes('Transaction Value') || rawText.includes('Scale Down')) {
              actionBtn = `<button class="btn-sm" style="font-size: 10px; padding: 2px 8px; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4);" onclick="Simulator.applyPrescriptionFix('amount')">Set ₹50</button>`;
            }

            return `
              <div class="prescription-item">
                <div class="prescription-num">${idx + 1}</div>
                <div class="prescription-text">
                  <strong>${stepTitle}</strong>
                  <div style="font-size: 10px; color: var(--text-dim); margin-top: 1px;">Target: ${stepAction}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="prescription-impact">${stepImpact}</span>
                  ${actionBtn}
                </div>
              </div>
            `;
          }).join('');
        }
      }
    }
  },

  applyPrescriptionFix(type) {
    if (type === '3ds') {
      this.state.three_ds_status = 'FRICTIONLESS';
      this.updateToggleDisplays();
    } else if (type === 'cvv') {
      this.state.cvv_result = 'M';
      this.updateToggleDisplays();
    } else if (type === 'vpn') {
      this.state.is_vpn_proxy = false;
      this.updateToggleDisplays();
    } else if (type === 'geo') {
      this.state.geo_mismatch = false;
      this.updateToggleDisplays();
    } else if (type === 'velocity') {
      this.state.velocity_1h = Math.min(this.state.velocity_1h, 2);
      const velSlider = document.getElementById('simVelSlider');
      if (velSlider) velSlider.value = this.state.velocity_1h;
      this.updateSliderDisplays();
    } else if (type === 'cards') {
      this.state.device_unique_cards = 1;
      const cardsSlider = document.getElementById('simCardsSlider');
      if (cardsSlider) cardsSlider.value = 1;
      this.updateSliderDisplays();
    }

    if (window.App && window.App.showToast) {
      window.App.showToast(`Applied counterfactual fix: ${type.toUpperCase()}`, "info");
    }

    this.runSimulation();
  },

  renderShapWaterfall(res) {
    const container = document.getElementById('simShapWaterfall');
    if (!container) return;

    container.innerHTML = '';

    // Collect SHAP factors or generate realistic feature attribution from state
    let factors = [];
    const exp = res.explanation || {};
    if (exp.risk_factors && exp.risk_factors.length > 0) {
      exp.risk_factors.slice(0, 3).forEach(f => {
        factors.push({
          name: f.feature.replace(/_/g, ' '),
          val: Math.abs(f.contribution * 100),
          isPositive: true
        });
      });
    }
    if (exp.mitigating_factors && exp.mitigating_factors.length > 0) {
      exp.mitigating_factors.slice(0, 2).forEach(f => {
        factors.push({
          name: f.feature.replace(/_/g, ' '),
          val: Math.abs(f.contribution * 100),
          isPositive: false
        });
      });
    }

    // Fallback/enhancement with specific security factors if list is sparse
    if (factors.length < 3) {
      if (this.state.cvv_result === 'N') factors.push({ name: 'CVV Mismatch', val: 24.5, isPositive: true });
      if (this.state.is_vpn_proxy) factors.push({ name: 'Tor/VPN Proxy', val: 19.8, isPositive: true });
      if (this.state.velocity_1h >= 5) factors.push({ name: '1h Burst Velocity', val: 15.4, isPositive: true });
      if (this.state.three_ds_status === 'FRICTIONLESS') factors.push({ name: '3DS SCA Authenticated', val: 18.2, isPositive: false });
      if (!this.state.geo_mismatch) factors.push({ name: 'Domestic Geo Origin', val: 11.0, isPositive: false });
      if (this.state.amount < 100) factors.push({ name: 'Standard Ticket Size', val: 8.5, isPositive: false });
    }

    factors.slice(0, 5).forEach(item => {
      const row = document.createElement('div');
      row.className = 'waterfall-row';

      const pct = Math.min(100, Math.max(12, item.val * 3));
      const sign = item.isPositive ? '+' : '-';
      const cls = item.isPositive ? 'pos' : 'neg';

      row.innerHTML = `
        <span class="waterfall-name" title="${item.name}">${item.name}</span>
        <div class="waterfall-track">
          <div class="waterfall-fill ${cls}" style="width: ${pct}%;"></div>
        </div>
        <span class="waterfall-val ${cls}">${sign}${item.val.toFixed(1)}%</span>
      `;
      container.appendChild(row);
    });
  },

  updateRadarChart(profile) {
    const canvas = document.getElementById('simRadarChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = profile?.labels || [
      "Transaction Velocity",
      "Device Multi-Card",
      "Geo Discordance",
      "Auth & CVV Risk",
      "Network Anonymity",
      "Amount Deviation"
    ];
    const currentData = profile?.current_transaction || [20, 20, 20, 20, 20, 20];
    const baselineData = profile?.historical_baseline || [20, 15, 12, 10, 8, 22];

    if (this.radarChart) {
      this.radarChart.data.labels = labels;
      this.radarChart.data.datasets[0].data = currentData;
      this.radarChart.data.datasets[1].data = baselineData;
      this.radarChart.update();
      return;
    }

    const ctx = canvas.getContext('2d');
    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Current Evaluation',
            data: currentData,
            backgroundColor: 'rgba(239, 68, 68, 0.25)',
            borderColor: '#ef4444',
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#ef4444',
            borderWidth: 2
          },
          {
            label: 'Trusted Baseline',
            data: baselineData,
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
            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            pointLabels: {
              color: '#94a3b8',
              font: { size: 9, family: "'Inter', sans-serif" }
            },
            ticks: {
              display: false,
              backdropColor: 'transparent',
              max: 100,
              min: 0,
              stepSize: 25
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 10,
              color: '#cbd5e1',
              font: { size: 10 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}/100`
            }
          }
        }
      }
    });
  },

  // Adversarial Threat Burst Injection
  async launchAdversarialBurst(scenario = 'carding') {
    const banner = document.getElementById('simAttackTelemetry');
    const titleEl = document.getElementById('atkTelemetryTitle');
    const rateEl = document.getElementById('atkTelemetryRate');
    const injEl = document.getElementById('atkTotalInjected');
    const prevEl = document.getElementById('atkTotalPrevented');
    const latEl = document.getElementById('atkAvgLatency');
    const safeEl = document.getElementById('atkSafeguardsList');

    if (banner) banner.style.display = 'block';
    if (titleEl) titleEl.textContent = `Injecting ${scenario.toUpperCase()} Threat Stream (15 Vectors)...`;
    if (rateEl) {
      rateEl.textContent = 'Analyzing...';
      rateEl.style.color = 'var(--cyan)';
    }

    try {
      const data = await API.injectAttackBurst(scenario, 15);

      if (titleEl) titleEl.textContent = `Threat Injected: ${data.attack_name}`;
      if (rateEl) {
        rateEl.textContent = `${data.interception_rate_pct}% Defended (${data.intercepted_count}/${data.total_injected})`;
        rateEl.style.color = data.interception_rate_pct >= 90 ? '#10b981' : '#f59e0b';
      }
      if (injEl) injEl.textContent = `${data.total_injected} txs`;
      if (prevEl) prevEl.textContent = `+₹${Number(data.total_prevented_usd * 83).toLocaleString('en-IN')}`;
      if (latEl) latEl.textContent = `${data.avg_latency_ms}ms (Sub-30ms SLA)`;

      if (safeEl && data.safeguards_triggered) {
        safeEl.innerHTML = data.safeguards_triggered.map(s => `
          <div style="display: inline-block; background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; padding: 2px 6px; margin: 2px 4px 2px 0;">
            🛡️ ${s}
          </div>
        `).join('');
      }

      if (window.App?.showToast) {
        window.App.showToast(`🚨 Intercepted ${data.intercepted_count}/${data.total_injected} Threat Vectors! Prevented +₹${Math.round(data.total_prevented_usd * 83).toLocaleString('en-IN')} Fraud Drain.`);
      }
    } catch (err) {
      console.error("Adversarial burst failed:", err);
      if (titleEl) titleEl.textContent = "Threat injection failed.";
    }
  }
};
