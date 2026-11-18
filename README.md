# IoT Cloud Telemetry Dashboard (SCADA Web SPA)

Aplicación web interactiva estilo centro de control industrial (**SCADA / IoT Cloud**) construida con **HTML5**, **CSS3** y **JavaScript modular** para supervisar múltiples nodos de hardware (Arduino, Raspberry Pi, ESP32) en tiempo real.

---

## Características Principales

- **4 Nodos IoT Multi-Dominio**:
  - `Nodo 01`: Invernadero Arduino (Humedad de suelo, Temperatura, Nivel de tanque).
  - `Nodo 02`: Gateway Raspberry Pi 5 (Temperatura SoC, Carga CPU, RAM).
  - `Nodo 03`: Estación Meteorológica ESP32 (Temperatura exterior, Humedad, Batería).
  - `Nodo 04`: Monitor de Red Eléctrica Modbus (Potencia Activa W, Tensión RMS, Factor de Potencia).
- **Motor Gráfico Propio en Canvas 2D**: Gráficas de series de tiempo con gradiente y medidor circular (Gauge) de salud/RSSI sin depender de librerías externas ni CDNs.
- **Inyector de Anomalías y Reglas de Alerta**: Permite configurar umbrales y simular fallas de sensores o caídas de señal RF (`RSSI`).
- **Inspector MQTT y Exportación Real**: Visualiza los payloads JSON entrantes y descarga el historial capturado en formato **CSV** o **JSON**.

---

## Cómo Probar

Abre [`index.html`](index.html) directamente en cualquier navegador moderno o despliégalo en **GitHub Pages** sin pasos de compilación.

---

## Autor

**Camilo Castañeda** · Proyecto Open Source bajo licencia **MIT**.
