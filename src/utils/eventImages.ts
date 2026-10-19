/**
 * Smart representative image resolver for events in Ciudad del Carmen.
 * Analyzes event title, description, category, and location to provide
 * vibrant, relevant, high-definition photography when no photo is attached.
 */

export const THEMATIC_EVENT_IMAGES = {
  // 1. Carreras, Maratones, Atletismo, 5K, 10K, Octubre Rosa
  running: '/uploads/kiosco-parque-zaragoza.jpg',
  // 2. Ciclismo, Rodadas
  cycling: '/uploads/kiosco-parque-zaragoza.jpg',
  // 3. Fútbol / Soccer
  soccer: '/uploads/kiosco-parque-zaragoza.jpg',
  // 4. Béisbol / Softbol
  baseball: '/uploads/kiosco-parque-zaragoza.jpg',
  // 5. Pesca deportiva / Torneo de pesca / Marítimo
  fishing: '/uploads/festival-gastronomico-carmen.jpg',
  // 6. Fitness / Gimnasio / Crossfit / Deportes varios
  sportsGeneral: '/uploads/kiosco-parque-zaragoza.jpg',
  // 7. Congresos / Conferencias / Convenciones / Carmen XXI / Foros / Negocios
  conference: '/uploads/bazar-emprendedores-carmen.jpg',
  // 8. Agroindustria / Campo / Agrícola / Productos de Campeche
  agriculture: '/uploads/festival-gastronomico-carmen.jpg',
  // 9. Conciertos en vivo / Rock / Pop / Bandas
  concert: '/uploads/concierto-musica-carmen.jpg',
  // 10. Fiesta nocturna / DJ / Electrónica
  partyNight: '/uploads/concierto-musica-carmen.jpg',
  // 11. Danzón / Boleros / Marimba / Tradición Carmelita / Parque Zaragoza
  tradicionZaragoza: '/uploads/kiosco-parque-zaragoza.jpg',
  // 12. Bazares / Emprendedores / Expo Eventia / Mercaditos
  bazar: '/uploads/bazar-emprendedores-carmen.jpg',
  // 13. Festival Gastronómico / Mariscos / Camarón
  gastronomiaMariscos: '/uploads/festival-gastronomico-carmen.jpg',
  // 14. Parrilladas / Carnes / Asados / BBQ
  grill: '/uploads/festival-gastronomico-carmen.jpg',
  // 15. Café / Repostería / Panadería
  bakeryCafe: '/uploads/festival-gastronomico-carmen.jpg',
  // 16. Día de Muertos / Hanal Pixán / Catrinas / Calaveras
  diaDeMuertos: '/uploads/dia-de-muertos-carmen.jpg',
  // 17. Teatro / Artes Escénicas / Comedia / Stand Up
  theater: '/uploads/concierto-musica-carmen.jpg',
  // 18. Danza / Baile folclórico / Ballet / Jarana
  dance: '/uploads/kiosco-parque-zaragoza.jpg',
  // 19. Cine / Películas / Cine al aire libre
  cinema: '/uploads/concierto-musica-carmen.jpg',
  // 20. Exposiciones de Arte / Pintura / Galerías
  artExhibition: '/uploads/bazar-emprendedores-carmen.jpg',
  // 21. Infantil / Niños / Familia / Shows
  kidsFamily: '/uploads/kiosco-parque-zaragoza.jpg',
  // 22. Mascotas / Perrotón / Adopción canina
  pets: '/uploads/kiosco-parque-zaragoza.jpg',
  // 23. Playa Norte / Malecón / Festival playero
  beach: '/uploads/festival-gastronomico-carmen.jpg',
  // 24. Fiestas Patronales / Virgen del Carmen / Procesión
  patronalFiesta: '/uploads/kiosco-parque-zaragoza.jpg',
  // 25. Yoga / Salud / Bienestar
  wellness: '/uploads/kiosco-parque-zaragoza.jpg',
  defaultEvent: '/uploads/kiosco-parque-zaragoza.jpg'
};

