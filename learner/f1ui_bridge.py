"""
ApexAI F1 Sim Bridge SDK (f1ui_bridge.py)
Single-file Python bridge connecting user ML learners to the ApexAI Core via WebSocket.
Includes pure standard-library fallback (socket/struct/ssl) so it works out-of-the-box
even if pip/websocket-client is not yet installed in the Python environment.
"""

import sys
import os
import json
import time
import math
import base64
import struct
import socket
import threading
import argparse

# Try external websocket package if installed
try:
    import websocket
    HAS_WEBSOCKET_PKG = True
except ImportError:
    websocket = None
    HAS_WEBSOCKET_PKG = False


class PurePythonWebSocketClient:
    """Zero-dependency RFC-6455 WebSocket client using Python standard library"""
    def __init__(self, url, on_message, on_open, on_error, on_close):
        self.url = url
        self.on_message = on_message
        self.on_open = on_open
        self.on_error = on_error
        self.on_close = on_close
        self.sock = None
        self.connected = False
        self._lock = threading.Lock()
        self._thread = None

    def connect(self):
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        try:
            # Parse url e.g. ws://127.0.0.1:8765/ws
            clean = self.url.replace("ws://", "").replace("wss://", "")
            parts = clean.split("/")
            host_port = parts[0].split(":")
            host = host_port[0]
            port = int(host_port[1]) if len(host_port) > 1 else 80
            path = "/" + "/".join(parts[1:]) if len(parts) > 1 else "/ws"

            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(5.0)
            self.sock.connect((host, port))

            # Handshake
            key = base64.b64encode(os.urandom(16)).decode('ascii')
            req = (
                f"GET {path} HTTP/1.1\r\n"
                f"Host: {host}:{port}\r\n"
                f"Upgrade: websocket\r\n"
                f"Connection: Upgrade\r\n"
                f"Sec-WebSocket-Key: {key}\r\n"
                f"Sec-WebSocket-Version: 13\r\n\r\n"
            )
            self.sock.sendall(req.encode('utf-8'))

            response = b""
            while b"\r\n\r\n" not in response:
                chunk = self.sock.recv(1024)
                if not chunk:
                    break
                response += chunk

            if b" 101 " not in response:
                raise Exception(f"WebSocket upgrade rejected: {response.decode('utf-8', errors='ignore')}")

            with self._lock:
                self.connected = True

            if self.on_open:
                self.on_open(self)

            # Receiver loop
            self.sock.settimeout(None)
            while self.connected:
                # Read 2 byte header
                head = self._recv_exact(2)
                if not head:
                    break
                b1, b2 = head[0], head[1]
                opcode = b1 & 0x0F
                if opcode == 0x08:  # Close frame
                    break
                masked = (b2 & 0x80) != 0
                length = b2 & 0x7F

                if length == 126:
                    ext = self._recv_exact(2)
                    length = struct.unpack("!H", ext)[0]
                elif length == 127:
                    ext = self._recv_exact(8)
                    length = struct.unpack("!Q", ext)[0]

                mask_key = self._recv_exact(4) if masked else None
                payload = self._recv_exact(length)

                if masked and mask_key:
                    payload = bytes([b ^ mask_key[i % 4] for i, b in enumerate(payload)])

                if opcode == 0x01:  # Text frame
                    text = payload.decode('utf-8', errors='ignore')
                    if self.on_message:
                        self.on_message(self, text)
                elif opcode == 0x09:  # Ping
                    self._send_frame(0x0A, payload)  # Pong

        except Exception as e:
            if self.on_error:
                self.on_error(self, e)
        finally:
            with self._lock:
                self.connected = False
            if self.on_close:
                self.on_close(self, 1000, "Closed")

    def _recv_exact(self, n):
        data = b""
        while len(data) < n:
            chunk = self.sock.recv(n - len(data))
            if not chunk:
                return None
            data += chunk
        return data

    def send(self, data):
        """Send masked text frame"""
        if not self.connected:
            return
        payload = data.encode('utf-8')
        length = len(payload)
        mask = os.urandom(4)

        header = bytearray()
        header.append(0x81)  # FIN + Text

        if length <= 125:
            header.append(0x80 | length)
        elif length <= 65535:
            header.append(0x80 | 126)
            header.extend(struct.pack("!H", length))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack("!Q", length))

        header.extend(mask)
        masked_payload = bytes([b ^ mask[i % 4] for i, b in enumerate(payload)])

        with self._lock:
            try:
                self.sock.sendall(header + masked_payload)
            except Exception:
                self.connected = False

    def close(self):
        with self._lock:
            self.connected = False
            if self.sock:
                try:
                    self.sock.close()
                except Exception:
                    pass


