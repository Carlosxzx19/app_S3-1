"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { MqttClient } from "mqtt"

export interface SensorDataPoint {
    time: string
    heartRate: number | null
    spo2: number | null
    temperature: number | null
    respiratoryRate: number | null
}

export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error"

const MAX_DATA_POINTS = 30

// ─── Default broker config (override via .env.local) ────────────────────────
const BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "ws://broker.emqx.io:8083/mqtt"
const TOPIC = process.env.NEXT_PUBLIC_MQTT_TOPIC || "visualhealth/esp32/sensors"
const CLIENT_ID = `visualhealth_${Math.random().toString(16).slice(2, 10)}`

/**
 * Expected MQTT payload from ESP32 (JSON):
 * {
 *   "heartRate": 75,
 *   "spo2": 98,
 *   "temperature": 36.6,
 *   "respiratoryRate": 18
 * }
 *
 * All fields are optional — missing fields will retain the previous value.
 */
export function useMqttData() {
    const [chartData, setChartData] = useState<SensorDataPoint[]>([])
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
    const [lastReceived, setLastReceived] = useState<number | null>(null)
    const clientRef = useRef<MqttClient | null>(null)
    const latestValuesRef = useRef<Omit<SensorDataPoint, "time">>({
        heartRate: null,
        spo2: null,
        temperature: null,
        respiratoryRate: null,
    })

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

        let client: MqttClient | null = null
        let cancelled = false

        setConnectionStatus("connecting")

        // Dynamically import mqtt so Node.js built-ins are never resolved server-side
        import("mqtt").then((mqttModule) => {
            if (cancelled) return

            const mqtt = mqttModule.default || mqttModule
            client = mqtt.connect(BROKER_URL, {
                clientId: CLIENT_ID,
                clean: true,
                reconnectPeriod: 5000,
                connectTimeout: 10000,
            })

            clientRef.current = client

            client.on("connect", () => {
                setConnectionStatus("connected")
                client!.subscribe(TOPIC, { qos: 0 }, (err) => {
                    if (err) {
                        console.error("[MQTT] Subscribe error:", err)
                    }
                })
            })

            client.on("message", (_topic: string, payload: Buffer) => {
                try {
                    const data = JSON.parse(payload.toString())
                    const now = new Date()
                    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
                        .getMinutes()
                        .toString()
                        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`

                    // Merge incoming values with latest known values
                    const prev = latestValuesRef.current
                    const point: SensorDataPoint = {
                        time: timeStr,
                        heartRate: data.heartRate ?? prev.heartRate,
                        spo2: data.spo2 ?? prev.spo2,
                        temperature: data.temperature ?? prev.temperature,
                        respiratoryRate: data.respiratoryRate ?? prev.respiratoryRate,
                    }

                    // Update latest values ref
                    latestValuesRef.current = {
                        heartRate: point.heartRate,
                        spo2: point.spo2,
                        temperature: point.temperature,
                        respiratoryRate: point.respiratoryRate,
                    }

                    setChartData((prev) => {
                        const updated = [...prev, point]
                        return updated.length > MAX_DATA_POINTS
                            ? updated.slice(updated.length - MAX_DATA_POINTS)
                            : updated
                    })

                    setLastReceived(Date.now())
                    resetReceivingTimeout()
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
    }
}
