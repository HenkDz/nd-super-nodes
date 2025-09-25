"""
Web API endpoints for ND Super Nodes
"""

import json
from aiohttp import web
import os
try:
    import folder_paths
except Exception:
    folder_paths = None
from .lora_utils import get_available_loras, extract_trigger_words
from .template_manager import get_template_manager
from .civitai_service import get_civitai_service


async def get_loras(request):
    """Get list of available LoRA files"""
    try:
        loras = get_available_loras()
        return web.json_response({"loras": loras})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def get_files(request):
    """Generic file lister using ComfyUI folder_paths (e.g., folder_name=loras|vae|checkpoints)"""
    try:
        folder_name = request.rel_url.query.get("folder_name")
        ext_param = request.rel_url.query.get("extensions", "")
        extensions = [e.strip().lower() for e in ext_param.split(",") if e.strip()]

        if not folder_name:
            return web.json_response({"error": "folder_name is required", "files": []}, status=400)

        if folder_paths is None:
            return web.json_response({"error": "folder_paths unavailable", "files": []}, status=500)

        # Map legacy names and resolve directories
        mapped = folder_paths.map_legacy(folder_name)
        dirs, supported = folder_paths.folder_names_and_paths.get(mapped, ([], set()))
        if not dirs:
            # try direct
            dirs, supported = folder_paths.folder_names_and_paths.get(folder_name, ([], set()))

        # Filter extensions
        if extensions:
            supported = set([e.lower() for e in extensions])

        out_files = []
        for d in dirs:
            if not os.path.isdir(d):
                continue
            try:
                # Recurse into subfolders
                for root, _, files in os.walk(d):
                    for name in files:
                        fp = os.path.join(root, name)
                        if not os.path.isfile(fp):
                            continue
                        _, ext = os.path.splitext(name)
                        if supported and ext.lower() not in supported and supported != {""}:
                            continue
                        st = os.stat(fp)
                        out_files.append({
                            "name": name,
                            "path": os.path.relpath(fp, d).replace("\\", "/"),
                            "extension": ext.lower(),
                            "size": st.st_size,
                            "modified": st.st_mtime
                        })
            except Exception:
                continue

        out_files.sort(key=lambda x: x["name"].lower())
        return web.json_response({"files": out_files, "total": len(out_files)})
    except Exception as e:
        return web.json_response({"error": str(e), "files": []}, status=500)


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

        # Fallback: try extracting from LoRA metadata if CivitAI returns nothing
        if not trigger_words:
            try:
                meta_words = extract_trigger_words(lora_filename)
                if meta_words:
                    trigger_words = meta_words
            except Exception:
                pass

        # Return both 'trigger_words' (our API) and 'trainedWords' (frontend compatibility)
        payload = {
            "lora_filename": lora_filename,
            "trigger_words": trigger_words,
            "trainedWords": trigger_words,
            "success": True
        }

        return web.json_response(payload)
        
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
    app.router.add_get("/super_lora/files", get_files)
    app.router.add_get("/super_lora/templates", get_templates)
    app.router.add_post("/super_lora/templates", save_template)
    app.router.add_get("/super_lora/templates/{name}", load_template)
    # Deletion endpoints (compatibility and RESTful)
    app.router.add_delete("/super_lora/templates", delete_template)  # expects JSON body { name }
    app.router.add_post("/super_lora/templates/delete", delete_template)  # expects JSON body { name }
    app.router.add_delete("/super_lora/templates/{name}", delete_template_by_name)
    app.router.add_post("/super_lora/civitai_info", get_civitai_info)
