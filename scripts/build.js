import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

async function runBuild() {
  console.log('🚀 Building WriteTex Chrome Extension (Manifest V3)...');

  // Clean dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Build Background Service Worker (ES module)
  console.log('📦 Bundling Service Worker...');
  await build({
    configFile: false,
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/background/service-worker.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
      target: 'esnext',
      minify: false,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });

  // 2. Build CodeMirror 6 Bridge (IIFE for MAIN world)
  console.log('📦 Bundling CodeMirror 6 Bridge...');
  await build({
    configFile: false,
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/adapters/overleaf/cm6-bridge.ts'),
        name: 'WriteTexBridge',
        formats: ['iife'],
        fileName: () => 'bridge.js',
      },
      target: 'esnext',
      minify: false,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });

  // 3. Build Content Script (IIFE for ISOLATED world with React and Tailwind)
  console.log('📦 Bundling Content Script (React + Shadow DOM)...');
  await build({
    configFile: false,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(rootDir, 'src/content/index.ts'),
        name: 'WriteTexContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      target: 'esnext',
      minify: false,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });

  // 4. Copy public directory assets (manifest.json, icons)
  console.log('📄 Copying manifest.json and icons...');
  const publicDir = path.resolve(rootDir, 'public');
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, distDir, { recursive: true });
  }

  console.log('✅ WriteTex Chrome Extension build complete! Output is in dist/');
}

runBuild().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
