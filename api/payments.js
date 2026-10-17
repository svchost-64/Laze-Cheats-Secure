import crypto from 'node:crypto';
import {json,body,rate,captcha,sameOrigin,redis} from './_security.js';
import {productById} from './_catalog.js';

const scriptActions=new Set(['claim','paypal_stock','paypal_claim']);
const orderKey=(channel,id)=>`laze:order:${channel}:${id}`;
const penPerUsd=()=>{
  const x=Number(process.env.PAYPAL_PEN_PER_USD||3.75);
  if(!Number.isFinite(x)||x<=0||x>100)throw Error('Tasa no configurada');
  return x;
};
async function script(payload){
  if(!scriptActions.has(payload.action))throw Error('Acción inválida');
  const url=process.env.PAYMENTS_SCRIPT_URL||'';
  if(!process.env.APPS_SCRIPT_SHARED_SECRET || process.env.APPS_SCRIPT_SHARED_SECRET.length<32)throw Error('Secret de pagos no configurado');
  payload.authToken=process.env.APPS_SCRIPT_SHARED_SECRET;
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_\-]+\/exec$/.test(url))throw Error('Script no configurado');
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000),redirect:'follow'});
  if(!r.ok)throw Error('Servicio externo temporalmente no disponible');
  const text=await r.text();if(text.length>10000)throw Error('Respuesta externa inválida');
  const response=JSON.parse(text);
  if(!response||typeof response!=='object')throw Error('Respuesta externa inválida');
  return response;
}
const paypalBase=()=>{if(!['sandbox','live'].includes(process.env.PAYPAL_MODE))throw Error('PAYPAL_MODE debe ser live o sandbox');return process.env.PAYPAL_MODE==='sandbox'?'https://api-m.sandbox.paypal.com':'https://api-m.paypal.com';};
async function paypalToken(){
  const id=process.env.PAYPAL_CLIENT_ID,secret=process.env.PAYPAL_CLIENT_SECRET;
  if(!id||!secret)throw Error('PayPal no configurado');
  const auth=Buffer.from(`${id}:${secret}`).toString('base64');
  const response=await fetch(paypalBase()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('PayPal OAuth');
  const data=await response.json();
  if(!data.access_token)throw Error('PayPal OAuth');
  return data.access_token;
}
async function paypalFetch(urlPath,method='GET',payload,requestID){
  const token=await paypalToken();
  const headers={'Authorization':`Bearer ${token}`,'Content-Type':'application/json','Prefer':'return=representation'};
  if(requestID)headers['PayPal-Request-Id']=requestID;
  const res=await fetch(paypalBase()+urlPath,{method,headers,body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(15000)});
  const data=await res.json().catch(()=>({}));
  return {ok:res.ok,status:res.status,data};
}
const cents=x=>Math.round(Number(x)*100);
const responseText=r=>String(r.message||'').slice(0,200);
const idRegex=/^[a-zA-Z0-9_-]{1,60}$/;

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{message:'Método no permitido'});
  if(!sameOrigin(req))return json(res,403,{message:'Origen inválido'});
  try{
    const b=body(req,5500);
    if(!await rate(req,'payments',12,'1 m'))return json(res,429,{message:'Demasiadas solicitudes'});
    if(!await rate(req,'payments-global',500,'1 m','global'))return json(res,429,{message:'Servicio ocupado'});
    if(!['prepare_yape','claim_yape','paypal_stock','paypal_create','paypal_capture'].includes(b.action))return json(res,400,{message:'Acción desconocida'});
    // Order preparation requires server catalog and server price, not browser price.
    if(b.action==='prepare_yape'){
      if(!await rate(req,'orders-create',5,'1 m'))return json(res,429,{message:'Límite de órdenes'});
      const p=await productById(b.productId);if(!p)return json(res,404,{message:'Producto no encontrado'});
      const num=crypto.randomBytes(9).toString('hex');
      const total=+(p.price+.10).toFixed(2);
      const usd=Math.max(.01,Math.round(p.price/penPerUsd()*100)/100);
      await redis().set(orderKey('yape',num),{id:p.id,name:p.name,amount:total},{ex:1200});
      return json(res,200,{ok:true,name:p.name,base:p.price,ident:.10,total,usd,orderId:num});
    }
    if(!await captcha(b.turnstile,req))return json(res,403,{message:'Verificación antirobot fallida'});
    if(b.action==='claim_yape'){
      if(typeof b.orderId!=='string'||!idRegex.test(b.orderId)||typeof b.code!=='string'||!/^[0-9]{3}$/.test(b.code))return json(res,400,{message:'Datos inválidos'});
      const order=await redis().get(orderKey('yape',b.orderId));
      if(!order)return json(res,410,{message:'La orden expiró'});
      if(!await rate(req,'yape-attempts',5,'20 m',b.orderId))return json(res,429,{message:'Demasiados intentos en esta orden'});
      const r=await script({action:'claim',code:b.code,amount:order.amount,orderId:b.orderId,product:order.name});
      if(r.ok){await redis().del(orderKey('yape',b.orderId));return json(res,200,{ok:true,message:responseText(r),key:typeof r.key==='string'?r.key.slice(0,250):null});}
      return json(res,200,{ok:false,message:responseText(r)||'Pago aún no confirmado'});
    }
    if(b.action==='paypal_stock'){
      const p=await productById(b.productId);if(!p)return json(res,404,{message:'Producto no encontrado'});
      const r=await script({action:'paypal_stock',product:p.name});
      return json(res,200,{ok:r.ok===true,stock:Number(r.stock)||0,message:responseText(r)});
    }
    if(b.action==='paypal_create'){
      if(!await rate(req,'paypal-create',4,'1 m'))return json(res,429,{message:'Límite de órdenes'});
      const p=await productById(b.productId);if(!p)return json(res,404,{message:'Producto no encontrado'});
      const r=await script({action:'paypal_stock',product:p.name});
      if(!r.ok||!(r.stock>0))return json(res,409,{message:'Producto sin stock'});
      const amount=(Math.max(1,cents(p.price/penPerUsd()))/100).toFixed(2);
      const random=crypto.randomUUID();
      const create=await paypalFetch('/v2/checkout/orders','POST',{intent:'CAPTURE',purchase_units:[{reference_id:p.id,description:p.name.slice(0,120),custom_id:random,amount:{currency_code:'USD',value:amount}}]},random);
      if(!create.ok||!create.data.id)return json(res,502,{message:'No se pudo crear la orden PayPal'});
      await redis().set(orderKey('paypal',create.data.id),{productId:p.id,name:p.name,amount,orderId:random},{ex:86400});
      return json(res,200,{ok:true,orderID:create.data.id});
    }
    if(b.action==='paypal_capture'){
      if(typeof b.orderID!=='string'||!/^[A-Z0-9]{8,40}$/.test(b.orderID))return json(res,400,{message:'ID inválido'});
      const row=await redis().get(orderKey('paypal',b.orderID));
      if(!row)return json(res,410,{message:'Orden inexistente o expirada'});
      if(await redis().get(`laze:delivered:${b.orderID}`))return json(res,200,{ok:true,message:'Orden entregada previamente. Contacta a soporte si no guardaste tu clave.'});
      const lock=await redis().set(`laze:claim-lock:${b.orderID}`,'1',{nx:true,ex:90});
      if(lock!=='OK')return json(res,409,{message:'La orden se está procesando'});
      try{
        let pp=await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(b.orderID)}`);
        if(!pp.ok)throw Error('No fue posible consultar PayPal');
        if(pp.data.status==='APPROVED'){
          const captured=await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(b.orderID)}/capture`,'POST',{},row.orderId);
          if(!captured.ok)throw Error('PayPal no confirmó el pago');
          pp=captured;
        }
        const units=pp.data.purchase_units||[];
        const unit=units[0];
        const cap=unit?.payments?.captures?.find(c=>c.status==='COMPLETED');
        if(pp.data.status!=='COMPLETED'||units.length!==1||!cap||unit.reference_id!==row.productId||unit.custom_id!==row.orderId||cap.amount?.currency_code!=='USD'||cents(cap.amount?.value)!==cents(row.amount))return json(res,409,{message:'Pago no verificado'});
        const delivery=await script({action:'paypal_claim',orderID:b.orderID,orderId:row.orderId,product:row.name});
        if(!delivery.ok)return json(res,502,{message:'Pago confirmado; entrega pendiente. No pagues otra vez, reintenta o contacta soporte.'});
        await redis().set(`laze:delivered:${b.orderID}`,'1',{ex:2592000});
        return json(res,200,{ok:true,message:responseText(delivery),key:typeof delivery.key==='string'?delivery.key.slice(0,250):null});
      }finally{await redis().del(`laze:claim-lock:${b.orderID}`);}
    }
  }catch(e){console.error('payment error',e?.message);return json(res,503,{message:'Servicio no disponible temporalmente; si ya pagaste, no pagues otra vez.'});}
}