class F1UIBridge:
    def __init__(self):
        self.ws = None
        self.connected = False
        self._should_stop = False
        self._is_paused = False
        self._mode = "no"  # 'no', 'low', 'high'
        self._speed_lap_seconds = 15.0
        self._command_handlers = []
        self._last_heartbeat_time = time.time()
        self._lock = threading.Lock()
        self.config = {}
        self.run_config_path = os.environ.get("F1UI_CONFIG", "")
        self.save_state_hook = None
        self.load_state_hook = None
        self.last_terminal_status_time = 0.0
        self.laps_since_block_print = 0

        # Load run_config if provided
        self._load_config()

    def _load_config(self):
        parser = argparse.ArgumentParser(add_help=False)
        parser.add_argument("--config", type=str, default="")
        args, _ = parser.parse_known_args()
        if args.config:
            self.run_config_path = args.config

        if self.run_config_path and os.path.exists(self.run_config_path):
            try:
                with open(self.run_config_path, "r", encoding="utf-8") as f:
                    self.config = json.load(f)
            except Exception as e:
                print(f"[F1UI_BRIDGE] Warning loading config: {e}", file=sys.stderr)

    @property
    def mode(self):
        with self._lock:
            return self._mode

    def should_stop(self):
        with self._lock:
            return self._should_stop

    def is_paused(self):
        with self._lock:
            return self._is_paused

    def on_command(self, handler):
        """Register callback for commands from Core (cmd_type, payload)"""
        self._command_handlers.append(handler)

    def register_state_hooks(self, save_fn, load_fn):
        self.save_state_hook = save_fn
        self.load_state_hook = load_fn

    def connect(self, host="127.0.0.1", port=None):
        """Connect to local supervisor WebSocket hub"""
        if port is None:
            port = self.config.get("values", {}).get("link.port", 8765)

        url = f"ws://{host}:{port}/ws"

        def on_message(ws, message):
            self._handle_incoming_message(message)

        def on_error(ws, error):
            print(f"[F1UI_BRIDGE] Socket error: {error}", file=sys.stderr)

        def on_close(ws, close_status_code, close_msg):
            print(f"[F1UI_BRIDGE] Disconnected from core: {close_msg}")
            with self._lock:
                self.connected = False

        def on_open(ws):
            print(f"[F1UI_BRIDGE] Connected to ApexAI Core at {url}")
            with self._lock:
                self.connected = True
                self._last_heartbeat_time = time.time()
            # Send initial hello
            self._send_raw({
                "type": "hello",
                "sdk_version": "1.4.0",
                "name": self.config.get("run", {}).get("model_id", "PythonLearner")
            })

        if HAS_WEBSOCKET_PKG:
            self.ws = websocket.WebSocketApp(
                url,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            ws_thread = threading.Thread(target=self.ws.run_forever, kwargs={"ping_interval": 2, "ping_timeout": 1}, daemon=True)
            ws_thread.start()
        else:
            # Zero-dependency standard library client
            self.ws = PurePythonWebSocketClient(
                url=url,
                on_message=on_message,
                on_open=on_open,
                on_error=on_error,
                on_close=on_close
            )
            self.ws.connect()

        # Start watchdog thread
        watchdog_thread = threading.Thread(target=self._watchdog_loop, daemon=True)
        watchdog_thread.start()

        # Wait briefly for initial handshake
        time.sleep(0.15)

    def _handle_incoming_message(self, message):
        try:
            data = json.loads(message)
            msg_type = data.get("type", "")

            with self._lock:
                self._last_heartbeat_time = time.time()

            if msg_type == "ping":
                self._send_raw({"type": "pong", "time": time.time()})
                return

            if msg_type == "pause":
                with self._lock:
                    self._is_paused = True
            elif msg_type == "resume":
                with self._lock:
                    self._is_paused = False
            elif msg_type == "stop":
                with self._lock:
                    self._should_stop = True
            elif msg_type == "set_mode":
                with self._lock:
                    self._mode = data.get("mode", "no")
            elif msg_type == "set_speed":
                with self._lock:
                    self._speed_lap_seconds = float(data.get("lap_seconds", 15.0))
            elif msg_type == "save_checkpoint":
                self._do_checkpoint(data.get("path", "checkpoint_manual"))
            elif msg_type == "config_update":
                path = data.get("path")
                val = data.get("value")
                if path:
                    self.config[path] = val

            for handler in self._command_handlers:
                try:
                    handler(msg_type, data)
                except Exception as ex:
                    print(f"[F1UI_BRIDGE] Error in command handler: {ex}", file=sys.stderr)

        except Exception as e:
            print(f"[F1UI_BRIDGE] Error decoding message: {e}", file=sys.stderr)

    def _watchdog_loop(self):
        """Emergency watchdog: if heartbeat lost > 3 s -> emergency save & exit"""
        heartbeat_timeout = 3.0
        while not self._should_stop:
            time.sleep(0.5)
            with self._lock:
                if not self.connected:
                    continue
                elapsed = time.time() - self._last_heartbeat_time
            if elapsed > heartbeat_timeout:
                print(f"[F1UI_BRIDGE] Watchdog Alert: Lost core heartbeat for {elapsed:.1f}s (>3s). Triggering emergency save...", file=sys.stderr)
                self._do_checkpoint("emergency_autosave")
                with self._lock:
                    self._should_stop = True
                break

    def _do_checkpoint(self, tag):
        if self.save_state_hook:
            try:
                ckpt_dir = os.path.join("runs", "checkpoints", tag)
                os.makedirs(ckpt_dir, exist_ok=True)
                self.save_state_hook(ckpt_dir)
                self._send_raw({"type": "status", "status": "saved", "checkpoint": tag})
                print(f"[F1UI_BRIDGE] Saved checkpoint: {tag}")
            except Exception as e:
                print(f"[F1UI_BRIDGE] Checkpoint hook failed: {e}", file=sys.stderr)

    def _send_raw(self, payload):
        if self.ws and self.connected:
            try:
                self.ws.send(json.dumps(payload))
            except Exception:
                pass

    def emit_frame(self, cars):
        """Emit high-frequency car positions (at most 30 FPS, NO mode only)"""
        if self.mode != "no":
            return
        self._send_raw({
            "type": "frame",
            "cars": cars
        })

    def emit_lap(self, car, lap, lap_type, cycle_pos, lap_time, sectors, segments, delta, tyre_health, battery_s3, crash=None, fail_reason=None, reward_breakdown=None):
        """Emit detailed lap completion telemetry"""
        payload = {
            "type": "lap_complete",
            "car": car,
            "lap": lap,
            "lap_type": lap_type,  # 'out' | 'push' | 'in'
            "cycle_pos": cycle_pos,
            "time": lap_time,
            "sectors": sectors,
            "segments": segments,
            "delta": delta,
            "tyre_health": tyre_health,
            "battery_s3": battery_s3,
            "crash": crash,
            "fail_reason": fail_reason,
            "reward_breakdown": reward_breakdown or {}
        }
        self._send_raw(payload)

    def emit_stats(self, best, avg, fail_rate, fail_top3, avg_delta, consistency, success):
        """Emit aggregate push-lap statistics"""
        self._send_raw({
            "type": "stats",
            "best": best,
            "avg": avg,
            "fail_rate": fail_rate,
            "fail_top3": fail_top3,
            "avg_delta": avg_delta,
            "consistency": consistency,
            "success": success
        })

    def emit_metrics(self, metrics_dict):
        """Emit learner-specific custom metrics for the 4th live chart"""
        self._send_raw({
            "type": "metrics",
            "metrics": metrics_dict
        })

    def set_phase(self, phase):
        """Set training phase: 'track_training' or 'quali_training'"""
        self._send_raw({
            "type": "phase",
            "phase": phase
        })

    def update_meta(self, meta_dict):
        self._send_raw({
            "type": "meta_update",
            "meta": meta_dict
        })

    def log(self, text):
        self._send_raw({
            "type": "log",
            "text": text
        })

    def terminal_status(self, stats, laps_done, circuit="Silverstone GP"):
        """
        In HIGH mode prints the 2 s status line and the full block every
        textual.print_every_laps laps. Listens non-blocking for hotkey ('}' or Shift+]) to request LOW mode.
        """
        now = time.time()
        print_every_laps = self.config.get("values", {}).get("textual.print_every_laps", 50)
        high_print_s = self.config.get("values", {}).get("high.print_s", 2.0)

        # Check hotkey to restore LOW mode
        if self._check_hotkey():
            print("\n[F1UI_BRIDGE] Restoring UI in LOW mode via hotkey...")
            with self._lock:
                self._mode = "low"
            self._send_raw({"type": "set_mode", "mode": "low"})
            return

        if self.mode != "high":
            return

        if now - self.last_terminal_status_time >= high_print_s:
            self.last_terminal_status_time = now
            line = (
                f"[HIGH] {stats.get('phase', 'Track')} | Laps: {laps_done} | {circuit} | "
                f"Best: {stats.get('best', 0.0):.3f}s | Avg: {stats.get('avg', 0.0):.3f}s | "
                f"Fail: {stats.get('fail_rate', 0.0):.1f}% ({stats.get('top_fail', 'None')}) | "
                f"Δ: {stats.get('avg_delta', 0.0):+.3f}s | Consist: {stats.get('consistency', 0.0):.1f}% | "
                f"Succ: {stats.get('success', 0.0):.1f}% | {stats.get('laps_per_sec', 0.0):.1f} lap/s | "
                f"CPU: {stats.get('cpu_pct', 24):.0f}% {stats.get('temp_c', 68):.0f}°C RAM: {stats.get('ram_pct', 42):.0f}%"
            )
            print(f"\r{line}", end="", flush=True)

        if laps_done > 0 and (laps_done % print_every_laps == 0) and laps_done != self.laps_since_block_print:
            self.laps_since_block_print = laps_done
            print("\n" + "=" * 70)
            print(f"APEX_AI TELEMETRY BLOCK — LAP {laps_done} [{circuit}]")
            print(f"  • Best Lap Time: {stats.get('best', 0.0):.3f}s   | Average Lap Time: {stats.get('avg', 0.0):.3f}s")
            print(f"  • Fail Rate:     {stats.get('fail_rate', 0.0):.1f}%    | Top Fail Reasons: {stats.get('fail_top3', [])}")
            print(f"  • Average Delta: {stats.get('avg_delta', 0.0):+.3f}s   | Consistency: {stats.get('consistency', 0.0):.1f}% | Success: {stats.get('success', 0.0):.1f}%")
            print("=" * 70 + "\n")

    def _check_hotkey(self):
        """Non-blocking keyboard check for hotkey (default '}')"""
        target_char = self.config.get("values", {}).get("hotkey", "}")
        try:
            if sys.platform == "win32":
                import msvcrt
                if msvcrt.kbhit():
                    ch = msvcrt.getch().decode("utf-8", errors="ignore")
                    if ch == target_char:
                        return True
            else:
                import select
                if select.select([sys.stdin], [], [], 0)[0]:
                    ch = sys.stdin.read(1)
                    if ch == target_char:
                        return True
        except Exception:
            pass
        return False


# Singleton export
bridge = F1UIBridge()
