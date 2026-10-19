/* =====================================================================
   YAPE PAGO AUTOMÁTICO · Laze Shop
   Flujo: Ver más → Comprar → Resumen → Continuar al pago → Métodos →
          Yape → Continuar → Pantalla de pago → Subir comprobante →
          OCR (código de 3 dígitos) → verificación en Google Sheets → Key
   ===================================================================== */
(function(){
const CFG={
  store:'LAZE SHOP', logo:'images/gooo.gif',
  number:'926 340 171', holder:'Maria B.', qr:'images/yape-qr.png',
  wa:'https://wa.me/51926340171',discord:'https://discord.gg/eAKZKm2xGZ',
  minutes:15,ident:0.10,maxTries:5,
  paypal:{clientId:'',currency:'USD',penPerUsd:3.75}
};
const PP=CFG.paypal;
fetch('/api/config').then(r=>r.json()).then(c=>{PP.clientId=c.paypalClientId||'';PP.penPerUsd=Number(c.penPerUsd)||3.75}).catch(()=>{});

const css=`
.yp-ov{position:fixed;inset:0;z-index:150;background:#f4f5fb;color:#1f2430;overflow-y:auto;padding:22px 14px 40px;font-family:'Segoe UI',Roboto,sans-serif}
.yp-wrap{max-width:1040px;margin:auto}
.yp-x{position:absolute;top:12px;right:16px;background:#fff;border:1px solid #dcdfe8;border-radius:999px;padding:6px 14px;cursor:pointer;font-weight:600;color:#555}
.yp-h{text-align:center;margin:10px 0 22px}.yp-h h1{font-size:2rem;font-weight:800}.yp-h h1 span{color:#6d3df5}
.yp-sec{color:#16a34a;font-size:.85rem;font-weight:600;margin-top:4px}
.yp-grid{display:grid;grid-template-columns:1fr 1.3fr;gap:20px;align-items:start}
.yp-card{background:#fff;border-radius:16px;box-shadow:0 2px 14px rgba(20,20,60,.07);padding:20px}
.yp-one{max-width:520px;margin:0 auto}
.yp-ch{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.yp-ch img{width:38px;height:38px;border-radius:10px;object-fit:cover;background:#eee}
.yp-ch b{display:block}.yp-ch small{color:#8a8fa0}.yp-ch .sp{flex:1}
.yp-pill{background:#ece6ff;color:#6d3df5;border-radius:999px;padding:4px 12px;font-size:.78rem;font-weight:700;white-space:nowrap}
.yp-pill.g{background:#dcfce7;color:#15803d}.yp-pill.o{background:#fed7aa;color:#c2410c}
.yp-row{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #eceef4;font-size:.92rem}
.yp-row b{text-align:right}
.yp-tot{margin-top:14px;border:2px solid #22c55e;background:#f0fdf4;border-radius:12px;padding:12px 16px;display:flex;justify-content:space-between;font-weight:800;font-size:1.15rem}
.yp-red{color:#dc2626;font-size:.75rem;font-weight:700;margin-top:6px}
.yp-time{margin-top:16px;background:#eff6ff;border-radius:12px;padding:12px 16px}
.yp-time>div{display:flex;justify-content:space-between;align-items:center;color:#475569;font-size:.9rem}
.yp-time b{font-size:1.6rem;color:#2563eb;font-variant-numeric:tabular-nums}
.yp-bar{height:5px;background:#dbeafe;border-radius:9px;margin-top:8px;overflow:hidden}.yp-bar i{display:block;height:100%;background:#2563eb;width:100%;transition:width 1s linear}
.yp-ck{margin-top:16px;border-left:4px solid #2563eb;padding-left:12px;display:grid;gap:10px}
.yp-ck div{display:flex;gap:10px;align-items:flex-start;font-size:.9rem}.yp-ck small{display:block;color:#8a8fa0;font-size:.76rem}
.yp-ck span{background:#2563eb;color:#fff;border-radius:5px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:.7rem;flex-shrink:0}
.yp-foot{margin-top:14px;font-size:.72rem;color:#8a8fa0;display:flex;align-items:center;gap:6px}.yp-foot::before{content:"";width:7px;height:7px;border-radius:50%;background:#22c55e}
.yp-yl{width:40px;height:40px;border-radius:50%;background:#7c3aed;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}
.yp-split{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:4px 0 16px}
.yp-qrf{border:6px solid #e9defc;border-radius:16px;padding:8px;background:#fff;position:relative;overflow:hidden;min-height:170px;display:flex;align-items:center;justify-content:center}
.yp-qrf img{width:100%;filter:blur(16px);transition:.3s}.yp-qrf.on img{filter:none}
.yp-qrf button{position:absolute;inset:8px;background:rgba(255,255,255,.88);border:2px dashed #b9a5ef;border-radius:10px;cursor:pointer;font-size:.82rem;color:#4b3a8a;font-weight:600;padding:8px}
.yp-qrf.on button{display:none}
.yp-btn{display:block;width:100%;border-radius:10px;padding:10px;margin-top:8px;font-weight:700;font-size:.85rem;text-align:center;cursor:pointer;border:1px solid transparent;font-family:inherit;text-decoration:none}
.yp-b-w{background:#fff;border-color:#d4d7e1;color:#333}.yp-b-g{background:#22c55e;color:#fff}.yp-b-b{background:#2563eb;color:#fff}
.yp-b-p{background:#6d3df5;color:#fff;font-size:1rem;padding:13px}.yp-b-o{background:#fff;border-color:#93c5fd;color:#2563eb}
.yp-b-p:disabled,.yp-b-o:disabled{opacity:.5;cursor:not-allowed}
.yp-al{border-radius:10px;padding:10px 12px;font-size:.8rem;margin-bottom:10px;border:1px solid}
.yp-al b.t{display:block;margin-bottom:2px}
.yp-al.b{background:#eff6ff;border-color:#93c5fd;color:#1e3a8a}.yp-al.r{background:#fef2f2;border-color:#fca5a5;color:#991b1b}.yp-al.w{background:#fff;border-color:#bfdbfe;color:#2563eb;display:flex;justify-content:space-between;cursor:pointer;font-weight:700}
.yp-amt{text-align:center;margin:8px 0 14px}.yp-amt big{display:block;font-size:2.6rem;font-weight:800;line-height:1.1}
.yp-ro{display:flex;justify-content:space-between;align-items:center;border:1px solid #dcdfe8;border-radius:10px;padding:10px 14px;margin-bottom:10px;background:#fafbfe;font-size:.9rem}
.yp-st{display:flex;justify-content:space-between;align-items:center;border-radius:12px;padding:14px 16px;font-weight:700;margin-top:10px;background:#fef9c3;color:#713f12}
.yp-st.proc{background:#e0f2fe;color:#075985}.yp-st.ok{background:#dcfce7;color:#14532d}.yp-st.err{background:#fee2e2;color:#7f1d1d}
.yp-meth{display:flex;align-items:center;gap:12px;border:2px solid #e3e5ee;border-radius:12px;padding:12px 14px;margin-bottom:10px;cursor:pointer}
.yp-meth.sel{border-color:#7c3aed;background:#f7f3ff}.yp-meth small{color:#8a8fa0;display:block}
.yp-key{background:#f0fdf4;border:2px dashed #22c55e;border-radius:12px;padding:14px;text-align:center;font-family:monospace;font-size:1.15rem;font-weight:800;word-break:break-all;margin:12px 0}
.yp-yl.pp{background:#0070ba}
.yp-ppbox{min-height:60px;margin:12px 0}
.yp-meth.dis{opacity:.6}
@media(max-width:820px){.yp-grid,.yp-split{grid-template-columns:1fr}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

let ov=null,order=null,timer=null,tries=0,method='yape',ppLoading=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toFixed(2);

function header(){return `<div class="yp-h"><h1>Payment <span>Page</span></h1><div class="yp-sec">🛡️ Pago 100% seguro</div></div>`}
function cardHead(right){return `<div class="yp-ch"><img src="${CFG.logo}" alt=""><div><b>${CFG.store}</b><small>Resumen de tu orden</small></div><div class="sp"></div>${right}</div>`}

/* ---------- Apertura ---------- */
async function start(name,base,productId){
  try{
    const r=await callScript({action:'prepare_yape',productId},false);
    if(!r.ok)throw Error(r.message||'Producto no disponible');
    order={name:r.name,base:r.base,ident:r.ident,total:r.total,num:r.orderId,productId};
    order.usd=r.usd;
    tries=0;method='yape';
    if(!ov){ov=document.createElement('div');ov.className='yp-ov';document.body.appendChild(ov);ov.addEventListener('click',onClick)}
    ov.style.display='block';document.body.style.overflow='hidden';stepSummary();
  }catch(e){alert('No se pudo iniciar la orden: '+e.message)}
}
function close(){clearInterval(timer);if(ov)ov.style.display='none';document.body.style.overflow=''}
const X=`<button class="yp-x" data-a="close">✕ Cerrar</button>`;

/* ---------- Paso 1: resumen ---------- */
function stepSummary(){
  ov.innerHTML=X+`<div class="yp-wrap">${header()}<div class="yp-card yp-one">${cardHead(`<span class="yp-pill">Compra</span>`)}
  <h3 style="margin-bottom:6px">Resumen de la compra</h3>
  <div class="yp-row"><span>Producto</span><b>${esc(order.name)}</b></div>
  <div class="yp-row"><span>Total</span><b>S/ ${money(order.base)}</b></div>
  <button class="yp-btn yp-b-p" style="margin-top:18px" data-a="toMethods">Continuar al pago</button>
  <div class="yp-foot">Sistema protegido</div></div></div>`;
}
/* ---------- Paso 2: métodos ---------- */
function stepMethods(){
  ov.innerHTML=X+`<div class="yp-wrap">${header()}<div class="yp-card yp-one">${cardHead(`<span class="yp-pill">Métodos</span>`)}
  <h3 style="margin-bottom:10px">Métodos de pago</h3>
  <div class="yp-meth ${method==='yape'?'sel':''}" data-a="pick" data-m="yape"><div class="yp-yl">Y</div><div><b>Yape</b><small>Verificación automática</small></div></div>
  <div class="yp-meth ${method==='paypal'?'sel':''}" data-a="pick" data-m="paypal"><div class="yp-yl pp">P</div><div><b>PayPal</b><small>Tarjeta o saldo PayPal · entrega automática · ≈ US$ ${money(order.usd)}</small></div></div>
  <a class="yp-meth" href="${CFG.discord}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><div class="yp-yl" style="background:#5865F2">D</div><div><b>Plin, BCP, BBVA, Binance</b><small>Pago manual por Discord</small></div></a>
  <div id="ypMsg"></div>
  <button class="yp-btn yp-b-p" id="ypGo" data-a="toPay">Continuar</button>
  <button class="yp-btn yp-b-w" data-a="toSummary">← Volver</button>
  <div class="yp-foot">Sistema protegido</div></div></div>`;
}
function methMsg(t){const m=$('#ypMsg');if(m)m.innerHTML=t?`<div class="yp-al r">${esc(t)}</div>`:''}
/* ---------- Paso 3: pantalla de pago ---------- */
function stepPay(){
  ov.innerHTML=X+`<div class="yp-wrap">${header()}<div class="yp-grid">
  <div class="yp-card">${cardHead(`<span class="yp-pill">Orden #${order.num}</span>`)}
    <div class="yp-row"><span>Concepto</span><b>${esc(order.name)}</b></div>
    <div class="yp-row"><span>Total base (S/)</span><b>${money(order.base)}</b></div>
    <div class="yp-row"><span>Identificador (S/) [+ ${money(order.ident)}]</span><b>${money(order.ident)}</b></div>
    <div class="yp-row"><span>Total a enviar</span><b>${money(order.total)}</b></div>
    <div class="yp-tot"><span>S/</span><span>${money(order.total)}</span></div><div class="yp-red">Enviar exactamente</div>
    <div class="yp-time"><div><span>Tiempo restante para pagar</span><b id="ypClock">${CFG.minutes}:00</b></div><div class="yp-bar"><i id="ypBar"></i></div></div>
    <div class="yp-ck">
      <div><span>✔</span><p><b>Paga el monto exacto</b><small>Incluye los centavos del identificador</small></p></div>
      <div><span>✔</span><p><b>Ingresa tu código de seguridad</b><small>Los 3 dígitos de tu constancia de Yape</small></p></div>
      <div><span>✔</span><p><b>Completa el pago en ${CFG.minutes} minutos</b><small>Pasado el tiempo la orden vence</small></p></div>
    </div>
    <div class="yp-foot">Sistema protegido</div></div>

  <div class="yp-card">
    <div class="yp-ch"><div class="yp-yl">Y</div><div><b>Yape</b><small>verificación automática</small></div><div class="sp"></div><span class="yp-pill g">🛡 SECURE</span></div>
    <div class="yp-split">
      <div><div class="yp-qrf" id="ypQr"><img src="${CFG.qr}" alt="QR Yape"><button data-a="qr">¿Ya sabes pagar? Presiona aquí para ver los datos</button></div>
        <a class="yp-btn yp-b-w" href="${CFG.qr}" download="yape-qr.png">Descargar QR</a>
        <a class="yp-btn yp-b-g" href="${CFG.wa}" target="_blank" rel="noopener">WhatsApp Soporte</a>
        <button class="yp-btn yp-b-b" data-a="guide">Ver guía de pago</button></div>
      <div>
        <div class="yp-al b"><b class="t">✔ Cómo pagar</b>Yapea a <b>${CFG.number}</b> el monto <b>exacto S/ ${money(order.total)}</b> y luego escribe tu código de seguridad.</div>
        <div class="yp-al r"><b class="t">❗ Importante</b>No redondees el monto: los <b>centavos</b> identifican tu pago.</div>
        <div class="yp-al w" data-a="guide"><span>❓ ¿Necesitas ayuda?</span><span>›</span></div>
      </div>
    </div>
    <div id="ypGuide" class="yp-al b" style="display:none"><b class="t">Guía rápida</b>1) Abre Yape y elige Yapear. 2) Número <b>${CFG.number}</b> (${CFG.holder}). 3) Monto <b>S/ ${money(order.total)}</b>. 4) En la constancia verás el <b>código de seguridad</b> (3 dígitos). 5) Escríbelo abajo y pulsa Verificar pago.</div>
    <div class="yp-amt"><span>Enviar</span><big>${money(order.total)} S/</big><div class="yp-red">ENVÍA EL MONTO EXACTO.</div></div>
    <div class="yp-ro"><span>Titular</span><b>${CFG.holder}</b></div>
    <button class="yp-btn yp-b-o" data-a="revNum">Presiona para mostrar</button>
    <button class="yp-btn yp-b-o" data-a="revAmt">Presiona para mostrar</button>
    <div class="yp-ro" style="margin-top:12px"><span>Código de seguridad</span><input id="ypCode" inputmode="numeric" maxlength="3" placeholder="000" autocomplete="off" style="width:96px;text-align:center;font-size:1.2rem;font-weight:800;letter-spacing:4px;border:1px solid #cfd3e0;border-radius:8px;padding:6px;background:#fff;color:#111"></div>
    <button class="yp-btn yp-b-p" id="ypUp" data-a="verify">Verificar pago</button>
    <div class="yp-st" id="ypSt"><span>Esperando pago...</span><span class="yp-pill o">PENDING</span></div>
    <div class="yp-foot">Sistema protegido</div>
  </div></div></div>`;
  const ci=$('#ypCode');ci.oninput=()=>{ci.value=ci.value.replace(/\D/g,'').slice(0,3)};ci.onkeydown=e=>{if(e.key==='Enter')verify()};
  runTimer();
}
const $=s=>ov.querySelector(s);

function runTimer(){
  clearInterval(timer);
  const end=Date.now()+CFG.minutes*60000,total=CFG.minutes*60000;
  const tick=()=>{
    const left=Math.max(0,end-Date.now()),m=Math.floor(left/60000),s=Math.floor(left%60000/1000);
    const c=$('#ypClock'),b=$('#ypBar'); if(!c){clearInterval(timer);return}
    c.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); b.style.width=(left/total*100)+'%';
    if(left<=0){clearInterval(timer);setStatus('err','Orden vencida. Vuelve a comprar.','EXPIRED');$('#ypUp').disabled=true}
  };
  tick();timer=setInterval(tick,1000);
}
function setStatus(kind,text,pill){
  const el=$('#ypSt'); if(!el)return;
  const map={wait:['', 'o'],proc:['proc','o'],ok:['ok','g'],err:['err','o']};
  el.className='yp-st '+map[kind][0];
  el.innerHTML=`<span>${esc(text)}</span><span class="yp-pill ${map[kind][1]}">${pill}</span>`;
}

/* ---------- Verificación por código de seguridad ---------- */
const MSG={
  datos:'Datos inválidos. Revisa el código (3 dígitos).',
  bloqueado:'Demasiados intentos en esta orden. Escribe a soporte.',
  no_encontrado:'Aún no vemos ese pago. Revisa el código y el monto exacto, o espera 1 minuto.',
  usado:'Ese pago ya fue utilizado.',
  sin_stock:'No hay stock de este producto por ahora. Escríbenos con tu comprobante.'
};
async function verify(){
  const code=($('#ypCode').value||'').replace(/\D/g,'');
  if(code.length!==3){setStatus('err','Escribe los 3 dígitos del código de seguridad.','ERROR');return}
  $('#ypUp').disabled=true; setStatus('proc','Verificando pago...','PROCESSING');
  try{
    // text/plain evita el "preflight" CORS que Apps Script no soporta
    const r=await callScript({action:'claim_yape',code,orderId:order.num},true);
    if(r&&r.ok){clearInterval(timer);done(r);return}
    setStatus('err',(r&&(r.message||MSG[r.reason]))||'No se pudo verificar.','ERROR');
  }catch(e){
    console.error(e);setStatus('err','Error de conexión. Intenta otra vez.','ERROR');
  }finally{const b=$('#ypUp');if(b&&ov.contains(b))b.disabled=false}
}
function done(r){
  ov.innerHTML=X+`<div class="yp-wrap">${header()}<div class="yp-card yp-one" style="text-align:center">
    <div style="font-size:3rem">✅</div><h3>¡Pago completado!</h3>
    <p style="color:#555;margin-top:6px">${esc(r.message||'Gracias por tu compra.')}</p>
    ${r.key?`<div class="yp-key" id="ypKey">${esc(r.key)}</div><button class="yp-btn yp-b-b" data-a="copy">Copiar Key</button>`:`<p style="margin-top:10px;color:#b45309">Tu pago fue verificado, pero la Key aún no está disponible. Escríbenos por soporte con tu orden #${order.num}.</p>`}
    <a class="yp-btn yp-b-g" href="${CFG.wa}" target="_blank" rel="noopener">WhatsApp Soporte</a>
    <p class="yp-red" style="margin-top:10px">Guarda tu Key: no se vuelve a mostrar.</p></div></div>`;
}

/* =====================================================================
   PAYPAL · mismo flujo visual que Yape. La entrega usa la hoja
   (columnas Stock/Key · Producto · Estado) vía Apps Script.
   ===================================================================== */
async function callScript(payload,challenge=true){
  if(challenge)payload.turnstile=await window.LazeSecurity.challenge();
  const res=await fetch('/api/payments',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await res.json().catch(()=>({message:'Respuesta inválida del servidor'}));
  if(!res.ok)return {ok:false,message:data.message||'Servicio de pagos no disponible'};
  return data;
}
function loadPP(){
  if(window.paypal&&window.paypal.Buttons)return Promise.resolve();
  if(ppLoading)return ppLoading;
  ppLoading=new Promise((ok,ko)=>{
    const sc=document.createElement('script');
    sc.src='https://www.paypal.com/sdk/js?client-id='+encodeURIComponent(PP.clientId)+'&currency='+PP.currency+'&intent=capture&components=buttons&disable-funding=venmo';
    sc.onload=ok;sc.onerror=()=>{ppLoading=null;ko(new Error('sdk'))};
    document.head.appendChild(sc);
  });
  return ppLoading;
}
/* Paso previo: revisa que haya stock ANTES de dejar pagar */
async function toPaypal(){
  methMsg('');
  if(!PP.clientId){methMsg('PayPal aún no está configurado en el servidor.');return}
  const go=$('#ypGo');go.disabled=true;go.textContent='Verificando stock...';
  try{
    const r=await callScript({action:'paypal_stock',productId:order.productId});
    if(r&&r.ok&&r.stock>0){stepPaypal();return}
    methMsg((r&&(r.message||MSG[r.reason]))||'No hay stock de este producto por ahora. Escríbenos por soporte.');
  }catch(e){console.error(e);methMsg('Error de conexión. Intenta otra vez.')}
  finally{const g=$('#ypGo');if(g&&ov.contains(g)){g.disabled=false;g.textContent='Continuar'}}
}
function stepPaypal(){
  clearInterval(timer);
  ov.innerHTML=X+`<div class="yp-wrap">${header()}<div class="yp-grid">
  <div class="yp-card">${cardHead(`<span class="yp-pill">Orden #${order.num}</span>`)}
    <div class="yp-row"><span>Concepto</span><b>${esc(order.name)}</b></div>
    <div class="yp-row"><span>Total (S/)</span><b>${money(order.base)}</b></div>
    <div class="yp-row"><span>Tipo de cambio</span><b>S/ ${money(PP.penPerUsd)} = US$ 1.00</b></div>
    <div class="yp-row"><span>Total a pagar (US$)</span><b>${money(order.usd)}</b></div>
    <div class="yp-tot"><span>US$</span><span>${money(order.usd)}</span></div><div class="yp-red">PayPal cobra en dólares</div>
    <div class="yp-ck">
      <div><span>✔</span><p><b>Paga con PayPal</b><small>Con tu saldo o con tarjeta, sin salir de la página</small></p></div>
      <div><span>✔</span><p><b>Recibe tu Key al instante</b><small>Se entrega automáticamente al confirmarse el pago</small></p></div>
      <div><span>✔</span><p><b>Guarda tu Key</b><small>No se vuelve a mostrar</small></p></div>
    </div>
    <div class="yp-foot">Sistema protegido</div></div>

  <div class="yp-card">
    <div class="yp-ch"><div class="yp-yl pp">P</div><div><b>PayPal</b><small>entrega automática</small></div><div class="sp"></div><span class="yp-pill g">🛡 SECURE</span></div>
    <div class="yp-amt"><span>Pagar</span><big>${money(order.usd)} US$</big><div class="yp-red">≈ S/ ${money(order.base)}</div></div>
    <div class="yp-ppbox" id="ypPP"><div class="yp-al b">Cargando PayPal...</div></div>
    <div class="yp-st" id="ypSt"><span>Esperando pago...</span><span class="yp-pill o">PENDING</span></div>
    <button class="yp-btn yp-b-w" data-a="toMethods" id="ypBack">← Volver</button>
    <div class="yp-foot">Sistema protegido</div>
  </div></div></div>`;
  loadPP().then(()=>{
    const box=$('#ypPP');if(!box)return;box.innerHTML='';
    paypal.Buttons({
      style:{layout:'vertical',shape:'rect',color:'gold',label:'paypal'},
      createOrder:async()=>{
        const r=await callScript({action:'paypal_create',productId:order.productId});
        if(!r.ok)throw Error(r.message||'No fue posible crear la orden');
        order.ppOrder=r.orderID;return r.orderID;
      },
      onApprove:async d=>{
        order.ppOrder=d.orderID;
        const b=$('#ypBack');if(b)b.style.display='none';
        const bx=$('#ypPP');if(bx)bx.innerHTML='<div class="yp-al b">Confirmando pago seguro...</div>';
        await claimPaypal();
      },
      onCancel:()=>setStatus('wait','Pago cancelado. Puedes intentarlo otra vez.','PENDING'),
      onError:e=>{console.error(e);setStatus('err','Error con PayPal. Intenta otra vez.','ERROR')}
    }).render('#ypPP');
  }).catch(()=>{const bx=$('#ypPP');if(bx)bx.innerHTML='<div class="yp-al r">No se pudo cargar PayPal. Revisa tu conexión o desactiva el bloqueador de anuncios.</div>'});
}
/* El Apps Script valida el pago con PayPal y entrega la Key (Stock · Producto · Estado) */
async function claimPaypal(){
  setStatus('proc','Verificando pago y entregando tu producto...','PROCESSING');
  try{
    const r=await callScript({action:'paypal_capture',orderID:order.ppOrder});
    if(r&&r.ok){donePP(r);return}
    ppRetry((r&&(r.message||MSG[r.reason]))||'No se pudo confirmar la entrega.');
  }catch(e){console.error(e);ppRetry('Error de conexión al entregar tu producto.')}
}
function ppRetry(msg){
  setStatus('err',msg,'ERROR');
  const bx=$('#ypPP');if(!bx)return;
  bx.innerHTML=`<div class="yp-al r"><b class="t">Tu pago fue recibido</b>${esc(msg)} Tu ID de PayPal: <b>${esc(order.ppOrder)}</b> · Orden #${order.num}. No pagues otra vez: reintenta o escríbenos.</div>
  <button class="yp-btn yp-b-p" data-a="ppRetry">Reintentar entrega</button>
  <a class="yp-btn yp-b-g" href="${CFG.wa}" target="_blank" rel="noopener">WhatsApp Soporte</a>`;
}
/* ---------- Interfaz de entrega (PayPal) ---------- */
function donePP(r){
  ov.innerHTML=X+`<div class="yp-wrap">${header()}<div class="yp-grid">
  <div class="yp-card">${cardHead(`<span class="yp-pill g">ENTREGADO</span>`)}
    <div class="yp-row"><span>Orden</span><b>#${order.num}</b></div>
    <div class="yp-row"><span>Producto</span><b>${esc(order.name)}</b></div>
    <div class="yp-row"><span>Método</span><b>PayPal</b></div>
    <div class="yp-row"><span>Total pagado</span><b>US$ ${money(order.usd)} (≈ S/ ${money(order.base)})</b></div>
    <div class="yp-row"><span>ID de PayPal</span><b style="word-break:break-all">${esc(order.ppOrder)}</b></div>
    <div class="yp-st ok"><span>Producto entregado</span><span class="yp-pill g">DELIVERED</span></div>
    <div class="yp-foot">Sistema protegido</div></div>

  <div class="yp-card" style="text-align:center">
    <div style="font-size:3rem">✅</div><h3>¡Pago completado!</h3>
    <p style="color:#555;margin-top:6px">${esc(r.message||'Gracias por tu compra.')}</p>
    ${r.key?`<div class="yp-key" id="ypKey">${esc(r.key)}</div><button class="yp-btn yp-b-b" data-a="copy">Copiar Key</button>`:`<p style="margin-top:10px;color:#b45309">Tu pago fue verificado, pero la Key aún no está disponible. Escríbenos por soporte con tu orden #${order.num}.</p>`}
    <a class="yp-btn yp-b-g" href="${CFG.wa}" target="_blank" rel="noopener">WhatsApp Soporte</a>
    <p class="yp-red" style="margin-top:10px">Guarda tu Key: no se vuelve a mostrar.</p>
  </div></div></div>`;
}

/* ---------- Eventos ---------- */
function onClick(e){
  const b=e.target.closest('[data-a]'); if(!b)return;
  const a=b.dataset.a;
  if(a==='close'){ if(!confirm('¿Cerrar? Si ya pagaste, guarda tu comprobante.'))return; close() }
  else if(a==='toMethods')stepMethods();
  else if(a==='toSummary')stepSummary();
  else if(a==='pick'){method=b.dataset.m;stepMethods()}
  else if(a==='toPay'){method==='paypal'?toPaypal():stepPay()}
  else if(a==='ppRetry')claimPaypal();
  else if(a==='qr')$('#ypQr').classList.add('on');
  else if(a==='guide'){const g=$('#ypGuide');g.style.display=g.style.display==='none'?'block':'none'}
  else if(a==='revNum')b.textContent='N° Yape: '+CFG.number+' · '+CFG.holder;
  else if(a==='revAmt')b.textContent='Monto exacto: S/ '+money(order.total);
  else if(a==='verify')verify();
  else if(a==='copy'){navigator.clipboard&&navigator.clipboard.writeText($('#ypKey').textContent);b.textContent='¡Copiada!'}
}

/* Intercepta el botón "Comprar" del producto */
document.addEventListener('click',e=>{
  const b=e.target.closest('#productDetail .btns a.btn-red'); if(!b)return;
  const name=(document.querySelector('#productDetail h2')||{}).textContent||'Producto';
  const base=parseFloat(((document.querySelector('#productDetail .price')||{}).textContent||'').replace(/[^\d.]/g,''));
  if(!base||!b.dataset.productId)return;               // sin precio válido: se comporta como antes
  e.preventDefault();e.stopPropagation();
  start(name,base,b.dataset.productId);
},true);
})();