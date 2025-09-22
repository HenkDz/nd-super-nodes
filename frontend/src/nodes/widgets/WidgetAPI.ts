/*
 * Shared API for widgets to call back into SuperLoraNode without importing it directly.
 * This avoids circular dependencies when splitting widget classes into separate modules.
 */

export type WidgetAPIType = {
  // Node lifecycle and UI helpers
  showLoraSelector: (node: any, widget?: any, event?: any) => void | Promise<void>;
  showTagSelector: (node: any, widget: any) => void;
  showSettingsDialog: (node: any, event?: any) => void;
  showLoadTemplateDialog: (node: any, event?: any) => void | Promise<void>;
  showNameOverlay: (opts: { title: string; placeholder: string; initial?: string; submitLabel?: string; onCommit: (name: string) => void }) => void;
  showInlineText: (event: any, initial: string, onCommit: (v: string) => void, place?: { rect: { x: number; y: number; w: number; h: number }; node: any }) => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;

  // Node structure helpers
  calculateNodeSize: (node: any) => void;
  organizeByTags: (node: any) => void;
  addLoraWidget: (node: any, config?: any) => any;
  removeLoraWidget: (node: any, widget: any) => void;
  getLoraConfigs: (node: any) => Array<any>;
  syncExecutionWidgets: (node: any) => void;

  // Backend/service helpers
  templateService: any;
  civitaiService: any;
};

// Mutable API object that widgets will use. It is populated by SuperLoraNode at runtime.
export const WidgetAPI: WidgetAPIType = {
  showLoraSelector: () => { throw new Error('WidgetAPI.showLoraSelector not initialized'); },
  showTagSelector: () => { throw new Error('WidgetAPI.showTagSelector not initialized'); },
  showSettingsDialog: () => { throw new Error('WidgetAPI.showSettingsDialog not initialized'); },
  showLoadTemplateDialog: () => { throw new Error('WidgetAPI.showLoadTemplateDialog not initialized'); },
  showNameOverlay: () => { throw new Error('WidgetAPI.showNameOverlay not initialized'); },
  showInlineText: () => { throw new Error('WidgetAPI.showInlineText not initialized'); },
  showToast: () => { throw new Error('WidgetAPI.showToast not initialized'); },
  calculateNodeSize: () => { throw new Error('WidgetAPI.calculateNodeSize not initialized'); },
  organizeByTags: () => { throw new Error('WidgetAPI.organizeByTags not initialized'); },
  addLoraWidget: () => { throw new Error('WidgetAPI.addLoraWidget not initialized'); },
  removeLoraWidget: () => { throw new Error('WidgetAPI.removeLoraWidget not initialized'); },
  getLoraConfigs: () => { throw new Error('WidgetAPI.getLoraConfigs not initialized'); },
  syncExecutionWidgets: () => { throw new Error('WidgetAPI.syncExecutionWidgets not initialized'); },
  templateService: null,
  civitaiService: null,
};

export function setWidgetAPI(api: Partial<WidgetAPIType>): void {
  Object.assign(WidgetAPI, api);
}


