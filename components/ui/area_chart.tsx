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
}

// ─── Compact Cards ─────────────────────────────────────────────────────────────

export const HeartRateChart = ({ onClick, isSelected, data }: ChartCardProps) => {
    return (
        <div
            onClick={onClick}
            className="rounded-sm bg-bg-card p-1 max-w-[270px] h-[200px] flex flex-col cursor-pointer transition-all duration-200 hover:brightness-95 dark:hover:brightness-110"
            style={{
                border: isSelected
                    ? "1px solid #F24E43"
                    : "1px solid var(--border-default)",
                boxShadow: isSelected ? "0 0 12px 2px rgba(242,78,67,0.25)" : "none",
            }}
        >
            <h1 className="text-[10px] font-semibold text-text-primary uppercase tracking-widest px-2 pt-2 mb-1 transition-colors">
                Frecuencía cardíaca (BPM)
            </h1>
            <ChartContainer config={chartConfig} className="flex-1 w-full">
                <RechartsAreaChart data={data} margin={{ top: 5, right: 5, left: -35, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorHeartRate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartConfig.heartRate.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={chartConfig.heartRate.color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={true} strokeDasharray="3 3" stroke="currentColor" className="text-border-default opacity-50" />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 8 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 8 }} domain={["dataMin - 5", "dataMax + 5"]} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Area type="monotone" dataKey="heartRate" stroke={chartConfig.heartRate.color} strokeWidth={2.5} fillOpacity={1} fill="url(#colorHeartRate)" dot={false} />
                </RechartsAreaChart>
            </ChartContainer>
        </div>
    )
}

export const SpO2Chart = ({ onClick, isSelected, data }: ChartCardProps) => {
    return (
        <div
            onClick={onClick}
            className="rounded-sm bg-bg-card p-1 max-w-[270px] h-[200px] flex flex-col cursor-pointer transition-all duration-200 hover:brightness-95 dark:hover:brightness-110"
            style={{
                border: isSelected
                    ? "1px solid #5A7FA0"
                    : "1px solid var(--border-default)",
                boxShadow: isSelected ? "0 0 12px 2px rgba(90,127,160,0.3)" : "none",
            }}
        >
            <h1 className="text-[10px] font-semibold text-text-primary uppercase tracking-widest px-2 pt-2 mb-1 transition-colors">
                SpO2 (%)
            </h1>
            <ChartContainer config={chartConfig} className="flex-1 w-full">
                <RechartsAreaChart data={data} margin={{ top: 5, right: 5, left: -35, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorSpO2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartConfig.spo2.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={chartConfig.spo2.color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={true} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 8 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 8 }} domain={[90, 100]} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Area type="monotone" dataKey="spo2" stroke={chartConfig.spo2.color} strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpO2)" dot={false} />
                </RechartsAreaChart>
            </ChartContainer>
        </div>
    )
}

export const TemperatureChart = ({ onClick, isSelected, data }: ChartCardProps) => {
    return (
        <div
            onClick={onClick}
            className="rounded-sm bg-bg-card p-1 max-w-[270px] h-[200px] flex flex-col cursor-pointer transition-all duration-200 hover:brightness-95 dark:hover:brightness-110"
            style={{
                border: isSelected
                    ? "1px solid #E4A32C"
                    : "1px solid var(--border-default)",
                boxShadow: isSelected ? "0 0 12px 2px rgba(228,163,44,0.25)" : "none",
            }}
        >
            <h1 className="text-[10px] font-semibold text-text-primary uppercase tracking-widest px-2 pt-2 mb-1 transition-colors">
                Temperatura (°C)
            </h1>
            <ChartContainer config={chartConfig} className="flex-1 w-full">
                <RechartsAreaChart data={data} margin={{ top: 5, right: 5, left: -35, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorTemperature" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartConfig.temperature.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={chartConfig.temperature.color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={true} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 8 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 8 }} domain={["dataMin - 2", "dataMax + 2"]} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Area type="monotone" dataKey="temperature" stroke={chartConfig.temperature.color} strokeWidth={2.5} fillOpacity={1} fill="url(#colorTemperature)" dot={false} />
                </RechartsAreaChart>
            </ChartContainer>
        </div>
    )
}

export const RespiratoryRateChart = ({ onClick, isSelected, data }: ChartCardProps) => {
    return (
        <div
            onClick={onClick}
            className="rounded-sm bg-bg-card p-1 max-w-[270px] h-[200px] flex flex-col cursor-pointer transition-all duration-200 hover:brightness-95 dark:hover:brightness-110"
            style={{
                border: isSelected
                    ? "1px solid #4EBFB3"
                    : "1px solid var(--border-default)",
                boxShadow: isSelected ? "0 0 12px 2px rgba(78,191,179,0.25)" : "none",
            }}
        >
            <h1 className="text-[10px] font-semibold text-text-primary uppercase tracking-widest px-2 pt-2 mb-1 transition-colors">
                Frecuencia Respiratoria (RPM)
            </h1>
            <ChartContainer config={chartConfig} className="flex-1 w-full">
                <RechartsAreaChart data={data} margin={{ top: 5, right: 5, left: -35, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorRespiratoryRate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartConfig.respiratoryRate.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={chartConfig.respiratoryRate.color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={true} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 8 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 8 }} domain={["dataMin - 5", "dataMax + 5"]} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Area type="monotone" dataKey="respiratoryRate" stroke={chartConfig.respiratoryRate.color} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRespiratoryRate)" dot={false} />
                </RechartsAreaChart>
            </ChartContainer>
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
