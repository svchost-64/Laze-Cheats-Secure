import {json,rate} from './_security.js';
import {getCatalog} from './_catalog.js';
export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{message:'Método no permitido'});
  try{
    if(!await rate(req,'catalog',90))return json(res,429,{message:'Demasiadas consultas'});
    return json(res,200,await getCatalog());
  }catch(e){console.error('catalog error',e?.message);return json(res,503,{message:'Servicio no disponible'});}
}
