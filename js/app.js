const $ = s => document.querySelector(s);
let SERVICES = [];
let BARBERS = [];
const BUSINESS_RANGES = [{start:'09:00',end:'12:00'},{start:'13:00',end:'18:00'}];

function toMin(t){ const [h,m]=String(t).split(':').map(Number); return h*60+m; }
function to24(n){ return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }
function label(n){ const h=Math.floor(n/60),m=n%60,ap=h>=12?'PM':'AM',hh=(h%12)||12; return `${hh}:${String(m).padStart(2,'0')} ${ap}`; }
function slots(){ const a=[]; BUSINESS_RANGES.forEach(r=>{ for(let n=toMin(r.start);n<=toMin(r.end);n++) a.push({value:to24(n),text:label(n),min:n}); }); return a; }
function today(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function showToast(text,type='info'){
  const el=document.createElement('div'); el.className='toast-message'; el.textContent=text;
  if(type==='error') el.style.borderColor='#dc3545';
  document.body.appendChild(el); setTimeout(()=>el.remove(),4200);
}

async function loadData(){
  const [servicesRes,barbersRes]=await Promise.all([
    supabaseClient.from('services').select('*').eq('active',true).order('name'),
    supabaseClient.from('barbers').select('*').eq('active',true).order('name')
  ]);
  if(servicesRes.error) throw servicesRes.error;
  if(barbersRes.error) throw barbersRes.error;
  SERVICES=servicesRes.data||[]; BARBERS=barbersRes.data||[];
}

function renderData(){
  const grid=$('#servicesGrid'), serviceSelect=$('#serviceSelect'), barberSelect=$('#barberSelect');
  grid.innerHTML=''; serviceSelect.innerHTML=''; barberSelect.innerHTML='';
  SERVICES.forEach(s=>{
    grid.insertAdjacentHTML('beforeend',`<div class="col-sm-6 col-lg-4"><article class="service-card"><i class="bi bi-scissors service-icon"></i><h3>${escapeHtml(s.name)}</h3><div class="price">$${Number(s.price).toFixed(2)}</div><button type="button" class="btn btn-outline-light btn-sm reserve-service" data-service="${s.id}">Reservar</button></article></div>`);
    serviceSelect.insertAdjacentHTML('beforeend',`<option value="${s.id}">${escapeHtml(s.name)} — $${Number(s.price).toFixed(2)}</option>`);
  });
  BARBERS.forEach(b=>barberSelect.insertAdjacentHTML('beforeend',`<option value="${b.id}">${escapeHtml(b.name)}</option>`));
  document.querySelectorAll('.reserve-service').forEach(btn=>btn.addEventListener('click',()=>{ serviceSelect.value=btn.dataset.service; refreshTimes(); $('#reservar').scrollIntoView({behavior:'smooth'}); }));
}

async function refreshTimes(){
  const date=$('#bookingDate').value, barberId=$('#barberSelect').value;
  const service=SERVICES.find(s=>s.id===$('#serviceSelect').value);
  const sel=$('#bookingTime'); sel.innerHTML='<option value="">Selecciona una hora</option>';
  if(!date||!barberId||!service) return;
  const {data,error}=await supabaseClient.rpc('get_available_slots',{
    p_barber_id:barberId,p_date:date,p_duration:Number(service.duration)||30
  });
  if(error){ console.error(error); showToast('No se pudieron cargar los horarios disponibles.','error'); return; }
  (data||[]).forEach(row=>{
    // Supabase RPC devuelve cada fila como un objeto: { slot: '09:00:00' }
    const t = typeof row === 'object' && row !== null ? row.slot : row;
    if(!t) return;
    const timeValue = String(t).slice(0,5);
    const n=toMin(timeValue);
    if(Number.isNaN(n)) return;
    sel.insertAdjacentHTML('beforeend',`<option value="${timeValue}">${label(n)}</option>`);
  });
  if(sel.options.length===1) sel.insertAdjacentHTML('beforeend','<option value="" disabled>No hay horarios disponibles</option>');
}

function escapeHtml(v){ return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

document.addEventListener('DOMContentLoaded',async()=>{
  $('#year').textContent=new Date().getFullYear();
  $('#bookingDate').min=today(); $('#bookingDate').value=today();
  try{
    await loadData(); renderData(); await refreshTimes();
  }catch(err){ console.error(err); showToast('Error conectando con la base de datos. Revisa Supabase.','error'); }

  $('#serviceSelect').addEventListener('change',refreshTimes);
  $('#barberSelect').addEventListener('change',refreshTimes);
  $('#bookingDate').addEventListener('change',refreshTimes);

  $('#bookingForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=e.submitter||e.target.querySelector('button[type="submit"]');
    const service=SERVICES.find(s=>s.id===$('#serviceSelect').value);
    const barber=BARBERS.find(b=>b.id===$('#barberSelect').value);
    const date=$('#bookingDate').value,time=$('#bookingTime').value;
    if(!service||!barber||!date||!time){ showToast('Completa todos los datos de la reserva.','error'); return; }
    btn.disabled=true; const original=btn.innerHTML; btn.innerHTML='<span class="spinner-border spinner-border-sm me-2"></span>GUARDANDO...';
    try{
      const {data,error}=await supabaseClient.rpc('book_appointment',{
        p_client_name:$('#clientName').value.trim(),
        p_client_phone:$('#clientPhone').value.trim(),
        p_client_email:null,
        p_barber_id:barber.id,
        p_service_id:service.id,
        p_date:date,
        p_time:time,
        p_notes:$('#bookingNote').value.trim()||null
      });
      if(error) throw error;
      const chosen=label(toMin(time));
      const msg=`💈 *NUEVA SOLICITUD DE CITA — BARBER BLACKYWHITE*%0A%0A👤 *Cliente:* ${encodeURIComponent($('#clientName').value.trim())}%0A📱 *Teléfono:* ${encodeURIComponent($('#clientPhone').value.trim())}%0A✂️ *Servicio:* ${encodeURIComponent(service.name)}%0A👨‍💈 *Barbero:* ${encodeURIComponent(barber.name)}%0A📅 *Fecha:* ${date}%0A🕐 *Hora:* ${encodeURIComponent(chosen)}%0A💵 *Precio:* $${Number(service.price).toFixed(2)}${$('#bookingNote').value.trim()?`%0A📝 *Nota:* ${encodeURIComponent($('#bookingNote').value.trim())}`:''}`;
      showToast('¡Cita guardada correctamente! Abriendo WhatsApp...');
      setTimeout(()=>window.open(`https://wa.me/50378663583?text=${msg}`,'_blank'),400);
      e.target.reset(); $('#bookingDate').min=today(); $('#bookingDate').value=today(); await refreshTimes();
    }catch(err){
      console.error(err); const message=String(err.message||'');
      console.error('Error detallado al guardar:', err); showToast(message.includes('HORARIO_OCUPADO')?'Ese horario acaba de ser ocupado. Elige otro.':(message || 'No se pudo guardar la cita. Intenta nuevamente.'),'error');
      await refreshTimes();
    }finally{ btn.disabled=false; btn.innerHTML=original; }
  });
});
