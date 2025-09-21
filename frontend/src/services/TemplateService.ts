/**
 * Template management service
 */

import { LoraTemplate, LoraConfig } from '@/types';

export class TemplateService {
  private static instance: TemplateService;
  private templates: LoraTemplate[] = [];
  private isLoaded: boolean = false;

  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Initialize the template service
   */
  async initialize(): Promise<void> {
    if (!this.isLoaded) {
      await this.loadTemplates();
    }
  }

  /**
   * Load templates from backend
   */
  async loadTemplates(): Promise<void> {
    try {
      const response = await fetch('/super_lora/templates', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        const templates = data.templates ?? data ?? [];
        // Normalize to array
        this.templates = Array.isArray(templates) ? templates as any : [];
        this.isLoaded = true;
        console.log(`Super LoRA Loader: Loaded ${this.templates.length} templates`);
      } else {
        console.warn('Super LoRA Loader: Failed to load templates:', response.statusText);
        this.templates = [];
        this.isLoaded = true;
      }
    } catch (error) {
      console.error('Super LoRA Loader: Error loading templates:', error);
      this.templates = [];
      this.isLoaded = true;
    }
  }

  /**
   * Get all available templates
   */
  async getTemplates(): Promise<LoraTemplate[]> {
    if (!this.isLoaded) {
      await this.loadTemplates();
    }
    return [...this.templates];
  }

