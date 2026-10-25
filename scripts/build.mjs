import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'public');
await mkdir(output, { recursive: true });
// Only this allowlist is public. Server code, environment files and SQL stay private.
for (const name of ['index.html', 'inscription.html', 'profils.html', 'confidentialite.html', 'style.css', 'script.js', 'logo-kairos.png']) {
  await copyFile(resolve(root, name), resolve(output, name));
}
let config = await readFile(resolve(root, 'config.js'), 'utf8');
const key = process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (key) {
  if (!/^pk_(test|live)_[A-Za-z0-9_-]+$/.test(key.trim())) throw new Error('CLERK_PUBLISHABLE_KEY must be a Clerk public key.');
  config = `window.KAIROS_CONFIG = Object.freeze(${JSON.stringify({ clerkPublishableKey: key.trim(), apiBase: '' })});\n`;
}
await writeFile(resolve(output, 'config.js'), config);
console.log('Kairos: les pages et fichiers publics sont prêts.');
