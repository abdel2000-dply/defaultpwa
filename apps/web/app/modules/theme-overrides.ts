import { defineNuxtModule } from '@nuxt/kit';
import fs from 'fs';
import path from 'path';

interface Options {
  pagesDir: string;
  componentsDir: string;
  themeDir: string;
}

export default defineNuxtModule<Partial<Options>>({
  meta: { name: 'theme-overrides' },
  defaults: {
    pagesDir: 'pages',
    componentsDir: 'components',
    themeDir: 'default_theme',
  },
  setup(rawOpts, nuxt) {
    const opts = { ...rawOpts } as Required<Options>;

    // All paths are relative to srcDir (app/) since theme is now in app/
    const r = (...p: string[]) => path.resolve(nuxt.options.srcDir, ...p);
    const corePagesDir = r(opts.pagesDir);
    const themePagesDir = r(opts.themeDir, opts.pagesDir);
    const coreComponentsDir = r(opts.componentsDir);
    const themeComponentsDir = r(opts.themeDir, opts.componentsDir);

    const vueFilesUnder = (root: string): string[] => {
      const list: string[] = [];
      function walk(absDir: string, rel = '') {
        for (const e of fs.readdirSync(absDir, { withFileTypes: true })) {
          const nextRel = path.posix.join(rel, e.name);
          const nextAbs = path.join(root, nextRel);
          e.isDirectory() ? walk(nextAbs, nextRel) : e.name.endsWith('.vue') && list.push(nextRel);
        }
      }
      if (fs.existsSync(root)) walk(root);
      return list;
    };

    nuxt.hook('pages:extend', (pages) => {
      const existingRoutes = new Set(pages.map((p) => p.path));
      pages.forEach((p) => {
        if (!p.file) return;
        const rel = path.relative(corePagesDir, p.file).replace(/\\/g, '/');
        const themed = path.join(themePagesDir, rel);
        if (themed !== p.file && fs.existsSync(themed) && fs.statSync(themed).isFile()) {
          p.file = themed;
          console.log(`🎨 This page ${rel} is loaded from the theme : ${opts.themeDir}`);
        }
      });
      vueFilesUnder(themePagesDir).forEach((rel) => {
        const route = '/' + rel.replace(/\.vue$/, '').replace(/\/index$/, '') || '/';
        if (existingRoutes.has(route)) return;
        pages.push({ path: route, file: path.join(themePagesDir, rel) });
      });
    });

    const toPosix = (p: string) => p.replace(/\\/g, '/');

    nuxt.hook('components:extend', (list) => {
      const seen = new Set<string>();
      for (let i = list.length - 1; i >= 0; i--) {
        const c = list[i];
        if (!c || !c.filePath) continue;
        
        // Only try to override components from the core directory
        const rel = toPosix(path.relative(coreComponentsDir, c.filePath));
        
        // Check if component is actually from core (not from node_modules or elsewhere)
        if (rel.startsWith('..')) continue;
        
        const twin = toPosix(path.join(themeComponentsDir, rel));
        if (fs.existsSync(twin) && fs.statSync(twin).isFile()) {
          c.filePath = twin;
          if (c.filePath.endsWith('.vue')) {
            console.log('✅ Component overridden →', c.pascalName);
          }
        }
        if (c.pascalName && seen.has(c.pascalName)) list.splice(i, 1);
        else if (c.pascalName) seen.add(c.pascalName);
      }
    });
  },
});
