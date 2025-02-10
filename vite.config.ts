import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'post-build',
      closeBundle: async () => {
        // Copy manifest to dist
        if (!fs.existsSync('dist')) {
          fs.mkdirSync('dist');
        }
        fs.copyFileSync('public/manifest.json', 'dist/manifest.json');
        
        // Move CSS file to correct location
        if (fs.existsSync('dist/assets/contentStyle.css')) {
          fs.renameSync('dist/assets/contentStyle.css', 'dist/content.css');
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        content: resolve(__dirname, 'src/content.ts'),
        background: resolve(__dirname, 'src/background.ts'),
        contentStyle: resolve(__dirname, 'src/content.css')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'assets/[name].[ext]';
          }
          return 'assets/[name].[ext]';
        }
      }
    }
  }
});