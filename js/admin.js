let modal;
let APPOINTMENTS=[], CLIENTS=[], BARBERS=[], SERVICES=[];
const today=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
let calendarDate=new Date();
let calendarSelectedDate=today();
const STATUS_LABELS={pending:'Pendiente',confirmed:'Confirmada',completed:'Finalizada',cancelled:'Cancelada'};
const STATUS_CLASS={pending:'status-pendiente',confirmed:'status-confirmada',completed:'status-finalizada',cancelled:'status-cancelada'};
const money=v=>`$${Number(v||0).toFixed(2)}`;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fmtTime=t=>{if(!t)return'';const [h,m]=String(t).slice(0,5).split(':').map(Number);return `${(h%12)||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`};
const dateLabel=d=>{if(!d)return'';const [y,m,day]=d.split('-');return `${day}/${m}/${y}`};
const wa=phone=>`https://wa.me/503${String(phone||'').replace(/\D/g,'').replace(/^503/,'')}`;

document.addEventListener('DOMContentLoaded',async()=>{
 // IMPORTANTE: conectar el formulario primero, antes de cualquier dependencia externa.
 const loginFormEl=document.getElementById('loginForm');
 if(loginFormEl) loginFormEl.addEventListener('submit',login);

 // Bootstrap no debe impedir que el login funcione.
 try{
  if(window.bootstrap && document.getElementById('appModal')){
   modal=new bootstrap.Modal(document.getElementById('appModal'));
  }
 }catch(err){ console.warn('Bootstrap no disponible; el login seguirá funcionando.',err); }

 const bind=(id,event,fn)=>{
  const el=document.getElementById(id);
  if(el) el.addEventListener(event,fn);
 };
 document.querySelectorAll('.nav-admin').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view,b)));
 bind('mobileMenu','click',()=>document.querySelector('.sidebar')?.classList.toggle('show'));
 const mobile=document.querySelector('.mobile-menu');
 if(mobile) mobile.onclick=()=>document.querySelector('.sidebar')?.classList.toggle('show');
 bind('logoutBtn','click',logout);
 bind('refreshBtn','click',loadAll);
 bind('refreshAppointments','click',loadAll);
 ['appointmentSearch','appointmentDate','appointmentFilter','appointmentStatus'].forEach(id=>{
  const el=document.getElementById(id); if(el) el.addEventListener('input',renderAppointments);
 });
 const filter=document.getElementById('appointmentFilter'); if(filter) filter.addEventListener('change',renderAppointments);
 const clientSearch=document.getElementById('clientSearch'); if(clientSearch) clientSearch.addEventListener('input',renderClients);
 bind('calendarPrev','click',()=>changeCalendarMonth(-1));
 bind('calendarNext','click',()=>changeCalendarMonth(1));
 bind('calendarToday','click',()=>{calendarDate=new Date();calendarSelectedDate=today();renderCalendar();});
 bind('newBarberBtn','click',()=>editBarber());
 bind('newServiceBtn','click',()=>editService());

 try{
  if(!window.supabaseClient){
   showLogin();
   setLoginMessage('No se pudo cargar Supabase. Abre el proyecto con Live Server y revisa tu conexión.',true);
   return;
  }
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(session) await showApp(session); else showLogin();
  supabaseClient.auth.onAuthStateChange((_e,s)=>{if(!s)showLogin()});
 }catch(err){
  console.error('Inicialización del panel:',err);
  showLogin();
  setLoginMessage('No se pudo iniciar el panel. Revisa la conexión con Supabase.',true);
 }
});
async function login(e){
 e.preventDefault();
 const emailEl=document.getElementById('loginEmail');
 const passEl=document.getElementById('loginPassword');
 const email=(emailEl?.value||'').trim();
 const password=passEl?.value||'';
 setLoginMessage('Iniciando sesión...');
 if(!window.supabaseClient){
  setLoginMessage('Supabase no se cargó. Usa Live Server para abrir el proyecto.',true);
  return false;
 }
 try{
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){
   console.error('Supabase login error:',error);
   let msg=error.message||'No se pudo iniciar sesión.';
   if(/invalid login credentials/i.test(msg)) msg='Correo o contraseña incorrectos.';
   else if(/email not confirmed/i.test(msg)) msg='El correo del administrador no está confirmado en Supabase.';
   setLoginMessage(msg,true);
   return false;
  }
  if(!data?.session){
   setLoginMessage('Supabase no devolvió una sesión.',true);
   return false;
  }
  await showApp(data.session);
 }catch(err){
  console.error('Login exception:',err);
  setLoginMessage('Error al conectar con Supabase: '+(err?.message||err),true);
 }
 return false;
}
async function logout(){await supabaseClient.auth.signOut();showLogin()}
function showLogin(){loginScreen.classList.remove('d-none');appScreen.classList.add('d-none')}
async function showApp(session){
 const {data:adminRow,error}=await supabaseClient.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle();
 if(error){console.error(error);setLoginMessage('Configura la tabla de administradores en Supabase.',true);await supabaseClient.auth.signOut();return}
 if(!adminRow){setLoginMessage('Este usuario no tiene permisos de administrador.',true);await supabaseClient.auth.signOut();return}
 loginScreen.classList.add('d-none');appScreen.classList.remove('d-none');adminEmail.textContent=session.user.email||'Administrador';avatarInitial.textContent=(session.user.email||'B')[0].toUpperCase();await loadAll()}
