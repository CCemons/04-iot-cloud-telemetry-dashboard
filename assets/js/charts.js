/**
 * Motor propio de graficación HTML5 Canvas 2D sin dependencias externas.
 * Renderiza series temporales suavizadas con gradiente y medidores circulares (Gauges).
 */

window.IoTCharts = (function () {
  "use strict";

  function drawTimeSeries(canvas, history, nodeConfig) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 46;
    const padRight = 18;
    const padTop = 32;
    const padBottom = 26;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Rejilla horizontal
    ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
    }

    if (!history || history.length < 2) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px Segoe UI, sans-serif";
      ctx.fillText("Esperando muestras del nodo...", padLeft + 20, h / 2);
      return;
    }

    const pValues = history.map((d) => d.primary);
    const sValues = history.map((d) => d.secondary);

    const minP = Math.min(...pValues) * 0.92;
    const maxP = Math.max(...pValues) * 1.08 + 0.01;
    const minS = Math.min(...sValues) * 0.92;
    const maxS = Math.max(...sValues) * 1.08 + 0.01;

    // Etiquetas eje Y primario
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px Consolas, monospace";
    ctx.fillText(maxP.toFixed(1), 6, padTop + 4);
    ctx.fillText(((maxP + minP) / 2).toFixed(1), 6, padTop + plotH / 2 + 4);
    ctx.fillText(minP.toFixed(1), 6, padTop + plotH);

    function plotSeries(values, minV, maxV, strokeColor, fillGradient) {
      const pts = values.map((val, i) => {
        const x = padLeft + (i / (values.length - 1)) * plotW;
        const norm = (val - minV) / (maxV - minV || 1);
        const y = padTop + plotH - Math.max(0, Math.min(1, norm)) * plotH;
        return { x, y };
      });

      if (fillGradient) {
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        grad.addColorStop(0, "rgba(6, 182, 212, 0.28)");
        grad.addColorStop(1, "rgba(6, 182, 212, 0.0)");
        ctx.beginPath();
        ctx.moveTo(pts[0].x, padTop + plotH);
        pts.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.lineTo(pts[pts.length - 1].x, padTop + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.4;
      pts.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Punto final destacado
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
    }

    plotSeries(pValues, minP, maxP, "#06b6d4", true);
    plotSeries(sValues, minS, maxS, "#10b981", false);

    // Leyenda superior
    ctx.font = "12px Consolas, monospace";
    ctx.fillStyle = "#06b6d4";
    ctx.fillText(`━ ${nodeConfig.primaryLabel} (${nodeConfig.primaryUnit})`, padLeft, 18);
    ctx.fillStyle = "#10b981";
    ctx.fillText(`━ ${nodeConfig.secondaryLabel} (${nodeConfig.secondaryUnit})`, padLeft + 240, 18);
  }

  function drawHealthGauge(canvas, rssi, hasAlert) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Convertir RSSI (-100 dBm .. -40 dBm) a calidad 0..100%
    const linkQuality = Math.max(0, Math.min(100, Math.round(((rssi + 100) / 60) * 100)));
    const score = hasAlert ? Math.min(linkQuality, 45) : linkQuality;

    const cx = w / 2;
    const cy = h * 0.68;
    const radius = Math.min(w, h) * 0.48;

    // Arco de fondo
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    ctx.stroke();

    // Arco activo
    const endAngle = Math.PI + (score / 100) * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, endAngle);
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.strokeStyle = hasAlert ? "#ef4444" : score > 65 ? "#10b981" : "#f59e0b";
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.font = "bold 30px Consolas, monospace";
    ctx.fillText(`${score}%`, cx, cy - 16);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.fillText(hasAlert ? "Estado: ALERTA ACTIVA" : "Estado: Enlace Saludable", cx, cy + 12);
    ctx.textAlign = "left";
  }

  return { drawTimeSeries, drawHealthGauge };
})();
