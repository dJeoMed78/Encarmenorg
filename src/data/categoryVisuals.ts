// Visual assets, representative images and rich icons for all business categories and classifieds of Ciudad del Carmen
// Every single category has its own unique, accurate, high-quality photograph from Unsplash (no duplicates)

export interface CategoryVisual {
  image: string;
  iconName: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

// Map by slug or clean category name
export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  // ==========================================
  // 1. ALIMENTOS Y BEBIDAS
  // ==========================================
  'alimentos-y-bebidas': {
    image: '/images/categories/alimentos-y-bebidas.jpg',
    iconName: 'Utensils',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
  'antojitos-y-comida-rapida': {
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
    iconName: 'Pizza',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  'restaurantes-y-cocinas-economicas': {
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    iconName: 'UtensilsCrossed',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200'
  },
  'cafeterias-jugos-y-postres': {
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    iconName: 'Coffee',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200'
  },
  'productores-salsas-y-conservas': {
    image: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=800&q=80',
    iconName: 'Store',
    bgColor: 'bg-lime-50',
    textColor: 'text-lime-700',
    borderColor: 'border-lime-200'
  },
  'comercio-y-distribucion-de-alimentos': {
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    iconName: 'ShoppingBag',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  'vinos-y-licores': {
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80',
    iconName: 'PartyPopper',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },

  // ==========================================
  // 2. CUIDADO Y BELLEZA PERSONAL
  // ==========================================
  'cuidado-y-belleza-personal': {
    image: '/images/categories/cuidado-y-belleza-personal.jpg',
    iconName: 'Sparkles',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200'
  },
  'esteticas-y-belleza-femenina': {
    image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80',
    iconName: 'Sparkles',
    bgColor: 'bg-fuchsia-50',
    textColor: 'text-fuchsia-700',
    borderColor: 'border-fuchsia-200'
  },
  'barberias-y-peluquerias': {
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    iconName: 'Scissors',
    bgColor: 'bg-stone-100',
    textColor: 'text-stone-800',
    borderColor: 'border-stone-300'
  },
  'aplicacion-de-unas-y-pestanas': {
    image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
    iconName: 'Heart',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200'
  },
  'cosmeticos-perfumeria-y-joyeria': {
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    iconName: 'Gem',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  'masajes-spa-y-tratamientos': {
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    iconName: 'HeartPulse',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200'
  },

  // ==========================================
  // 3. SERVICIOS DEL HOGAR Y OFICIOS
  // ==========================================
  'servicios-del-hogar-y-oficios': {
    image: '/images/categories/servicios-del-hogar-y-oficios.jpg',
    iconName: 'Home',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200'
  },
  'mantenimiento-y-reparacion-de-climas': {
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    iconName: 'Wind',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200'
  },
  'plomeria-y-servicios-electricos': {
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
    iconName: 'Zap',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200'
  },
  'albanileria-herreria-y-carpinteria': {
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    iconName: 'Hammer',
    bgColor: 'bg-stone-100',
    textColor: 'text-stone-800',
    borderColor: 'border-stone-300'
  },
  'aluminio-vidrios-y-cerrajeria': {
    image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
    iconName: 'Key',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-200'
  },
  'lavanderias-y-fumigaciones': {
    image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
    iconName: 'Sparkles',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  'limpieza-y-lavado-de-muebles': {
    image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80',
    iconName: 'Sparkles',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200'
  },

  // ==========================================
  // 4. SERVICIOS PROFESIONALES, LEGALES Y FINANCIEROS
  // ==========================================
  'servicios-profesionales-legales-y-financieros': {
    image: '/images/categories/servicios-profesionales-legales-y-financieros.jpg',
    iconName: 'Briefcase',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  'despachos-contables-fiscales-y-juridicos': {
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
    iconName: 'Scale',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300'
  },
  'financieras-prestamos-y-empenos': {
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    iconName: 'Briefcase',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  'consultorias-notarias-y-oficinas': {
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    iconName: 'Building2',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },

  // ==========================================
  // 5. SECTOR INDUSTRIAL, PETROLERO Y CONSTRUCCIÓN
  // ==========================================
  'sector-industrial-petrolero-y-construccion': {
    image: '/images/categories/sector-industrial-petrolero-y-construccion.jpg',
    iconName: 'HardHat',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-300'
  },
  'proveeduria-maritima-y-mantenimiento-industrial': {
    image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
    iconName: 'Anchor',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-800',
    borderColor: 'border-sky-300'
  },
  'seguridad-industrial-y-equipo-de-proteccion-epp': {
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
    iconName: 'ShieldAlert',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  'servicios-de-ingenieria-arquitectura-y-talleres-de-torno': {
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
    iconName: 'Compass',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  'ferreterias-y-materiales-de-construccion': {
    image: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=800&q=80',
    iconName: 'Hammer',
    bgColor: 'bg-stone-100',
    textColor: 'text-stone-800',
    borderColor: 'border-stone-300'
  },
  'renta-de-maquinaria-pesada-y-andamios': {
    image: 'https://images.unsplash.com/photo-1579273166152-d725a4e2b755?auto=format&fit=crop&w=800&q=80',
    iconName: 'Truck',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
    borderColor: 'border-yellow-300'
  },
  'gas-y-combustibles': {
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    iconName: 'Zap',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-800',
    borderColor: 'border-rose-200'
  },

  // ==========================================
  // 6. SERVICIOS LOGÍSTICOS Y TRANSPORTE
  // ==========================================
  'servicios-logisticos-y-transporte': {
    image: '/images/categories/servicios-logisticos-y-transporte.jpg',
    iconName: 'Truck',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  'mandaditos-y-entregas-a-domicilio': {
    image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=800&q=80',
    iconName: 'ShoppingBag',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  'fletes-mudanzas-y-gruas': {
    image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
    iconName: 'Truck',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  'choferes-taxis-y-transporte-privado': {
    image: 'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=800&q=80',
    iconName: 'Car',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200'
  },
  'viajes-y-agencias-de-turismo': {
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
    iconName: 'Compass',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200'
  },

  // ==========================================
  // 7. AUTOMOTRIZ Y MOTOCICLETAS
  // ==========================================
  'automotriz-y-motocicletas': {
    image: '/images/categories/automotriz-y-motocicletas.jpg',
    iconName: 'Car',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  'talleres-mecanicos-y-electricos-autos-y-motos': {
    image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
    iconName: 'Wrench',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300'
  },
  'refaccionarias-y-llanteras': {
    image: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
    iconName: 'Car',
    bgColor: 'bg-stone-100',
    textColor: 'text-stone-800',
    borderColor: 'border-stone-300'
  },
  'agencias-lotes-de-autos-y-autolavados': {
    image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
    iconName: 'Sparkles',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200'
  },

  // ==========================================
  // 8. TECNOLOGÍA, IMPRENTAS Y COMERCIO AL MENUDEO
  // ==========================================
  'tecnologia-imprentas-y-comercio-al-menudeo': {
    image: '/images/categories/tecnologia-imprentas-y-comercio-al-menudeo.jpg',
    iconName: 'Laptop',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200'
  },
  'venta-y-reparacion-de-celulares-y-computo': {
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
    iconName: 'Smartphone',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200'
  },
  'seguridad-monitoreo-y-camaras': {
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
    iconName: 'ShieldAlert',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300'
  },
  'imprentas-publicidad-y-rotulacion': {
    image: 'https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=800&q=80',
    iconName: 'Printer',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  'boutiques-ropa-y-calzado': {
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
    iconName: 'ShoppingBag',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200'
  },
  'regalos-florerias-y-novedades': {
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
    iconName: 'Gift',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200'
  },
  'tabaco-vapes-y-sex-shop': {
    image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=800&q=80',
    iconName: 'Sparkles',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200'
  },

  // ==========================================
  // 9. SALUD, BIENESTAR Y EDUCACIÓN
  // ==========================================
  'salud-bienestar-y-educacion': {
    image: '/images/categories/salud-bienestar-y-educacion.jpg',
    iconName: 'Stethoscope',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  },
  'clinicas-especialidades-medicas-y-opticas': {
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    iconName: 'Stethoscope',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200'
  },
  'psicologia-desarrollo-personal-y-escuelas': {
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    iconName: 'GraduationCap',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  'educacion-cursos-y-escuelas': {
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
    iconName: 'GraduationCap',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  'herbolaria-farmacias-y-tiendas-naturistas': {
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=800&q=80',
    iconName: 'HeartPulse',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },

  // ==========================================
  // 10. RENTA DE INMUEBLES, ESPACIOS Y MASCOTAS
  // ==========================================
  'renta-de-inmuebles-espacios-y-mascotas': {
    image: '/images/categories/renta-de-inmuebles-espacios-y-mascotas.jpg',
    iconName: 'Building',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  'casas-departamentos-y-cuartos': {
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    iconName: 'Home',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-sky-200'
  },
  'locales-comerciales-bodegas-y-terrenos': {
    image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80',
    iconName: 'Building2',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200'
  },
  'palapas-albercas-y-lugares-para-fiestas': {
    image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80',
    iconName: 'PartyPopper',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200'
  },
  'clinicas-veterinarias-y-servicios-para-mascotas': {
    image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80',
    iconName: 'Dog',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  }
};

// Fallback visual
const DEFAULT_VISUAL: CategoryVisual = {
  image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  iconName: 'Store',
  bgColor: 'bg-stone-50',
  textColor: 'text-stone-700',
  borderColor: 'border-stone-200'
};

export function getCategoryVisual(slugOrName?: string): CategoryVisual {
  if (!slugOrName) return DEFAULT_VISUAL;
  const clean = slugOrName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  if (CATEGORY_VISUALS[clean]) {
    return CATEGORY_VISUALS[clean];
  }

  // Look for partial match
  for (const [key, visual] of Object.entries(CATEGORY_VISUALS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return visual;
    }
  }

  return DEFAULT_VISUAL;
}

// Visuals for Classifieds categories (Locally hosted + high-definition fallbacks)
export const CLASSIFIED_CATEGORY_VISUALS: Record<string, { image: string; fallbackImage: string; label: string }> = {
  inmuebles: {
    image: '/images/classifieds/inmuebles.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80',
    label: 'Inmuebles'
  },
  vehiculos: {
    image: '/images/classifieds/vehiculos.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    label: 'Vehículos'
  },
  empleos: {
    image: '/images/classifieds/empleos.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80',
    label: 'Empleos'
  },
  'compra-venta': {
    image: '/images/classifieds/compra-venta.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
    label: 'Compra-Venta'
  },
  mascotas: {
    image: '/images/classifieds/mascotas.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    label: 'Mascotas'
  },
  eventos: {
    image: '/images/classifieds/eventos.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
    label: 'Eventos'
  }
};
