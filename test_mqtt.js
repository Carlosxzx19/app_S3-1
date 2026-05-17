const mqtt = require("mqtt");

const options = {
  protocol: "wss",
  host: "978c9ad30c094bf2815984c7639a7c25.s1.eu.hivemq.cloud",
  port: 8884,
  path: "/mqtt",
  clientId: "debug_" + Math.random().toString(16).substr(2, 8),
  username: "DashboardWeb",
  password: "VisualHealth123*",
  rejectUnauthorized: false
};

console.log("Connecting to HiveMQ with explicit options...");

const client = mqtt.connect(options);

client.on("connect", () => {
  console.log("Connected successfully!");
  client.subscribe("visualhealth/esp32/sensors", (err) => {
    if (!err) {
      console.log("Subscribed to visualhealth/esp32/sensors. Waiting for messages...");
    } else {
      console.error("Subscription error:", err);
    }
  });
});

client.on("message", (topic, message) => {
  console.log("-----------------------------------------");
  console.log("Message received on topic:", topic);
  console.log("Payload:", message.toString());
});

client.on("error", (err) => {
  console.error("Connection error:", err);
  process.exit(1);
});

setTimeout(() => {
  console.log("Finished listening.");
  process.exit(0);
}, 10000);
