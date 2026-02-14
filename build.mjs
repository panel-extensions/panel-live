import { build } from 'esbuild';

const isDev = process.argv.includes('--dev');

// Bundle main JS (with .py files imported as text strings)
await build({
  entryPoints: ['lib/index.js'],
  bundle: true,
  outfile: 'dist/panel-live.js',
  format: 'iife',
  minify: !isDev,
  sourcemap: true,
  target: ['es2020'],
  loader: { '.py': 'text' },
});

// Bundle worker JS (runs in Dedicated Worker context)
await build({
  entryPoints: ['lib/panel-live-worker.js'],
  bundle: true,
  outfile: 'dist/panel-live-worker.js',
  format: 'iife',
  minify: !isDev,
  sourcemap: true,
  target: ['es2020'],
  loader: { '.py': 'text' },
});

// Copy CSS (minify in production)
await build({
  entryPoints: ['lib/panel-live.css'],
  bundle: true,
  outfile: 'dist/panel-live.css',
  minify: !isDev,
  sourcemap: true,
});

console.log(isDev ? 'Dev build complete' : 'Production build complete');
