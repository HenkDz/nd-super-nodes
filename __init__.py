"""
ND Super Nodes - ComfyUI Custom Nodes
A suite of modern, standalone implementations for enhanced LoRA loading and UI features.
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
__author__ = "ND Super Nodes Team"
__description__ = "A suite of ND Super Nodes with advanced LoRA loading and UI enhancements"

print("ND Super Nodes: Module loaded successfully")

# This is the crucial part that makes the `web` directory available.
WEB_DIRECTORY = "./web"

# Register web API routes if server is available
try:
    from server import PromptServer
    from .backend.web_api import register_routes
    
    # Register our API routes
    register_routes(PromptServer.instance.app)
    print("ND Super Nodes: Web API routes registered")
except ImportError:
    print("ND Super Nodes: Server not available, skipping web API registration")
except Exception as e:
    print(f"ND Super Nodes: Failed to register web API routes: {e}")
