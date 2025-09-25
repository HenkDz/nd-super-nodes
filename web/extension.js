import { app as app$1 } from "/scripts/app.js";
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
const _TagSetService = class _TagSetService {
  static getInstance() {
    if (!_TagSetService.instance) {
      _TagSetService.instance = new _TagSetService();
    }
    return _TagSetService.instance;
  }
  read() {
    try {
      const raw = localStorage.getItem(_TagSetService.STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return this.normalize(arr);
      }
    } catch {
    }
    this.write(_TagSetService.DEFAULT_TAGS);
    return [..._TagSetService.DEFAULT_TAGS];
  }
  write(tags) {
    try {
      const unique = this.normalize(tags);
      localStorage.setItem(_TagSetService.STORAGE_KEY, JSON.stringify(unique));
    } catch {
    }
  }
  normalize(tags) {
    const set = /* @__PURE__ */ new Set();
    for (const t of tags) {
      const name = String(t || "").trim();
      if (!name) continue;
      set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }
  getAll() {
    return this.read();
  }
  addTag(name) {
    const n = String(name || "").trim();
    if (!n) return false;
    const tags = this.read();
    if (tags.includes(n)) return false;
    tags.push(n);
    this.write(tags);
    return true;
  }
  renameTag(oldName, newName) {
    const src = String(oldName || "").trim();
    const dst = String(newName || "").trim();
    if (!src || !dst || src === dst) return false;
    const tags = this.read();
    const idx = tags.indexOf(src);
    if (idx === -1) return false;
    if (!tags.includes(dst)) {
      tags[idx] = dst;
    } else {
      tags.splice(idx, 1);
    }
    this.write(tags);
    return true;
  }
  deleteTag(name) {
    const n = String(name || "").trim();
    if (!n) return false;
    const tags = this.read();
    const idx = tags.indexOf(n);
    if (idx === -1) return false;
    tags.splice(idx, 1);
    if (!tags.includes("General")) tags.push("General");
    this.write(tags);
    return true;
  }
};
_TagSetService.instance = null;
_TagSetService.STORAGE_KEY = "superlora_tagset_v1";
_TagSetService.DEFAULT_TAGS = ["General", "Character", "Style", "Quality", "Effect"];
let TagSetService = _TagSetService;
class OverlayService {
  constructor() {
    this.stylesInjected = false;
  }
  static getInstance() {
    if (!OverlayService.instance) {
      OverlayService.instance = new OverlayService();
    }
    return OverlayService.instance;
  }
  showSearchOverlay(options) {
    this.ensureOverlayStyles();
    const baseFolderKey = options.baseFolderName || "files";
    const restoredState = this.restoreOverlayState(baseFolderKey);
    this.removeExistingOverlays();
    const items = options.items ?? [];
    const overlay = document.createElement("div");
    overlay.setAttribute("data-super-lora-overlay", "1");
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
    header.textContent = options.title;
    header.style.cssText = `
      padding: 12px 14px;
      font-weight: 600;
      border-bottom: 1px solid #444;
      background: #2a2a2a;
    `;
    const search = document.createElement("input");
    search.type = "text";
    search.placeholder = options.placeholder;
    search.style.cssText = `
      margin: 10px 12px;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #555;
      background: #1a1a1a;
      color: #fff;
      outline: none;
    `;
    const multiEnabled = !!options.enableMultiToggle;
    let multiMode = false;
    const selectedIds = /* @__PURE__ */ new Set();
    const ROOT_KEY = "__ROOT__";
    const controls = document.createElement("div");
    controls.style.cssText = `
      display: ${multiEnabled ? "flex" : "none"};
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 0 12px 6px 12px;
      color: #ddd;
      font-size: 12px;
    `;
    const multiLabel = document.createElement("label");
    multiLabel.className = "nd-overlay-multi-toggle";
    const multiToggle = document.createElement("input");
    multiToggle.type = "checkbox";
    multiToggle.className = "nd-overlay-multi-toggle-checkbox";
    multiToggle.addEventListener("change", () => {
      multiMode = !!multiToggle.checked;
      render(search.value);
      renderFooter();
    });
    const multiText = document.createElement("span");
    multiText.textContent = "Multi-select";
    multiText.className = "nd-overlay-multi-toggle-label";
    multiLabel.appendChild(multiToggle);
    multiLabel.appendChild(multiText);
    controls.appendChild(multiLabel);
    const chipWrap = document.createElement("div");
    chipWrap.className = "nd-overlay-chips-container";
    const subChipWrap = document.createElement("div");
    subChipWrap.className = "nd-overlay-subchips-container";
    subChipWrap.style.display = "none";
    let folderFeatureEnabled = false;
    const activeFolders = new Set(restoredState.activeFolders);
    const activeSubfolders = new Set(restoredState.activeSubfolders);
    const listWrap = document.createElement("div");
    listWrap.style.cssText = "overflow: auto; padding: 6px 4px 10px 4px;";
    const list = document.createElement("div");
    list.style.cssText = "display: flex; flex-direction: column; gap: 4px; padding: 0 8px 8px 8px;";
    const empty = document.createElement("div");
    empty.textContent = "No results";
    empty.style.cssText = "padding: 12px; color: #aaa; display: none;";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeOverlay();
      }
    };
    const closeOverlay = () => {
      try {
        overlay.remove();
      } catch {
      }
      document.removeEventListener("keydown", handleKeyDown);
      this.persistOverlayState(baseFolderKey, activeFolders, activeSubfolders);
    };
    document.addEventListener("keydown", handleKeyDown);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeOverlay();
    });
    const renderChips = (folderCounts) => {
      chipWrap.innerHTML = "";
      const header2 = document.createElement("div");
      header2.className = "nd-overlay-chip-header";
      header2.textContent = "Folders";
      chipWrap.appendChild(header2);
      const chipList = document.createElement("div");
      chipList.className = "nd-overlay-chip-list";
      chipWrap.appendChild(chipList);
      const allFolderNames = Object.keys(folderCounts).sort((a, b) => {
        if (a === ROOT_KEY) return -1;
        if (b === ROOT_KEY) return 1;
        return a.localeCompare(b);
      });
      const baseFolderName = options.baseFolderName || "files";
      allFolderNames.forEach((name) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "nd-overlay-chip";
        const isActive = activeFolders.has(name);
        if (isActive) chip.classList.add("is-active");
        const icon = document.createElement("span");
        icon.className = "nd-overlay-chip-icon";
        icon.textContent = name === ROOT_KEY ? "🏠" : "📁";
        const label = document.createElement("span");
        label.className = "nd-overlay-chip-label";
        label.textContent = name === ROOT_KEY ? `${baseFolderName} (root)` : name;
        const count = document.createElement("span");
        count.className = "nd-overlay-chip-count";
        count.textContent = String(folderCounts[name] ?? 0);
        chip.appendChild(icon);
        chip.appendChild(label);
        chip.appendChild(count);
        chip.title = name === ROOT_KEY ? `${baseFolderName} root` : name;
        chip.addEventListener("click", () => {
          if (activeFolders.has(name)) {
            activeFolders.delete(name);
          } else {
            activeFolders.add(name);
          }
          this.persistOverlayState(baseFolderKey, activeFolders, activeSubfolders);
          render(search.value);
          renderSubChips();
        });
        chipList.appendChild(chip);
      });
    };
    const renderSubChips = () => {
      subChipWrap.innerHTML = "";
      const show = activeFolders.size > 0;
      subChipWrap.style.display = show ? "flex" : "none";
      if (!show) return;
      const subCountsByKey = {};
      const subToTops = {};
      items.forEach((item) => {
        const parts = item.id.split(/[\\/]/);
        const top = parts.length > 1 ? parts[0] : ROOT_KEY;
        if (top === ROOT_KEY) return;
        if (!activeFolders.has(top)) return;
        const sub = parts.length > 2 ? parts[1] : ROOT_KEY;
        if (sub === ROOT_KEY) {
          const key2 = `${top}/${ROOT_KEY}`;
          subCountsByKey[key2] = (subCountsByKey[key2] || 0) + 1;
          if (!subToTops["(root)"]) subToTops["(root)"] = /* @__PURE__ */ new Set();
          subToTops["(root)"].add(top);
          return;
        }
        const key = `${top}/${sub}`;
        subCountsByKey[key] = (subCountsByKey[key] || 0) + 1;
        if (!subToTops[sub]) subToTops[sub] = /* @__PURE__ */ new Set();
        subToTops[sub].add(top);
      });
      const header2 = document.createElement("div");
      header2.className = "nd-overlay-chip-header";
      header2.textContent = activeFolders.size === 1 ? "Subfolders" : "Subfolders (selected)";
      subChipWrap.appendChild(header2);
      const chipList = document.createElement("div");
      chipList.className = "nd-overlay-chip-list";
      subChipWrap.appendChild(chipList);
      Object.keys(subCountsByKey).sort().forEach((key) => {
        const [top, sub] = key.split("/");
        const isRootSub = sub === ROOT_KEY;
        const duplicate = subToTops[sub]?.size && subToTops[sub].size > 1;
        const labelText = isRootSub ? `${top} (root)` : duplicate ? `${top} / ${sub}` : sub;
        const countVal = subCountsByKey[key] ?? 0;
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "nd-overlay-chip nd-overlay-chip--sub";
        const isActive = activeSubfolders.has(key);
        if (isActive) chip.classList.add("is-active");
        const icon = document.createElement("span");
        icon.className = "nd-overlay-chip-icon";
        icon.textContent = isRootSub ? "🗂️" : "↳";
        const label = document.createElement("span");
        label.className = "nd-overlay-chip-label";
        label.textContent = labelText;
        const count = document.createElement("span");
        count.className = "nd-overlay-chip-count";
        count.textContent = String(countVal);
        chip.appendChild(icon);
        chip.appendChild(label);
        chip.appendChild(count);
        chip.title = `${top}/${isRootSub ? "(root)" : sub}`;
        chip.addEventListener("click", () => {
          if (activeSubfolders.has(key)) {
            activeSubfolders.delete(key);
          } else {
            activeSubfolders.add(key);
          }
          this.persistOverlayState(baseFolderKey, activeFolders, activeSubfolders);
          render(search.value);
          renderSubChips();
        });
        chipList.appendChild(chip);
      });
    };
    const render = (term) => {
      list.innerHTML = "";
      const query = (term || "").trim().toLowerCase();
      const termFiltered = query ? items.filter((item) => item.label.toLowerCase().includes(query)) : items;
      if (folderFeatureEnabled) {
        const folderCounts = {};
        termFiltered.forEach((item) => {
          const parts = item.id.split(/[\\/]/);
          const top = parts.length > 1 ? parts[0] : ROOT_KEY;
          folderCounts[top] = (folderCounts[top] || 0) + 1;
        });
        renderChips(folderCounts);
      }
      let filtered = termFiltered;
      if (folderFeatureEnabled && activeFolders.size > 0) {
        filtered = termFiltered.filter((item) => {
          const parts = item.id.split(/[\\/]/);
          const top = parts.length > 1 ? parts[0] : ROOT_KEY;
          return activeFolders.has(top);
        });
        if (activeSubfolders.size > 0) {
          filtered = filtered.filter((item) => {
            const parts = item.id.split(/[\\/]/);
            const top = parts.length > 1 ? parts[0] : "";
            if (!top) return false;
            const sub = parts.length > 2 ? parts[1] : ROOT_KEY;
            const key = `${top}/${sub}`;
            return activeSubfolders.has(key);
          });
        }
      }
      if (options.allowCreate && query) {
        const exact = items.some((item) => item.label.toLowerCase() === query);
        if (!exact) {
          filtered = [{ id: term, label: `Create "${term}"` }, ...filtered];
        }
      }
      empty.style.display = filtered.length ? "none" : "block";
      try {
        header.textContent = `${options.title} (${filtered.length}/${items.length})`;
      } catch {
      }
      const maxToShow = Math.min(2e3, filtered.length);
      filtered.slice(0, maxToShow).forEach((item) => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 0;";
        const leftBtn = document.createElement("button");
        leftBtn.type = "button";
        leftBtn.className = "nd-overlay-item-button";
        leftBtn.disabled = !!item.disabled;
        const rawParts = item.id.split(/[\\/]/);
        const parts = rawParts.filter(Boolean);
        const folderPath = parts.slice(0, -1);
        const lastSegment = parts[parts.length - 1] || item.label;
        const pathDisplay = folderPath.length ? folderPath.join(" / ") : "(root)";
        const isFolder = !/\.[^./\\]{2,}$/i.test(lastSegment);
        const iconGlyph = isFolder ? "📁" : "📄";
        leftBtn.title = item.id;
        const checkboxSpan = document.createElement("span");
        checkboxSpan.className = "nd-overlay-item-checkbox";
        checkboxSpan.dataset.state = "hidden";
        const iconSpan = document.createElement("span");
        iconSpan.className = "nd-overlay-item-icon";
        iconSpan.textContent = iconGlyph;
        iconSpan.setAttribute("aria-hidden", "true");
        const textWrap = document.createElement("div");
        textWrap.className = "nd-overlay-item-text";
        const primaryLine = document.createElement("div");
        primaryLine.className = "nd-overlay-item-title";
        primaryLine.textContent = item.label;
        if (item.disabled) {
          const badge = document.createElement("span");
          badge.className = "nd-overlay-item-badge";
          badge.textContent = "added";
          primaryLine.appendChild(badge);
        }
        const secondaryLine = document.createElement("div");
        secondaryLine.className = "nd-overlay-item-path";
        secondaryLine.textContent = pathDisplay;
        secondaryLine.style.display = folderPath.length ? "block" : "none";
        textWrap.appendChild(primaryLine);
        textWrap.appendChild(secondaryLine);
        leftBtn.appendChild(checkboxSpan);
        leftBtn.appendChild(iconSpan);
        leftBtn.appendChild(textWrap);
        const applyState = () => {
          const isSelected = selectedIds.has(item.id);
          if (!multiMode) {
            checkboxSpan.dataset.state = "hidden";
          } else {
            checkboxSpan.dataset.state = isSelected ? "checked" : "unchecked";
          }
          leftBtn.classList.toggle("is-disabled", !!item.disabled);
          leftBtn.classList.toggle("is-selected", multiMode && isSelected);
        };
        applyState();
        leftBtn.addEventListener("click", () => {
          if (item.disabled) return;
          if (!multiMode) {
            options.onChoose(item.id);
            closeOverlay();
            return;
          }
          if (selectedIds.has(item.id)) selectedIds.delete(item.id);
          else selectedIds.add(item.id);
          applyState();
          renderFooter();
        });
        row.appendChild(leftBtn);
        const actions = [];
        if (options.rightActions && options.rightActions.length) {
          actions.push(...options.rightActions);
        } else if (options.onRightAction) {
          actions.push({ icon: options.rightActionIcon || "🗑", title: options.rightActionTitle, onClick: options.onRightAction });
        }
        if (actions.length && !item.disabled) {
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
            rightBtn.addEventListener("click", (event) => {
              event.stopPropagation();
              event.preventDefault();
              action.onClick(item.id);
            });
            row.appendChild(rightBtn);
          });
        }
        list.appendChild(row);
      });
      renderFooter();
    };
    const footer = document.createElement("div");
    footer.style.cssText = `
      display: none;
      padding: 10px 12px;
      border-top: 1px solid #444;
      background: #1e1e1e;
      gap: 8px;
      justify-content: flex-end;
    `;
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.textContent = "Clear";
    clearBtn.style.cssText = "padding: 8px 12px; border-radius: 6px; background: #333; color: #fff; border: 1px solid #555; cursor: pointer;";
    clearBtn.addEventListener("click", () => {
      selectedIds.clear();
      render(search.value);
    });
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "padding: 8px 12px; border-radius: 6px; background: #444; color: #fff; border: 1px solid #555; cursor: pointer;";
    cancelBtn.addEventListener("click", () => closeOverlay());
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Add Selected (0)";
    addBtn.style.cssText = "padding: 8px 12px; border-radius: 6px; background: #1976d2; color: #fff; border: 1px solid #0d47a1; cursor: pointer; opacity: 0.6;";
    addBtn.disabled = true;
    addBtn.addEventListener("click", () => {
      if (!multiMode) return;
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      if (typeof options.onChooseMany === "function") {
        options.onChooseMany(ids);
      } else {
        ids.forEach((id) => options.onChoose(id));
      }
      closeOverlay();
    });
    footer.appendChild(clearBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(addBtn);
    const renderFooter = () => {
      const count = selectedIds.size;
      addBtn.textContent = `Add Selected (${count})`;
      addBtn.disabled = count === 0;
      addBtn.style.opacity = count === 0 ? "0.6" : "1";
      footer.style.display = multiEnabled && multiMode ? "flex" : "none";
    };
    listWrap.appendChild(empty);
    listWrap.appendChild(list);
    panel.appendChild(header);
    panel.appendChild(search);
    panel.appendChild(controls);
    const allowFolderChips = Array.isArray(options.folderChips) && options.folderChips.length > 0 || items.some((item) => /[\\/]/.test(item.id));
    if (allowFolderChips) {
      const initialCounts = {};
      items.forEach((item) => {
        const parts = item.id.split(/[\\/]/);
        const top = parts.length > 1 ? parts[0] : ROOT_KEY;
        initialCounts[top] = (initialCounts[top] || 0) + 1;
      });
      if (Object.keys(initialCounts).length) {
        folderFeatureEnabled = true;
        renderChips(initialCounts);
        panel.appendChild(chipWrap);
        panel.appendChild(subChipWrap);
        renderSubChips();
      }
    }
    panel.appendChild(listWrap);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    search.addEventListener("input", () => render(search.value));
    setTimeout(() => {
      try {
        search.focus();
      } catch {
      }
      render("");
      renderFooter();
    }, 0);
  }
  showToast(message, type = "info") {
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
      border-left: 4px solid rgba(255,255,255,0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
    const timeout = type === "error" ? 5e3 : 3e3;
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-10px)";
      setTimeout(() => {
        try {
          toast.remove();
        } catch {
        }
      }, 300);
    }, timeout);
  }
  ensureOverlayStyles() {
    if (this.stylesInjected) return;
    try {
      if (typeof document === "undefined") return;
      const existing = document.querySelector('style[data-super-lora-overlay-style="1"]');
      if (existing) {
        this.stylesInjected = true;
        return;
      }
      const style = document.createElement("style");
      style.setAttribute("data-super-lora-overlay-style", "1");
      style.textContent = `
        [data-super-lora-overlay="1"] .nd-overlay-item-button {
          position: relative;
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 10px;
          background: #252525;
          border: 1px solid #3a3a3a;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-button:hover:not(.is-disabled) {
          background: #2c2c2c;
          border-color: #4a4a4a;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-button.is-disabled {
          background: #2a2a2a;
          color: #888;
          cursor: not-allowed;
          border-color: #343434;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-button.is-selected {
          background: #263238;
          border-color: #4a90e2;
          box-shadow: inset 0 0 0 1px rgba(74, 144, 226, 0.35);
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox {
          width: 16px;
          height: 16px;
          min-width: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #4a4a4a;
          border-radius: 4px;
          background: #1d1d1d;
          color: #8ab4f8;
          font-size: 12px;
          line-height: 1;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox[data-state="hidden"] {
          opacity: 0;
          visibility: hidden;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox[data-state="unchecked"]::after {
          content: '';
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox[data-state="checked"] {
          border-color: #4a90e2;
          background: rgba(74, 144, 226, 0.18);
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox[data-state="checked"]::after {
          content: '✔';
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox::after {
          font-size: 10px;
          color: #8ab4f8;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-icon {
          font-size: 16px;
          line-height: 1.5;
          opacity: 0.85;
          min-width: 18px;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-title {
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-path {
          font-size: 12px;
          color: #9aa4b4;
          opacity: 0.85;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-badge {
          font-size: 11px;
          color: #9aa4b4;
          border: 1px solid #4a4f55;
          border-radius: 999px;
          padding: 1px 6px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chips-container,
        [data-super-lora-overlay="1"] .nd-overlay-subchips-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 0 12px 6px 12px;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-header {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9aa4b4;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #3a3a3a;
          background: #252525;
          color: #fff;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip.is-active {
          border-color: #4a90e2;
          background: rgba(74, 144, 226, 0.18);
          box-shadow: inset 0 0 0 1px rgba(74, 144, 226, 0.35);
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-icon {
          font-size: 14px;
          opacity: 0.85;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-label {
          font-weight: 500;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-count {
          font-size: 11px;
          background: rgba(255, 255, 255, 0.08);
          padding: 0 6px;
          border-radius: 999px;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip--sub {
          font-size: 11px;
          padding: 5px 9px;
          background: #1f1f1f;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip--sub.is-active {
          background: rgba(255, 255, 255, 0.06);
          border-color: #66aaff;
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid #3a3a3a;
          background: #1f1f1f;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          user-select: none;
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle-checkbox {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid #4a4a4a;
          background: #111;
          position: relative;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle-checkbox:checked {
          border-color: #4a90e2;
          background: rgba(74, 144, 226, 0.2);
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle-checkbox:checked::after {
          content: '✔';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -55%);
          font-size: 10px;
          color: #8ab4f8;
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle-label {
          font-weight: 500;
          letter-spacing: 0.01em;
        }
      `;
      document.head.appendChild(style);
      this.stylesInjected = true;
    } catch {
    }
  }
  removeExistingOverlays() {
    try {
      document.querySelectorAll('[data-super-lora-overlay="1"]').forEach((el) => el.remove());
    } catch {
    }
  }
  restoreOverlayState(baseFolderKey) {
    try {
      const folderRaw = sessionStorage.getItem(this.getFolderStorageKey(baseFolderKey));
      const subRaw = sessionStorage.getItem(this.getSubfolderStorageKey(baseFolderKey));
      const activeFolders = folderRaw ? JSON.parse(folderRaw) : [];
      const activeSubfolders = subRaw ? JSON.parse(subRaw) : [];
      return {
        activeFolders: Array.isArray(activeFolders) ? activeFolders : [],
        activeSubfolders: Array.isArray(activeSubfolders) ? activeSubfolders : []
      };
    } catch {
      return { activeFolders: [], activeSubfolders: [] };
    }
  }
  persistOverlayState(baseFolderKey, folders, subfolders) {
    try {
      sessionStorage.setItem(this.getFolderStorageKey(baseFolderKey), JSON.stringify(Array.from(folders)));
      sessionStorage.setItem(this.getSubfolderStorageKey(baseFolderKey), JSON.stringify(Array.from(subfolders)));
    } catch {
    }
  }
  getFolderStorageKey(baseFolderKey) {
    const suffix = baseFolderKey ? `_${baseFolderKey}` : "";
    return `superlora_folder_filters${suffix}`;
  }
  getSubfolderStorageKey(baseFolderKey) {
    const suffix = baseFolderKey ? `_${baseFolderKey}` : "";
    return `superlora_subfolder_filters${suffix}`;
  }
}
class SuperLoraBaseWidget {
  constructor(name) {
    this.name = name;
    this.type = "custom";
    this.value = {};
    this.hitAreas = {};
  }
  draw(_ctx, _node, _w, _posY, _height) {
  }
  onMouseDown(event, pos, node) {
    return this.handleHitAreas(event, pos, node, "onDown");
  }
  onClick(event, pos, node) {
    return this.handleHitAreas(event, pos, node, "onClick");
  }
  handleHitAreas(event, pos, node, handler) {
    const entries = Object.entries(this.hitAreas);
    entries.sort((a, b) => {
      const pa = a[1]?.priority || 0;
      const pb = b[1]?.priority || 0;
      return pb - pa;
    });
    for (const [key, area] of entries) {
      const bounds = area.bounds;
      if (bounds && bounds.length >= 4 && this.isInBounds(pos, bounds)) {
        const fn = (handler === "onDown" ? area.onDown : area.onClick) || (handler === "onDown" ? area.onClick : area.onDown);
        if (fn) {
          return fn.call(this, event, pos, node);
        }
      }
    }
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
const WidgetAPI = {
  showLoraSelector: () => {
    throw new Error("WidgetAPI.showLoraSelector not initialized");
  },
  showTagSelector: () => {
    throw new Error("WidgetAPI.showTagSelector not initialized");
  },
  showSettingsDialog: () => {
    throw new Error("WidgetAPI.showSettingsDialog not initialized");
  },
  showLoadTemplateDialog: () => {
    throw new Error("WidgetAPI.showLoadTemplateDialog not initialized");
  },
  showNameOverlay: () => {
    throw new Error("WidgetAPI.showNameOverlay not initialized");
  },
  showInlineText: () => {
    throw new Error("WidgetAPI.showInlineText not initialized");
  },
  showToast: () => {
    throw new Error("WidgetAPI.showToast not initialized");
  },
  calculateNodeSize: () => {
    throw new Error("WidgetAPI.calculateNodeSize not initialized");
  },
  organizeByTags: () => {
    throw new Error("WidgetAPI.organizeByTags not initialized");
  },
  addLoraWidget: () => {
    throw new Error("WidgetAPI.addLoraWidget not initialized");
  },
  removeLoraWidget: () => {
    throw new Error("WidgetAPI.removeLoraWidget not initialized");
  },
  getLoraConfigs: () => {
    throw new Error("WidgetAPI.getLoraConfigs not initialized");
  },
  syncExecutionWidgets: () => {
    throw new Error("WidgetAPI.syncExecutionWidgets not initialized");
  },
  templateService: null,
  civitaiService: null
};
function setWidgetAPI(api) {
  Object.assign(WidgetAPI, api);
}
const STORAGE_KEY = "super_lora_manual_triggers_v1";
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}
function writeStore(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
  }
}
const TriggerWordStore = {
  get(loraFileName) {
    if (!loraFileName) return null;
    const map = readStore();
    const val = map[loraFileName];
    return typeof val === "string" && val.trim().length ? val : null;
  },
  set(loraFileName, triggerWords) {
    if (!loraFileName) return;
    const map = readStore();
    if (typeof triggerWords === "string" && triggerWords.trim().length) {
      map[loraFileName] = triggerWords.trim();
    } else {
      delete map[loraFileName];
    }
    writeStore(map);
  },
  remove(loraFileName) {
    if (!loraFileName) return;
    const map = readStore();
    if (map[loraFileName] !== void 0) {
      delete map[loraFileName];
      writeStore(map);
    }
  }
};
class SuperLoraTagWidget extends SuperLoraBaseWidget {
  constructor(tag) {
    super(`tag_${tag}`);
    this.tag = tag;
    this.onCollapseDown = (_event, _pos, node) => {
      this.value.collapsed = !this.value.collapsed;
      WidgetAPI.calculateNodeSize(node);
      node.setDirtyCanvas(true, false);
      return true;
    };
    this.onToggleDown = (_event, _pos, node) => {
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
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, posY, w, height);
    ctx.beginPath();
    ctx.moveTo(0, posY + 0.5);
    ctx.lineTo(w, posY + 0.5);
    ctx.moveTo(0, posY + height - 0.5);
    ctx.lineTo(w, posY + height - 0.5);
    const midY = height / 2;
    const lorasInTag = this.getLorasInTag(node);
    lorasInTag.length > 0 && lorasInTag.every((w2) => w2.value.enabled);
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.value.collapsed ? "▶" : "▼", posX, posY + midY);
    this.hitAreas.collapse.bounds = [0, 0, w, height];
    posX += 20;
    this.hitAreas.toggle.bounds = [0, 0, 0, 0];
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
    this.onEnabledDown = (_event, _pos, node) => {
      this.value.enabled = !this.value.enabled;
      node.setDirtyCanvas(true, false);
      try {
        WidgetAPI.syncExecutionWidgets(node);
      } catch {
      }
      return true;
    };
    this.onLoraClick = (event, _pos, node) => {
      WidgetAPI.showLoraSelector(node, this, event);
      return true;
    };
    this.onStrengthClick = (event, _pos, node) => {
      try {
        const app2 = window?.app;
        const canvas = app2?.canvas;
        if (canvas?.prompt) {
          canvas.prompt("Model Strength", this.value.strength ?? 1, (v) => {
            const val = parseFloat(v);
            if (!Number.isNaN(val)) {
              this.value.strength = Math.max(-10, Math.min(10, val));
              node.setDirtyCanvas(true, true);
            }
          }, event);
          return true;
        }
      } catch {
      }
      return false;
    };
    this.onStrengthDownClick = (_event, _pos, node) => {
      this.value.strength = Math.max(-10, this.value.strength - 0.1);
      node.setDirtyCanvas(true, false);
      try {
        WidgetAPI.syncExecutionWidgets(node);
      } catch {
      }
      return true;
    };
    this.onStrengthUpClick = (_event, _pos, node) => {
      this.value.strength = Math.min(10, this.value.strength + 0.1);
      node.setDirtyCanvas(true, false);
      try {
        WidgetAPI.syncExecutionWidgets(node);
      } catch {
      }
      return true;
    };
    this.onStrengthClipClick = (event, _pos, node) => {
      try {
        const app2 = window?.app;
        const canvas = app2?.canvas;
        if (canvas?.prompt) {
          canvas.prompt("CLIP Strength", this.value.strengthClip ?? this.value.strength ?? 1, (v) => {
            const val = parseFloat(v);
            if (!Number.isNaN(val)) {
              this.value.strengthClip = Math.max(-10, Math.min(10, val));
              node.setDirtyCanvas(true, true);
              try {
                WidgetAPI.syncExecutionWidgets(node);
              } catch {
              }
            }
          }, event);
          return true;
        }
      } catch {
      }
      return false;
    };
    this.onStrengthClipDownClick = (_event, _pos, node) => {
      this.value.strengthClip = Math.max(-10, (this.value.strengthClip ?? this.value.strength ?? 1) - 0.1);
      node.setDirtyCanvas(true, false);
      try {
        WidgetAPI.syncExecutionWidgets(node);
      } catch {
      }
      return true;
    };
    this.onStrengthClipUpClick = (_event, _pos, node) => {
      this.value.strengthClip = Math.min(10, (this.value.strengthClip ?? this.value.strength ?? 1) + 0.1);
      node.setDirtyCanvas(true, false);
      try {
        WidgetAPI.syncExecutionWidgets(node);
      } catch {
      }
      return true;
    };
    this.onMoveUpClick = (_event, _pos, node) => {
      const idx = node.customWidgets.indexOf(this);
      if (idx <= 1) return true;
      if (node?.properties?.enableTags) {
        for (let j = idx - 1; j >= 0; j--) {
          const w = node.customWidgets[j];
          if (w instanceof SuperLoraWidget) {
            if (w.value?.tag === this.value?.tag) {
              const tmp = node.customWidgets[idx];
              node.customWidgets[idx] = node.customWidgets[j];
              node.customWidgets[j] = tmp;
              break;
            } else if (!(w instanceof SuperLoraWidget)) {
              break;
            }
          }
          if (w instanceof SuperLoraTagWidget) break;
        }
      } else {
        const temp = node.customWidgets[idx];
        node.customWidgets[idx] = node.customWidgets[idx - 1];
        node.customWidgets[idx - 1] = temp;
      }
      WidgetAPI.calculateNodeSize(node);
      node.setDirtyCanvas(true, false);
      return true;
    };
    this.onMoveDownClick = (_event, _pos, node) => {
      const idx = node.customWidgets.indexOf(this);
      if (idx >= node.customWidgets.length - 1) return true;
      if (node?.properties?.enableTags) {
        for (let j = idx + 1; j < node.customWidgets.length; j++) {
          const w = node.customWidgets[j];
          if (w instanceof SuperLoraWidget) {
            if (w.value?.tag === this.value?.tag) {
              const tmp = node.customWidgets[idx];
              node.customWidgets[idx] = node.customWidgets[j];
              node.customWidgets[j] = tmp;
              break;
            } else if (!(w instanceof SuperLoraWidget)) {
              break;
            }
          }
          if (w instanceof SuperLoraTagWidget) break;
        }
      } else {
        const temp = node.customWidgets[idx];
        node.customWidgets[idx] = node.customWidgets[idx + 1];
        node.customWidgets[idx + 1] = temp;
      }
      WidgetAPI.calculateNodeSize(node);
      node.setDirtyCanvas(true, false);
      return true;
    };
    this.onTriggerWordsClick = (event, _pos, node) => {
      try {
        try {
          event?.stopPropagation?.();
          event?.preventDefault?.();
        } catch {
        }
        if (WidgetAPI && typeof WidgetAPI.showInlineText === "function") {
          const rect = this._triggerRect;
          const place = rect ? { rect, node, widget: this } : void 0;
          WidgetAPI.showInlineText(event, this.value.triggerWords || "", async (v) => {
            const newVal = String(v ?? "");
            this.value.triggerWords = newVal;
            this.value.autoFetched = false;
            this.value = { ...this.value, fetchAttempted: false };
            try {
              TriggerWordStore.set(this.value.lora, newVal);
            } catch {
            }
            this.value = { ...this.value };
            node.setDirtyCanvas(true, true);
            try {
              WidgetAPI.syncExecutionWidgets(node);
            } catch {
            }
          }, place);
          return true;
        }
      } catch {
      }
      try {
        const app2 = window?.app;
        const canvas = app2?.canvas;
        if (canvas?.prompt) {
          canvas.prompt("Trigger Words", this.value.triggerWords || "", async (v) => {
            const newVal = String(v ?? "");
            this.value.triggerWords = newVal;
            this.value.autoFetched = false;
            this.value = { ...this.value, fetchAttempted: false };
            try {
              TriggerWordStore.set(this.value.lora, newVal);
            } catch {
            }
            node.setDirtyCanvas(true, true);
            try {
              WidgetAPI.syncExecutionWidgets(node);
            } catch {
            }
          }, event);
          return true;
        }
      } catch {
      }
      return false;
    };
    this.onRefreshClick = async (_event, _pos, node) => {
      try {
        const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        this._refreshSpinActive = true;
        this._refreshSpinStarted = now;
        this._refreshSpinEnd = now + 650;
        this._refreshSpinPeriod = 800;
        try {
          node.setDirtyCanvas(true, false);
        } catch {
        }
      } catch {
      }
      try {
        try {
          TriggerWordStore.remove(this.value.lora);
        } catch {
        }
        this.value.triggerWords = "";
        this.value.autoFetched = false;
        this.value = { ...this.value, fetchAttempted: false };
        await this.fetchTriggerWords();
        node.setDirtyCanvas(true, true);
        try {
          WidgetAPI.syncExecutionWidgets(node);
        } catch {
        }
        return true;
      } catch {
        return false;
      } finally {
        try {
          const now2 = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
          const end = Math.max(this._refreshSpinEnd || now2, now2 + 200);
          this._refreshSpinEnd = end;
          const timeoutMs = Math.max(0, end - now2);
          setTimeout(() => {
            this._refreshSpinActive = false;
            try {
              node.setDirtyCanvas(true, false);
            } catch {
            }
            ;
          }, timeoutMs);
        } catch {
        }
      }
    };
    this.onTagClick = (_event, _pos, node) => {
      WidgetAPI.showTagSelector(node, this);
      return true;
    };
    this.onRemoveClick = (_event, _pos, node) => {
      WidgetAPI.removeLoraWidget(node, this);
      return true;
    };
    this.value = {
      lora: "None",
      enabled: true,
      strength: 1,
      strengthClip: 1,
      triggerWords: "",
      tag: "General",
      autoFetched: false,
      fetchAttempted: false
    };
    this.hitAreas = {
      enabled: { bounds: [0, 0], onDown: this.onEnabledDown, priority: 60 },
      lora: { bounds: [0, 0], onClick: this.onLoraClick, priority: 10 },
      tag: { bounds: [0, 0], onClick: this.onTagClick, priority: 20 },
      strength: { bounds: [0, 0], onClick: this.onStrengthClick, priority: 80 },
      strengthDown: { bounds: [0, 0], onClick: this.onStrengthDownClick, priority: 90 },
      strengthUp: { bounds: [0, 0], onClick: this.onStrengthUpClick, priority: 90 },
      strengthClip: { bounds: [0, 0], onClick: this.onStrengthClipClick, priority: 80 },
      strengthClipDown: { bounds: [0, 0], onClick: this.onStrengthClipDownClick, priority: 90 },
      strengthClipUp: { bounds: [0, 0], onClick: this.onStrengthClipUpClick, priority: 90 },
      triggerWords: { bounds: [0, 0], onClick: this.onTriggerWordsClick, priority: 85 },
      refresh: { bounds: [0, 0], onClick: this.onRefreshClick, priority: 95 },
      remove: { bounds: [0, 0], onClick: this.onRemoveClick, priority: 100 },
      moveUp: { bounds: [0, 0], onClick: this.onMoveUpClick, priority: 70 },
      moveDown: { bounds: [0, 0], onClick: this.onMoveDownClick, priority: 70 }
    };
  }
  draw(ctx, node, w, posY, height) {
    const margin = 8;
    const rowHeight = 28;
    ctx.save();
    const innerWidth = Math.max(0, w - margin * 2);
    const clampedHeight = Math.max(0, height);
    ctx.beginPath();
    ctx.rect(margin, posY, innerWidth, clampedHeight);
    ctx.clip();
    const bodyHeight = Math.max(4, height - 4);
    const bodyY = posY + (height >= bodyHeight ? Math.floor((height - bodyHeight) / 2) : 0);
    const cornerRadius = Math.min(6, bodyHeight / 2);
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.roundRect(margin, bodyY, innerWidth, bodyHeight, cornerRadius || 0);
    ctx.fill();
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();
    if (!this.value.enabled) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();
    }
    ctx.font = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";
    const topPad = node.properties?.showTriggerWords ? 4 : Math.max(4, Math.floor((height - rowHeight) / 2));
    let currentY = posY + topPad;
    this.drawFirstRow(ctx, node, w, currentY, rowHeight, height);
    ctx.restore();
  }
  drawFirstRow(ctx, node, w, posY, rowHeight, fullHeight) {
    const margin = 8;
    let posX = margin + 6;
    const midY = rowHeight / 2;
    const toggleSize = 20;
    const toggleY = (rowHeight - toggleSize) / 2;
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.roundRect(posX, posY + toggleY, toggleSize, toggleSize, 2);
    ctx.fill();
    ctx.strokeStyle = this.value.enabled ? "#1b5e20" : "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = this.value.enabled ? "#2e7d32" : "";
    ctx.textAlign = "center";
    ctx.font = "12px Arial";
    if (this.value.enabled) {
      ctx.fillText("●", posX + toggleSize / 2, posY + midY);
    }
    this.hitAreas.enabled.bounds = [posX, 0, toggleSize, fullHeight];
    posX += toggleSize + 8;
    const loraWidgets = node.customWidgets?.filter((w2) => w2 instanceof SuperLoraWidget) || [];
    const indexInLoras = loraWidgets.indexOf(this);
    const lastIndex = loraWidgets.length - 1;
    const showMoveArrows = loraWidgets.length > 1 && node?.properties?.showMoveArrows !== false;
    const showStrength = node?.properties?.showStrengthControls !== false;
    const showRemove = node?.properties?.showRemoveButton !== false;
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
    let plusClipX = -9999;
    let minusClipX = -9999;
    let strengthClipX = -9999;
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
      if (node?.properties?.showSeparateStrengths) {
        cursorX -= btnSize;
        plusClipX = cursorX - gap;
        cursorX -= gapSmall;
        cursorX -= strengthWidth;
        strengthClipX = cursorX - gap;
        cursorX -= gapSmall;
        cursorX -= btnSize;
        minusClipX = cursorX - gap;
        cursorX -= gap;
      }
    }
    if (showMoveArrows) {
      const leftMostMinus = showStrength && node?.properties?.showSeparateStrengths ? Math.min(minusX, minusClipX) : minusX;
      const arrowRightStart = showStrength ? leftMostMinus - gap : showRemove ? removeX - gap : rightEdge - gap;
      upX = arrowRightStart - arrowSize - 4;
      downX = upX - (arrowSize + 2);
      cursorX -= gap;
    }
    if (node?.properties?.enableTags && node?.properties?.showTagChip !== false) {
      const iconSize = 20;
      const iconY = posY + Math.floor((rowHeight - iconSize) / 2);
      ctx.fillStyle = this.value.enabled ? "#333" : "#2a2a2a";
      ctx.beginPath();
      ctx.roundRect(posX, iconY, iconSize, iconSize, 2);
      ctx.fill();
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "12px Arial";
      ctx.save();
      if (!this.value.enabled) {
        ctx.globalAlpha *= 0.55;
      }
      ctx.fillText("🏷", posX + iconSize / 2, posY + midY);
      ctx.restore();
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
      showStrength && node?.properties?.showSeparateStrengths ? minusClipX : null,
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
      this._triggerRect = { x: triggerLeft, y: pillY, w: trigWidth, h: pillH };
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
      try {
        const dotRadius = 7;
        const dotCx = triggerLeft + trigWidth - 10;
        const dotCy = posY + midY;
        let showDot = true;
        let color = "rgba(74, 158, 255, 0.85)";
        const has = hasTrigger;
        const auto = !!this.value.autoFetched;
        const attempted = !!this.value?.fetchAttempted;
        if (has && auto) {
          color = "rgba(40, 167, 69, 0.85)";
        } else if (has && !auto) {
          color = "rgba(74, 158, 255, 0.85)";
        } else if (!has && attempted) {
          color = "rgba(253, 126, 20, 0.9)";
        } else {
          color = "rgba(160, 160, 160, 0.7)";
        }
        if (showDot) {
          ctx.save();
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(dotCx, dotCy, dotRadius, 0, Math.PI * 2);
          ctx.fill();
          const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
          const spinActive = !!this._refreshSpinActive;
          const spinEnd = this._refreshSpinEnd || 0;
          const spinStart = this._refreshSpinStarted || 0;
          const isSpinning = spinActive && now < spinEnd;
          if (isSpinning) {
            try {
              if (!this._spinRafScheduled) {
                this._spinRafScheduled = true;
                (window.requestAnimationFrame || ((cb) => setTimeout(cb, 16)))(() => {
                  this._spinRafScheduled = false;
                  try {
                    node.setDirtyCanvas(true, false);
                  } catch {
                  }
                });
              }
            } catch {
            }
          }
          ctx.fillStyle = "#111";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (isSpinning) {
            const period = Math.max(500, this._refreshSpinPeriod || 800);
            const progress = (now - spinStart) % period / period;
            const angle = progress * Math.PI * 2;
            ctx.save();
            ctx.translate(dotCx, dotCy);
            ctx.rotate(angle);
            ctx.fillText("↻", 0, 0);
            ctx.restore();
          } else {
            ctx.fillText("↻", dotCx, dotCy);
          }
          ctx.restore();
          const size = dotRadius * 2 + 2;
          this.hitAreas.refresh.bounds = [dotCx - dotRadius, 0, size, fullHeight];
        }
      } catch {
      }
    } else {
      this.hitAreas.triggerWords.bounds = [0, 0, 0, 0];
    }
    if (showMoveArrows && node?.properties?.showMoveArrows !== false) {
      const arrowY = (rowHeight - arrowSize) / 2;
      let disableDown;
      let disableUp;
      if (node?.properties?.enableTags) {
        const groupWidgets = (node.customWidgets || []).filter((w2) => w2 instanceof SuperLoraWidget && w2.value?.tag === this.value.tag);
        const groupIndex = groupWidgets.indexOf(this);
        const groupLastIndex = groupWidgets.length - 1;
        disableDown = groupIndex === groupLastIndex;
        disableUp = groupIndex === 0;
      } else {
        disableDown = indexInLoras === lastIndex;
        disableUp = indexInLoras === 0;
      }
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
    if (node?.properties?.showStrengthControls !== false) {
      const strengthY = (rowHeight - 20) / 2;
      ctx.fillStyle = this.value.enabled ? "#3b2a4a" : "#2a2a2a";
      ctx.beginPath();
      ctx.roundRect(strengthX, posY + strengthY, strengthWidth, 20, 3);
      ctx.fill();
      ctx.strokeStyle = "#4a4a4a";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = this.value.enabled ? "#e5e5e5" : "#bdbdbd";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText(this.value.strength.toFixed(2), strengthX + strengthWidth / 2, posY + midY);
      this.hitAreas.strength.bounds = [strengthX, 0, strengthWidth, fullHeight];
    } else {
      this.hitAreas.strength.bounds = [0, 0, 0, 0];
    }
    if (node?.properties?.showStrengthControls !== false) {
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
    if (showStrength && node?.properties?.showSeparateStrengths) {
      ctx.fillStyle = "#666";
      ctx.beginPath();
      ctx.roundRect(minusClipX, posY + btnY, btnSize, btnSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText("-", minusClipX + btnSize / 2, posY + midY);
      this.hitAreas.strengthClipDown.bounds = [minusClipX, 0, btnSize, fullHeight];
      const strengthY2 = (rowHeight - 20) / 2;
      ctx.fillStyle = this.value.enabled ? "#4a3f1f" : "#2a2a2a";
      ctx.beginPath();
      ctx.roundRect(strengthClipX, posY + strengthY2, strengthWidth, 20, 3);
      ctx.fill();
      ctx.strokeStyle = "#4a4a4a";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = this.value.enabled ? "#e5e5e5" : "#bdbdbd";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText(this.value.strengthClip.toFixed(2), strengthClipX + strengthWidth / 2, posY + midY);
      this.hitAreas.strengthClip.bounds = [strengthClipX, 0, strengthWidth, fullHeight];
      ctx.fillStyle = "#666";
      ctx.beginPath();
      ctx.roundRect(plusClipX, posY + btnY, btnSize, btnSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "12px Arial";
      ctx.fillText("+", plusClipX + btnSize / 2, posY + midY);
      this.hitAreas.strengthClipUp.bounds = [plusClipX, 0, btnSize, fullHeight];
    } else {
      this.hitAreas.strengthClipDown.bounds = [0, 0, 0, 0];
      this.hitAreas.strengthClip.bounds = [0, 0, 0, 0];
      this.hitAreas.strengthClipUp.bounds = [0, 0, 0, 0];
    }
    ctx.restore();
    if (node?.properties?.showRemoveButton !== false) {
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
  isCollapsedByTag(node) {
    if (!node.customWidgets) return false;
    const tagWidget = node.customWidgets.find((w) => w instanceof SuperLoraTagWidget && w.tag === this.value.tag);
    return tagWidget?.isCollapsed?.() || false;
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
  setLora(lora, node) {
    this.value.lora = lora;
    this.value.triggerWords = "";
    this.value.autoFetched = false;
    this.value = { ...this.value, fetchAttempted: false };
    if (lora !== "None") {
      try {
        const manual = TriggerWordStore.get(lora);
        if (manual) {
          this.value.triggerWords = manual;
          this.value.autoFetched = false;
          return;
        }
      } catch {
      }
      if (node && node?.properties?.autoFetchTriggerWords !== false) {
        this.fetchTriggerWords();
      }
    }
  }
  async fetchTriggerWords() {
    try {
      this.value.fetchAttempted = true;
      try {
        const manual = TriggerWordStore.get(this.value.lora);
        if (manual) {
          this.value.triggerWords = manual;
          this.value.autoFetched = false;
          return;
        }
      } catch {
      }
      const words = await WidgetAPI.civitaiService.getTriggerWords(this.value.lora);
      if (words.length > 0) {
        this.value.triggerWords = words.join(", ");
        this.value.autoFetched = true;
        try {
          TriggerWordStore.set(this.value.lora, this.value.triggerWords);
        } catch {
        }
      } else {
        this.value = { ...this.value, fetchAttempted: true };
      }
    } catch (error) {
      console.warn("Failed to fetch trigger words:", error);
    }
  }
}
class SuperLoraHeaderWidget extends SuperLoraBaseWidget {
  constructor() {
    super("SuperLoraHeaderWidget");
    this.onToggleAllDown = (_event, _pos, node) => {
      const allState = this.getAllLorasState(node);
      if (!node.customWidgets) return true;
      const loraWidgets = node.customWidgets.filter((w) => w instanceof SuperLoraWidget);
      loraWidgets.forEach((w) => w.value.enabled = !allState);
      node.setDirtyCanvas(true, true);
      return true;
    };
    this.onAddLoraDown = (event, _pos, node) => {
      WidgetAPI.showLoraSelector(node, void 0, event);
      return true;
    };
    this.onSaveTemplateDown = (_event, _pos, node) => {
      WidgetAPI.showNameOverlay({
        title: "Save Template",
        placeholder: "Template name...",
        initial: "My LoRA Set",
        submitLabel: "Save",
        onCommit: async (templateName) => {
          const name = (templateName || "").trim();
          if (!name) {
            WidgetAPI.showToast("Please enter a template name", "warning");
            return;
          }
          const configs = WidgetAPI.getLoraConfigs(node);
          const validConfigs = configs.filter((config) => config.lora && config.lora !== "None");
          if (validConfigs.length === 0) {
            WidgetAPI.showToast("⚠️ No valid LoRAs to save in template", "warning");
            return;
          }
          try {
            const exists = await WidgetAPI.templateService.templateExists(name);
            if (exists) {
              WidgetAPI.showToast(`⚠️ Template "${name}" already exists. Choose a different name.`, "warning");
              return;
            }
            const success = await WidgetAPI.templateService.saveTemplate(name, validConfigs);
            WidgetAPI.showToast(success ? `✅ Template "${name}" saved successfully!` : "❌ Failed to save template. Please try again.", success ? "success" : "error");
          } catch (error) {
            console.error("Template save error:", error);
            WidgetAPI.showToast("❌ Error saving template. Check console for details.", "error");
          }
        }
      });
      return true;
    };
    this.onLoadTemplateDown = (event, _pos, node) => {
      WidgetAPI.showLoadTemplateDialog(node, event);
      return true;
    };
    this.onSettingsDown = (event, _pos, node) => {
      WidgetAPI.showSettingsDialog(node, event);
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
    const buttonHeight = 24;
    const buttonSpacing = 8;
    let posX = margin;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, posY, w, height);
    ctx.clip();
    const headerGradient = ctx.createLinearGradient(0, posY, 0, posY + height);
    headerGradient.addColorStop(0, "#2f2f2f");
    headerGradient.addColorStop(1, "#232323");
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, posY, w, height);
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, posY + 0.5);
    ctx.lineTo(w, posY + 0.5);
    ctx.moveTo(0, posY + height - 0.5);
    ctx.lineTo(w, posY + height - 0.5);
    ctx.stroke();
    const midY = posY + height / 2;
    ctx.font = "500 11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";
    const buttonStyles = {
      primary: {
        gradient: ["#4f81ff", "#2f60f0"],
        border: "#1f3fbf",
        text: "#f7f9ff",
        innerStroke: "rgba(255, 255, 255, 0.18)",
        shadow: { color: "rgba(56, 109, 255, 0.45)", blur: 10, offsetY: 1 },
        font: "600 11px 'Segoe UI', Arial, sans-serif",
        iconFont: "700 14px 'Segoe UI', Arial, sans-serif"
      },
      secondary: {
        gradient: ["#3a3a3a", "#2c2c2c"],
        border: "#4a4a4a",
        text: "#dedede",
        innerStroke: "rgba(255, 255, 255, 0.08)",
        font: "500 11px 'Segoe UI', Arial, sans-serif",
        iconFont: "600 13px 'Segoe UI', Arial, sans-serif"
      }
    };
    const modeWidths = {
      addLora: { full: 132, short: 92, icon: 44 },
      default: { full: 100, short: 64, icon: 36 }
    };
    const drawButton = (x, width, style, label, mode) => {
      const buttonY = posY + (height - buttonHeight) / 2;
      ctx.save();
      const gradient = ctx.createLinearGradient(x, buttonY, x, buttonY + buttonHeight);
      gradient.addColorStop(0, style.gradient[0]);
      gradient.addColorStop(1, style.gradient[1]);
      ctx.beginPath();
      if (style.shadow) {
        ctx.shadowColor = style.shadow.color;
        ctx.shadowBlur = style.shadow.blur;
        ctx.shadowOffsetY = style.shadow.offsetY ?? 0;
      }
      ctx.fillStyle = gradient;
      ctx.roundRect(x, buttonY, width, buttonHeight, 5);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = style.border;
      ctx.stroke();
      if (style.innerStroke) {
        ctx.beginPath();
        const inset = 0.6;
        ctx.roundRect(x + inset, buttonY + inset, width - inset * 2, buttonHeight - inset * 2, 4);
        ctx.strokeStyle = style.innerStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = style.text;
      ctx.textAlign = "center";
      const font = mode === "icon" ? style.iconFont ?? "600 13px 'Segoe UI', Arial, sans-serif" : style.font ?? "500 11px 'Segoe UI', Arial, sans-serif";
      ctx.font = font;
      const verticalOffset = mode === "icon" ? -0.5 : 0;
      ctx.fillText(label, x + width / 2, midY + verticalOffset);
      ctx.restore();
    };
    const availableWidth = w - margin * 2;
    const allEnabled = this.getAllLorasState(node);
    const toggleText = allEnabled ? "Disable All" : "Enable All";
    const toggleShort = allEnabled ? "Disable" : "Enable";
    const buttons = [
      { id: "addLora", text: "Add LoRA", shortText: "Add", icon: "➕", style: buttonStyles.primary, initialMode: "full", combineIcon: true },
      { id: "toggleAll", text: toggleText, shortText: toggleShort, icon: "⏯️", style: buttonStyles.secondary, initialMode: "full" },
      { id: "saveTemplate", text: "Save Set", shortText: "Save", icon: "💾", style: buttonStyles.secondary, initialMode: "full" },
      { id: "loadTemplate", text: "Load Set", shortText: "Load", icon: "📂", style: buttonStyles.secondary, initialMode: "full" },
      { id: "settings", text: "Settings", shortText: "Set", icon: "⚙️", style: buttonStyles.secondary, initialMode: "full" }
    ];
    const totalSpacing = buttonSpacing * (buttons.length - 1);
    const getModeWidth = (id, mode) => {
      const preset = modeWidths[id] || modeWidths.default;
      return preset[mode];
    };
    const computeTotalWidth = (modes2) => {
      return modes2.reduce((sum, mode, idx) => {
        const btn = buttons[idx];
        return sum + getModeWidth(btn.id, mode);
      }, 0);
    };
    const modes = buttons.map((btn) => btn.initialMode);
    const degradeSteps = [
      { indices: [1, 2, 3], from: "full", to: "short" },
      { indices: [4], from: "full", to: "short" },
      { indices: [0], from: "full", to: "short" },
      { indices: [1, 2, 3], from: "short", to: "icon" },
      { indices: [4], from: "short", to: "icon" },
      { indices: [0], from: "short", to: "icon" }
    ];
    let totalWidth = computeTotalWidth(modes);
    const availableForButtons = Math.max(60, availableWidth - totalSpacing);
    let stepIndex = 0;
    while (totalWidth > availableForButtons && stepIndex < degradeSteps.length) {
      const step = degradeSteps[stepIndex];
      let changed = false;
      for (const index of step.indices) {
        if (modes[index] === step.from) {
          modes[index] = step.to;
          changed = true;
        }
      }
      if (changed) {
        totalWidth = computeTotalWidth(modes);
      } else {
        stepIndex++;
      }
    }
    if (totalWidth > availableForButtons) {
      const scale = availableForButtons / totalWidth;
      const minWidths = buttons.map((btn) => getModeWidth(btn.id, "icon"));
      totalWidth = 0;
      const scaledWidths = buttons.map((btn, idx) => {
        const rawWidth = getModeWidth(btn.id, modes[idx]) * scale;
        const clamped = Math.max(minWidths[idx], rawWidth);
        totalWidth += clamped;
        return clamped;
      });
      const over = totalWidth - availableForButtons;
      if (over > 0.1) {
        let remainingOver = over;
        for (let i = scaledWidths.length - 1; i >= 0 && remainingOver > 0.1; i--) {
          const minWidth = minWidths[i];
          const reducible = scaledWidths[i] - minWidth;
          if (reducible > 0) {
            const delta = Math.min(reducible, remainingOver);
            scaledWidths[i] -= delta;
            remainingOver -= delta;
          }
        }
      }
      buttons.forEach((btn, idx) => {
        const btnWidth = scaledWidths[idx];
        const mode = modes[idx];
        let label;
        if (mode === "icon") {
          label = btn.icon;
        } else if (mode === "short") {
          label = btn.combineIcon && btn.icon ? `${btn.icon} ${btn.shortText}` : btn.shortText;
        } else {
          label = btn.combineIcon && btn.icon ? `${btn.icon} ${btn.text}` : btn.text;
        }
        drawButton(posX, btnWidth, btn.style, label, mode);
        this.hitAreas[btn.id].bounds = [posX, 0, btnWidth, height];
        posX += btnWidth + buttonSpacing;
      });
    } else {
      buttons.forEach((btn, idx) => {
        const mode = modes[idx];
        const btnWidth = getModeWidth(btn.id, mode);
        let label;
        if (mode === "icon") {
          label = btn.icon;
        } else if (mode === "short") {
          label = btn.combineIcon && btn.icon ? `${btn.icon} ${btn.shortText}` : btn.shortText;
        } else {
          label = btn.combineIcon && btn.icon ? `${btn.icon} ${btn.text}` : btn.text;
        }
        drawButton(posX, btnWidth, btn.style, label, mode);
        this.hitAreas[btn.id].bounds = [posX, 0, btnWidth, height];
        posX += btnWidth + buttonSpacing;
      });
    }
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
const app = window.app;
const LiteGraph = window.LiteGraph;
const _SuperLoraNode = class _SuperLoraNode {
  static async initialize() {
    if (this.initialized) {
      return;
    }
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = (async () => {
      this.loraService = LoraService.getInstance();
      this.templateService = TemplateService.getInstance();
      this.civitaiService = CivitAiService.getInstance();
      setWidgetAPI({
        showLoraSelector: (node, widget, e) => _SuperLoraNode.showLoraSelector(node, widget, e),
        showTagSelector: (node, widget) => _SuperLoraNode.showTagSelector(node, widget),
        showSettingsDialog: (node, e) => _SuperLoraNode.showSettingsDialog(node, e),
        showLoadTemplateDialog: (node, e) => _SuperLoraNode.showLoadTemplateDialog(node, e),
        showNameOverlay: (opts) => _SuperLoraNode.showNameOverlay(opts),
        showInlineText: (e, initial, onCommit, place) => _SuperLoraNode.showInlineText(e, initial, onCommit, place),
        showToast: (m, t) => _SuperLoraNode.showToast(m, t),
        calculateNodeSize: (node) => _SuperLoraNode.calculateNodeSize(node),
        organizeByTags: (node) => _SuperLoraNode.organizeByTags(node),
        addLoraWidget: (node, config) => _SuperLoraNode.addLoraWidget(node, config),
        removeLoraWidget: (node, widget) => _SuperLoraNode.removeLoraWidget(node, widget),
        getLoraConfigs: (node) => _SuperLoraNode.getLoraConfigs(node),
        templateService: _SuperLoraNode.templateService,
        civitaiService: _SuperLoraNode.civitaiService,
        syncExecutionWidgets: (node) => _SuperLoraNode.syncExecutionWidgets(node)
      });
      await Promise.all([
        this.loraService.initialize(),
        this.templateService.initialize()
      ]);
      this.initialized = true;
    })();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }
  static isNodeBypassed(node) {
    if (!node) {
      return false;
    }
    const flags = node.flags || {};
    if (flags.bypass || flags.bypassed || flags.skip_processing || flags.skipProcessing) {
      return true;
    }
    if (node.properties && (node.properties.bypass === true || node.properties.skip === true)) {
      return true;
    }
    try {
      if (typeof LiteGraph !== "undefined" && LiteGraph && typeof LiteGraph.NEVER === "number") {
        if (node.mode === LiteGraph.NEVER) {
          return true;
        }
      }
    } catch {
    }
    return false;
  }
  /**
   * Set up the node type with custom widgets
   */
  static setup(nodeType, _nodeData) {
    const originalNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function() {
      if (originalNodeCreated) {
        originalNodeCreated.apply(this, arguments);
      }
      _SuperLoraNode.setupAdvancedNode(this);
      try {
        this.widgets = (this.widgets || []).filter((w) => {
          const nm = w?.name || "";
          return !(nm === "lora_bundle" || nm.startsWith("lora_"));
        });
      } catch {
      }
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
    const originalOnResize = nodeType.prototype.onResize;
    nodeType.prototype.onResize = function(size, ...rest) {
      const minHeight = _SuperLoraNode.computeContentHeight(this);
      if (Array.isArray(size)) {
        size[1] = Math.max(size[1], minHeight);
      } else if (size && typeof size === "object") {
        if (typeof size[1] === "number") {
          size[1] = Math.max(size[1], minHeight);
        }
        if (typeof size.y === "number") {
          size.y = Math.max(size.y, minHeight);
        }
      }
      if (this.size) {
        this.size[1] = Math.max(this.size[1], minHeight);
      }
      if (originalOnResize) {
        return originalOnResize.apply(this, [size, ...rest]);
      }
      return void 0;
    };
    const originalSerialize = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function() {
      const data = originalSerialize.apply(this, arguments);
      try {
        const freshBundle = _SuperLoraNode.buildBundle(this);
        let bridge = (this.widgets || []).find((w) => w?.name === "lora_bundle");
        if (!bridge) {
          bridge = this.addWidget("text", "lora_bundle", freshBundle, () => {
          }, {});
        }
        bridge.type = "text";
        bridge.hidden = true;
        bridge.draw = () => {
        };
        bridge.computeSize = () => [0, 0];
        bridge.value = freshBundle;
        bridge.serializeValue = () => freshBundle;
        data.inputs = data.inputs || {};
        data.inputs.lora_bundle = freshBundle;
      } catch {
      }
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
      try {
        this.widgets = (this.widgets || []).filter((w) => {
          const nm = w?.name || "";
          return !(nm.startsWith("lora_") && nm !== "lora_bundle");
        });
      } catch {
      }
      _SuperLoraNode.syncExecutionWidgets(this);
    };
    const originalGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function(_canvas, optionsArr) {
      try {
        let options = Array.isArray(optionsArr) ? optionsArr : [];
        if (originalGetExtraMenuOptions) {
          const maybe = originalGetExtraMenuOptions.call(this, _canvas, options);
          if (Array.isArray(maybe)) options = maybe;
        }
        const hasAddLoRA = options.some((opt) => opt && opt.content === "🏷️ Add LoRA");
        const hasSettings = options.some((opt) => opt && opt.content === "⚙️ Settings");
        if (!hasAddLoRA || !hasSettings) {
          if (options.length === 0 || options[options.length - 1] !== null) {
            options.push(null);
          }
          if (!hasAddLoRA) {
            options.push({ content: "🏷️ Add LoRA", callback: (_event) => _SuperLoraNode.showLoraSelector(this, void 0, void 0) });
          }
          if (!hasSettings) {
            options.push({ content: "⚙️ Settings", callback: (_event) => _SuperLoraNode.showSettingsDialog(this) });
          }
        }
        return options;
      } catch {
        const safe = optionsArr && Array.isArray(optionsArr) ? optionsArr : [];
        const ensureSeparator = () => {
          if (safe.length === 0 || safe[safe.length - 1] !== null) {
            safe.push(null);
          }
        };
        if (!safe.some((opt) => opt && opt.content === "🏷️ Add LoRA")) {
          ensureSeparator();
          safe.push({ content: "🏷️ Add LoRA", callback: (_event) => _SuperLoraNode.showLoraSelector(this, void 0, void 0) });
        }
        if (!safe.some((opt) => opt && opt.content === "⚙️ Settings")) {
          ensureSeparator();
          safe.push({ content: "⚙️ Settings", callback: (_event) => _SuperLoraNode.showSettingsDialog(this) });
        }
        return safe;
      }
    };
  }
  /**
   * Initialize advanced node with custom widgets
   */
  static setupAdvancedNode(node) {
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
    const contentHeight = this.computeContentHeight(node);
    node.size = [node.size[0], Math.max(node.size[1], contentHeight)];
    console.log("Super LoRA Loader: Advanced node setup complete");
  }
  static computeContentHeight(node) {
    const marginDefault = _SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET;
    if (!node?.customWidgets) {
      return Math.max(currentY, 100);
    }
    const renderable = [];
    for (const widget of node.customWidgets) {
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (isCollapsed) continue;
      const size = widget.computeSize();
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      if (height === 0) continue;
      renderable.push(widget);
    }
    renderable.forEach((widget, index) => {
      const size = widget.computeSize();
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      let marginAfter = widget instanceof SuperLoraTagWidget && widget.isCollapsed() ? 0 : marginDefault;
      const isLast = index === renderable.length - 1;
      if (isLast && widget instanceof SuperLoraTagWidget && widget.isCollapsed()) {
        marginAfter = Math.max(marginDefault, 8);
      }
      currentY += height + marginAfter;
    });
    return Math.max(currentY, 100);
  }
  /**
   * Calculate required node size based on widgets
   */
  static calculateNodeSize(node) {
    const newHeight = this.computeContentHeight(node);
    if (node.size[1] !== newHeight) {
      node.size[1] = newHeight;
    }
  }
  /**
   * Custom drawing for all widgets
   */
  static drawCustomWidgets(node, ctx) {
    if (!node.customWidgets) return;
    const isBypassed = _SuperLoraNode.isNodeBypassed(node);
    const marginDefault = _SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET;
    if (!isBypassed) {
      const renderable = [];
      for (const widget of node.customWidgets) {
        const size = widget.computeSize();
        const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
        const height = widget instanceof SuperLoraWidget ? 34 : size[1];
        if (height === 0 || isCollapsed) continue;
        renderable.push(widget);
      }
      renderable.forEach((widget, index) => {
        const size = widget.computeSize();
        const height = widget instanceof SuperLoraWidget ? 34 : size[1];
        widget.draw(ctx, node, node.size[0], currentY, height);
        let marginAfter = widget instanceof SuperLoraTagWidget && widget.isCollapsed() ? 0 : marginDefault;
        const isLast = index === renderable.length - 1;
        if (isLast && widget instanceof SuperLoraTagWidget && widget.isCollapsed()) {
          marginAfter = Math.max(marginDefault, 8);
        }
        currentY += height + marginAfter;
      });
    }
    if (isBypassed) {
      try {
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(142, 88, 255, 0.42)";
        const radius = 6;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(4, 4, Math.max(0, node.size[0] - 8), Math.max(0, node.size[1] - 8), radius);
          ctx.fill();
        } else {
          ctx.fillRect(4, 4, Math.max(0, node.size[0] - 8), Math.max(0, node.size[1] - 8));
        }
        ctx.restore();
      } catch {
      }
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
    if (!node.customWidgets) return false;
    if (_SuperLoraNode.isNodeBypassed(node)) {
      return true;
    }
    try {
      const rect = app?.canvas?.canvas?.getBoundingClientRect?.();
      const ds = app?.canvas?.ds;
      let sx = event && (event.clientX ?? event.pageX) || null;
      let sy = event && (event.clientY ?? event.pageY) || null;
      if ((sx == null || sy == null) && rect && ds) {
        sx = rect.left + (pos[0] + (ds.offset?.[0] || 0)) * (ds.scale || 1);
        sy = rect.top + (pos[1] + (ds.offset?.[1] || 0)) * (ds.scale || 1);
      }
      if (sx != null && sy != null) {
        _SuperLoraNode._lastPointerScreen = { x: sx, y: sy };
      }
    } catch {
    }
    const marginDefault = _SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET;
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
        const localPos = [pos[0], pos[1] - widgetStartY];
        if (widget[handler]) {
          if (widget[handler](event, localPos, node)) {
            return true;
          }
        }
      }
      const marginAfter = widget instanceof SuperLoraTagWidget && widget.isCollapsed() ? 0 : marginDefault;
      currentY += height + marginAfter;
    }
    return false;
  }
  /**
   * Compute the top Y offset (in node-local coordinates) for a given widget
   */
  static computeWidgetTop(node, targetWidget) {
    if (!node?.customWidgets) return this.NODE_WIDGET_TOP_OFFSET;
    const marginDefault = _SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET;
    for (const widget of node.customWidgets) {
      const size = widget.computeSize?.() || [0, 0];
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag?.(node);
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      if (height === 0 || isCollapsed) {
        continue;
      }
      if (widget === targetWidget) {
        return currentY;
      }
      const marginAfter = widget instanceof SuperLoraTagWidget && widget.isCollapsed?.() ? 0 : marginDefault;
      currentY += height + marginAfter;
    }
    return currentY;
  }
  /**
   * Show LoRA selector dialog with enhanced search functionality
   */
  static async showLoraSelector(node, widget, _event) {
    try {
      const availableLoras = await _SuperLoraNode.loraService.getAvailableLoras();
      const usedLoras = this.getUsedLoras(node);
      const items = availableLoras.map((name) => ({
        id: name,
        label: name.replace(/\.(safetensors|ckpt|pt)$/i, ""),
        disabled: usedLoras.has(name)
      }));
      OverlayService.getInstance().showSearchOverlay({
        title: "Add LoRA",
        placeholder: "Search LoRAs...",
        items,
        onChoose: (id) => {
          if (this.isDuplicateLora(node, id)) {
            this.showToast("⚠️ Already added to the list", "warning");
            return;
          }
          if (widget) {
            widget.setLora(id, node);
            this.showToast("✅ LoRA updated", "success");
          } else {
            this.addLoraWidget(node, { lora: id });
            this.showToast("✅ LoRA added", "success");
          }
          node.setDirtyCanvas(true, true);
        },
        enableMultiToggle: true,
        onChooseMany: (ids) => {
          const added = [];
          const skipped = [];
          ids.forEach((id) => {
            if (this.isDuplicateLora(node, id)) {
              skipped.push(id);
              return;
            }
            if (widget) {
              if (added.length === 0) {
                widget.setLora(id, node);
                added.push(id);
                return;
              }
            }
            this.addLoraWidget(node, { lora: id });
            added.push(id);
          });
          if (added.length) this.showToast(`✅ Added ${added.length} LoRA${added.length > 1 ? "s" : ""}`, "success");
          if (skipped.length) this.showToast(`⚠️ Skipped ${skipped.length} duplicate${skipped.length > 1 ? "s" : ""}`, "warning");
          node.setDirtyCanvas(true, true);
        },
        // Provide folder chips explicitly (top-level folders)
        folderChips: Array.from(new Set(
          availableLoras.map((p) => p.split(/[\\/]/)[0]).filter(Boolean)
        )).sort(),
        // Fix the root chip label for LoRAs
        baseFolderName: "loras"
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
    const svc = TagSetService.getInstance();
    const existingTags = this.getExistingTags(node);
    const fromStore = svc.getAll();
    const allTags = Array.from(/* @__PURE__ */ new Set([
      ...fromStore,
      ...existingTags
    ]));
    const items = allTags.map((tag) => ({ id: tag, label: tag }));
    OverlayService.getInstance().showSearchOverlay({
      title: "Select Tag",
      placeholder: "Search or create tag...",
      items,
      allowCreate: true,
      onChoose: (tag) => {
        try {
          svc.addTag(tag);
        } catch {
        }
        widget.value.tag = tag;
        this.organizeByTags(node);
        this.calculateNodeSize(node);
        node.setDirtyCanvas(true, false);
      },
      rightActions: [
        {
          icon: "✏️",
          title: "Rename tag",
          onClick: (name) => {
            this.showNameOverlay({
              title: "Rename Tag",
              placeholder: "New tag name...",
              initial: name,
              submitLabel: "Rename",
              onCommit: (newName) => {
                const ok = svc.renameTag(name, newName);
                this.showToast(ok ? "✅ Tag renamed" : "❌ Failed to rename tag", ok ? "success" : "error");
                this.showTagSelector(node, widget);
              }
            });
          }
        },
        {
          icon: "🗑",
          title: "Delete tag",
          onClick: (name) => {
            const okConfirm = confirm(`Delete tag "${name}"?`);
            if (!okConfirm) return;
            const ok = svc.deleteTag(name);
            this.showToast(ok ? "✅ Tag deleted" : "❌ Failed to delete tag", ok ? "success" : "error");
            this.showTagSelector(node, widget);
          }
        }
      ]
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
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showSeparateStrengths ? "✅" : "❌"} Separate Model/CLIP Strengths`,
        callback: () => {
          const enabling = !node.properties.showSeparateStrengths;
          node.properties.showSeparateStrengths = enabling;
          try {
            const widgets = (node.customWidgets || []).filter((w) => w instanceof SuperLoraWidget);
            if (enabling) {
              widgets.forEach((w) => {
                const m = parseFloat(w.value?.strength ?? 0) || 0;
                w.value.strengthClip = typeof w.value?.strengthClip === "number" ? w.value.strengthClip : m;
              });
            } else {
              widgets.forEach((w) => {
                const m = parseFloat(w.value?.strength ?? 0) || 0;
                w.value.strength = m;
                w.value.strengthClip = m;
              });
            }
          } catch {
          }
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.autoFetchTriggerWords ? "✅" : "❌"} Auto-fetch Trigger Words`,
        callback: () => {
          node.properties.autoFetchTriggerWords = !node.properties.autoFetchTriggerWords;
          this.syncExecutionWidgets(node);
        }
      }
    ];
    const showItems = [
      {
        content: `${node.properties.showTriggerWords ? "✅" : "❌"} Show Trigger Words`,
        callback: () => {
          node.properties.showTriggerWords = !node.properties.showTriggerWords;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showTagChip !== false ? "✅" : "❌"} Show Tag Chip`,
        callback: () => {
          node.properties.showTagChip = node.properties.showTagChip === false ? true : false;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showMoveArrows !== false ? "✅" : "❌"} Show Move Arrows`,
        callback: () => {
          node.properties.showMoveArrows = node.properties.showMoveArrows === false ? true : false;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showRemoveButton !== false ? "✅" : "❌"} Show Remove Button`,
        callback: () => {
          node.properties.showRemoveButton = node.properties.showRemoveButton === false ? true : false;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showStrengthControls !== false ? "✅" : "❌"} Show Strength Controls`,
        callback: () => {
          node.properties.showStrengthControls = node.properties.showStrengthControls === false ? true : false;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
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
    const widget = new SuperLoraWidget(`lora_${Date.now()}`);
    if (config) {
      const { lora: cfgLora, ...rest } = config;
      if (Object.keys(rest).length) {
        Object.assign(widget.value, rest);
      }
      if (cfgLora && cfgLora !== "None") {
        widget.setLora(cfgLora, node);
      }
    }
    if (node?.properties?.enableTags) {
      widget.value.tag = widget.value.tag || "General";
    }
    node.customWidgets = node.customWidgets || [];
    node.customWidgets.push(widget);
    if (node?.properties?.enableTags) {
      this.organizeByTags(node);
    }
    this.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    this.syncExecutionWidgets(node);
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
      this.syncExecutionWidgets(node);
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
    this.syncExecutionWidgets(node);
  }
  /**
   * (THE BRIDGE) Syncs data from custom lora widgets to invisible execution widgets.
   */
  static syncExecutionWidgets(node) {
    node.setDirtyCanvas(true, true);
  }
  // Build the JSON bundle the backend expects from current custom widgets
  static buildBundle(node) {
    const loraWidgets = node.customWidgets?.filter((w) => w instanceof SuperLoraWidget) || [];
    const bundle = loraWidgets.filter((w) => w?.value?.lora && w.value.lora !== "None").map((w) => ({
      lora: w.value.lora,
      enabled: w.value.enabled,
      strength: w.value.strength,
      strengthClip: w.value.strengthClip,
      triggerWords: w.value.triggerWords,
      tag: w.value.tag,
      autoFetched: w.value.autoFetched
    }));
    try {
      return JSON.stringify(bundle);
    } catch {
      return "[]";
    }
  }
  /**
   * Serialize custom widgets for saving
   */
  static serializeCustomWidgets(node) {
    if (!node.customWidgets) return null;
    const cloneProperties = JSON.parse(JSON.stringify(node.properties || {}));
    return {
      properties: cloneProperties,
      widgets: node.customWidgets.map((widget) => ({
        name: widget.name,
        type: widget.constructor.name,
        value: JSON.parse(JSON.stringify(widget.value))
      }))
    };
  }
  /**
   * Deserialize custom widgets when loading
   */
  static deserializeCustomWidgets(node, data) {
    if (!data) return;
    try {
      node.properties = node.properties || {};
      if (data.properties) {
        Object.assign(node.properties, JSON.parse(JSON.stringify(data.properties)));
      }
      const restoredWidgets = [];
      if (Array.isArray(data.widgets)) {
        for (const widgetData of data.widgets) {
          let widget;
          switch (widgetData.type) {
            case "SuperLoraHeaderWidget":
              widget = new SuperLoraHeaderWidget();
              break;
            case "SuperLoraTagWidget":
              widget = new SuperLoraTagWidget(widgetData.value?.tag);
              break;
            case "SuperLoraWidget":
              widget = new SuperLoraWidget(widgetData.name);
              break;
            default:
              continue;
          }
          widget.value = { ...widget.value, ...JSON.parse(JSON.stringify(widgetData.value || {})) };
          restoredWidgets.push(widget);
        }
      }
      node.customWidgets = restoredWidgets.length ? restoredWidgets : [new SuperLoraHeaderWidget()];
    } catch (error) {
      console.warn("SuperLoRA: Failed to restore custom widgets, resetting defaults", error);
      node.customWidgets = [new SuperLoraHeaderWidget()];
    }
    node.setDirtyCanvas(true, true);
  }
  /**
   * Get execution data for backend
   */
  static getExecutionData(node) {
    const loraWidgets = node.customWidgets?.filter((w) => w instanceof SuperLoraWidget) || [];
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
    OverlayService.getInstance().showToast(message, type);
  }
  // Inline editors for better UX
  static showInlineNumber(event, initial, onCommit) {
    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.05";
    input.value = String(initial ?? 0);
    let leftPx, topPx;
    try {
      if (event && typeof event.clientX === "number" && typeof event.clientY === "number") {
        leftPx = event.clientX + 8;
        topPx = event.clientY - 10;
        console.log(`[showInlineNumber] Using event coordinates: ${leftPx}, ${topPx}`);
      } else {
        const lastPointer = _SuperLoraNode._lastPointerScreen;
        leftPx = (lastPointer?.x ?? 100) + 8;
        topPx = (lastPointer?.y ?? 100) - 10;
        console.log(`[showInlineNumber] Using fallback coordinates: ${leftPx}, ${topPx}`);
      }
    } catch (error) {
      console.warn("[showInlineNumber] Coordinate calculation failed, using fallback:", error);
      const lastPointer = _SuperLoraNode._lastPointerScreen;
      leftPx = (lastPointer?.x ?? 100) + 8;
      topPx = (lastPointer?.y ?? 100) - 10;
    }
    input.style.cssText = `
      position: fixed;
      left: ${leftPx}px;
      top: ${topPx}px;
      width: 80px;
      padding: 4px 6px;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: auto;
      border: 1px solid #444;
      border-radius: 3px;
      background: #2f2f2f;
      color: #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.2) inset;
    `;
    let removedNum = false;
    const cleanup = () => {
      if (removedNum) return;
      removedNum = true;
      try {
        input.remove();
      } catch {
      }
    };
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
  static showInlineText(event, initial, onCommit, place) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = initial ?? "";
    let leftPx, topPx, widthPx, heightPx;
    try {
      if (event && typeof event.clientX === "number" && typeof event.clientY === "number") {
        leftPx = event.clientX + 8;
        topPx = event.clientY - 10;
        widthPx = 260;
        heightPx = 20;
        console.log(`[showInlineText] Using event coordinates: ${leftPx}, ${topPx}`);
      } else if (place?.rect && place?.node) {
        const rect = place.rect;
        const node = place.node;
        const canvasEl = app?.canvas?.canvas;
        const cRect = canvasEl?.getBoundingClientRect?.();
        const ds = app?.canvas?.ds;
        const scale = ds?.scale || 1;
        const offset = ds?.offset || [0, 0];
        if (cRect) {
          const nodePos = node.pos || [0, 0];
          const worldX = nodePos[0] + rect.x;
          const worldY = nodePos[1] + rect.y;
          leftPx = cRect.left + (worldX + offset[0]) * scale;
          topPx = cRect.top + (worldY + offset[1]) * scale;
          widthPx = Math.max(100, rect.w * scale);
          heightPx = Math.max(16, rect.h * scale);
          console.log(`[showInlineText] Using place rect: ${leftPx}, ${topPx}, rect:`, rect);
        } else {
          throw new Error("Canvas rect not available");
        }
      } else {
        const lastPointer = _SuperLoraNode._lastPointerScreen;
        leftPx = (lastPointer?.x ?? 100) + 8;
        topPx = (lastPointer?.y ?? 100) - 10;
        widthPx = 260;
        heightPx = 20;
        console.log(`[showInlineText] Using fallback coordinates: ${leftPx}, ${topPx}`);
      }
    } catch (error) {
      console.warn("[showInlineText] Coordinate calculation failed, using fallback:", error);
      const lastPointer = _SuperLoraNode._lastPointerScreen;
      leftPx = (lastPointer?.x ?? 100) + 8;
      topPx = (lastPointer?.y ?? 100) - 10;
      widthPx = 260;
      heightPx = 20;
    }
    input.style.cssText = `
      position: fixed;
      left: ${leftPx}px;
      top: ${topPx}px;
      width: ${widthPx}px;
      height: ${heightPx}px;
      padding: 2px 6px;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: auto;
      border: 1px solid #444;
      border-radius: 3px;
      background: #2f2f2f;
      color: #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.2) inset;
    `;
    let removedTxt = false;
    const cleanup = () => {
      if (removedTxt) return;
      removedTxt = true;
      try {
        input.remove();
      } catch {
      }
    };
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
    OverlayService.getInstance().showSearchOverlay(opts);
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
_SuperLoraNode.NODE_WIDGET_TOP_OFFSET = 68;
_SuperLoraNode.MARGIN_SMALL = 2;
_SuperLoraNode.loraService = LoraService.getInstance();
_SuperLoraNode.templateService = TemplateService.getInstance();
_SuperLoraNode.initialized = false;
_SuperLoraNode.initializationPromise = null;
let SuperLoraNode = _SuperLoraNode;
const _FilePickerService = class _FilePickerService {
  constructor() {
    this.fileCache = /* @__PURE__ */ new Map();
    this.cacheTimestamps = /* @__PURE__ */ new Map();
  }
  static getInstance() {
    if (!_FilePickerService.instance) {
      _FilePickerService.instance = new _FilePickerService();
    }
    return _FilePickerService.instance;
  }
  static getSupportedFileTypes() {
    return this.FILE_TYPES;
  }
  /**
   * Get files for a specific file type
   */
  async getFilesForType(fileType) {
    const config = _FilePickerService.FILE_TYPES[fileType];
    if (!config) {
      throw new Error(`Unknown file type: ${fileType}`);
    }
    const cacheKey = `files_${fileType}`;
    const cached = this.getCachedFiles(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      const params = new URLSearchParams();
      params.set("folder_name", config.folderName);
      params.set("extensions", config.fileExtensions.join(","));
      let response = await fetch(`/super_lora/files?${params.toString()}`, { method: "GET" });
      if (!response.ok) {
        response = await fetch(`/superlora/files?${params.toString()}`, { method: "GET" });
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }
      const data = await response.json();
      const files = data.files?.map((file) => {
        const relativePath = file.relative_path || file.path;
        return {
          id: relativePath,
          label: file.name.replace(/\.(ckpt|pt|pt2|bin|pth|safetensors|pkl|sft|gguf)$/i, ""),
          path: relativePath,
          fullPath: file.path,
          filename: file.name,
          extension: file.extension || "",
          size: file.size,
          modified: file.modified
        };
      }) || [];
      this.setCachedFiles(cacheKey, files);
      return files;
    } catch (error) {
      console.error(`Error fetching ${fileType} files:`, error);
      return [];
    }
  }
  /**
   * Show enhanced file picker overlay
   */
  showFilePicker(fileType, onSelect, options = {}) {
    const config = _FilePickerService.FILE_TYPES[fileType];
    if (!config) {
      throw new Error(`Unknown file type: ${fileType}`);
    }
    const {
      title = `Select ${config.displayName}`,
      multiSelect = false,
      onMultiSelect,
      currentValue
    } = options;
    this.getFilesForType(fileType).then((files) => {
      const items = files.map((file) => ({
        id: file.id,
        label: file.label,
        disabled: currentValue === file.id
      }));
      const overlay = OverlayService.getInstance();
      const topFolders = Array.from(new Set(
        files.map((file) => {
          const rel = file.path || "";
          const parts = rel.split(/[\\/]/);
          return parts.length > 1 ? parts[0] : "__ROOT__";
        })
      ));
      overlay.showSearchOverlay({
        title,
        placeholder: config.placeholder || `Search ${config.displayName.toLowerCase()}...`,
        items,
        allowCreate: false,
        enableMultiToggle: multiSelect,
        onChoose: (id) => {
          const file = files.find((f) => f.id === id);
          if (file) {
            onSelect(file);
          }
        },
        onChooseMany: onMultiSelect ? (ids) => {
          const selectedFiles = ids.map((id) => files.find((f) => f.id === id)).filter(Boolean);
          if (onMultiSelect && selectedFiles.length > 0) {
            onMultiSelect(selectedFiles);
          }
        } : void 0,
        folderChips: topFolders,
        baseFolderName: config.folderName,
        currentValue,
        rightActions: []
      });
    }).catch((error) => {
      console.error("Failed to load file picker:", error);
      OverlayService.getInstance().showToast(`Failed to load ${config.displayName.toLowerCase()}`, "error");
    });
  }
  /**
   * Cache management
   */
  getCachedFiles(key) {
    const cacheTime = this.cacheTimestamps.get(key);
    if (!cacheTime) return null;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1e3;
    if (cacheTime < fiveMinutesAgo) {
      this.fileCache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }
    return this.fileCache.get(key) || null;
  }
  setCachedFiles(key, files) {
    this.fileCache.set(key, files);
    this.cacheTimestamps.set(key, Date.now());
  }
  /**
   * Clear all caches
   */
  clearCache() {
    this.fileCache.clear();
    this.cacheTimestamps.clear();
  }
  /**
   * Refresh cache for specific file type
   */
  async refreshFileType(fileType) {
    const cacheKey = `files_${fileType}`;
    this.fileCache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
    await this.getFilesForType(fileType);
  }
};
_FilePickerService.FILE_TYPES = {
  models: {
    folderName: "checkpoints",
    displayName: "Models",
    fileExtensions: [".ckpt", ".pt", ".pt2", ".bin", ".pth", ".safetensors", ".pkl", ".sft"],
    icon: "🏗️",
    placeholder: "Search models..."
  },
  vae: {
    folderName: "vae",
    displayName: "VAEs",
    fileExtensions: [".ckpt", ".pt", ".pt2", ".bin", ".pth", ".safetensors", ".pkl", ".sft"],
    icon: "🎨",
    placeholder: "Search VAEs..."
  },
  loras: {
    folderName: "loras",
    displayName: "LoRAs",
    fileExtensions: [".ckpt", ".pt", ".pt2", ".bin", ".pth", ".safetensors", ".pkl", ".sft"],
    icon: "🏷️",
    placeholder: "Search LoRAs..."
  },
  text_encoders: {
    folderName: "text_encoders",
    displayName: "Text Encoders",
    fileExtensions: [".ckpt", ".pt", ".pt2", ".bin", ".pth", ".safetensors", ".pkl", ".sft"],
    icon: "📝",
    placeholder: "Search text encoders..."
  },
  diffusion_models: {
    folderName: "diffusion_models",
    displayName: "Diffusion Models",
    fileExtensions: [".ckpt", ".pt", ".pt2", ".bin", ".pth", ".safetensors", ".pkl", ".sft"],
    icon: "🧠",
    placeholder: "Search diffusion models..."
  },
  gguf_unet_models: {
    folderName: "unet",
    displayName: "UNET GGUF Models",
    fileExtensions: [".gguf"],
    icon: "🧠",
    placeholder: "Search GGUF UNET models..."
  },
  controlnet: {
    folderName: "controlnet",
    displayName: "ControlNets",
    fileExtensions: [".ckpt", ".pt", ".pt2", ".bin", ".pth", ".safetensors", ".pkl", ".sft"],
    icon: "🎛️",
    placeholder: "Search ControlNets..."
  },
  upscale_models: {
    folderName: "upscale_models",
    displayName: "Upscale Models",
    fileExtensions: [".ckpt", ".pt", ".pt2", ".bin", ".pth", ".safetensors", ".pkl", ".sft"],
    icon: "🔍",
    placeholder: "Search upscale models..."
  }
};
let FilePickerService = _FilePickerService;
const GGUF_CLIP_WIDGET_MAP = {
  DualCLIPLoaderGGUF: ["clip_name1", "clip_name2"],
  TripleCLIPLoaderGGUF: ["clip_name1", "clip_name2", "clip_name3"],
  QuadrupleCLIPLoaderGGUF: ["clip_name1", "clip_name2", "clip_name3", "clip_name4"]
};
const _NodeEnhancerExtension = class _NodeEnhancerExtension {
  static debugLog(...args) {
    if (this.DEBUG) {
      console.debug("[NodeEnhancer]", ...args);
    }
  }
  static normalizeValueForWidget(widget, value) {
    if (!widget || typeof value !== "string") {
      return value;
    }
    const sample = (() => {
      const opts = widget.options?.values;
      if (Array.isArray(opts)) {
        return opts.find((entry) => typeof entry === "string");
      }
      if (opts && typeof opts === "object") {
        return Object.keys(opts).find((key) => typeof key === "string");
      }
      return void 0;
    })();
    if (typeof sample === "string") {
      const prefersBackslash = sample.includes("\\") && !sample.includes("/");
      const prefersSlash = sample.includes("/") && !sample.includes("\\");
      if (prefersBackslash) {
        return value.replace(/\//g, "\\");
      }
      if (prefersSlash) {
        return value.replace(/\\/g, "/");
      }
    }
    return value;
  }
  static isGloballyEnabled() {
    try {
      return app$1?.ui?.settings?.getSettingValue?.("nodeEnhancer.enableContextToggle", true) !== false;
    } catch {
      return true;
    }
  }
  static createOverlayWidget(node, targetWidget, config) {
    const overlayWidget = {
      name: `${config.widgetName}__ndOverlay`,
      type: "ndPowerOverlay",
      value: targetWidget.value ?? "",
      _ndDisplayValue: targetWidget.value ?? "",
      _ndWidgetLabel: targetWidget.label || targetWidget.name || config.widgetName,
      _ndPlaceholder: _NodeEnhancerExtension.buildPlaceholder(config, targetWidget),
      __ndOverlay: true,
      __ndTargetWidgetName: config.widgetName,
      serialize: false,
      parent: node,
      computeSize(width) {
        const H = window.LiteGraph?.NODE_WIDGET_HEIGHT || 20;
        return [width, H];
      },
      draw(ctx, nodeRef, widgetWidth, widgetY) {
        const H = window.LiteGraph?.NODE_WIDGET_HEIGHT || 20;
        const margin = 6;
        const gutter = 10;
        const inset = 8;
        const x = margin + gutter;
        const y = widgetY;
        const availableWidth = Math.max(60, widgetWidth - margin * 2 - gutter * 2);
        const w = Math.max(120, Math.min(availableWidth, (nodeRef?.size?.[0] || widgetWidth) - 24));
        const caretX = x + w - inset - 12;
        const iconX = caretX + 10;
        const valueEnd = caretX - 10;
        const labelText = this._ndWidgetLabel || config.widgetName;
        const rawValue = this._ndDisplayValue && String(this._ndDisplayValue) || this._ndPlaceholder;
        const isPlaceholder = rawValue === this._ndPlaceholder;
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#FFD700";
        ctx.fillStyle = "#1f1f1f";
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(x, y, w, H, 8);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(x, y, w, H);
          ctx.strokeRect(x, y, w, H);
        }
        ctx.font = "12px Arial";
        ctx.textBaseline = "middle";
        const labelFullWidth = ctx.measureText(labelText).width;
        const valueFullWidth = ctx.measureText(rawValue).width;
        const labelSpacing = 8;
        const totalSpace = valueEnd - (x + inset);
        const neededValueWidth = Math.min(valueFullWidth, totalSpace);
        const availableForLabel = totalSpace - neededValueWidth;
        let showLabel = labelFullWidth > 0;
        let labelWidth = 0;
        if (showLabel && availableForLabel > labelSpacing) {
          labelWidth = Math.min(labelFullWidth, availableForLabel - labelSpacing);
          showLabel = labelWidth > 0;
        } else {
          showLabel = false;
        }
        const valueStart = showLabel ? x + inset + labelWidth + labelSpacing : x + inset;
        const valueMaxWidth = Math.max(12, valueEnd - valueStart);
        const displayLabel = showLabel ? _NodeEnhancerExtension.truncateText(ctx, labelText, labelWidth, false) : "";
        const displayValue = valueFullWidth <= valueMaxWidth ? rawValue : _NodeEnhancerExtension.truncateText(ctx, rawValue, valueMaxWidth, false);
        if (showLabel) {
          ctx.textAlign = "left";
          ctx.fillStyle = "#888888";
          ctx.fillText(displayLabel, x + inset, y + H / 2);
        }
        ctx.textAlign = "right";
        ctx.fillStyle = isPlaceholder ? "#7a7a7a" : "#ffffff";
        ctx.fillText(displayValue, valueEnd, y + H / 2);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd54f";
        ctx.fillText("⚡", iconX, y + H / 2 + 0.5);
        ctx.fillStyle = "#888";
        ctx.fillText("▾", caretX, y + H / 2 + 1);
        ctx.restore();
        this.last_y = widgetY;
        this.last_height = H;
      },
      mouse(event, pos, nodeRef) {
        const evtType = event?.type;
        const isLeft = event?.button === 0 || event?.which === 1 || event?.button === void 0;
        if (evtType === "pointerdown" && isLeft) {
          _NodeEnhancerExtension.showEnhancedPicker(nodeRef ?? node, config);
          return true;
        }
        if (evtType === "pointerup" && isLeft) {
          return true;
        }
        return false;
      },
      serializeValue() {
        if (typeof targetWidget.serializeValue === "function") {
          try {
            return targetWidget.serializeValue();
          } catch {
          }
        }
        return targetWidget.value;
      }
    };
    overlayWidget.callback = () => {
      _NodeEnhancerExtension.showEnhancedPicker(node, config);
    };
    overlayWidget.updateDisplay = (value, displayValue) => {
      const normalizedValue = typeof value === "string" ? value : "";
      const normalizedDisplay = typeof displayValue === "string" ? displayValue : normalizedValue;
      overlayWidget.value = normalizedValue;
      overlayWidget._ndDisplayValue = normalizedDisplay || "";
    };
    return overlayWidget;
  }
  static formatDisplayValue(value) {
    if (!value) {
      return "";
    }
    try {
      return String(value);
    } catch {
      return "";
    }
  }
  static buildPlaceholder(config, widget) {
    const base = widget?.label || widget?.name || config.label || config.widgetName || "file";
    return `Select ${base}`;
  }
  static ensureWidgetValueSelectable(widget, value) {
    if (!widget || typeof value !== "string") {
      return;
    }
    try {
      const before = widget.options?.values;
      if (!widget.options) {
        widget.options = { values: [value] };
        _NodeEnhancerExtension.debugLog("Initialized widget options for value", value, { widgetName: widget.name });
        return;
      }
      const options = widget.options;
      const { values } = options;
      if (Array.isArray(values)) {
        if (!values.includes(value)) {
          options.values = [...values, value];
          _NodeEnhancerExtension.debugLog("Appended value to array options", value, { widgetName: widget.name, before, after: options.values });
        }
        return;
      }
      if (values && typeof values === "object") {
        if (!(value in values)) {
          options.values = { ...values, [value]: value };
          _NodeEnhancerExtension.debugLog("Added value to object options", value, { widgetName: widget.name, before, after: options.values });
        }
        return;
      }
      options.values = [value];
      _NodeEnhancerExtension.debugLog("Reset options.values to single entry", value, { widgetName: widget.name, before });
    } catch (error) {
      console.warn("Node Enhancer: failed to sync widget values", error);
    }
  }
  static enhanceWidget(node, widget, config) {
    node.__ndEnhancedWidgets = node.__ndEnhancedWidgets || {};
    const meta = node.__ndEnhancedWidgets[config.widgetName] || { original: {} };
    const original = meta.original;
    if (!("callback" in original)) original.callback = widget.callback;
    if (!("mouse" in original)) original.mouse = widget.mouse;
    if (!("draw" in original)) original.draw = widget.draw;
    if (!("computeSize" in original)) original.computeSize = widget.computeSize;
    if (!("hidden" in original)) original.hidden = widget.hidden;
    if (!("options" in original)) original.options = widget.options ? { ...widget.options } : void 0;
    if (!("values" in original)) original.values = widget.options?.values ? [...widget.options.values] : void 0;
    if (!("serialize" in original)) original.serialize = widget.serialize;
    if (!("skipSerialize" in original)) original.skipSerialize = widget.skipSerialize;
    widget._ndPlaceholder = _NodeEnhancerExtension.buildPlaceholder(config, widget);
    widget.hidden = true;
    widget.computeSize = _NodeEnhancerExtension.HIDDEN_WIDGET_SIZE;
    if (!meta.overlay) {
      const overlay = _NodeEnhancerExtension.createOverlayWidget(node, widget, config);
      meta.overlay = overlay;
      if (!node.widgets) node.widgets = [];
      const idx = node.widgets.indexOf(widget);
      if (idx >= 0) node.widgets.splice(idx + 1, 0, overlay);
      else node.widgets.push(overlay);
    }
    widget.callback = function() {
      _NodeEnhancerExtension.showEnhancedPicker(node, config);
      return true;
    };
    widget.mouse = function(event, pos, nodeRef) {
      const evtType = event?.type;
      const isLeft = evtType === "pointerdown" && (event?.button === 0 || event?.which === 1 || event?.button === void 0);
      if (isLeft) {
        _NodeEnhancerExtension.showEnhancedPicker(nodeRef ?? node, config);
        return true;
      }
      if (typeof meta.original.mouse === "function") {
        return meta.original.mouse.call(this, event, pos, nodeRef ?? node);
      }
      return false;
    };
    node.__ndEnhancedWidgets[config.widgetName] = meta;
  }
  static restoreWidget(node, widget, config) {
    const meta = node.__ndEnhancedWidgets?.[config.widgetName];
    if (!meta) return;
    const original = meta.original || {};
    if (widget) {
      if ("callback" in original) {
        widget.callback = original.callback;
      } else {
        delete widget.callback;
      }
      if ("mouse" in original) {
        widget.mouse = original.mouse;
      } else {
        delete widget.mouse;
      }
      if ("draw" in original) {
        widget.draw = original.draw;
      } else {
        delete widget.draw;
      }
      if ("computeSize" in original) {
        if (original.computeSize) {
          widget.computeSize = original.computeSize;
        } else {
          delete widget.computeSize;
        }
      }
      if ("serialize" in original) {
        widget.serialize = original.serialize;
      } else {
        delete widget.serialize;
      }
      if ("skipSerialize" in original) {
        widget.skipSerialize = original.skipSerialize;
      } else {
        delete widget.skipSerialize;
      }
      if ("options" in original) {
        if (original.options === void 0) {
          delete widget.options;
        } else {
          widget.options = { ...original.options };
          if (original.values !== void 0) {
            widget.options.values = [...original.values];
          }
        }
      } else if (widget.options && "values" in widget.options) {
        delete widget.options.values;
      }
      if ("hidden" in original) {
        if (original.hidden === void 0) {
          delete widget.hidden;
        } else {
          widget.hidden = original.hidden;
        }
      } else {
        delete widget.hidden;
      }
      delete widget._ndPlaceholder;
      delete widget.last_y;
      delete widget.last_height;
      delete widget._ndDisplayValue;
    }
    if (meta.overlay) {
      const idx = node.widgets?.indexOf(meta.overlay) ?? -1;
      if (idx >= 0) node.widgets.splice(idx, 1);
      delete meta.overlay;
    }
    delete node.__ndEnhancedWidgets[config.widgetName];
    if (node.__ndEnhancedWidgets && Object.keys(node.__ndEnhancedWidgets).length === 0) {
      delete node.__ndEnhancedWidgets;
    }
    _NodeEnhancerExtension.restoreTitle(node);
  }
  /**
   * Initialize the node enhancer extension
   */
  static async initialize() {
    console.log("Node Enhancer Extension: Initializing...");
    this.loadUserPreferences();
    await this.filePickerService;
    console.log("Node Enhancer Extension: Initialized successfully");
  }
  /**
   * Set up enhancement for a specific node type
   */
  static setup(nodeType, nodeData) {
    const configs = this.ENHANCED_NODES.filter((c) => c.nodeType === nodeData.name);
    if (!configs.length) return;
    const originalCreate = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function() {
      originalCreate?.apply(this, arguments);
      if (!this.__ndPowerEnabled) this.__ndPowerEnabled = false;
      if (typeof this.__ndOriginalTitle === "undefined") {
        this.__ndOriginalTitle = this.title || this.constructor?.title || "";
      }
      if (this.__ndPowerEnabled) {
        configs.forEach((cfg) => _NodeEnhancerExtension.enableForNode(this, cfg));
        _NodeEnhancerExtension.applyTitleBadge(this);
      } else {
        _NodeEnhancerExtension.restoreTitle(this);
      }
    };
    const originalMenu = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function(canvas, optionsArr) {
      if (!_NodeEnhancerExtension.isGloballyEnabled()) {
        return originalMenu ? originalMenu.call(this, canvas, optionsArr) : optionsArr;
      }
      let options = Array.isArray(optionsArr) ? optionsArr : [];
      const maybe = originalMenu?.call(this, canvas, options);
      if (Array.isArray(maybe)) options = maybe;
      const toggleOption = {
        content: this.__ndPowerEnabled ? "➖ Disable ND Power UI" : "⚡ Enable ND Power UI",
        callback: () => {
          try {
            if (this.__ndPowerEnabled) {
              configs.forEach((cfg) => _NodeEnhancerExtension.disableForNode(this, cfg));
              this.__ndPowerEnabled = false;
              _NodeEnhancerExtension.restoreTitle(this);
            } else {
              configs.forEach((cfg) => _NodeEnhancerExtension.enableForNode(this, cfg));
              this.__ndPowerEnabled = true;
              _NodeEnhancerExtension.applyTitleBadge(this);
            }
            this.setDirtyCanvas?.(true, true);
          } catch (error) {
            console.warn("Node Enhancer: toggle failed", error);
          }
        }
      };
      if (options[0] !== null) {
        options.unshift(null);
      }
      options.unshift(toggleOption);
      return options;
    };
    const originalSerialize = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function() {
      const data = originalSerialize ? originalSerialize.apply(this, arguments) : {};
      try {
        data.ndPowerEnabled = !!this.__ndPowerEnabled;
        if (this.__ndEnhancedWidgets && Array.isArray(this.widgets)) {
          const hasOverlayWidgets = this.widgets.some((w) => w?.__ndOverlay);
          if (hasOverlayWidgets) {
            const serializedValues = [];
            for (const widget of this.widgets) {
              if (!widget || widget.__ndOverlay || widget.serialize === false) {
                continue;
              }
              if (typeof widget.serializeValue === "function") {
                try {
                  serializedValues.push(widget.serializeValue());
                  continue;
                } catch {
                }
              }
              serializedValues.push(widget.value ?? null);
            }
            data.widgets_values = serializedValues;
          }
        }
      } catch {
      }
      return data;
    };
    const originalConfigure = nodeType.prototype.configure;
    nodeType.prototype.configure = function(data) {
      if (originalConfigure) {
        originalConfigure.call(this, data);
      }
      try {
        if (typeof this.__ndPowerEnabled === "undefined") this.__ndPowerEnabled = false;
        if (data && data.ndPowerEnabled) {
          if (!this.__ndPowerEnabled) {
            this.__ndPowerEnabled = true;
            configs.forEach((cfg) => _NodeEnhancerExtension.enableForNode(this, cfg));
          }
          _NodeEnhancerExtension.applyTitleBadge(this);
        } else {
          configs.forEach((cfg) => _NodeEnhancerExtension.disableForNode(this, cfg));
          this.__ndPowerEnabled = false;
          _NodeEnhancerExtension.restoreTitle(this);
        }
      } catch {
      }
    };
    const originalOnMouseDown = nodeType.prototype.onMouseDown;
    nodeType.prototype.onMouseDown = function(event, pos) {
      const handled = configs.some((cfg) => _NodeEnhancerExtension.handleEnhancedMouseDown(this, event, pos, cfg));
      if (handled) {
        return true;
      }
      return originalOnMouseDown ? originalOnMouseDown.call(this, event, pos) : false;
    };
    console.log(`Node Enhancer: Successfully enhanced ${nodeData.name}`);
  }
  /**
   * Set up enhanced node with custom widgets
   */
  static setupEnhancedNode(node, config) {
    if (node.__ndEnhancedWidgets?.[config.widgetName]) {
      return;
    }
    const widget = node.widgets?.find((w) => w.name === config.widgetName);
    if (!widget) {
      console.warn(`Node Enhancer: Could not find widget "${config.widgetName}" in ${config.nodeType}`);
      return;
    }
    node.__ndPowerEnabled = true;
    node.__ndEnhancedWidgets = node.__ndEnhancedWidgets || {};
    node.__ndEnhancedWidgets[config.widgetName] = node.__ndEnhancedWidgets[config.widgetName] || { original: {} };
    _NodeEnhancerExtension.debugLog("Enhancing widget", {
      nodeType: node?.type,
      widgetName: widget?.name,
      initialValue: widget?.value,
      options: widget?.options?.values
    });
    this.enhanceWidget(node, widget, config);
    this.applyTitleBadge(node);
  }
  /** Enable enhancement for a specific node instance */
  static enableForNode(node, config) {
    this.setupEnhancedNode(node, config);
  }
  /** Disable enhancement for a specific node instance */
  static disableForNode(node, config) {
    if (!node.__ndEnhancedWidgets || !node.__ndEnhancedWidgets[config.widgetName]) {
      return;
    }
    const widget = node.widgets?.find((w) => w.name === config.widgetName);
    _NodeEnhancerExtension.restoreWidget(node, widget, config);
    if (!node.__ndEnhancedWidgets) {
      node.__ndPowerEnabled = false;
    }
    _NodeEnhancerExtension.restoreTitle(node);
  }
  static showEnhancedPicker(node, config) {
    const widget = node.widgets?.find((w) => w.name === config.widgetName);
    if (!widget) return;
    const currentValue = widget.value;
    this.filePickerService.showFilePicker(
      config.fileType,
      (file) => {
        let newValue;
        if (file && typeof file.id === "string") {
          newValue = file.id;
        } else if (file && typeof file.path === "string") {
          newValue = file.path;
        } else if (file && typeof file.filename === "string") {
          newValue = file.filename;
        }
        _NodeEnhancerExtension.debugLog("File picker selection", {
          nodeType: node?.type,
          widgetName: config.widgetName,
          file,
          proposedValue: newValue,
          existingValues: widget.options?.values
        });
        if (typeof newValue === "string") {
          try {
            const normalizedValue = _NodeEnhancerExtension.normalizeValueForWidget(widget, newValue);
            widget.value = normalizedValue;
            _NodeEnhancerExtension.ensureWidgetValueSelectable(widget, normalizedValue);
            _NodeEnhancerExtension.debugLog("Applied widget value", {
              nodeType: node?.type,
              widgetName: config.widgetName,
              newValue: normalizedValue,
              updatedValues: widget.options?.values
            });
          } catch (error) {
            console.warn("Node Enhancer: failed to assign widget value", error);
          }
        }
        const meta = node.__ndEnhancedWidgets?.[config.widgetName];
        if (meta?.overlay) {
          const displayValue = _NodeEnhancerExtension.formatDisplayValue(
            file && typeof file.label === "string" && file.label || file && typeof file.path === "string" && file.path || file && typeof file.filename === "string" && file.filename || widget.value
          );
          meta.overlay.updateDisplay(widget.value, displayValue);
          _NodeEnhancerExtension.debugLog("Updated overlay display", {
            nodeType: node?.type,
            widgetName: config.widgetName,
            displayValue,
            widgetValue: widget.value
          });
        }
        node.setDirtyCanvas?.(true, true);
      },
      {
        title: `Select ${config.fileType}`,
        multiSelect: false,
        currentValue
      }
    );
  }
  /**
   * Handle mouse events for enhanced widgets
   */
  static handleEnhancedMouseDown(node, event, pos, config) {
    if (!node.__ndPowerEnabled || !node.__ndEnhancedWidgets || !node.__ndEnhancedWidgets[config.widgetName]) return false;
    const widget = node.widgets?.find((w) => w.name === config.widgetName);
    if (!widget) return false;
    try {
      const isLeft = event?.button === 0 || event?.which === 1 || !("button" in (event || {}));
      if (!isLeft) return false;
      const y = widget?.last_y ?? null;
      const H = window.LiteGraph?.NODE_WIDGET_HEIGHT || 20;
      if (y == null) return false;
      const withinX = pos[0] >= 0 && pos[0] <= (node.size?.[0] || 200);
      const withinY = pos[1] >= y && pos[1] <= y + H;
      if (withinX && withinY) {
        this.showEnhancedPicker(node, config);
        return true;
      }
    } catch {
    }
    return false;
  }
  /**
   * Draw enhanced widgets (visual indicators)
   */
  static drawEnhancedWidgets(node, ctx) {
    if (!node.__ndPowerEnabled) return;
  }
  static applyTitleBadge(node) {
    try {
      if (typeof node.__ndOriginalTitle === "undefined") {
        node.__ndOriginalTitle = node.title || node.constructor?.title || "";
      } else {
        node.title = node.__ndOriginalTitle;
      }
    } catch {
    }
  }
  static restoreTitle(node) {
    try {
      if (typeof node.__ndOriginalTitle !== "undefined") {
        node.title = node.__ndOriginalTitle;
      }
    } catch {
    }
  }
  // Preference helpers retained for future global defaults (no-op currently)
  static loadUserPreferences() {
  }
  static saveUserPreferences() {
  }
  static getAvailableEnhancements() {
    return this.ENHANCED_NODES;
  }
  static enableEnhancement(nodeTypeName) {
    const config = this.ENHANCED_NODES.find((cfg) => cfg.nodeType === nodeTypeName);
    if (!config) return;
    const graph = window.app?.graph;
    if (!graph) return;
    (graph._nodes || []).forEach((node) => {
      if (node.type === nodeTypeName) {
        try {
          this.enableForNode(node, config);
          node.setDirtyCanvas?.(true, true);
        } catch (error) {
          console.warn("Node Enhancer: failed to enable node", node, error);
        }
      }
    });
  }
  static loadSet(key, sessionFirst = false) {
    try {
      if (sessionFirst) {
        const fromSession = sessionStorage.getItem(key);
        if (fromSession) return new Set(JSON.parse(fromSession));
      }
      const fromLocal = localStorage.getItem(key);
      if (fromLocal) return new Set(JSON.parse(fromLocal));
      if (!sessionFirst) {
        const fromSession = sessionStorage.getItem(key);
        if (fromSession) return new Set(JSON.parse(fromSession));
      }
    } catch {
    }
    return /* @__PURE__ */ new Set();
  }
  static persistSet(key, value) {
    try {
      const data = JSON.stringify(Array.from(value));
      sessionStorage.setItem(key, data);
      localStorage.setItem(key, data);
    } catch {
    }
  }
  static truncateText(ctx, text, maxWidth, keepEnd = false) {
    if (!text) return "";
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    const ellipsis = "…";
    if (keepEnd) {
      let length2 = text.length;
      while (length2 > 0) {
        const candidate = ellipsis + text.slice(Math.max(0, text.length - length2));
        if (ctx.measureText(candidate).width <= maxWidth) {
          return candidate;
        }
        length2--;
      }
      return text.slice(-1);
    }
    let length = text.length;
    while (length > 0) {
      const candidate = text.slice(0, length) + ellipsis;
      if (ctx.measureText(candidate).width <= maxWidth) {
        return candidate;
      }
      length--;
    }
    return ellipsis;
  }
};
_NodeEnhancerExtension.ENHANCED_NODES = [
  {
    nodeType: "CheckpointLoader",
    fileType: "models",
    widgetName: "ckpt_name",
    label: "ND Selector"
  },
  {
    nodeType: "CheckpointLoaderSimple",
    fileType: "models",
    widgetName: "ckpt_name",
    label: "ND Selector"
  },
  {
    nodeType: "VAELoader",
    fileType: "vae",
    widgetName: "vae_name",
    label: "ND Selector"
  },
  {
    nodeType: "LoraLoader",
    fileType: "loras",
    widgetName: "lora_name",
    label: "ND Selector"
  },
  {
    nodeType: "UNETLoader",
    fileType: "diffusion_models",
    widgetName: "unet_name",
    label: "ND Selector"
  },
  {
    nodeType: "UnetLoaderGGUF",
    fileType: "gguf_unet_models",
    widgetName: "unet_name",
    label: "ND Selector"
  },
  {
    nodeType: "UnetLoaderGGUFAdvanced",
    fileType: "gguf_unet_models",
    widgetName: "unet_name",
    label: "ND Selector"
  },
  {
    nodeType: "CLIPLoader",
    fileType: "text_encoders",
    widgetName: "clip_name",
    label: "ND Selector"
  },
  {
    nodeType: "CLIPLoaderGGUF",
    fileType: "text_encoders",
    widgetName: "clip_name",
    label: "ND Selector"
  },
  ...Object.entries(GGUF_CLIP_WIDGET_MAP).flatMap(
    ([nodeType, widgetNames]) => widgetNames.map((widgetName, index) => ({
      nodeType,
      fileType: "text_encoders",
      widgetName,
      label: `ND Selector (${index + 1})`
    }))
  ),
  {
    nodeType: "ControlNetLoader",
    fileType: "controlnet",
    widgetName: "control_net_name",
    label: "ND Selector"
  },
  {
    nodeType: "UpscaleModelLoader",
    fileType: "upscale_models",
    widgetName: "model_name",
    label: "ND Selector"
  }
];
_NodeEnhancerExtension.filePickerService = FilePickerService.getInstance();
_NodeEnhancerExtension.HIDDEN_WIDGET_SIZE = (_width) => [0, -4];
_NodeEnhancerExtension.DEBUG = true;
let NodeEnhancerExtension = _NodeEnhancerExtension;
const EXTENSION_NAME$1 = "NodeEnhancer";
const EXTENSION_VERSION = "1.0.0";
const nodeEnhancerExtension = {
  name: EXTENSION_NAME$1,
  version: EXTENSION_VERSION,
  // Extension settings
  settings: [
    {
      id: "nodeEnhancer.enabled",
      name: "Enable Node Enhancement",
      type: "boolean",
      defaultValue: true
    },
    {
      id: "nodeEnhancer.autoEnhanceAll",
      name: "Auto-enhance All Nodes",
      type: "boolean",
      defaultValue: false
    },
    {
      id: "nodeEnhancer.enableContextToggle",
      name: "Show ND Selector Toggle in Node Menu",
      type: "boolean",
      defaultValue: true
    }
  ],
  // Extension commands (minimal; per-node toggle lives in right-click menu)
  commands: [
    {
      id: "nodeEnhancer.clearCache",
      label: "ND Power UI: Clear File Cache",
      function: () => {
        try {
          NodeEnhancerExtension["filePickerService"]?.clearCache?.();
          console.log("ND Power UI: File cache cleared");
        } catch {
        }
      }
    }
  ],
  /**
   * Called when the extension is loaded
   */
  async init() {
    console.log(`${EXTENSION_NAME$1} v${EXTENSION_VERSION}: Initializing...`);
    try {
      await NodeEnhancerExtension.initialize();
      console.log(`${EXTENSION_NAME$1}: Initialization successful`);
    } catch (error) {
      console.error(`${EXTENSION_NAME$1}: Initialization failed:`, error);
    }
  },
  /**
   * Called before a node type is registered
   * This is where we inject our enhancements
   */
  async beforeRegisterNodeDef(nodeType, nodeData) {
    try {
      NodeEnhancerExtension.setup(nodeType, nodeData);
    } catch (error) {
      console.error("Node Enhancer: Error in beforeRegisterNodeDef:", error);
    }
  },
  /**
   * Called when a node is created
   */
  nodeCreated(node) {
    const autoEnhanceAll = app$1.ui.settings.getSettingValue("nodeEnhancer.autoEnhanceAll", false);
    if (autoEnhanceAll && node.type) {
      const availableEnhancements = NodeEnhancerExtension.getAvailableEnhancements();
      const config = availableEnhancements.find((e) => e.nodeType === node.type);
      if (config) {
        NodeEnhancerExtension.enableEnhancement(config.nodeType);
        console.log(`Node Enhancer: Auto-enhanced ${node.type}`);
      }
    }
  },
  /**
   * Called before the graph is configured
   */
  beforeConfigureGraph(_graphData) {
    console.log("Node Enhancer: Configuring graph");
  },
  /**
   * Called after the graph is configured
   */
  afterConfigureGraph(_graphData) {
    console.log("Node Enhancer: Graph configured");
  }
};
console.log(`${EXTENSION_NAME$1}: Registering extension with ComfyUI`);
app$1.registerExtension(nodeEnhancerExtension);
console.log(`${EXTENSION_NAME$1}: Extension registered successfully`);
const EXTENSION_NAME = "SuperLoraLoader";
const NODE_TYPE = "NdSuperLoraLoader";
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
  beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name === NODE_TYPE) {
      console.log("Super LoRA Loader: Registering node type");
      SuperLoraNode.initialize().then(() => {
        console.log("Super LoRA Loader: Services initialized");
      }).catch((err) => {
        console.error("Super LoRA Loader: Initialization error", err);
      });
      try {
        SuperLoraNode.setup(nodeType, nodeData);
        console.log("Super LoRA Loader: Node type registered successfully");
      } catch (err) {
        console.error("Super LoRA Loader: Error during node setup; continuing with default registration", err);
      }
    }
  },
  /**
   * Called when a node is created
   */
  nodeCreated(node) {
    if (node.type === NODE_TYPE) {
      console.log("Super LoRA Loader: Node created", node.id);
      this.setupNodeEventHandlers?.(node);
    }
  },
  /**
   * Called before the graph is configured
   */
  beforeConfigureGraph(_graphData) {
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
      console.log("Super LoRA Loader: Property changed", name, value);
      if (name.startsWith("@")) {
        const settingName = name.substring(1);
        this.onSettingChanged?.(settingName, value);
      }
      if (originalOnPropertyChanged) {
        originalOnPropertyChanged.apply(this, arguments);
      }
    };
  }
};
console.log("Super LoRA Loader: Registering extension with ComfyUI");
app$1.registerExtension(superLoraExtension);
console.log("Super LoRA Loader: Extension registered successfully");
try {
  window.SuperLoraNode = SuperLoraNode;
} catch {
}
//# sourceMappingURL=extension.js.map
