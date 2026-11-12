import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      devOptions: {
        enabled: false
      },
      includeAssets: ['favicon.ico', 'icons/*.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Planificador de comidas',
        short_name: 'Planificador',
        description: 'Organiza el menú familiar y lista de la compra',
        theme_color: '#427A58',
        background_color: '#F5F7F4',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'es',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
})