function setLoginMessage(t,error=false){loginMessage.textContent=t;loginMessage.className='login-message'+(error?' error':'')}
async function loadAll(){
 try{
  const [a,c,b,s]=await Promise.all([
   supabaseClient.from('appointments').select('id,client_id,barber_id,service_id,appointment_date,appointment_time,status,notes,created_at,clients:client_id(id,name,phone,email),barbers:barber_id(id,name,active),services:service_id(id,name,price,duration,active)').order('appointment_date',{ascending:true}).order('appointment_time',{ascending:true}),
   supabaseClient.from('clients').select('id,name,phone,email,created_at').order('name'),
   supabaseClient.from('barbers').select('id,name,active,photo_url').order('name'),
   supabaseClient.from('services').select('id,name,price,duration,active').order('name')
  ]);
  if(a.error)throw a.error;if(c.error)throw c.error;if(b.error)throw b.error;if(s.error)throw s.error;
  APPOINTMENTS=a.data||[];CLIENTS=c.data||[];BARBERS=b.data||[];SERVICES=s.data||[];renderAll();
  lastUpdated.textContent='Actualizado '+new Date().toLocaleTimeString('es-SV',{hour:'2-digit',minute:'2-digit'});
 }catch(err){console.error(err);toast('No se pudo cargar el panel: '+(err.message||'Error'),'error')}
}
function renderAll(){renderStats();fillFilter();renderDashboard();renderAppointments();renderClients();renderBarbers();renderServices();renderInsights();renderCalendar()}
function renderStats(){
 const t=today(),todayList=APPOINTMENTS.filter(a=>a.appointment_date===t&&a.status!=='cancelled');
 statToday.textContent=todayList.length;statPending.textContent=APPOINTMENTS.filter(a=>a.status==='pending').length;statConfirmed.textContent=APPOINTMENTS.filter(a=>a.status==='confirmed').length;
 statRevenue.textContent=money(todayList.reduce((sum,a)=>sum+Number(a.services?.price||0),0));statClients.textContent=CLIENTS.length;statServices.textContent=SERVICES.filter(s=>s.active!==false).length;statBarbers.textContent=BARBERS.filter(b=>b.active!==false).length;
}
function appointmentRow(a){const c=a.clients||{},b=a.barbers||{},s=a.services||{},st=a.status||'pending';return `<div class="appointment-row">
 <div class="appointment-time">${fmtTime(a.appointment_time)}<small>${dateLabel(a.appointment_date)}</small></div>
 <div><strong>${esc(c.name||'Cliente')}</strong><small>📱 ${esc(c.phone||'Sin teléfono')}</small></div>
 <div class="hide-mobile"><strong>${esc(s.name||'Servicio')}</strong><small>👨‍💈 ${esc(b.name||'Barbero')}</small></div>
 <div><span class="badge-status ${STATUS_CLASS[st]||''}">${STATUS_LABELS[st]||esc(st)}</span></div>
 <div class="row-actions"><button class="table-action" title="Ver detalles" onclick="viewAppointment('${a.id}')"><i class="bi bi-eye"></i></button><button class="table-action" title="Cambiar estado" onclick="editStatus('${a.id}','${st}')"><i class="bi bi-pencil-square"></i></button><button class="table-action danger" title="Eliminar" onclick="deleteAppointment('${a.id}')"><i class="bi bi-trash"></i></button></div>
 </div>`}