  /**
   * Save a new template
   */
  async saveTemplate(name: string, loraConfigs: LoraConfig[]): Promise<boolean> {
    try {
      // Filter out empty/invalid configs
      const validConfigs = loraConfigs.filter(config => 
        config.lora && config.lora !== 'None'
      );

      if (validConfigs.length === 0) {
        throw new Error('No valid LoRA configurations to save');
      }

      // Normalize before saving
      const normalized = validConfigs.map(cfg => ({
        lora: cfg.lora,
        enabled: !!cfg.enabled,
        strength_model: Number(cfg.strength_model ?? 1),
        strength_clip: Number(cfg.strength_clip ?? cfg.strength_model ?? 1),
        trigger_word: cfg.trigger_word ?? '',
        tag: cfg.tag ?? 'General',
        auto_populated: !!cfg.auto_populated
      }));

      // Prefer 'lora_configs' for backend, but backend also accepts 'loras'
      const template: any = {
        name,
        version: '1.0',
        lora_configs: normalized
      };

      const response = await fetch('/super_lora/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      });

      if (response.ok) {
        // Reload templates to get the updated list
        await this.loadTemplates();
        console.log(`Super LoRA Loader: Template "${name}" saved successfully`);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Super LoRA Loader: Failed to save template "${name}":`, error);
      return false;
    }
  }

  /**
   * Load a template by name
   */
  async loadTemplate(name: string): Promise<LoraConfig[] | null> {
    try {
      const templates = await this.getTemplates();
      const template: any = templates.find((t: any) => t && (t.name === name || t.id === name || t.title === name || t === name));
      
      const extractList = (tpl: any): any[] | null => {
        if (!tpl) return null;
        if (Array.isArray(tpl.loras)) return tpl.loras;
        if (Array.isArray(tpl.items)) return tpl.items;
        if (tpl.template) return extractList(tpl.template);
        if (typeof tpl === 'string') {
          // Might be a JSON string
          try { const parsed = JSON.parse(tpl); return extractList(parsed); } catch {}
        }
        return null;
      };

      // Helper to fetch details by name
      const fetchByName = async (): Promise<LoraConfig[] | null> => {
        const tryParse = (data: any): LoraConfig[] | null => {
          const list = extractList(data);
          if (!list) return null;
          const valid = list.filter((cfg: any) => this.validateLoraConfig(cfg));
          return valid;
        };
        try {
          // Attempt query param form
          let resp = await fetch(`/super_lora/templates?name=${encodeURIComponent(name)}`);
          if (resp.ok) {
            const data = await resp.json();
            const out = tryParse(data);
            if (out) return out;
          }
        } catch {}
        try {
          // Attempt REST-style path form
          const resp2 = await fetch(`/super_lora/templates/${encodeURIComponent(name)}`);
          if (resp2.ok) {
            const data2 = await resp2.json();
            const out2 = tryParse(data2);
            if (out2) return out2;
          }
        } catch {}
        return null;
      };

      if (!template) {
        console.warn(`Super LoRA Loader: Template "${name}" not found in cache, trying GET by name`);
        return await fetchByName();
      }

      let list: any[] | null = extractList(template);
      if (!list) {
        const fetched = await fetchByName();
        if (!fetched) {
          console.warn(`Super LoRA Loader: Template "${name}" has no loras/items array`);
        }
        return fetched;
      }

      const normalize = (cfg: any) => ({
        lora: cfg.lora ?? cfg.file ?? cfg.name ?? '',
        enabled: (cfg.enabled !== undefined) ? !!cfg.enabled : (cfg.on === undefined ? true : !!cfg.on),
        strength_model: (cfg.strength_model !== undefined) ? Number(cfg.strength_model) : Number(cfg.strength ?? cfg.value ?? 1),
        strength_clip: (cfg.strength_clip !== undefined) ? Number(cfg.strength_clip) : Number(cfg.strengthTwo ?? cfg.clip_strength ?? cfg.strength_model ?? cfg.strength ?? 1),
        trigger_word: cfg.trigger_word ?? cfg.triggerWord ?? cfg.trigger ?? '',
        tag: cfg.tag ?? 'General',
        auto_populated: cfg.auto_populated ?? cfg._autoPopulatedTriggerWord ?? false
      });

      const normalized = list.map(normalize);
      const validConfigs = normalized.filter(config => this.validateLoraConfig(config));
       
      if (validConfigs.length !== list.length) {
        console.warn(`Super LoRA Loader: Some LoRA configs in template "${name}" are invalid`);
      }

      console.log(`Super LoRA Loader: Loaded template "${name}" with ${validConfigs.length} LoRAs`);
      return validConfigs;
    } catch (error) {
      console.error(`Super LoRA Loader: Failed to load template "${name}":`, error);
      return null;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(name: string): Promise<boolean> {
    try {
      // Try RESTful DELETE by name first
      let response = await fetch(`/super_lora/templates/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        // Fallback 1: DELETE with JSON body (older clients)
        response = await fetch('/super_lora/templates', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
      }

      if (!response.ok && response.status === 405) {
        // Fallback 2: POST to a delete endpoint
        response = await fetch('/super_lora/templates/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
      }

      if (!response.ok) {
        // Fallback 3: POST action flag
        response = await fetch('/super_lora/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', name })
        });
      }

      if (response.ok) {
        // Verify by reloading list
        await this.loadTemplates();
        const stillExists = (this.templates || []).some((t: any) => (t && t.name) ? t.name === name : t === name);
        if (stillExists) {
          console.warn(`Super LoRA Loader: Server responded OK but template still present: ${name}`);
          return false;
        }
        console.log(`Super LoRA Loader: Template "${name}" deleted successfully`);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Super LoRA Loader: Failed to delete template "${name}":`, error);
      return false;
    }
  }

  /**
   * Check if a template name already exists
   */
  async templateExists(name: string): Promise<boolean> {
    const templates = await this.getTemplates();
    return templates.some(t => t.name === name);
  }

  /**
   * Get template names for UI selection
   */
  async getTemplateNames(): Promise<string[]> {
    const templates = await this.getTemplates();
    // Accept arrays of names or arrays of objects
    return templates.map((t: any) => (t && t.name) ? t.name : String(t)).sort();
  }

  /**
   * Validate a LoRA configuration
   */
  private validateLoraConfig(config: LoraConfig): boolean {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check required fields
    if (!config.lora || typeof config.enabled !== 'boolean') {
      return false;
    }

    // Validate strength values
    const strengthModel = Number(config.strength_model);
    const strengthClip = Number(config.strength_clip);
    
    if (isNaN(strengthModel) || isNaN(strengthClip)) {
      return false;
    }

    return true;
  }

  /**
   * Export template to JSON string
   */
  async exportTemplate(name: string): Promise<string | null> {
    try {
      const templates = await this.getTemplates();
      const template = templates.find(t => t.name === name);
      
      if (!template) {
        return null;
      }

      return JSON.stringify(template, null, 2);
    } catch (error) {
      console.error(`Super LoRA Loader: Failed to export template "${name}":`, error);
      return null;
    }
  }

  /**
   * Import template from JSON string
   */
  async importTemplate(jsonString: string): Promise<boolean> {
    try {
      const template = JSON.parse(jsonString) as LoraTemplate;
      
      // Validate template structure
      if (!template.name || !template.loras || !Array.isArray(template.loras)) {
        throw new Error('Invalid template format');
      }

      // Check if template already exists
      if (await this.templateExists(template.name)) {
        throw new Error(`Template "${template.name}" already exists`);
      }

      return await this.saveTemplate(template.name, template.loras);
    } catch (error) {
      console.error('Super LoRA Loader: Failed to import template:', error);
      return false;
    }
  }

  /**
   * Rename an existing template
   */
  async renameTemplate(oldName: string, newName: string): Promise<boolean> {
    try {
      const src = (oldName || '').trim();
      const dst = (newName || '').trim();
      if (!src || !dst) return false;
      if (src === dst) return true;

      // Ensure destination does not already exist
      if (await this.templateExists(dst)) {
        throw new Error(`Template "${dst}" already exists`);
      }

      // Load source template configs
      const configs = await this.loadTemplate(src);
      if (!configs || configs.length === 0) {
        throw new Error(`Template "${src}" not found or empty`);
      }

      // Save under new name
      const saved = await this.saveTemplate(dst, configs);
      if (!saved) return false;

      // Delete old
      await this.deleteTemplate(src);

      // Refresh list
      await this.loadTemplates();
      return true;
    } catch (error) {
      console.error('Super LoRA Loader: Failed to rename template:', error);
      return false;
    }
  }
}
