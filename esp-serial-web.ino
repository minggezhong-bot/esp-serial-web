// Board: XIAO_ESP32S3. Enable Tools > USB CDC On Boot in Arduino IDE.
// Wiring: D0 -- normally-open momentary switch -- 3V3.
// USB serial: 115200 baud, one JSON object per line:
//   {"pressed":true}  -> apply the website effect
//   {"pressed":false} -> restore the website's original appearance
// Each visitor's browser opens its own USB port using Web Serial.
// State is sent on connection, on changes, and every second for resync.

#include <Arduino.h>

constexpr uint8_t SWITCH_PIN = D0;  // GPIO1 on XIAO ESP32-S3, not GPIO0.
constexpr unsigned long DEBOUNCE_MS = 25;
constexpr unsigned long REPORT_INTERVAL_MS = 1000;

bool lastRawPressed = false;
bool pressed = false;
bool wasSerialConnected = false;
unsigned long lastRawChangeMs = 0;
unsigned long lastReportMs = 0;

void setup() {
  // Released = LOW; pressing connects D0 to 3V3, making it HIGH.
  pinMode(SWITCH_PIN, INPUT_PULLDOWN);
  lastRawPressed = digitalRead(SWITCH_PIN) == HIGH;
  pressed = lastRawPressed;
  lastRawChangeMs = millis();

  Serial.begin(115200);
  // Keep reading the switch even when no browser is connected.
}

void loop() {
  const unsigned long now = millis();
  const bool rawPressed = digitalRead(SWITCH_PIN) == HIGH;

  if (rawPressed != lastRawPressed) {
    lastRawPressed = rawPressed;
    lastRawChangeMs = now;
  }

  bool stateChanged = false;
  if (rawPressed != pressed && now - lastRawChangeMs >= DEBOUNCE_MS) {
    pressed = rawPressed;
    stateChanged = true;
  }

  const bool serialConnected = static_cast<bool>(Serial);
  if (serialConnected &&
      (!wasSerialConnected || stateChanged ||
       now - lastReportMs >= REPORT_INTERVAL_MS)) {
    Serial.println(pressed ? "{\"pressed\":true}" : "{\"pressed\":false}");
    lastReportMs = now;
  }
  wasSerialConnected = serialConnected;

  delay(1);
}
