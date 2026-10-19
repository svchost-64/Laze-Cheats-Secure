/* Turnstile: el token se valida nuevamente en cada petición, desde el servidor. */
(()=>{
  let configPromise,scriptPromise,widgetId=null,busy=false,success=null,failure=null;
  const config=()=>configPromise ||= fetch('/api/config',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Configuración inaccesible');return r.json()});
  function script(){
    if(window.turnstile)return Promise.resolve();
    if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
      const tag=document.createElement('script');tag.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';tag.async=true;
      tag.onload=resolve;tag.onerror=()=>reject(Error('No se pudo cargar la verificación'));document.head.appendChild(tag);
    });
    return scriptPromise;
  }
  async function challenge(){
    if(busy)throw Error('Hay una verificación en proceso');
    busy=true;
    try{
      const c=await config();if(!c.turnstileSiteKey)throw Error('Antirobot no configurado');
      await script();
      let host=document.querySelector('#laze-challenge');
      if(!host){host=document.createElement('div');host.id='laze-challenge';host.style.cssText='position:fixed;bottom:16px;left:16px;z-index:999999;';document.body.appendChild(host)}
      const p=new Promise((resolve,reject)=>{success=resolve;failure=reject;});
      if(widgetId===null)widgetId=window.turnstile.render(host,{sitekey:c.turnstileSiteKey,theme:'dark',execution:'execute',appearance:'interaction-only',callback:token=>success?.(token),'error-callback':()=>failure?.(Error('Falló la verificación')),'expired-callback':()=>failure?.(Error('Verificación expirada'))});
      window.turnstile.reset(widgetId);
      window.turnstile.execute(widgetId);
      return await p;
    }finally{busy=false;}
  }
  window.LazeSecurity={challenge};
})();