function renderDashboard(){const t=today();const list=APPOINTMENTS.filter(a=>a.status!=='cancelled'&&a.appointment_date>=t).slice(0,8);dashboardAppointments.innerHTML=list.length?list.map(appointmentRow).join(''):`<div class="empty-state">No hay próximas citas.</div>`}
function fillFilter(){const f=appointmentFilter,current=f.value;f.innerHTML='<option value="">Todos los barberos</option>'+BARBERS.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}${b.active===false?' · Inactivo':''}</option>`).join('');f.value=current}
function renderAppointments(){const q=appointmentSearch.value.toLowerCase().trim(),date=appointmentDate.value,barber=appointmentFilter.value,status=appointmentStatus.value;const list=APPOINTMENTS.filter(a=>{const c=a.clients||{},text=`${c.name||''} ${c.phone||''} ${a.services?.name||''}`.toLowerCase();return(!q||text.includes(q))&&(!date||a.appointment_date===date)&&(!barber||a.barber_id===barber)&&(!status||a.status===status)});appointmentsList.innerHTML=list.length?list.map(appointmentRow).join(''):`<div class="empty-state">No hay citas que coincidan con los filtros.</div>`}
function renderClients(){const q=(clientSearch.value||'').toLowerCase().trim();const list=CLIENTS.filter(c=>`${c.name||''} ${c.phone||''} ${c.email||''}`.toLowerCase().includes(q));clientsList.innerHTML=list.length?list.map(c=>{const ap=APPOINTMENTS.filter(a=>a.client_id===c.id),done=ap.filter(a=>a.status==='completed').length;return `<article class="client-card"><div class="client-card-top"><div class="client-avatar">${esc((c.name||'?')[0].toUpperCase())}</div><span class="mini-count">${ap.length} cita${ap.length===1?'':'s'}</span></div><h4>${esc(c.name)}</h4><p>📱 ${esc(c.phone||'Sin teléfono')}</p><p>✉️ ${esc(c.email||'Sin correo')}</p><p>✂️ ${done} finalizada${done===1?'':'s'}</p><div class="card-actions"><button class="btn btn-sm btn-light" onclick="viewClient('${c.id}')">Ver historial</button><a class="btn btn-sm btn-outline-light" href="${wa(c.phone)}" target="_blank"><i class="bi bi-whatsapp"></i></a></div></article>`}).join(''):`<div class="empty-state">No hay clientes.</div>`}
function renderBarbers(){barbersList.innerHTML=BARBERS.length?BARBERS.map(b=>{const ap=APPOINTMENTS.filter(a=>a.barber_id===b.id&&a.status!=='cancelled'),todayCount=ap.filter(a=>a.appointment_date===today()).length,revenue=ap.reduce((x,a)=>x+Number(a.services?.price||0),0);const photo=b.photo_url?`<img src="${esc(b.photo_url)}" alt="Foto de ${esc(b.name)}" class="barber-profile-photo">`:`<div class="barber-avatar">💈</div>`;return `<article class="barber-card"><div class="barber-card-top"><div class="barber-profile-wrap">${photo}</div><span class="active-dot ${b.active===false?'off':''}">${b.active===false?'Inactivo':'Activo'}</span></div><h4>${esc(b.name)}</h4><div class="metric-line"><span>Hoy</span><strong>${todayCount}</strong></div><div class="metric-line"><span>Citas</span><strong>${ap.length}</strong></div><div class="metric-line"><span>Ingresos</span><strong>${money(revenue)}</strong></div><div class="barber-photo-actions"><button class="btn btn-outline-light btn-sm" onclick="editBarber('${b.id}')"><i class="bi bi-image me-1"></i>${b.photo_url?'Cambiar foto':'Agregar foto'}</button>${b.photo_url?`<button class="btn btn-outline-danger btn-sm" onclick="removeBarberPhoto('${b.id}')"><i class="bi bi-trash me-1"></i>Quitar</button>`:''}</div></article>`}).join(''):`<div class="empty-state">No hay barberos.</div>`}
function renderServices(){servicesList.innerHTML=SERVICES.length?SERVICES.map(s=>{const ap=APPOINTMENTS.filter(a=>a.service_id===s.id&&a.status!=='cancelled'),revenue=ap.reduce((x,a)=>x+Number(s.price||0),0);return `<article class="service-admin-card"><div class="service-card-top"><small>SERVICIO</small><span class="active-dot ${s.active===false?'off':''}">${s.active===false?'Inactivo':'Activo'}</span></div><h4>${esc(s.name)}</h4><div class="service-price">${money(s.price)}</div><p>${Number(s.duration||30)} minutos</p><div class="service-meta"><span>${ap.length} reservas</span><strong>${money(revenue)}</strong></div><button class="btn btn-outline-light btn-sm w-100 mt-3" onclick="editService('${s.id}')"><i class="bi bi-pencil me-1"></i>Editar</button></article>`}).join(''):`<div class="empty-state">No hay servicios.</div>`}

function isoDate(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function monthName(d){return d.toLocaleDateString('es-SV',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())}
function changeCalendarMonth(delta){calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+delta,1);renderCalendar()}
function renderCalendar(){
 const y=calendarDate.getFullYear(),m=calendarDate.getMonth();
 calendarMonth.textContent=monthName(calendarDate);
 const first=new Date(y,m,1),days=new Date(y,m+1,0).getDate();
 let start=(first.getDay()+6)%7;
 const cells=[];
 for(let i=0;i<start;i++) cells.push('<div class="calendar-cell empty"></div>');
 for(let d=1;d<=days;d++){
   const date=isoDate(y,m,d),list=APPOINTMENTS.filter(a=>a.appointment_date===date),active=list.filter(a=>a.status!=='cancelled');
   const isToday=date===today(),selected=date===calendarSelectedDate;
   const dots=list.slice(0,4).map(a=>`<i class="dot ${a.status||'pending'}"></i>`).join('');
   cells.push(`<button type="button" class="calendar-cell ${isToday?'today':''} ${selected?'selected':''}" onclick="selectCalendarDate('${date}')"><span class="calendar-number">${d}</span><span class="calendar-count">${active.length?active.length+' cita'+(active.length===1?'':'s'):''}</span><span class="calendar-dots">${dots}</span></button>`);
 }
 calendarGrid.innerHTML=cells.join('');
 const monthList=APPOINTMENTS.filter(a=>a.appointment_date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`));
 const activeMonth=monthList.filter(a=>a.status!=='cancelled');
 calendarSummary.textContent=`${activeMonth.length} citas activas este mes · ${monthList.length-activeMonth.length} canceladas`;
 renderCalendarDay();
}
function selectCalendarDate(date){calendarSelectedDate=date;const d=new Date(`${date}T12:00:00`);calendarDate=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar()}
function renderCalendarDay(){
 const list=APPOINTMENTS.filter(a=>a.appointment_date===calendarSelectedDate).sort((a,b)=>String(a.appointment_time).localeCompare(String(b.appointment_time)));
 const d=new Date(`${calendarSelectedDate}T12:00:00`);
 calendarDayTitle.textContent=d.toLocaleDateString('es-SV',{weekday:'long',day:'numeric',month:'long'}).replace(/^./,c=>c.toUpperCase());
 calendarDaySubtitle.textContent=`${list.length} cita${list.length===1?'':'s'} registrada${list.length===1?'':'s'} · ${dateLabel(calendarSelectedDate)}`;
 calendarDayList.innerHTML=list.length?list.map(appointmentRow).join(''):`<div class="empty-state">No hay citas para este día.</div>`;
}

