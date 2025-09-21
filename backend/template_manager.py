"""
Template management system for Super LoRA Loader
"""

import json
import os
from typing import List, Dict, Any, Optional

try:
    import folder_paths
    COMFYUI_AVAILABLE = True
except ImportError:
    print("Super LoRA Loader: ComfyUI folder_paths not available for templates")
    folder_paths = None
    COMFYUI_AVAILABLE = False


class TemplateManager:
    """
    Manages saving and loading of LoRA configuration templates.
    """
    
    def __init__(self):
        self.templates_dir = self._get_templates_directory()
        self._ensure_templates_dir()
    
    def _get_templates_directory(self) -> str:
        """Get the templates directory path."""
        if COMFYUI_AVAILABLE and folder_paths is not None:
            # Store templates in ComfyUI's user directory
            try:
                user_dir = folder_paths.get_user_directory()
                return os.path.join(user_dir, "super_lora_templates")
            except Exception:
                pass
        
        # Fallback to a local templates directory
        return os.path.join(os.path.dirname(__file__), "..", "templates")
    
    def _ensure_templates_dir(self):
        """Ensure the templates directory exists."""
        os.makedirs(self.templates_dir, exist_ok=True)
    
    def save_template(self, name: str, lora_configs: List[Dict[str, Any]]) -> bool:
        """
        Save a LoRA configuration template.
        
        Args:
            name: Template name
            lora_configs: List of LoRA configuration dictionaries
            
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            # Sanitize filename
            safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            if not safe_name:
                safe_name = "template"
            
            filename = f"{safe_name}.json"
            filepath = os.path.join(self.templates_dir, filename)
            
            # Prepare template data
            template_data = {
                "name": name,
                "version": "1.0",
                "loras": lora_configs,
                "created_at": self._get_timestamp()
            }
            
            # Save to file
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(template_data, f, indent=2, ensure_ascii=False)
            
            print(f"Super LoRA Loader: Template '{name}' saved successfully")
            return True
            
        except Exception as e:
            print(f"Super LoRA Loader: Error saving template '{name}': {e}")
            return False
    
    def load_template(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Load a LoRA configuration template.
        
        Args:
            name: Template name
            
        Returns:
            Template data dict, or None if not found
        """
        try:
            # Try exact filename first
            filename = f"{name}.json"
            filepath = os.path.join(self.templates_dir, filename)
            
            if not os.path.exists(filepath):
                # Try to find by display name
                for file in os.listdir(self.templates_dir):
                    if file.endswith('.json'):
                        try:
                            test_path = os.path.join(self.templates_dir, file)
                            with open(test_path, 'r', encoding='utf-8') as f:
                                data = json.load(f)
                                if data.get('name') == name:
                                    filepath = test_path
                                    break
                        except:
                            continue
                else:
                    return None
            
            # Load template
            with open(filepath, 'r', encoding='utf-8') as f:
                template_data = json.load(f)
            
            return template_data
            
        except Exception as e:
            print(f"Super LoRA Loader: Error loading template '{name}': {e}")
            return None
    
    def list_templates(self) -> List[Dict[str, str]]:
        """
        Get a list of available templates.
        
        Returns:
            List of template info dicts with 'name' and 'filename' keys
        """
        templates = []
        
        try:
            if not os.path.exists(self.templates_dir):
                return templates
            
            for filename in os.listdir(self.templates_dir):
                if filename.endswith('.json'):
                    try:
                        filepath = os.path.join(self.templates_dir, filename)
                        with open(filepath, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        templates.append({
                            "name": data.get('name', filename[:-5]),  # Remove .json
                            "filename": filename,
                            "created_at": data.get('created_at', '')
                        })
                    except Exception as e:
                        print(f"Super LoRA Loader: Error reading template '{filename}': {e}")
                        continue
        
        except Exception as e:
            print(f"Super LoRA Loader: Error listing templates: {e}")
        
        return sorted(templates, key=lambda x: x['name'])
    
    def delete_template(self, name: str) -> bool:
        """
        Delete a template.
        
        Args:
            name: Template name
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            template_data = self.load_template(name)
            if not template_data:
                return False
            
            # Find the actual file
            filename = f"{name}.json"
            filepath = os.path.join(self.templates_dir, filename)
            
            if not os.path.exists(filepath):
                # Search for file by display name
                for file in os.listdir(self.templates_dir):
                    if file.endswith('.json'):
                        try:
                            test_path = os.path.join(self.templates_dir, file)
                            with open(test_path, 'r', encoding='utf-8') as f:
                                data = json.load(f)
                                if data.get('name') == name:
                                    filepath = test_path
                                    break
                        except:
                            continue
                else:
                    return False
            
            os.remove(filepath)
            print(f"Super LoRA Loader: Template '{name}' deleted successfully")
            return True
            
        except Exception as e:
            print(f"Super LoRA Loader: Error deleting template '{name}': {e}")
            return False
    
    def _get_timestamp(self) -> str:
        """Get current timestamp as ISO string."""
        from datetime import datetime
        return datetime.now().isoformat()


# Global template manager instance
_template_manager = TemplateManager()


def get_template_manager() -> TemplateManager:
    """Get the global template manager instance."""
    return _template_manager
