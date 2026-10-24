# ApexAI — F1 Driver Sim Orchestrator & Control Deck

High-performance desktop control UI and supervisor for training and tuning AI race-car drivers for an F1 simulation. The application manages orchestration, telemetry visualization, resource governance, atomic persistence, and multi-process communication over local WebSockets.

---

## Architecture & Process Model

ApexAI implements a multi-process architecture with strict process isolation:

1. **Supervisor Core (Rust / Tauri & Node Hub)**:
   - Hosts the WebSocket Hub at `ws://127.0.0.1:8765/ws`.
   - Resource governor monitoring CPU, package temperature (°C), and RAM.
   - Atomic rolling autosave engine using temporary write, `fsync()`, and rename.
   - Heartbeat watchdog (pings every 2 seconds; emergency checkpoint if disconnected for >3 s).
   - Global hotkey listener (`Shift + ]` or `"}"`) to wake up webview into `LOW` speed mode.

2. **Learner Process (Python)**:
   - User reinforcement learning agent or imitation learning model.
   - Imports single-file `f1ui_bridge.py` SDK (one dependency: `websocket-client`).
   - Hooks into `save_state(dir)` and `load_state(dir)` for clean persistence.
   - **Learner Lock**: Read-only lock enforced while training runs. Modifying files is rejected and directory hash is checked at launch.

3. **Simulation Backend**:
   - Compiles vehicle kinematics and physics stepping (Custom C ABI engine or TORCS SCR adapter).
   - Batched stepping with shared memory to avoid pickling overhead.

4. **Webview Control Deck**:
   - Lightweight TypeScript / React frontend styled with custom CSS variables and JetBrains Mono.
   - Zero animated blurs, static shadows, hand-rolled Canvas/SVG charts (no heavy chart libraries).
   - Capped redraw at &le;30 FPS to ensure near-zero idle CPU consumption.

---

## Speed Modes

- **`NO` (Normal Paced)**:
  - Full interactive deck with live 30 FPS track map, car positions, and real-time SVG charts.
  - Sim paced according to the "Lap duration" slider (5 to 30 s, default 15 s).
- **`LOW` (Unpaced Throttled UI)**:
  - Simulation runs at maximum unpaced speed.
  - UI is dimmed and uninteractable except for the speed switch.
  - Receives lightweight snapshot stats every 10 seconds.
- **`HIGH` (Headless Terminal Mode)**:
  - Webview is destroyed or detached to minimize CPU overhead.
  - Terminal prints a single-line status every 2 seconds and a full 50-lap telemetry block.
  - Global hotkey `Shift + ]` (character `"}"`) instantly restores the UI in `LOW` mode.

---

## 8 Screens & Navigation Deck

- **Train**: Track map (Silverstone, Spa, Monza), live car dots, sector chips (S1 Red, S2 Cyan, S3 Amber, DRS Green, Speed Trap Magenta), mini-segments overlay, 4 charts (Lap Time, Delta, Tyre Health, Learner Metric dropdown), Governor HUD, and Autosave countdown.
- **Setup**: Training style toggles (Race vs Lap Time), 15 physics toggles (Aero, ERS, Thermals, etc.), run strip, target lap time evaluator, past models list (5 recent), and "Create Fresh" launcher.
- **Model Builder**: Layer topology, collapsing layer nodes (`...` + count), always-on Gear & RPM inputs, input/output toggle groups, and weights tensor validation.
- **Car Setup (F1 2020 Style)**: Suspension, Tyres, ARBs, Ride Height, Wings, Fuel, Differentials, Brake, and Toe/Camber steppers with live side-view vehicle CAD and tyre camber/toe SVG kinematics.
- **Learner**: File tree for `learner/`, code editor with Ctrl+S save, template insertion, connection test, message contract checklist, and Build & Benchmark suite (Plain Python vs Numba vs Cython vs CFFI).
- **Rewards**: Formula-driven parameter cards from `config/params.schema.json`, amber `PLACEHOLDER` badges, live exponential curve previews, Risk & Break-Even calculator (`p = G / (G + F)`), and last-lap reward breakdown.
- **Values**: System parameters, cycle sequencing, governor thresholds, rolling autosave timers, and custom user-defined parameter extensions.
- **Tracks**: Full `.f1track` editor with sub-meter cell size (0.25m), 13-color surface palette, elevation colormap generator (Turbo, Viridis), banking angle tools, closed-loop validator, and `.f1track` ZIP exporter.

---

## Running in VS Code

### 1. Prerequisites
- **Node.js**: v18.0.0+ or v20.0.0+ installed on your system.
- **Python**: 3.8+ (optional, only required if you run the standalone Python learner agent).

### 2. Steps to Execute in VS Code

#### Quick Method (One-Click with VS Code Run & Debug):
1. Open this repository in VS Code:
   ```bash
   code .
   ```
2. Press **`F5`** (or go to the **Run and Debug** tab (`Ctrl+Shift+D`) and click **"ApexAI: Start Dev Server (Full Stack)"**).
3. Open your browser at **`http://localhost:3000`**.

#### Terminal Method:
1. Open the integrated terminal in VS Code:
   ```bash
   Ctrl + ` (backtick)
   ```
2. Install npm dependencies (first time only):
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open **`http://localhost:3000`** in your browser.

#### Optional: Running the Python AI Learner Agent
If you want to train or step the actual Python learner model alongside the UI:
1. Open a new terminal tab (`Ctrl+Shift+\`` or click the `+` icon in the terminal panel).
2. Install the lightweight Python bridge dependency:
   ```bash
   pip install websocket-client
   ```
3. Run the learner:
   ```bash
   python learner/learner.py
   ```
   *Note: If you don't have Python installed, you can simply toggle **"Demo Mode"** inside the UI to simulate live telemetry.*

