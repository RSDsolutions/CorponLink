import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Disable HMR temporarily to avoid unexpected full-page reloads during debugging
  server: {
    hmr: false,
    watch: {
      // Ignore changes in Supabase migrations and .git to avoid dev-server reloads
      ignored: ['**/supabase/**', '**/.git/**']
    }
  }
})
