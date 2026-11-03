"""Serve the USB switch website locally or on Render.

Each visitor's browser reads their own ESP32 through Web Serial. The server
only serves the page and assets; it never opens a serial port.
"""

import argparse

from flask import Flask, render_template

app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000,
                        help="Local website port (default: 8000)")
    args = parser.parse_args()
    app.run(host="127.0.0.1", port=args.port, use_reloader=False)
