import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: {
    // Build to ../web directory which ComfyUI serves
    outDir: '../web',
    emptyOutDir: true,
    sourcemap: true,
    minify: false, // Keep readable for debugging
    rollupOptions: {
      input: fileURLToPath(new URL('src/extension.ts', import.meta.url)),
      // Externalize ComfyUI modules that will be available at runtime
      external: ['/scripts/app.js', '/scripts/widgets.js', 'app', 'api', 'ui'],
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
          ui: 'ui'
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