function renderInsights(){const active=BARBERS.filter(b=>b.active!==false);topBarbers.innerHTML=active.map(b=>{const n=APPOINTMENTS.filter(a=>a.barber_id===b.id&&a.status!=='cancelled').length;return `<div class="insight-row"><span>${esc(b.name)}</span><div class="progress"><div style="width:${Math.min(100,n*10)}%"></div></div><strong>${n}</strong></div>`}).join('')||'<div class="empty-state">Sin datos</div>';topServices.innerHTML=SERVICES.filter(s=>s.active!==false).map(s=>{const n=APPOINTMENTS.filter(a=>a.service_id===s.id&&a.status!=='cancelled').length;return `<div class="insight-row"><span>${esc(s.name)}</span><div class="progress"><div style="width:${Math.min(100,n*10)}%"></div></div><strong>${n}</strong></div>`}).join('')||'<div class="empty-state">Sin datos</div>'}
function openModal(title,html,after){modalTitle.textContent=title;modalBody.innerHTML=html;modal.show();if(after)after()}
function viewAppointment(id){const a=APPOINTMENTS.find(x=>x.id===id);if(!a)return;const c=a.clients||{},s=a.services||{},b=a.barbers||{};openModal('Detalle de la cita',`<div class="detail-grid"><div><small>CLIENTE</small><strong>${esc(c.name)}</strong></div><div><small>TELÉFONO</small><strong>${esc(c.phone)}</strong></div><div><small>SERVICIO</small><strong>${esc(s.name)} · ${money(s.price)}</strong></div><div><small>BARBERO</small><strong>${esc(b.name)}</strong></div><div><small>FECHA</small><strong>${dateLabel(a.appointment_date)}</strong></div><div><small>HORA</small><strong>${fmtTime(a.appointment_time)}</strong></div></div><div class="detail-note"><small>NOTA</small><p>${esc(a.notes||'Sin notas adicionales.')}</p></div><div class="card-actions"><a class="btn btn-light" href="${wa(c.phone)}" target="_blank"><i class="bi bi-whatsapp me-1"></i>Contactar</a><button class="btn btn-outline-light" onclick="modal.hide();editStatus('${a.id}','${a.status||'pending'}')">Cambiar estado</button></div>`)}
function viewClient(id){const c=CLIENTS.find(x=>x.id===id);if(!c)return;const list=APPOINTMENTS.filter(a=>a.client_id===id).sort((x,y)=>(y.appointment_date+y.appointment_time).localeCompare(x.appointment_date+x.appointment_time));openModal('Historial del cliente',`<div class="client-detail-head"><div class="client-avatar">${esc((c.name||'?')[0].toUpperCase())}</div><div><h4>${esc(c.name)}</h4><p>${esc(c.phone||'Sin teléfono')} · ${esc(c.email||'Sin correo')}</p></div></div><div class="history-list">${list.length?list.map(a=>`<div class="history-item"><div><strong>${dateLabel(a.appointment_date)} · ${fmtTime(a.appointment_time)}</strong><small>${esc(a.services?.name||'Servicio')} · ${esc(a.barbers?.name||'Barbero')}</small></div><span class="badge-status ${STATUS_CLASS[a.status]||''}">${STATUS_LABELS[a.status]||a.status}</span></div>`).join(''):'<div class="empty-state">Sin historial.</div>'}</div><a class="btn btn-light w-100 mt-3" href="${wa(c.phone)}" target="_blank"><i class="bi bi-whatsapp me-1"></i>Contactar por WhatsApp</a>`)}
function editStatus(id,current){const options=Object.keys(STATUS_LABELS).map(v=>`<option value="${v}" ${v===current?'selected':''}>${STATUS_LABELS[v]}</option>`).join('');openModal('Actualizar estado',`<form id="statusForm"><label>Estado de la cita</label><select id="statusValue" class="form-select">${options}</select><button class="btn btn-light w-100 mt-3">Guardar cambios</button></form>`,()=>statusForm.onsubmit=async e=>{e.preventDefault();const {error}=await supabaseClient.from('appointments').update({status:statusValue.value}).eq('id',id);if(error){toast(error.message,'error');return}modal.hide();await loadAll();toast('Estado actualizado.')})}
async function deleteAppointment(id){if(!confirm('¿Eliminar esta cita definitivamente?'))return;const {error}=await supabaseClient.from('appointments').delete().eq('id',id);if(error){toast(error.message,'error');return}await loadAll();toast('Cita eliminada.')}
function storagePhotoPath(id){return `barber-profiles/${id}/profile`;}
function publicBarberPhotoUrl(path){return supabaseClient.storage.from('barber-profiles').getPublicUrl(path).data.publicUrl;}
async function uploadBarberPhoto(id,file){
 if(!file) return null;
 if(!file.type.startsWith('image/')) throw new Error('Selecciona una imagen válida.');
 if(file.size>5*1024*1024) throw new Error('La foto debe pesar menos de 5 MB.');
 const path=storagePhotoPath(id);
 const {error}=await supabaseClient.storage.from('barber-profiles').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'});
 if(error) throw error;
 return publicBarberPhotoUrl(path)+`?v=${Date.now()}`;
}
async function deleteBarberPhotoFile(id){
 const {error}=await supabaseClient.storage.from('barber-profiles').remove([storagePhotoPath(id)]);
 if(error) console.warn('No se pudo eliminar el archivo de Storage:',error);
}
function editBarber(id){
 const b=BARBERS.find(x=>x.id===id)||{name:'',active:true,photo_url:null};
 const preview=b.photo_url?`<img src="${esc(b.photo_url)}" class="barber-modal-preview" alt="Foto actual">`:`<div class="barber-modal-placeholder">💈<small>Sin foto</small></div>`;
 openModal(id?'Editar barbero':'Nuevo barbero',`<form id="barberForm">
 <div class="barber-photo-editor">
   <div id="barberPhotoPreview">${preview}</div>
   <div class="barber-photo-fields">
     <label>Foto de perfil</label>
     <input id="barberPhoto" type="file" class="form-control" accept="image/*">
     <small class="text-secondary">JPG, PNG o WEBP · máximo 5 MB</small>
     ${id&&b.photo_url?`<button type="button" id="removeBarberPhotoBtn" class="btn btn-outline-danger btn-sm mt-2"><i class="bi bi-trash me-1"></i>Quitar foto</button>`:''}
   </div>
 </div>
 <label>Nombre</label><input id="barberName" class="form-control" value="${esc(b.name)}" required>
 <label class="mt-3">Estado</label>
 <select id="barberActive" class="form-select"><option value="true" ${b.active!==false?'selected':''}>Activo</option><option value="false" ${b.active===false?'selected':''}>Inactivo</option></select>
 <button class="btn btn-light w-100 mt-3">${id?'Guardar cambios':'Crear barbero'}</button>
 </form>`,
 ()=>{
   const photoInput=document.getElementById('barberPhoto');
   const previewEl=document.getElementById('barberPhotoPreview');
   if(photoInput) photoInput.addEventListener('change',()=>{
     const file=photoInput.files?.[0];
     if(!file) return;
     const reader=new FileReader();
     reader.onload=()=>{previewEl.innerHTML=`<img src="${reader.result}" class="barber-modal-preview" alt="Vista previa">`;};
     reader.readAsDataURL(file);
   });
   const removeBtn=document.getElementById('removeBarberPhotoBtn');
   if(removeBtn) removeBtn.onclick=async()=>{
     if(!confirm('¿Quitar la foto de este barbero?')) return;
     try{
       await deleteBarberPhotoFile(id);
       const {error}=await supabaseClient.from('barbers').update({photo_url:null}).eq('id',id);
       if(error) throw error;
       modal.hide(); await loadAll(); toast('Foto quitada.');
     }catch(err){toast(err.message||'No se pudo quitar la foto.','error');}
   };
   barberForm.onsubmit=async e=>{
     e.preventDefault();
     const btn=e.submitter; if(btn) btn.disabled=true;
     try{
       const payload={name:barberName.value.trim(),active:barberActive.value==='true'};
       let barberId=id;
       if(id){
         const res=await supabaseClient.from('barbers').update(payload).eq('id',id);
         if(res.error) throw res.error;
       }else{
         const res=await supabaseClient.from('barbers').insert(payload).select('id').single();
         if(res.error) throw res.error;
         barberId=res.data.id;
       }
       const file=photoInput?.files?.[0];
       if(file){
         const photoUrl=await uploadBarberPhoto(barberId,file);
         const res=await supabaseClient.from('barbers').update({photo_url:photoUrl}).eq('id',barberId);
         if(res.error) throw res.error;
       }
       modal.hide(); await loadAll(); toast(id?'Barbero actualizado.':'Barbero creado.');
     }catch(err){
       console.error('Error guardando barbero:',err);
       toast(err.message||'No se pudo guardar el barbero.','error');
       if(btn) btn.disabled=false;
     }
   };
 });
}
async function removeBarberPhoto(id){
 if(!confirm('¿Quitar la foto de este barbero?')) return;
 try{
   await deleteBarberPhotoFile(id);
   const {error}=await supabaseClient.from('barbers').update({photo_url:null}).eq('id',id);
   if(error) throw error;
   await loadAll(); toast('Foto quitada.');
 }catch(err){console.error(err);toast(err.message||'No se pudo quitar la foto.','error');}
}

