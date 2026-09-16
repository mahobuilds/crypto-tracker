// Creates a local development user and session in the local D1 database and prints
// a signed session cookie, so the API can be exercised without Google sign-in.
// Usage (from apps/api, after `pnpm db:migrate:local`; shell:true is needed on Windows for pnpm.cmd):
//   node scripts/seed-dev-session.mjs
// Then call the API with:  -H "Cookie: <printed cookie>"
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(here, '..');

const devVars = readFileSync(resolve(apiDir, '.dev.vars'), 'utf8');
const secret = devVars.match(/^BETTER_AUTH_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error('BETTER_AUTH_SECRET missing from apps/api/.dev.vars');

const userId = 'dev-user';
const sessionId = 'dev-session';
const token = 'dev-session-token';
const now = Date.now();
const expires = now + 30 * 24 * 60 * 60 * 1000;

const sql = [
  `INSERT OR IGNORE INTO user (id, name, email, email_verified, image, created_at, updated_at)
   VALUES ('${userId}', 'Dev User', 'dev@example.com', 1, NULL, ${now}, ${now});`,
  `INSERT OR REPLACE INTO session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
   VALUES ('${sessionId}', ${expires}, '${token}', ${now}, ${now}, NULL, 'seed-script', '${userId}');`,
].join(' ');

const tmp = mkdtempSync(resolve(tmpdir(), 'seed-'));
const sqlFile = resolve(tmp, 'seed.sql');
writeFileSync(sqlFile, sql);
try {
  execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      'crypto_tracker_db',
      '--local',
      '--yes',
      '--file',
      sqlFile,
    ],
    { cwd: apiDir, stdio: 'inherit', shell: process.platform === 'win32' },
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign'],
);
const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token));
const signature = Buffer.from(sig).toString('base64');
const cookieValue = encodeURIComponent(`${token}.${signature}`);

console.log('');
console.log(`better-auth.session_token=${cookieValue}`);
