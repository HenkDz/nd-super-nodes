// Note: ComfyUI modules are accessed via window.app at runtime
// No need for module declarations since we use global window access

declare global {
  interface Window {
    app: any;
    LiteGraph: any;
  }
}

declare module '/extensions' {
  export interface ComfyExtension {
    name: string;
    version: string;
    enabled?: boolean;
    settings?: Array<{
      id: string;
      name: string;
      type: 'boolean' | 'number' | 'string';
      defaultValue: any;
    }>;
    commands?: Array<{
      id: string;
      label: string;
      function: () => void;
    }>;
    init?(): Promise<void> | void;
    beforeRegisterNodeDef?(nodeType: any, nodeData: any): Promise<void> | void;
    nodeCreated?(node: any): void;
    beforeConfigureGraph?(data: any): void;
    afterConfigureGraph?(data: any): void;
  }

  export const ComfyExtensionRegistry: {
    registerExtension(extension: ComfyExtension): void;
  };
}

declare module '/scripts/app.js' {
  export const app: any;
}

export {};


