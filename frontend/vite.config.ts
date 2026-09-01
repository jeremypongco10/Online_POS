import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind every interface, not just loopback — without this Vite listens
    // on localhost alone and a phone/tablet on the same Wi-Fi gets a
    // connection refused rather than the app.
    host: true,
  },
})
