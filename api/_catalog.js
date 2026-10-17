import originalData from '../data.json' with {type:'json'};
import {redis,safeCatalog} from './_security.js';
export async function getCatalog(){
  // Public catalog is safe to serve from the checked-in, immutable seed.
  // Writes, payment orders, admin login and abuse-sensitive endpoints still
  // require Redis; never use a local/in-memory store for those operations.
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return safeCatalog(originalData);
  }
  const data=await redis().get('laze:catalog');
  return safeCatalog(data||originalData);
}
export async function productById(id){
  if(typeof id!=='string'|| !/^[a-zA-Z0-9_-]{1,50}$/.test(id))return null;
  const data=await getCatalog();return data.products.find(p=>p.id===id)||null;
}
