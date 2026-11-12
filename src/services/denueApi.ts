import {adminFetch} from '../utils/adminAuth';
import type {DenueCandidate} from '../types/denue';
export async function searchDenue(query:string,page=1):Promise<{candidates:DenueCandidate[];nextPage:number|null}> {
  const res=await adminFetch(`/api/business-radar/denue?query=${encodeURIComponent(query)}&page=${page}`);
  const data=await res.json().catch(()=>null);
  if(!res.ok||data?.success!==true||!Array.isArray(data.candidates))throw new Error(data?.message||data?.code||'No se confirmó la consulta DENUE.');
  return data;
}
export async function approveDenue(candidates:DenueCandidate[]) {
  const res=await adminFetch('/api/businesses/approve-multiple-candidates',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({candidates:candidates.map(c=>({denueId:c.denueId,revision:c.revision,sourceReviewed:true}))})
  });
  const data=await res.json().catch(()=>null);
  if(!res.ok||!Array.isArray(data?.results)||!Array.isArray(data?.confirmed)||data.results.length!==candidates.length)
    throw new Error(data?.message||data?.code||'Resultado incierto. Conserva los ID DENUE y consulta de nuevo antes de reintentar.');
  return data as {confirmed:any[];results:Array<{denueId:string;success:boolean;code?:string;replayed?:boolean}>};
}
