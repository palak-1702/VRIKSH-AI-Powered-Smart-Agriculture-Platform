from __future__ import annotations

import io
import os
from typing import Dict, Tuple, Optional

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from PIL import Image
import numpy as np


def create_app() -> Flask:
    # Serve built frontend from ../build (Vite default in this project)
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "build"))
    app = Flask(
        __name__,
        static_folder=frontend_dist,
        static_url_path=""
    )
    CORS(app)

    # Health route
    @app.get("/health")
    def health() -> Tuple[str, int]:
        return "ok", 200

    @app.post("/classify")
    def classify():
        try:
            # Support multipart/form-data with 'image' or raw bytes, or JSON base64 (field 'image_base64')
            image: Image.Image | None = None

            if request.content_type and "application/json" in request.content_type:
                data = request.get_json(silent=True) or {}
                import base64

                b64 = data.get("image_base64")
                if not b64:
                    return jsonify({"error": "Missing image_base64 in JSON"}), 400
                try:
                    image_bytes = base64.b64decode(b64)
                except Exception:
                    return jsonify({"error": "Invalid base64"}), 400
                image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            else:
                file = request.files.get("image")
                if not file:
                    # Accept raw body as image bytes
                    raw = request.get_data()
                    if not raw:
                        return jsonify({"error": "No image provided"}), 400
                    image = Image.open(io.BytesIO(raw)).convert("RGB")
                else:
                    image = Image.open(file.stream).convert("RGB")

            result = classify_leaf_health(image)

            # Optional pump control (NodeMCU) based on result
            auto = os.environ.get("PUMP_AUTO", "0") == "1"
            nodemcu_base = os.environ.get("NODEMCU_URL", "").rstrip("/")
            pump_action = None
            pump_error = None
            if auto and nodemcu_base:
                try:
                    # Simple policy: unhealthy or moderate -> ON, healthy -> OFF
                    desired = "on" if result.get("class") in ("unhealthy", "moderate") else "off"
                    pump_action = desired
                    send_pump_command(nodemcu_base, desired)
                except Exception as e:
                    pump_error = str(e)

            response = {**result}
            if pump_action is not None:
                response["pump_action"] = pump_action
            if pump_error is not None:
                response["pump_error"] = pump_error

            # Optional Arduino serial command via PySerial
            arduino_enabled = os.environ.get("ARDUINO_ENABLE", "0") == "1"
            if arduino_enabled:
                try:
                    cmd = map_class_to_arduino_command(result.get("class", ""))
                    if cmd:
                        send_arduino_command(cmd)
                        response["arduino_command"] = cmd
                except Exception as e:
                    response["arduino_error"] = str(e)

            return jsonify(response), 200
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    # Frontend static file serving (after API routes)
    @app.get("/")
    def serve_index():
        index_path = os.path.join(app.static_folder or "", "index.html")
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, "index.html")
        return "AgriSave Leaf Classifier Backend is running", 200

    @app.get("/<path:path>")
    def serve_static(path: str):
        file_path = os.path.join(app.static_folder or "", path)
        if app.static_folder and os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        # Fallback to index for SPA routes
        index_path = os.path.join(app.static_folder or "", "index.html")
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, "index.html")
        return "Not Found", 404

    return app


def send_pump_command(base_url: str, state: str) -> None:
    import requests
    if state not in ("on", "off"):
        raise ValueError("state must be 'on' or 'off'")
    # Example NodeMCU endpoint: http://<ip>/pump?state=on
    url = f"{base_url}/pump"
    res = requests.get(url, params={"state": state}, timeout=3)
    if res.status_code >= 400:
        raise RuntimeError(f"pump http {res.status_code}: {res.text[:120]}")


# -------- Arduino Serial Integration (pyserial) --------
def map_class_to_arduino_command(label: str) -> Optional[str]:
    mapping = {
        "healthy": os.environ.get("ARDUINO_CMD_HEALTHY", "healthy"),
        "moderate": os.environ.get("ARDUINO_CMD_MODERATE", "moderate"),
        "unhealthy": os.environ.get("ARDUINO_CMD_UNHEALTHY", "unhealthy"),
    }
    return mapping.get(label)


def resolve_arduino_port() -> Optional[str]:
    # If set explicitly, use that
    explicit = os.environ.get("ARDUINO_PORT")
    if explicit:
        return explicit
    try:
        import serial.tools.list_ports as list_ports
    except Exception:
        return None
    candidates = list(list_ports.comports())
    for p in candidates:
        text = f"{p.device} {p.description} {p.hwid}".lower()
        if any(key in text for key in ["arduino", "wchusbserial", "wch.cn", "ch340", "cp210", "silabs", "usb-serial"]):
            return p.device
    # fallback to first tty/COM if nothing matched
    return candidates[0].device if candidates else None


def send_arduino_command(command: str) -> None:
    try:
        import serial  # type: ignore
        import time
    except Exception as e:
        raise RuntimeError("pyserial not installed") from e

    port = resolve_arduino_port()
    if not port:
        raise RuntimeError("No Arduino serial port found. Set ARDUINO_PORT or connect the device.")

    baud = int(os.environ.get("ARDUINO_BAUD", "115200"))
    timeout = float(os.environ.get("ARDUINO_TIMEOUT", "1.5"))
    # Open, small delay for boards that reset on open, write, then close
    with serial.Serial(port=port, baudrate=baud, timeout=timeout) as ser:
        time.sleep(float(os.environ.get("ARDUINO_OPEN_DELAY", "0.3")))
        payload = (command + "\n").encode("utf-8")
        ser.write(payload)
        ser.flush()
        # optionally read ack
        try:
            ack = ser.readline().decode(errors="ignore").strip()
            if ack:
                print(f"[arduino] ack: {ack}")
        except Exception:
            pass


