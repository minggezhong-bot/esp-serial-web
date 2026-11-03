# ESP32 USB switch playground

A Python website you can host on Render and share as a link. Each visitor connects
their own ESP32 to their computer, clicks **Connect**, and chooses it in the
browser's USB serial picker. The center plays `man-01.gif` while released and
`man-03.gif` while the switch is held.

USB is read directly by the visitor's browser using Web Serial. Flask only serves
the page and assets: switch states stay in each browser tab and are never sent to
the server or other visitors. Visitors do not need to install Python.

## What each visitor needs

- Desktop Chrome with Web Serial available.
- The hosted **HTTPS** link (or localhost when testing on your own computer).
- An ESP32 running the included sketch, connected with a USB data cable.
- A normally-open momentary switch between **D0** and **3V3** on a XIAO ESP32-S3.

The firmware targets **XIAO_ESP32S3** with **USB CDC On Boot → Enabled**. Upload
`esp-serial-web.ino` before connecting the website. The internal pull-down means
no extra resistor is needed for this wiring. Other ESP32 boards need their own
correct input pin and USB serial settings, but can use the same message format.

Close Arduino Serial Monitor and any other tab or application using the board.
Click **Connect**, select the ESP32, and allow access. Click **Disconnect** before
uploading new firmware. After unplugging, plug it back in and click **Connect**
again. Browser cancellation leaves the page in the released state.

## Run locally

From this folder:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:8000** in desktop Chrome. Localhost is allowed for Web
Serial without HTTPS. To choose another local port, use `python app.py --port 8001`.
Stop the server with **Ctrl+C**.

On Windows, use `py -m venv .venv`, then `.venv\Scripts\activate` instead of
the first two commands. Gunicorn is used on Render's Linux server; Windows local
development can install Flask alone with `python -m pip install "Flask>=3.1,<4"`.

## Deploy on Render

1. Push this folder to a GitHub repository, including the `static/` GIFs.
   Keep `.venv/` out of Git; `.gitignore` already excludes it.
2. In Render, create a **Web Service** and connect the repository.
3. Set the runtime to **Python 3**, with these commands:

   ```text
   Build: pip install -r requirements.txt
   Start: gunicorn app:app --bind 0.0.0.0:$PORT
   ```

4. Deploy and share the generated **https://…onrender.com** URL.

Alternatively, create a Render **Blueprint** from the repository to use the
included `render.yaml` configuration. It selects the free service plan. The
`/health` endpoint is available for Render's health checks.

No serial port, pySerial installation, or bridge on the host computer is needed.
There are no shared connection endpoints on the server. Each person connects
their own hardware through their own browser.

## Message format and behavior

The sketch sends one JSON object per line at **115200 baud**:

```json
{"pressed":true}
{"pressed":false}
```

Repeated messages preserve the current animation without restarting it.
Startup logs and malformed messages are ignored. Disconnecting or receiving no
valid state for five seconds restores `man-01.gif` and closes the connection.
If connected without receiving data, check the sketch, wiring, and USB CDC setting.

## Files

- `app.py`: Flask page and health endpoint.
- `templates/index.html`: page structure.
- `static/style.css`: appearance and the pressed effect.
- `static/app.js`: browser USB reader, connection controls, and GIF switching.
- `static/man-01.gif` and `static/man-03.gif`: released and pressed animations.
- `esp-serial-web.ino`: debounced XIAO ESP32-S3 switch firmware.
- `render.yaml`: Render deployment configuration.

References: [Web Serial](https://developer.chrome.com/docs/capabilities/serial),
[Flask on Render](https://render.com/docs/deploy-flask), and
[Render Blueprint configuration](https://render.com/docs/blueprint-spec).
