"""
Super LoRA Loader - ComfyUI Custom Node
A modern, standalone implementation for loading multiple LoRAs with advanced features.
"""

# Import from the backend module
try:
    from .backend import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
except ImportError:
    # Fallback for direct execution
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
    from backend import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

# Re-export for ComfyUI
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

# Module metadata
__version__ = "1.0.0"
__author__ = "Super LoRA Loader Team"
__description__ = "A modern Super LoRA Loader with advanced features"

print("Super LoRA Loader: Module loaded successfully")

# This is the crucial part that makes the `web` directory available.
WEB_DIRECTORY = "./web"

# Register web API routes if server is available
try:
    from server import PromptServer
    from .backend.web_api import register_routes
    
    # Register our API routes
    register_routes(PromptServer.instance.app)
    print("Super LoRA Loader: Web API routes registered")
except ImportError:
    print("Super LoRA Loader: Server not available, skipping web API registration")
except Exception as e:
    print(f"Super LoRA Loader: Failed to register web API routes: {e}")
