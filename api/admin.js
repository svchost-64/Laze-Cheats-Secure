import {json,rate,body,sameOrigin,redis,passwordMatches,setAdminCookie,clearAdminCookie,isAdmin,safeCatalog,captcha} from './_security.js';
export default async function handler(req,res){
  if(req.method==='GET')return json(res,200,{authenticated:isAdmin(req)});
  if(req.method!=='POST')return json(res,405,{message:'Método no permitido'});
  if(!sameOrigin(req))return json(res,403,{message:'Origen inválido'});
  try{
    const b=body(req,1400000);
    if(b.action==='login'){
      if(!await rate(req,'admin-login',5,'15 m'))return json(res,429,{message:'Intenta más tarde'});
      if(!await rate(req,'admin-login-global',100,'15 m','global'))return json(res,429,{message:'Intenta más tarde'});
      if(!await captcha(b.turnstile,req))return json(res,403,{message:'Verificación antirobot fallida'});
      if(!await passwordMatches(b.password))return json(res,401,{message:'Credenciales inválidas'});
      setAdminCookie(res);return json(res,200,{authenticated:true});
    }
    if(b.action==='logout'){clearAdminCookie(res);return json(res,200,{ok:true});}
    if(!isAdmin(req))return json(res,401,{message:'No autorizado'});
    if(!await rate(req,'admin-write',12,'1 m'))return json(res,429,{message:'Límite de cambios excedido'});
    if(b.action==='save'){
      const validated=safeCatalog(b.data);
      if(Buffer.byteLength(JSON.stringify(validated))>1200000)return json(res,413,{message:'Catálogo demasiado grande'});
      await redis().set('laze:catalog',validated);
      return json(res,200,{ok:true});
    }
    return json(res,400,{message:'Acción desconocida'});
  }catch(e){console.error('admin error',e?.message);return json(res,400,{message:'Datos inválidos o configuración incompleta'});}
}
