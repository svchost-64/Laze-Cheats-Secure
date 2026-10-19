
/* =====================================================================
   Chat de soporte automatizado
   ===================================================================== */

/* La clave y el prompt del sistema viven en /api/chat, no en JS. */
const AI_CONFIG={cooldownMs:5000,typingMs:800,maxHistory:8};
/* ---------- LÓGICA ---------- */
(function(){
  const $ = s => document.querySelector(s);
  const fab=$('#aiFab'), panel=$('#aiPanel'), msgs=$('#aiMsgs'), typing=$('#aiTyping'),
        form=$('#aiForm'), input=$('#aiInput'), send=$('#aiSend'), sugs=$('#aiSugs');
  let history=[], lastUse=0, busy=false;

  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Formato seguro: primero se escapa todo el HTML y luego se aplican estilos simples
  const fmt = s => esc(s)
    .replace(/`([^`\n]+)`/g,'<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g,'<br>');

  function addMsg(text, who, isErr){
    const d=document.createElement('div');
    d.className='ai-msg '+who+(isErr?' err':'');
    d.innerHTML = who==='user' ? esc(text).replace(/\n/g,'<br>') : fmt(text);
    msgs.insertBefore(d, typing);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function welcome(){
    addMsg('¡Hola! 👋 Soy el asistente virtual de Laze Cheats. ¿Qué producto te interesa?','bot');
  }
  function setOpen(o){
    panel.classList.toggle('open',o);
    fab.classList.toggle('open',o);
    fab.setAttribute('aria-expanded',o);
    fab.setAttribute('aria-label',o?'Cerrar chat con el asistente virtual':'Abrir chat con el asistente virtual');
    if(o){fab.classList.add('seen');setTimeout(()=>input.focus(),250)}
  }

  async function askAI(question){
    const turnstile=await window.LazeSecurity.challenge();
    const res=await fetch('/api/chat',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question,history:history.slice(-AI_CONFIG.maxHistory),turnstile})});
    if(!res.ok)throw Error('Chat no disponible ('+res.status+')');
    const data=await res.json();
    if(!data.reply)throw Error('Respuesta vacía');
    return data.reply.trim();
  }

  async function handleSend(text){
    text=text.trim();
    if(!text||busy) return;

    // Cooldown (igual que en el bot de Discord)
    const now=Date.now();
    if(now-lastUse<AI_CONFIG.cooldownMs){
      addMsg('¡Aguantaa! No me hables tan rápido, que mis circuitos son peruanos pero no tanto. 😵‍💫','bot');
      return;
    }
    lastUse=now;

    sugs.style.display='none';
    addMsg(text,'user');
    input.value=''; input.style.height='auto';
    busy=true; send.disabled=true; typing.classList.add('show'); msgs.scrollTop=msgs.scrollHeight;

    try{
      // Mínimo 2 s con los puntitos "escribiendo..." (la respuesta espera a ambos)
      const wait = new Promise(r=>setTimeout(r, AI_CONFIG.typingMs));
      let [reply] = await Promise.all([askAI(text), wait]);
      if(reply.length>2000) reply=reply.slice(0,1990)+'...';
      history.push({role:'user',content:text},{role:'assistant',content:reply});
      addMsg(reply,'bot');
    }catch(e){
      addMsg('No pude conectar con el servicio. Inténtalo nuevamente o contacta a soporte.','bot',true);
      console.error('Asistente virtual:',e);
    }finally{
      busy=false; send.disabled=false; typing.classList.remove('show'); input.focus();
    }
  }

  fab.addEventListener('click',()=>setOpen(!panel.classList.contains('open')));
  $('#aiMin').addEventListener('click',()=>setOpen(false));
  $('#aiClear').addEventListener('click',()=>{
    history=[]; msgs.querySelectorAll('.ai-msg').forEach(m=>m.remove());
    sugs.style.display=''; welcome();
  });
  form.addEventListener('submit',e=>{e.preventDefault();handleSend(input.value)});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend(input.value)}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,110)+'px'});
  sugs.addEventListener('click',e=>{const b=e.target.closest('.ai-sug'); if(b) handleSend(b.textContent)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open'))setOpen(false)});

  welcome();
})();
