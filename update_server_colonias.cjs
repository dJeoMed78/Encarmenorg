const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// List of all colonias from Carmen
const coloniasListStr = JSON.stringify([
  "18 de Marzo", "1 de Mayo (Playón)", "20 de Noviembre", "23 de Julio", "Aeropuerto", "Arcila", "Asa Poniente",
  "Aviación", "Belisario Domínguez", "Benito Juárez", "Benito Juárez 2", "Bivalbo", "Bonanzas", "Boquerón del Palmar",
  "Buenavista", "Bugambilias", "Burócrata", "Caleta", "Canterías", "Capistrano", "Caracol",
  "Cereso Cd. del Carmen", "Ciudad del Carmen Centro", "Compositores", "Constelaciones II", "Cuauhtémoc", "Cútsa",
  "El Potrero", "Emiliano Zapata", "Estación", "Estrella", "Evergreén", "Fátima", "Fénix", "FOVISSSTE",
  "Francisco I. Madero", "Guanal", "Hacienda del Mar", "Hacienda Dorada", "Héctor Pérez Martínez",
  "Héroes de Nacozari", "Independencia", "Insurgentes", "Isla del Carmen 2000", "Isla de Tris",
  "La Esperanza", "La Rivera", "Las Huertas", "Las Pilas", "Limonar", "Lomas de Holche", "Los Arcos",
  "Los Lagos", "Los Ríos", "Luis Donaldo Colosio", "Marina del Rey", "Mediterráneo", "Miami",
  "Miguel de La Madrid", "Millán", "Misión del Carmen", "Monte Bello", "Morelos", "Mujeres Carmelitas",
  "Mundo Maya", "Palacio Municipal del Carmen", "Pallas", "Palmira", "Pedro Sainz de Baranda", "Perla del Golfo",
  "Petrolera", "Playa Norte", "Playa Palmas", "Plutarco Elías Calles", "Privada Las Esperanzas",
  "Privada Residencial San Joaquín", "Privada San Joaquín", "Privada Santa Ana", "Privanzas", "Pueblo Maya",
  "Puente de La Unidad", "Puerta de Hierro", "Puerto Pesquero", "Puesta del Sol", "Puntilla",
  "Rafael del J. Lozano Contreras", "Raíces", "Real del Carmen", "Reforma", "Reforma del 57",
  "Reforma II Sección", "Renovación I", "Renovación II", "Renovación III", "Residencial del Lago",
  "Residencial Las Palmas", "Residencial San Miguel", "Revolución", "Rinconada", "San Carlos",
  "San Francisco", "San Joaquín", "San Manuel", "San Miguel", "San Nicolás", "San Román",
  "Santa Isabel", "Santa Margarita", "Santa Mónica", "Santa Rita", "Santa Rita II", "Santa Rita III",
  "Santa Rosalía", "Solidaridad Urbana", "Tacubaya", "Tecolutla", "Tila", "Turquesa", "Villa Florencia",
  "Villa Magna", "Villa Marina", "Villa Palmeras", "Villa San José", "Villas del Carmen", "Villas de Santa Ana",
  "Villa Universitaria", "Viña del Mar", "Volcanes"
]);

// 1. Add COLONIAS_CARMEN constant at top
const coloniasConstDecl = `const COLONIAS_CARMEN: string[] = ${coloniasListStr};\n`;
if (!code.includes('COLONIAS_CARMEN')) {
  code = code.replace("interface Category {", `${coloniasConstDecl}\ninterface Category {`);
}

// 2. Enhance extractColonia function
const newExtractColonia = `function extractColonia(address: string): string {
  if (!address) return 'Ciudad del Carmen Centro';
  const text = address.toLowerCase();

  if (text.includes('playón') || text.includes('playon')) return '1 de Mayo (Playón)';
  if (text.includes('faro de atalaya')) return 'Puntilla';
  if (text.includes('renovación 1') || text.includes('renovación i')) return 'Renovación I';
  if (text.includes('renovación 2') || text.includes('renovación ii')) return 'Renovación II';
  if (text.includes('renovación 3') || text.includes('renovación iii')) return 'Renovación III';
  if (text.includes('renovación') || text.includes('renovacion')) return 'Renovación I';
  if (text.includes('santa rita 2') || text.includes('santa rita ii')) return 'Santa Rita II';
  if (text.includes('santa rita 3') || text.includes('santa rita iii')) return 'Santa Rita III';
  if (text.includes('santa rita')) return 'Santa Rita';
  if (text.includes('benito juárez 2') || text.includes('benito juarez 2')) return 'Benito Juárez 2';
  if (text.includes('benito juárez') || text.includes('benito juarez')) return 'Benito Juárez';
  if (text.includes('constelaciones')) return 'Constelaciones II';

  for (const c of COLONIAS_CARMEN) {
    if (text.includes(c.toLowerCase())) {
      return c;
    }
  }

  if (text.includes('centro') && !text.includes('print center')) return 'Ciudad del Carmen Centro';

  return 'Ciudad del Carmen Centro';
}`;

code = code.replace(/function extractColonia\(address: string\): string \{[\s\S]*?return 'Ciudad del Carmen';\s*\}/, newExtractColonia);

// 3. Update parseWpBusiness to check meta_data for colonia
code = code.replace(
  "colonia: extractColonia(address),",
  `colonia: (Array.isArray(item.meta_data) && (item.meta_data.find((m: any) => m.key === 'colonia' || m.key === '_colonia')?.value)) || extractColonia(address || item.description || item.name || ''),`
);

// 4. Update /api/colonias endpoint to return master list with counts
const newColoniasEndpoint = `app.get('/api/colonias', (_req: Request, res: Response) => {
  const counts: Record<string, number> = {};
  for (const b of businessesCache) {
    const col = b.colonia || 'Ciudad del Carmen Centro';
    counts[col] = (counts[col] || 0) + 1;
  }
  
  // Return all colonias from Carmen, with their business count
  const list = COLONIAS_CARMEN.map(name => ({
    name,
    count: counts[name] || 0
  })).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, 'es');
  });

  res.json(list);
});`;

code = code.replace(/app\.get\('\/api\/colonias'[\s\S]*?res\.json\(list\);\s*\}\);/, newColoniasEndpoint);

fs.writeFileSync('server.ts', code);
console.log('server.ts actualizado con éxito.');