export function getFallbackThematicImage(event: {
  title?: string;
  category?: string;
  categorySlug?: string;
  description?: string;
  location?: string;
}): string {
  const text = `${event.title || ''} ${event.description || ''} ${event.category || ''} ${event.location || ''}`.toLowerCase();

  // 1. Día de Muertos / Tradiciones de Muertos / Catrinas / Hanal Pixán
  if (
    text.includes('muerto') ||
    text.includes('catrina') ||
    text.includes('cempasúchil') ||
    text.includes('cempasuchil') ||
    text.includes('ánima') ||
    text.includes('anima') ||
    text.includes('altar') ||
    text.includes('calaver') ||
    text.includes('hanal pix') ||
    text.includes('hallow')
  ) {
    return THEMATIC_EVENT_IMAGES.diaDeMuertos;
  }

  // 2. Agroindustria / Congreso Agroindustrial / Campo / Productos de Campeche
  if (
    text.includes('agroindustrial') ||
    text.includes('agro') ||
    text.includes('agrícol') ||
    text.includes('agricol') ||
    text.includes('campo') ||
    text.includes('siembra') ||
    text.includes('ganader') ||
    text.includes('cosecha') ||
    text.includes('productos de campeche')
  ) {
    return THEMATIC_EVENT_IMAGES.agriculture;
  }

  // 3. Carreras, Maratones, 5K, 10K, Atletismo, Octubre Rosa
  if (
    text.includes('carrera') ||
    text.includes('maratón') ||
    text.includes('maraton') ||
    text.includes('5k') ||
    text.includes('10k') ||
    text.includes('21k') ||
    text.includes('atlet') ||
    text.includes('corredor') ||
    text.includes('running') ||
    text.includes('octubre rosa') ||
    text.includes('cáncer de mama')
  ) {
    return THEMATIC_EVENT_IMAGES.running;
  }

  // 4. Ciclismo / Rodadas / Bicicleta
  if (
    text.includes('rodada') ||
    text.includes('ciclis') ||
    text.includes('bicicleta') ||
    text.includes('bici')
  ) {
    return THEMATIC_EVENT_IMAGES.cycling;
  }

  // 5. Pesca / Torneo de Pesca / Sábalo / Marítimo
  if (
    text.includes('pesca') ||
    text.includes('sábalo') ||
    text.includes('sabalo') ||
    text.includes('anzuelo') ||
    text.includes('lancha')
  ) {
    return THEMATIC_EVENT_IMAGES.fishing;
  }

  // 6. Fútbol / Soccer
  if (
    text.includes('fútbol') ||
    text.includes('futbol') ||
    text.includes('soccer') ||
    text.includes('gol')
  ) {
    return THEMATIC_EVENT_IMAGES.soccer;
  }

  // 7. Béisbol / Softbol
  if (
    text.includes('béisbol') ||
    text.includes('beisbol') ||
    text.includes('softbol') ||
    text.includes('pelota') ||
    text.includes('jonrón') ||
    text.includes('resineros')
  ) {
    return THEMATIC_EVENT_IMAGES.baseball;
  }

  // 8. Congresos / Convenciones / Carmen XXI / Foros / Cumbres / Negocios / Simposio
  if (
    text.includes('congreso') ||
    text.includes('convención') ||
    text.includes('convencion') ||
    text.includes('carmen xxi') ||
    text.includes('foro') ||
    text.includes('cumbre') ||
    text.includes('simposio') ||
    text.includes('conferencia') ||
    text.includes('panel') ||
    text.includes('empresarial') ||
    text.includes('negocios')
  ) {
    return THEMATIC_EVENT_IMAGES.conference;
  }

  // 9. Teatro / Artes Escénicas / Monólogo / Stand Up / Comedia
  if (
    text.includes('teatro') ||
    text.includes('obra') ||
    text.includes('monólogo') ||
    text.includes('monologo') ||
    text.includes('stand up') ||
    text.includes('comedia') ||
    text.includes('dramat') ||
    text.includes('escena') ||
    text.includes('teatro carmelita')
  ) {
    return THEMATIC_EVENT_IMAGES.theater;
  }

  // 10. Danza / Baile / Folclor / Ballet / Jarana
  if (
    text.includes('danza') ||
    text.includes('baile') ||
    text.includes('ballet') ||
    text.includes('folclor') ||
    text.includes('jarana') ||
    text.includes('coreograf')
  ) {
    return THEMATIC_EVENT_IMAGES.dance;
  }

  // 11. Cine / Películas / Proyección al aire libre
  if (
    text.includes('cine') ||
    text.includes('película') ||
    text.includes('pelicula') ||
    text.includes('cortometraje') ||
    text.includes('film') ||
    text.includes('proyección') ||
    text.includes('proyeccion')
  ) {
    return THEMATIC_EVENT_IMAGES.cinema;
  }

  // 12. Arte / Pintura / Galerías / Exposiciones Plásticas
  if (
    text.includes('exposición') ||
    text.includes('exposicion') ||
    text.includes('galería') ||
    text.includes('galeria') ||
    text.includes('pintura') ||
    text.includes('escultura') ||
    text.includes('fotografía') ||
    text.includes('fotografia') ||
    text.includes('artes plásticas')
  ) {
    return THEMATIC_EVENT_IMAGES.artExhibition;
  }

  // 13. Kiosco Zaragoza / Danzón / Marimba / Boleros / Tradición Carmelita
  if (
    text.includes('kiosco') ||
    text.includes('zaragoza') ||
    text.includes('parque principal') ||
    text.includes('bolero') ||
    text.includes('danzón') ||
    text.includes('danzon') ||
    text.includes('marimba') ||
    text.includes('son campechano') ||
    text.includes('trova') ||
    text.includes('campechanidad') ||
    text.includes('desfile cultural')
  ) {
    return THEMATIC_EVENT_IMAGES.tradicionZaragoza;
  }

  // 14. Gastronomía marina / Camarón / Mariscos / Pescados / Ceviche
  if (
    text.includes('camarón') ||
    text.includes('camaron') ||
    text.includes('marisco') ||
    text.includes('gastronom') ||
    text.includes('culinari') ||
    text.includes('platillo') ||
    text.includes('degustac') ||
    text.includes('chef') ||
    text.includes('ceviche') ||
    text.includes('coctel')
  ) {
    return THEMATIC_EVENT_IMAGES.gastronomiaMariscos;
  }

  // 15. Parrillada / Asados / BBQ / Carnes
  if (
    text.includes('asado') ||
    text.includes('parrill') ||
    text.includes('bbq') ||
    text.includes('carne')
  ) {
    return THEMATIC_EVENT_IMAGES.grill;
  }

  // 16. Café / Repostería / Panadería / Postres
  if (
    text.includes('café') ||
    text.includes('cafe') ||
    text.includes('reposter') ||
    text.includes('postre') ||
    text.includes('panader')
  ) {
    return THEMATIC_EVENT_IMAGES.bakeryCafe;
  }

  // 17. Conciertos / Música en Vivo / Rock / Pop / Bandas
  if (
    text.includes('concierto') ||
    text.includes('música') ||
    text.includes('musica') ||
    text.includes('en vivo') ||
    text.includes('tributo') ||
    text.includes('rock') ||
    text.includes('banda') ||
    text.includes('guitarra') ||
    text.includes('acústic') ||
    text.includes('acustic') ||
    text.includes('recital') ||
    text.includes('jazz') ||
    text.includes('canto') ||
    text.includes('show') ||
    text.includes('blnko') ||
    text.includes('austin') ||
    text.includes('revo') ||
    text.includes('cantautor')
  ) {
    return THEMATIC_EVENT_IMAGES.concert;
  }

  // 18. Fiestas nocturnas / DJ / Electrónica
  if (
    text.includes('dj') ||
    text.includes('electrónica') ||
    text.includes('fiesta nocturna') ||
    text.includes('antro') ||
    text.includes('club')
  ) {
    return THEMATIC_EVENT_IMAGES.partyNight;
  }

  // 19. Bazares / Emprendedores / Mercaditos / Expo Eventia / Artesanías
  if (
    text.includes('bazar') ||
    text.includes('placita') ||
    text.includes('emprended') ||
    text.includes('artesan') ||
    text.includes('mercadito') ||
    text.includes('expo eventia') ||
    text.includes('tianguis') ||
    text.includes('comercial')
  ) {
    return THEMATIC_EVENT_IMAGES.bazar;
  }

  // 20. Fiestas Patronales / Virgen del Carmen / Procesión
  if (
    text.includes('virgen del carmen') ||
    text.includes('patronal') ||
    text.includes('procesión') ||
    text.includes('procesion') ||
    text.includes('paseo por mar')
  ) {
    return THEMATIC_EVENT_IMAGES.patronalFiesta;
  }

  // 21. Playa Norte / Malecón / Eventos costeros
  if (
    text.includes('playa norte') ||
    text.includes('playa') ||
    text.includes('malecón') ||
    text.includes('malecon') ||
    text.includes('costero')
  ) {
    return THEMATIC_EVENT_IMAGES.beach;
  }

  // 22. Niños / Infantil / Familia
  if (
    text.includes('infantil') ||
    text.includes('niño') ||
    text.includes('niña') ||
    text.includes('títeres') ||
    text.includes('titeres') ||
    text.includes('marioneta') ||
    text.includes('familiar')
  ) {
    return THEMATIC_EVENT_IMAGES.kidsFamily;
  }

  // 23. Mascotas / Perrotón
  if (
    text.includes('mascota') ||
    text.includes('canin') ||
    text.includes('perro') ||
    text.includes('adopci')
  ) {
    return THEMATIC_EVENT_IMAGES.pets;
  }

  // 24. Yoga / Salud / Bienestar
  if (
    text.includes('yoga') ||
    text.includes('meditac') ||
    text.includes('salud') ||
    text.includes('bienestar')
  ) {
    return THEMATIC_EVENT_IMAGES.wellness;
  }

  // 25. Deportes general
  if (
    text.includes('deport') ||
    text.includes('torneo') ||
    text.includes('campeonato')
  ) {
    return THEMATIC_EVENT_IMAGES.sportsGeneral;
  }

  // Fallbacks by category
  const cat = (event.categorySlug || event.category || '').toLowerCase();
  if (cat.includes('bazar')) return THEMATIC_EVENT_IMAGES.bazar;
  if (cat.includes('gastronom')) return THEMATIC_EVENT_IMAGES.gastronomiaMariscos;
  if (cat.includes('deport')) return THEMATIC_EVENT_IMAGES.sportsGeneral;
  if (cat.includes('música') || cat.includes('musica')) return THEMATIC_EVENT_IMAGES.concert;
  if (cat.includes('cultur') || cat.includes('feria')) return THEMATIC_EVENT_IMAGES.tradicionZaragoza;

  return THEMATIC_EVENT_IMAGES.tradicionZaragoza;
}