def classify_leaf_health(image: Image.Image) -> Dict[str, object]:
    """
    Improved heuristic: tile-based aggregation, Excess Green index, HSV stress, and necrosis (low-V) detection.
    More robust to background and lighting; no heavy ML deps.
    """
    # Normalize size
    max_side = 512
    w, h = image.size
    scale = min(max_side / max(w, h), 1.0)
    if scale < 1.0:
        image = image.resize((int(w * scale), int(h * scale)))

    img_np = np.asarray(image.convert("RGB"), dtype=np.uint8)
    hsv_np = np.asarray(image.convert("HSV"), dtype=np.uint8)

    # Leaf mask using saturation/brightness + excess green
    r = img_np[:, :, 0].astype(np.int16)
    g = img_np[:, :, 1].astype(np.int16)
    b = img_np[:, :, 2].astype(np.int16)
    h_ch = hsv_np[:, :, 0].astype(np.int16)
    s_ch = hsv_np[:, :, 1].astype(np.int16)
    v_ch = hsv_np[:, :, 2].astype(np.int16)

    # Excess green index: 2G - R - B (scaled to 0..255 proxy)
    exg = 2 * g - r - b
    exg_thresh = np.percentile(exg, 60)
    mask_exg = exg > exg_thresh

    mask_sv = (s_ch > 25) & (v_ch > 25)
    leaf_mask = mask_sv & mask_exg

    # Refine mask by removing extremely bright or desaturated pixels (highlights/background)
    leaf_mask &= (v_ch < 240) & (s_ch > 15)

    total = int(np.count_nonzero(leaf_mask)) or 1

    # Green band, yellow band, necrosis (brown/dark) detection
    green_mask = (h_ch >= 42) & (h_ch <= 120) & leaf_mask
    yellow_mask = (h_ch >= 21) & (h_ch <= 42) & leaf_mask
    red_mask = ((h_ch <= 12) | (h_ch >= 230)) & leaf_mask
    necrosis_mask = (v_ch < 70) & (yellow_mask | red_mask)

    green_ratio = float(np.count_nonzero(green_mask)) / total
    yellow_ratio = float(np.count_nonzero(yellow_mask)) / total
    necrosis_ratio = float(np.count_nonzero(necrosis_mask)) / total

    # Texture cue: high-frequency edges often increase with disease spots
    # Simple Laplacian approximation via shifts (avoid scipy/opencv)
    gray = (0.299 * r + 0.587 * g + 0.114 * b).astype(np.float32)
    gx = np.abs(gray[:, 2:] - gray[:, :-2])
    gy = np.abs(gray[2:, :] - gray[:-2, :])
    edges = np.zeros_like(gray)
    edges[1:-1, 1:-1] = 0.5 * (gx[1:-1, :] + gy[:, 1:-1])
    edge_thresh = np.percentile(edges[leaf_mask], 70) if np.count_nonzero(leaf_mask) else 0.0
    edge_ratio = float(np.mean((edges > edge_thresh)[leaf_mask])) if np.count_nonzero(leaf_mask) else 0.0

    # Tiled aggregation to reduce local bias
    tiles = 3
    hgt, wdt = leaf_mask.shape
    tile_stats = []
    for ti in range(tiles):
        for tj in range(tiles):
            y0 = (hgt * ti) // tiles
            y1 = (hgt * (ti + 1)) // tiles
            x0 = (wdt * tj) // tiles
            x1 = (wdt * (tj + 1)) // tiles
            m = leaf_mask[y0:y1, x0:x1]
            if np.count_nonzero(m) < 50:
                continue
            g_r = float(np.count_nonzero(green_mask[y0:y1, x0:x1])) / max(int(np.count_nonzero(m)), 1)
            y_r = float(np.count_nonzero(yellow_mask[y0:y1, x0:x1])) / max(int(np.count_nonzero(m)), 1)
            n_r = float(np.count_nonzero(necrosis_mask[y0:y1, x0:x1])) / max(int(np.count_nonzero(m)), 1)
            tile_stats.append((g_r, y_r, n_r))

    if tile_stats:
        tg, ty, tn = np.median(np.array(tile_stats), axis=0)
        green_ratio = float(tg)
        yellow_ratio = float(ty)
        necrosis_ratio = float(tn)

    stress_ratio = min(yellow_ratio + necrosis_ratio, 1.0)

    # Decision
    if green_ratio >= 0.72 and stress_ratio <= 0.18 and edge_ratio < 0.35:
        label = "healthy"
        confidence = min(0.55 + (green_ratio - 0.72) * 1.2 + (0.18 - stress_ratio) * 1.4 + (0.35 - edge_ratio) * 0.6, 0.99)
    elif green_ratio >= 0.45 and stress_ratio <= 0.50:
        label = "moderate"
        conf_base = 0.5 - abs(0.58 - green_ratio)  # centered around ~0.58
        confidence = max(0.55, min(0.9, 0.55 + conf_base - edge_ratio * 0.1))
    else:
        label = "unhealthy"
        confidence = min(0.5 + stress_ratio * 0.8 + (0.45 - min(green_ratio, 0.45)) * 0.8 + edge_ratio * 0.3, 0.96)

    return {
        "class": label,
        "confidence": round(float(confidence), 3),
        "metrics": {
            "green_ratio": round(green_ratio, 3),
            "yellow_ratio": round(yellow_ratio, 3),
            "necrosis_ratio": round(necrosis_ratio, 3),
            "stress_ratio": round(stress_ratio, 3),
            "edge_ratio": round(edge_ratio, 3),
            "pixels": total,
        },
    }


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")


