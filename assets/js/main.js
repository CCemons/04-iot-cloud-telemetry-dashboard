/**
 * Controlador principal del Dashboard Cloud SCADA IoT.
 */

(function () {
  "use strict";

  const { SimulatorEngine, NODES } = window.IoTSimulator;
  const { drawTimeSeries, drawHealthGauge } = window.IoTCharts;

  const engine = new SimulatorEngine();
  let activeNodeId = NODES[0].id;
  let running = true;
  let timerId = null;
  const alerts = [];
  const consoleLines = [];

  const thresholdPrimaryInput = document.getElementById("threshold-primary");
  const thresholdRssiInput = document.getElementById("threshold-rssi");

  function getActiveNode() {
    return NODES.find((n) => n.id === activeNodeId) || NODES[0];
  }

  function renderNodeSidebar() {
    const list = document.getElementById("node-list");
    list.innerHTML = "";
    NODES.forEach((node) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `node-btn ${node.id === activeNodeId ? "active" : ""}`;

      const strong = document.createElement("strong");
      strong.textContent = node.name;
      const span = document.createElement("span");
      span.textContent = node.firmware;
      btn.append(strong, span);

      btn.addEventListener("click", () => {
        activeNodeId = node.id;
        thresholdPrimaryInput.value = node.defaultThreshold;
        renderNodeSidebar();
        renderActiveView();
      });
      list.appendChild(btn);
    });
  }

  function evaluateAlerts(node, sample) {
    const limitPrimary = Number(thresholdPrimaryInput.value);
    const minRssi = Number(thresholdRssiInput.value);
    let triggered = false;

    if (node.thresholdRule === "below" && sample.primary < limitPrimary) {
      pushAlert(node, `${node.primaryLabel} baja: ${sample.primary}${node.primaryUnit} (< ${limitPrimary})`);
      triggered = true;
    } else if (node.thresholdRule === "above" && sample.primary > limitPrimary) {
      pushAlert(node, `${node.primaryLabel} elevada: ${sample.primary}${node.primaryUnit} (> ${limitPrimary})`);
      triggered = true;
    }

    if (sample.rssi < minRssi) {
      pushAlert(node, `Señal RF débil en ${node.id}: ${sample.rssi} dBm (< ${minRssi} dBm)`);
      triggered = true;
    }
    return triggered;
  }

  function pushAlert(node, message) {
    const time = new Date().toLocaleTimeString();
    alerts.unshift({ time, node: node.id, message });
    if (alerts.length > 20) alerts.pop();
  }

  function renderKPIs(node, history) {
    const grid = document.getElementById("kpi-grid");
    grid.innerHTML = "";
    if (history.length === 0) return;

    const latest = history[history.length - 1];
    const prev = history[Math.max(0, history.length - 2)];

    const items = [
      {
        label: node.primaryLabel,
        value: `${latest.primary} ${node.primaryUnit}`,
        delta: latest.primary - prev.primary
      },
      {
        label: node.secondaryLabel,
        value: `${latest.secondary} ${node.secondaryUnit}`,
        delta: latest.secondary - prev.secondary
      },
      {
        label: node.tertiaryLabel,
        value: `${latest.tertiary} ${node.tertiaryUnit}`,
        delta: latest.tertiary - prev.tertiary
      },
      {
        label: "Intensidad Señal (RSSI)",
        value: `${latest.rssi} dBm`,
        delta: latest.rssi - prev.rssi
      }
    ];

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "kpi-card";

      const lbl = document.createElement("span");
      lbl.className = "kpi-label";
      lbl.textContent = item.label;

      const val = document.createElement("strong");
      val.className = "kpi-value";
      val.textContent = item.value;

      const sign = item.delta >= 0 ? "+" : "";
      const delta = document.createElement("span");
      delta.className = `kpi-delta ${item.delta < 0 ? "down" : ""}`;
      delta.textContent = `${sign}${item.delta.toFixed(2)} vs muestra previa`;

      card.append(lbl, val, delta);
      grid.appendChild(card);
    });
  }

  function renderAlerts() {
    const list = document.getElementById("alert-list");
    const count = document.getElementById("alert-count");
    list.innerHTML = "";
    count.textContent = `${alerts.length} alertas`;

    if (alerts.length === 0) {
      const li = document.createElement("li");
      li.className = "alert-item ok";
      li.textContent = "Sin alertas activas. Todos los nodos operan dentro de rango.";
      list.appendChild(li);
      return;
    }

    alerts.forEach((a) => {
      const li = document.createElement("li");
      li.className = "alert-item";
      const timeSpan = document.createElement("span");
      timeSpan.className = "alert-time";
      timeSpan.textContent = `${a.time} · ${a.node}`;
      const msg = document.createTextNode(a.message);
      li.append(timeSpan, msg);
      list.appendChild(li);
    });
  }

  function renderActiveView() {
    const node = getActiveNode();
    const history = engine.getHistory(node.id);
    const latest = history[history.length - 1];

    document.getElementById("active-node-title").textContent = node.name;
    document.getElementById("active-node-meta").textContent = `Topic: ${node.topic} · ${node.firmware}`;

    renderKPIs(node, history);
    drawTimeSeries(document.getElementById("timeseries-canvas"), history, node);

    const hasAlert = latest ? evaluateAlerts(node, latest) : false;
    drawHealthGauge(document.getElementById("gauge-canvas"), latest ? latest.rssi : -60, hasAlert);

    const gStats = document.getElementById("gauge-stats");
    gStats.textContent = latest
      ? `RSSI: ${latest.rssi} dBm | Muestras en búfer: ${history.length}/40`
      : "Inicializando...";

    renderAlerts();
  }

  function stepSimulation() {
    const snapshots = engine.tickAll();
    const node = getActiveNode();
    const current = snapshots[node.id];

    const line = `[${new Date().toLocaleTimeString()}] PUB ${node.topic} -> ${JSON.stringify(current)}`;
    consoleLines.unshift(line);
    if (consoleLines.length > 18) consoleLines.pop();
    document.getElementById("mqtt-console").textContent = consoleLines.join("\n");

    renderActiveView();
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Controles de la barra superior
  document.getElementById("btn-toggle-stream").addEventListener("click", (e) => {
    running = !running;
    const badge = document.getElementById("stream-status");
    if (running) {
      badge.textContent = "● EN VIVO";
      badge.classList.remove("paused");
      e.target.textContent = "Pausar";
      timerId = setInterval(stepSimulation, 1400);
    } else {
      badge.textContent = "❚❚ PAUSADO";
      badge.classList.add("paused");
      e.target.textContent = "Reanudar";
      clearInterval(timerId);
    }
  });

  document.getElementById("btn-inject-anomaly").addEventListener("click", () => {
    engine.injectAnomaly(activeNodeId);
    stepSimulation();
  });

  document.getElementById("btn-clear-console").addEventListener("click", () => {
    consoleLines.length = 0;
    document.getElementById("mqtt-console").textContent = "";
  });

  document.getElementById("btn-export-csv").addEventListener("click", () => {
    const node = getActiveNode();
    const rows = engine.getHistory(node.id);
    const header = "timestamp,nodeId,primary,secondary,tertiary,rssi,anomaly";
    const body = rows.map(
      (r) => `${r.timestamp},${r.nodeId},${r.primary},${r.secondary},${r.tertiary},${r.rssi},${r.anomaly}`
    );
    downloadFile(`${node.id}-telemetry.csv`, [header, ...body].join("\n"), "text/csv;charset=utf-8");
  });

  document.getElementById("btn-export-json").addEventListener("click", () => {
    const node = getActiveNode();
    const rows = engine.getHistory(node.id);
    downloadFile(`${node.id}-telemetry.json`, JSON.stringify(rows, null, 2), "application/json");
  });

  // Inicialización con algunas muestras de arranque
  renderNodeSidebar();
  for (let i = 0; i < 12; i++) {
    engine.tickAll();
  }
  stepSimulation();
  timerId = setInterval(stepSimulation, 1400);
})();
