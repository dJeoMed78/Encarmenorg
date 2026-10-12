// Mapeo exhaustivo de Códigos Postales (CP) y Colonias/Fraccionamientos de Ciudad del Carmen, Campeche

export interface ColoniaInfo {
  name: string;
  cp: string;
  zona?: string;
}

export const CARMEN_POSTAL_CODES_MAP: Record<string, string[]> = {
  "24100": [
    "Ciudad del Carmen Centro",
    "Guanal",
    "Caleta",
    "Tacubaya",
    "Puntilla",
    "Cuauhtémoc",
    "Palacio Municipal del Carmen"
  ],
  "24110": [
    "Fátima",
    "Miami",
    "Aviación",
    "Aeropuerto",
    "Pallas",
    "Petrolera"
  ],
  "24115": [
    "Playa Norte",
    "Playa Palmas"
  ],
  "24118": [
    "Fraccionamiento Marina del Rey",
    "Fraccionamiento Residencial Las Palmas",
    "Fraccionamiento Bugambilias",
    "Fraccionamiento Caracol",
    "Fraccionamiento San Manuel",
    "Fraccionamiento Hacienda del Mar"
  ],
  "24120": [
    "Santa Margarita",
    "Tila",
    "Morelos",
    "San Carlos",
    "San Joaquín",
    "Héctor Pérez Martínez",
    "Privada San Joaquín",
    "Privada Residencial San Joaquín"
  ],
  "24128": [
    "Fraccionamiento FOVISSSTE",
    "Fraccionamiento El Potrero",
    "Fraccionamiento Real del Carmen",
    "Fraccionamiento Residencial del Lago"
  ],
  "24130": [
    "Benito Juárez",
    "Benito Juárez 2",
    "Burócrata",
    "Insurgentes",
    "20 de Noviembre",
    "18 de Marzo"
  ],
  "24139": [
    "Arcila",
    "Asa Poniente",
    "Estación"
  ],
  "24140": [
    "Revolución",
    "23 de Julio",
    "Limonar",
    "Miguel de La Madrid",
    "Volcanes"
  ],
  "24150": [
    "Santa Rosalía",
    "San Nicolás",
    "San Francisco",
    "Tecolutla",
    "Pedro Sainz de Baranda"
  ],
  "24154": [
    "Fraccionamiento Mundo Maya",
    "Fraccionamiento Palmira",
    "Fraccionamiento Villa Marina",
    "Fraccionamiento Viña del Mar",
    "Fraccionamiento Villa Magna",
    "Fraccionamiento Perla del Golfo",
    "Fraccionamiento Raíces",
    "Fraccionamiento Lomas de Holche",
    "Fraccionamiento Villa Florencia",
    "Fraccionamiento Villa Palmeras",
    "Fraccionamiento Villa San José",
    "Fraccionamiento Villa Universitaria",
    "Fraccionamiento Villas de Santa Ana",
    "Fraccionamiento Villas del Carmen"
  ],
  "24155": [
    "Renovación I",
    "Renovación II",
    "Renovación III",
    "Fraccionamiento Solidaridad Urbana",
    "Belisario Domínguez"
  ],
  "24157": [
    "Isla de Tris",
    "Boquerón del Palmar",
    "Santa Rita",
    "Santa Rita II",
    "Santa Rita III",
    "Compositores",
    "Fraccionamiento Santa Mónica",
    "Fraccionamiento Santa Isabel",
    "Fraccionamiento Los Ríos",
    "Fraccionamiento Los Arcos",
    "Fraccionamiento Los Lagos",
    "Fraccionamiento Las Huertas",
    "Fraccionamiento Las Pilas"
  ],
  "24158": [
    "Bivalbo",
    "Bonanzas",
    "Canterías",
    "Fraccionamiento Misión del Carmen",
    "Fraccionamiento Monte Bello",
    "Fraccionamiento Capistrano",
    "Fraccionamiento Puesta del Sol",
    "Fraccionamiento Hacienda Dorada",
    "Fraccionamiento Isla del Carmen 2000",
    "Fraccionamiento Fénix",
    "Fraccionamiento Mediterráneo",
    "Fraccionamiento Residencial San Miguel",
    "Fraccionamiento Rinconada",
    "Fraccionamiento Turquesa",
    "Privada Las Esperanzas",
    "Privada Santa Ana",
    "Privanzas",
    "Puerta de Hierro"
  ],
  "24160": [
    "1 de Mayo (Playón)",
    "San Román",
    "Manigua",
    "Reforma",
    "Reforma del 57",
    "Reforma II Sección"
  ],
  "24170": [
    "Puerto Pesquero",
    "Rafael del J. Lozano Contreras",
    "Avenida Puerto de Campeche"
  ],
  "24180": [
    "Cereso Cd. del Carmen",
    "Puente de La Unidad"
  ],
  "24190": [
    "Cútsa",
    "Evergreén",
    "Emiliano Zapata",
    "Constelaciones II",
    "Millán",
    "Mujeres Carmelitas",
    "Pueblo Maya",
    "Buenavista",
    "Francisco I. Madero",
    "Héroes de Nacozari",
    "Independencia",
    "La Esperanza",
    "La Rivera",
    "Luis Donaldo Colosio",
    "Maderas"
  ]
};

// Generar mapa inverso: Colonia -> CP
export const COLONIA_TO_CP_MAP: Record<string, string> = {};

Object.entries(CARMEN_POSTAL_CODES_MAP).forEach(([cp, colonias]) => {
  colonias.forEach(col => {
    COLONIA_TO_CP_MAP[col] = cp;
    COLONIA_TO_CP_MAP[col.toLowerCase()] = cp;
  });
});

export const ALL_POSTAL_CODES = Object.keys(CARMEN_POSTAL_CODES_MAP).sort();

export function getPostalCodeForColonia(coloniaName?: string): string {
  if (!coloniaName) return '';
  const clean = coloniaName.trim();
  if (COLONIA_TO_CP_MAP[clean]) return COLONIA_TO_CP_MAP[clean];
  if (COLONIA_TO_CP_MAP[clean.toLowerCase()]) return COLONIA_TO_CP_MAP[clean.toLowerCase()];

  // Búsqueda aproximada
  const lower = clean.toLowerCase();
  for (const [col, cp] of Object.entries(COLONIA_TO_CP_MAP)) {
    if (lower.includes(col.toLowerCase()) || col.toLowerCase().includes(lower)) {
      return cp;
    }
  }
  return '24100'; // Default centro
}

export function getColoniasForPostalCode(cp?: string): string[] {
  if (!cp) return [];
  const cleanCp = cp.trim();
  return CARMEN_POSTAL_CODES_MAP[cleanCp] || [];
}
