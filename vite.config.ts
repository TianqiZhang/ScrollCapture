import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Helper to determine which part to build
const getConfig = (mode) => {
  if (mode === 'popup') {
    return {
      plugins: [
        react(),
        {
          name: 'post-build',
          writeBundle: async () => {
            // Create dist directory if it doesn't exist
            if (!fs.existsSync('dist')) {
              fs.mkdirSync('dist', { recursive: true });
            }

            // Copy manifest and icon to dist
            fs.copyFileSync('public/manifest.json', 'dist/manifest.json');
            fs.copyFileSync('public/icon.svg', 'dist/icon.svg');
            
            // Copy and rename index.html to popup.html
            if (fs.existsSync('dist/index.html')) {
              fs.copyFileSync('dist/index.html', 'dist/popup.html');
            }

            // Create icons directory
            if (!fs.existsSync('dist/icons')) {
              fs.mkdirSync('dist/icons', { recursive: true });
            }
          }
        }
      ],
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            popup: resolve(__dirname, 'index.html')
          }
        }
      }
    };
  } else if (mode === 'content') {
    return {
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/content.ts'),
          name: 'content',
          formats: ['iife'],
          fileName: () => 'content.js'
        }
      }
    };
  } else if (mode === 'background') {
    return {
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/background.ts'),
          name: 'background',
          formats: ['iife'],
          fileName: () => 'background.js'
        }
      }
    };
  }

  // Default to popup config
  return getConfig('popup');
};

export default defineConfig(({ mode }) => getConfig(mode));