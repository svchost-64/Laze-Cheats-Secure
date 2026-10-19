import {json,rate,body,captcha,sameOrigin} from './_security.js';
const system=`Eres el asistente virtual de Laze Cheats, una herramienta de orientación de la tienda. Responde en español de manera breve y amable. Ayuda a elegir productos y explica métodos de pago sin solicitar contraseñas ni datos sensibles. No prometas stock ni verificación de pagos que no puedas confirmar. Para pagos y soporte remite a canales oficiales de la tienda.`;
const groqEndpoint='https://api.groq.com/openai/v1/chat/completions';
export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{message:'Método no permitido'});
  if(!sameOrigin(req))return json(res,403,{message:'Origen inválido'});
  try{
    const b=body(req,8000);
    if(!await rate(req,'chat',6,'1 m'))return json(res,429,{message:'Demasiados mensajes'});
    if(!await rate(req,'chat-global',200,'1 m','global'))return json(res,429,{message:'Servicio ocupado'});
    if(!await captcha(b.turnstile,req))return json(res,403,{message:'Verificación antirobot fallida'});
    if(typeof b.question!=='string'||b.question.trim().length<1||b.question.length>500)return json(res,400,{message:'Mensaje inválido'});
    if(!process.env.GROQ_API_KEY)return json(res,503,{message:'Asistente no configurado'});
    const history=Array.isArray(b.history)?b.history.slice(-8).filter(m=>['user','assistant'].includes(m?.role)&&typeof m?.content==='string'&&m.content.length<=1000).map(m=>({role:m.role,content:m.content})):[];
    const upstream=await fetch(groqEndpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.GROQ_API_KEY}`},body:JSON.stringify({model:process.env.GROQ_MODEL||'openai/gpt-oss-20b',temperature:0.8,max_tokens:350,messages:[{role:'system',content:system},...history,{role:'user',content:b.question.trim()}]}),signal:AbortSignal.timeout(20000)});
    if(!upstream.ok)return json(res,502,{message:'Servicio de consulta no disponible'});
    const result=await upstream.json();const reply=result?.choices?.[0]?.message?.content;
    if(typeof reply!=='string')return json(res,502,{message:'Respuesta inválida'});
    return json(res,200,{reply:reply.slice(0,2000)});
  }catch(e){console.error('chat error',e?.message);return json(res,503,{message:'No disponible temporalmente'});}
}
