"""
ND Super Nodes - ComfyUI Custom Nodes
A suite of standalone, modern implementations for enhanced LoRA loading and UI features.
"""

try:
    from .nd_super_lora_node import NdSuperLoraLoader
    from .test_text_node import SuperTestEcho
except ImportError:
    # Fallback for development/testing
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from nd_super_lora_node import NdSuperLoraLoader
    from test_text_node import SuperTestEcho

NODE_CLASS_MAPPINGS = {
    "NdSuperLoraLoader": NdSuperLoraLoader,
    "NdSuperTestEcho": SuperTestEcho,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "NdSuperLoraLoader": "ND Super LoRA Loader",
    "NdSuperTestEcho": "ND Super Test: Echo",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

# Register HTTP routes with ComfyUI's PromptServer when available
try:
    from .web_api import register_routes as _register_super_lora_routes
    from .file_api import register_file_api_routes as _register_file_api_routes
    try:
        from server import PromptServer  # ComfyUI's server
        _app = getattr(PromptServer.instance, "app", None) or PromptServer.instance
        if _app:
            _register_super_lora_routes(_app)
            _register_file_api_routes(_app)
            print("ND Super Nodes: API routes registered")
    except Exception as _e:
        print(f"ND Super Nodes: Failed to register API routes: {_e}")
except Exception:
    # Safe to ignore if web_api is unavailable in certain environments
    pass
