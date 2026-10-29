/** No general writes: credentials, admin switch and business capability remain independent. */
export function administrativeWritesReady(req:{path:string;method:string},state:{mutationsEnabled:boolean;isStaging:boolean;businessWrites:boolean}):boolean {
  if(!state.mutationsEnabled || !state.isStaging || !state.businessWrites)return false;
  return (req.method==='POST' && req.path==='/api/submit-business') ||
    (req.method==='PATCH' && /^\/(?:api\/)?businesses\/[^/]+$/.test(req.path));
}
