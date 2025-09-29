/**
 * Prompt Builder service for history, favorites, and template management
 */

import type {
  PromptSegment,
  PromptHistoryEntry,
  PromptFavorite,
  PromptTemplate
} from '@/types';

export class PromptService {
  private static instance: PromptService;
  private history: PromptHistoryEntry[] = [];
  private favorites: PromptFavorite[] = [];
  private templates: string[] = [];
  private isLoaded: boolean = false;

  static getInstance(): PromptService {
    if (!PromptService.instance) {
      PromptService.instance = new PromptService();
    }
    return PromptService.instance;
  }

  /**
   * Initialize the prompt service
   */
  async initialize(): Promise<void> {
    if (!this.isLoaded) {
      await Promise.all([
        this.loadHistory(),
        this.loadFavorites(),
        this.loadTemplates()
      ]);
      this.isLoaded = true;
    }
  }

  // ========== History Management ==========

  /**
   * Load prompt history from backend
   */
  async loadHistory(limit: number = 50): Promise<void> {
    try {
      const response = await fetch(`/super_prompt/history?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        this.history = data.history || [];
        console.log(`Super Prompt Builder: Loaded ${this.history.length} history entries`);
      } else {
        console.warn('Super Prompt Builder: Failed to load history');
        this.history = [];
      }
    } catch (error) {
      console.error('Super Prompt Builder: Error loading history:', error);
      this.history = [];
    }
  }

  /**
   * Get prompt history
   */
  getHistory(): PromptHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Add entry to history
   */
  async addToHistory(
    positive: string,
    negative: string,
    segments: PromptSegment[],
    metadata?: Record<string, any>
  ): Promise<string | null> {
    try {
      const response = await fetch('/super_prompt/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positive,
          negative,
          segments,
          metadata
        })
      });

      if (response.ok) {
        const data = await response.json();
        await this.loadHistory();
        return data.id;
      }
      return null;
    } catch (error) {
      console.error('Super Prompt Builder: Error adding to history:', error);
      return null;
    }
  }

  /**
   * Delete history entry
   */
  async deleteHistoryEntry(id: string): Promise<boolean> {
    try {
      const response = await fetch('/super_prompt/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        await this.loadHistory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Super Prompt Builder: Error deleting history entry:', error);
      return false;
    }
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<boolean> {
    try {
      const response = await fetch('/super_prompt/history/clear', {
        method: 'POST'
      });

      if (response.ok) {
        this.history = [];
        return true;
      }
      return false;
    } catch (error) {
      console.error('Super Prompt Builder: Error clearing history:', error);
      return false;
    }
  }

  /**
   * Search history
   */
  async searchHistory(query: string, limit: number = 20): Promise<PromptHistoryEntry[]> {
    try {
      const response = await fetch(`/super_prompt/history/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }
      return [];
    } catch (error) {
      console.error('Super Prompt Builder: Error searching history:', error);
      return [];
    }
  }

  // ========== Favorites Management ==========

  /**
   * Load favorites from backend
   */
  async loadFavorites(): Promise<void> {
    try {
      const response = await fetch('/super_prompt/favorites');
      if (response.ok) {
        const data = await response.json();
        this.favorites = data.favorites || [];
        console.log(`Super Prompt Builder: Loaded ${this.favorites.length} favorites`);
      } else {
        console.warn('Super Prompt Builder: Failed to load favorites');
        this.favorites = [];
      }
    } catch (error) {
      console.error('Super Prompt Builder: Error loading favorites:', error);
      this.favorites = [];
    }
  }

  /**
   * Get all favorites
   */
  getFavorites(): PromptFavorite[] {
    return [...this.favorites];
  }

  /**
   * Add to favorites
   */
  async addToFavorites(
    name: string,
    positive: string,
    negative: string,
    segments: PromptSegment[],
    metadata?: Record<string, any>
  ): Promise<string | null> {
    try {
      const response = await fetch('/super_prompt/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          positive,
          negative,
          segments,
          metadata
        })
      });

      if (response.ok) {
        const data = await response.json();
        await this.loadFavorites();
        return data.id;
      }
      return null;
    } catch (error) {
      console.error('Super Prompt Builder: Error adding to favorites:', error);
      return null;
    }
  }

  /**
   * Delete favorite
   */
  async deleteFavorite(id: string): Promise<boolean> {
    try {
      const response = await fetch('/super_prompt/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        await this.loadFavorites();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Super Prompt Builder: Error deleting favorite:', error);
      return false;
    }
  }

  /**
   * Rename favorite
   */
  async renameFavorite(id: string, newName: string): Promise<boolean> {
    try {
      const response = await fetch('/super_prompt/favorites/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName })
      });

      if (response.ok) {
        await this.loadFavorites();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Super Prompt Builder: Error renaming favorite:', error);
      return false;
    }
  }

  // ========== Template Management ==========

  /**
   * Load template names from backend
   */
  async loadTemplates(): Promise<void> {
    try {
      const response = await fetch('/super_prompt/templates');
      if (response.ok) {
        const data = await response.json();
        this.templates = data.templates || [];
        console.log(`Super Prompt Builder: Loaded ${this.templates.length} templates`);
      } else {
        console.warn('Super Prompt Builder: Failed to load templates');
        this.templates = [];
      }
    } catch (error) {
      console.error('Super Prompt Builder: Error loading templates:', error);
      this.templates = [];
    }
  }

  /**
   * Get template names
   */
  getTemplateNames(): string[] {
    return [...this.templates];
  }

  /**
   * Save template
   */
  async saveTemplate(name: string, segments: PromptSegment[]): Promise<boolean> {
    try {
      const response = await fetch('/super_prompt/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, segments })
      });

      if (response.ok) {
        await this.loadTemplates();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Super Prompt Builder: Error saving template:', error);
      return false;
    }
  }

  /**
   * Load template
   */
  async loadTemplate(name: string): Promise<PromptTemplate | null> {
    try {
      const response = await fetch(`/super_prompt/templates/${encodeURIComponent(name)}`);
      if (response.ok) {
        const data = await response.json();
        return data as PromptTemplate;
      }
      return null;
    } catch (error) {
      console.error('Super Prompt Builder: Error loading template:', error);
      return null;
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(name: string): Promise<boolean> {
    try {
      const response = await fetch('/super_prompt/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        await this.loadTemplates();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Super Prompt Builder: Error deleting template:', error);
      return false;
    }
  }

  /**
   * Rename template
   */
  async renameTemplate(oldName: string, newName: string): Promise<boolean> {
    try {
      const response = await fetch('/super_prompt/templates/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_name: oldName, new_name: newName })
      });

      if (response.ok) {
        await this.loadTemplates();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Super Prompt Builder: Error renaming template:', error);
      return false;
    }
  }
}
