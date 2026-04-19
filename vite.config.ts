import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: repo name is 'hamaatsume' so the site is served from
// https://<user>.github.io/hamaatsume/. Override with VITE_BASE locally if needed.
const base = process.env.VITE_BASE ?? '/hamaatsume/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
});
