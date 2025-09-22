"""
Super LoRA Loader Node - Main implementation
"""

from typing import Union, Dict, Any, Tuple, List
import re
import json

# Import ComfyUI modules with fallbacks
try:
    import folder_paths
    from nodes import LoraLoader
    COMFYUI_AVAILABLE = True
except ImportError:
    print("Super LoRA Loader: ComfyUI modules not available (this is normal during development)")
    folder_paths = None
    LoraLoader = None
    COMFYUI_AVAILABLE = False

# Import local modules
try:
    from .lora_utils import get_lora_by_filename, extract_trigger_words
    from .civitai_service import CivitAiService, get_civitai_service
except ImportError:
    # Fallback for development/testing
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from lora_utils import get_lora_by_filename, extract_trigger_words
    from civitai_service import CivitAiService, get_civitai_service


class SuperLoraLoader:
    """
    Super LoRA Loader - A powerful node for loading multiple LoRAs with advanced features.
    
    Features:
    - Multiple LoRA loading in a single node
    - Individual enable/disable controls
    - Dual strength support (model/clip)
    - Automatic trigger word extraction
    - Tag-based organization
    - Template save/load system
    """
    
    CATEGORY = "loaders"
    RETURN_TYPES = ("MODEL", "CLIP", "STRING")
    RETURN_NAMES = ("MODEL", "CLIP", "TRIGGER_WORDS")
    FUNCTION = "load_loras"
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "model": ("MODEL",),
                "clip": ("CLIP",),
                # Frontend will provide a JSON array of lora configs here
                "lora_bundle": ("STRING",),
            },
            "hidden": {}
        }
    
    def load_loras(self, model=None, clip=None, lora_bundle: Union[str, None] = None, **kwargs) -> Tuple[Any, Any, str]:
        """
        Load multiple LoRAs from provided bundle and return modified model, clip, and trigger words.
        """
        if not COMFYUI_AVAILABLE:
            print("Super LoRA Loader: ComfyUI not available, cannot load LoRAs")
            return (model, clip, "")

        trigger_words: List[str] = []
        current_model = model
        current_clip = clip

        print("--- Super LoRA Loader Backend ---")
        print(f"Received lora_bundle length: {len(lora_bundle) if isinstance(lora_bundle, str) else 'None'}")

        # Parse lora configs from the bundle (JSON array)
        lora_configs: List[Dict[str, Any]] = []
        if isinstance(lora_bundle, str) and lora_bundle.strip():
            try:
                parsed = json.loads(lora_bundle)
                if isinstance(parsed, list):
                    lora_configs = parsed
                else:
                    print("Super LoRA Loader: lora_bundle is not a list; ignoring")
            except json.JSONDecodeError as e:
                print(f"Super LoRA Loader: Failed to parse lora_bundle JSON: {e}")
        else:
            # Fallback: try kwargs (legacy/testing paths like lora_1,...)
            for key, val in kwargs.items():
                if key.lower().startswith("lora_") and isinstance(val, dict):
                    lora_configs.append(val)

        print(f"Super LoRA Loader: Parsed {len(lora_configs)} lora configs")

        for value in lora_configs:
            if not isinstance(value, dict):
                continue

            enabled = bool(value.get('enabled', value.get('on', False)))
            if not enabled:
                continue

            lora_name = value.get('lora', 'None')
            if not lora_name or lora_name == "None":
                continue

            strength_model = float(value.get('strength', 1.0))
            strength_clip = float(value.get('strengthClip', value.get('strengthTwo', strength_model)))

            # Respect missing clip
            if current_clip is None:
                if strength_clip != 0:
                    print(f"Super LoRA Loader: Warning - CLIP strength provided without CLIP; ignoring for '{lora_name}'")
                strength_clip = 0

            # Apply lora only if any strength is non-zero
            if (strength_model != 0 or strength_clip != 0) and current_model is not None and LoraLoader is not None:
                try:
                    lora_path = get_lora_by_filename(lora_name)
                    if lora_path:
                        current_model, current_clip = LoraLoader().load_lora(
                            current_model,
                            current_clip,
                            lora_path,
                            strength_model,
                            strength_clip
                        )
                        print(f"Super LoRA Loader: Loaded '{lora_name}' {strength_model}/{strength_clip}")
                    else:
                        print(f"Super LoRA Loader: Could not resolve LoRA file for '{lora_name}'")
                except Exception as e:
                    print(f"Super LoRA Loader: Error loading LoRA '{lora_name}': {e}")
                    # Continue to collect trigger words even if load failed

            # Collect trigger words (from enabled lorAs)
            tw = (value.get('triggerWords') or value.get('triggerWord') or '').strip()
            if tw:
                trigger_words.append(tw)
                print(f"Super LoRA Loader: + trigger '{tw}'")

        combined_trigger_words = ", ".join(trigger_words) if trigger_words else ""
        print(f"Returning trigger words: '{combined_trigger_words}'")
        print("---------------------------------")

        return (current_model, current_clip, combined_trigger_words)


