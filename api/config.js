import {json,rate} from './_security.js';
export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{message:'Método no permitido'});
  try{
    // Public identifiers only; the edge WAF protects this read-only route
    // while Redis is not provisioned. All credential-bearing APIs stay closed.
    if(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN && !await rate(req,'config',90))return json(res,429,{message:'Demasiadas solicitudes'});
    return json(res,200,{turnstileSiteKey:process.env.TURNSTILE_SITE_KEY||'',paypalClientId:(process.env.ENABLE_PAYPAL_PAYMENTS==='true' && (process.env.PAYPAL_MODE!=='live' || process.env.ENABLE_LIVE_PAYMENTS==='true')) ? (process.env.PAYPAL_CLIENT_ID||'') : '',penPerUsd:Number(process.env.PAYPAL_PEN_PER_USD||3.75)});
  }catch{return json(res,503,{message:'Servicio no disponible'});}
}
