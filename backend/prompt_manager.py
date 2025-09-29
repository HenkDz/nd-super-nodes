"""
Prompt history and favorites manager for ND Super Prompt Builder
"""

import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime


class PromptManager:
    """
    Manages prompt history and favorites with JSON persistence.
    """
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize the prompt manager.
        
        Args:
            data_dir: Directory for storing data files. Defaults to ./nd_super_nodes/
        """
        if data_dir is None:
            # Default to nd_super_nodes directory in the custom node folder
            current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(current_dir, "nd_super_nodes")
        
        self.data_dir = data_dir
        self.history_file = os.path.join(data_dir, "prompt_history.json")
        self.favorites_file = os.path.join(data_dir, "prompt_favorites.json")
        self.templates_file = os.path.join(data_dir, "prompt_templates.json")
        
        # Ensure data directory exists
        os.makedirs(data_dir, exist_ok=True)
        
        # In-memory caches
        self._history: List[Dict[str, Any]] = []
        self._favorites: List[Dict[str, Any]] = []
        self._templates: Dict[str, Any] = {}
        
        # Load data
        self._load_data()
    
    def _load_data(self):
        """Load all data from files."""
        self._history = self._load_json(self.history_file, [])
        self._favorites = self._load_json(self.favorites_file, [])
        self._templates = self._load_json(self.templates_file, {})
    
    def _load_json(self, filepath: str, default: Any) -> Any:
        """Load JSON from file with fallback."""
        try:
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"ND Super Prompt Builder: Error loading {filepath}: {e}")
        return default
    
    def _save_json(self, filepath: str, data: Any) -> bool:
        """Save data to JSON file."""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"ND Super Prompt Builder: Error saving {filepath}: {e}")
            return False
    
    # ========== History Management ==========
    
    def add_to_history(
        self, 
        positive: str, 
        negative: str = "", 
        segments: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Add a prompt to history.
        
        Args:
            positive: Positive prompt text
            negative: Negative prompt text
            segments: Original segment configuration
            metadata: Additional metadata (workflow info, etc.)
        
        Returns:
            History entry ID
        """
        entry_id = f"hist_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        entry = {
            "id": entry_id,
            "timestamp": datetime.now().isoformat(),
            "positive": positive,
            "negative": negative,
            "segments": segments or [],
            "metadata": metadata or {}
        }
        
        # Add to front of history
        self._history.insert(0, entry)
        
        # Limit history size (keep last 100)
        max_history = 100
        if len(self._history) > max_history:
            self._history = self._history[:max_history]
        
        # Save to disk
        self._save_json(self.history_file, self._history)
        
        return entry_id
    
    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recent prompt history.
        
        Args:
            limit: Maximum number of entries to return
        
        Returns:
            List of history entries
        """
        return self._history[:limit]
    
    def get_history_entry(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific history entry by ID."""
        for entry in self._history:
            if entry.get('id') == entry_id:
                return entry
        return None
    
    def delete_history_entry(self, entry_id: str) -> bool:
        """Delete a history entry."""
        original_len = len(self._history)
        self._history = [e for e in self._history if e.get('id') != entry_id]
        
        if len(self._history) < original_len:
            self._save_json(self.history_file, self._history)
            return True
        return False
    
    def clear_history(self) -> bool:
        """Clear all history."""
        self._history = []
        return self._save_json(self.history_file, self._history)
    
    def search_history(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search history by text content.
        
        Args:
            query: Search query
            limit: Maximum results
        
        Returns:
            Matching history entries
        """
        query_lower = query.lower()
        results = []
        
        for entry in self._history:
            positive = entry.get('positive', '').lower()
            negative = entry.get('negative', '').lower()
            
            if query_lower in positive or query_lower in negative:
                results.append(entry)
                if len(results) >= limit:
                    break
        
        return results
    
    # ========== Favorites Management ==========
    
    def add_to_favorites(
        self, 
        name: str,
        positive: str, 
        negative: str = "", 
        segments: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Add a prompt to favorites.
        
        Args:
            name: User-friendly name for the favorite
            positive: Positive prompt text
            negative: Negative prompt text
            segments: Original segment configuration
            metadata: Additional metadata
        
        Returns:
            Favorite entry ID
        """
        entry_id = f"fav_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        entry = {
            "id": entry_id,
            "name": name,
            "timestamp": datetime.now().isoformat(),
            "positive": positive,
            "negative": negative,
            "segments": segments or [],
            "metadata": metadata or {}
        }
        
        self._favorites.append(entry)
        self._save_json(self.favorites_file, self._favorites)
        
        return entry_id
    
    def get_favorites(self) -> List[Dict[str, Any]]:
        """Get all favorites."""
        return self._favorites
    
    def get_favorite(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific favorite by ID."""
        for entry in self._favorites:
            if entry.get('id') == entry_id:
                return entry
        return None
    
    def delete_favorite(self, entry_id: str) -> bool:
        """Delete a favorite."""
        original_len = len(self._favorites)
        self._favorites = [e for e in self._favorites if e.get('id') != entry_id]
        
        if len(self._favorites) < original_len:
            self._save_json(self.favorites_file, self._favorites)
            return True
        return False
    
    def rename_favorite(self, entry_id: str, new_name: str) -> bool:
        """Rename a favorite."""
        for entry in self._favorites:
            if entry.get('id') == entry_id:
                entry['name'] = new_name
                return self._save_json(self.favorites_file, self._favorites)
        return False
    
    # ========== Template Management ==========
    
    def save_template(self, name: str, segments: List[Dict[str, Any]]) -> bool:
        """
        Save a prompt template.
        
        Args:
            name: Template name
            segments: Segment configuration
        
        Returns:
            Success status
        """
        self._templates[name] = {
            "name": name,
            "segments": segments,
            "timestamp": datetime.now().isoformat()
        }
        return self._save_json(self.templates_file, self._templates)
    
    def load_template(self, name: str) -> Optional[Dict[str, Any]]:
        """Load a template by name."""
        return self._templates.get(name)
    
    def list_templates(self) -> List[str]:
        """Get list of template names."""
        return sorted(self._templates.keys())
    
    def delete_template(self, name: str) -> bool:
        """Delete a template."""
        if name in self._templates:
            del self._templates[name]
            return self._save_json(self.templates_file, self._templates)
        return False
    
    def rename_template(self, old_name: str, new_name: str) -> bool:
        """Rename a template."""
        if old_name in self._templates and new_name not in self._templates:
            self._templates[new_name] = self._templates.pop(old_name)
            self._templates[new_name]['name'] = new_name
            return self._save_json(self.templates_file, self._templates)
        return False


# Global instance
_prompt_manager: Optional[PromptManager] = None


def get_prompt_manager() -> PromptManager:
    """Get the global prompt manager instance."""
    global _prompt_manager
    if _prompt_manager is None:
        _prompt_manager = PromptManager()
    return _prompt_manager
