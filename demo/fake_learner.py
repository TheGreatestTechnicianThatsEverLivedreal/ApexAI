"""
=============================================================================
ApexAI DEMO MODE - FAKE LEARNER (demo/fake_learner.py)
-----------------------------------------------------------------------------
WARNING: THIS SCRIPT CONTAINS NO LEARNING ALGORITHM, SIMULATION, OR PHYSICS.
It is an isolated mock emitter designed exclusively for previewing and testing
the desktop telemetry UI, live SVG track map, charts, and speed modes.
It trains absolutely nothing.
=============================================================================
"""

import sys
import os
import time
import math
import random
import json

# Add project root to sys.path so we can import f1ui_bridge
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from f1ui_bridge import bridge

def save_state(checkpoint_dir):
    """Demo state save hook"""
    os.makedirs(checkpoint_dir, exist_ok=True)
    with open(os.path.join(checkpoint_dir, "weights_fake.json"), "w") as f:
        json.dump({
            "is_fake": True,
            "demo_weights": [random.uniform(-1, 1) for _ in range(16)],
            "saved_at": time.time()
        }, f, indent=2)
    print(f"[DEMO FAKE LEARNER] Checkpoint snapshot saved to {checkpoint_dir}")

def load_state(checkpoint_dir):
    """Demo state load hook"""
    ckpt_file = os.path.join(checkpoint_dir, "weights_fake.json")
    if os.path.exists(ckpt_file):
        with open(ckpt_file, "r") as f:
            data = json.load(f)
        print(f"[DEMO FAKE LEARNER] Checkpoint restored from {checkpoint_dir}")

