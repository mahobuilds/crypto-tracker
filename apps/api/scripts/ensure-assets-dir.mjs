// wrangler refuses to start when the static assets directory is missing.
// During development the SPA is served by Vite, so an empty directory is enough.
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(resolve(here, '../../web/dist'), { recursive: true });
