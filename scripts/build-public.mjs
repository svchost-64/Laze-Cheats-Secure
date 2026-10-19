import { readFile, writeFile, mkdir, rm, cp, copyFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = (p) => path.join(root, p);
const out = (p) => path.join(root, 'dist', p);

// A deliberate allowlist is safer than deploying the repository root.
await rm(from('dist'), { recursive: true, force: true });
await mkdir(out('CSS'), { recursive: true });
await mkdir(out('js'), { recursive: true });
await cp(from('images'), out('images'), { recursive: true });
await cp(from('fonts'), out('fonts'), { recursive: true });

for (const p of ['CSS/all.min.css', 'CSS/remixicon.min.css', 'js/gsap.min.js', 'js/three.min.js']) {
  await copyFile(from(p), out(p));
}

for (const p of ['CSS/site.css', 'js/app.js', 'js/security-client.js', 'js/chat.js', 'js/inspection-deterrent.js', 'yape-pago.js']) {
  const source = await readFile(from(p), 'utf8');
  const result = await transform(source, {
    loader: p.endsWith('.css') ? 'css' : 'js',
    minify: true,
    target: 'es2020',
    sourcemap: false,
    legalComments: 'none',
    charset: 'utf8',
  });
  await writeFile(out(p), result.code, { mode: 0o644 });
}

let html = await readFile(from('index.html'), 'utf8');
if (!html.includes('<script src="yape-pago.js"></script>')) {
  throw new Error('Expected checkout script not found in index.html');
}
html = html.replace(/<!--[\s\S]*?-->/g, '');
const inspectionAsset = await readFile(out('js/inspection-deterrent.js'));
const inspectionVersion = createHash('sha256').update(inspectionAsset).digest('hex').slice(0, 12);
html = html.replace('</body>', `<script defer src="js/inspection-deterrent.js?v=${inspectionVersion}"></script>\n</body>`);
await writeFile(out('index.html'), html, { mode: 0o644 });
console.log('Created dist/ with only allowlisted public assets; no source maps.');
