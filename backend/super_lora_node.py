"""
Super LoRA Loader Node - Main implementation
"""

from typing import Union, Dict, Any, Tuple, List

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
    from .civitai_service import CivitAiService
except ImportError:
    # Fallback for development/testing
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from lora_utils import get_lora_by_filename, extract_trigger_words
    from civitai_service import CivitAiService


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
                # Dynamic inputs will be added by the frontend
            },
            "hidden": {}
        }
    
    def load_loras(self, model=None, clip=None, **kwargs) -> Tuple[Any, Any, str]:
        """
        Load multiple LoRAs from custom widget data and return the modified model, clip, and trigger words.

        Args:
            model: Input model (optional)
            clip: Input CLIP (optional) 
            **kwargs: Custom widget data from frontend

        Returns:
            Tuple of (modified_model, modified_clip, combined_trigger_words)
        """
        if not COMFYUI_AVAILABLE:
            print("Super LoRA Loader: ComfyUI not available, cannot load LoRAs")
            return (model, clip, "")

        trigger_words = []
        current_model = model
        current_clip = clip

        # Process custom widget data from frontend
        # The frontend sends serialized custom widget data
        lora_configs = []
        
        # Extract LoRA configurations from widget data
        # Look for any values that look like LoRA configurations
        for key, value in kwargs.items():
            if isinstance(value, dict) and 'lora' in value:
                # This is a LoRA widget configuration
                lora_configs.append(value)
            elif key.startswith('lora_') and isinstance(value, dict):
                # Also check for lora_ prefixed keys
                lora_configs.append(value)

        # If no custom widget data found, try to parse the old format for backward compatibility
        if not lora_configs:
            lora_slots = {}
            
            # Parse old widget format
            for key, value in kwargs.items():
                if key.startswith('LoRA '):
                    try:
                        slot_num = int(key.split(' ')[1]) - 1
                        if slot_num not in lora_slots:
                            lora_slots[slot_num] = {}
                        lora_slots[slot_num]['lora'] = value
                    except:
                        continue
                elif key.startswith('Enable '):
                    try:
                        slot_num = int(key.split(' ')[1]) - 1
                        if slot_num not in lora_slots:
                            lora_slots[slot_num] = {}
                        lora_slots[slot_num]['enabled'] = value
                    except:
                        continue
                elif key.startswith('Strength '):
                    try:
                        slot_num = int(key.split(' ')[1]) - 1
                        if slot_num not in lora_slots:
                            lora_slots[slot_num] = {}
                        lora_slots[slot_num]['strength'] = float(value)
                    except:
                        continue
                elif key.startswith('Trigger Words '):
                    try:
                        slot_num = int(key.split(' ')[2]) - 1
                        if slot_num not in lora_slots:
                            lora_slots[slot_num] = {}
                        lora_slots[slot_num]['trigger_words'] = str(value)
                    except:
                        continue
            
            # Convert old format to new format
            for slot_data in lora_slots.values():
                if slot_data.get('lora') and slot_data.get('lora') != 'None':
                    lora_configs.append({
                        'lora': slot_data.get('lora'),
                        'enabled': slot_data.get('enabled', True),
                        'strength': slot_data.get('strength', 1.0),
                        'strengthClip': slot_data.get('strength', 1.0),
                        'triggerWords': slot_data.get('trigger_words', '')
                    })

        print(f"Super LoRA Loader: Processing {len(lora_configs)} LoRA configurations")

        # Process each LoRA configuration
        for i, config in enumerate(lora_configs):
            lora_name = config.get('lora', 'None')
            enabled = config.get('enabled', True)
            strength_model = float(config.get('strength', 1.0))
            strength_clip = float(config.get('strengthClip', strength_model))
            trigger_word = str(config.get('triggerWords', '')).strip()

            # Skip if not enabled or no LoRA selected
            if not enabled or lora_name == "None" or not lora_name:
                continue

            # Skip if strength is zero
            if strength_model == 0:
                continue

            try:
                # Load the LoRA
                if current_model is not None and LoraLoader is not None:
                    lora_path = get_lora_by_filename(lora_name)
                    if lora_path:
                        current_model, current_clip = LoraLoader().load_lora(
                            current_model,
                            current_clip,
                            lora_path,
                            strength_model,
                            strength_clip
                        )

                        # Collect trigger words if provided
                        if trigger_word:
                            trigger_words.append(trigger_word)

                        print(f"Super LoRA Loader: Loaded LoRA '{lora_name}' with strengths {strength_model}/{strength_clip}")

            except Exception as e:
                print(f"Super LoRA Loader: Error loading LoRA '{lora_name}': {e}")
                continue

        # Combine trigger words
        combined_trigger_words = ", ".join(trigger_words) if trigger_words else ""

        return (current_model, current_clip, combined_trigger_words)
