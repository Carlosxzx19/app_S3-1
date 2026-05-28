"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Settings,
  LogOut,
  Activity,
  HeartPlus,
  Stethoscope,
  Thermometer,
  ZodiacAries,
  TriangleAlert,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  Battery,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  HeartRateChart,
  SpO2Chart,
  TemperatureChart,
  RespiratoryRateChart,
  ExpandedChartView,
  ChartKey,
} from "@/components/ui/area_chart";
import { MedicalHistoryDashboard } from "@/components/ui/medical_history";
import { useMqttData } from "@/hooks/useMqttData";
import type { SensorDataPoint } from "@/hooks/useMqttData";

function EditableLimit({ initialValue, unit }: { initialValue: string; unit: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [tempValue, setTempValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setValue(tempValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 text-text-primary text-sm font-medium">
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-10 bg-transparent border-b border-accent-main outline-none text-center"
        />
        <span>{unit}</span>
      </div>
    );
  }

  return (
    <span
      onDoubleClick={() => setIsEditing(true)}
      className="text-text-primary text-sm font-medium cursor-text hover:bg-accent-main/10 px-1 rounded transition-colors"
      title="Doble clic para editar"
    >
      {value}{unit ? ` ${unit}` : ""}
    </span>
  );
}

/* ─── Status Bar ─────────────────────────────────────────────── */
type StatusLevel = "stable" | "warning" | "critical";

function computeStatus(latest: SensorDataPoint | null): StatusLevel {
  if (!latest) return "stable";

  const hr = latest.heartRate ?? 0;
  const spo2 = latest.spo2 ?? 0;
  const temp = latest.temperature ?? 0;
  const rr = latest.respiratoryRate ?? 0;

  // Critical thresholds (absolute danger)
  if (hr >= 130 || hr <= 35 || spo2 <= 85 || temp >= 41 || temp <= 34.5 || rr >= 35 || rr <= 6)
    return "critical";

  // Warning thresholds (approaching limits or low)
  if (hr >= 100 || hr <= 50 || spo2 <= 92 || temp >= 38.5 || temp <= 35.5 || rr >= 25 || rr <= 10)
    return "warning";

  return "stable";
}

/* ─── MQTT Connection Indicator ──────────────────────────────── */
function MqttStatusIndicator({ isReceiving, connectionStatus }: { isReceiving: boolean; connectionStatus: string }) {
  const isConnected = connectionStatus === "connected";
  const showGreen = isConnected && isReceiving;

  const dotColor = showGreen ? "#22c55e" : "#eab308";
  const bgColor = showGreen ? "rgba(34,197,94,0.10)" : "rgba(234,179,8,0.10)";
  const borderColor = showGreen ? "rgba(34,197,94,0.35)" : "rgba(234,179,8,0.35)";
  const label = showGreen ? "Recibiendo datos" : isConnected ? "Esperando datos…" : connectionStatus === "connecting" ? "Conectando…" : "Desconectado";
  const Icon = isConnected ? Wifi : WifiOff;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "5px 14px",
        borderRadius: "999px",
        background: bgColor,
        border: `1px solid ${borderColor}`,
        transition: "all 0.4s ease",
        flexShrink: 0,
      }}
    >
      {/* Pulsing dot */}
      <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "10px", height: "10px", flexShrink: 0 }}>
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: dotColor,
            opacity: 0.4,
            animation: "mqttPulse 2s ease-in-out infinite",
          }}
        />
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: dotColor, position: "relative", zIndex: 1 }} />
      </span>

      <Icon size={13} style={{ color: dotColor, flexShrink: 0 }} />

      <span style={{
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: dotColor,
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>

      <style>{`
        @keyframes mqttPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function BatteryIndicator({ batteryPercentage, isConnected }: { batteryPercentage: number | null, isConnected: boolean }) {
  if (!isConnected || batteryPercentage === null) return null;

  let color = "#ef4444"; // red
  let bgColor = "rgba(239, 68, 68, 0.1)";
  let borderColor = "rgba(239, 68, 68, 0.3)";

  if (batteryPercentage >= 40) {
    color = "#22c55e"; // green
    bgColor = "rgba(34, 197, 94, 0.1)";
    borderColor = "rgba(34, 197, 94, 0.3)";
  } else if (batteryPercentage >= 20) {
    color = "#eab308"; // yellow
    bgColor = "rgba(234, 179, 8, 0.1)";
    borderColor = "rgba(234, 179, 8, 0.3)";
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 12px",
        borderRadius: "999px",
        background: bgColor,
        border: `1px solid ${borderColor}`,
        transition: "all 0.4s ease",
        flexShrink: 0,
      }}
    >
      <Battery size={14} style={{ color }} />
      <span style={{
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        color,
      }}>
        {batteryPercentage}%
      </span>
    </div>
  );
}

const STATUS_CONFIG = {
  stable: {
    label: "Estable",
    sublabel: "Todos los parámetros dentro del rango normal",
    bg: "rgba(74, 170, 100, 0.13)",
    border: "rgba(74, 170, 100, 0.45)",
    dot: "#4AAA64",
    text: "#2e7a48",
    darkText: "#6ed494",
    glow: "rgba(74, 170, 100, 0.18)",
  },
  warning: {
    label: "Precaución",
    sublabel: "Algún parámetro se acerca al límite o está bajo",
    bg: "rgba(230, 165, 30, 0.13)",
    border: "rgba(230, 165, 30, 0.50)",
    dot: "#E6A51E",
    text: "#9a6b00",
    darkText: "#f0c050",
    glow: "rgba(230, 165, 30, 0.18)",
  },
  critical: {
    label: "Crítico",
    sublabel: "Parámetro fuera de rango — atención inmediata",
    bg: "rgba(220, 60, 60, 0.13)",
    border: "rgba(220, 60, 60, 0.50)",
    dot: "#DC3C3C",
    text: "#9a1c1c",
    darkText: "#f07070",
    glow: "rgba(220, 60, 60, 0.18)",
  },
};

function StatusBar({ isDark, latestData }: { isDark: boolean; latestData: SensorDataPoint | null }) {
  const level = computeStatus(latestData);
  const cfg = STATUS_CONFIG[level];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "7px 18px",
        borderRadius: "999px",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 12px 0 ${cfg.glow}`,
        transition: "all 0.4s ease",
        flexShrink: 0,
      }}
    >
      {/* Animated dot */}
      <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "12px", height: "12px", flexShrink: 0 }}>
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: cfg.dot,
            opacity: 0.35,
            animation: level !== "stable" ? "statusPulse 1.6s ease-in-out infinite" : "statusPulse 3s ease-in-out infinite",
          }}
        />
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.dot, position: "relative", zIndex: 1 }} />
      </span>

      {/* Labels */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: isDark ? cfg.darkText : cfg.text,
          transition: "color 0.3s",
        }}>
          {cfg.label}
        </span>
        <span style={{ width: "1px", height: "12px", background: cfg.border, flexShrink: 0 }} />
        <span style={{
          fontSize: "11px",
          fontWeight: 400,
          color: isDark ? cfg.darkText + "cc" : cfg.text + "cc",
          transition: "color 0.3s",
        }}>
          {cfg.sublabel}
        </span>
      </div>

      <style>{`
        @keyframes statusPulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function Dashboard() {
  const [selectedChart, setSelectedChart] = useState<ChartKey | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { chartData, connectionStatus, isReceivingData, batteryPercentage } = useMqttData();
  const latestDataPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const handleChartClick = (key: ChartKey) => {
    setSelectedChart((prev) => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-dashboard transition-colors duration-300">
      {showHistory && <MedicalHistoryDashboard onClose={() => setShowHistory(false)} />}

      {/* ─── Top Patient Info Bar ─── */}
      <div className="w-full bg-bg-panel border-b border-border-default px-6 py-2 flex items-center justify-between sticky top-0 z-10 transition-colors">
        {/* Left: patient info */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Paciente:</span>
            <span className="text-text-primary font-medium text-xs">Ronald Martínez</span>
          </div>

          <div className="w-px h-4 bg-border-default" />

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Edad:</span>
            <span className="text-text-primary font-medium text-xs">35 años</span>
          </div>

          <div className="w-px h-4 bg-border-default" />

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">C.C:</span>
            <span className="text-text-primary font-medium text-xs">1003156789</span>
          </div>

          <div className="w-px h-4 bg-border-default" />

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Sexo:</span>
            <span className="text-text-primary font-medium text-xs">Masculino</span>
          </div>

          <div className="w-px h-4 bg-border-default" />

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Sala:</span>
            <span className="text-text-primary font-medium text-xs">302</span>
          </div>

          <div className="w-px h-4 bg-border-default" />

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Camilla:</span>
            <span className="text-text-primary font-medium text-xs">2</span>
          </div>

          <div className="w-px h-4 bg-border-default" />
        </div>

        {/* Ingreso */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Fecha:</span>
          <span className="text-text-primary font-medium text-xs">19/04/2026</span>
        </div>

        <div className="w-px h-4 bg-border-default" />

        {/* Right: doctor profile */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-accent-main/60 flex-shrink-0">
            <Image
              src="/doctor.jpg"
              alt="Doctor"
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Médico:</span>
            <span className="text-text-primary font-medium text-xs">Dr. Victor Olivero</span>
          </div>
        </div>
      </div>

      {/* ─── Body (sidebar + content) ─── */}
      <div className="flex flex-1">

        {/* ─── Thin Sidebar ─── */}
        <aside className="w-16 bg-bg-panel flex flex-col items-center py-6 justify-between border-r border-border-default transition-colors">
          <div className="flex flex-col items-center gap-6">
            <Image
              src="/logo2.png"
              alt="Visual Health Logo"
              width={36}
              height={36}
              className="drop-shadow-lg"
            />

            <div className="w-8 h-px bg-border-default" />

            <button
              className="w-10 h-10 rounded-xl bg-accent-main/20 flex items-center justify-center text-accent-hover hover:bg-accent-main/30 transition-colors cursor-pointer"
              title="Monitoreo"
            >
              <Activity size={20} />
            </button>

            <button
              onClick={() => setShowHistory(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:bg-accent-main/10 hover:text-accent-hover transition-colors cursor-pointer"
              title="Historial Médico"
            >
              <FileText size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:bg-accent-main/10 hover:text-accent-hover transition-colors cursor-pointer"
              title="Alternar Tema"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:bg-accent-main/10 hover:text-accent-hover transition-colors cursor-pointer"
              title="Configuración"
            >
              <Settings size={20} />
            </button>

            <Link
              href="/"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={20} />
            </Link>
          </div>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="flex-1 p-8 flex flex-col">
          {/* Header */}
          <header className="mb-6 flex flex-col gap-3">
            {/* Row 1: title + limits */}
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight transition-colors">
                Monitoreo Visual Health
              </h1>

              {/* Alert bar */}
              <div className="bg-bg-alert border border-accent-main/30 rounded-full px-6 py-2 flex items-center gap-5 shadow-sm transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-text-primary text-sm font-medium">Limites de Parametros</span>
                  <TriangleAlert size={22} className="text-[#f5a105ff]" />
                </div>
                <div className="w-px h-4 bg-accent-main/40" />

                <div className="flex items-center gap-1.5">
                  <HeartPlus size={20} className="text-[#F24E43]" />
                  <EditableLimit initialValue="95" unit="bpm" />
                </div>

                <div className="w-px h-4 bg-accent-main/40" />

                <div className="flex items-center gap-1.5">
                  <ZodiacAries size={20} className="text-[#4A90D9]" />
                  <EditableLimit initialValue="80" unit="%" />
                </div>

                <div className="w-px h-4 bg-accent-main/40" />

                <div className="flex items-center gap-1.5">
                  <Thermometer size={20} className="text-[#E4A32C]" />
                  <EditableLimit initialValue="40.5" unit="ºC" />
                </div>

                <div className="w-px h-4 bg-accent-main/40" />

                <div className="flex items-center gap-1.5">
                  <Stethoscope size={20} className="text-[#4EBFB3]" />
                  <EditableLimit initialValue="30" unit="ipm" />
                </div>
              </div>
            </div>

            {/* Row 2: Status bar + MQTT indicator */}
            <div className="flex items-center gap-4">
              <StatusBar isDark={isDark} latestData={latestDataPoint} />
              <MqttStatusIndicator isReceiving={isReceivingData} connectionStatus={connectionStatus} />
              <BatteryIndicator batteryPercentage={batteryPercentage} isConnected={connectionStatus === "connected"} />
            </div>
          </header>

          {/* ─── Charts Row ─── */}
          <div className="flex gap-6 flex-1 min-h-0">

            {/* Small chart columns */}
            <div className="flex gap-6 flex-shrink-0">
              {/* Column 1 */}
              <div className="flex flex-col gap-6">
                <HeartRateChart
                  onClick={() => handleChartClick("heartRate")}
                  isSelected={selectedChart === "heartRate"}
                  data={chartData}
                  isConnected={connectionStatus === "connected"}
                />
                <SpO2Chart
                  onClick={() => handleChartClick("spo2")}
                  isSelected={selectedChart === "spo2"}
                  data={chartData}
                  isConnected={connectionStatus === "connected"}
                />
              </div>

              {/* Column 2 */}
              <div className="flex flex-col gap-6">
                <TemperatureChart
                  onClick={() => handleChartClick("temperature")}
                  isSelected={selectedChart === "temperature"}
                  data={chartData}
                  isConnected={connectionStatus === "connected"}
                />
                <RespiratoryRateChart
                  onClick={() => handleChartClick("respiratoryRate")}
                  isSelected={selectedChart === "respiratoryRate"}
                  data={chartData}
                  isConnected={connectionStatus === "connected"}
                />
              </div>
            </div>

            {/* ─── Expanded Chart Panel ─── */}
            {selectedChart ? (
              <ExpandedChartView
                key={selectedChart}
                chartKey={selectedChart}
                onClose={() => setSelectedChart(null)}
                data={chartData}
              />
            ) : (
              /* Placeholder when nothing is selected */
              <div className="flex-1 rounded-sm border border-dashed border-border-default flex flex-col items-center justify-center gap-3 text-center px-6 transition-colors">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-text-muted transition-colors" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <p className="text-text-muted text-xs font-medium uppercase tracking-widest transition-colors">
                  Selecciona una gráfica para expandirla
                </p>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
