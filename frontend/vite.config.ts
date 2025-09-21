import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    // Build to ../web directory which ComfyUI serves
    outDir: '../web',
    emptyOutDir: true,
    sourcemap: true,
    minify: false, // Keep readable for debugging
    rollupOptions: {
      input: path.resolve(__dirname, 'src/extension.ts'),
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
      '@': path.resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  }
});
