"""
LoRA utility functions for the Super LoRA Loader
"""

import os
from typing import Optional, List, Dict, Any
import json

try:
    import folder_paths
    COMFYUI_AVAILABLE = True
except ImportError:
    print("Super LoRA Loader: ComfyUI folder_paths not available")
    folder_paths = None
    COMFYUI_AVAILABLE = False


def get_lora_by_filename(filename: str) -> Optional[str]:
    """
    Get the full path to a LoRA file by its filename.
    
    Args:
        filename: The LoRA filename (e.g., "my_lora.safetensors")
        
    Returns:
        Full path to the LoRA file, or None if not found
    """
    if not filename or filename == "None":
        return None
    
    if not COMFYUI_AVAILABLE or folder_paths is None:
        print(f"Super LoRA Loader: Cannot find LoRA '{filename}' - ComfyUI not available")
        return None
        
    try:
        lora_paths = folder_paths.get_filename_list("loras")
        
        # Try exact match first
        if filename in lora_paths:
            return filename
            
        # Try case-insensitive match
        filename_lower = filename.lower()
        for lora_path in lora_paths:
            if lora_path.lower() == filename_lower:
                return lora_path
                
        print(f"Super LoRA Loader: LoRA file '{filename}' not found")
        return None
    except Exception as e:
        print(f"Super LoRA Loader: Error accessing LoRA files: {e}")
        return None


def _resolve_lora_full_path(lora_identifier: str) -> Optional[str]:
    """
    Resolve a LoRA identifier (filename or absolute path) to an absolute path.
    """
    try:
        # If already an absolute path and exists, return as-is
        if os.path.isabs(lora_identifier) and os.path.exists(lora_identifier):
            return lora_identifier
        if not COMFYUI_AVAILABLE or folder_paths is None:
            return None
        # folder_paths returns relative paths for loras; join with first loras dir
        lora_dirs = folder_paths.get_folder_paths("loras")
        if not lora_dirs:
            return None
        # The identifier may include subdirectories; join with base dir
        full_path = os.path.join(lora_dirs[0], lora_identifier)
        if os.path.exists(full_path):
            return full_path
        # Try alternate cases: search list for case-insensitive match
        available = folder_paths.get_filename_list("loras")
        ident_lower = lora_identifier.lower()
        for rel in available:
            if rel.lower() == ident_lower:
                candidate = os.path.join(lora_dirs[0], rel)
                if os.path.exists(candidate):
                    return candidate
        return None
    except Exception:
        return None


def extract_trigger_words(lora_identifier: str, max_words: int = 3) -> List[str]:
    """
    Extract trigger words from LoRA metadata (e.g., Kohya ss_tag_frequency or ss_trained_words) in safetensors.
    
    Args:
        lora_identifier: Filename (relative to loras dir) or absolute path
        max_words: Maximum number of trigger words to extract
        
    Returns:
        List of trigger words
    """
    try:
        # Resolve to a full path within ComfyUI loras directory
        full_path = _resolve_lora_full_path(lora_identifier)
        if not full_path or not os.path.exists(full_path):
            return []

        # Use safetensors to read metadata when available
        try:
            from safetensors import safe_open  # type: ignore
        except Exception:
            safe_open = None

        metadata: Dict[str, Any] = {}
        if safe_open is not None:
            try:
                with safe_open(full_path, framework="pt", device="cpu") as f:
                    metadata = f.metadata() or {}
            except Exception:
                metadata = {}

        words: List[str] = []

        # 1) Kohya metadata: ss_tag_frequency (JSON string)
        tag_freq = metadata.get("ss_tag_frequency") if metadata else None
        if isinstance(tag_freq, str):
            try:
                parsed = json.loads(tag_freq)
                # parsed may be a dict[tag]->count or nested dict
                flat: Dict[str, float] = {}
                def add_counts(obj: Any):
                    if isinstance(obj, dict):
                        for k, v in obj.items():
                            if isinstance(v, (int, float)):
                                flat[k] = flat.get(k, 0) + float(v)
                            else:
                                add_counts(v)
                    elif isinstance(obj, list):
                        for it in obj:
                            add_counts(it)
                add_counts(parsed)
                if flat:
                    sorted_tags = sorted(flat.items(), key=lambda kv: kv[1], reverse=True)
                    for tag, _ in sorted_tags:
                        t = str(tag).strip()
                        if t:
                            words.append(t)
                            if len(words) >= max_words:
                                break
            except Exception:
                pass

        # 2) Kohya metadata: ss_trained_words (string or JSON list)
        if not words:
            trained = metadata.get("ss_trained_words") if metadata else None
            if isinstance(trained, str):
                # Try JSON first
                parsed_list: Optional[List[str]] = None
                try:
                    maybe = json.loads(trained)
                    if isinstance(maybe, list):
                        parsed_list = [str(x).strip() for x in maybe if str(x).strip()]
                except Exception:
                    pass
                if parsed_list:
                    words.extend(parsed_list[:max_words])
                else:
                    # Fallback: split by commas or whitespace
                    tokens = [t.strip() for t in trained.replace("\n", " ").split(",")]
                    tokens = [t for tt in tokens for t in tt.split()]
                    tokens = [t for t in tokens if t]
                    if tokens:
                        words.extend(tokens[:max_words])
            elif isinstance(trained, list):
                tokens = [str(x).strip() for x in trained if str(x).strip()]
                words.extend(tokens[:max_words])

        # 3) Any other metadata keys containing 'trainedWords' or 'trigger'
        if not words and metadata:
            for key, val in metadata.items():
                lk = str(key).lower()
                if "trainedwords" in lk or "trigger" in lk:
                    if isinstance(val, str):
                        try:
                            maybe = json.loads(val)
                            if isinstance(maybe, list):
                                words.extend([str(x).strip() for x in maybe if str(x).strip()])
                            elif isinstance(maybe, str):
                                words.append(maybe.strip())
                        except Exception:
                            for token in [t.strip() for t in val.replace("\n", " ").split(",")]:
                                if token:
                                    words.append(token)
                    elif isinstance(val, list):
                        words.extend([str(x).strip() for x in val if str(x).strip()])
                if len(words) >= max_words:
                    break

        # Deduplicate and clamp
        out: List[str] = []
        for w in words:
            if w and w not in out:
                out.append(w)
            if len(out) >= max_words:
                break
        return out
    except Exception as e:
        print(f"Super LoRA Loader: Error extracting trigger words: {e}")
        return []


def get_available_loras() -> List[str]:
    """
    Get a list of all available LoRA files.
    
    Returns:
        List of LoRA filenames
    """
    if not COMFYUI_AVAILABLE or folder_paths is None:
        print("Super LoRA Loader: Cannot get LoRA list - ComfyUI not available")
        return []
        
    try:
        return folder_paths.get_filename_list("loras")
    except Exception as e:
        print(f"Super LoRA Loader: Error getting LoRA list: {e}")
        return []


def validate_lora_config(config: dict) -> bool:
    """
    Validate a LoRA configuration dict.
    
    Args:
        config: LoRA configuration dictionary
        
    Returns:
        True if valid, False otherwise
    """
    required_fields = ['lora', 'enabled']
    
    for field in required_fields:
        if field not in config:
            return False
            
    # Check that strength values are valid
    strength_model = config.get('strength_model', 1.0)
    strength_clip = config.get('strength_clip', strength_model)
    
    try:
        float(strength_model)
        float(strength_clip)
    except (ValueError, TypeError):
        return False
        
    return True
