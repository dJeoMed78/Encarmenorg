/** No general writes: credentials, admin switch and business capability remain independent. */
export function administrativeWritesReady(req:{path:string;method:string},state:{mutationsEnabled:boolean;isStaging:boolean;businessWrites:boolean}):boolean {
  if(!state.mutationsEnabled || !state.isStaging || !state.businessWrites)return false;
  const p = (req.path || '').replace(/\/+$/, '') || '/';
  return (req.method==='POST' && p==='/api/submit-business') ||
    ((req.method==='PATCH' || req.method==='DELETE') && /^\/(?:api\/)?businesses\/[^/]+$/.test(p));
}