function editService(id){const s=SERVICES.find(x=>x.id===id)||{name:'',price:0,duration:30,active:true};openModal(id?'Editar servicio':'Nuevo servicio',`<form id="serviceForm"><label>Nombre del servicio</label><input id="serviceName" class="form-control" value="${esc(s.name)}" required><div class="row g-3 mt-1"><div class="col-6"><label>Precio</label><input id="servicePrice" type="number" min="0" step="0.01" class="form-control" value="${Number(s.price||0).toFixed(2)}" required></div><div class="col-6"><label>Duración (min)</label><input id="serviceDuration" type="number" min="5" step="5" class="form-control" value="${Number(s.duration||30)}" required></div></div><label class="mt-3">Estado</label><select id="serviceActive" class="form-select"><option value="true" ${s.active!==false?'selected':''}>Activo</option><option value="false" ${s.active===false?'selected':''}>Inactivo</option></select><button class="btn btn-light w-100 mt-3">${id?'Guardar cambios':'Crear servicio'}</button></form>`,()=>serviceForm.onsubmit=async e=>{e.preventDefault();const payload={name:serviceName.value.trim(),price:Number(servicePrice.value),duration:Number(serviceDuration.value),active:serviceActive.value==='true'};const res=id?await supabaseClient.from('services').update(payload).eq('id',id):await supabaseClient.from('services').insert(payload);if(res.error){toast(res.error.message,'error');return}modal.hide();await loadAll();toast(id?'Servicio actualizado.':'Servicio creado.')})}
function switchView(view,btn){document.querySelectorAll('.admin-view').forEach(v=>v.classList.remove('active'));document.getElementById(view).classList.add('active');document.querySelectorAll('.nav-admin').forEach(v=>v.classList.remove('active'));btn.classList.add('active');viewTitle.textContent=btn.textContent.trim();document.querySelector('.sidebar').classList.remove('show')}
function toast(text,type='info'){const el=document.createElement('div');el.className='toast-message';if(type==='error')el.style.borderColor='#dc3545';el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),4500)}
