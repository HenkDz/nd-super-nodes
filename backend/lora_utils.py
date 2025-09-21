"""
LoRA utility functions for the Super LoRA Loader
"""

import os
from typing import Optional, List

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


def extract_trigger_words(lora_path: str, max_words: int = 3) -> List[str]:
    """
    Extract trigger words from LoRA metadata.
    
    Args:
        lora_path: Path to the LoRA file
        max_words: Maximum number of trigger words to extract
        
    Returns:
        List of trigger words
    """
    # This is a placeholder implementation
    # In a real implementation, you would read the LoRA file metadata
    # and extract trigger words from the training data or embedded metadata
    
    try:
        # For now, return empty list
        # TODO: Implement actual metadata extraction
        return []
    except Exception as e:
        print(f"Super LoRA Loader: Error extracting trigger words from '{lora_path}': {e}")
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
