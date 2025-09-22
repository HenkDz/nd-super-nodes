// Note: ComfyUI modules are accessed via window.app at runtime
// No need for module declarations since we use global window access

declare global {
  interface Window {
    app: any;
    LiteGraph: any;
  }
}

export {};


