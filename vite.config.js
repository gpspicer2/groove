import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Dev-only: lets `npm run dev` also serve the /api/* serverless functions,
// so the whole app (frontend + backend) runs with one command locally.
// In production, Vercel deploys the same /api files as real serverless
// functions on its own — this plugin never runs there.
function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();

        const routePath = req.url.split('?')[0].replace(/^\/api\//, '');
        const filePath = path.join(process.cwd(), 'api', `${routePath}.js`);

        let mod;
        try {
          mod = await server.ssrLoadModule(filePath);
        } catch (e) {
          console.error('api-dev-middleware: could not load', filePath, e);
          res.statusCode = 404;
          res.end('Not found');
          return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async () => {
          try {
            req.body = body ? JSON.parse(body) : {};
          } catch {
            req.body = {};
          }
          res.status = (code) => { res.statusCode = code; return res; };
          res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };
          try {
            await mod.default(req, res);
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal error' }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), tailwindcss(), apiDevMiddleware()],
  };
});
