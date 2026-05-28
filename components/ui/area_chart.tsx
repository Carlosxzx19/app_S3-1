"use client"

import * as React from "react"
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import type { SensorDataPoint } from "@/hooks/useMqttData"
import { Wind, Thermometer, Maximize2, HeartPlus, Activity } from "lucide-react"

export type { SensorDataPoint }
export type ChartKey = "heartRate" | "spo2" | "temperature" | "respiratoryRate"

export const chartConfig = {
    heartRate: {
        label: "bpm",
        color: "#F24E43"
    },
    spo2: {
        label: "%SPO2",
        color: "#5A7FA0",
    },
    temperature: {
        label: "°C",
        color: "#E4A32CFF",
    },
    respiratoryRate: {
        label: "RPM",
        color: "#4EBFB3",
    }
} satisfies ChartConfig

interface ChartCardProps {
    onClick?: () => void
    isSelected?: boolean
    data: SensorDataPoint[]
    isConnected?: boolean
}

// ─── Compact Cards ─────────────────────────────────────────────────────────────

export const HeartRateChart = ({ onClick, isSelected, data, isConnected }: ChartCardProps) => {
    const latest = data.length > 0 ? data[data.length - 1] : null;
    const isNoConnection = isConnected === false;
    const value = isNoConnection ? 0.0 : (latest && latest.heartRate != null ? latest.heartRate : null);

    // Determine color and status label
    let statusColor = "text-[#22c55e]"; // Green for normal
    let statusBg = "bg-[#22c55e]/10";
    let statusBorder = "border-[#22c55e]/20";
    let statusLabel = "Frecuencia Normal";
    let pulseColor = "#22c55e";

    if (isNoConnection) {
        statusColor = "text-[#ef4444]"; // Red
        statusBg = "bg-[#ef4444]/10";
        statusBorder = "border-[#ef4444]/20";
        statusLabel = "Sin Conexión";
        pulseColor = "#ef4444";
    } else if (value !== null) {
        if (value >= 130 || value <= 35) {
            statusColor = "text-[#ef4444]"; // Red
            statusBg = "bg-[#ef4444]/10";
            statusBorder = "border-[#ef4444]/20";
            statusLabel = "Crítico";
            pulseColor = "#ef4444";
        } else if (value >= 100 || value <= 50) {
            statusColor = "text-[#eab308]"; // Yellow
            statusBg = "bg-[#eab308]/10";
            statusBorder = "border-[#eab308]/20";
            statusLabel = "Alerta - Límite";
            pulseColor = "#eab308";
        }
    } else {
        statusColor = "text-text-muted";
        statusBg = "bg-bg-panel";
        statusBorder = "border-border-default";
        statusLabel = "Esperando datos...";
    }

    // Circular progress stroke calculation
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    // Calibrate: 0 to 160 bpm
    const progress = value !== null ? Math.min(Math.max((value / 160) * 100, 0), 100) : 0;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div
            onClick={onClick}
            className="group relative rounded-sm bg-bg-card p-4 max-w-[270px] w-[270px] h-[200px] flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none"
            style={{
                border: isSelected
                    ? "1px solid #F24E43"
                    : "1px solid var(--border-default)",
                boxShadow: isSelected ? "0 0 16px 2px rgba(242,78,67,0.3)" : "none",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="p-1.5 rounded bg-[#F24E43]/10 text-[#F24E43] transition-colors group-hover:bg-[#F24E43]/20">
                        <HeartPlus size={14} className="animate-pulse" />
                    </span>
                    <h1 className="text-[10px] font-semibold text-text-primary uppercase tracking-widest transition-colors">
                        Frecuencia Cardíaca
                    </h1>
                </div>
                <Maximize2 size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Main Value & Visual Indicator */}
            <div className="flex items-center justify-between my-2">
                <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold tracking-tight text-text-primary tabular-nums">
                        {value !== null ? (isNoConnection ? "0.0" : value) : "--"}
                    </span>
                    <span className="text-lg font-medium text-text-secondary ml-1">bpm</span>
                </div>

                {/* SVG Progress Circle */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background Circle */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            className="text-border-default/20 dark:text-border-default/10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                        />
                        {/* Animated/Colored Progress Circle */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            stroke="#F24E43"
                            strokeWidth="4.5"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <span className="absolute text-[8px] font-bold text-text-muted text-center leading-none">
                        0 <br/> a 160
                    </span>
                </div>
            </div>

            {/* Footer / Status Label */}
            <div className="flex items-center justify-between pt-2 border-t border-border-default/50">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBg} ${statusColor} ${statusBorder}`}>
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            backgroundColor: pulseColor,
                            animation: isNoConnection || (value !== null && (value >= 100 || value <= 50)) ? "heartPulse 1.5s ease-in-out infinite" : "none"
                        }}
                    />
                    {statusLabel}
                </div>
                <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider group-hover:text-[#F24E43] transition-colors">
                    Ver Tendencia →
                </span>
            </div>

            {/* Custom pulse keyframes */}
            <style>{`
                @keyframes heartPulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.8); opacity: 0; }
                }
            `}</style>
        </div>
    )
}

export const SpO2Chart = ({ onClick, isSelected, data, isConnected }: ChartCardProps) => {
    const latest = data.length > 0 ? data[data.length - 1] : null;
    const isNoConnection = isConnected === false;
    const value = isNoConnection ? 0.0 : (latest && latest.spo2 != null ? latest.spo2 : null);

    // Determine color and status label
    let statusColor = "text-[#22c55e]"; // Green for normal
    let statusBg = "bg-[#22c55e]/10";
    let statusBorder = "border-[#22c55e]/20";
    let statusLabel = "Nivel Normal";
    let pulseColor = "#22c55e";

    if (isNoConnection) {
        statusColor = "text-[#ef4444]"; // Red
        statusBg = "bg-[#ef4444]/10";
        statusBorder = "border-[#ef4444]/20";
        statusLabel = "Sin Conexión";
        pulseColor = "#ef4444";
    } else if (value !== null) {
        if (value < 90) {
            statusColor = "text-[#ef4444]"; // Red
            statusBg = "bg-[#ef4444]/10";
            statusBorder = "border-[#ef4444]/20";
            statusLabel = "Crítico - Bajo";
            pulseColor = "#ef4444";
        } else if (value < 95) {
            statusColor = "text-[#eab308]"; // Yellow
            statusBg = "bg-[#eab308]/10";
            statusBorder = "border-[#eab308]/20";
            statusLabel = "Alerta - Límite";
            pulseColor = "#eab308";
        }
    } else {
        statusColor = "text-text-muted";
        statusBg = "bg-bg-panel";
        statusBorder = "border-border-default";
        statusLabel = "Esperando datos...";
    }

    // Circular progress stroke calculation
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const progress = value !== null ? Math.min(Math.max(value, 0), 100) : 0;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div
            onClick={onClick}
            className="group relative rounded-sm bg-bg-card p-4 max-w-[270px] w-[270px] h-[200px] flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none"
            style={{
                border: isSelected
                    ? "1px solid #5A7FA0"
                    : "1px solid var(--border-default)",
                boxShadow: isSelected ? "0 0 16px 2px rgba(90,127,160,0.3)" : "none",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="p-1.5 rounded bg-[#5A7FA0]/10 text-[#5A7FA0] transition-colors group-hover:bg-[#5A7FA0]/20">
                        <Wind size={14} className="animate-pulse" />
                    </span>
                    <h1 className="text-[10px] font-semibold text-text-primary uppercase tracking-widest transition-colors">
                        Saturación SpO2
                    </h1>
                </div>
                <Maximize2 size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Main Value & Visual Indicator */}
            <div className="flex items-center justify-between my-2">
                <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold tracking-tight text-text-primary tabular-nums">
                        {value !== null ? (isNoConnection ? "0.0" : value) : "--"}
                    </span>
                    <span className="text-lg font-medium text-text-secondary ml-1">%</span>
                </div>

                {/* SVG Progress Circle */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background Circle */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            className="text-border-default/20 dark:text-border-default/10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                        />
                        {/* Animated/Colored Progress Circle */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            stroke="#5A7FA0"
                            strokeWidth="4.5"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <span className="absolute text-[9px] font-bold text-text-muted">
                        {value !== null ? (isNoConnection ? "0.0%" : `${value}%`) : "--"}
                    </span>
                </div>
            </div>

            {/* Footer / Status Label */}
            <div className="flex items-center justify-between pt-2 border-t border-border-default/50">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBg} ${statusColor} ${statusBorder}`}>
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            backgroundColor: pulseColor,
                            animation: isNoConnection || (value !== null && value < 95) ? "spo2Pulse 1.5s ease-in-out infinite" : "none"
                        }}
                    />
                    {statusLabel}
                </div>
                <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider group-hover:text-[#5A7FA0] transition-colors">
                    Ver Tendencia →
                </span>
            </div>

            {/* Custom pulse keyframes */}
            <style>{`
                @keyframes spo2Pulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.8); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

export const TemperatureChart = ({ onClick, isSelected, data, isConnected }: ChartCardProps) => {
    const latest = data.length > 0 ? data[data.length - 1] : null;
    const isNoConnection = isConnected === false;
    const value = isNoConnection ? 0.0 : (latest && latest.temperature != null ? latest.temperature : null);

    // Determine color and status label
    let statusColor = "text-[#22c55e]"; // Green for normal
    let statusBg = "bg-[#22c55e]/10";
    let statusBorder = "border-[#22c55e]/20";
    let statusLabel = "Normal";
    let pulseColor = "#22c55e";

    if (isNoConnection) {
        statusColor = "text-[#ef4444]"; // Red
        statusBg = "bg-[#ef4444]/10";
        statusBorder = "border-[#ef4444]/20";
        statusLabel = "Sin Conexión";
        pulseColor = "#ef4444";
    } else if (value !== null) {
        if (value >= 38.5) {
            statusColor = "text-[#ef4444]"; // Red for fever
            statusBg = "bg-[#ef4444]/10";
            statusBorder = "border-[#ef4444]/20";
            statusLabel = "Fiebre Alta";
            pulseColor = "#ef4444";
        } else if (value >= 37.5) {
            statusColor = "text-[#eab308]"; // Yellow for low-grade fever / warm
            statusBg = "bg-[#eab308]/10";
            statusBorder = "border-[#eab308]/20";
            statusLabel = "Febrícula";
            pulseColor = "#eab308";
        } else if (value <= 35.5) {
            statusColor = "text-[#3b82f6]"; // Blue for cold/hypothermia
            statusBg = "bg-[#3b82f6]/10";
            statusBorder = "border-[#3b82f6]/20";
            statusLabel = "Hipotermia";
            pulseColor = "#3b82f6";
        }
    } else {
        statusColor = "text-text-muted";
        statusBg = "bg-bg-panel";
        statusBorder = "border-border-default";
        statusLabel = "Esperando datos...";
    }

    // Calibrated progress circle: scale 35°C to 42°C (7 degrees range)
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const pct = value !== null ? ((value - 35) / 7) * 100 : 0;
    const clampedPct = Math.min(Math.max(pct, 0), 100);
    const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

    return (
        <div
            onClick={onClick}
            className="group relative rounded-sm bg-bg-card p-4 max-w-[270px] w-[270px] h-[200px] flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none"
            style={{
                border: isSelected
                    ? "1px solid #E4A32C"
                    : "1px solid var(--border-default)",
                boxShadow: isSelected ? "0 0 16px 2px rgba(228,163,44,0.25)" : "none",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="p-1.5 rounded bg-[#E4A32C]/10 text-[#E4A32C] transition-colors group-hover:bg-[#E4A32C]/20">
                        <Thermometer size={14} className="animate-pulse" />
                    </span>
                    <h1 className="text-[10px] font-semibold text-text-primary uppercase tracking-widest transition-colors">
                        Temperatura
                    </h1>
                </div>
                <Maximize2 size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Main Value & Visual Indicator */}
            <div className="flex items-center justify-between my-2">
                <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold tracking-tight text-text-primary tabular-nums">
                        {value !== null ? value.toFixed(1) : "--"}
                    </span>
                    <span className="text-lg font-medium text-text-secondary ml-1">°C</span>
                </div>

                {/* SVG Progress Circle (Calibrated) */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background Circle */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            className="text-border-default/20 dark:text-border-default/10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                        />
                        {/* Calibrated Progress */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            stroke="#E4A32C"
                            strokeWidth="4.5"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <span className="absolute text-[8px] font-bold text-text-muted text-center leading-none">
                        35° <br/> a 42°
                    </span>
                </div>
            </div>

            {/* Footer / Status Label */}
            <div className="flex items-center justify-between pt-2 border-t border-border-default/50">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBg} ${statusColor} ${statusBorder}`}>
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            backgroundColor: pulseColor,
                            animation: isNoConnection || (value !== null && (value >= 37.5 || value <= 35.5)) ? "tempPulse 1.5s ease-in-out infinite" : "none"
                        }}
                    />
                    {statusLabel}
                </div>
                <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider group-hover:text-[#E4A32C] transition-colors">
                    Ver Tendencia →
                </span>
            </div>

            {/* Custom pulse keyframes */}
            <style>{`
                @keyframes tempPulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.8); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

export const RespiratoryRateChart = ({ onClick, isSelected, data, isConnected }: ChartCardProps) => {
    const latest = data.length > 0 ? data[data.length - 1] : null;
    const isNoConnection = isConnected === false;
    const value = isNoConnection ? 0.0 : (latest && latest.respiratoryRate != null ? latest.respiratoryRate : null);

    // Determine color and status label
    let statusColor = "text-[#22c55e]"; // Green for normal
    let statusBg = "bg-[#22c55e]/10";
    let statusBorder = "border-[#22c55e]/20";
    let statusLabel = "Frecuencia Normal";
    let pulseColor = "#22c55e";

    if (isNoConnection) {
        statusColor = "text-[#ef4444]"; // Red
        statusBg = "bg-[#ef4444]/10";
        statusBorder = "border-[#ef4444]/20";
        statusLabel = "Sin Conexión";
        pulseColor = "#ef4444";
    } else if (value !== null) {
        if (value >= 35 || value <= 6) {
            statusColor = "text-[#ef4444]"; // Red
            statusBg = "bg-[#ef4444]/10";
            statusBorder = "border-[#ef4444]/20";
            statusLabel = "Crítico";
            pulseColor = "#ef4444";
        } else if (value >= 25 || value <= 10) {
            statusColor = "text-[#eab308]"; // Yellow
            statusBg = "bg-[#eab308]/10";
            statusBorder = "border-[#eab308]/20";
            statusLabel = "Alerta - Límite";
            pulseColor = "#eab308";
        }
    } else {
        statusColor = "text-text-muted";
        statusBg = "bg-bg-panel";
        statusBorder = "border-border-default";
        statusLabel = "Esperando datos...";
    }

    // Circular progress stroke calculation
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    // Calibrate: 0 to 40 rpm
    const progress = value !== null ? Math.min(Math.max((value / 40) * 100, 0), 100) : 0;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div
            onClick={onClick}
            className="group relative rounded-sm bg-bg-card p-4 max-w-[270px] w-[270px] h-[200px] flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg select-none"
            style={{
                border: isSelected
                    ? "1px solid #4EBFB3"
                    : "1px solid var(--border-default)",
                boxShadow: isSelected ? "0 0 16px 2px rgba(78,191,179,0.3)" : "none",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="p-1.5 rounded bg-[#4EBFB3]/10 text-[#4EBFB3] transition-colors group-hover:bg-[#4EBFB3]/20">
                        <Activity size={14} className="animate-pulse" />
                    </span>
                    <h1 className="text-[10px] font-semibold text-text-primary uppercase tracking-widest transition-colors">
                        Frecuencia Respiratoria
                    </h1>
                </div>
                <Maximize2 size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Main Value & Visual Indicator */}
            <div className="flex items-center justify-between my-2">
                <div className="flex items-baseline">
                    <span className="text-5xl font-extrabold tracking-tight text-text-primary tabular-nums">
                        {value !== null ? value : "--"}
                    </span>
                    <span className="text-lg font-medium text-text-secondary ml-1">RPM</span>
                </div>

                {/* SVG Progress Circle */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background Circle */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            className="text-border-default/20 dark:text-border-default/10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                        />
                        {/* Animated/Colored Progress Circle */}
                        <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            stroke="#4EBFB3"
                            strokeWidth="4.5"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <span className="absolute text-[8px] font-bold text-text-muted text-center leading-none">
                        0 <br/> a 40
                    </span>
                </div>
            </div>

            {/* Footer / Status Label */}
            <div className="flex items-center justify-between pt-2 border-t border-border-default/50">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBg} ${statusColor} ${statusBorder}`}>
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            backgroundColor: pulseColor,
                            animation: isNoConnection || (value !== null && (value >= 25 || value <= 10)) ? "respPulse 1.5s ease-in-out infinite" : "none"
                        }}
                    />
                    {statusLabel}
                </div>
                <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider group-hover:text-[#4EBFB3] transition-colors">
                    Ver Tendencia →
                </span>
            </div>

            {/* Custom pulse keyframes */}
            <style>{`
                @keyframes respPulse {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.8); opacity: 0; }
                }
            `}</style>
        </div>
    )
}

