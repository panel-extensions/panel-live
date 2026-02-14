import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Treat .py imports as raw text (matches esbuild's { '.py': 'text' } loader)
  assetsInclude: ['**/*.py'],
  plugins: [{
    name: 'py-raw-loader',
    transform(code, id) {
      if (id.endsWith('.py')) {
        return { code: `export default ${JSON.stringify(code)}`, map: null };
      }
    },
  }],
  test: {
    environment: 'jsdom',
    include: ['tests/js/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.js'],
      exclude: ['lib/panel-live.css'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage/js',
    },
  },
});
