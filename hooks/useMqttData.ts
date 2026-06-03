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

// ─── Default broker config (override via env variables) ────────────────────────
const BROKER_URL = process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "wss://broker978c9ad30c094bf2815984c7639a7c25.s1.eu.hivemq.cloud:8884/mqtt"
const TOPIC = process.env.NEXT_PUBLIC_MQTT_TOPIC || "visualhealth/esp32/sensors"
const MQTT_USERNAME = process.env.NEXT_PUBLIC_MQTT_USERNAME || "WEBSOCKET"
const MQTT_PASSWORD = process.env.NEXT_PUBLIC_MQTT_PASSWORD || "Qwerty123*"

export function useMqttData() {
    const [chartData, setChartData] = useState<SensorDataPoint[]>([])
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
    const [lastReceived, setLastReceived] = useState<number | null>(null)
    const [batteryPercentage, setBatteryPercentage] = useState<number | null>(null)
    const [isReceivingData, setIsReceivingData] = useState(false)

    const clientRef = useRef<any>(null)
    const processorRef = useRef(createVitalSignsProcessor())
    const lastChartUpdateRef = useRef<number>(0)
    const lastTemperatureRef = useRef<number | null>(null)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const resetReceivingTimeout = useCallback(() => {
        setIsReceivingData(true)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
            console.log("[MQTT] Staleness timeout: No data received for 4 seconds")
            setIsReceivingData(false)
        }, 4000)
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return

        let client: any = null
        let cancelled = false

        console.log("[MQTT] Initializing connection to:", BROKER_URL)
        setConnectionStatus("connecting")

        // Load mqtt client dynamically for browser execution
        import("mqtt").then((mqttModule) => {
            if (cancelled) return

            const mqtt = mqttModule.default || mqttModule
            const clientId = `web_client_${Math.random().toString(16).slice(2, 10)}`

            console.log("[MQTT] Library loaded successfully. Attempting connection with client ID:", clientId)

            // Connect using broker URL and options
            client = mqtt.connect(BROKER_URL, {
                clientId,
                clean: true,
                keepalive: 30, // Keep connection alive by pinging every 30s
                reconnectPeriod: 2000, // Reconnect every 2 seconds if connection is lost
                connectTimeout: 15000, // Timeout connection after 15 seconds
                username: MQTT_USERNAME,
                password: MQTT_PASSWORD,
                rejectUnauthorized: false, // Essential for HiveMQ Cloud in browser bundlers
            })

            clientRef.current = client

            client.on("connect", () => {
                if (cancelled) return
                console.log("[MQTT] Connected successfully to broker! Subscribing to topic:", TOPIC)
                setConnectionStatus("connected")

                client.subscribe(TOPIC, { qos: 0 }, (err: Error | null) => {
                    if (err) {
                        console.error("[MQTT] Subscription failed:", err)
                    } else {
                        console.log("[MQTT] Subscribed to topic successfully!")
                    }
                })
            })

            client.on("message", (topic: string, payload: Buffer) => {
                if (cancelled) return
                try {
                    const messageStr = payload.toString()
                    console.log("[MQTT] Received raw message:", messageStr)
                    const data = JSON.parse(messageStr)
                    const now = Date.now()

                    // Extract values
                    const temp = data.temp !== undefined ? data.temp : data.temperature
                    if (temp !== undefined) {
                        lastTemperatureRef.current = temp
                    }

                    const battery = data.bat !== undefined ? data.bat : data.battery
                    if (battery !== undefined) {
                        setBatteryPercentage(battery)
                    }

                    const ir = data.ir ?? 0
                    const red = data.red ?? 0
                    const result = processorRef.current.processSample(ir, red, now)

                    setLastReceived(now)
                    resetReceivingTimeout()

                    if (now - lastChartUpdateRef.current >= CHART_UPDATE_INTERVAL_MS) {
                        lastChartUpdateRef.current = now

                        const timeDate = new Date(now)
                        const timeStr = `${timeDate.getHours().toString().padStart(2, "0")}:${timeDate
                            .getMinutes()
                            .toString()
                            .padStart(2, "0")}:${timeDate.getSeconds().toString().padStart(2, "0")}`

                        const point: SensorDataPoint = {
                            time: timeStr,
                            heartRate: result.fingerDetected && result.heartRate > 0 ? result.heartRate : null,
                            spo2: result.fingerDetected && result.validSPO2 ? result.spo2 : null,
                            temperature: lastTemperatureRef.current,
                            respiratoryRate: result.fingerDetected ? result.respiratoryRate : null,
                        }

                        setChartData((prev) => {
                            const updated = [...prev, point]
                            return updated.length > MAX_DATA_POINTS
                                ? updated.slice(updated.length - MAX_DATA_POINTS)
                                : updated
                        })
                    }
                } catch (e) {
                    console.error("[MQTT] Failed to process message:", e)
                }
            })

            client.on("reconnect", () => {
                if (cancelled) return
                console.warn("[MQTT] Reconnecting to broker...")
                setConnectionStatus("connecting")
            })

            client.on("close", () => {
                if (cancelled) return
                console.warn("[MQTT] Connection closed by broker.")
                setConnectionStatus("disconnected")
            })

            client.on("offline", () => {
                if (cancelled) return
                console.warn("[MQTT] Client went offline.")
                setConnectionStatus("disconnected")
            })

            client.on("error", (err: Error) => {
                if (cancelled) return
                console.error("[MQTT] Error received:", err)
                setConnectionStatus("error")
            })

        }).catch((err) => {
            console.error("[MQTT] Failed to dynamically load mqtt module:", err)
            setConnectionStatus("error")
        })

        return () => {
            cancelled = true
            console.log("[MQTT] Cleaning up hook. Closing client connection.")
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            if (client) {
                try {
                    client.end(true)
                } catch (e) {
                    console.error("[MQTT] Error ending client connection:", e)
                }
            }
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
