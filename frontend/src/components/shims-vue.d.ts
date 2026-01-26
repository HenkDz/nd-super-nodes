/**
 * Vue SFC TypeScript Shims
 * Provides TypeScript support for .vue single-file components
 */

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
