import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const scrypt = promisify(crypto.scrypt);
let redisInstance;
const rateLimiters = new Map();

export function redis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) throw Error('Redis no configurado');
  if (!redisInstance) redisInstance = Redis.fromEnv();
  return redisInstance;
}
export function securityHeaders(res) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Vary','Origin');
}
export function json(res,status,data) {securityHeaders(res);res.status(status).json(data);}
export function clientIP(req) {
  // x-vercel-forwarded-for is provided by Vercel; untrusted arbitrary caller headers are not a security boundary.
  const raw = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || 'unknown';
  return String(Array.isArray(raw)?raw[0]:raw).split(',')[0].trim().slice(0,90);
}
export function sameOrigin(req) {
  const origin=req.headers.origin;
  if (!origin || typeof origin !== 'string')return false;
  try {
    const u=new URL(origin);
    // Compare against the routing host, not the caller-controlled forwarded host.
    const host=String(req.headers.host||'').trim().toLowerCase();
    if(!/^[a-z0-9.-]+(?::[0-9]{2,5})?$/.test(host))return false;
    return u.host===host && (u.protocol==='https:' || (process.env.NODE_ENV!=='production' && u.protocol==='http:'));
  } catch {return false;}
}
export async function rate(req,bucket,limit,period='1 m',id=clientIP(req)){
  const identifier=bucket+':'+id;
  const key=bucket+':'+limit+':'+period;
  let r=rateLimiters.get(key);
  if (!r) {r=new Ratelimit({redis:redis(),limiter:Ratelimit.slidingWindow(limit,period),prefix:'laze:'+bucket,analytics:false});rateLimiters.set(key,r);}
  const result=await r.limit(identifier);
  return result.success;
}
export async function captcha(token,req){
  if(!process.env.TURNSTILE_SECRET_KEY)return false;
  if(typeof token!=='string'||!token||token.length>2048)return false;
  const form=new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token,remoteip:clientIP(req)});
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)return false;
  const valid=await response.json();
  if(!valid.success)return false;
  const allow=String(process.env.TURNSTILE_ALLOWED_HOSTNAMES||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  if(!allow.length)return false; // fail closed if whitelist is absent
  return allow.includes(String(valid.hostname||'').toLowerCase());
}
export function body(req,max=15000){
  const claimed=Number(req.headers?.['content-length']);
  if(Number.isFinite(claimed) && claimed>max)throw Error('Solicitud demasiado grande');
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!data||typeof data!=='object'||Array.isArray(data)||Buffer.byteLength(JSON.stringify(data))>max)throw Error('Datos inválidos');
  return data;
}
export async function passwordMatches(password){
  const full=process.env.ADMIN_PASSWORD_HASH||'';
  const parts=full.split('$');
  if(parts.length!==3||parts[0]!=='scrypt'||typeof password!=='string'||password.length>256)return false;
  const salt=Buffer.from(parts[1],'hex'), expected=Buffer.from(parts[2],'hex');
  if(salt.length!==16||expected.length!==64)return false;
  const calculated=await scrypt(password,salt,64);
  return crypto.timingSafeEqual(calculated,expected);
}
function cookieKey(){
  const s=process.env.ADMIN_SESSION_SECRET||'';
  if(s.length<32)throw Error('ADMIN_SESSION_SECRET no configurado');
  return s;
}
export function setAdminCookie(res){
  const payload=Buffer.from(JSON.stringify({role:'admin',expires:Date.now()+1000*60*60*4})).toString('base64url');
  const signature=crypto.createHmac('sha256',cookieKey()).update(payload).digest('base64url');
  res.setHeader('Set-Cookie',`__Host-laze_admin=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=14400`);
}
export function clearAdminCookie(res){res.setHeader('Set-Cookie','__Host-laze_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');}
export function isAdmin(req){
  try{
    const cookies=String(req.headers.cookie||'').split(';').map(x=>x.trim());
    const value=cookies.find(x=>x.startsWith('__Host-laze_admin='))?.split('=')[1]||'';
    const [payload,sig]=value.split('.');
    if(!payload||!sig||payload.length>300)return false;
    const expected=crypto.createHmac('sha256',cookieKey()).update(payload).digest('base64url');
    const a=Buffer.from(sig),b=Buffer.from(expected);
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return false;
    const session=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return session.role==='admin' && Number.isFinite(session.expires) && session.expires>Date.now();
  }catch{return false;}
}
export function safeCatalog(value){
  if(!value||!Array.isArray(value.products)||!Array.isArray(value.tutorials)||value.products.length>250||value.tutorials.length>100)throw Error('Catalogo inválido');
  const validId=x=>typeof x==='string' && /^[a-zA-Z0-9_-]{1,50}$/.test(x);
  const str=(v,n)=>typeof v==='string'&&v.length<=n;
  const safeImage=x=>typeof x==='string'&& x.length<350000 && (/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(x)||/^https:\/\/(?:images\.unsplash\.com|i\.ytimg\.com)\/[\w./?&=%-]+$/.test(x));
  for(const p of value.products){
    if(!validId(p.id)||!str(p.name,80)||!p.name.trim()||typeof p.price!=='number'||!Number.isFinite(p.price)||p.price<=0||p.price>100000||!str(p.cat,30)||!str(p.desc,1200)||!str(p.link,400)||!str(p.tut,50)||!str(p.video,11)|| (p.video && !/^[a-zA-Z0-9_-]{11}$/.test(p.video)) || !Array.isArray(p.images)||p.images.length>8||!p.images.every(safeImage))throw Error('Producto inválido');
    if(p.link && !/^https:\/\/[^\s"<>]+$/.test(p.link))throw Error('Enlace inválido');
  }
  for(const t of value.tutorials) if(!validId(t.id)||!str(t.title,120)||!str(t.desc,1500)||!str(t.vid,11)||!/^[a-zA-Z0-9_-]{11}$/.test(t.vid))throw Error('Tutorial inválido');
  return {products:value.products.map(({id,name,price,cat,desc,link,video,tut,images})=>({id,name,price,cat,desc,link,video,tut,images})),tutorials:value.tutorials.map(({id,title,desc,vid})=>({id,title,desc,vid}))};
}
