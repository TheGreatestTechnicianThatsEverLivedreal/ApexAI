"""
ApexAI Learner Template (learner_template.py)
Skeleton script providing hooks and integration with ApexAI Core.
Place your custom reinforcement learning algorithm or policy gradient loop inside.
"""

import os
import sys
import time
import json
import math

# Ensure parent and script directory are in sys.path so f1ui_bridge can always be imported
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_PARENT_DIR = os.path.abspath(os.path.join(_CURRENT_DIR, ".."))
for _p in [_CURRENT_DIR, _PARENT_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from f1ui_bridge import bridge

def save_state(checkpoint_dir):
    """
    Hook called during manual or rolling autosave checkpoints.
    Save model weights, optimiser state, RNG state, replay buffer metadata, etc.
    All floating point values must be finite (no NaN or Inf).
    """
    state_file = os.path.join(checkpoint_dir, "weights_and_state.json")
    state_data = {
        "timestamp": time.time(),
        "model_version": "custom_agent_v1",
        "step_count": 0,
        "dummy_weights": [0.012, -0.441, 0.982, 0.125]
    }
    with open(state_file, "w") as f:
        json.dump(state_data, f, indent=2)
    print(f"[Learner] Checkpoint state written to {checkpoint_dir}")


def load_state(checkpoint_dir):
    """
    Hook called when resuming from an autosave or existing model checkpoint.
    """
    state_file = os.path.join(checkpoint_dir, "weights_and_state.json")
    if os.path.exists(state_file):
        with open(state_file, "r") as f:
            data = json.load(f)
        print(f"[Learner] Restored state from {checkpoint_dir}: step {data.get('step_count')}")


def main():
    # Register persistence hooks
    bridge.register_state_hooks(save_state, load_state)

    # Connect to ApexAI supervisor
    bridge.connect()

    print("[Learner] Agent loop initialized. Listening to simulation...")

    # =========================================================================
    # YOUR LEARNER CODE HERE
    # Connect your simulation worker batch, policy network, and optimizer.
    # Note: Use bridge.mode to adapt pacing ('no' = interactive, 'low' = throttled UI, 'high' = webview off).
    # Use bridge.emit_lap, bridge.emit_frame, bridge.emit_stats, and bridge.emit_metrics.
    # =========================================================================

    step = 0
    while not bridge.should_stop():
        if bridge.is_paused():
            time.sleep(0.1)
            continue

        # Sim stepping and agent update logic goes here
        step += 1
        time.sleep(0.05)

    print("[Learner] Execution concluded gracefully.")


if __name__ == "__main__":
    main()
