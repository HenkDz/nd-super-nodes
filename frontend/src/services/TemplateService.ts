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
        this.templates = data.templates || [];
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

      const template: Omit<LoraTemplate, 'created_at'> = {
        name,
        version: '1.0',
        loras: validConfigs
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
      const template = templates.find(t => t.name === name);
      
      if (!template) {
        console.warn(`Super LoRA Loader: Template "${name}" not found`);
        return null;
      }

      // Validate the template's LoRA configs
      const validConfigs = template.loras.filter(config => this.validateLoraConfig(config));
      
      if (validConfigs.length !== template.loras.length) {
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
      const response = await fetch('/super_lora/templates', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        // Remove from local cache
        this.templates = this.templates.filter(t => t.name !== name);
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
    return templates.map(t => t.name).sort();
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
}
