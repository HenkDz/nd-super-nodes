"""
ND Super Prompt Builder Node - Main implementation
"""

from typing import Tuple, List, Dict, Any, Optional
import json
import re

# Import ComfyUI modules with fallbacks
try:
    import folder_paths
    COMFYUI_AVAILABLE = True
except ImportError:
    print("ND Super Nodes: ComfyUI modules not available (this is normal during development)")
    folder_paths = None
    COMFYUI_AVAILABLE = False


class NdSuperPromptBuilder:
    """
    ND Super Prompt Builder - A powerful node for building complex prompts with segments, variables, and templates.
    
    Features:
    - Multiple prompt segments with individual enable/disable
    - Variable system for trigger words and custom snippets
    - Integration with Super LoRA Loader trigger words
    - Template and history management
    - Positive and negative prompt outputs
    - Token counting and weight support
    """
    
    CATEGORY = "conditioning"
    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("POSITIVE", "NEGATIVE", "COMBINED")
    FUNCTION = "build_prompt"
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                # Main prompt bundle from frontend (JSON array of segment configs)
                "prompt_bundle": ("STRING", {"default": ""}),
                # Trigger words from Super LoRA Loader
                "trigger_words": ("STRING", {"default": ""}),
                # Optional override for positive/negative
                "positive_override": ("STRING", {"default": ""}),
                "negative_override": ("STRING", {"default": ""}),
            },
            "hidden": {}
        }
    
    def build_prompt(
        self, 
        prompt_bundle: str = "", 
        trigger_words: str = "",
        positive_override: str = "",
        negative_override: str = "",
        **kwargs
    ) -> Tuple[str, str, str]:
        """
        Build prompts from segment bundle with variable substitution.
        
        Returns:
            (positive_prompt, negative_prompt, combined_prompt)
        """
        print("--- ND Super Prompt Builder Backend ---")
        print(f"Received prompt_bundle length: {len(prompt_bundle) if prompt_bundle else 0}")
        print(f"Received trigger_words: '{trigger_words}'")
        
        # Parse segments from bundle
        segments = self._parse_bundle(prompt_bundle)
        print(f"Parsed {len(segments)} segments")
        
        # Build variable context (trigger words + custom variables)
        variables = self._build_variable_context(trigger_words, segments)
        print(f"Built {len(variables)} variables")
        
        # Process segments with variable substitution
        positive_parts: List[str] = []
        negative_parts: List[str] = []
        
        for segment in segments:
            if not segment.get('enabled', True):
                continue
            
            segment_type = segment.get('type', 'positive')
            text = segment.get('text', '').strip()
            weight = segment.get('weight', 1.0)
            
            if not text:
                continue
            
            # Substitute variables
            processed_text = self._substitute_variables(text, variables)
            
            # Apply weight if not 1.0
            if weight != 1.0:
                processed_text = f"({processed_text}:{weight:.2f})"
            
            # Route to appropriate output
            if segment_type == 'negative':
                negative_parts.append(processed_text)
            else:  # positive or custom (defaults to positive)
                positive_parts.append(processed_text)
        
        # Build final prompts
        positive_prompt = positive_override.strip() if positive_override.strip() else ", ".join(positive_parts)
        negative_prompt = negative_override.strip() if negative_override.strip() else ", ".join(negative_parts)
        combined_prompt = f"{positive_prompt}\nNegative: {negative_prompt}" if negative_prompt else positive_prompt
        
        print(f"Built positive prompt ({len(positive_prompt)} chars)")
        print(f"Built negative prompt ({len(negative_prompt)} chars)")
        print("---------------------------------------")
        
        return (positive_prompt, negative_prompt, combined_prompt)
    
    def _parse_bundle(self, bundle: str) -> List[Dict[str, Any]]:
        """Parse prompt bundle JSON into segments."""
        if not bundle or not isinstance(bundle, str):
            return []
        
        try:
            parsed = json.loads(bundle)
            if isinstance(parsed, list):
                return parsed
            elif isinstance(parsed, dict) and 'segments' in parsed:
                return parsed['segments']
        except json.JSONDecodeError as e:
            print(f"ND Super Prompt Builder: Failed to parse bundle JSON: {e}")
        
        return []
    
    def _build_variable_context(self, trigger_words: str, segments: List[Dict[str, Any]]) -> Dict[str, str]:
        """Build variable context from trigger words and segment-defined variables."""
        variables: Dict[str, str] = {}
        
        # Parse trigger words from Super LoRA Loader
        if trigger_words:
            # Split by comma and clean up
            triggers = [t.strip() for t in trigger_words.split(',') if t.strip()]
            for i, trigger in enumerate(triggers):
                # Create indexed variables: trigger.1, trigger.2, etc.
                variables[f"trigger.{i+1}"] = trigger
                # Also create named if possible (first word as key)
                first_word = trigger.split()[0] if trigger else None
                if first_word and first_word.isalnum():
                    variables[f"trigger.{first_word.lower()}"] = trigger
            
            # Add special variable for all triggers
            variables["trigger.all"] = ", ".join(triggers)
        
        # Extract custom variables from segments
        for segment in segments:
            custom_vars = segment.get('variables', {})
            if isinstance(custom_vars, dict):
                variables.update(custom_vars)
        
        return variables
    
    def _substitute_variables(self, text: str, variables: Dict[str, str]) -> str:
        """
        Substitute variables in text.
        Supports: {{varname}} or ${varname} or {varname}
        """
        if not variables:
            return text
        
        result = text
        
        # Pattern for {{varname}}, ${varname}, or {varname}
        patterns = [
            (r'\{\{(\w+(?:\.\w+)*)\}\}', '{{{}}}'),  # {{varname}}
            (r'\$\{(\w+(?:\.\w+)*)\}', '${{}}'),      # ${varname}
            (r'\{(\w+(?:\.\w+)*)\}', '{}')            # {varname}
        ]
        
        for pattern, template in patterns:
            matches = re.finditer(pattern, result)
            for match in reversed(list(matches)):  # Reverse to maintain positions
                var_name = match.group(1)
                if var_name in variables:
                    result = result[:match.start()] + variables[var_name] + result[match.end():]
        
        return result


class NdSuperPromptBuilderAdvanced(NdSuperPromptBuilder):
    """
    Advanced variant with additional features like wildcards and randomization.
    """
    
    RETURN_TYPES = ("STRING", "STRING", "STRING", "INT")
    RETURN_NAMES = ("POSITIVE", "NEGATIVE", "COMBINED", "SEED")
    
    @classmethod
    def INPUT_TYPES(cls):
        base = super().INPUT_TYPES()
        base["optional"]["seed"] = ("INT", {"default": 0, "min": 0, "max": 0xffffffffffffffff})
        base["optional"]["enable_wildcards"] = ("BOOLEAN", {"default": True})
        return base
    
    def build_prompt(
        self, 
        prompt_bundle: str = "", 
        trigger_words: str = "",
        positive_override: str = "",
        negative_override: str = "",
        seed: int = 0,
        enable_wildcards: bool = True,
        **kwargs
    ) -> Tuple[str, str, str, int]:
        """Advanced build with wildcard support."""
        
        # Call parent implementation
        positive, negative, combined = super().build_prompt(
            prompt_bundle=prompt_bundle,
            trigger_words=trigger_words,
            positive_override=positive_override,
            negative_override=negative_override,
            **kwargs
        )
        
        # TODO: Wildcard processing will be added in future iteration
        # if enable_wildcards:
        #     positive = self._process_wildcards(positive, seed)
        #     negative = self._process_wildcards(negative, seed)
        
        return (positive, negative, combined, seed)
