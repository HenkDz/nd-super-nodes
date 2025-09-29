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
from .version_utils import get_update_status
from .prompt_manager import get_prompt_manager


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


async def get_version_info(request):
    """Return local version info plus cached update availability."""
    try:
        force = request.rel_url.query.get("force") in {"1", "true", "yes"}
        status = await get_update_status(force=force)
        return web.json_response(status)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


# ========== Prompt Builder API Endpoints ==========

async def get_prompt_history(request):
    """Get prompt history."""
    try:
        limit = int(request.rel_url.query.get("limit", "50"))
        prompt_manager = get_prompt_manager()
        history = prompt_manager.get_history(limit=limit)
        return web.json_response({"history": history})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def add_prompt_history(request):
    """Add entry to prompt history."""
    try:
        data = await request.json()
        positive = data.get("positive", "")
        negative = data.get("negative", "")
        segments = data.get("segments", [])
        metadata = data.get("metadata", {})
        
        prompt_manager = get_prompt_manager()
        entry_id = prompt_manager.add_to_history(
            positive=positive,
            negative=negative,
            segments=segments,
            metadata=metadata
        )
        
        return web.json_response({
            "success": True,
            "id": entry_id
        })
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def delete_prompt_history(request):
    """Delete a history entry."""
    try:
        data = await request.json()
        entry_id = data.get("id")
        
        if not entry_id:
            return web.json_response({"error": "Entry ID required"}, status=400)
        
        prompt_manager = get_prompt_manager()
        success = prompt_manager.delete_history_entry(entry_id)
        
        return web.json_response({"success": success})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def clear_prompt_history(request):
    """Clear all prompt history."""
    try:
        prompt_manager = get_prompt_manager()
        success = prompt_manager.clear_history()
        return web.json_response({"success": success})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def search_prompt_history(request):
    """Search prompt history."""
    try:
        query = request.rel_url.query.get("q", "")
        limit = int(request.rel_url.query.get("limit", "20"))
        
        prompt_manager = get_prompt_manager()
        results = prompt_manager.search_history(query, limit=limit)
        
        return web.json_response({"results": results})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def get_prompt_favorites(request):
    """Get all prompt favorites."""
    try:
        prompt_manager = get_prompt_manager()
        favorites = prompt_manager.get_favorites()
        return web.json_response({"favorites": favorites})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def add_prompt_favorite(request):
    """Add a prompt to favorites."""
    try:
        data = await request.json()
        name = data.get("name")
        positive = data.get("positive", "")
        negative = data.get("negative", "")
        segments = data.get("segments", [])
        metadata = data.get("metadata", {})
        
        if not name:
            return web.json_response({"error": "Name required"}, status=400)
        
        prompt_manager = get_prompt_manager()
        entry_id = prompt_manager.add_to_favorites(
            name=name,
            positive=positive,
            negative=negative,
            segments=segments,
            metadata=metadata
        )
        
        return web.json_response({
            "success": True,
            "id": entry_id
        })
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def delete_prompt_favorite(request):
    """Delete a favorite."""
    try:
        data = await request.json()
        entry_id = data.get("id")
        
        if not entry_id:
            return web.json_response({"error": "Entry ID required"}, status=400)
        
        prompt_manager = get_prompt_manager()
        success = prompt_manager.delete_favorite(entry_id)
        
        return web.json_response({"success": success})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def rename_prompt_favorite(request):
    """Rename a favorite."""
    try:
        data = await request.json()
        entry_id = data.get("id")
        new_name = data.get("name")
        
        if not entry_id or not new_name:
            return web.json_response({"error": "ID and name required"}, status=400)
        
        prompt_manager = get_prompt_manager()
        success = prompt_manager.rename_favorite(entry_id, new_name)
        
        return web.json_response({"success": success})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def get_prompt_templates(request):
    """Get prompt templates."""
    try:
        prompt_manager = get_prompt_manager()
        templates = prompt_manager.list_templates()
        return web.json_response({"templates": templates})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def save_prompt_template(request):
    """Save a prompt template."""
    try:
        data = await request.json()
        name = data.get("name")
        segments = data.get("segments", [])
        
        if not name:
            return web.json_response({"error": "Name required"}, status=400)
        
        prompt_manager = get_prompt_manager()
        success = prompt_manager.save_template(name, segments)
        
        return web.json_response({"success": success})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def load_prompt_template(request):
    """Load a prompt template."""
    try:
        name = request.match_info.get("name")
        
        if not name:
            return web.json_response({"error": "Name required"}, status=400)
        
        prompt_manager = get_prompt_manager()
        template = prompt_manager.load_template(name)
        
        if template:
            return web.json_response(template)
        else:
            return web.json_response({"error": "Template not found"}, status=404)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def delete_prompt_template(request):
    """Delete a prompt template."""
    try:
        data = await request.json()
        name = data.get("name")
        
        if not name:
            return web.json_response({"error": "Name required"}, status=400)
        
        prompt_manager = get_prompt_manager()
        success = prompt_manager.delete_template(name)
        
        return web.json_response({"success": success})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


async def rename_prompt_template(request):
    """Rename a prompt template."""
    try:
        data = await request.json()
        old_name = data.get("old_name")
        new_name = data.get("new_name")
        
        if not old_name or not new_name:
            return web.json_response({"error": "Both old and new names required"}, status=400)
        
        prompt_manager = get_prompt_manager()
        success = prompt_manager.rename_template(old_name, new_name)
        
        return web.json_response({"success": success})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


# Route registration function
def register_routes(app):
    """Register all ND Super Nodes API routes"""
    
    # ========== Super LoRA Loader Routes ==========
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
    app.router.add_get("/super_lora/version", get_version_info)

    # Legacy aliases without underscore for older frontends / workflows
    app.router.add_get("/superlora/loras", get_loras)
    app.router.add_get("/superlora/files", get_files)
    app.router.add_get("/superlora/templates", get_templates)
    app.router.add_post("/superlora/templates", save_template)
    app.router.add_get("/superlora/templates/{name}", load_template)
    app.router.add_delete("/superlora/templates", delete_template)
    app.router.add_post("/superlora/templates/delete", delete_template)
    app.router.add_delete("/superlora/templates/{name}", delete_template_by_name)
    app.router.add_post("/superlora/civitai_info", get_civitai_info)
    app.router.add_get("/superlora/version", get_version_info)
    
    # ========== Super Prompt Builder Routes ==========
    # History
    app.router.add_get("/super_prompt/history", get_prompt_history)
    app.router.add_post("/super_prompt/history", add_prompt_history)
    app.router.add_delete("/super_prompt/history", delete_prompt_history)
    app.router.add_post("/super_prompt/history/clear", clear_prompt_history)
    app.router.add_get("/super_prompt/history/search", search_prompt_history)
    
    # Favorites
    app.router.add_get("/super_prompt/favorites", get_prompt_favorites)
    app.router.add_post("/super_prompt/favorites", add_prompt_favorite)
    app.router.add_delete("/super_prompt/favorites", delete_prompt_favorite)
    app.router.add_post("/super_prompt/favorites/rename", rename_prompt_favorite)
    
    # Templates
    app.router.add_get("/super_prompt/templates", get_prompt_templates)
    app.router.add_post("/super_prompt/templates", save_prompt_template)
    app.router.add_get("/super_prompt/templates/{name}", load_prompt_template)
    app.router.add_delete("/super_prompt/templates", delete_prompt_template)
    app.router.add_post("/super_prompt/templates/rename", rename_prompt_template)
