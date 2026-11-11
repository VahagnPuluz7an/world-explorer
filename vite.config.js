import { defineConfig } from 'vite';
// GitHub Pages serves the site from /<repo>/
export default defineConfig({ base: process.env.BASE_PATH || '/' });
