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

        # Prepare CivitAI service for optional trigger fetches
        civitai_service = None
        try:
            civitai_service = get_civitai_service()
        except Exception:
            civitai_service = None

        # Process each LoRA configuration
        for i, config in enumerate(lora_configs):
            # Normalize config field names from various frontends/templates
            lora_name = config.get('lora', 'None') or config.get('file') or config.get('name') or 'None'
            enabled = config.get('enabled', True) if config.get('enabled') is not None else bool(config.get('on', True))

            # Strengths (accept both camelCase and snake_case and legacy fields)
            strength_model_val = (
                config.get('strength_model', None)
                if config.get('strength_model', None) is not None else config.get('strength', None)
            )
            strength_clip_val = (
                config.get('strength_clip', None)
                if config.get('strength_clip', None) is not None else (config.get('strengthClip', None) if config.get('strengthClip', None) is not None else config.get('strength', None))
            )
            strength_model = float(strength_model_val if strength_model_val is not None else 1.0)
            strength_clip = float(strength_clip_val if strength_clip_val is not None else strength_model)

            # Trigger word (camelCase or snake_case)
            tw = config.get('trigger_word', None)
            if tw is None:
                tw = config.get('triggerWords', '')
            trigger_word = str(tw or '').strip()

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

                        # Ensure trigger word exists: if empty, try metadata, then CivitAI
                        if not trigger_word:
                            # 1) Try embedded metadata (if implemented)
                            try:
                                meta_words = extract_trigger_words(lora_path) or []
                            except Exception:
                                meta_words = []

                            if meta_words:
                                trigger_word = str(meta_words[0]).strip()
                            elif civitai_service is not None:
                                try:
                                    words = civitai_service.get_trigger_words_sync(lora_name) or []
                                    if words:
                                        trigger_word = str(words[0]).strip()
                                except Exception:
                                    pass

                        # Collect trigger words if now present
                        if trigger_word:
                            trigger_words.append(trigger_word)

                        print(f"Super LoRA Loader: Loaded LoRA '{lora_name}' with strengths {strength_model}/{strength_clip}")

            except Exception as e:
                print(f"Super LoRA Loader: Error loading LoRA '{lora_name}': {e}")
                continue

        # Combine trigger words
        combined_trigger_words = ", ".join(trigger_words) if trigger_words else ""

        return (current_model, current_clip, combined_trigger_words)
