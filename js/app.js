
(function(){
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  // El catálogo y la autenticación se gestionan exclusivamente en el servidor.
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

  let data={products:[],tutorials:[
    {id:'d2',title:'Tutorial principal',desc:'Mira este video para empezar.',vid:'5Se7XeBQ1vs'}
  ]};
  let activeCat='Todos', query='', curTut=null, pImages=[], isAdmin=false;

  /* ---------- Almacenamiento protegido por API ---------- */
  async function save(){
    try{
      const res=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'save',data})});
      if(!res.ok)throw Error('No autorizado o datos inválidos');
      return true;
    }catch(e){toast('Error: no se pudo guardar en el servidor',1);return false}
  }
  async function load(){
    try{
      const r=await fetch('/api/catalog',{cache:'no-store'});
      if(!r.ok)throw Error('Catalogo no disponible');
      data=await r.json();
    }catch(e){data={products:[],tutorials:[]};toast('No se pudo cargar el catálogo',1)}
  }
  async function checkAdmin(){
    try{const r=await fetch('/api/admin',{credentials:'same-origin',cache:'no-store'}); const j=await r.json();isAdmin=!!j.authenticated}
    catch(_){isAdmin=false}
    showAdmin();
  }
  function toast(m,err){const t=$('#toast');t.textContent=m;t.className='toast show'+(err?' err':'');clearTimeout(t._t);t._t=setTimeout(()=>t.className='toast',2600)}

  /* ---------- YouTube ---------- */
  function ytId(u){
    const m=String(u).trim().match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    if(m)return m[1];
    return /^[\w-]{11}$/.test(u.trim())?u.trim():null;
  }

  function playerHTML(vid,title){
    if(location.protocol==='file:')return `<a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener" style="display:block;position:relative;width:100%;height:100%;background:#000 url('https://i.ytimg.com/vi/${vid}/hqdefault.jpg') center/cover"><span style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(0,0,0,.45);color:#fff;font-weight:700;font-size:.85rem;line-height:1.3;text-align:center;padding:10px"><span style="font-size:2rem;line-height:1;color:var(--red)">▶</span>Ver en YouTube</span></a>`;
    return `<iframe src="https://www.youtube.com/embed/${vid}" title="${esc(title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  }
  function closeModals(){
    $$('.modal').forEach(m=>m.classList.remove('open'));
    setTimeout(()=>{if(!$('#productModal').classList.contains('open'))$('#productDetail').innerHTML=''},50);
  }
  function fillTutSelect(sel){
    const s=$('#pTut'), cur=sel!==undefined?sel:s.value;
    s.innerHTML='<option value="">— Ninguno: ir a Instalar —</option>'+data.tutorials.map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('');
    s.value=cur||'';
  }

  /* ---------- Productos públicos ---------- */
  function renderChips(){
    const cats=['Todos',...new Set(data.products.map(p=>p.cat).filter(Boolean))];
    $('#chips').innerHTML=cats.map(c=>`<button class="chip ${c===activeCat?'active':''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
    $('#catList').innerHTML=cats.slice(1).map(c=>`<option value="${esc(c)}">`).join('');
  }
  function renderProducts(){
    const q=query.toLowerCase();
    const list=data.products.filter(p=>(activeCat==='Todos'||p.cat===activeCat)&&(!q||(p.name+' '+p.desc+' '+p.cat).toLowerCase().includes(q)));
    $('#productsGrid').innerHTML=list.length?list.map(p=>`
      <div class="product" data-id="${esc(p.id)}">
        <div class="thumb">${p.images&&p.images[0]?`<img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy">`:'📦'}</div>
        <div class="info">
          ${p.cat?`<span class="cat">${esc(p.cat)}</span>`:''}
          <h3>${esc(p.name)}</h3>
          <p class="desc">${esc(p.desc)}</p>
          <div class="bottom"><span class="price">S/${Number(p.price).toFixed(2)}</span><span class="btn btn-red btn-sm">Ver más</span></div>
        </div>
      </div>`).join(''):`<div class="empty">${data.products.length?'No se encontraron productos con ese filtro.':'Pronto agregaremos nuevos productos. ¡Vuelve a visitarnos!'}</div>`;
    renderChips();
  }
  function openProduct(id){
    const p=data.products.find(x=>x.id===id); if(!p)return;
    const imgs=p.images||[], hasV=!!p.video;
    const tut=p.tut&&data.tutorials.find(t=>t.id===p.tut);
    const mainHTML=hasV?playerHTML(p.video,p.name):(imgs[0]?`<img src="${imgs[0]}" alt="">`:'📦');
    const thumbs=(hasV&&imgs.length)||imgs.length>1?`<div class="thumbs">${hasV?`<div class="vt on"><img src="https://i.ytimg.com/vi/${p.video}/default.jpg" alt=""></div>`:''}${imgs.map((s,i)=>`<img src="${s}" data-i="${i}" class="${!hasV&&!i?'on':''}" alt="">`).join('')}</div>`:'';
    $('#productDetail').innerHTML=`
      <div class="gallery">
        <div class="main${hasV?' is-video':''}" id="gMain">${mainHTML}</div>
        ${thumbs}
      </div>
      <div>
        ${p.cat?`<span class="cat" style="color:var(--red-light);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:1px">${esc(p.cat)}</span>`:''}
        <h2>${esc(p.name)}</h2>
        <div class="price">S/${Number(p.price).toFixed(2)}</div>
        <p>${esc(p.desc)||'Sin descripción.'}</p>
        <div class="btns"><a class="btn btn-red" href="#" data-buy data-name="${esc(p.name)}" data-price="${Number(p.price)}" data-product-id="${esc(p.id)}">Comprar</a>
        <a class="btn btn-ghost" href="#/instalar" data-close ${tut?`data-tut="${esc(tut.id)}"`:''}>${tut?'Ver tutorial':'Ver tutoriales'}</a></div>
      </div>`;
    $('#productDetail').onclick=e=>{
      const v=e.target.closest('.vt'), im=e.target.closest('.thumbs img[data-i]');
      if(!v&&!im)return;
      const m=$('#gMain');
      if(v){m.className='main is-video';m.innerHTML=playerHTML(p.video,p.name)}
      else{m.className='main';m.innerHTML=`<img src="${imgs[im.dataset.i]}" alt="">`}
      $$('.thumbs .vt, .thumbs img[data-i]').forEach(x=>x.classList.toggle('on',x===(v||im)));
    };
    $('#productModal').classList.add('open');
  }

  /* ---------- Tutoriales públicos ---------- */
  function renderTutorials(){
    const t=data.tutorials;
    if(!t.length){$('#player').innerHTML='<div class="player-empty">Aún no hay tutoriales publicados.</div>';$('#playlist').innerHTML='';$('#now').innerHTML='';return}
    if(!curTut||!t.find(x=>x.id===curTut))curTut=t[0].id;
    const c=t.find(x=>x.id===curTut);
    if(location.protocol==='file:'){
      $('#player').innerHTML=`<a href="https://www.youtube.com/watch?v=${c.vid}" target="_blank" rel="noopener" style="display:block;position:relative;width:100%;height:100%;background:#000 url('https://i.ytimg.com/vi/${c.vid}/hqdefault.jpg') center/cover"><span style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(0,0,0,.45);color:#fff;font-weight:700;text-align:center;padding:16px"><span style="font-size:3.5rem;color:var(--red)">▶</span>Ver en YouTube<small style="font-weight:400;opacity:.8">(el reproductor funcionará cuando la web esté publicada en un hosting)</small></span></a>`;
    }else{
      $('#player').innerHTML=`<iframe src="https://www.youtube.com/embed/${c.vid}" title="${esc(c.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    }
    $('#now').innerHTML=`<h3>${esc(c.title)}</h3><p>${esc(c.desc)}</p>`;
    $('#playlist').innerHTML=t.map(x=>`<div class="pl-item ${x.id===curTut?'active':''}" data-id="${x.id}"><img src="https://i.ytimg.com/vi/${x.vid}/mqdefault.jpg" alt="" loading="lazy"><span>${esc(x.title)}</span></div>`).join('');
  }

  /* ---------- Admin ---------- */
  // No existe contraseña ni sesión de administrador en el navegador.
  function showAdmin(){$('#loginView').style.display=isAdmin?'none':'block';$('#adminView').style.display=isAdmin?'block':'none';if(isAdmin){renderAdminProducts();renderAdminTuts()}}
  function renderPreviews(){
    $('#pPreviews').innerHTML=pImages.map((s,i)=>`<div class="pv"><img src="${s}" alt=""><button type="button" data-i="${i}" title="Quitar">✕</button></div>`).join('');
  }
  function renderAdminProducts(){
    $('#adminProducts').innerHTML=data.products.length?data.products.map(p=>`
      <div class="row-item"><img src="${(p.images&&p.images[0])||''}" alt="">
        <div class="t">${esc(p.name)}<small>S/${Number(p.price).toFixed(2)} · ${esc(p.cat||'Sin categoría')}${p.video?' · ▶ video':''}</small></div>
        <button class="btn btn-ghost btn-sm" data-edit="${esc(p.id)}">Editar</button>
        <button class="btn btn-danger btn-sm" data-del="${esc(p.id)}">Eliminar</button></div>`).join(''):'<p class="hint">Aún no has agregado productos.</p>';
  }
  function renderAdminTuts(){
    fillTutSelect();
    $('#adminTuts').innerHTML=data.tutorials.length?data.tutorials.map((t,i)=>`
      <div class="row-item"><img src="https://i.ytimg.com/vi/${t.vid}/default.jpg" alt="">
        <div class="t">${esc(t.title)}<small>youtu.be/${t.vid}</small></div>
        <button class="btn btn-ghost btn-sm" data-tedit="${esc(t.id)}">Editar</button>
        <button class="btn btn-ghost btn-sm" data-up="${i}" title="Subir">↑</button>
        <button class="btn btn-danger btn-sm" data-tdel="${esc(t.id)}">Eliminar</button></div>`).join(''):'<p class="hint">Aún no hay tutoriales.</p>';
  }
  function resetProdForm(){$('#prodForm').reset();$('#pId').value='';pImages=[];renderPreviews();$('#pCancel').style.display='none';$('#pSave').textContent='Guardar producto'}
  function resizeImage(file){
    return new Promise((res,rej)=>{
      const fr=new FileReader();
      fr.onload=()=>{const im=new Image();im.onload=()=>{
        const S=800,k=Math.min(S/im.width,S/im.height),w=im.width*k,h=im.height*k;
        const c=document.createElement('canvas');c.width=S;c.height=S;
        const g=c.getContext('2d');g.fillStyle='#1c1c24';g.fillRect(0,0,S,S);
        g.drawImage(im,(S-w)/2,(S-h)/2,w,h);res(c.toDataURL('image/jpeg',.82))};
        im.onerror=rej;im.src=fr.result};
      fr.onerror=rej;fr.readAsDataURL(file);
    });
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click',async e=>{
    const t=e.target;
    const tl=t.closest('[data-tut]'); if(tl){curTut=tl.dataset.tut;renderTutorials()}
    if(t.closest('[data-close]')||t.classList.contains('modal'))closeModals();
    const chip=t.closest('.chip'); if(chip){activeCat=chip.dataset.c;renderProducts()}
    const prod=t.closest('.product'); if(prod)openProduct(prod.dataset.id);
    const pl=t.closest('.pl-item'); if(pl){curTut=pl.dataset.id;renderTutorials()}
    const tab=t.closest('.tab'); if(tab){
      $$('.tab').forEach(x=>x.classList.toggle('active',x===tab));
      ['prod','tut','cfg'].forEach(n=>$('#tab-'+n).style.display=tab.dataset.tab===n?'block':'none');
    }
    if(t.dataset.edit){
      const p=data.products.find(x=>x.id===t.dataset.edit);
      $('#pId').value=p.id;$('#pName').value=p.name;$('#pPrice').value=p.price;$('#pCat').value=p.cat||'';
      $('#pLink').value=p.link||'';$('#pDesc').value=p.desc||'';$('#pVideo').value=p.video?'https://www.youtube.com/watch?v='+p.video:'';fillTutSelect(p.tut||'');pImages=[...(p.images||[])];renderPreviews();
      $('#pCancel').style.display='';$('#pSave').textContent='Actualizar producto';
      $('#prodForm').scrollIntoView({behavior:'smooth',block:'center'});
    }
    if(t.dataset.del&&confirm('¿Eliminar este producto?')){data.products=data.products.filter(x=>x.id!==t.dataset.del);await save();renderAdminProducts();renderProducts()}
    if(t.dataset.tdel&&confirm('¿Eliminar este tutorial?')){data.tutorials=data.tutorials.filter(x=>x.id!==t.dataset.tdel);await save();renderAdminTuts();renderTutorials()}
    if(t.dataset.tedit){
      const x=data.tutorials.find(v=>v.id===t.dataset.tedit); if(x){
        $('#tId').value=x.id;$('#tTitle').value=x.title;$('#tUrl').value='https://www.youtube.com/watch?v='+x.vid;$('#tDesc').value=x.desc||'';
        $('#tSave').textContent='Guardar cambios';$('#tCancel').style.display='';
        $('#tutForm').scrollIntoView({behavior:'smooth',block:'center'});
      }
    }
    if(t.dataset.up){const i=+t.dataset.up;if(i>0){[data.tutorials[i-1],data.tutorials[i]]=[data.tutorials[i],data.tutorials[i-1]];await save();renderAdminTuts();renderTutorials()}}
    if(t.closest('.pv button')){pImages.splice(+t.closest('.pv button').dataset.i,1);renderPreviews()}
  });

  $('#search').addEventListener('input',e=>{query=e.target.value;renderProducts()});
  $('#menuBtn').onclick=()=>$('#menu').classList.toggle('open');
  $$('#menu a').forEach(a=>a.onclick=()=>$('#menu').classList.remove('open'));

  const routes=['inicio','comprar','instalar','admin'];
  function route(){
    let r=(location.hash.replace('#/','')||'inicio'); if(!routes.includes(r))r='inicio';
    $$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+r));
    $$('#menu a').forEach(a=>a.classList.toggle('active',a.dataset.r===r));
    document.body.classList.toggle('is-home',r==='inicio');
    const nv=$('nav'), act=$('#menu a.active');
    if(act&&nv.scrollWidth>nv.clientWidth)nv.scrollLeft+=act.getBoundingClientRect().left-nv.getBoundingClientRect().left-12;
    window.scrollTo(0,0);
    if(r==='admin')checkAdmin();
  }
  window.addEventListener('hashchange',route);
  route();
  const login=async()=>{const password=$('#pass').value;$('#pass').value='';try{const turnstile=await window.LazeSecurity.challenge();const r=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'login',password,turnstile})});if(!r.ok)throw Error();isAdmin=true;showAdmin()}catch(_){toast('Acceso denegado',1)}};
  $('#loginBtn').onclick=login;
  $('#pass').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
  $('#logoutBtn').onclick=async()=>{await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'logout'})});isAdmin=false;showAdmin()};


  $('#pImgs').addEventListener('change',async e=>{
    for(const f of e.target.files){try{pImages.push(await resizeImage(f))}catch(_){toast('No se pudo leer una imagen',1)}}
    e.target.value='';renderPreviews();
  });
  $('#pCancel').onclick=resetProdForm;
  $('#prodForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const id=$('#pId').value||uid();
    const vraw=$('#pVideo').value.trim(); let video='';
    if(vraw){video=ytId(vraw); if(!video)return toast('El enlace del video no es válido',1)}
    const item={id,name:$('#pName').value.trim(),price:parseFloat($('#pPrice').value)||0,cat:$('#pCat').value.trim(),link:$('#pLink').value.trim(),desc:$('#pDesc').value.trim(),video,tut:$('#pTut').value,images:pImages};
    const i=data.products.findIndex(x=>x.id===id);
    const backup=JSON.stringify(data);
    if(i>=0)data.products[i]=item;else data.products.unshift(item);
    if(!await save()){data=JSON.parse(backup);return}
    resetProdForm();renderAdminProducts();renderProducts();toast('Producto guardado');
  });
  $('#tutForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const vid=ytId($('#tUrl').value); if(!vid)return toast('Enlace de YouTube no válido',1);
    const tid=$('#tId').value, title=$('#tTitle').value.trim(), desc=$('#tDesc').value.trim();
    if(tid){const x=data.tutorials.find(v=>v.id===tid); if(x){x.title=title;x.desc=desc;x.vid=vid}}
    else data.tutorials.push({id:uid(),title,desc,vid});
    if(!await save())return;resetTutForm();renderAdminTuts();renderTutorials();toast(tid?'Tutorial actualizado':'Tutorial agregado');
  });
  function resetTutForm(){$('#tutForm').reset();$('#tId').value='';$('#tSave').textContent='Agregar tutorial';$('#tCancel').style.display='none'}
  $('#tCancel').onclick=resetTutForm;
  $('#exportBtn').onclick=()=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
    a.download='data.json';a.click();
  };
  $('#importFile').addEventListener('change',async e=>{
    try{const j=JSON.parse(await e.target.files[0].text());
      if(!Array.isArray(j.products)||!Array.isArray(j.tutorials))throw 0;
      data=j;if(!await save())throw Error('save');renderProducts();renderTutorials();renderAdminProducts();renderAdminTuts();toast('Respaldo importado');
    }catch(_){toast('Archivo no válido',1)}
    e.target.value='';
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModals()});

  /* Animación al hacer scroll */
  const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.12});
  $$('.reveal').forEach(el=>io.observe(el));

  load().then(()=>{renderProducts();renderTutorials()});
})();
