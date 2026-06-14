import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {viteMockServe} from 'vite-plugin-mock'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
    react(),
    tailwindcss(),
    viteMockServe({
      mockPath:'mock'
    })
  ],
  "resolve":{
  alias: {
    // __dirname node 的超级变量 项目根目录
      '@': path.resolve(__dirname, 'src'),
    }
  }
})
