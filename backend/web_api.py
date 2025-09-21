"""
Web API endpoints for Super LoRA Loader
"""

import json
from aiohttp import web
from .lora_utils import get_available_loras
from .template_manager import get_template_manager
from .civitai_service import get_civitai_service


async def get_loras(request):
    """Get list of available LoRA files"""
    try:
        loras = get_available_loras()
        return web.json_response({"loras": loras})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def get_templates(request):
    """Get list of available templates or a specific template by query param"""
    try:
        template_manager = get_template_manager()

        # Support GET /super_lora/templates?name=Foo for compatibility
        name = request.rel_url.query.get("name")
        if name:
            template = template_manager.load_template(name)
            if template:
                return web.json_response(template)
            return web.json_response({"error": "Template not found"}, status=404)

        templates = template_manager.list_templates()
        return web.json_response({"templates": templates})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def save_template(request):
    """Save a LoRA template or handle action-based operations (e.g., delete)"""
    try:
        data = await request.json()
        action = data.get("action")

        # Backward-compatible action handler: POST with { action: 'delete', name }
        if action == "delete":
            name = data.get("name")
            if not name:
                return web.json_response({"error": "Template name is required"}, status=400)
            template_manager = get_template_manager()
            deleted = template_manager.delete_template(name)
            if deleted:
                return web.json_response({"success": True, "message": f"Template '{name}' deleted"})
            return web.json_response({"error": "Template not found or could not be deleted"}, status=404)

        name = data.get("name")
        # Accept both 'lora_configs' (preferred) and 'loras' (compat)
        lora_configs = data.get("lora_configs")
        if lora_configs is None:
            lora_configs = data.get("loras", [])

        if not name:
            return web.json_response({"error": "Template name is required"}, status=400)

        template_manager = get_template_manager()
        success = template_manager.save_template(name, lora_configs)

        if success:
            return web.json_response({"success": True, "message": f"Template '{name}' saved"})
        else:
            return web.json_response({"error": "Failed to save template"}, status=500)

    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def load_template(request):
    """Load a LoRA template"""
    try:
        template_name = request.match_info.get("name")
        
        if not template_name:
            return web.json_response({"error": "Template name is required"}, status=400)
        
        template_manager = get_template_manager()
        template_data = template_manager.load_template(template_name)
        
        if template_data:
            return web.json_response(template_data)
        else:
            return web.json_response({"error": "Template not found"}, status=404)
            
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def get_civitai_info(request):
    """Get CivitAI info for a LoRA"""
    try:
        data = await request.json()
        lora_filename = data.get("lora_filename")
        
        if not lora_filename:
            return web.json_response({"error": "LoRA filename is required"}, status=400)
        
        civitai_service = get_civitai_service()
        trigger_words = await civitai_service.get_trigger_words(lora_filename)
        
        return web.json_response({
            "lora_filename": lora_filename,
            "trigger_words": trigger_words,
            "success": True
        })
        
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def delete_template(request):
    """Delete a template via JSON body: { name }"""
    try:
        data = await request.json()
        name = data.get("name")
        if not name:
            return web.json_response({"error": "Template name is required"}, status=400)
        template_manager = get_template_manager()
        deleted = template_manager.delete_template(name)
        if deleted:
            return web.json_response({"success": True, "message": f"Template '{name}' deleted"})
        return web.json_response({"error": "Template not found"}, status=404)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def delete_template_by_name(request):
    """Delete a template by path parameter"""
    try:
        name = request.match_info.get("name")
        if not name:
            return web.json_response({"error": "Template name is required"}, status=400)
        template_manager = get_template_manager()
        deleted = template_manager.delete_template(name)
        if deleted:
            return web.json_response({"success": True, "message": f"Template '{name}' deleted"})
        return web.json_response({"error": "Template not found"}, status=404)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


# Route registration function
def register_routes(app):
    """Register all Super LoRA Loader routes"""
    app.router.add_get("/super_lora/loras", get_loras)
    app.router.add_get("/super_lora/templates", get_templates)
    app.router.add_post("/super_lora/templates", save_template)
    app.router.add_get("/super_lora/templates/{name}", load_template)
    # Deletion endpoints (compatibility and RESTful)
    app.router.add_delete("/super_lora/templates", delete_template)  # expects JSON body { name }
    app.router.add_post("/super_lora/templates/delete", delete_template)  # expects JSON body { name }
    app.router.add_delete("/super_lora/templates/{name}", delete_template_by_name)
    app.router.add_post("/super_lora/civitai_info", get_civitai_info)
