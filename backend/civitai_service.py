"""
CivitAI API integration for automatic trigger word fetching
"""

import asyncio
import aiohttp
import hashlib
from typing import Optional, List, Dict, Any

from .lora_utils import resolve_lora_full_path

try:
    import folder_paths
    COMFYUI_AVAILABLE = True
except ImportError:
    print("Super LoRA Loader: ComfyUI folder_paths not available for CivitAI service")
    folder_paths = None
    COMFYUI_AVAILABLE = False


class CivitAiService:
    """
    Service for fetching LoRA metadata from CivitAI API.
    """
    
    BASE_URL = "https://civitai.com/api/v1"
    
    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close(self):
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    def _calculate_file_hash(self, file_path: str) -> Optional[str]:
        """
        Calculate SHA256 hash of a LoRA file.
        
        Args:
            file_path: Path to the LoRA file
            
        Returns:
            SHA256 hash string, or None if error
        """
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest().upper()
        except Exception as e:
            print(f"CivitAI Service: Error calculating hash for '{file_path}': {e}")
            return None
    
    async def get_model_info_by_hash(self, file_hash: str) -> Optional[Dict[str, Any]]:
        """
        Get model information from CivitAI by file hash.
        
        Args:
            file_hash: SHA256 hash of the model file
            
        Returns:
            Model information dict, or None if not found
        """
        if file_hash in self._cache:
            return self._cache[file_hash]
        
        try:
            session = await self._get_session()
            url = f"{self.BASE_URL}/model-versions/by-hash/{file_hash}"
            
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    self._cache[file_hash] = data
                    return data
                elif response.status == 404:
                    # Model not found on CivitAI
                    return None
                else:
                    print(f"CivitAI Service: API error {response.status} for hash {file_hash}")
                    return None
                    
        except Exception as e:
            print(f"CivitAI Service: Error fetching model info for hash {file_hash}: {e}")
            return None
    
    async def get_trigger_words(self, lora_filename: str) -> List[str]:
        """
        Get trigger words for a LoRA file from CivitAI.
        
        Args:
            lora_filename: Name of the LoRA file
            
        Returns:
            List of trigger words
        """
        if not COMFYUI_AVAILABLE or folder_paths is None:
            print("Super LoRA Loader: Cannot get trigger words - ComfyUI not available")
            return []
            
        try:
            full_path = resolve_lora_full_path(lora_filename)
            if not full_path:
                print(f"CivitAI Service: LoRA file '{lora_filename}' not found in configured directories")
                return []
            
            # Calculate file hash
            file_hash = self._calculate_file_hash(full_path)
            if not file_hash:
                return []
            
            # Get model info from CivitAI
            model_info = await self.get_model_info_by_hash(file_hash)
            if not model_info:
                return []
            
            # Extract trigger words
            trigger_words = []
            
            # Try to get trained words from the model version
            trained_words = model_info.get("trainedWords", [])
            if trained_words:
                # Take up to 3 most common trigger words
                for word in trained_words[:3]:
                    if isinstance(word, str):
                        trigger_words.append(word)
                    elif isinstance(word, dict) and "word" in word:
                        trigger_words.append(word["word"])
            
            # If no trained words, try to get from model description
            if not trigger_words:
                model = model_info.get("model", {})
                description = model.get("description", "")
                # Simple extraction from description (this could be improved)
                # Look for words in quotes or common trigger word patterns
                # This is a basic implementation
                pass
            
            return trigger_words[:3]  # Limit to 3 words
            
        except Exception as e:
            print(f"CivitAI Service: Error getting trigger words for '{lora_filename}': {e}")
            return []
    
    def get_trigger_words_sync(self, lora_filename: str) -> List[str]:
        """
        Synchronous wrapper for getting trigger words.
        
        Args:
            lora_filename: Name of the LoRA file
            
        Returns:
            List of trigger words
        """
        try:
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(self.get_trigger_words(lora_filename))
        except Exception:
            # If no event loop, create a new one
            return asyncio.run(self.get_trigger_words(lora_filename))


# Global service instance
_civitai_service = CivitAiService()


def get_civitai_service() -> CivitAiService:
    """Get the global CivitAI service instance."""
    return _civitai_service
