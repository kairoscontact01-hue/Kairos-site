import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'public');
await mkdir(output, { recursive: true });
// Only this allowlist is public. Server code, environment files and SQL stay private.
const pages = ['index.html', 'inscription.html', 'mon-profil.html', 'profils.html', 'confidentialite.html'];
for (const name of [...pages, 'style.css', 'script.js', 'logo-kairos.png']) {
  await copyFile(resolve(root, name), resolve(output, name));
}
let config = await readFile(resolve(root, 'config.js'), 'utf8');
const key = process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.Clerk_publishable_key;
if (key) {
  if (!/^pk_(test|live)_[A-Za-z0-9_-]+$/.test(key.trim())) throw new Error('CLERK_PUBLISHABLE_KEY must be a Clerk public key.');
  config = `window.KAIROS_CONFIG = Object.freeze(${JSON.stringify({ clerkPublishableKey: key.trim(), apiBase: '' })});\n`;
}
await writeFile(resolve(output, 'config.js'), config);
// New asset URLs prevent an older cached controller from displaying obsolete banners.
const versions = {};
for (const name of ['style.css', 'script.js', 'config.js']) versions[name] = createHash('sha256').update(await readFile(resolve(output, name))).digest('hex').slice(0, 12);
for (const name of pages) {
  let html = await readFile(resolve(output, name), 'utf8');
  html = html.replace(/(href|src)="(style\.css|script\.js|config\.js)(?:\?[^"\s]*)?"/g, (_, attr, asset) => `${attr}="${asset}?v=${versions[asset]}"`);
  await writeFile(resolve(output, name), html);
}
console.log('Kairos: les pages et fichiers publics sont prêts.');
