import { defineConfig } from 'vite';

const APP_VERSION = process.env.npm_package_version || process.env.APP_VERSION || '0.0.0';

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
});