export function getEventRepresentativeImage(event: {
  title?: string;
  category?: string;
  categorySlug?: string;
  description?: string;
  location?: string;
  image?: string;
}): string {
  if (event.image && typeof event.image === 'string') {
    const raw = event.image.trim();
    // Allow valid local upload and asset paths directly
    if (raw.startsWith('/uploads/') || raw.startsWith('/images/') || raw.startsWith('/assets/') || raw.startsWith('/dist/')) {
      return raw;
    }

    // Reject generic social/webpage links that are NOT image files
    const isWebpageNotImage =
      /(facebook\.com|carmen\.gob\.mx|proeventos\.campeche\.gob\.mx|eventbrite\.com)/i.test(raw) &&
      !/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(raw);

    // If it's a valid remote HTTPS image URL (e.g. unsplash, cdn, direct image file)
    if (!isWebpageNotImage && (raw.startsWith('http') || raw.startsWith('data:image'))) {
      // Para usuarios bajo proxy o redes corporativas restringidas, evitar dominios externos como unsplash.com y usar siempre imagen local interna
      if (raw.includes('unsplash.com') || raw.includes('facebook') || raw.includes('fbcdn') || raw.includes('placeholder')) {
        return getFallbackThematicImage(event);
      }
      return raw;
    }
  }

  return getFallbackThematicImage(event);
}
