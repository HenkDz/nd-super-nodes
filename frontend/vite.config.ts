import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue()
  ],
  build: {
    // Build to ../web directory which ComfyUI serves
    outDir: '../web',
    emptyOutDir: true,
    sourcemap: true,
    minify: false, // Keep readable for debugging
    rollupOptions: {
      input: fileURLToPath(new URL('src/extension.ts', import.meta.url)),
      // Externalize ComfyUI modules that will be available at runtime
      // Vue is provided by ComfyUI in Nodes 2.0 mode
      external: [
        '/scripts/app.js',
        '/scripts/widgets.js',
        'app',
        'api',
        'ui',
        'vue'  // Externalized - ComfyUI provides Vue at runtime in Nodes 2.0
      ],
      output: {
        // The entry file will be named extension.js, matching our import in __init__.js
        entryFileNames: 'extension.js',
        // We can name our css file here too
        assetFileNames: 'style.css',
        globals: {
          '/scripts/app.js': 'app',
          '/scripts/widgets.js': 'ComfyWidgets',
          app: 'app',
          api: 'api',
          ui: 'ui',
          vue: 'Vue'  // Use global Vue provided by ComfyUI
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "sass:color";
@use "@/styles/variables.scss" as *;`
      }
    }
  }
});
