# ND Super Nodes – AI Assistant Guide

## System map
- ND Super Nodes ships a Python backend under `backend/` plus a TypeScript/Vite frontend in `frontend/`.
- `backend/__init__.py` registers the `NdSuperLoraLoader` node and mounts REST routes when ComfyUI's `PromptServer` is present.
- Built assets in `web/` (`extension.js`, `style.css`) are served via `WEB_DIRECTORY`, so the frontend must be built before runtime changes appear.

## Backend essentials
- `nd_super_lora_node.NdSuperLoraLoader.load_loras` consumes a JSON `lora_bundle` and applies LoRAs with ComfyUI's `LoraLoader`; keep the model input non-null or bail early.
- Hidden widget serialization is mandatory: the frontend injects a text widget named `lora_bundle`, so the backend optional `STRING` input must stay in sync.
- HTTP API lives in `web_api.py` (`/super_lora/*`) for LoRA lists, templates, and CivitAI lookups; file overlay endpoints live in `file_api.py`.
- Template data defaults to the ComfyUI user directory, falling back to the repo `templates/` folder.

## Frontend essentials
- Entry `src/extension.ts` registers two extensions: `SuperLoraNode` (new node) and `NodeEnhancer` (⚡ overlays for stock nodes).
- `SuperLoraNode.initialize` resolves services (`LoraService`, `TemplateService`, `CivitAiService`) asynchronously—never block `beforeRegisterNodeDef`.
- Widget drawing respects `NODE_WIDGET_TOP_OFFSET = 68` everywhere (drawing + pointer math); mixing offsets breaks hit testing.
- Custom widgets live in `src/nodes/widgets/` with `computeSize`, `draw`, and `serializeValue` implementations that feed bundle building.
- `WidgetAPI.ts` bridges UI widgets to services; add helpers there when exposing new actions.

## Data flow & services
- UI edits → `SuperLoraNode.buildBundle` → hidden `lora_bundle` widget → backend optional input for execution.
- `TemplateService` normalizes payloads before POST `/super_lora/templates`; prefer `lora_configs` while accepting legacy shapes.
- `FilePickerService` powers NodeEnhancer overlays by hiding native widgets and drawing the lightning-bordered selector that reuses the same value slot.
- CivitAI trigger words flow through `CivitAiService.getTriggerWords`, with backend fallback to `extract_trigger_words` metadata.

## Dev workflow
- Frontend: `cd frontend`, `bun install`, `bun run dev` for hot reload, `bun run build` (outputs to `../web`), `bun run type-check` for strict TS.
- Backend: no build step; ComfyUI imports Python directly. Optional deps (e.g., `aiohttp`) are listed in `requirements.txt` for CivitAI support.
- Release: `.\release.ps1 -Version "x.y.z"` builds assets and packages the distribution ZIP.

## Pitfalls to watch
- Never remove or rename the hidden `lora_bundle` widget; workflows rely on it for serialization.
- `NodeEnhancerExtension.ENHANCED_NODES` assumes specific ComfyUI widget IDs (`ckpt_name`, `lora_name`, etc.); update the map if upstream changes labels.
- Always transform pointer coordinates with the shared offset before hit tests (`localPos = [pos[0], pos[1] - widgetStartY]`).
- `/super_lora/files` delegates to `folder_paths`; filter extensions server-side to avoid massive payloads.
- Keep Vite's `external` list aligned when importing ComfyUI globals, otherwise builds inline runtime-only modules.

## Reference hotspots
- `docs/COMPREHENSIVE_COMFYUI_NODE_DEV_GUIDE.md` for widget architecture background.
- `frontend/src/services/` for service contracts and fetch signatures.
- `backend/template_manager.py` for template storage rules and sanitization.
