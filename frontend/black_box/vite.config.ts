import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {viteMockServe} from 'vite-plugin-mock'
import path from 'path'
import { normalizeApiBaseUrl } from './src/config/runtime-value'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  normalizeApiBaseUrl(process.env.VITE_API_BASE_URL ?? fileEnv.VITE_API_BASE_URL)

  return {
    plugins: [
      react(),
      tailwindcss(),
      viteMockServe({
        mockPath: 'mock'
      })
    ],
    resolve: {
      alias: {
        // __dirname node 的超级变量 项目根目录
        '@': path.resolve(__dirname, 'src'),
      }
    }
  }
})
