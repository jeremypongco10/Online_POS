import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Serves the dev server over HTTPS with a certificate trusted by this
    // machine, so a tablet's "Add to Home Screen" installs a real
    // chrome-free app instead of a plain bookmark — Chrome only offers
    // that for a secure context. On first run this generates a local CA
    // (installed automatically into Windows' trust store) plus a
    // certificate for the hosts below; the CA itself still has to be
    // copied onto any OTHER device (e.g. the tablet) and trusted there by
    // hand. The plugin wires server.https up itself on this Vite version
    // (5+) — setting it here too is not just redundant but a type error,
    // since this Vite version no longer accepts a bare boolean for it.
    mkcert({ hosts: ['localhost', '127.0.0.1', '192.168.100.59'] }),
  ],
  server: {
    // Bind every interface, not just loopback — without this Vite listens
    // on localhost alone and a phone/tablet on the same Wi-Fi gets a
    // connection refused rather than the app.
    host: true,
    proxy: {
      // The backend (PHP's built-in server) can't terminate TLS itself,
      // so rather than certificate-and-trust this second origin too, the
      // browser only ever talks to this one HTTPS server; Vite forwards
      // API calls on to the plain-HTTP backend itself, machine-to-machine,
      // where no browser ever sees the unencrypted hop. See VITE_API_URL
      // in .env.local, which points here instead of straight at :8080.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
