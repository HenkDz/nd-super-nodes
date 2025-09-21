"""
Super LoRA Loader - ComfyUI Custom Node
A standalone, modern implementation for loading multiple LoRAs with advanced features.
"""

try:
    from .super_lora_node import SuperLoraLoader
except ImportError:
    # Fallback for development/testing
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from super_lora_node import SuperLoraLoader

NODE_CLASS_MAPPINGS = {
    "SuperLoraLoader": SuperLoraLoader
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SuperLoraLoader": "Super LoRA Loader"
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
