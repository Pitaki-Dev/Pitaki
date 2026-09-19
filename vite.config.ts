import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tauri 通过 TAURI_ENV_* 注入目标平台信息，用于选择构建 target。
// https://v2.tauri.app/start/frontend/vite/
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 一律 http://localhost:5173 —— 局域网 IP 不是安全上下文，Web Crypto SHA-1 会失效
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    watch: {
      // 引擎副本与 Rust 侧由各自流程处理，不参与前端 HMR
      ignored: ['**/src-tauri/**', '**/third_party/**', '**/public/foliate/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // Vite 8 用 rolldown/oxc；'esbuild' 需要额外安装 esbuild（会触发 vite:esbuild-transpile 报错）
    minify: process.env.TAURI_ENV_DEBUG ? false : 'oxc',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
