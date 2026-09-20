/**
 * OmniTrace AI: Cytoscape.js Fraud Network Graph & Syndicate Dismantler
 * Visualizes multi-entity fraud rings, detects Kingpin Hubs, and enforces
 * statutory PMLA Section 12 syndicate freezing directives.
 */

const FraudNetwork = {
  cy: null,
  graphData: null,
  activeFilter: 'ALL',
  lastQuarantineDossier: null,

  async init() {
    console.log("[NETWORK] Initializing Fraud Entity Graph & Ring Dismantler...");
    await this.loadNetworkData();
    this.bindControls();
  },

  async loadNetworkData() {
    try {
      const res = await fetch('/api/network/graph');
      this.graphData = await res.json();
      this.renderGraph(this.graphData.elements);
      this.renderClusters(this.graphData.clusters || []);
    } catch (err) {
      console.error("Failed to load fraud network:", err);
    }
  },

  renderGraph(elements) {
    const container = document.getElementById('cytoscapeNetworkCanvas');
    if (!container || typeof cytoscape === 'undefined') return;

    // Filter elements if needed
    let filteredElements = elements;
    if (this.activeFilter !== 'ALL') {
      const allowedNodes = new Set(
        elements
          .filter(el => el.data.type === this.activeFilter || el.data.type === 'transaction')
          .map(el => el.data.id)
      );
      filteredElements = elements.filter(el => {
        if (el.data.source) {
          return allowedNodes.has(el.data.source) && allowedNodes.has(el.data.target);
        }
        return allowedNodes.has(el.data.id);
      });
    }

    this.cy = cytoscape({
      container: container,
      elements: filteredElements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#cbd5e1',
            'font-family': 'Inter, sans-serif',
            'font-size': '10px',
            'text-valign': 'bottom',
            'text-margin-y': '5px',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'background-color': '#475569',
            'border-width': 2,
            'border-color': 'rgba(255, 255, 255, 0.15)',
            'width': 28,
            'height': 28,
            'transition-property': 'opacity, border-color, border-width, background-color',
            'transition-duration': '0.3s'
          }
        },
        // Transaction Nodes
        {
          selector: 'node[type = "transaction"]',
          style: {
            'shape': 'ellipse',
            'background-color': 'mapData(risk_score, 0, 100, #10b981, #ef4444)',
            'border-color': 'rgba(239, 68, 68, 0.4)',
            'width': 34,
            'height': 34
          }
        },
        // Card Nodes
        {
          selector: 'node[type = "card"]',
          style: {
            'shape': 'round-rectangle',
            'background-color': '#06b6d4',
            'border-color': 'rgba(6, 182, 212, 0.5)'
          }
        },
        // Device Nodes
        {
          selector: 'node[type = "device"]',
          style: {
            'shape': 'diamond',
            'background-color': '#8b5cf6',
            'border-color': 'rgba(139, 92, 246, 0.5)',
            'width': 32,
            'height': 32
          }
        },
        // Email Nodes
        {
          selector: 'node[type = "email"]',
          style: {
            'shape': 'hexagon',
            'background-color': '#f59e0b',
            'border-color': 'rgba(245, 158, 11, 0.5)'
          }
        },
        // Kingpin Hub Node
        {
          selector: 'node[?is_kingpin]',
          style: {
            'border-color': '#fbbf24',
            'border-width': 4,
            'width': 38,
            'height': 38,
            'shadow-blur': 16,
            'shadow-color': '#f59e0b',
            'shadow-opacity': 0.8
          }
        },
        // Quarantined Node (PMLA Frozen)
        {
          selector: 'node[?is_quarantined]',
          style: {
            'background-color': '#7f1d1d',
            'border-color': '#ef4444',
            'border-width': 3,
            'border-style': 'dashed',
            'opacity': 0.9
          }
        },
        // Focus Highlight & Dim Classes
        {
          selector: 'node.highlighted',
          style: {
            'border-color': '#38bdf8',
            'border-width': 4,
            'shadow-blur': 18,
            'shadow-color': '#0284c7',
            'opacity': 1.0,
            'z-index': 99
          }
        },
        {
          selector: 'node.dimmed',
          style: {
            'opacity': 0.15
          }
        },
        // Edge Styling
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': 'rgba(255, 255, 255, 0.12)',
            'curve-style': 'bezier',
            'target-arrow-shape': 'none',
            'transition-property': 'opacity, line-color, width',
            'transition-duration': '0.3s'
          }
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': '#38bdf8',
            'width': 3,
            'opacity': 1.0,
            'z-index': 99
          }
        },
        {
          selector: 'edge.dimmed',
          style: {
            'opacity': 0.06
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#ffffff',
            'border-width': 4,
            'shadow-blur': 15,
            'shadow-color': '#6366f1'
          }
        }
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 60,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 80,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 300,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }
    });

    // Node click handler to show dossier in inspector card
    this.cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      this.displayNodeDetails(node.data());
    });

    // Tap on background resets highlight focus
    this.cy.on('tap', (evt) => {
      if (evt.target === this.cy) {
        this.resetFocus();
      }
    });
  },

  displayNodeDetails(data) {
    const detailBox = document.getElementById('networkSelectedNodeDetail');
    if (!detailBox) return;

    const riskColor = data.risk_score > 70 ? 'var(--risk-crit)' : (data.risk_score > 30 ? 'var(--risk-med)' : 'var(--risk-low)');
    const isQuarantined = data.is_quarantined;
    const isKingpin = data.is_kingpin;

    detailBox.innerHTML = `
      <div style="padding: 14px; background: rgba(8,12,24,0.6); border-radius: 8px; border: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="mono font-bold" style="color: var(--cyan); font-size: 13px;">${data.id}</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${isKingpin ? `<span style="background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: 700;">👑 KINGPIN</span>` : ''}
            ${isQuarantined ? `<span style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.4); font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: 700;">🔒 FROZEN</span>` : ''}
            <span class="risk-pill" style="color: ${riskColor}; border-color: ${riskColor};">${data.type.toUpperCase()}</span>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-top: 10px;">
          <div><span style="color: var(--text-dim);">Entity Risk:</span> <strong style="color: ${riskColor}">${data.risk_score}/100</strong></div>
          <div><span style="color: var(--text-dim);">Fraud Link:</span> <strong>${data.is_fraud ? 'CONFIRMED' : 'NORMAL'}</strong></div>
          <div><span style="color: var(--text-dim);">Degree Centrality:</span> <strong>${data.degree_centrality !== undefined ? data.degree_centrality : '--'}</strong></div>
          <div><span style="color: var(--text-dim);">Cluster / Ring:</span> <strong class="mono" style="color: #cbd5e1;">${data.cluster || 'UNASSIGNED'}</strong></div>
        </div>
        ${data.metadata?.amount ? `<div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">Protected Amount: <strong style="color: #fff">₹${Number(data.metadata.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>` : ''}
      </div>
    `;
  },

  renderClusters(clusters) {
    const container = document.getElementById('suspiciousClustersList');
    if (!container) return;

    if (!clusters || clusters.length === 0) {
      container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-dim); font-size: 12px;">No active fraud syndicates detected.</div>`;
      return;
    }

    container.innerHTML = clusters.map(c => {
      const isQuarantined = !!c.is_quarantined;
      const capitalINR = c.capital_at_risk_inr ? `₹${Number(c.capital_at_risk_inr).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00';
      const kingpinLabel = c.kingpin_node 
        ? `<div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%;">
             <span style="display: inline-flex; align-items: center; gap: 4px; color: #fbbf24; font-weight: 700; font-size: 11px;">
               <span>👑</span> Central Hub:
             </span>
             <span class="mono font-bold" style="color: #38bdf8; font-size: 11px;">${c.kingpin_node}</span>
             <span style="background: rgba(56,189,248,0.15); color: #38bdf8; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${c.kingpin_degree || 0} links</span>
           </div>`
        : 'Hub: Autonomous Distributed Ring';

      return `
        <div class="kpi-card cluster-item-card" 
             style="padding: 14px; margin-bottom: 14px; border-left: 4px solid ${isQuarantined ? '#ef4444' : 'var(--risk-crit)'}; cursor: pointer; transition: all 0.2s ease; background: var(--bg-card);"
             onclick="FraudNetwork.focusCluster('${c.cluster_id}')"
             title="Click to zoom & highlight this syndicate on graph canvas">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <strong style="color: #fff; font-size: 13px; line-height: 1.3; display: block;">${c.name}</strong>
              <div style="font-size: 10px; color: var(--text-dim); margin-top: 3px; display: flex; align-items: center; gap: 8px;">
                <span>ID: <strong class="mono" style="color: var(--cyan);">${c.cluster_id}</strong></span>
                <span style="color: #94a3b8;">•</span>
                <span style="color: ${c.severity === 'CRITICAL' ? 'var(--risk-crit)' : 'var(--risk-high)'}; font-weight: 700;">${c.severity || 'HIGH'} SEVERITY</span>
              </div>
            </div>
            ${isQuarantined 
              ? `<span class="badge-quarantined" style="background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.4); font-size: 10px; padding: 3px 8px; border-radius: 4px; font-weight: 700; white-space: nowrap;">🔒 QUARANTINED</span>` 
              : `<span class="nav-badge badge-red" style="font-size: 10px; padding: 3px 8px; font-weight: 700;">ACTIVE RING</span>`
            }
          </div>

          <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px; line-height: 1.4;">${c.description}</p>
          
          <div class="kingpin-badge" style="margin-bottom: 10px; background: rgba(15,23,42,0.6); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(251,191,36,0.3);">
            ${kingpinLabel}
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 10px; color: var(--text-dim); margin-bottom: 12px; background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <span>Cards: <strong style="color: #fff">${c.cards} Compromised</strong></span>
            <span>Devices: <strong style="color: #fff">${c.devices} Endpoints</strong></span>
            <span>Transactions: <strong style="color: #fff">${c.transactions} Flagged</strong></span>
            <span>Capital at Risk: <strong style="color: #ef4444">${capitalINR}</strong></span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <button type="button" class="btn-sm btn-secondary" style="font-size: 10px; padding: 5px 10px;" onclick="event.stopPropagation(); FraudNetwork.focusCluster('${c.cluster_id}')">
              🔍 Focus Topology
            </button>
            ${isQuarantined 
              ? `<span style="font-size: 10px; color: #10b981; font-weight: 700; display: flex; align-items: center; gap: 4px;">✓ PMLA Sec 12 (Akshar Patel)</span>`
              : `<button type="button" class="btn-dismantle-ring" style="background: #ef4444; color: #fff; font-size: 10px; font-weight: 700; padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer;" onclick="event.stopPropagation(); FraudNetwork.dismantleRing('${c.cluster_id}')">
                   🚨 Dismantle & Freeze
                 </button>`
            }
          </div>
        </div>
      `;
    }).join('');
  },

  focusCluster(clusterId) {
    if (!this.cy || !this.graphData) return;

    const cluster = (this.graphData.clusters || []).find(c => c.cluster_id === clusterId);
    if (!cluster || !cluster.member_nodes) return;

    const memberSet = new Set(cluster.member_nodes);

    this.cy.batch(() => {
      this.cy.nodes().forEach(n => {
        if (memberSet.has(n.id())) {
          n.addClass('highlighted');
          n.removeClass('dimmed');
        } else {
          n.removeClass('highlighted');
          n.addClass('dimmed');
        }
      });

      this.cy.edges().forEach(e => {
        if (memberSet.has(e.source().id()) && memberSet.has(e.target().id())) {
          e.addClass('highlighted');
          e.removeClass('dimmed');
        } else {
          e.removeClass('highlighted');
          e.addClass('dimmed');
        }
      });
    });

    const targetNodes = this.cy.nodes().filter(n => memberSet.has(n.id()));
    if (targetNodes.length > 0) {
      this.cy.animate({
        fit: {
          eles: targetNodes,
          padding: 60
        },
        duration: 500
      });
    }

    if (window.App && window.App.showToast) {
      window.App.showToast(`Focused Syndicate Ring ${clusterId} (${cluster.member_nodes.length} nodes highlighted)`, "info");
    }
  },

  resetFocus() {
    if (!this.cy) return;
    this.cy.batch(() => {
      this.cy.nodes().removeClass('highlighted').removeClass('dimmed');
      this.cy.edges().removeClass('highlighted').removeClass('dimmed');
    });
  },

  async dismantleRing(clusterId) {
    const cluster = (this.graphData.clusters || []).find(c => c.cluster_id === clusterId);
    const clusterName = cluster ? cluster.name : clusterId;

    const confirmed = confirm(
      `🚨 PMLA 2002 STATUTORY FREEZE DIRECTIVE\n\n` +
      `Are you sure you want to enforce an immediate preventive freeze on syndicate '${clusterName}' (${clusterId})?\n\n` +
      `This will quarantine all ${cluster?.member_nodes?.length || 'constituent'} payment cards, device fingerprints, and account credentials, and sign an immutable FIU-IND regulatory audit hash.`
    );
    if (!confirmed) return;

    try {
      const rationale = `Statutory preventive freeze under PMLA 2002 Section 12 & PML Rules 2005. High-velocity syndicate ring detected with Kingpin node ${cluster?.kingpin_node || 'Hub'}.`;
      const response = await API.quarantineSyndicateRing(clusterId, rationale);

      this.lastQuarantineDossier = response;

      // Update in-memory state
      if (cluster) {
        cluster.is_quarantined = true;
      }
      this.renderClusters(this.graphData.clusters);

      // Update Cytoscape nodes
      if (this.cy && response.quarantined_nodes) {
        const frozenSet = new Set(response.quarantined_nodes);
        this.cy.batch(() => {
          this.cy.nodes().forEach(n => {
            if (frozenSet.has(n.id())) {
              n.data('is_quarantined', true);
            }
          });
        });
      }

      // Display Freezing Directive Modal
      this.showQuarantineModal(response, cluster);

      if (window.App && window.App.showToast) {
        window.App.showToast(`🚨 Syndicate ${clusterId} dismantled! PMLA Freeze Directive signed.`, "success");
      }
    } catch (err) {
      console.error("Failed to dismantle syndicate:", err);
      alert(`Enforcement Error: ${err.message || 'Could not execute freeze directive.'}`);
    }
  },

  showQuarantineModal(res, cluster) {
    const modal = document.getElementById('syndicateQuarantineModal');
    if (!modal) return;

    const dirRef = document.getElementById('quarantineDirectiveRef');
    const clusterIdEl = document.getElementById('quarantineClusterId');
    const kingpinEl = document.getElementById('quarantineKingpinNode');
    const capitalEl = document.getElementById('quarantineCapitalProtected');
    const officerEl = document.getElementById('quarantineOfficerId');
    const rationaleEl = document.getElementById('quarantineRationaleText');
    const countEl = document.getElementById('quarantineEntitiesCount');
    const listEl = document.getElementById('quarantineEntitiesList');
    const hashEl = document.getElementById('quarantineAuditHash');

    if (dirRef) dirRef.textContent = res.directive_reference || 'DIR-PMLA-2026-ENF';
    if (clusterIdEl) clusterIdEl.textContent = `${res.cluster_id} (${res.cluster_name})`;
    if (kingpinEl) kingpinEl.textContent = res.kingpin_node || '--';
    if (capitalEl) capitalEl.textContent = `₹${Number(res.capital_at_risk_inr || 0).toLocaleString('en-IN')}`;
    if (officerEl) officerEl.textContent = res.directing_officer_id || 'OFFICER-ARGUS-01';
    if (rationaleEl) rationaleEl.textContent = res.statutory_rationale || 'Section 12, PMLA 2002';
    if (countEl) countEl.textContent = (res.quarantined_nodes || []).length;
    if (hashEl) hashEl.textContent = res.audit_hash_sha256 || '--';

    if (listEl) {
      listEl.innerHTML = (res.quarantined_nodes || []).map(nodeId => {
        let tagColor = '#94a3b8';
        if (nodeId.startsWith('card_') || nodeId.startsWith('CARD-')) tagColor = '#06b6d4';
        else if (nodeId.startsWith('dev_') || nodeId.startsWith('DFP-') || nodeId.startsWith('GW-')) tagColor = '#a855f7';
        else if (nodeId.startsWith('mail_') || nodeId.startsWith('EML-')) tagColor = '#f59e0b';
        else if (nodeId.startsWith('tx_') || nodeId.startsWith('TX-')) tagColor = '#ef4444';

        const isKingpin = (nodeId === res.kingpin_node);

        return `
          <span class="mono" style="font-size: 10px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; border: 1px solid ${isKingpin ? '#fbbf24' : 'rgba(255,255,255,0.1)'}; color: ${isKingpin ? '#fbbf24' : tagColor};">
            ${isKingpin ? '👑 ' : '🔒 '}${nodeId}
          </span>
        `;
      }).join('');
    }

    modal.classList.add('active');
  },

  downloadDirectiveDossier() {
    if (!this.lastQuarantineDossier) {
      alert("No active directive dossier to download.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.lastQuarantineDossier, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `PMLA_Freeze_Directive_${this.lastQuarantineDossier.directive_reference}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  bindControls() {
    const filterBtns = document.querySelectorAll('.net-filter-btn');
    filterBtns.forEach(btn => {
      btn.onclick = () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.type;
        if (this.graphData) {
          this.renderGraph(this.graphData.elements);
        }
      };
    });

    const resetZoomBtn = document.getElementById('netResetZoomBtn');
    if (resetZoomBtn) {
      resetZoomBtn.onclick = () => {
        this.resetFocus();
        if (this.cy) this.cy.fit();
      };
    }
  },

  addLiveEntity(tx) {
    if (!this.cy) return;
    try {
      const cardId = `CARD-${(tx.card4 || 'VISA').toUpperCase()}-${tx.card1 || 4821}`;
      const devStr = (tx.device_info || 'WIN11').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'WIN11';
      const devId = `DFP-${devStr}-${String(tx.transaction_id || '999').slice(-3)}`;
      const txId = `TX-${tx.transaction_id || '999'}`;
      const amountINR = tx.amount_inr || (tx.transaction_amount ? (tx.transaction_amount * 83).toFixed(2) : '4,250.00');

      const newElements = [];
      if (!this.cy.getElementById(txId).length) {
        newElements.push({
          group: 'nodes',
          data: {
            id: txId,
            label: `TX ${tx.transaction_id}\n₹${Number(amountINR).toLocaleString('en-IN')}`,
            type: 'transaction',
            risk_score: tx.risk_score || 85,
            metadata: { amount: amountINR }
          }
        });
      }
      if (!this.cy.getElementById(cardId).length) {
        newElements.push({
          group: 'nodes',
          data: {
            id: cardId,
            label: cardId,
            type: 'card',
            risk: tx.risk_level || 'HIGH'
          }
        });
      }
      if (!this.cy.getElementById(devId).length) {
        newElements.push({
          group: 'nodes',
          data: {
            id: devId,
            label: devId.toUpperCase(),
            type: 'device',
            risk: tx.risk_level || 'HIGH'
          }
        });
      }

      if (newElements.length > 0) {
        this.cy.add(newElements);
        const edge1Id = `e_${txId}_${cardId}`;
        const edge2Id = `e_${txId}_${devId}`;
        if (!this.cy.getElementById(edge1Id).length) {
          this.cy.add({ group: 'edges', data: { id: edge1Id, source: txId, target: cardId, weight: 1.5 } });
        }
        if (!this.cy.getElementById(edge2Id).length) {
          this.cy.add({ group: 'edges', data: { id: edge2Id, source: txId, target: devId, weight: 1.5 } });
        }
      }
    } catch (e) {
      console.warn("Could not dynamically append entity to network:", e);
    }
  },

  updateTheme(theme = 'dark') {
    if (!this.cy) return;
    const isLight = theme === 'light';
    try {
      this.cy.style()
        .selector('node')
        .style({
          'color': isLight ? '#0f172a' : '#cbd5e1',
          'border-color': isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'
        })
        .selector('edge')
        .style({
          'line-color': isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.12)'
        })
        .update();
    } catch (e) {
      console.warn("Cytoscape theme update skipped:", e);
    }
  }
};
