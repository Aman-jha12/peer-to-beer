import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import commonjs from 'vite-plugin-commonjs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    commonjs() // <--- Add this! It converts "require" to "import" automatically
  ],  optimizeDeps: {
    include: ["google-protobuf"]
  }
})