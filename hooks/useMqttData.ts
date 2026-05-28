"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createVitalSignsProcessor } from "@/lib/vitalSignsProcessor"

export interface SensorDataPoint {
    time: string
    heartRate: number | null
    spo2: number | null
    temperature: number | null
    respiratoryRate: number | null
}

export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error"

const MAX_DATA_POINTS = 30
const CHART_UPDATE_INTERVAL_MS = 2000 // Add a chart point every 2 seconds

// ─── Default broker config (override via .env.local) ────────────────────────
const BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "wss://broker978c9ad30c094bf2815984c7639a7c25.s1.eu.hivemq.cloud:8884/mqtt"
const TOPIC = process.env.NEXT_PUBLIC_MQTT_TOPIC || "visualhealth/esp32/sensors"
const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || "Fotopo"
const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || "Qwerty123*"

/**
 * Expected MQTT payload from ESP32 (JSON):
 * {
 *   "ir": 123456,
 *   "red": 98765,
 *   "temp": 36.6,         // optional temperature
 *   "bat": 100            // optional battery percentage
 * }
 *
 * The raw IR/Red values are processed client-side using the
 * vital signs processor to compute heart rate, SpO2, and
 * respiratory rate via HRV + EDR spectral fusion.
 */
export function useMqttData() {
    const [chartData, setChartData] = useState<SensorDataPoint[]>([])
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
    const [lastReceived, setLastReceived] = useState<number | null>(null)
    const [batteryPercentage, setBatteryPercentage] = useState<number | null>(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientRef = useRef<any>(null)
    const processorRef = useRef(createVitalSignsProcessor())
    const lastChartUpdateRef = useRef<number>(0)
    const lastTemperatureRef = useRef<number | null>(null)

    // Timeout to detect data staleness (no data for 10s → yellow)
    const [isReceivingData, setIsReceivingData] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const resetReceivingTimeout = useCallback(() => {
        setIsReceivingData(true)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            setIsReceivingData(false)
        }, 10000) // 10 seconds without data → not receiving
    }, [])

    useEffect(() => {
        // Only run in the browser
        if (typeof window === "undefined") return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let client: any = null
        let cancelled = false

        setConnectionStatus("connecting")

        // Dynamically import mqtt so Node.js built-ins are never resolved server-side
        import("mqtt").then((mqttModule) => {
            if (cancelled) return

            const mqtt = mqttModule.default || mqttModule
            const clientId = `visualhealth_${Math.random().toString(16).slice(2, 10)}`

            // HiveMQ Cloud WebSocket requirements:
            const host = "978c9ad30c094bf2815984c7639a7c25.s1.eu.hivemq.cloud"
            
            client = mqtt.connect({
                protocol: "wss",
                host: host,
                port: 8884,
                path: "/mqtt",
                clientId,
                clean: true,
                reconnectPeriod: 5000,
                connectTimeout: 10000,
                username: MQTT_USERNAME || undefined,
                password: MQTT_PASSWORD || undefined,
            })

            clientRef.current = client

            client.on("connect", () => {
                setConnectionStatus("connected")
                client.subscribe(TOPIC, { qos: 0 }, (err: Error | null) => {
                    if (err) {
                        console.error("[MQTT] Subscribe error:", err)
                    }
                })
            })

            client.on("message", (_topic: string, payload: Buffer) => {
                try {
                    const data = JSON.parse(payload.toString())
                    const now = Date.now()

                    // Store temperature if provided (from a separate sensor like MLX90614)
                    const temp = data.temp !== undefined ? data.temp : data.temperature
                    if (temp !== undefined) {
                        lastTemperatureRef.current = temp
                    }
                    
                    const battery = data.bat !== undefined ? data.bat : data.battery
                    if (battery !== undefined) {
                        setBatteryPercentage(battery)
                    }

                    // Process raw IR/Red values through the vital signs processor
                    const ir = data.ir ?? 0
                    const red = data.red ?? 0
                    const result = processorRef.current.processSample(ir, red, now)

                    setLastReceived(now)
                    resetReceivingTimeout()

                    // Only add a chart data point every CHART_UPDATE_INTERVAL_MS
                    if (now - lastChartUpdateRef.current >= CHART_UPDATE_INTERVAL_MS) {
                        lastChartUpdateRef.current = now

                        const timeDate = new Date(now)
                        const timeStr = `${timeDate.getHours().toString().padStart(2, "0")}:${timeDate
                            .getMinutes()
                            .toString()
                            .padStart(2, "0")}:${timeDate.getSeconds().toString().padStart(2, "0")}`

                        const point: SensorDataPoint = {
                            time: timeStr,
                            heartRate: result.fingerDetected && result.heartRate > 0
                                ? result.heartRate
                                : null,
                            spo2: result.fingerDetected && result.validSPO2
                                ? result.spo2
                                : null,
                            temperature: lastTemperatureRef.current,
                            respiratoryRate: result.fingerDetected
                                ? result.respiratoryRate
                                : null,
                        }

                        setChartData((prev) => {
                            const updated = [...prev, point]
                            return updated.length > MAX_DATA_POINTS
                                ? updated.slice(updated.length - MAX_DATA_POINTS)
                                : updated
                        })
                    }
                } catch (e) {
                    console.error("[MQTT] Failed to parse message:", e)
                }
            })

            client.on("error", (err: Error) => {
                console.error("[MQTT] Error:", err)
                setConnectionStatus("error")
            })

            client.on("close", () => {
                setConnectionStatus("disconnected")
            })

            client.on("reconnect", () => {
                setConnectionStatus("connecting")
            })
        }).catch((err) => {
            console.error("[MQTT] Failed to load mqtt module:", err)
            setConnectionStatus("error")
        })

        return () => {
            cancelled = true
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            if (client) client.end(true)
        }
    }, [resetReceivingTimeout])

    return {
        chartData,
        connectionStatus,
        isReceivingData,
        lastReceived,
        batteryPercentage,
    }
}
