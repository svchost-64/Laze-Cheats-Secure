import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const all=[];
function scan(folder){for(const f of fs.readdirSync(folder,{withFileTypes:true})){
  if(['node_modules','.git','.vercel'].includes(f.name))continue;
  const p=path.join(folder,f.name);if(f.isDirectory())scan(p);else if(/\.(?:html|js|json|css|md)$/i.test(f.name))all.push(p);
}}
scan(root);
let failed=false;
for(const p of all){const s=fs.readFileSync(p,'utf8');
 const patterns=[[/gsk_[A-Za-z0-9]{12,}/g,'Groq API key'],[/AIza[0-9A-Za-z_-]{30,}/g,'Google API key'],[/sk_(?:live|test)_[0-9A-Za-z]{20,}/g,'Secret key'],[/const\s+DEFAULT_PASS\s*=/g,'Hardcoded admin password'],[/script\.google\.com\/macros\/s\/\w{40,}\/exec/g,'Exposed Apps Script URL']];
 for(const [re,desc] of patterns) if(re.test(s)){console.error('FAIL:',desc,'in',path.relative(root,p));failed=true;}
}
const html=fs.readFileSync('index.html','utf8');
if(/<script>([\s\S]*?)<\/script>/.test(html)){console.error('FAIL: inline script');failed=true;}
const keys=Object.keys(JSON.parse(fs.readFileSync('data.json','utf8')));
if(!keys.includes('products')||!keys.includes('tutorials')){console.error('FAIL: catalog');failed=true;}
if(failed)process.exit(1);console.log('OK: static scans, no obvious embedded secrets or inline scripts.');
