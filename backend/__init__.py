"""
Super LoRA Loader - ComfyUI Custom Node
A standalone, modern implementation for loading multiple LoRAs with advanced features.
"""

try:
    from .super_lora_node import SuperLoraLoader
    from .test_text_node import SuperTestEcho
except ImportError:
    # Fallback for development/testing
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from super_lora_node import SuperLoraLoader
    from test_text_node import SuperTestEcho

NODE_CLASS_MAPPINGS = {
    "SuperLoraLoader": SuperLoraLoader,
    "SuperTestEcho": SuperTestEcho,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SuperLoraLoader": "Super LoRA Loader",
    "SuperTestEcho": "Super Test: Echo",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

# Register HTTP routes with ComfyUI's PromptServer when available
try:
    from .web_api import register_routes as _register_super_lora_routes
    try:
        from server import PromptServer  # ComfyUI's server
        _app = getattr(PromptServer.instance, "app", None) or PromptServer.instance
        if _app:
            _register_super_lora_routes(_app)
            print("Super LoRA Loader: API routes registered")
    except Exception as _e:
        print(f"Super LoRA Loader: Failed to register API routes: {_e}")
except Exception:
    # Safe to ignore if web_api is unavailable in certain environments
    pass