def main():
    print("---------------------------------------------------------------")
    print("  [DEMO] Starting Fake Learner Process (Emitting Synthetic Laps)")
    print("---------------------------------------------------------------")

    bridge.register_state_hooks(save_state, load_state)
    bridge.connect()

    # Track definition points for Silverstone GP representation (0 to 1 normalized perimeter)
    car_count = bridge.config.get("run", {}).get("count", 2)
    cars_data = [
        {"id": f"CAR-{i+1:02d}", "progress": (i * 0.45) % 1.0, "speed": 65.0 + i * 2.0}
        for i in range(car_count)
    ]

    cycle_seq = ["out", "push", "in", "out", "push", "in"]
    cycle_idx = 0
    lap_counter = 0
    phase = "track_training"
    bridge.set_phase(phase)

    best_lap = 84.150
    lap_history = []
    fail_reasons_pool = ["Apex overshoot Turn 3", "Rumble curb spin Turn 9", "Oversteer snap Turn 14", "Tyre thermal degradation"]
    fail_counter = 0

    last_frame_time = time.time()
    last_stats_time = time.time()
    lap_start_time = time.time()

    # Base reference lap time
    ref_lap_time = 85.500

    while not bridge.should_stop():
        if bridge.is_paused():
            time.sleep(0.1)
            continue

        now = time.time()
        mode = bridge.mode

        # Pacing: in NO mode, pace around lap_seconds (default 15s)
        # in LOW and HIGH, unpaced (speed up 4x for testing throughput)
        pacing_speed = 1.0 if mode == "no" else 3.5

        dt = now - last_frame_time
        if dt <= 0:
            dt = 0.033
        last_frame_time = now

        # Update synthetic car positions
        frame_cars = []
        for i, car in enumerate(cars_data):
            # Advance progress along circuit
            delta_prog = (dt * pacing_speed) / 15.0
            car["progress"] = (car["progress"] + delta_prog) % 1.0

            # Compute parametric position around standard Grand Prix closed curve
            theta = car["progress"] * 2.0 * math.pi
            # Complex spline approximation coordinates for Silverstone GP
            r = 180 + 35 * math.sin(2 * theta) - 25 * math.cos(3 * theta) + 15 * math.sin(5 * theta)
            cx = 400 + r * math.cos(theta) * 1.5
            cy = 280 + r * math.sin(theta) * 0.95
            heading = (theta + math.pi / 2) % (2 * math.pi)

            # Segment detection (25 segments)
            seg_idx = int(car["progress"] * 25)
            frame_cars.append({
                "id": car["id"],
                "name": f"ApexBot #{i+1}",
                "x": round(cx, 1),
                "y": round(cy, 1),
                "heading": round(heading, 3),
                "segment": seg_idx,
                "progress": round(car["progress"], 4),
                "speed_kmh": round(180 + 130 * math.sin(car["progress"] * 6 * math.pi) + random.uniform(-2, 2), 1)
            })

        # Emit frames in NO mode at max 30 FPS
        if mode == "no":
            bridge.emit_frame(frame_cars)

        # Check if lead car completed a lap
        lap_elapsed = now - lap_start_time
        target_lap_duration = 15.0 / pacing_speed

        if lap_elapsed >= target_lap_duration:
            lap_start_time = now
            lap_counter += 1
            current_lap_type = cycle_seq[cycle_idx % len(cycle_seq)]
            cycle_idx += 1

            if lap_counter == 8:
                phase = "quali_training"
                bridge.set_phase(phase)

            # Generate synthetic lap telemetry
            is_push = (current_lap_type == "push")
            has_crashed = False
            fail_reason = None

            # 12% chance of crash/fail on push lap
            if is_push and random.random() < 0.12:
                has_crashed = True
                fail_counter += 1
                fail_reason = random.choice(fail_reasons_pool)

            # Lap time calculation
            if is_push and not has_crashed:
                delta = random.uniform(-0.85, 0.45)
                lap_time = ref_lap_time + delta
                if lap_time < best_lap:
                    best_lap = lap_time
            elif is_push and has_crashed:
                delta = 14.5
                lap_time = ref_lap_time + delta
            else:
                # in or out lap
                delta = random.uniform(8.0, 18.0)
                lap_time = ref_lap_time + delta

            # 3 sector times
            s1 = lap_time * 0.31 + random.uniform(-0.1, 0.1)
            s2 = lap_time * 0.42 + random.uniform(-0.1, 0.1)
            s3 = lap_time - s1 - s2

            # 25 mini-segments colors
            segments = []
            for s in range(25):
                seg_type = "straight" if s in [0, 1, 7, 8, 14, 15, 23, 24] else ("intermediate" if s in [2, 6, 9, 13, 16, 22] else "corner")
                # purple = best, green = PB, yellow = slower, red = slower > 0.2s
                col = random.choice(["green", "green", "purple", "yellow"])
                if has_crashed and s >= 23:
                    col = "red"
                segments.append({
                    "id": s,
                    "type": seg_type,
                    "colour": col,
                    "time": round(lap_time / 25.0 + random.uniform(-0.05, 0.05), 3)
                })

            # Tyre health degrades monotonically along a clean downward slope without bouncing or oscillating
            tyre_health = round(max(8.0, 100.0 - max(0, lap_counter - 1) * 1.85), 1)
            battery_s3 = round(random.uniform(78.0, 99.5), 1)

            crash_obj = None
            if has_crashed:
                crash_obj = {
                    "type": random.choice(["push_corner", "push_intermediate"]),
                    "location_type": "corner",
                    "segment": 24
                }

            # Reward breakdown
            reward_breakdown = {}
            if is_push and not has_crashed:
                c = 20000.0
                d = 5.0
                upside = c * (math.exp(d * max(0.0, -delta)) - 1) if delta < 0 else 0.0
                slow_pen = -5.0 * delta if delta > 0 else 0.0
                reward_breakdown = {
                    "upside_reward": round(upside, 1),
                    "slow_penalty": round(slow_pen, 1),
                    "sector_smoothness": round(random.uniform(150, 400), 1),
                    "net_total": round(upside + slow_pen + 250, 1)
                }
            elif has_crashed:
                reward_breakdown = {
                    "crash_penalty": -1000000.0,
                    "segment_wipe": -250.0,
                    "net_total": -1000250.0
                }
            else:
                reward_breakdown = {
                    "inout_pacing": 300.0 if delta < 15.0 else -1200.0,
                    "tyre_prep_readiness": 450.0,
                    "net_total": 750.0
                }

            # Emit lap
            bridge.emit_lap(
                car=cars_data[0]["id"],
                lap=lap_counter,
                lap_type=current_lap_type,
                cycle_pos=((cycle_idx - 1) % len(cycle_seq)) + 1,
                lap_time=round(lap_time, 3),
                sectors=[round(s1, 3), round(s2, 3), round(s3, 3)],
                segments=segments,
                delta=round(delta, 3),
                tyre_health=round(tyre_health, 1),
                battery_s3=battery_s3,
                crash=crash_obj,
                fail_reason=fail_reason,
                reward_breakdown=reward_breakdown
            )

            # Emit learner metrics (for 4th live chart)
            bridge.emit_metrics({
                "Policy Loss": round(random.uniform(0.015, 0.085) * math.exp(-lap_counter / 50.0), 4),
                "Value Head Loss": round(random.uniform(0.1, 0.4) * math.exp(-lap_counter / 70.0), 4),
                "Entropy": round(max(0.01, 0.65 - lap_counter * 0.005), 3),
                "ERS Efficiency %": round(min(98.5, 75.0 + lap_counter * 0.4), 1),
                "Apex Proximity (cm)": round(max(5.0, 45.0 - lap_counter * 0.5 + random.uniform(-3, 3)), 1)
            })

            # Update stats
            lap_history.append({"lap": lap_counter, "time": lap_time, "is_push": is_push, "crash": has_crashed, "delta": delta})
            push_laps = [l for l in lap_history if l["is_push"]]
            success_push = [l for l in push_laps if not l["crash"]]

            fail_rate = (len(push_laps) - len(success_push)) / max(1, len(push_laps)) * 100.0
            avg_lap = sum(l["time"] for l in success_push) / max(1, len(success_push)) if success_push else ref_lap_time
            avg_delta = sum(l["delta"] for l in success_push) / max(1, len(success_push)) if success_push else 0.0
            consistency = max(0.0, 100.0 - (fail_rate * 1.5 + random.uniform(2, 6)))
            success_pct = 100.0 - fail_rate

            stats = {
                "phase": phase,
                "best": round(best_lap, 3),
                "avg": round(avg_lap, 3),
                "fail_rate": round(fail_rate, 1),
                "top_fail": fail_reasons_pool[0] if fail_counter > 0 else "None",
                "fail_top3": [fail_reasons_pool[0], fail_reasons_pool[1], fail_reasons_pool[2]],
                "avg_delta": round(avg_delta, 3),
                "consistency": round(consistency, 1),
                "success": round(success_pct, 1),
                "laps_per_sec": round(1.0 / max(0.001, target_lap_duration), 2),
                "cpu_pct": random.randint(18, 29),
                "temp_c": random.randint(62, 74),
                "ram_pct": random.randint(38, 46)
            }
            bridge.emit_stats(
                best=stats["best"],
                avg=stats["avg"],
                fail_rate=stats["fail_rate"],
                fail_top3=stats["fail_top3"],
                avg_delta=stats["avg_delta"],
                consistency=stats["consistency"],
                success=stats["success"]
            )

            # Terminal print in HIGH mode
            bridge.terminal_status(stats, lap_counter, circuit="Silverstone GP")

        time.sleep(0.033)  # approx 30 Hz loop


if __name__ == "__main__":
    main()
