import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const allow = new Set([
  'index.html',
  'yape-pago.js',
  'CSS/site.css', 'CSS/all.min.css', 'CSS/remixicon.min.css',
  'js/app.js', 'js/security-client.js', 'js/chat.js', 'js/inspection-deterrent.js',
  'js/gsap.min.js', 'js/three.min.js',
]);
const publicPrefixes = ['images/', 'fonts/'];
async function collect(dir, names = []) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) await collect(full, names);
    else if (ent.isFile()) names.push(path.relative(dist, full).replaceAll(path.sep, '/'));
  }
  return names;
}
const names = await collect(dist);
for (const name of names) {
  assert(allow.has(name) || publicPrefixes.some(p => name.startsWith(p)), `Not allowlisted: ${name}`);
  assert(!name.endsWith('.map'), `Source map published: ${name}`);
}
for (const required of allow) assert(names.includes(required), `Missing public asset: ${required}`);
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
for (const script of ['js/app.js', 'js/security-client.js', 'js/chat.js', 'js/inspection-deterrent.js', 'yape-pago.js']) {
  assert(html.includes(script), `Script not loaded: ${script}`);
}
for (const file of ['js/app.js', 'js/security-client.js', 'js/chat.js', 'js/inspection-deterrent.js', 'yape-pago.js']) {
  const code = await readFile(path.join(dist, file), 'utf8');
  assert(!code.includes('sourceMappingURL'), `Source map reference in ${file}`);
  assert((await stat(path.join(dist, file))).size > 100, `Unexpectedly small asset: ${file}`);
}
console.log(`OK: only ${names.length} allowlisted static assets, no source maps or internal files`);
