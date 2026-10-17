import originalData from '../data.json' with {type:'json'};
import {redis,safeCatalog} from './_security.js';
export async function getCatalog(){
  const data=await redis().get('laze:catalog');
  return safeCatalog(data||originalData);
}
export async function productById(id){
  if(typeof id!=='string'|| !/^[a-zA-Z0-9_-]{1,50}$/.test(id))return null;
  const data=await getCatalog();return data.products.find(p=>p.id===id)||null;
}
