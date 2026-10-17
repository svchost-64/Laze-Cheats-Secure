import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { sameOrigin, isAdmin, safeCatalog, body } from '../api/_security.js';
import catalogHandler from '../api/catalog.js';
import configHandler from '../api/config.js';
import adminHandler from '../api/admin.js';
import paymentsHandler from '../api/payments.js';

const makeRes=()=>({
  headers:{},statusCode:200,data:null,
  setHeader(k,v){this.headers[k.toLowerCase()]=v;return this},
  status(n){this.statusCode=n;return this},
  json(x){this.data=x;return this}
});
const request=(method,path,{origin,host='store.example.test',cookie,body:payload,forwardedHost}={})=>({
  method,url:path,headers:{host,...(origin?{origin}:{}),...(cookie?{cookie}:{}),...(forwardedHost?{'x-forwarded-host':forwardedHost}:{}),...(payload?{'content-type':'application/json'}:{})},body:payload
});
const preserve={...process.env};
function clearPaymentEnv(){for(const key of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','ENABLE_YAPE_PAYMENTS','ENABLE_PAYPAL_PAYMENTS','ENABLE_LIVE_PAYMENTS','PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','TURNSTILE_SECRET_KEY','PAYMENTS_SCRIPT_URL','APPS_SCRIPT_SHARED_SECRET'])delete process.env[key]}
function restore(){for(const k of Object.keys(process.env))if(!(k in preserve))delete process.env[k];for(const [k,v] of Object.entries(preserve))process.env[k]=v;}

test('origin validation rejects forwarded host spoofing and cross-site POSTs',()=>{
  process.env.NODE_ENV='production';
  assert.equal(sameOrigin(request('POST','/api/admin',{origin:'https://store.example.test'})),true);
  assert.equal(sameOrigin(request('POST','/api/admin',{origin:'https://evil.test',forwardedHost:'evil.test'})),false);
  assert.equal(sameOrigin(request('POST','/api/admin',{origin:'http://store.example.test'})),false);
  assert.equal(sameOrigin(request('POST','/api/admin',{})),false);
  restore();
});

test('invalid and expired admin cookies are rejected; valid cookies are httpOnly server-side sessions',()=>{
  process.env.ADMIN_SESSION_SECRET='unit-tests-only-not-a-deployment-secret-1234567890';
  assert.equal(isAdmin(request('GET','/api/admin')),false);
  assert.equal(isAdmin(request('GET','/api/admin',{cookie:'__Host-laze_admin=forged.invalid'})),false);
  const token=expiration=>{
    const payload=Buffer.from(JSON.stringify({role:'admin',expires:expiration})).toString('base64url');
    const signature=crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url');
    return `__Host-laze_admin=${payload}.${signature}`;
  };
  assert.equal(isAdmin(request('GET','/api/admin',{cookie:token(Date.now()+60_000)})),true);
  assert.equal(isAdmin(request('GET','/api/admin',{cookie:token(Date.now()-1000)})),false);
  restore();
});

test('catalog validation excludes arbitrary fields and rejects scriptable images',()=>{
  const data={products:[{id:'ok',name:'Test',cat:'Digital',price:10,desc:'',link:'',tut:'',video:'',images:[],secret:'should-not-be-public'}],tutorials:[]};
  assert.equal('secret' in safeCatalog(data).products[0],false);
  data.products[0].images=['javascript:alert(1)'];
  assert.throws(()=>safeCatalog(data),/Producto/);
});

test('large POST body metadata is rejected before processing',()=>{
  assert.throws(()=>body({headers:{'content-length':'10000'},body:{x:1}},100),/grande/);
});

test('public GET routes work without Redis and do not disclose secrets',async()=>{
  clearPaymentEnv();
  process.env.GROQ_API_KEY='UNIT_TEST_SECRET_ONLY';
  process.env.ADMIN_SESSION_SECRET='UNIT_TEST_COOKIE_SECRET_ONLY';
  const a=makeRes();await catalogHandler(request('GET','/api/catalog'),a);
  assert.equal(a.statusCode,200);assert.ok(a.data.products.length>0);
  assert.ok(!JSON.stringify(a.data).includes('UNIT_TEST_SECRET_ONLY'));
  const b=makeRes();await configHandler(request('GET','/api/config'),b);
  assert.equal(b.statusCode,200);assert.equal(b.data.paypalClientId,'');
  assert.ok(!JSON.stringify(b.data).includes('UNIT_TEST_SECRET_ONLY'));
  const c=makeRes();await adminHandler(request('GET','/api/admin'),c);
  assert.deepEqual(c.data,{authenticated:false});
  restore();
});

test('admin mutations cannot be performed cross-site or without admin cookie',async()=>{
  const a=makeRes();await adminHandler(request('POST','/api/admin',{origin:'https://evil.test',body:{action:'save',data:{products:[],tutorials:[]}}}),a);
  assert.equal(a.statusCode,403);
  const b=makeRes();await adminHandler(request('POST','/api/admin',{origin:'https://store.example.test',body:{action:'save',data:{products:[],tutorials:[]}}}),b);
  assert.equal(b.statusCode,401);
});

test('all payment routes refuse to initiate payments without explicit configuration',async()=>{
  clearPaymentEnv();
  for(const action of ['prepare_yape','claim_yape','paypal_stock','paypal_create','paypal_capture']){
    const res=makeRes();await paymentsHandler(request('POST','/api/payments',{origin:'https://store.example.test',body:{action,productId:'ok'}}),res);
    assert.equal(res.statusCode,503,action);
    assert.ok(!('key' in res.data),action);
  }
  const denied=makeRes();await paymentsHandler(request('POST','/api/payments',{origin:'https://evil.test',body:{action:'prepare_yape'}}),denied);
  assert.equal(denied.statusCode,403);
  restore();
});
