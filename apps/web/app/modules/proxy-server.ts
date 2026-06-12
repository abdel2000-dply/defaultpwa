import { defineNuxtModule } from '@nuxt/kit';
            
export default defineNuxtModule({
  meta: {
    name: 'proxy-server',
  },
  setup(options, nuxt) {
    nuxt.options.vite.server = nuxt.options.vite.server || {};
    nuxt.options.vite.server.proxy = {
      ...nuxt.options.vite.server.proxy,
      '/rest': {
        target: 'http://localhost:8182',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    };
  },
});