// ─── Expanded Panel ────────────────────────────────────────────────────────────

const expandedMeta: Record<ChartKey, { title: string; dataKey: string; gradientId: string; colorKey: keyof typeof chartConfig; domain?: [number | string, number | string] }> = {
    heartRate: {
        title: "Frecuencia Cardíaca (BPM)",
        dataKey: "heartRate",
        gradientId: "expandedHeartRate",
        colorKey: "heartRate",
        domain: ["dataMin - 5", "dataMax + 5"],
    },
    spo2: {
        title: "SpO2 (%)",
        dataKey: "spo2",
        gradientId: "expandedSpO2",
        colorKey: "spo2",
        domain: [90, 100],
    },
    temperature: {
        title: "Temperatura (°C)",
        dataKey: "temperature",
        gradientId: "expandedTemperature",
        colorKey: "temperature",
        domain: ["dataMin - 2", "dataMax + 2"],
    },
    respiratoryRate: {
        title: "Frecuencia Respiratoria (RPM)",
        dataKey: "respiratoryRate",
        gradientId: "expandedRespiratoryRate",
        colorKey: "respiratoryRate",
        domain: ["dataMin - 5", "dataMax + 5"],
    },
}

interface ExpandedChartViewProps {
    chartKey: ChartKey
    onClose: () => void
    data: SensorDataPoint[]
}

