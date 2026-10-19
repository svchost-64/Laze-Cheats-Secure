import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const files=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','.vercel','node_modules','coverage','.next'].includes(entry.name))continue;
    const loc=path.join(dir,entry.name);
    if(entry.isDirectory())walk(loc);
    else if(entry.isFile() && /(?:\.(?:html|js|json|css|md|mjs|yaml|yml|txt|example)|\.env\.example)$/i.test(entry.name))files.push(loc);
  }
}
walk(root);
const findings=[];
const signatures=[
  [/gsk_[A-Za-z0-9]{12,}/g,'Groq credential'],
  [/AIza[0-9A-Za-z_-]{30,}/g,'Google credential'],
  [/sk_(?:live|test)_[A-Za-z0-9]{20,}/g,'Payment credential'],
  [/gh[pousr]_[A-Za-z0-9_]{25,}/g,'GitHub credential'],
  [/AKIA[0-9A-Z]{16}/g,'AWS credential'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,'Private key'],
  [/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{40,}\/exec/g,'Apps Script deployment URL'],
  [/const\s+(?:DEFAULT_PASS|ADMIN_PASSWORD|API_SECRET)\s*=\s*['"][^'"]+['"]/g,'Hard-coded credential'],
];
for(const file of files){
  // Vendored, minified libraries are immutable assets and are covered by SHA-256 manifest.
  if(/(?:three|gsap)\.min\.js$/.test(file)||/\/(?:all|remixicon)\.min\.css$/.test(file))continue;
  const data=fs.readFileSync(file,'utf8');
  for(const [pattern,label] of signatures){
    pattern.lastIndex=0;
    if(pattern.test(data))findings.push(`${label}: ${path.relative(root,file)}`);
  }
  if(!/\.env\.example$/.test(file) && /(?:^|\n)\s*(?:GROQ_API_KEY|PAYPAL_CLIENT_SECRET|ADMIN_SESSION_SECRET|TURNSTILE_SECRET_KEY|APPS_SCRIPT_SHARED_SECRET|UPSTASH_REDIS_REST_TOKEN)\s*=\s*[^\s#]+/m.test(data))
    findings.push(`Possible inline environment secret: ${path.relative(root,file)}`);
}
const scripts=[...fs.readFileSync('index.html','utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
if(scripts.some(x=>x[1].trim()))findings.push('Inline script in index.html');
const data=JSON.parse(fs.readFileSync('data.json','utf8'));
if(!Array.isArray(data.products)||!Array.isArray(data.tutorials))findings.push('Invalid seed catalog');
if(findings.length){for(const issue of findings)console.error('FAIL:',issue);process.exit(1)}
console.log(`OK: ${files.length} text files checked; no known credential patterns`);
