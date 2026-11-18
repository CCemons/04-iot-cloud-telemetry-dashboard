/**
 * Motor de simulación de telemetría multi-nodo IoT con ruido gaussiano,
 * variaciones cíclicas y soporte para inyección controlada de anomalías.
 */

window.IoTSimulator = (function () {
  "use strict";

  const NODES = [
    {
      id: "agro-nano-01",
      name: "Nodo 01: Invernadero Arduino",
      topic: "iot/agro-nano-01/telemetry",
      firmware: "Arduino Nano · FSM v1.0",
      defaultThreshold: 32,
      thresholdRule: "below", // Alerta si primary < threshold
      primaryLabel: "Humedad Suelo",
      primaryUnit: "%",
      secondaryLabel: "Temperatura Aire",
      secondaryUnit: "°C",
      tertiaryLabel: "Nivel Tanque",
      tertiaryUnit: "%",
      basePrimary: 48,
      baseSecondary: 24.5,
      baseTertiary: 82
    },
    {
      id: "rpi5-edge-02",
      name: "Nodo 02: Gateway Raspberry Pi 5",
      topic: "iot/rpi5-edge-02/telemetry",
      firmware: "Raspberry Pi OS · HAL v1.0",
      defaultThreshold: 70,
      thresholdRule: "above", // Alerta si primary > threshold
      primaryLabel: "Temp. SoC CPU",
      primaryUnit: "°C",
      secondaryLabel: "Carga CPU",
      secondaryUnit: "%",
      tertiaryLabel: "Uso RAM",
      tertiaryUnit: "%",
      basePrimary: 51,
      baseSecondary: 26,
      baseTertiary: 38
    },
    {
      id: "meteo-esp32-03",
      name: "Nodo 03: Estación Meteorológica ESP32",
      topic: "iot/meteo-esp32-03/telemetry",
      firmware: "ESP32-WROOM · WiFi/MQTT",
      defaultThreshold: 35,
      thresholdRule: "above",
      primaryLabel: "Temperatura Ext.",
      primaryUnit: "°C",
      secondaryLabel: "Humedad Relativa",
      secondaryUnit: "%",
      tertiaryLabel: "Voltaje Batería",
      tertiaryUnit: "V",
      basePrimary: 26.2,
      baseSecondary: 62,
      baseTertiary: 4.08
    },
    {
      id: "power-mon-04",
      name: "Nodo 04: Monitor de Red Eléctrica",
      topic: "iot/power-mon-04/telemetry",
      firmware: "ESP32 + PZEM-004T · Modbus",
      defaultThreshold: 1850,
      thresholdRule: "above",
      primaryLabel: "Potencia Activa",
      primaryUnit: "W",
      secondaryLabel: "Tensión RMS",
      secondaryUnit: "V",
      tertiaryLabel: "Factor Potencia",
      tertiaryUnit: "PF",
      basePrimary: 1120,
      baseSecondary: 120.4,
      baseTertiary: 0.96
    }
  ];

  // Generador Box-Muller para ruido gaussiano realista
  function gaussianNoise(stdDev) {
    const u1 = Math.max(1e-7, Math.random());
    const u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * stdDev;
  }

  class SimulatorEngine {
    constructor() {
      this.step = 0;
      this.history = {};
      this.anomalyStepsRemaining = {};
      NODES.forEach((n) => {
        this.history[n.id] = [];
        this.anomalyStepsRemaining[n.id] = 0;
      });
    }

    getNodes() {
      return NODES;
    }

    injectAnomaly(nodeId) {
      this.anomalyStepsRemaining[nodeId] = 5;
    }

    tickAll() {
      this.step += 1;
      const nowIso = new Date().toISOString();
      const snapshots = {};

      NODES.forEach((node, idx) => {
        const hasAnomaly = this.anomalyStepsRemaining[node.id] > 0;
        if (hasAnomaly) {
          this.anomalyStepsRemaining[node.id] -= 1;
        }

        const wave = Math.sin(this.step * 0.22 + idx);
        let primary = node.basePrimary + wave * (node.basePrimary * 0.08) + gaussianNoise(node.basePrimary * 0.015);
        let secondary = node.baseSecondary + Math.cos(this.step * 0.17 + idx) * (node.baseSecondary * 0.06) + gaussianNoise(node.baseSecondary * 0.012);
        let tertiary = node.baseTertiary + gaussianNoise(node.baseTertiary * 0.008);
        let rssi = Math.round(-60 + wave * 6 + gaussianNoise(2.2));

        if (hasAnomaly) {
          if (node.thresholdRule === "below") {
            primary = Math.max(8, node.defaultThreshold - 11.5);
          } else {
            primary = node.defaultThreshold + node.basePrimary * 0.35;
          }
          rssi = -89;
        }

        const sample = {
          timestamp: nowIso,
          nodeId: node.id,
          primary: Number(primary.toFixed(2)),
          secondary: Number(secondary.toFixed(2)),
          tertiary: Number(tertiary.toFixed(2)),
          rssi,
          anomaly: hasAnomaly
        };

        const buf = this.history[node.id];
        buf.push(sample);
        if (buf.length > 40) {
          buf.shift();
        }
        snapshots[node.id] = sample;
      });

      return snapshots;
    }

    getHistory(nodeId) {
      return this.history[nodeId] || [];
    }
  }

  return { SimulatorEngine, NODES };
})();