export const ExpandedChartView = ({ chartKey, onClose, data }: ExpandedChartViewProps) => {
    const meta = expandedMeta[chartKey]
    const color = chartConfig[meta.colorKey].color

    return (
        <div
            className="flex-1 rounded-sm bg-bg-card flex flex-col overflow-hidden animate-fadeIn transition-colors duration-300"
            style={{ border: `1px solid ${color}40`, boxShadow: `0 0 24px 4px ${color}18` }}
        >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                    <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                    />
                    <h2 className="text-xs font-semibold text-text-primary uppercase tracking-widest transition-colors">
                        {meta.title}
                    </h2>
                </div>
                <button
                    onClick={onClose}
                    className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none cursor-pointer"
                    aria-label="Cerrar vista expandida"
                >
                    ✕
                </button>
            </div>

            {/* Chart */}
            <ChartContainer config={chartConfig} className="flex-1 w-full px-2 pb-3">
                <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                        <linearGradient id={meta.gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={true} strokeDasharray="3 3" stroke="currentColor" className="text-border-default opacity-50" />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 10 }} domain={meta.domain} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Area
                        type="monotone"
                        dataKey={meta.dataKey}
                        stroke={color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#${meta.gradientId})`}
                        dot={false}
                        animationDuration={400}
                    />
                </RechartsAreaChart>
            </ChartContainer>
        </div>
    )
}
