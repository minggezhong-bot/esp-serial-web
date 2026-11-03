// All serial state belongs to this browser tab, never to the web server.
class SwitchSerial {
  constructor(onState, onError) {
    this.onState = onState;
    this.onError = onError;
    this.session = null;
    this.state = { connected: false, ready: false, pressed: false, closing: false };
  }

  update(changes) {
    Object.assign(this.state, changes);
    this.onState({ ...this.state });
  }

  async connect() {
    if (this.session) throw new Error("The previous USB connection is still closing. Try again shortly.");
    // Call the picker before awaiting anything else, while the click is active.
    const port = await navigator.serial.requestPort();
    try {
      await port.open({ baudRate: 115200 });
      // The XIAO's USB CDC Serial object needs the host to assert DTR.
      await port.setSignals({ dataTerminalReady: true });
    } catch (error) {
      try { await port.close(); } catch (_) { /* Port may not have opened. */ }
      throw error;
    }

    const session = {
      port, reader: null, task: null, timer: null, stopping: false,
      error: null, lastReceived: Date.now(),
    };
    this.session = session;
    this.update({ connected: true, ready: false, pressed: false, closing: false });
    session.timer = setInterval(() => {
      if (!session.stopping && Date.now() - session.lastReceived > 5000) {
        void this.disconnect("No switch data received. Check the sketch and USB CDC setting, then reconnect.");
      }
    }, 500);
    session.task = this.readLoop(session);
  }

  async disconnect(message = null) {
    const session = this.session;
    if (!session) return;
    session.stopping = true;
    if (message) session.error = message;
    clearInterval(session.timer);
    this.update({ connected: false, ready: false, pressed: false, closing: true });
    try { await session.reader?.cancel(); } catch (_) { /* USB may already be gone. */ }
    await session.task;
  }

  async readLoop(session) {
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      if (!session.port.readable) throw new Error("USB serial is not readable.");
      session.reader = session.port.readable.getReader();
      while (!session.stopping) {
        const { value, done } = await session.reader.read();
        if (done) {
          if (!session.stopping) session.error = "USB connection ended. Reconnect your ESP32.";
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let newline;
        while ((newline = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          let message;
          try { message = JSON.parse(line); } catch (_) { continue; }
          // Ignore boot logs, malformed JSON, and values such as "true" or 1.
          if (message && typeof message.pressed === "boolean") {
            session.lastReceived = Date.now();
            this.update({ ready: true, pressed: message.pressed });
          }
        }
        if (buffer.length > 4096) buffer = "";
      }
    } catch (_) {
      if (!session.stopping) session.error = "USB connection lost. Reconnect your ESP32.";
    } finally {
      clearInterval(session.timer);
      this.update({ connected: false, ready: false, pressed: false, closing: true });
      session.reader?.releaseLock();
      session.reader = null;
      try { await session.port.close(); } catch (_) { /* Removed devices may already be closed. */ }
      this.session = null;
      this.update({ closing: false });
      if (session.error) this.onError(session.error);
    }
  }
}

const $ = (id) => document.getElementById(id);
const supported = window.isSecureContext && "serial" in navigator;
let state = { connected: false, ready: false, pressed: false, closing: false };
let busy = false;

function showError(message) {
  $("error").textContent = message || "";
  $("error").hidden = !message;
}

function render() {
  const held = state.connected && state.ready && state.pressed;
  document.body.classList.toggle("pressed", held);
  const animation = $("switch-animation");
  const animationSrc = held ? animation.dataset.pressedSrc : animation.dataset.releasedSrc;
  // Keep the current GIF playing across repeated heartbeat messages.
  if (animation.getAttribute("src") !== animationSrc) {
    animation.setAttribute("src", animationSrc);
  }
  animation.alt = held ? "Character animation — switch pressed" : "Character animation — switch released";
  $("indicator").classList.toggle("connected", state.connected);
  $("connection-title").textContent = state.connected ? "Device connected" : "Connect your device";
  $("connection-detail").textContent = state.connected ? "Your ESP32 · 115200 baud" : "USB serial · 115200 baud";
  $("stage-status").textContent = state.ready ? "DEVICE ONLINE" : state.connected ? "WAITING FOR DATA" : "AWAITING CONNECTION";
  $("switch-label").textContent = held ? "You make the connection." : state.ready ? "Go on. Press the switch." : state.connected ? "Listening to your device…" : "Ready when you are.";
  $("switch-hint").textContent = held ? "Keep holding. Release to return." : state.ready ? "Press and hold to change the animation." : state.connected ? "Waiting for the first switch message." : "Click Connect to choose your ESP32.";
  $("signal").textContent = state.ready ? `SIGNAL ${held ? "HIGH / PRESSED" : "LOW / RELEASED"}` : "SIGNAL —";
  $("connect").disabled = busy || state.closing || !supported;
  $("connect").textContent = busy || state.closing ? "Please wait…" : state.connected ? "Disconnect" : "Connect ↗";
}

const usb = new SwitchSerial((nextState) => {
  state = nextState;
  render();
}, showError);

$("connect").addEventListener("click", async () => {
  busy = true;
  render();
  showError(null);
  try {
    if (state.connected) await usb.disconnect();
    else await usb.connect();
  } catch (error) {
    // Closing the device picker is a normal cancellation.
    if (error.name !== "NotFoundError") {
      showError(`Could not connect: ${error.message} Close Arduino Serial Monitor or other tabs using this ESP32, then try again.`);
    }
  } finally {
    busy = false;
    render();
  }
});

render();
if (!window.isSecureContext) {
  showError("USB access requires HTTPS. Open the secure website link, or use http://127.0.0.1:8000 locally.");
} else if (!supported) {
  showError("USB serial is unavailable in this browser. Open this page in desktop Chrome to connect your ESP32.");
}
