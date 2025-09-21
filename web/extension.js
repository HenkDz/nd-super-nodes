import { app } from "/scripts/app.js";
class LoraService {
  constructor() {
    this.availableLoras = [];
    this.loraCache = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!LoraService.instance) {
      LoraService.instance = new LoraService();
    }
    return LoraService.instance;
  }
  /**
   * Initialize the service and load available LoRAs
   */
  async initialize() {
    try {
      await this.refreshLoraList();
    } catch (error) {
      console.error("Super LoRA Loader: Failed to initialize LoRA service:", error);
    }
  }
  /**
   * Get list of available LoRA files
   */
  async getAvailableLoras() {
    if (this.availableLoras.length === 0) {
      await this.refreshLoraList();
    }
    return this.availableLoras;
  }
  /**
   * Refresh the list of available LoRAs from the backend
   */
  async refreshLoraList() {
    try {
      const response = await fetch("/object_info");
      const data = await response.json();
      const loraLoader = data.LoraLoader;
      if (loraLoader && loraLoader.input && loraLoader.input.required && loraLoader.input.required.lora_name) {
        this.availableLoras = loraLoader.input.required.lora_name[0] || [];
      } else {
        const folderResponse = await fetch("/api/v1/folder_paths");
        if (folderResponse.ok) {
          const folderData = await folderResponse.json();
          this.availableLoras = folderData.loras || [];
        }
      }
      console.log(`Super LoRA Loader: Found ${this.availableLoras.length} LoRAs`);
    } catch (error) {
      console.error("Super LoRA Loader: Failed to refresh LoRA list:", error);
      this.availableLoras = [];
    }
  }
  /**
   * Create a new LoRA configuration with defaults
   */
  createLoraConfig(loraName = "None") {
    return {
      lora: loraName,
      enabled: true,
      strength_model: 1,
      strength_clip: 1,
      trigger_word: "",
      tag: "General",
      auto_populated: false
    };
  }
  /**
   * Validate a LoRA configuration
   */
  validateLoraConfig(config) {
    if (!config || typeof config !== "object") {
      return false;
    }
    if (typeof config.lora !== "string" || typeof config.enabled !== "boolean") {
      return false;
    }
    const strengthModel = Number(config.strength_model);
    const strengthClip = Number(config.strength_clip);
    if (isNaN(strengthModel) || isNaN(strengthClip)) {
      return false;
    }
    if (strengthModel < 0 || strengthModel > 2 || strengthClip < 0 || strengthClip > 2) {
      return false;
    }
    return true;
  }
  /**
   * Check if a LoRA is already in the configuration list
   */
  isDuplicateLora(configs, loraName) {
    return configs.some((config) => config.lora === loraName && loraName !== "None");
  }
  /**
   * Sort LoRA configurations by tag and name
   */
  sortLoraConfigs(configs) {
    return [...configs].sort((a, b) => {
      if (a.tag !== b.tag) {
        if (a.tag === "General") return -1;
        if (b.tag === "General") return 1;
        return a.tag.localeCompare(b.tag);
      }
      return a.lora.localeCompare(b.lora);
    });
  }
  /**
   * Group LoRA configurations by tag
   */
  groupLorasByTag(configs) {
    const groups = /* @__PURE__ */ new Map();
    for (const config of configs) {
      const tag = config.tag || "General";
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      groups.get(tag).push(config);
    }
    return groups;
  }
  /**
   * Get available tags from a list of LoRA configurations
   */
  getAvailableTags(configs) {
    const tags = /* @__PURE__ */ new Set();
    for (const config of configs) {
      tags.add(config.tag || "General");
    }
    return Array.from(tags).sort((a, b) => {
      if (a === "General") return -1;
      if (b === "General") return 1;
      return a.localeCompare(b);
    });
  }
  /**
   * Get common tag suggestions
   */
  getCommonTags() {
    return [
      "General",
      "Character",
      "Style",
      "Quality",
      "Effect",
      "Background",
      "Clothing",
      "Pose",
      "Lighting"
    ];
  }
  /**
   * Convert LoRA configs to backend format
   */
  convertToBackendFormat(configs) {
    const result = {};
    configs.forEach((config, index) => {
      if (config.lora && config.lora !== "None") {
        const key = `lora_${index + 1}`;
        result[key] = {
          lora: config.lora,
          enabled: config.enabled,
          strength_model: config.strength_model,
          strength_clip: config.strength_clip,
          trigger_word: config.trigger_word || "",
          tag: config.tag || "General"
        };
      }
    });
    return result;
  }
  /**
   * Extract trigger words from all enabled LoRAs
   */
  extractTriggerWords(configs) {
    const triggerWords = [];
    for (const config of configs) {
      if (config.enabled && config.trigger_word && config.trigger_word.trim()) {
        triggerWords.push(config.trigger_word.trim());
      }
    }
    return triggerWords.join(", ");
  }
}
class TemplateService {
  constructor() {
    this.templates = [];
    this.isLoaded = false;
  }
  static getInstance() {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }
  /**
   * Initialize the template service
   */
  async initialize() {
    if (!this.isLoaded) {
      await this.loadTemplates();
    }
  }
  /**
   * Load templates from backend
   */
  async loadTemplates() {
    try {
      const response = await fetch("/super_lora/templates", {
        method: "GET"
      });
      if (response.ok) {
        const data = await response.json();
        const templates = data.templates ?? data ?? [];
        this.templates = Array.isArray(templates) ? templates : [];
        this.isLoaded = true;
        console.log(`Super LoRA Loader: Loaded ${this.templates.length} templates`);
      } else {
        console.warn("Super LoRA Loader: Failed to load templates:", response.statusText);
        this.templates = [];
        this.isLoaded = true;
      }
    } catch (error) {
      console.error("Super LoRA Loader: Error loading templates:", error);
      this.templates = [];
      this.isLoaded = true;
    }
  }
  /**
   * Get all available templates
   */
  async getTemplates() {
    if (!this.isLoaded) {
      await this.loadTemplates();
    }
    return [...this.templates];
  }
  /**
   * Save a new template
   */
  async saveTemplate(name, loraConfigs) {
    try {
      const validConfigs = loraConfigs.filter(
        (config) => config.lora && config.lora !== "None"
      );
      if (validConfigs.length === 0) {
        throw new Error("No valid LoRA configurations to save");
      }
      const normalized = validConfigs.map((cfg) => ({
        lora: cfg.lora,
        enabled: !!cfg.enabled,
        strength_model: Number(cfg.strength_model ?? 1),
        strength_clip: Number(cfg.strength_clip ?? cfg.strength_model ?? 1),
        trigger_word: cfg.trigger_word ?? "",
        tag: cfg.tag ?? "General",
        auto_populated: !!cfg.auto_populated
      }));
      const template = {
        name,
        version: "1.0",
        lora_configs: normalized
      };
      const response = await fetch("/super_lora/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(template)
      });
      if (response.ok) {
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
  async loadTemplate(name) {
    try {
      const templates = await this.getTemplates();
      const template = templates.find((t) => t && (t.name === name || t.id === name || t.title === name || t === name));
      const extractList = (tpl) => {
        if (!tpl) return null;
        if (Array.isArray(tpl.loras)) return tpl.loras;
        if (Array.isArray(tpl.items)) return tpl.items;
        if (tpl.template) return extractList(tpl.template);
        if (typeof tpl === "string") {
          try {
            const parsed = JSON.parse(tpl);
            return extractList(parsed);
          } catch {
          }
        }
        return null;
      };
      const fetchByName = async () => {
        const tryParse = (data) => {
          const list2 = extractList(data);
          if (!list2) return null;
          const valid = list2.filter((cfg) => this.validateLoraConfig(cfg));
          return valid;
        };
        try {
          let resp = await fetch(`/super_lora/templates?name=${encodeURIComponent(name)}`);
          if (resp.ok) {
            const data = await resp.json();
            const out = tryParse(data);
            if (out) return out;
          }
        } catch {
        }
        try {
          const resp2 = await fetch(`/super_lora/templates/${encodeURIComponent(name)}`);
          if (resp2.ok) {
            const data2 = await resp2.json();
            const out2 = tryParse(data2);
            if (out2) return out2;
          }
        } catch {
        }
        return null;
      };
      if (!template) {
        console.warn(`Super LoRA Loader: Template "${name}" not found in cache, trying GET by name`);
        return await fetchByName();
      }
      let list = extractList(template);
      if (!list) {
        const fetched = await fetchByName();
        if (!fetched) {
          console.warn(`Super LoRA Loader: Template "${name}" has no loras/items array`);
        }
        return fetched;
      }
      const normalize = (cfg) => ({
        lora: cfg.lora ?? cfg.file ?? cfg.name ?? "",
        enabled: cfg.enabled !== void 0 ? !!cfg.enabled : cfg.on === void 0 ? true : !!cfg.on,
        strength_model: cfg.strength_model !== void 0 ? Number(cfg.strength_model) : Number(cfg.strength ?? cfg.value ?? 1),
        strength_clip: cfg.strength_clip !== void 0 ? Number(cfg.strength_clip) : Number(cfg.strengthTwo ?? cfg.clip_strength ?? cfg.strength_model ?? cfg.strength ?? 1),
        trigger_word: cfg.trigger_word ?? cfg.triggerWord ?? cfg.trigger ?? "",
        tag: cfg.tag ?? "General",
        auto_populated: cfg.auto_populated ?? cfg._autoPopulatedTriggerWord ?? false
      });
      const normalized = list.map(normalize);
      const validConfigs = normalized.filter((config) => this.validateLoraConfig(config));
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
  async deleteTemplate(name) {
    try {
      let response = await fetch(`/super_lora/templates/${encodeURIComponent(name)}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        response = await fetch("/super_lora/templates", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        });
      }
      if (!response.ok && response.status === 405) {
        response = await fetch("/super_lora/templates/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        });
      }
      if (!response.ok) {
        response = await fetch("/super_lora/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", name })
        });
      }
      if (response.ok) {
        await this.loadTemplates();
        const stillExists = (this.templates || []).some((t) => t && t.name ? t.name === name : t === name);
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
  async templateExists(name) {
    const templates = await this.getTemplates();
    return templates.some((t) => t.name === name);
  }
  /**
   * Get template names for UI selection
   */
  async getTemplateNames() {
    const templates = await this.getTemplates();
    return templates.map((t) => t && t.name ? t.name : String(t)).sort();
  }
  /**
   * Validate a LoRA configuration
   */
  validateLoraConfig(config) {
    if (!config || typeof config !== "object") {
      return false;
    }
    if (!config.lora || typeof config.enabled !== "boolean") {
      return false;
    }
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
  async exportTemplate(name) {
    try {
      const templates = await this.getTemplates();
      const template = templates.find((t) => t.name === name);
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
  async importTemplate(jsonString) {
    try {
      const template = JSON.parse(jsonString);
      if (!template.name || !template.loras || !Array.isArray(template.loras)) {
        throw new Error("Invalid template format");
      }
      if (await this.templateExists(template.name)) {
        throw new Error(`Template "${template.name}" already exists`);
      }
      return await this.saveTemplate(template.name, template.loras);
    } catch (error) {
      console.error("Super LoRA Loader: Failed to import template:", error);
      return false;
    }
  }
  /**
   * Rename an existing template
   */
  async renameTemplate(oldName, newName) {
    try {
      const src = (oldName || "").trim();
      const dst = (newName || "").trim();
      if (!src || !dst) return false;
      if (src === dst) return true;
      if (await this.templateExists(dst)) {
        throw new Error(`Template "${dst}" already exists`);
      }
      const configs = await this.loadTemplate(src);
      if (!configs || configs.length === 0) {
        throw new Error(`Template "${src}" not found or empty`);
      }
      const saved = await this.saveTemplate(dst, configs);
      if (!saved) return false;
      await this.deleteTemplate(src);
      await this.loadTemplates();
      return true;
    } catch (error) {
      console.error("Super LoRA Loader: Failed to rename template:", error);
      return false;
    }
  }
}
class CivitAiService {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.pendingRequests = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!CivitAiService.instance) {
      CivitAiService.instance = new CivitAiService();
    }
    return CivitAiService.instance;
  }
  /**
   * Get trigger words for a LoRA file
   */
  async getTriggerWords(loraFileName) {
    try {
      const modelInfo = await this.getModelInfo(loraFileName);
      if (!modelInfo) {
        return [];
      }
      return this.extractTriggerWordsFromModelInfo(modelInfo);
    } catch (error) {
      console.warn(`Super LoRA Loader: Failed to get trigger words for ${loraFileName}:`, error);
      return [];
    }
  }
  /**
   * Get model information from CivitAI
   */
  async getModelInfo(loraFileName) {
    if (this.cache.has(loraFileName)) {
      return this.cache.get(loraFileName);
    }
    if (this.pendingRequests.has(loraFileName)) {
      return await this.pendingRequests.get(loraFileName);
    }
    const requestPromise = this.fetchModelInfo(loraFileName);
    this.pendingRequests.set(loraFileName, requestPromise);
    try {
      const result = await requestPromise;
      this.pendingRequests.delete(loraFileName);
      if (result) {
        this.cache.set(loraFileName, result);
      }
      return result;
    } catch (error) {
      this.pendingRequests.delete(loraFileName);
      throw error;
    }
  }
  /**
   * Fetch model info from backend API
   */
  async fetchModelInfo(loraFileName) {
    try {
      const response = await fetch("/super_lora/civitai_info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lora_filename: loraFileName
        })
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        console.warn(`Super LoRA Loader: CivitAI API error for ${loraFileName}:`, data.error);
        return null;
      }
      return data;
    } catch (error) {
      console.warn(`Super LoRA Loader: Failed to fetch model info for ${loraFileName}:`, error);
      return null;
    }
  }
  /**
   * Extract trigger words from CivitAI model info
   */
  extractTriggerWordsFromModelInfo(modelInfo) {
    const triggerWords = [];
    if (modelInfo.trainedWords && Array.isArray(modelInfo.trainedWords)) {
      for (const item of modelInfo.trainedWords) {
        if (typeof item === "string") {
          triggerWords.push(item);
        } else if (item && typeof item === "object" && "word" in item) {
          triggerWords.push(item.word);
        }
      }
    }
    return triggerWords.slice(0, 3);
  }
  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Get cache size for debugging
   */
  getCacheSize() {
    return this.cache.size;
  }
  /**
   * Check if auto-fetch is enabled in settings
   */
  isAutoFetchEnabled() {
    try {
      const app2 = window.app;
      if (app2 && app2.ui && app2.ui.settings) {
        return app2.ui.settings.getSettingValue("superLora.autoFetchTriggerWords", true);
      }
    } catch (error) {
      console.warn("Super LoRA Loader: Failed to check auto-fetch setting:", error);
    }
    return true;
  }
  /**
   * Auto-populate trigger words for a LoRA if enabled
   */
  async autoPopulateTriggerWords(loraFileName) {
    if (!this.isAutoFetchEnabled() || !loraFileName || loraFileName === "None") {
      return "";
    }
    try {
      const triggerWords = await this.getTriggerWords(loraFileName);
      return triggerWords.length > 0 ? triggerWords[0] : "";
    } catch (error) {
      console.warn(`Super LoRA Loader: Auto-populate failed for ${loraFileName}:`, error);
      return "";
    }
  }
}
const LiteGraph = window.LiteGraph;
class SuperLoraBaseWidget {
  constructor(name) {
    this.name = name;
    this.type = "custom";
    this.value = {};
    this.hitAreas = {};
  }
  draw(ctx, node, w, posY, height) {
  }
  onMouseDown(event, pos, node) {
    return this.handleHitAreas(event, pos, node, "onDown");
  }
  onClick(event, pos, node) {
    return this.handleHitAreas(event, pos, node, "onClick");
  }
  handleHitAreas(event, pos, node, handler) {
    console.log(`[${this.constructor.name}] Click at: [${pos[0]}, ${pos[1]}], Handler: ${handler}`);
    const entries = Object.entries(this.hitAreas).sort((a, b) => {
      const pa = a[1] && a[1].priority || 0;
      const pb = b[1] && b[1].priority || 0;
      return pb - pa;
    });
    for (const [key, area] of entries) {
      const bounds = area.bounds;
      console.log(`  Checking ${key}: bounds=${bounds}`);
      if (bounds && bounds.length >= 4 && this.isInBounds(pos, bounds)) {
        const fn = area[handler] || (handler === "onDown" ? area.onClick : area.onDown);
        if (fn) {
          console.log(`  ✓ HIT: ${key} - calling ${fn === area[handler] ? handler : handler === "onDown" ? "onClick" : "onDown"}`);
          return fn.call(this, event, pos, node);
        }
      }
    }
    console.log("  ✗ No hit areas matched");
    return false;
  }
  isInBounds(pos, bounds) {
    if (bounds.length < 4) return false;
    const [x, y, width, height] = bounds;
    return pos[0] >= x && pos[0] <= x + width && pos[1] >= y && pos[1] <= y + height;
  }
  computeSize() {
    return [200, 25];
  }
}
class SuperLoraHeaderWidget extends SuperLoraBaseWidget {
  constructor() {
    super("SuperLoraHeaderWidget");
    this.onToggleAllDown = (event, pos, node) => {
      const allState = this.getAllLorasState(node);
      if (!node.customWidgets) return true;
      const loraWidgets = node.customWidgets.filter((w) => w instanceof SuperLoraWidget);
      loraWidgets.forEach((w) => w.value.enabled = !allState);
      node.setDirtyCanvas(true, true);
      return true;
    };
    this.onAddLoraDown = (event, pos, node) => {
      SuperLoraNode.showLoraSelector(node, void 0, event);
      return true;
    };
    this.onSaveTemplateDown = (event, pos, node) => {
      SuperLoraNode.showNameOverlay({
        title: "Save Template",
        placeholder: "Template name...",
        initial: "My LoRA Set",
        submitLabel: "Save",
        onCommit: async (templateName) => {
          const name = (templateName || "").trim();
          if (!name) {
            SuperLoraNode.showToast("Please enter a template name", "warning");
            return;
          }
          const configs = SuperLoraNode.getLoraConfigs(node);
          const validConfigs = configs.filter((config) => config.lora && config.lora !== "None");
          if (validConfigs.length === 0) {
            SuperLoraNode.showToast("⚠️ No valid LoRAs to save in template", "warning");
            return;
          }
          try {
            const exists = await SuperLoraNode.templateService.templateExists(name);
            if (exists) {
              SuperLoraNode.showToast(`⚠️ Template "${name}" already exists. Choose a different name.`, "warning");
              return;
            }
            const success = await SuperLoraNode.templateService.saveTemplate(name, validConfigs);
            if (success) {
              SuperLoraNode.showToast(`✅ Template "${name}" saved successfully!`, "success");
            } else {
              SuperLoraNode.showToast("❌ Failed to save template. Please try again.", "error");
            }
          } catch (error) {
            console.error("Template save error:", error);
            SuperLoraNode.showToast("❌ Error saving template. Check console for details.", "error");
          }
        }
      });
      return true;
    };
    this.onLoadTemplateDown = (event, pos, node) => {
      SuperLoraNode.showLoadTemplateDialog(node, event);
      return true;
    };
    this.onSettingsDown = (event, pos, node) => {
      SuperLoraNode.showSettingsDialog(node, event);
      return true;
    };
    this.value = { type: "SuperLoraHeaderWidget" };
    this.hitAreas = {
      toggleAll: { bounds: [0, 0], onDown: this.onToggleAllDown },
      addLora: { bounds: [0, 0], onDown: this.onAddLoraDown },
      saveTemplate: { bounds: [0, 0], onDown: this.onSaveTemplateDown },
      loadTemplate: { bounds: [0, 0], onDown: this.onLoadTemplateDown },
      settings: { bounds: [0, 0], onDown: this.onSettingsDown }
    };
  }
  draw(ctx, node, w, posY, height) {
    const margin = 8;
    const buttonHeight = 22;
    const buttonSpacing = 6;
    let posX = margin;
    ctx.save();
    const gradient = ctx.createLinearGradient(0, posY, 0, posY + height);
    gradient.addColorStop(0, "#3a3a3a");
    gradient.addColorStop(1, "#2a2a2a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, posY, w, height);
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, posY, w, height);
    const midY = posY + height / 2;
    ctx.font = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";
    const drawButton = (x, width, color, text, icon) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, posY + (height - buttonHeight) / 2, width, buttonHeight, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      const textX = x + width / 2;
      {
        ctx.fillText(text, textX, midY);
      }
    };
    const allState = this.getAllLorasState(node);
    const availableWidth = w - margin * 2;
    const buttons = [
      { id: "toggleAll", color: allState ? "#4CAF50" : "#666", text: "Toggle All", shortText: "Toggle", icon: "⏯️", priority: 1 },
      { id: "addLora", color: "#2196F3", text: "Add LoRA", shortText: "Add", icon: "➕", priority: 2 },
      { id: "saveTemplate", color: "#FF9800", text: "Save Set", shortText: "Save", icon: "💾", priority: 3 },
      { id: "loadTemplate", color: "#9C27B0", text: "Load Set", shortText: "Load", icon: "📂", priority: 4 },
      { id: "settings", color: "#607D8B", text: "Settings", shortText: "Set", icon: "⚙️", priority: 5 }
    ];
    const totalSpacing = buttonSpacing * (buttons.length - 1);
    const buttonWidth = Math.max(40, (availableWidth - totalSpacing) / buttons.length);
    const useShortText = buttonWidth < 60;
    const useIconOnly = buttonWidth < 45;
    buttons.forEach((btn, index) => {
      let displayText = useIconOnly ? btn.icon : useShortText ? btn.shortText : btn.text;
      drawButton(posX, buttonWidth, btn.color, displayText);
      this.hitAreas[btn.id].bounds = [posX, 0, buttonWidth, height];
      posX += buttonWidth + buttonSpacing;
    });
    ctx.restore();
  }
  getAllLorasState(node) {
    if (!node.customWidgets) return false;
    const loraWidgets = node.customWidgets.filter((w) => w instanceof SuperLoraWidget);
    return loraWidgets.length > 0 && loraWidgets.every((w) => w.value.enabled);
  }
  computeSize() {
    return [450, 35];
  }
}
class SuperLoraTagWidget extends SuperLoraBaseWidget {
  constructor(tag) {
    super(`tag_${tag}`);
    this.tag = tag;
    this.onCollapseDown = (event, pos, node) => {
      this.value.collapsed = !this.value.collapsed;
      SuperLoraNode.calculateNodeSize(node);
      node.setDirtyCanvas(true, false);
      return true;
    };
    this.onToggleDown = (event, pos, node) => {
      const lorasInTag = this.getLorasInTag(node);
      const allEnabled = lorasInTag.every((w) => w.value.enabled);
      lorasInTag.forEach((w) => w.value.enabled = !allEnabled);
      node.setDirtyCanvas(true, false);
      return true;
    };
    this.value = { type: "SuperLoraTagWidget", tag, collapsed: false };
    this.hitAreas = {
      toggle: { bounds: [0, 0], onDown: this.onToggleDown, priority: 10 },
      collapse: { bounds: [0, 0], onDown: this.onCollapseDown, priority: 0 }
    };
  }
  draw(ctx, node, w, posY, height) {
    const margin = 10;
    let posX = margin;
    ctx.save();
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(0, posY, w, height);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, posY, w, height);
    const midY = height / 2;
    const lorasInTag = this.getLorasInTag(node);
    const allEnabled = lorasInTag.length > 0 && lorasInTag.every((w2) => w2.value.enabled);
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.value.collapsed ? "▶" : "▼", posX, posY + midY);
    this.hitAreas.collapse.bounds = [0, 0, w, height];
    posX += 20;
    ctx.fillStyle = allEnabled ? "#4CAF50" : "#666";
    ctx.beginPath();
    ctx.roundRect(posX, posY + 4, 20, height - 8, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(allEnabled ? "✓" : "○", posX + 6, posY + midY);
    this.hitAreas.toggle.bounds = [posX, 0, 20, height];
    posX += 30;
    ctx.fillStyle = "#fff";
    ctx.fillText(`${this.tag} (${lorasInTag.length})`, posX, posY + midY);
    ctx.restore();
  }
  getLorasInTag(node) {
    if (!node.customWidgets) return [];
    return node.customWidgets.filter(
      (w) => w instanceof SuperLoraWidget && w.value.tag === this.tag
    );
  }
  computeSize() {
    return [400, 25];
  }
  isCollapsed() {
    return this.value.collapsed;
  }
}
class SuperLoraWidget extends SuperLoraBaseWidget {
  constructor(name) {
    super(name);
    this.onEnabledDown = (event, pos, node) => {
      this.value.enabled = !this.value.enabled;
      node.setDirtyCanvas(true, false);
      return true;
    };
    this.onLoraClick = (event, pos, node) => {
      SuperLoraNode.showLoraSelector(node, this, event);
      return true;
    };
    this.onStrengthClick = (event, pos, node) => {
      var _a;
      try {
        const canvas = (_a = app) == null ? void 0 : _a.canvas;
        if (canvas == null ? void 0 : canvas.prompt) {
          canvas.prompt("Model Strength", this.value.strength ?? 1, (v) => {
            const val = parseFloat(v);
            if (!Number.isNaN(val)) {
              this.value.strength = Math.max(-2, Math.min(2, val));
              node.setDirtyCanvas(true, true);
            }
          }, event);
          return true;
        }
      } catch {
      }
      return false;
    };
    this.onStrengthDownClick = (event, pos, node) => {
      this.value.strength = Math.max(-2, this.value.strength - 0.1);
      node.setDirtyCanvas(true, false);
      return true;
    };
    this.onStrengthUpClick = (event, pos, node) => {
      this.value.strength = Math.min(2, this.value.strength + 0.1);
      node.setDirtyCanvas(true, false);
      return true;
    };
    this.onMoveUpClick = (event, pos, node) => {
      const index = node.customWidgets.indexOf(this);
      if (index > 1) {
        const temp = node.customWidgets[index];
        node.customWidgets[index] = node.customWidgets[index - 1];
        node.customWidgets[index - 1] = temp;
        node.setDirtyCanvas(true, false);
      }
      return true;
    };
    this.onMoveDownClick = (event, pos, node) => {
      const index = node.customWidgets.indexOf(this);
      if (index < node.customWidgets.length - 1) {
        const temp = node.customWidgets[index];
        node.customWidgets[index] = node.customWidgets[index + 1];
        node.customWidgets[index + 1] = temp;
        node.setDirtyCanvas(true, false);
      }
      return true;
    };
    this.onTriggerWordsClick = (event, pos, node) => {
      var _a;
      try {
        const canvas = (_a = app) == null ? void 0 : _a.canvas;
        if (canvas == null ? void 0 : canvas.prompt) {
          canvas.prompt("Trigger Words", this.value.triggerWords || "", (v) => {
            this.value.triggerWords = String(v ?? "");
            this.value.autoFetched = false;
            node.setDirtyCanvas(true, true);
          }, event);
          return true;
        }
      } catch {
      }
      return false;
    };
    this.onTagClick = (event, pos, node) => {
      SuperLoraNode.showTagSelector(node, this);
      return true;
    };
    this.onRemoveClick = (event, pos, node) => {
      SuperLoraNode.removeLoraWidget(node, this);
      return true;
    };
    this.value = {
      lora: "None",
      enabled: true,
      strength: 1,
      strengthClip: 1,
      triggerWords: "",
      tag: "General",
      autoFetched: false
    };
    this.hitAreas = {
      enabled: { bounds: [0, 0], onDown: this.onEnabledDown, priority: 60 },
      lora: { bounds: [0, 0], onClick: this.onLoraClick, priority: 10 },
      tag: { bounds: [0, 0], onClick: this.onTagClick, priority: 20 },
      strength: { bounds: [0, 0], onClick: this.onStrengthClick, priority: 80 },
      strengthDown: { bounds: [0, 0], onClick: this.onStrengthDownClick, priority: 90 },
      strengthUp: { bounds: [0, 0], onClick: this.onStrengthUpClick, priority: 90 },
      triggerWords: { bounds: [0, 0], onClick: this.onTriggerWordsClick, priority: 85 },
      remove: { bounds: [0, 0], onClick: this.onRemoveClick, priority: 100 },
      moveUp: { bounds: [0, 0], onClick: this.onMoveUpClick, priority: 70 },
      moveDown: { bounds: [0, 0], onClick: this.onMoveDownClick, priority: 70 }
    };
  }
  draw(ctx, node, w, posY, height) {
    var _a;
    const margin = 8;
    const rowHeight = 28;
    ctx.save();
    const gradient = ctx.createLinearGradient(0, posY, 0, posY + height);
    gradient.addColorStop(0, this.value.enabled ? "#4a4a4a" : "#2a2a2a");
    gradient.addColorStop(1, this.value.enabled ? "#3a3a3a" : "#1a1a1a");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(margin, posY + 2, w - margin * 2, height - 4, 6);
    ctx.fill();
    ctx.strokeStyle = this.value.enabled ? "#666" : "#444";
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!this.value.enabled) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();
    }
    ctx.font = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";
    const topPad = ((_a = node.properties) == null ? void 0 : _a.showTriggerWords) ? 4 : Math.max(4, Math.floor((height - rowHeight) / 2));
    let currentY = posY + topPad;
    this.drawFirstRow(ctx, node, w, currentY, rowHeight, height);
    ctx.restore();
  }
  drawFirstRow(ctx, node, w, posY, rowHeight, fullHeight) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const margin = 8;
    let posX = margin + 6;
    const midY = rowHeight / 2;
    const toggleSize = 20;
    const toggleY = (rowHeight - toggleSize) / 2;
    ctx.fillStyle = this.value.enabled ? "#4CAF50" : "#666";
    ctx.beginPath();
    ctx.roundRect(posX, posY + toggleY, toggleSize, toggleSize, 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "12px Arial";
    ctx.fillText(this.value.enabled ? "✓" : "", posX + toggleSize / 2, posY + midY);
    this.hitAreas.enabled.bounds = [posX, 0, toggleSize, fullHeight];
    posX += toggleSize + 8;
    const loraWidgets = ((_a = node.customWidgets) == null ? void 0 : _a.filter((w2) => w2 instanceof SuperLoraWidget)) || [];
    const indexInLoras = loraWidgets.indexOf(this);
    const lastIndex = loraWidgets.length - 1;
    const showMoveArrows = loraWidgets.length > 1 && ((_b = node == null ? void 0 : node.properties) == null ? void 0 : _b.showMoveArrows) !== false;
    const showStrength = ((_c = node == null ? void 0 : node.properties) == null ? void 0 : _c.showStrengthControls) !== false;
    const showRemove = ((_d = node == null ? void 0 : node.properties) == null ? void 0 : _d.showRemoveButton) !== false;
    const arrowSize = 20;
    const strengthWidth = 50;
    const btnSize = 20;
    const removeSize = 20;
    const gapSmall = 2;
    const gap = 8;
    const rightEdge = node.size[0] - margin;
    let cursorX = rightEdge;
    let removeX = -9999;
    let plusX = -9999;
    let minusX = -9999;
    let strengthX = -9999;
    let upX = -9999;
    let downX = -9999;
    if (showRemove) {
      cursorX -= removeSize;
      removeX = cursorX - gap;
      cursorX -= gap;
    }
    if (showStrength) {
      cursorX -= btnSize;
      plusX = cursorX - gap;
      cursorX -= gapSmall;
      cursorX -= strengthWidth;
      strengthX = cursorX - gap;
      cursorX -= gapSmall;
      cursorX -= btnSize;
      minusX = cursorX - gap;
      cursorX -= gap;
    }
    if (showMoveArrows) {
      const arrowRightStart = showStrength ? minusX - gap : showRemove ? removeX - gap : rightEdge - gap;
      upX = arrowRightStart - arrowSize - 4;
      downX = upX - (arrowSize + 2);
      cursorX -= gap;
    }
    if (((_e = node == null ? void 0 : node.properties) == null ? void 0 : _e.enableTags) && ((_f = node == null ? void 0 : node.properties) == null ? void 0 : _f.showTagChip) !== false) {
      const iconSize = 20;
      const iconY = posY + Math.floor((rowHeight - iconSize) / 2);
      ctx.fillStyle = this.value.enabled ? "#3d5afe" : "#555";
      ctx.beginPath();
      ctx.roundRect(posX, iconY, iconSize, iconSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "12px Arial";
      ctx.fillText("🏷", posX + iconSize / 2, posY + midY);
      this.hitAreas.tag.bounds = [posX, 0, iconSize, fullHeight];
      posX += iconSize + 6;
      ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    } else {
      this.hitAreas.tag.bounds = [0, 0, 0, 0];
    }
    const loraLeft = posX;
    const rightMost = [
      showMoveArrows ? downX : null,
      showStrength ? minusX : null,
      showRemove ? removeX : null
    ].filter((v) => typeof v === "number");
    const loraMaxRight = (rightMost.length ? Math.min(...rightMost) : rightEdge) - gap;
    const loraWidth = Math.max(100, loraMaxRight - loraLeft);
    const showTriggers = !!(node.properties && node.properties.showTriggerWords);
    const nameWidth = showTriggers ? Math.max(80, Math.floor(loraWidth * 0.6)) : loraWidth;
    const trigWidth = showTriggers ? loraWidth - nameWidth : 0;
    ctx.textAlign = "left";
    ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = this.value.enabled ? "#fff" : "#888";
    const loraText = this.value.lora === "None" ? "Click to select LoRA..." : this.value.lora;
    const loraDisplay = this.truncateText(ctx, loraText, nameWidth);
    ctx.fillText(loraDisplay, loraLeft, posY + midY);
    this.hitAreas.lora.bounds = [loraLeft, 0, nameWidth, fullHeight];
    const controlsAlpha = this.value.enabled ? 1 : 0.55;
    ctx.save();
    ctx.globalAlpha *= controlsAlpha;
    const triggerLeft = loraLeft + nameWidth;
    if (showTriggers && trigWidth > 0) {
      const hasTrigger = !!(this.value.triggerWords && String(this.value.triggerWords).trim());
      const pillH = 20;
      const pillY = posY + Math.floor((rowHeight - pillH) / 2);
      ctx.fillStyle = "#2f2f2f";
      ctx.beginPath();
      ctx.roundRect(triggerLeft, pillY, trigWidth, pillH, 3);
      ctx.fill();
      const padX = 6;
      ctx.textAlign = "left";
      ctx.font = "10px 'Segoe UI', Arial, sans-serif";
      if (hasTrigger) {
        ctx.fillStyle = this.value.enabled ? "#fff" : "#aaa";
        const trigDisplay = this.truncateText(ctx, String(this.value.triggerWords), trigWidth - padX * 2);
        ctx.fillText(trigDisplay, triggerLeft + padX, posY + midY);
      } else {
        ctx.fillStyle = "#888";
        const placeholder = "Click to add trigger words...";
        const phDisplay = this.truncateText(ctx, placeholder, trigWidth - padX * 2);
        ctx.fillText(phDisplay, triggerLeft + padX, posY + midY);
      }
      this.hitAreas.triggerWords.bounds = [triggerLeft, 0, trigWidth, fullHeight];
    } else {
      this.hitAreas.triggerWords.bounds = [0, 0, 0, 0];
    }
    if (showMoveArrows && ((_g = node == null ? void 0 : node.properties) == null ? void 0 : _g.showMoveArrows) !== false) {
      const arrowY = (rowHeight - arrowSize) / 2;
      const disableDown = indexInLoras === lastIndex;
      const disableUp = indexInLoras === 0;
      ctx.globalAlpha = controlsAlpha * (disableDown ? 0.35 : 1);
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.roundRect(downX, posY + arrowY, arrowSize, arrowSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText("▼", downX + arrowSize / 2, posY + midY);
      this.hitAreas.moveDown.bounds = disableDown ? [0, 0, 0, 0] : [downX, 0, arrowSize, fullHeight];
      ctx.globalAlpha = controlsAlpha * (disableUp ? 0.35 : 1);
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.roundRect(upX, posY + arrowY, arrowSize, arrowSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText("▲", upX + arrowSize / 2, posY + midY);
      this.hitAreas.moveUp.bounds = disableUp ? [0, 0, 0, 0] : [upX, 0, arrowSize, fullHeight];
      ctx.globalAlpha = controlsAlpha;
    } else {
      this.hitAreas.moveUp.bounds = [0, 0, 0, 0];
      this.hitAreas.moveDown.bounds = [0, 0, 0, 0];
    }
    const btnY = (rowHeight - btnSize) / 2;
    if (showStrength) {
      ctx.fillStyle = "#666";
      ctx.beginPath();
      ctx.roundRect(minusX, posY + btnY, btnSize, btnSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText("-", minusX + btnSize / 2, posY + midY);
      this.hitAreas.strengthDown.bounds = [minusX, 0, btnSize, fullHeight];
    } else {
      this.hitAreas.strengthDown.bounds = [0, 0, 0, 0];
    }
    if (((_h = node == null ? void 0 : node.properties) == null ? void 0 : _h.showStrengthControls) !== false) {
      const strengthY = (rowHeight - 20) / 2;
      ctx.fillStyle = this.value.enabled ? "#FF9800" : "#666";
      ctx.beginPath();
      ctx.roundRect(strengthX, posY + strengthY, strengthWidth, 20, 3);
      ctx.fill();
      ctx.fillStyle = this.value.enabled ? "#fff" : "#ddd";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText(this.value.strength.toFixed(2), strengthX + strengthWidth / 2, posY + midY);
      this.hitAreas.strength.bounds = [strengthX, 0, strengthWidth, fullHeight];
    } else {
      this.hitAreas.strength.bounds = [0, 0, 0, 0];
    }
    if (((_i = node == null ? void 0 : node.properties) == null ? void 0 : _i.showStrengthControls) !== false) {
      ctx.fillStyle = "#666";
      ctx.beginPath();
      ctx.roundRect(plusX, posY + btnY, btnSize, btnSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText("+", plusX + btnSize / 2, posY + midY);
      this.hitAreas.strengthUp.bounds = [plusX, 0, btnSize, fullHeight];
    } else {
      this.hitAreas.strengthUp.bounds = [0, 0, 0, 0];
    }
    ctx.restore();
    if (((_j = node == null ? void 0 : node.properties) == null ? void 0 : _j.showRemoveButton) !== false) {
      const removeY = (rowHeight - removeSize) / 2;
      ctx.fillStyle = "#3a2a2a";
      ctx.beginPath();
      ctx.roundRect(removeX, posY + removeY, removeSize, removeSize, 2);
      ctx.fill();
      ctx.strokeStyle = "#5a3a3a";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText("🗑", removeX + removeSize / 2, posY + midY);
      this.hitAreas.remove.bounds = [removeX, 0, removeSize, fullHeight];
    } else {
      this.hitAreas.remove.bounds = [0, 0, 0, 0];
    }
  }
  // drawSecondRow removed in compact single-row layout
  isCollapsedByTag(node) {
    if (!node.customWidgets) return false;
    const tagWidget = node.customWidgets.find(
      (w) => w instanceof SuperLoraTagWidget && w.tag === this.value.tag
    );
    return (tagWidget == null ? void 0 : tagWidget.isCollapsed()) || false;
  }
  truncateText(ctx, text, maxWidth) {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;
    let truncated = text;
    while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "...";
  }
  computeSize() {
    return [450, 50];
  }
  setLora(lora) {
    this.value.lora = lora;
    if (lora !== "None") {
      this.fetchTriggerWords();
    }
  }
  async fetchTriggerWords() {
    try {
      const words = await SuperLoraNode.civitaiService.getTriggerWords(this.value.lora);
      if (words.length > 0) {
        this.value.triggerWords = words.join(", ");
        this.value.autoFetched = true;
      }
    } catch (error) {
      console.warn("Failed to fetch trigger words:", error);
    }
  }
}
const _SuperLoraNode = class _SuperLoraNode {
  static async initialize() {
    this.loraService = LoraService.getInstance();
    this.templateService = TemplateService.getInstance();
    this.civitaiService = CivitAiService.getInstance();
    await Promise.all([
      this.loraService.initialize(),
      this.templateService.initialize()
    ]);
  }
  /**
   * Set up the node type with custom widgets
   */
  static setup(nodeType, nodeData) {
    const originalNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function() {
      if (originalNodeCreated) {
        originalNodeCreated.apply(this, arguments);
      }
      _SuperLoraNode.setupAdvancedNode(this);
    };
    const originalOnDrawForeground = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function(ctx) {
      if (originalOnDrawForeground) {
        originalOnDrawForeground.call(this, ctx);
      }
      _SuperLoraNode.drawCustomWidgets(this, ctx);
    };
    const originalOnMouseDown = nodeType.prototype.onMouseDown;
    nodeType.prototype.onMouseDown = function(event, pos) {
      if (_SuperLoraNode.handleMouseDown(this, event, pos)) {
        return true;
      }
      return originalOnMouseDown ? originalOnMouseDown.call(this, event, pos) : false;
    };
    const originalOnMouseUp = nodeType.prototype.onMouseUp;
    nodeType.prototype.onMouseUp = function(event, pos) {
      if (_SuperLoraNode.handleMouseUp(this, event, pos)) {
        return true;
      }
      return originalOnMouseUp ? originalOnMouseUp.call(this, event, pos) : false;
    };
    const originalSerialize = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function() {
      const data = originalSerialize ? originalSerialize.call(this) : {};
      data.customWidgets = _SuperLoraNode.serializeCustomWidgets(this);
      return data;
    };
    const originalConfigure = nodeType.prototype.configure;
    nodeType.prototype.configure = function(data) {
      if (originalConfigure) {
        originalConfigure.call(this, data);
      }
      if (data.customWidgets) {
        _SuperLoraNode.deserializeCustomWidgets(this, data.customWidgets);
      } else {
        _SuperLoraNode.setupAdvancedNode(this);
      }
    };
    const originalGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function(canvas) {
      const options = originalGetExtraMenuOptions ? originalGetExtraMenuOptions.call(this, canvas) : [];
      options.push(null);
      options.push({
        content: "🏷️ Add LoRA",
        callback: (event) => _SuperLoraNode.showLoraSelector(this, void 0, event)
      });
      options.push({
        content: "⚙️ Settings",
        callback: (event) => _SuperLoraNode.showSettingsDialog(this)
      });
      return options;
    };
  }
  /**
   * Initialize advanced node with custom widgets
   */
  static setupAdvancedNode(node) {
    console.log("Super LoRA Loader: Setting up advanced node");
    if (node.customWidgets && node.customWidgets.length > 0) {
      console.log("Super LoRA Loader: Node already initialized, skipping");
      return;
    }
    node.properties = node.properties || {};
    node.properties.enableTags = node.properties.enableTags !== false;
    node.properties.showTriggerWords = node.properties.showTriggerWords !== false;
    node.properties.showSeparateStrengths = node.properties.showSeparateStrengths || false;
    node.properties.autoFetchTriggerWords = node.properties.autoFetchTriggerWords !== false;
    node.customWidgets = node.customWidgets || [];
    node.customWidgets.push(new SuperLoraHeaderWidget());
    node.size = [Math.max(node.size[0], 450), Math.max(node.size[1], 100)];
    console.log("Super LoRA Loader: Advanced node setup complete");
  }
  /**
   * Calculate required node size based on widgets
   */
  static calculateNodeSize(node) {
    if (!node.customWidgets) return;
    const margin = 5;
    let currentY = this.NODE_WIDGET_TOP_OFFSET;
    for (const widget of node.customWidgets) {
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (isCollapsed) continue;
      const size = widget.computeSize();
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      if (height === 0) continue;
      currentY += height + margin;
    }
    const newHeight = Math.max(currentY, 100);
    const newWidth = Math.max(node.size[0], 450);
    if (node.size[1] !== newHeight) {
      node.size[1] = newHeight;
    }
    if (node.size[0] !== newWidth) {
      node.size[0] = newWidth;
    }
  }
  /**
   * Custom drawing for all widgets
   */
  static drawCustomWidgets(node, ctx) {
    if (!node.customWidgets) return;
    const margin = 5;
    let currentY = this.NODE_WIDGET_TOP_OFFSET;
    for (const widget of node.customWidgets) {
      const size = widget.computeSize();
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (size[1] === 0 || isCollapsed) {
        continue;
      }
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      widget.draw(ctx, node, node.size[0], currentY, height);
      currentY += height + margin;
    }
  }
  /**
   * Handle mouse interactions
   */
  static handleMouseDown(node, event, pos) {
    return this.handleMouseEvent(node, event, pos, "onMouseDown");
  }
  static handleMouseUp(node, event, pos) {
    return this.handleMouseEvent(node, event, pos, "onClick");
  }
  static handleMouseEvent(node, event, pos, handler) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!node.customWidgets) return false;
    console.log(`[SuperLoraNode] Mouse event: pos=[${pos[0]}, ${pos[1]}], handler=${handler}`);
    console.log("Node customWidgets:", node.customWidgets.map((w, i) => `${i}:${w.constructor.name}`));
    try {
      const rect = (_d = (_c = (_b = (_a = app) == null ? void 0 : _a.canvas) == null ? void 0 : _b.canvas) == null ? void 0 : _c.getBoundingClientRect) == null ? void 0 : _d.call(_c);
      const ds = (_f = (_e = app) == null ? void 0 : _e.canvas) == null ? void 0 : _f.ds;
      let sx = event && (event.clientX ?? event.pageX) || null;
      let sy = event && (event.clientY ?? event.pageY) || null;
      if ((sx == null || sy == null) && rect && ds) {
        sx = rect.left + (pos[0] + (((_g = ds.offset) == null ? void 0 : _g[0]) || 0)) * (ds.scale || 1);
        sy = rect.top + (pos[1] + (((_h = ds.offset) == null ? void 0 : _h[1]) || 0)) * (ds.scale || 1);
      }
      if (sx != null && sy != null) {
        _SuperLoraNode._lastPointerScreen = { x: sx, y: sy };
      }
    } catch {
    }
    const margin = 5;
    let currentY = this.NODE_WIDGET_TOP_OFFSET;
    console.log(`[SuperLoraNode] Starting currentY: ${currentY}`);
    for (const widget of node.customWidgets) {
      const size = widget.computeSize();
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (size[1] === 0 || isCollapsed) {
        continue;
      }
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      const widgetStartY = currentY;
      const widgetEndY = currentY + height;
      if (pos[1] >= widgetStartY && pos[1] <= widgetEndY) {
        console.log(`[SuperLoraNode] ✓ Click within ${widget.constructor.name} bounds`);
        const localPos = [pos[0], pos[1] - widgetStartY];
        console.log(`[SuperLoraNode] Local position: [${localPos[0]}, ${localPos[1]}], widgetStartY=${widgetStartY}`);
        if (widget[handler]) {
          console.log(`[SuperLoraNode] Calling ${widget.constructor.name}.${handler}()`);
          if (widget[handler](event, localPos, node)) {
            console.log(`[SuperLoraNode] ✓ Handler returned true`);
            return true;
          } else {
            console.log(`[SuperLoraNode] ✗ Handler returned false`);
          }
        } else {
          console.log(`[SuperLoraNode] ✗ No ${handler} method on ${widget.constructor.name}`);
        }
      } else {
        console.log(`[SuperLoraNode] ✗ Click outside ${widget.constructor.name} bounds`);
      }
      currentY += height + margin;
    }
    console.log(`[SuperLoraNode] No widget handled the event`);
    return false;
  }
  /**
   * Show LoRA selector dialog with enhanced search functionality
   */
  static async showLoraSelector(node, widget, event) {
    try {
      const availableLoras = await _SuperLoraNode.loraService.getAvailableLoras();
      const usedLoras = this.getUsedLoras(node);
      const items = availableLoras.map((name) => ({
        id: name,
        label: name.replace(/\.(safetensors|ckpt|pt)$/, ""),
        disabled: usedLoras.has(name)
      }));
      this.showSearchOverlay({
        title: "Add LoRA",
        placeholder: "Search LoRAs...",
        items,
        onChoose: (id) => {
          if (this.isDuplicateLora(node, id)) {
            this.showToast("⚠️ Already added to the list", "warning");
            return;
          }
          if (widget) {
            widget.setLora(id);
            this.showToast("✅ LoRA updated", "success");
          } else {
            this.addLoraWidget(node, { lora: id });
            this.showToast("✅ LoRA added", "success");
          }
          node.setDirtyCanvas(true, true);
        }
      });
    } catch (error) {
      console.error("Failed to show LoRA selector:", error);
      this.showToast("Failed to load LoRAs", "error");
    }
  }
  /**
   * Show tag selector dialog
   */
  static showTagSelector(node, widget) {
    const existingTags = this.getExistingTags(node);
    const commonTags = ["General", "Character", "Style", "Quality", "Effect"];
    const allTags = Array.from(/* @__PURE__ */ new Set([...commonTags, ...existingTags]));
    const items = allTags.map((tag) => ({ id: tag, label: tag }));
    this.showSearchOverlay({
      title: "Select Tag",
      placeholder: "Search or create tag...",
      items,
      allowCreate: true,
      onChoose: (tag) => {
        widget.value.tag = tag;
        this.organizeByTags(node);
        this.calculateNodeSize(node);
        node.setDirtyCanvas(true, false);
      }
    });
  }
  /**
   * Show settings dialog
   */
  static showSettingsDialog(node, event) {
    const coreItems = [
      {
        content: `${node.properties.enableTags ? "✅" : "❌"} Enable Tags`,
        callback: () => {
          node.properties.enableTags = !node.properties.enableTags;
          this.organizeByTags(node);
          this.calculateNodeSize(node);
          node.setDirtyCanvas(true, false);
        }
      },
      {
        content: `${node.properties.showSeparateStrengths ? "✅" : "❌"} Separate Model/CLIP Strengths`,
        callback: () => {
          node.properties.showSeparateStrengths = !node.properties.showSeparateStrengths;
          node.setDirtyCanvas(true, false);
        }
      },
      {
        content: `${node.properties.autoFetchTriggerWords ? "✅" : "❌"} Auto-fetch Trigger Words`,
        callback: () => {
          node.properties.autoFetchTriggerWords = !node.properties.autoFetchTriggerWords;
        }
      }
    ];
    const showItems = [
      {
        content: `${node.properties.showTriggerWords ? "✅" : "❌"} Show Trigger Words`,
        callback: () => {
          node.properties.showTriggerWords = !node.properties.showTriggerWords;
          node.setDirtyCanvas(true, false);
        }
      },
      {
        content: `${node.properties.showTagChip !== false ? "✅" : "❌"} Show Tag Chip`,
        callback: () => {
          node.properties.showTagChip = node.properties.showTagChip === false ? true : false;
          node.setDirtyCanvas(true, false);
        }
      },
      {
        content: `${node.properties.showMoveArrows !== false ? "✅" : "❌"} Show Move Arrows`,
        callback: () => {
          node.properties.showMoveArrows = node.properties.showMoveArrows === false ? true : false;
          node.setDirtyCanvas(true, false);
        }
      },
      {
        content: `${node.properties.showRemoveButton !== false ? "✅" : "❌"} Show Remove Button`,
        callback: () => {
          node.properties.showRemoveButton = node.properties.showRemoveButton === false ? true : false;
          node.setDirtyCanvas(true, false);
        }
      },
      {
        content: `${node.properties.showStrengthControls !== false ? "✅" : "❌"} Show Strength Controls`,
        callback: () => {
          node.properties.showStrengthControls = node.properties.showStrengthControls === false ? true : false;
          node.setDirtyCanvas(true, false);
        }
      }
    ];
    const menuItems = [...coreItems, null, ...showItems];
    new LiteGraph.ContextMenu(menuItems, { title: "Settings", event });
  }
  /**
   * Show save template dialog
   */
  static showSaveTemplateDialog(node) {
    const templateName = prompt("Enter template name:", "My LoRA Set");
    if (templateName && templateName.trim()) {
      const configs = this.getLoraConfigs(node);
      this.templateService.saveTemplate(templateName.trim(), configs).then((success) => {
        if (success) {
          this.showToast(`Template "${templateName.trim()}" saved successfully!`, "success");
        } else {
          this.showToast("Failed to save template", "error");
        }
      });
    }
  }
  /**
   * Show load template dialog with enhanced UI
   */
  static async showLoadTemplateDialog(node, event) {
    try {
      const templateNames = await this.templateService.getTemplateNames();
      if (templateNames.length === 0) {
        this.showToast("📁 No templates available. Create one first!", "info");
        return;
      }
      const items = templateNames.map((name) => ({ id: name, label: name }));
      this.showSearchOverlay({
        title: "Load Template",
        placeholder: "Search templates...",
        items,
        onChoose: async (name) => {
          try {
            const template = await this.templateService.loadTemplate(name);
            if (template) {
              this.loadTemplate(node, template);
              this.showToast(`✅ Template "${name}" loaded successfully!`, "success");
            } else {
              this.showToast(`❌ Failed to load template "${name}". It may be corrupted.`, "error");
            }
          } catch (error) {
            console.error(`Template load error for "${name}":`, error);
            this.showToast(`❌ Error loading template. Check console for details.`, "error");
          }
        },
        rightActions: [
          {
            icon: "✏️",
            title: "Rename template",
            onClick: async (name) => {
              this.showNameOverlay({
                title: "Rename Template",
                placeholder: "New template name...",
                initial: name,
                submitLabel: "Rename",
                onCommit: async (newName) => {
                  const src = (name || "").trim();
                  const dst = (newName || "").trim();
                  if (!dst || dst === src) return;
                  const ok = await this.templateService.renameTemplate(src, dst);
                  this.showToast(ok ? "✅ Template renamed" : "❌ Failed to rename", ok ? "success" : "error");
                  if (ok) this.showLoadTemplateDialog(node, event);
                }
              });
            }
          },
          {
            icon: "🗑",
            title: "Delete template",
            onClick: async (name) => {
              const ok = confirm(`Delete template "${name}"? This cannot be undone.`);
              if (!ok) return;
              const deleted = await this.templateService.deleteTemplate(name);
              this.showToast(deleted ? "✅ Template deleted" : "❌ Failed to delete template", deleted ? "success" : "error");
              if (deleted) this.showLoadTemplateDialog(node, event);
            }
          }
        ]
      });
    } catch (error) {
      console.error("Failed to show template selector:", error);
      this.showToast("❌ Error loading templates. Check console for details.", "error");
    }
  }
  /**
   * Add a new LoRA widget
   */
  static addLoraWidget(node, config) {
    var _a, _b;
    const widget = new SuperLoraWidget(`lora_${Date.now()}`);
    if (config) {
      Object.assign(widget.value, config);
    }
    if ((_a = node == null ? void 0 : node.properties) == null ? void 0 : _a.enableTags) {
      widget.value.tag = widget.value.tag || "General";
    }
    node.customWidgets = node.customWidgets || [];
    node.customWidgets.push(widget);
    if ((_b = node == null ? void 0 : node.properties) == null ? void 0 : _b.enableTags) {
      this.organizeByTags(node);
    }
    this.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    return widget;
  }
  /**
   * Remove a LoRA widget
   */
  static removeLoraWidget(node, widget) {
    const index = node.customWidgets.indexOf(widget);
    if (index >= 0) {
      node.customWidgets.splice(index, 1);
      this.organizeByTags(node);
      this.calculateNodeSize(node);
      node.setDirtyCanvas(true, false);
    }
  }
  /**
   * Organize widgets by tags
   */
  static organizeByTags(node) {
    if (!node.properties.enableTags) {
      node.customWidgets = node.customWidgets.filter((w) => !(w instanceof SuperLoraTagWidget));
      return;
    }
    const loraWidgets = node.customWidgets.filter((w) => w instanceof SuperLoraWidget);
    const headerWidget = node.customWidgets.find((w) => w instanceof SuperLoraHeaderWidget);
    const tagGroups = {};
    for (const widget of loraWidgets) {
      const tag = widget.value.tag || "General";
      if (!tagGroups[tag]) tagGroups[tag] = [];
      tagGroups[tag].push(widget);
    }
    node.customWidgets = [headerWidget].filter(Boolean);
    const sortedTags = Object.keys(tagGroups).sort(
      (a, b) => a === "General" ? -1 : b === "General" ? 1 : a.localeCompare(b)
    );
    for (const tag of sortedTags) {
      let tagWidget = node.customWidgets.find(
        (w) => w instanceof SuperLoraTagWidget && w.tag === tag
      );
      if (!tagWidget) {
        tagWidget = new SuperLoraTagWidget(tag);
      }
      node.customWidgets.push(tagWidget);
      node.customWidgets.push(...tagGroups[tag]);
    }
  }
  /**
   * Get used LoRA names
   */
  static getUsedLoras(node) {
    return new Set(
      node.customWidgets.filter((w) => w instanceof SuperLoraWidget).map((w) => w.value.lora).filter((lora) => lora && lora !== "None")
    );
  }
  /**
   * Check if a LoRA is already used in the node
   */
  static isDuplicateLora(node, loraName) {
    const usedLoras = this.getUsedLoras(node);
    return usedLoras.has(loraName);
  }
  /**
   * Get existing tags
   */
  static getExistingTags(node) {
    return Array.from(new Set(
      node.customWidgets.filter((w) => w instanceof SuperLoraWidget).map((w) => w.value.tag).filter((tag) => tag)
    ));
  }
  /**
   * Get LoRA configurations
   */
  static getLoraConfigs(node) {
    return node.customWidgets.filter((w) => w instanceof SuperLoraWidget).map((w) => ({
      lora: w.value.lora,
      enabled: w.value.enabled,
      strength_model: w.value.strength,
      strength_clip: w.value.strengthClip,
      trigger_word: w.value.triggerWords,
      tag: w.value.tag,
      auto_populated: w.value.autoFetched
    })).filter((config) => config.lora && config.lora !== "None");
  }
  /**
   * Load template configurations
   */
  static loadTemplate(node, configs) {
    node.customWidgets = node.customWidgets.filter(
      (w) => !(w instanceof SuperLoraWidget) && !(w instanceof SuperLoraTagWidget)
    );
    for (const config of configs) {
      const widget = new SuperLoraWidget(`lora_${Date.now()}_${Math.random()}`);
      widget.value = {
        lora: config.lora,
        enabled: config.enabled !== false,
        strength: config.strength_model || 1,
        strengthClip: config.strength_clip || config.strength_model || 1,
        triggerWords: config.trigger_word || "",
        tag: config.tag || "General",
        autoFetched: config.auto_populated || false
      };
      node.customWidgets.push(widget);
    }
    this.organizeByTags(node);
    this.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
  }
  /**
   * Serialize custom widgets for saving
   */
  static serializeCustomWidgets(node) {
    if (!node.customWidgets) return null;
    return {
      properties: node.properties,
      widgets: node.customWidgets.map((widget) => ({
        name: widget.name,
        type: widget.constructor.name,
        value: widget.value
      }))
    };
  }
  /**
   * Deserialize custom widgets when loading
   */
  static deserializeCustomWidgets(node, data) {
    if (!data) return;
    if (data.properties) {
      Object.assign(node.properties, data.properties);
    }
    if (data.widgets) {
      node.customWidgets = [];
      for (const widgetData of data.widgets) {
        let widget;
        switch (widgetData.type) {
          case "SuperLoraHeaderWidget":
            widget = new SuperLoraHeaderWidget();
            break;
          case "SuperLoraTagWidget":
            widget = new SuperLoraTagWidget(widgetData.value.tag);
            break;
          case "SuperLoraWidget":
            widget = new SuperLoraWidget(widgetData.name);
            break;
          default:
            continue;
        }
        widget.value = { ...widget.value, ...widgetData.value };
        node.customWidgets.push(widget);
      }
    }
    if (!node.customWidgets.find((w) => w instanceof SuperLoraHeaderWidget)) {
      node.customWidgets.unshift(new SuperLoraHeaderWidget());
    }
    node.setDirtyCanvas(true, true);
  }
  /**
   * Get execution data for backend
   */
  static getExecutionData(node) {
    var _a;
    const loraWidgets = ((_a = node.customWidgets) == null ? void 0 : _a.filter((w) => w instanceof SuperLoraWidget)) || [];
    const executionData = {};
    loraWidgets.forEach((widget, index) => {
      if (widget.value.lora && widget.value.lora !== "None") {
        executionData[`lora_${index}`] = {
          lora: widget.value.lora,
          enabled: widget.value.enabled,
          strength: widget.value.strength,
          strengthClip: widget.value.strengthClip,
          triggerWords: widget.value.triggerWords,
          tag: widget.value.tag,
          autoFetched: widget.value.autoFetched
        };
      }
    });
    return executionData;
  }
  /**
   * Show toast notification with enhanced styling
   */
  static showToast(message, type = "info") {
    console.log(`Super LoRA Loader [${type}]: ${message}`);
    const colors = {
      success: "#28a745",
      warning: "#ffc107",
      error: "#dc3545",
      info: "#17a2b8"
    };
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 14px 20px;
      border-radius: 6px;
      z-index: 10000;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      opacity: 0;
      transition: all 0.3s ease;
      max-width: 400px;
      word-wrap: break-word;
    `;
    toast.style.borderLeft = "4px solid rgba(255,255,255,0.3)";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 10);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      setTimeout(() => toast.remove(), 300);
    }, type === "error" ? 5e3 : 3e3);
  }
  // Inline editors for better UX
  static showInlineNumber(event, initial, onCommit) {
    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.05";
    input.value = String(initial ?? 0);
    input.style.cssText = `
      position: fixed;
      left: ${(() => {
      const p = _SuperLoraNode._lastPointerScreen;
      return ((event == null ? void 0 : event.clientX) ?? (p == null ? void 0 : p.x) ?? 100) + 8;
    })()}px;
      top: ${(() => {
      const p = _SuperLoraNode._lastPointerScreen;
      return ((event == null ? void 0 : event.clientY) ?? (p == null ? void 0 : p.y) ?? 100) - 10;
    })()}px;
      width: 80px;
      padding: 4px 6px;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: auto;
    `;
    const cleanup = () => input.remove();
    const commit = () => {
      const v = parseFloat(input.value);
      if (!Number.isNaN(v)) onCommit(v);
      cleanup();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") cleanup();
    });
    input.addEventListener("blur", cleanup);
    document.body.appendChild(input);
    input.focus();
    input.select();
  }
  static showInlineText(event, initial, onCommit) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = initial ?? "";
    input.style.cssText = `
      position: fixed;
      left: ${(() => {
      const p = _SuperLoraNode._lastPointerScreen;
      return ((event == null ? void 0 : event.clientX) ?? (p == null ? void 0 : p.x) ?? 100) + 8;
    })()}px;
      top: ${(() => {
      const p = _SuperLoraNode._lastPointerScreen;
      return ((event == null ? void 0 : event.clientY) ?? (p == null ? void 0 : p.y) ?? 100) - 10;
    })()}px;
      width: 260px;
      padding: 4px 6px;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: auto;
    `;
    const cleanup = () => input.remove();
    const commit = () => {
      onCommit(input.value ?? "");
      cleanup();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") cleanup();
    });
    input.addEventListener("blur", cleanup);
    document.body.appendChild(input);
    input.focus();
    input.select();
  }
  // Overlay utilities
  static showSearchOverlay(opts) {
    try {
      document.querySelectorAll('[data-super-lora-overlay="1"]').forEach((el) => el.remove());
    } catch {
    }
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 2147483600;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    `;
    overlay.setAttribute("data-super-lora-overlay", "1");
    const panel = document.createElement("div");
    panel.style.cssText = `
      width: 560px;
      max-height: 70vh;
      background: #222;
      border: 1px solid #444;
      border-radius: 8px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.4);
      color: #fff;
      font-family: 'Segoe UI', Arial, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;
    const header = document.createElement("div");
    header.textContent = opts.title;
    header.style.cssText = `
      padding: 12px 14px;
      font-weight: 600;
      border-bottom: 1px solid #444;
      background: #2a2a2a;
    `;
    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = opts.placeholder;
    search.style.cssText = `
      margin: 10px 12px;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #555;
      background: #1a1a1a;
      color: #fff;
      outline: none;
    `;
    const listWrap = document.createElement("div");
    listWrap.style.cssText = `
      overflow: auto;
      padding: 6px 4px 10px 4px;
    `;
    const list = document.createElement("div");
    list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 0 8px 8px 8px;
    `;
    const empty = document.createElement("div");
    empty.textContent = "No results";
    empty.style.cssText = "padding: 12px; color: #aaa; display: none;";
    const close = () => overlay.remove();
    const render = (term) => {
      list.innerHTML = "";
      const q = (term || "").trim().toLowerCase();
      let filtered = q ? opts.items.filter((i) => i.label.toLowerCase().includes(q)) : opts.items;
      if (opts.allowCreate && q) {
        const exact = opts.items.some((i) => i.label.toLowerCase() === q);
        if (!exact) {
          filtered = [{ id: term, label: `Create "${term}"` }, ...filtered];
        }
      }
      empty.style.display = filtered.length ? "none" : "block";
      const maxToShow = Math.min(2e3, filtered.length);
      filtered.slice(0, maxToShow).forEach((i) => {
        const row = document.createElement("div");
        row.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0;
        `;
        const leftBtn = document.createElement("button");
        leftBtn.type = "button";
        leftBtn.textContent = i.label + (i.disabled ? "  (added)" : "");
        leftBtn.disabled = !!i.disabled;
        leftBtn.style.cssText = `
          flex: 1;
          text-align: left;
          padding: 10px 12px;
          background: ${i.disabled ? "#2a2a2a" : "#252525"};
          color: ${i.disabled ? "#888" : "#fff"};
          border: 1px solid #3a3a3a;
          border-radius: 6px;
          cursor: ${i.disabled ? "not-allowed" : "pointer"};
        `;
        leftBtn.addEventListener("click", () => {
          if (!i.disabled) {
            opts.onChoose(i.id);
            close();
          }
        });
        row.appendChild(leftBtn);
        const actions = [];
        if (opts.rightActions && opts.rightActions.length) {
          actions.push(...opts.rightActions);
        } else if (opts.onRightAction) {
          actions.push({ icon: opts.rightActionIcon || "🗑", title: opts.rightActionTitle, onClick: opts.onRightAction });
        }
        if (actions.length && !i.disabled) {
          actions.forEach((action) => {
            const rightBtn = document.createElement("button");
            rightBtn.type = "button";
            rightBtn.textContent = action.icon;
            if (action.title) rightBtn.title = action.title;
            rightBtn.style.cssText = `
              margin-left: 8px;
              padding: 10px 12px;
              background: #3a2a2a;
              color: #fff;
              border: 1px solid #5a3a3a;
              border-radius: 6px;
              cursor: pointer;
            `;
            rightBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              e.preventDefault();
              action.onClick(i.id);
            });
            row.appendChild(rightBtn);
          });
        }
        list.appendChild(row);
      });
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    });
    listWrap.appendChild(empty);
    listWrap.appendChild(list);
    panel.appendChild(header);
    panel.appendChild(search);
    panel.appendChild(listWrap);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    search.addEventListener("input", () => render(search.value));
    setTimeout(() => {
      search.focus();
      render("");
    }, 0);
  }
  static showNameOverlay(opts) {
    const overlay = document.createElement("div");
    overlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 2147483600; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);`;
    const panel = document.createElement("div");
    panel.style.cssText = `width: 420px; background: #222; border: 1px solid #444; border-radius: 8px; color: #fff; font-family: 'Segoe UI', Arial, sans-serif; box-shadow: 0 12px 30px rgba(0,0,0,0.4); overflow: hidden;`;
    const header = document.createElement("div");
    header.textContent = opts.title;
    header.style.cssText = `padding: 12px 14px; font-weight: 600; border-bottom: 1px solid #444; background: #2a2a2a;`;
    const form = document.createElement("form");
    form.style.cssText = `display: flex; gap: 8px; padding: 14px;`;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = opts.placeholder;
    input.value = opts.initial || "";
    input.style.cssText = `flex: 1; padding: 10px 12px; border-radius: 6px; border: 1px solid #555; background: #1a1a1a; color: #fff; outline: none;`;
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = opts.submitLabel || "Save";
    submit.style.cssText = `padding: 10px 14px; background: #1976d2; color: #fff; border: 1px solid #0d47a1; border-radius: 6px; cursor: pointer;`;
    const close = () => overlay.remove();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      opts.onCommit(input.value);
      close();
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    });
    form.appendChild(input);
    form.appendChild(submit);
    panel.appendChild(header);
    panel.appendChild(form);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 0);
  }
};
_SuperLoraNode.NODE_WIDGET_TOP_OFFSET = 64;
_SuperLoraNode.loraService = LoraService.getInstance();
_SuperLoraNode.templateService = TemplateService.getInstance();
let SuperLoraNode = _SuperLoraNode;
const EXTENSION_NAME = "SuperLoraLoader";
const NODE_TYPE = "SuperLoraLoader";
const superLoraExtension = {
  name: EXTENSION_NAME,
  // Extension settings
  settings: [
    {
      id: "superLora.autoFetchTriggerWords",
      name: "Auto-fetch Trigger Words",
      type: "boolean",
      defaultValue: true
    },
    {
      id: "superLora.enableTags",
      name: "Enable Tag System",
      type: "boolean",
      defaultValue: false
    },
    {
      id: "superLora.showSeparateStrengths",
      name: "Show Separate Model/CLIP Strengths",
      type: "boolean",
      defaultValue: false
    },
    {
      id: "superLora.enableTemplates",
      name: "Enable Template System",
      type: "boolean",
      defaultValue: true
    },
    {
      id: "superLora.enableDeletion",
      name: "Enable LoRA Deletion",
      type: "boolean",
      defaultValue: true
    },
    {
      id: "superLora.enableSorting",
      name: "Enable LoRA Sorting",
      type: "boolean",
      defaultValue: true
    }
  ],
  // Extension commands
  commands: [
    {
      id: "superLora.addLora",
      label: "Add LoRA to Super LoRA Loader",
      function: () => {
        console.log("Super LoRA Loader: Add LoRA command triggered");
      }
    },
    {
      id: "superLora.showTriggerWords",
      label: "Show All Trigger Words",
      function: () => {
        console.log("Super LoRA Loader: Show trigger words command triggered");
      }
    }
  ],
  /**
   * Called before a node type is registered
   */
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_TYPE) {
      console.log("Super LoRA Loader: Registering node type");
      await SuperLoraNode.initialize();
      SuperLoraNode.setup(nodeType, nodeData);
      console.log("Super LoRA Loader: Node type registered successfully");
    }
  },
  /**
   * Called when a node is created
   */
  nodeCreated(node) {
    if (node.type === NODE_TYPE) {
      console.log("Super LoRA Loader: Node created", node.id);
      this.setupNodeEventHandlers(node);
    }
  },
  /**
   * Called before the graph is configured
   */
  beforeConfigureGraph(graphData) {
    console.log("Super LoRA Loader: Configuring graph");
  },
  /**
   * Set up additional event handlers for the node
   */
  setupNodeEventHandlers(node) {
    const originalOnRemoved = node.onRemoved;
    node.onRemoved = function() {
      console.log("Super LoRA Loader: Node removed", this.id);
      if (originalOnRemoved) {
        originalOnRemoved.apply(this, arguments);
      }
    };
    const originalClone = node.clone;
    node.clone = function() {
      const clonedNode = originalClone ? originalClone.apply(this, arguments) : this;
      console.log("Super LoRA Loader: Node cloned", this.id, "->", clonedNode.id);
      return clonedNode;
    };
    const originalOnPropertyChanged = node.onPropertyChanged;
    node.onPropertyChanged = function(name, value) {
      var _a;
      console.log("Super LoRA Loader: Property changed", name, value);
      if (name.startsWith("@")) {
        const settingName = name.substring(1);
        (_a = this.onSettingChanged) == null ? void 0 : _a.call(this, settingName, value);
      }
      if (originalOnPropertyChanged) {
        originalOnPropertyChanged.apply(this, arguments);
      }
    };
  }
};
console.log("Super LoRA Loader: Registering extension with ComfyUI");
app.registerExtension(superLoraExtension);
console.log("Super LoRA Loader: Extension registered successfully");
//# sourceMappingURL=extension.js.map
