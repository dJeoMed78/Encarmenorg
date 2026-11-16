import React,{useEffect,useRef,useState} from 'react';
import {Search,X,ExternalLink,Building2} from 'lucide-react';
import type {Business} from '../types';
import type {DenueCandidate} from '../types/denue';
import {searchDenue,approveDenue} from '../services/denueApi';
import {adminFetch} from '../utils/adminAuth';

export interface DenueRadarProps {
  isOpen:boolean;onClose:()=>void;onBusinessApproved?:(business:Business)=>void;
  initialSource?:'all'|'official_group'|'official_page'|'whatsapp'|'community'|'ai';autoTriggerAiScan?:boolean;
}
export function DenueBusinessRadar({isOpen,onClose,onBusinessApproved}:DenueRadarProps) {
  const [query,setQuery]=useState(''),[candidates,setCandidates]=useState<DenueCandidate[]>([]);
  const [selected,setSelected]=useState<string[]>([]),[reviewed,setReviewed]=useState<string[]>([]);
  const [unavailable,setUnavailable]=useState<string[]>([]),[notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false),[nextPage,setNextPage]=useState<number|null>(null);
  const [loadedQuery,setLoadedQuery]=useState(''),[confirming,setConfirming]=useState(false);
  const [token,setToken]=useState(''),[tokenConfigured,setTokenConfigured]=useState<boolean|null>(null),[tokenBusy,setTokenBusy]=useState(false);
  const generation=useRef(0),inFlight=useRef(false);
  useEffect(()=>{if(!isOpen)return;let cancelled=false;adminFetch('/api/admin/denue-token').then(r=>r.json()).then(data=>{if(!cancelled)setTokenConfigured(data.success?!!data.configured:null);}).catch(()=>{if(!cancelled)setTokenConfigured(null);});return()=>{cancelled=true;};},[isOpen]);
  async function saveToken(){
    if(tokenBusy||!/^[A-Za-z0-9-]{8,128}$/.test(token)){setNotice('Token inválido: utiliza de 8 a 128 letras, números o guiones.');return;}
    setTokenBusy(true);setNotice('');
    try{const response=await adminFetch('/api/admin/denue-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
      const data=await response.json();if(!response.ok||!data.success)throw Error(data.code||'No se confirmó el guardado.');
      setToken('');setTokenConfigured(true);setNotice('Token DENUE guardado de forma privada en Staging. Ya puedes consultar.');
    }catch(error){setNotice(error instanceof Error?error.message:'No se pudo guardar el token.');}
    finally{setTokenBusy(false);}
  }
  useEffect(()=>{generation.current++;setCandidates([]);setSelected([]);setReviewed([]);setUnavailable([]);setNextPage(null);setConfirming(false);setNotice('');
    return()=>{generation.current++;};},[isOpen]);
  async function search(page=1){
    if(inFlight.current)return;inFlight.current=true;const version=++generation.current;setBusy(true);setNotice('');
    try{const term=page===1?query:loadedQuery;const data=await searchDenue(term,page);if(version!==generation.current)return;
      setCandidates(data.candidates);setSelected([]);setReviewed([]);setUnavailable([]);setNextPage(data.nextPage);setLoadedQuery(term);
      setNotice(data.candidates.length?'Revisa la ficha original y confirma nombre y dirección antes de seleccionar.':'DENUE no devolvió establecimientos para esta consulta.');
    }catch(e){if(version===generation.current)setNotice(e instanceof Error?e.message:'No se pudo consultar DENUE.');}
    finally{inFlight.current=false;setBusy(false);}
  }
  async function approve(){
    if(inFlight.current||!selected.length)return;inFlight.current=true;setBusy(true);const version=generation.current;
    try{const list=candidates.filter(c=>selected.includes(c.denueId)&&reviewed.includes(c.denueId));
      const data=await approveDenue(list);if(version!==generation.current)return;
      const success=data.results.filter(r=>r.success).map(r=>r.denueId);
      setCandidates(prev=>prev.filter(c=>!success.includes(c.denueId)));setSelected(prev=>prev.filter(id=>!success.includes(id)));
      data.confirmed.forEach(b=>onBusinessApproved?.(b));
      setNotice(data.results.map(r=>`${r.denueId}: ${r.success?'confirmado en MariaDB':r.code||'no confirmado'}`).join(' · '));
    }catch(e){if(version===generation.current)setNotice(e instanceof Error?e.message:'No se confirmó la publicación.');}
    finally{inFlight.current=false;setBusy(false);setConfirming(false);}
  }
  if(!isOpen)return null;
  const toggle=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<10?[...prev,id]:prev);
  return <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Radar de empresas DENUE">
    <section className="w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-3xl border border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900 flex gap-2"><Building2/>Radar de empresas · DENUE</h2>
        <p className="text-sm text-slate-600">Ciudad del Carmen, Campeche · 040030001</p></div>
        <button aria-label="Cerrar radar" onClick={onClose} disabled={busy}><X/></button></header>
      <p className="my-3 text-sm text-slate-600">Fuente: INEGI, Directorio Estadístico Nacional de Unidades Económicas. Campos normalizados por ENCARMEN; no implica aval del INEGI. Sin fotografías, horarios ni WhatsApp inferidos.</p>
      <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold mb-2">Configuración privada del token INEGI DENUE · {tokenConfigured===true?'Configurado':tokenConfigured===false?'No configurado':'Estado no disponible'}</p>
        <div className="flex flex-wrap gap-2"><input type="password" autoComplete="off" aria-label="Token privado DENUE" value={token} onChange={e=>setToken(e.target.value)} placeholder="Pegar token INEGI (no se mostrará)" className="min-w-0 flex-1 rounded-xl border p-3" />
        <button type="button" onClick={()=>void saveToken()} disabled={tokenBusy||!token} className="rounded-xl bg-slate-800 text-white px-4 py-2 disabled:opacity-40">Guardar token</button></div>
        <p className="text-xs text-slate-500 mt-2">Solo administradores. El token se guarda en archivo privado del servidor Staging, nunca en el navegador ni en la configuración pública.</p>
      </div>
      <form className="flex flex-wrap gap-2 my-4" onSubmit={e=>{e.preventDefault();void search();}}>
        <input aria-label="Nombre del establecimiento" value={query} maxLength={80} onChange={e=>setQuery(e.target.value)} className="min-w-0 flex-1 rounded-xl border p-3" placeholder="Nombre del establecimiento (vacío: todos)"/>
        <button disabled={busy} className="rounded-xl bg-blue-600 text-white px-4 py-2 flex gap-2"><Search/>Consultar DENUE</button>
        {nextPage&&<button type="button" disabled={busy} onClick={()=>void search(nextPage)} className="rounded-xl border px-4">Siguiente página</button>}
      </form>
      {notice&&<p role="status" className="p-3 rounded-xl bg-slate-100 break-words">{notice}</p>}
      {busy&&<p role="status">Procesando…</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {candidates.map(c=>{
          const blocked=c.geography!=='VERIFICADA'||c.duplicate!=='NUEVO'||!c.address||unavailable.includes(c.denueId);
          return <article key={c.denueId} className="rounded-2xl bg-white/80 border border-slate-200 shadow-sm p-4 min-w-0 break-words">
            <h3 className="font-bold text-lg">{c.name}</h3>
            <dl className="text-sm space-y-1 my-3">
              {Object.entries({'Categoría / actividad económica':c.activity,'Dirección':c.address,'Colonia':c.colonia,'Teléfono':c.phone,'Sitio web':c.website,
                'Razón social':c.legalName,'Correo comercial':c.email,'Código postal':c.postalCode,'Localidad':c.locality,'Municipio':c.municipality,'Estado':c.state,
                'ID DENUE':c.denueId,'CLEE':c.clee,'Estado geográfico':c.geography,'Duplicados':c.duplicate,'Fuente':'INEGI · DENUE','Fecha de consulta':c.consultedAt,
                'Actualización de fuente':c.sourceUpdatedAt,'Alta en DENUE (no actualización)':c.sourceRegisteredAt,
                'Coordenadas':c.latitude!==null&&c.longitude!==null?`${c.latitude}, ${c.longitude}`:''}).map(([label,value])=><div key={label}><dt className="inline font-semibold">{label}: </dt><dd className="inline">{value||'No disponible'}</dd></div>)}
            </dl>
            <p className="text-xs text-slate-500 mb-3">Se importarán estos campos y su procedencia. La actividad económica no es una descripción comercial. Publicación sujeta a revalidación y confirmación SQL.</p>
            <a href={/^\d+$/.test(c.denueId)?`https://www.inegi.org.mx/app/mapa/denue/default.aspx?idee=${c.denueId}`:undefined} target="_blank" rel="noopener noreferrer" className="inline-flex gap-1 text-blue-700 font-semibold"><ExternalLink size={18}/>VER FUENTE ORIGINAL</a>
            <label className="block text-sm my-2"><input type="checkbox" disabled={busy||blocked} checked={reviewed.includes(c.denueId)} onChange={e=>{setReviewed(prev=>e.target.checked?[...prev,c.denueId]:prev.filter(id=>id!==c.denueId));setSelected(prev=>prev.filter(id=>id!==c.denueId));}}/> Comprobé en el visor que ID, nombre y dirección coinciden.</label>
            <button disabled={busy} onClick={()=>{setUnavailable(prev=>[...prev,c.denueId]);setSelected(prev=>prev.filter(id=>id!==c.denueId));}} className="text-sm text-amber-800">{unavailable.includes(c.denueId)?'Fuente no disponible':'La ficha no abre o no coincide'}</button>
            <div className="flex flex-wrap gap-2 mt-3"><button disabled={busy||blocked||!reviewed.includes(c.denueId)} aria-pressed={selected.includes(c.denueId)} onClick={()=>toggle(c.denueId)} className="px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40">{selected.includes(c.denueId)?'Deseleccionar':'Seleccionar'}</button>
              <button disabled={busy} className="px-3 py-2 rounded-xl border" onClick={()=>{setCandidates(prev=>prev.filter(x=>x.denueId!==c.denueId));setSelected(prev=>prev.filter(id=>id!==c.denueId));}}>Descartar de esta consulta</button></div>
          </article>;
        })}
      </div>
      <footer className="sticky bottom-0 bg-white/95 backdrop-blur-xl border-t p-3 rounded-xl">
        <p className="text-sm mb-2">{selected.length} seleccionados · Máximo 10 por lote · Ninguna publicación automática.</p>
        {confirming?<div><p>¿Publicar los {selected.length} establecimientos revisados? Los duplicados o errores se rechazarán individualmente.</p><button disabled={busy} onClick={()=>void approve()} className="bg-blue-600 text-white p-3 rounded-xl mr-2">Confirmar publicación</button><button disabled={busy} onClick={()=>setConfirming(false)}>Cancelar</button></div>
          :<button disabled={busy||!selected.length} onClick={()=>setConfirming(true)} className="bg-blue-600 text-white p-3 rounded-xl disabled:opacity-40">Revisar y aprobar selección</button>}
      </footer>
    </section>
  </div>;
}
