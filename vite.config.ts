import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/italy-trip/',
  plugins: [react(), tailwindcss()],
  server: {
    // Honour the PORT env var (used by the preview harness) so autoPort works;
    // fall back to Vite's default for a plain `npm run dev`.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
