/**
 * CivitAI API integration service
 */

import { CivitAiModelInfo } from '@/types';

export class CivitAiService {
  private static instance: CivitAiService;
  private cache: Map<string, CivitAiModelInfo> = new Map();
  private pendingRequests: Map<string, Promise<CivitAiModelInfo | null>> = new Map();

  static getInstance(): CivitAiService {
    if (!CivitAiService.instance) {
      CivitAiService.instance = new CivitAiService();
    }
    return CivitAiService.instance;
  }

  /**
   * Get trigger words for a LoRA file
   */
  async getTriggerWords(loraFileName: string): Promise<string[]> {
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
  async getModelInfo(loraFileName: string): Promise<CivitAiModelInfo | null> {
    // Check cache first
    if (this.cache.has(loraFileName)) {
      return this.cache.get(loraFileName)!;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(loraFileName)) {
      return await this.pendingRequests.get(loraFileName)!;
    }

    // Create new request
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
  private async fetchModelInfo(loraFileName: string): Promise<CivitAiModelInfo | null> {
    try {
      // Call our backend endpoint that handles CivitAI integration
      const response = await fetch('/super_lora/civitai_info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lora_filename: loraFileName
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Model not found on CivitAI
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
  private extractTriggerWordsFromModelInfo(modelInfo: CivitAiModelInfo): string[] {
    const triggerWords: string[] = [];

    // Extract from trainedWords array
    if (modelInfo.trainedWords && Array.isArray(modelInfo.trainedWords)) {
      for (const item of modelInfo.trainedWords) {
        if (typeof item === 'string') {
          triggerWords.push(item);
        } else if (item && typeof item === 'object' && 'word' in item) {
          triggerWords.push(item.word);
        }
      }
    }

    // Limit to top 3 trigger words
    return triggerWords.slice(0, 3);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size for debugging
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Check if auto-fetch is enabled in settings
   */
  private isAutoFetchEnabled(): boolean {
    // This would check the global ComfyUI settings
    // For now, we'll assume it's enabled by default
    try {
      const app = (window as any).app;
      if (app && app.ui && app.ui.settings) {
        return app.ui.settings.getSettingValue('superLora.autoFetchTriggerWords', true);
      }
    } catch (error) {
      console.warn('Super LoRA Loader: Failed to check auto-fetch setting:', error);
    }
    
    return true;
  }

  /**
   * Auto-populate trigger words for a LoRA if enabled
   */
  async autoPopulateTriggerWords(loraFileName: string): Promise<string> {
    if (!this.isAutoFetchEnabled() || !loraFileName || loraFileName === 'None') {
      return '';
    }

    try {
      const triggerWords = await this.getTriggerWords(loraFileName);
      return triggerWords.length > 0 ? triggerWords[0] : '';
    } catch (error) {
      console.warn(`Super LoRA Loader: Auto-populate failed for ${loraFileName}:`, error);
      return '';
    }
  }
}
