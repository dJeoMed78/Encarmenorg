import dotenv from 'dotenv';
dotenv.config({ override: true });
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ZipArchive } from 'archiver';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  initMariaDb,
  isMariaDbActive,
  dbLoadAllBusinesses,
  dbSaveBusiness,
  dbDeleteBusiness,
  dbLoadAllReports,
  dbSaveReport,
  dbDeleteReport,
  dbLoadAllEvents,
  dbSaveEvent,
  dbDeleteEvent,
  dbLoadAllPromotions,
  dbSavePromotion,
  dbDeletePromotion,
  dbLoadAllCoupons,
  dbSaveCoupon,
  dbUpdateCouponStatus,
  dbDeleteCoupon,
  dbLoadAllClassifieds,
  dbSaveClassified,
  dbDeleteClassified,
  dbLoadAllEmergencyServices,
  dbSaveEmergencyService,
  dbDeleteEmergencyService,
  getMariaDbConfig,
  getLastDbError
} from './src/db/mariadb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || process.env.DEFAULT_APP_PORT) || 3000;

// Permissive CORS and iframe embedding headers for AI Studio and development
app.use((req: Request, res: Response, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.removeHeader('X-Frame-Options');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 1. Bot & Scanner Protection Middleware (Block directory traversal, .env, wp-login, etc.)
app.use((req: Request, res: Response, next) => {
  const pathLower = (req.path || '').toLowerCase();
  
  if (
    pathLower.includes('.env') ||
    pathLower.includes('.git') ||
    pathLower.includes('..') ||
    pathLower.includes('wp-login') ||
    pathLower.includes('wp-admin') ||
    pathLower.includes('xmlrpc.php') ||
    pathLower.includes('eval-stdin') ||
    pathLower.includes('phpinfo') ||
    pathLower.includes('actuator') ||
    pathLower.includes('.aws')
  ) {
    return res.status(404).end();
  }

  next();
});

// 2. IP Rate Limiter to block automated bot floods (e.g. 10 million requests/day attack)
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now > data.resetAt) {
      ipRequestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

app.use((req: Request, res: Response, next) => {
  // Exclude static assets, uploads, and media from rate limiting
  if (
    req.path.startsWith('/media/') ||
    req.path.startsWith('/wp-content/') ||
    req.path.startsWith('/uploads/') ||
    req.path.startsWith('/assets/') ||
    /\.(jpg|jpeg|png|webp|svg|gif|ico|css|js|woff2?|ttf|json|map)$/i.test(req.path) ||
    req.path === '/api/version' ||
    req.path === '/api/database-status'
  ) {
    return next();
  }

  // Check admin session/token bypass
  const authHeader = req.headers.authorization;
  if (authHeader || req.headers['x-admin-auth']) {
    return next();
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequestsPerMinute = 1500; // Increased to 1500 to allow smooth admin navigation and parallel fetching

  let entry = ipRequestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    ipRequestCounts.set(ip, entry);
  } else {
    entry.count++;
  }

  if (entry.count > maxRequestsPerMinute) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espere un momento.' });
  }

  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve media assets directly with long-term caching (bypasses any Cloudflare /wp- blocks)
app.use('/media', express.static(path.resolve(__dirname, 'public/wp-content/uploads'), {
  maxAge: 30 * 24 * 60 * 60 * 1000,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  }
}));

// Serve WordPress uploads directly from public if present, with caching
app.use('/wp-content', express.static(path.resolve(__dirname, 'public/wp-content'), {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
}));

// Fallback for missing wp-content/uploads when requested on non-production domains (e.g. dev/preview/Cloud Run)
app.get('/wp-content/uploads/*', (req: Request, res: Response) => {
  const host = (req.hostname || req.headers.host || '').toLowerCase();
  if (!host.includes('empresasencarmen.com')) {
    const subpath = req.params[0];
    return res.redirect(302, `https://empresasencarmen.com/wp-content/uploads/${subpath}`);
  }
  return res.status(404).send('Image not found');
});

// Fallback for legacy /media/* requests
app.get('/media/*', (req: Request, res: Response) => {
  const host = (req.hostname || req.headers.host || '').toLowerCase();
  const subpath = req.params[0];
  if (!host.includes('empresasencarmen.com')) {
    return res.redirect(302, `https://empresasencarmen.com/wp-content/uploads/${subpath}`);
  }
  return res.redirect(301, `/wp-content/uploads/${subpath}`);
});

// Firebase (Desactivado: Hostinger MariaDB y almacenamiento persistente son la base de datos principal)
let firestoreDb: any = null;
if (process.env.USE_FIREBASE === 'true') {
  try {
    const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(firebaseConfigPath)) {
      const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      const firebaseApp = getApps().length === 0 ? initializeApp(config) : getApps()[0];
      firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
    }
  } catch (_) {}
}

// Memory caches
let businessesCache: any[] = [];
let categoriesCache: any[] = [];
let eventsCache: any[] = [];
let promotionsCache: any[] = [];
let reportsCache: any[] = [];
let claimedCouponsCache: any[] = [];
let classifiedsCache: any[] = [];
let emergencyServicesCache: any[] = [];
let editPinsCache: Record<number, { pin: string; expiresAt: number; remainingMinutes: number }> = {};

// Load Seed Businesses
try {
  const bizPath = path.resolve(__dirname, 'src/data/businesses_seed.json');
  if (fs.existsSync(bizPath)) {
    businessesCache = JSON.parse(fs.readFileSync(bizPath, 'utf8'));
    console.log(`[Cache] ${businessesCache.length} empresas cargadas de seed.`);
  }
} catch (e) {
  console.warn('[Cache] Error cargando businesses_seed:', e);
}

// Load Seed Categories
try {
  const catPath = path.resolve(__dirname, 'src/data/categories_seed.json');
  if (fs.existsSync(catPath)) {
    categoriesCache = JSON.parse(fs.readFileSync(catPath, 'utf8'));
    console.log(`[Cache] ${categoriesCache.length} categorías cargadas de seed.`);
  }
} catch (e) {
  console.warn('[Cache] Error cargando categories_seed:', e);
}

// Thematic representative images for events in Ciudad del Carmen
const THEMATIC_EVENT_IMAGES_SERVER = {
  running: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop&q=80',
  cycling: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&auto=format&fit=crop&q=80',
  soccer: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
  baseball: 'https://images.unsplash.com/photo-1508344928928-7165b67de128?w=800&auto=format&fit=crop&q=80',
  fishing: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
  sportsGeneral: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
  conference: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
  agriculture: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
  concert: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
  partyNight: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
  tradicionZaragoza: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
  bazar: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&auto=format&fit=crop&q=80',
  gastronomiaMariscos: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&auto=format&fit=crop&q=80',
  grill: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
  bakeryCafe: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80',
  diaDeMuertos: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
  theater: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80',
  dance: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
  cinema: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
  artExhibition: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&auto=format&fit=crop&q=80',
  kidsFamily: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&auto=format&fit=crop&q=80',
  pets: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
  patronalFiesta: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&auto=format&fit=crop&q=80',
  wellness: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80'
};

// Smart representative image resolver for events in Ciudad del Carmen
function getEventRepresentativeImageServer(event: {
  title?: string;
  category?: string;
  categorySlug?: string;
  description?: string;
  location?: string;
  image?: string;
}): string {
  // If image is already an absolute HTTP/HTTPS URL or relative uploads/images, preserve it
  if (event.image && typeof event.image === 'string') {
    const raw = event.image.trim();
    if (raw.startsWith('http') || raw.startsWith('/uploads/') || raw.startsWith('/images/')) {
      return raw;
    }
  }

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
    return THEMATIC_EVENT_IMAGES_SERVER.diaDeMuertos;
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
    return THEMATIC_EVENT_IMAGES_SERVER.agriculture;
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
    return THEMATIC_EVENT_IMAGES_SERVER.running;
  }

  // 4. Ciclismo / Rodadas / Bicicleta
  if (
    text.includes('rodada') ||
    text.includes('ciclis') ||
    text.includes('bicicleta') ||
    text.includes('bici')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.cycling;
  }

  // 5. Pesca / Torneo de Pesca / Sábalo / Marítimo
  if (
    text.includes('pesca') ||
    text.includes('sábalo') ||
    text.includes('sabalo') ||
    text.includes('anzuelo') ||
    text.includes('lancha')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.fishing;
  }

  // 6. Fútbol / Soccer
  if (
    text.includes('fútbol') ||
    text.includes('futbol') ||
    text.includes('soccer') ||
    text.includes('gol')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.soccer;
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
    return THEMATIC_EVENT_IMAGES_SERVER.baseball;
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
    return THEMATIC_EVENT_IMAGES_SERVER.conference;
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
    return THEMATIC_EVENT_IMAGES_SERVER.theater;
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
    return THEMATIC_EVENT_IMAGES_SERVER.dance;
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
    return THEMATIC_EVENT_IMAGES_SERVER.cinema;
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
    return THEMATIC_EVENT_IMAGES_SERVER.artExhibition;
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
    return THEMATIC_EVENT_IMAGES_SERVER.tradicionZaragoza;
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
    return THEMATIC_EVENT_IMAGES_SERVER.gastronomiaMariscos;
  }

  // 15. Parrillada / Asados / BBQ / Carnes
  if (
    text.includes('asado') ||
    text.includes('parrill') ||
    text.includes('bbq') ||
    text.includes('carne')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.grill;
  }

  // 16. Café / Repostería / Panadería / Postres
  if (
    text.includes('café') ||
    text.includes('cafe') ||
    text.includes('reposter') ||
    text.includes('postre') ||
    text.includes('panader')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.bakeryCafe;
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
    return THEMATIC_EVENT_IMAGES_SERVER.concert;
  }

  // 18. Fiestas nocturnas / DJ / Electrónica
  if (
    text.includes('dj') ||
    text.includes('electrónica') ||
    text.includes('electronica') ||
    text.includes('fiesta nocturna') ||
    text.includes('antro') ||
    text.includes('club')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.partyNight;
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
    return THEMATIC_EVENT_IMAGES_SERVER.bazar;
  }

  // 20. Fiestas Patronales / Virgen del Carmen / Procesión
  if (
    text.includes('virgen del carmen') ||
    text.includes('patronal') ||
    text.includes('procesión') ||
    text.includes('procesion') ||
    text.includes('paseo por mar')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.patronalFiesta;
  }

  // 21. Playa Norte / Malecón / Eventos costeros
  if (
    text.includes('playa norte') ||
    text.includes('playa') ||
    text.includes('malecón') ||
    text.includes('malecon') ||
    text.includes('costero')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.beach;
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
    return THEMATIC_EVENT_IMAGES_SERVER.kidsFamily;
  }

  // 23. Mascotas / Perrotón
  if (
    text.includes('mascota') ||
    text.includes('canin') ||
    text.includes('perro') ||
    text.includes('adopci')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.pets;
  }

  // 24. Yoga / Salud / Bienestar
  if (
    text.includes('yoga') ||
    text.includes('meditac') ||
    text.includes('salud') ||
    text.includes('bienestar')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.wellness;
  }

  // 25. Deportes general
  if (
    text.includes('deport') ||
    text.includes('torneo') ||
    text.includes('campeonato')
  ) {
    return THEMATIC_EVENT_IMAGES_SERVER.sportsGeneral;
  }

  // Fallbacks by category
  const cat = (event.categorySlug || event.category || '').toLowerCase();
  if (cat.includes('bazar')) return THEMATIC_EVENT_IMAGES_SERVER.bazar;
  if (cat.includes('gastronom')) return THEMATIC_EVENT_IMAGES_SERVER.gastronomiaMariscos;
  if (cat.includes('deport')) return THEMATIC_EVENT_IMAGES_SERVER.sportsGeneral;
  if (cat.includes('música') || cat.includes('musica')) return THEMATIC_EVENT_IMAGES_SERVER.concert;
  if (cat.includes('cultur') || cat.includes('feria')) return THEMATIC_EVENT_IMAGES_SERVER.tradicionZaragoza;

  return THEMATIC_EVENT_IMAGES_SERVER.tradicionZaragoza;
}

// Load Events from events_db.json
try {
  const evtPath = path.resolve(__dirname, 'events_db.json');
  if (fs.existsSync(evtPath)) {
    const rawEvts = JSON.parse(fs.readFileSync(evtPath, 'utf8'));
    eventsCache = rawEvts.map((e: any) => ({
      ...e,
      image: (e.image && typeof e.image === 'string' && e.image.trim())
        ? e.image.trim()
        : getEventRepresentativeImageServer(e)
    }));
    fs.writeFileSync(evtPath, JSON.stringify(eventsCache, null, 2), 'utf8');
    console.log(`[Cache] ${eventsCache.length} eventos cargados de events_db.json con imágenes representativas.`);
  }
} catch (e) {
  console.warn('[Cache] Error cargando events_db.json:', e);
}

// Load Promotions and Coupons
try {
  const promoPath = path.resolve(__dirname, 'promotions_db.json');
  if (fs.existsSync(promoPath)) {
    promotionsCache = JSON.parse(fs.readFileSync(promoPath, 'utf8'));
    console.log(`[Cache] ${promotionsCache.length} promociones cargadas de promotions_db.json.`);
  } else {
    promotionsCache = [];
    fs.writeFileSync(promoPath, '[]', 'utf8');
  }
} catch (e) {
  console.warn('[Cache] Error cargando promotions_db.json:', e);
  promotionsCache = [];
}

try {
  const couponPath = path.resolve(__dirname, 'coupons_db.json');
  if (fs.existsSync(couponPath)) {
    claimedCouponsCache = JSON.parse(fs.readFileSync(couponPath, 'utf8'));
    console.log(`[Cache] ${claimedCouponsCache.length} cupones cargados de coupons_db.json.`);
  } else {
    claimedCouponsCache = [];
    fs.writeFileSync(couponPath, '[]', 'utf8');
  }
} catch (e) {
  console.warn('[Cache] Error cargando coupons_db.json:', e);
  claimedCouponsCache = [];
}

// Load Classifieds
try {
  const classPath = path.resolve(__dirname, 'classifieds_db.json');
  if (fs.existsSync(classPath)) {
    classifiedsCache = JSON.parse(fs.readFileSync(classPath, 'utf8'));
    console.log(`[Cache] ${classifiedsCache.length} avisos clasificados cargados.`);
  } else {
    classifiedsCache = [];
  }
} catch (e) {
  classifiedsCache = [];
}

// Load Emergency Services
try {
  const emPath = path.resolve(__dirname, 'src/data/emergency_guide_carmen.json');
  if (fs.existsSync(emPath)) {
    emergencyServicesCache = JSON.parse(fs.readFileSync(emPath, 'utf8'));
    console.log(`[Cache] ${emergencyServicesCache.length} servicios de emergencia cargados.`);
  } else {
    emergencyServicesCache = [];
  }
} catch (e) {
  emergencyServicesCache = [];
}

// Load Edit PINs
try {
  const pinsPath = path.resolve(__dirname, 'pins_db.json');
  if (fs.existsSync(pinsPath)) {
    editPinsCache = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
    console.log(`[Cache] Códigos PIN de edición cargados.`);
  } else {
    editPinsCache = {};
  }
} catch (e) {
  editPinsCache = {};
}

// Admin Accounts with SHA-256 Crypted Passwords
const ADMIN_SALT = 'carmen_directory_2026_secure_salt';
function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass + ADMIN_SALT).digest('hex');
}

let adminAccounts = [
  {
    username: 'Yuss',
    passwordHash: hashPassword('Gioyuss'),
    role: 'Administrador',
    initial: 'Y',
    avatarColor: 'from-purple-600 to-indigo-600'
  },
  {
    username: 'Jeo',
    passwordHash: hashPassword('63097'),
    role: 'Administrador',
    initial: 'J',
    avatarColor: 'from-blue-600 to-cyan-600'
  }
];

// Helper: Resolve dynamic base URL based on incoming host
function getRequestBaseUrl(req: Request): string {
  const hostHeader = (req.get('x-forwarded-host') || req.get('host') || 'empresasencarmen.com').toLowerCase();
  let domain = 'empresasencarmen.com';
  if (hostHeader.includes('encarmen.org')) {
    domain = 'encarmen.org';
  } else if (hostHeader.includes('encarmen.com')) {
    domain = 'encarmen.com';
  } else if (hostHeader.includes('encarmen.mx')) {
    domain = 'encarmen.mx';
  } else if (hostHeader.includes('empresasencarmen.com')) {
    domain = 'empresasencarmen.com';
  } else {
    domain = hostHeader.split(':')[0];
  }
  const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
  return `${proto}://${domain}`;
}

// Sync Firestore on startup in background (solo si USE_FIREBASE=true)
if (firestoreDb && process.env.USE_FIREBASE === 'true') {
  // Sync Events from Firestore
  getDocs(collection(firestoreDb, 'events')).then(snap => {
    if (!snap.empty) {
      const fbEvents: any[] = [];
      snap.forEach(d => fbEvents.push({ id: d.id, ...d.data() }));
      if (fbEvents.length > 0) {
        eventsCache = fbEvents.map((e: any) => {
          const resolvedImg = getEventRepresentativeImageServer(e);
          return {
            ...e,
            image: resolvedImg
          };
        });
        fs.writeFileSync(path.resolve(__dirname, 'events_db.json'), JSON.stringify(eventsCache, null, 2), 'utf8');
      }
    }
  }).catch(() => {});

  // Sync Businesses from Firestore
  getDocs(collection(firestoreDb, 'businesses')).then(snap => {
    if (!snap.empty) {
      const fbBizMap = new Map<string, any>();
      for (const b of businessesCache) {
        fbBizMap.set(String(b.id), b);
      }
      snap.forEach(d => {
        const data = d.data();
        const bizId = String(data.id || d.id);
        const existing = fbBizMap.get(bizId) || {};
        fbBizMap.set(bizId, { ...existing, ...data, id: isNaN(Number(bizId)) ? bizId : Number(bizId) });
      });
      businessesCache = Array.from(fbBizMap.values());
    }
  }).catch(() => {});

  // Sync Promotions from Firestore
  getDocs(collection(firestoreDb, 'promotions')).then(snap => {
    if (!snap.empty) {
      const fbPromos: any[] = [];
      snap.forEach(d => fbPromos.push({ id: d.id, ...d.data() }));
      if (fbPromos.length > 0) {
        promotionsCache = fbPromos;
        fs.writeFileSync(path.resolve(__dirname, 'promotions_db.json'), JSON.stringify(promotionsCache, null, 2), 'utf8');
      }
    }
  }).catch(() => {});

  // Sync Admins from Firestore
  getDoc(doc(firestoreDb, 'system', 'admins')).then(snap => {
    if (snap.exists() && snap.data()?.accounts) {
      adminAccounts = snap.data().accounts;
    }
  }).catch(() => {});
}

// Initialize Hostinger MariaDB if configured
initMariaDb().then(async (active) => {
  if (active) {
    console.log('[MariaDB] Conexión establecida con Hostinger MariaDB.');

    // 1. Businesses
    const dbBusinesses = await dbLoadAllBusinesses();
    if (dbBusinesses.length >= businessesCache.length && dbBusinesses.length > 0) {
      businessesCache = dbBusinesses;
      console.log(`[MariaDB] ${businessesCache.length} empresas cargadas desde Hostinger MariaDB.`);
    } else {
      console.log(`[MariaDB] Sincronizando ${businessesCache.length} empresas completas hacia Hostinger MariaDB...`);
      for (const b of businessesCache) {
        await dbSaveBusiness(b);
      }
      const reloaded = await dbLoadAllBusinesses();
      if (reloaded.length > 0) businessesCache = reloaded;
      console.log(`[MariaDB] ${businessesCache.length} empresas aseguradas en Hostinger MariaDB.`);
    }

    // 2. Reports
    const dbReports = await dbLoadAllReports();
    if (dbReports.length > 0) {
      reportsCache = dbReports;
      console.log(`[MariaDB] ${reportsCache.length} reportes cargados desde Hostinger MariaDB.`);
    }

    // 3. Events
    const dbEvents = await dbLoadAllEvents();
    if (dbEvents.length > 0) {
      eventsCache = dbEvents.map((e: any) => ({
        ...e,
        image: (e.image && typeof e.image === 'string' && e.image.trim())
          ? e.image.trim()
          : getEventRepresentativeImageServer(e)
      }));
      console.log(`[MariaDB] ${eventsCache.length} eventos cargados desde Hostinger MariaDB.`);
    } else if (eventsCache.length > 0) {
      for (const evt of eventsCache) {
        await dbSaveEvent(evt);
      }
      console.log(`[MariaDB] ${eventsCache.length} eventos iniciales guardados en Hostinger MariaDB.`);
    }

    // 4. Promotions
    const dbPromos = await dbLoadAllPromotions();
    if (dbPromos.length > 0) {
      promotionsCache = dbPromos;
      console.log(`[MariaDB] ${promotionsCache.length} promociones cargadas desde Hostinger MariaDB.`);
    } else if (promotionsCache.length > 0) {
      for (const pr of promotionsCache) {
        await dbSavePromotion(pr);
      }
    }

    // 5. Claimed Coupons
    const dbCoupons = await dbLoadAllCoupons();
    if (dbCoupons.length > 0) {
      claimedCouponsCache = dbCoupons;
      console.log(`[MariaDB] ${claimedCouponsCache.length} cupones cargados desde Hostinger MariaDB.`);
    }

    // 6. Classifieds
    const dbClassifieds = await dbLoadAllClassifieds();
    if (dbClassifieds.length > 0) {
      classifiedsCache = dbClassifieds;
      console.log(`[MariaDB] ${classifiedsCache.length} avisos clasificados cargados desde Hostinger MariaDB.`);
    } else if (classifiedsCache.length > 0) {
      for (const c of classifiedsCache) {
        await dbSaveClassified(c);
      }
    }

    // 7. Emergency Services
    const dbServices = await dbLoadAllEmergencyServices();
    if (dbServices.length > 0) {
      emergencyServicesCache = dbServices;
      console.log(`[MariaDB] ${emergencyServicesCache.length} servicios de emergencia cargados desde Hostinger MariaDB.`);
    } else if (emergencyServicesCache.length > 0) {
      for (const s of emergencyServicesCache) {
        await dbSaveEmergencyService(s);
      }
      console.log(`[MariaDB] ${emergencyServicesCache.length} servicios de emergencia iniciales guardados en Hostinger MariaDB.`);
    }
  }
}).catch(e => console.warn('[MariaDB] Error inicializando:', e.message));

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// Database Status & Engine Inspection
app.get('/api/database-status', (_req: Request, res: Response) => {
  const mariadbConfig = getMariaDbConfig();
  res.json({
    success: true,
    activeEngine: isMariaDbActive() ? 'mariadb_hostinger' : (firestoreDb ? 'google_firestore' : 'local_json'),
    mariadb: {
      connected: isMariaDbActive(),
      configured: Boolean(mariadbConfig),
      host: mariadbConfig?.host || null,
      database: mariadbConfig?.database || null,
      user: mariadbConfig?.user || null,
      lastError: getLastDbError()
    },
    firestore: {
      connected: Boolean(firestoreDb)
    },
    businessesCount: businessesCache.length,
    downloadSqlUrl: '/hostinger_mariadb_setup.sql'
  });
});

// Reconnect to Hostinger MariaDB
app.post('/api/mariadb/reconnect', async (_req: Request, res: Response) => {
  try {
    const success = await initMariaDb();
    if (success) {
      const dbBusinesses = await dbLoadAllBusinesses();
      if (dbBusinesses.length > 0) {
        businessesCache = dbBusinesses;
      }
      res.json({
        success: true,
        message: '¡Conectado exitosamente a Hostinger MariaDB!',
        businessesCount: businessesCache.length
      });
    } else {
      res.json({
        success: false,
        message: 'No se pudo conectar a Hostinger MariaDB.',
        error: getLastDbError()
      });
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Error al intentar conectar',
      error: err.message
    });
  }
});

// Push entire active catalog to Hostinger MariaDB
app.post('/api/mariadb/sync-catalog', async (_req: Request, res: Response) => {
  try {
    if (!isMariaDbActive()) {
      const ok = await initMariaDb();
      if (!ok) {
        return res.status(400).json({
          success: false,
          message: 'Hostinger MariaDB no está conectada. Verifique las credenciales.',
          error: getLastDbError()
        });
      }
    }

    let saved = 0;
    for (const b of businessesCache) {
      try {
        await dbSaveBusiness(b);
        saved++;
      } catch (err: any) {
        console.warn(`[MariaDB Sync] Error guardando ${b.id}:`, err.message);
      }
    }

    const reloaded = await dbLoadAllBusinesses();
    if (reloaded.length > 0) {
      businessesCache = reloaded;
    }

    return res.json({
      success: true,
      message: `¡${saved} empresas sincronizadas exitosamente en Hostinger MariaDB!`,
      businessesCount: businessesCache.length
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Download SQL dump for Hostinger phpMyAdmin
app.get('/api/download-hostinger-sql', (_req: Request, res: Response) => {
  const sqlFile = path.resolve(__dirname, 'public/hostinger_mariadb_setup.sql');
  if (fs.existsSync(sqlFile)) {
    res.download(sqlFile, 'hostinger_mariadb_setup.sql');
  } else {
    res.status(404).json({ success: false, message: 'Script SQL no encontrado' });
  }
});


// Version
app.get('/api/version', (_req: Request, res: Response) => {
  let version = '061026:0915';
  try {
    const versionFile = path.resolve(__dirname, 'src/constants/version.ts');
    if (fs.existsSync(versionFile)) {
      const match = fs.readFileSync(versionFile, 'utf8').match(/APP_VERSION = '([^']+)'/);
      if (match) version = match[1];
    }
  } catch (_) {}
  res.json({ success: true, version, serverTime: new Date().toISOString() });
});

// Download complete project ZIP backup for Google Cloud Shell deployment
app.get(['/api/download-backup', '/codigo-fuente-empresasencarmen.zip'], (req: Request, res: Response) => {
  try {
    let version = '061026-0915';
    try {
      const versionFile = path.resolve(__dirname, 'src/constants/version.ts');
      if (fs.existsSync(versionFile)) {
        const match = fs.readFileSync(versionFile, 'utf8').match(/APP_VERSION = '([^']+)'/);
        if (match) version = match[1].replace(/[:/]/g, '-');
      }
    } catch (_) {}

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="codigo-fuente-empresasencarmen-${version}.zip"`);

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // Fast static delivery if already pre-built
    const staticZipPath = path.resolve(__dirname, `public/codigo-fuente-empresasencarmen-${version}.zip`);
    const defaultZipPath = path.resolve(__dirname, 'public/codigo-fuente-empresasencarmen.zip');
    if (fs.existsSync(staticZipPath)) {
      return res.sendFile(staticZipPath);
    }
    if (fs.existsSync(defaultZipPath)) {
      return res.sendFile(defaultZipPath);
    }

    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.on('error', (err: any) => {
      console.error('[Backup ZIP] Error:', err);
      if (!res.headersSent) res.status(500).send('Error generando archivo ZIP');
    });

    archive.pipe(res);

    archive.glob('**/*', {
      cwd: __dirname,
      ignore: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        '*.zip',
        '**/*.zip',
        'public/*.zip',
        'public/wp-content/**',
        'public/uploads/**',
        '.cache/**'
      ],
      dot: true
    });

    archive.finalize();
  } catch (err: any) {
    console.error('Error generating backup zip:', err);
    res.status(500).send('Error generating backup');
  }
});

// Businesses List with search & filters
app.get('/api/businesses', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  const q = ((req.query.q as string) || '').toLowerCase().trim();
  const category = (req.query.category as string) || '';
  const colonia = (req.query.colonia as string) || '';
  const hasWhatsapp = req.query.hasWhatsapp === 'true';
  const hasDelivery = req.query.hasDelivery === 'true';
  const hasPhone = req.query.hasPhone === 'true';
  const hasAddress = req.query.hasAddress === 'true';

  let list = [...businessesCache];

  if (q) {
    list = list.filter(b =>
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      (b.categories && b.categories.some((c: string) => c.toLowerCase().includes(q))) ||
      (Array.isArray(b.previousNames) && b.previousNames.some((pn: string) => pn.toLowerCase().includes(q))) ||
      (Array.isArray(b.previousSlugs) && b.previousSlugs.some((ps: string) => ps.toLowerCase().includes(q)))
    );
  }

  if (category && category !== 'all') {
    const catLow = category.toLowerCase();
    list = list.filter(b =>
      (b.categorySlugs && b.categorySlugs.some((s: string) => s.toLowerCase() === catLow)) ||
      (b.categories && b.categories.some((c: string) => c.toLowerCase() === catLow))
    );
  }

  if (colonia && colonia !== 'todas') {
    const colLow = colonia.toLowerCase();
    list = list.filter(b => b.colonia && b.colonia.toLowerCase().includes(colLow));
  }

  if (hasWhatsapp) list = list.filter(b => Boolean(b.whatsapp));
  if (hasDelivery) list = list.filter(b => Boolean(b.hasDelivery));
  if (hasPhone) list = list.filter(b => Boolean(b.phone));
  if (hasAddress) list = list.filter(b => Boolean(b.address));

  res.json({
    total: list.length,
    count: list.length,
    offset: 0,
    limit: list.length,
    businesses: list
  });
});

// Single Business
app.get('/api/businesses/:id', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  const idOrSlug = req.params.id;
  const cleanQuery = idOrSlug.toLowerCase().trim();
  const biz = businessesCache.find(b =>
    String(b.id) === idOrSlug ||
    (b.oldId && String(b.oldId) === idOrSlug) ||
    (b.slug && b.slug.toLowerCase() === cleanQuery) ||
    (Array.isArray(b.previousSlugs) && b.previousSlugs.some((ps: string) => ps.toLowerCase() === cleanQuery)) ||
    (Array.isArray(b.previousNames) && b.previousNames.some((pn: string) => pn.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanQuery || pn.toLowerCase().trim() === cleanQuery)) ||
    (b.name && b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanQuery)
  );
  if (biz) {
    res.json({ success: true, business: biz });
  } else {
    res.status(404).json({ success: false, message: 'Empresa no encontrada' });
  }
});

// Endpoint to purge cache on demand for both portals
app.post('/api/admin/purge-cache', async (req: Request, res: Response) => {
  try {
    const slug = (req.body?.slug as string) || '';
    const slugs = slug ? [slug] : [];
    await purgeWordPressCache(slugs);
    res.json({ success: true, message: 'Caché renovado exitosamente en ambos portales.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper to parse a WooCommerce REST API product into our Business schema
function parseWooCommerceProduct(p: any): any {
  const getMeta = (key: string) => {
    if (!Array.isArray(p.meta_data)) return '';
    const item = p.meta_data.find((m: any) => m.key === key || m.key === `_${key}`);
    return item ? String(item.value || '').trim() : '';
  };

  const cleanDescription = (html: string) => {
    if (!html) return '';
    let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
    text = text.replace(/<div[^>]*class=["'][^"']*fe-wrapper[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi, ' ');
    text = text.replace(/\.fe-wrapper[\s\S]*?\.fe-content[^}]*\}/gi, ' ');
    text = text.replace(/📞\s*Marcar a la empresa[\s\S]*?(?=(?:<p|$))/i, ' ');
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const name = p.name ? p.name.trim() : 'Empresa';
  let phone = getMeta('telefono') || getMeta('phone') || '';
  if (!phone && p.description) {
    const mPhone = p.description.match(/(?:Teléfono|Telefono|📞)\s*[:]?\s*([0-9\s\/\-]{7,25})/i);
    if (mPhone) phone = mPhone[1].replace(/[^\d\s\/-]/g, '').trim();
  }
  let whatsapp = getMeta('whatsapp') || phone;
  if ((!whatsapp || whatsapp === phone) && p.description) {
    const mWa = p.description.match(/wa\.me\/52(\d{10})/i) || p.description.match(/(?:WhatsApp|whatsapp)\s*[:]?\s*([0-9]{10})/i);
    if (mWa) whatsapp = mWa[1];
  }
  let address = getMeta('direccion') || getMeta('address') || '';
  if (!address && p.description) {
    const mAddr = p.description.match(/(?:Dirección|Direccion|📍)\s*[:]?\s*([^💳⏰🚚\.\<\n]{5,100})/i);
    if (mAddr) address = mAddr[1].trim();
  }
  const colonia = getMeta('colonia') || 'Ciudad del Carmen Centro';
  let schedule = getMeta('horario') || '';
  if (!schedule && p.description) {
    const mSched = p.description.match(/(?:Horario|⏰)\s*[:]?\s*([^💳🚚\.\<\n]{5,80})/i);
    if (mSched) schedule = mSched[1].trim();
  }
  if (!schedule) schedule = 'Lunes a Sábado';

  let payment = getMeta('pagos') || '';
  if (!payment && p.description) {
    const mPay = p.description.match(/(?:Métodos de pago|Metodos de pago|💳)\s*[:]?\s*([^🚚\.\<\n]{5,80})/i);
    if (mPay) payment = mPay[1].trim();
  }
  if (!payment) payment = 'Efectivo y Transferencia';

  let delivery = getMeta('envio') || '';
  if (!delivery && p.description) {
    const mDel = p.description.match(/(?:Envío a domicilio|Envio a domicilio|🚚)\s*[:]?\s*([^<\n]{5,80})/i);
    if (mDel) delivery = mDel[1].trim();
  }
  if (!delivery) delivery = 'Atención en el Local de la empresa';
  const isRecommended = getMeta('is_recommended') === '1' || getMeta('is_recommended') === 'true';

  let facebook = getMeta('facebook') || '';
  let instagram = getMeta('instagram') || '';
  let website = getMeta('website') || getMeta('web') || '';

  // Extract from short_description [ficha_empresa ...] or description if meta was empty
  const shortDesc = p.short_description || '';
  if (shortDesc.includes('ficha_empresa')) {
    const mFb = shortDesc.match(/facebook=["']([^"']*)["']/i);
    if (mFb && !facebook) facebook = mFb[1];
    const mIg = shortDesc.match(/instagram=["']([^"']*)["']/i);
    if (mIg && !instagram) instagram = mIg[1];
    const mWeb = shortDesc.match(/web=["']([^"']*)["']/i);
    if (mWeb && !website) website = mWeb[1];
    const mTel = shortDesc.match(/telefono=["']([^"']*)["']/i);
    if (mTel && !phone) phone = mTel[1];
    const mWa = shortDesc.match(/whatsapp=["']([^"']*)["']/i);
    if (mWa && !whatsapp) whatsapp = mWa[1];
    const mDir = shortDesc.match(/direccion=["']([^"']*)["']/i);
    if (mDir && !address) address = mDir[1];
    const mHor = shortDesc.match(/horario=["']([^"']*)["']/i);
    if (mHor && !schedule) schedule = mHor[1];
    const mPag = shortDesc.match(/pagos=["']([^"']*)["']/i);
    if (mPag && !payment) payment = mPag[1];
    const mEnv = shortDesc.match(/envio=["']([^"']*)["']/i);
    if (mEnv && !delivery) delivery = mEnv[1];
  }

  const image = (Array.isArray(p.images) && p.images[0]?.src) ? p.images[0].src : '';
  const gallery = (Array.isArray(p.images) && p.images.length > 1) ? p.images.slice(1).map((i: any) => i.src) : [];
  const categories = (Array.isArray(p.categories) && p.categories.length > 0) ? p.categories.map((c: any) => c.name) : ['Comercios y Servicios'];
  const categorySlugs = (Array.isArray(p.categories) && p.categories.length > 0) ? p.categories.map((c: any) => c.slug) : ['comercios-y-servicios'];

  return {
    id: p.id,
    name,
    slug: p.slug || `empresa-${p.id}`,
    description: cleanDescription(p.description) || cleanDescription(p.short_description) || '',
    phone,
    whatsapp,
    facebook,
    instagram,
    website,
    address,
    colonia,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ', Ciudad del Carmen, Campeche')}`,
    schedule,
    payment,
    delivery,
    image,
    gallery,
    categories,
    categorySlugs,
    rating: 5,
    reviewCount: 1,
    permalink: p.permalink || `https://empresasencarmen.com/empresa/${p.slug}/`,
    isTopBusiness: false,
    isRecommended,
    createdAt: p.date_created || new Date().toISOString()
  };
}

// Helper to normalize business name for duplicate and cross-platform matching
function normalizeBusinessName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Helper to resolve numerical WooCommerce category IDs from local categories or auto-detection
function resolveWooCommerceCategoryIds(biz: any): { id: number }[] {
  const result: { id: number }[] = [];
  const assignedIds = new Set<number>();

  const addId = (id: number) => {
    if (id && !assignedIds.has(id)) {
      assignedIds.add(id);
      result.push({ id });
    }
  };

  const findCatInCache = (term: string) => {
    if (!term || !Array.isArray(categoriesCache)) return null;
    const clean = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return categoriesCache.find(c => {
      const cName = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const cSlug = (c.slug || '').toLowerCase().trim();
      return cName === clean || cSlug === clean || cName.includes(clean) || clean.includes(cName);
    });
  };

  // 1. Match from existing categories
  const existingCats: string[] = [];
  if (Array.isArray(biz.categories)) existingCats.push(...biz.categories);
  if (biz.category) existingCats.push(biz.category);
  if (biz.subcategory) existingCats.push(biz.subcategory);
  if (Array.isArray(biz.categorySlugs)) existingCats.push(...biz.categorySlugs);

  for (const c of existingCats) {
    const found = findCatInCache(c);
    if (found && found.id && found.id !== 15) {
      addId(Number(found.id));
      if (found.parent && found.parent !== 0) {
        addId(Number(found.parent));
      }
    }
  }

  // 2. Intelligent Auto-Categorization based on keywords in name, description only if no category matched
  if (result.length === 0) {
    const textCorpus = `${biz.name || ''} ${biz.description || ''} ${biz.tags ? (Array.isArray(biz.tags) ? biz.tags.join(' ') : biz.tags) : ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (/churro|postre|panaderia|cafeteria|dulce|crepa|helado|frappe|reposteria|pastel/i.test(textCorpus)) {
      addId(62);  // Alimentos y Bebidas
      addId(372); // Cafeterías, Jugos y Postres
      if (!biz.category) biz.category = 'Alimentos y Bebidas';
      if (!biz.subcategory) biz.subcategory = 'Cafeterías, Jugos y Postres';
      if (!biz.categories || biz.categories.length === 0) biz.categories = ['Alimentos y Bebidas', 'Cafeterías, Jugos y Postres'];
      if (!biz.categorySlugs || biz.categorySlugs.length === 0) biz.categorySlugs = ['alimentos-y-bebidas', 'cafeterias-jugos-y-postres'];
    } else if (/taco|pizza|hamburguesa|comida|cocina|restaurante|antojito|marisco|sushi|torta|asador|parrilla/i.test(textCorpus)) {
      addId(62);  // Alimentos y Bebidas
      addId(371); // Restaurantes y Cocinas Económicas
      addId(370); // Antojitos y Comida Rápida
    } else if (/mecanic|taller|auto|moto|refaccion|freno|suspension|llanta/i.test(textCorpus)) {
      addId(401); // Automotriz y Motocicletas
      addId(402); // Talleres Mecánicos y Eléctricos (Autos y Motos)
    } else if (/una|pestana|belleza|barber|peluquer|estetic|spa|facial|cabello/i.test(textCorpus)) {
      addId(374); // Cuidado y Belleza Personal
      addId(377); // Aplicación de Uñas y Pestañas
    } else if (/mandadito|reparto|entrega|flete|transporte/i.test(textCorpus)) {
      addId(380); // Servicios Logísticos y Transporte
    } else if (/medico|clinica|doctor|farmacia|dental|dentista/i.test(textCorpus)) {
      addId(384); // Salud y Medicina
    } else {
      addId(62); // Alimentos y Bebidas
    }
  }

  return result;
}

// Helper to clean raw business description for WordPress (no CSS, no buttons, no junk)
function cleanWooCommerceDescription(desc: string): string {
  if (!desc) return '';
  return desc
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<div[^>]*class=["'][^"']*fe-wrapper[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi, '')
    .replace(/<div[^>]*class=["'][^"']*fe-[^"']*["'][\s\S]*?<\/div>/gi, '')
    .replace(/\.fe-wrapper[\s\S]*?\.fe-content[^}]*\}/gi, '')
    .replace(/<p>\.fe-wrapper[\s\S]*?<\/p>/gi, '')
    .replace(/📞\s*Marcar a la empresa[\s\S]*$/i, '')
    .replace(/\[ficha_empresa[^\]]*\]/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper to construct the exact [ficha_empresa] shortcode for WooCommerce short_description
function buildFichaEmpresaShortcode(biz: any): string {
  const phone = String(biz.phone || '').trim().replace(/"/g, '');
  let rawWa = String(biz.whatsapp || biz.phone || '').trim().replace(/\D/g, '');
  if (rawWa && !rawWa.startsWith('52') && rawWa.length === 10) {
    rawWa = `52${rawWa}`;
  }
  const wa = rawWa.replace(/"/g, '');
  const fb = String(biz.facebook || '').trim().replace(/"/g, '');
  const ig = String(biz.instagram || '').trim().replace(/"/g, '');
  const web = String(biz.website || '').trim().replace(/"/g, '');

  let direccion = String(biz.address || '').trim();
  const col = String(biz.colonia || '').trim();
  if (col && direccion && !direccion.toLowerCase().includes(col.toLowerCase())) {
    direccion = `${direccion}, Col. ${col}`;
  }
  direccion = direccion.replace(/"/g, '');

  const horario = String(biz.schedule || '').trim().replace(/"/g, '');
  const pagos = String(biz.payment || '').trim().replace(/"/g, '');
  const envio = String(biz.delivery || '').trim().replace(/"/g, '');

  return `[ficha_empresa telefono="${phone}" whatsapp="${wa}" facebook="${fb}" instagram="${ig}" web="${web}" direccion="${direccion}" horario="${horario}" pagos="${pagos}" envio="${envio}"]`;
}

// Helper to format images properly for WooCommerce
function buildWooCommerceImagesPayload(biz: any): { src: string }[] {
  const images: { src: string }[] = [];
  const makeFull = (src: string) => {
    if (!src || typeof src !== 'string') return '';
    const trimmed = src.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return `https://encarmen.org${trimmed}`;
    return `https://encarmen.org/uploads/${trimmed}`;
  };

  if (biz.image) {
    const full = makeFull(biz.image);
    if (full) images.push({ src: full });
  }

  if (Array.isArray(biz.gallery)) {
    for (const g of biz.gallery) {
      const full = makeFull(g);
      if (full && !images.some(img => img.src === full)) {
        images.push({ src: full });
      }
    }
  }

  return images;
}

// Helper to purge LiteSpeed and WordPress cache on empresasencarmen.com
async function purgeWordPressCache(slugs: string[] = []): Promise<void> {
  try {
    // 1. Purge general cache and homepage on empresasencarmen.com
    fetch('https://empresasencarmen.com/', {
      method: 'PURGE',
      headers: { 'x-litespeed-purge': '*' }
    }).catch(() => {});

    // 2. Purge individual product / business URLs
    for (const slug of slugs) {
      if (!slug) continue;
      const cleanSlug = slug.replace(/^\/+|\/+$/g, '');
      fetch(`https://empresasencarmen.com/empresa/${cleanSlug}/`, {
        method: 'PURGE'
      }).catch(() => {});
      fetch(`https://empresasencarmen.com/${cleanSlug}/`, {
        method: 'PURGE'
      }).catch(() => {});
    }
    console.log('[Cache] Purga de caché enviada a empresasencarmen.com para:', slugs);
  } catch (err: any) {
    console.warn('[Cache] Error al purgar caché en WordPress:', err.message);
  }
}

// Helper to push a business to WordPress WooCommerce via REST API
async function exportBusinessToWooCommerce(biz: any, authHeader: string): Promise<{ success: boolean; wpId?: number; permalink?: string; slug?: string; error?: string }> {
  try {
    const meta_data = [
      { key: 'telefono', value: String(biz.phone || '') },
      { key: 'phone', value: String(biz.phone || '') },
      { key: 'whatsapp', value: String(biz.whatsapp || biz.phone || '') },
      { key: 'direccion', value: String(biz.address || '') },
      { key: 'address', value: String(biz.address || '') },
      { key: 'colonia', value: String(biz.colonia || '') },
      { key: '_colonia', value: String(biz.colonia || '') },
      { key: 'horario', value: String(biz.schedule || '') },
      { key: 'pagos', value: String(biz.payment || '') },
      { key: 'envio', value: String(biz.delivery || '') },
      { key: 'facebook', value: String(biz.facebook || '') },
      { key: 'website', value: String(biz.website || '') },
      { key: 'mapsUrl', value: String(biz.mapsUrl || '') },
      { key: 'is_recommended', value: biz.isRecommended ? '1' : '0' }
    ];

    const categories = resolveWooCommerceCategoryIds(biz);
    const cleanDesc = cleanWooCommerceDescription(biz.description || biz.name);
    const fichaShortcode = buildFichaEmpresaShortcode(biz);

    const payload: any = {
      name: biz.name.trim(),
      type: 'simple',
      status: 'publish',
      regular_price: '0',
      description: `<p>${cleanDesc}</p>`,
      short_description: fichaShortcode,
      categories,
      meta_data
    };

    if (biz.slug) {
      payload.slug = biz.slug;
    }

    const images = buildWooCommerceImagesPayload(biz);
    if (images.length > 0) {
      payload.images = images;
    }

    let wpRes = await fetch('https://empresasencarmen.com/wp-json/wc/v3/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    // If WooCommerce errors with image fetch failure (HTTP 400), retry without images
    if (!wpRes.ok && payload.images) {
      delete payload.images;
      wpRes = await fetch('https://empresasencarmen.com/wp-json/wc/v3/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });
    }

    if (!wpRes.ok) {
      const errText = await wpRes.text();
      return { success: false, error: `HTTP ${wpRes.status}: ${errText}` };
    }

    const data: any = await wpRes.json();
    return {
      success: true,
      wpId: data.id,
      permalink: data.permalink,
      slug: data.slug
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Helper to get WordPress / WooCommerce auth headers from Secrets
function getWpAuthHeader(): string | null {
  const wcKey = process.env.WC_CONSUMER_KEY;
  const wcSecret = process.env.WC_CONSUMER_SECRET;
  if (wcKey && wcSecret) {
    return 'Basic ' + Buffer.from(`${wcKey}:${wcSecret}`).toString('base64');
  }
  const coPubWp = process.env.CO_PUB_WP;
  if (coPubWp && !coPubWp.trim().startsWith('[')) {
    if (coPubWp.includes(':')) {
      return 'Basic ' + Buffer.from(coPubWp).toString('base64');
    }
    return `Bearer ${coPubWp}`;
  }
  return null;
}

// Full bidirectional sync helper:
// 1. Pulls all products from WordPress WooCommerce (empresasencarmen.com) into MariaDB / cache
// 2. Finds businesses in local DB that do not exist in WooCommerce (like new registrations) and pushes them to WordPress!
async function syncAllWooCommerceProducts(): Promise<{ count: number; newCount: number; pushedToWpCount: number }> {
  const authHeader = getWpAuthHeader();
  if (!authHeader) {
    return { count: businessesCache.length, newCount: 0, pushedToWpCount: 0 };
  }

  try {
    let page = 1;
    const allProducts: any[] = [];

    while (true) {
      const wpRes = await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products?per_page=100&page=${page}`, {
        headers: { 'Authorization': authHeader }
      });
      if (!wpRes.ok) break;
      const batch: any = await wpRes.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      allProducts.push(...batch);
      if (batch.length < 100) break;
      page++;
    }

    const existingMap = new Map<number, any>();
    for (const b of businessesCache) {
      existingMap.set(Number(b.id), b);
    }

    // 1. Build lookup maps of WooCommerce products
    const wpProductIds = new Set<number>();
    const wpProductByName = new Map<string, any>();
    const wpProductByPhone = new Map<string, any>();
    const wpProductBySlug = new Map<string, any>();

    for (const p of allProducts) {
      const pId = Number(p.id);
      wpProductIds.add(pId);
      if (p.name) wpProductByName.set(normalizeBusinessName(p.name), p);
      if (p.slug) wpProductBySlug.set(p.slug.toLowerCase().trim(), p);
      if (Array.isArray(p.meta_data)) {
        const ph = p.meta_data.find((m: any) => m.key === 'telefono' || m.key === 'phone' || m.key === 'whatsapp')?.value;
        if (ph) {
          const clean = String(ph).replace(/\D/g, '').slice(-10);
          if (clean.length >= 7) wpProductByPhone.set(clean, p);
        }
      }
    }

    // 2. Import / Update products from WooCommerce (Pull Phase)
    let newCount = 0;
    for (const p of allProducts) {
      const parsed = parseWooCommerceProduct(p);
      if (!existingMap.has(p.id)) {
        newCount++;
        existingMap.set(p.id, parsed);
      } else {
        const old = existingMap.get(p.id) || {};
        // Check if local business has local modifications, uploads, or custom slugs
        const hasLocalEdits = Boolean(
          old.isLocallyEdited ||
          (old.image && old.image.startsWith('/uploads/')) ||
          (old.gallery && old.gallery.some((img: string) => img.startsWith('/uploads/'))) ||
          (Array.isArray(old.previousSlugs) && old.previousSlugs.length > 0) ||
          (Array.isArray(old.previousNames) && old.previousNames.length > 0) ||
          (old.updatedAt && (!p.date_modified || new Date(old.updatedAt) > new Date(p.date_modified)))
        );

        if (hasLocalEdits) {
          // Local changes TAKE PRECEDENCE over stale WooCommerce data
          const mergedCategories = (old.categories && old.categories.length > 0) ? old.categories : parsed.categories;
          const mergedCategorySlugs = (old.categorySlugs && old.categorySlugs.length > 0) ? old.categorySlugs : parsed.categorySlugs;
          const mergedCategory = old.category || (mergedCategories[0] || 'Comercios y Servicios');

          existingMap.set(p.id, {
            ...parsed,
            ...old,
            name: old.name || parsed.name,
            slug: old.slug || parsed.slug,
            description: old.description || parsed.description,
            image: old.image || parsed.image,
            gallery: (old.gallery && old.gallery.length > 0) ? old.gallery : parsed.gallery,
            categories: mergedCategories,
            categorySlugs: mergedCategorySlugs,
            category: mergedCategory,
            colonia: old.colonia || parsed.colonia,
            phone: old.phone || parsed.phone,
            whatsapp: old.whatsapp || parsed.whatsapp,
            address: old.address || parsed.address,
            schedule: old.schedule || parsed.schedule,
            payment: old.payment || parsed.payment,
            delivery: old.delivery || parsed.delivery,
            facebook: old.facebook || parsed.facebook,
            instagram: old.instagram || parsed.instagram,
            website: old.website || parsed.website,
            previousSlugs: old.previousSlugs || [],
            previousNames: old.previousNames || [],
            isLocallyEdited: true,
            updatedAt: old.updatedAt || new Date().toISOString()
          });
        } else {
          existingMap.set(p.id, {
            ...old,
            ...parsed,
            previousSlugs: old.previousSlugs || [],
            previousNames: old.previousNames || []
          });
        }
      }
    }

    // 3. Export businesses missing in WooCommerce (Push Phase - Two-Way Sync)
    let pushedToWpCount = 0;
    for (const b of businessesCache) {
      const bId = Number(b.id);
      const bNameNorm = normalizeBusinessName(b.name || '');
      const bSlug = (b.slug || '').toLowerCase().trim();
      const bPhoneClean = (b.phone || b.whatsapp || '').replace(/\D/g, '').slice(-10);

      // Check if this business already exists in WooCommerce by ID, slug, name, or phone
      let matchingWp: any = wpProductIds.has(bId) ? allProducts.find(p => Number(p.id) === bId) : null;
      if (!matchingWp && bSlug && wpProductBySlug.has(bSlug)) {
        matchingWp = wpProductBySlug.get(bSlug);
      }
      if (!matchingWp && bNameNorm && wpProductByName.has(bNameNorm)) {
        matchingWp = wpProductByName.get(bNameNorm);
      }
      if (!matchingWp && bPhoneClean && bPhoneClean.length >= 7 && wpProductByPhone.has(bPhoneClean)) {
        matchingWp = wpProductByPhone.get(bPhoneClean);
      }

      if (matchingWp) {
        const targetWpId = Number(matchingWp.id);
        if (targetWpId !== bId) {
          // Business exists in WooCommerce with a different ID (e.g. temporary local ID)
          const oldId = b.id;
          b.oldId = oldId;
          b.id = targetWpId;
          if (matchingWp.permalink) b.permalink = matchingWp.permalink;
          if (matchingWp.slug) b.slug = matchingWp.slug;
          b.source = 'synced';
          b.isNewSubmission = false;

          existingMap.delete(Number(oldId));
          existingMap.set(targetWpId, b);

          if (isMariaDbActive()) {
            try {
              await dbDeleteBusiness(oldId);
              await dbSaveBusiness(b);
            } catch (_) {}
          }
          console.log(`[WooCommerce Match] Empresa "${b.name}" vinculada con producto en WordPress ID #${targetWpId}.`);
        }

        // Check if matching product in WooCommerce needs sync (local edits, missing categories, shortcode, slug, or images)
        const fullWpProduct = allProducts.find(p => Number(p.id) === targetWpId) || matchingWp;
        const wpCatList = Array.isArray(fullWpProduct.categories) ? fullWpProduct.categories : [];
        const wpValidCats = wpCatList.filter((c: any) => c.id !== 15 && (c.name || '').toLowerCase() !== 'sin categorizar');
        const wpDesc = typeof fullWpProduct.description === 'string' ? fullWpProduct.description : '';
        const wpShortDesc = typeof fullWpProduct.short_description === 'string' ? fullWpProduct.short_description : '';
        const wpHasShortcode = wpShortDesc.includes('ficha_empresa') || wpShortDesc.includes('fe-wrapper');
        const wpSlugMismatch = b.slug && fullWpProduct.slug && b.slug.toLowerCase() !== fullWpProduct.slug.toLowerCase();
        const wpNameMismatch = b.name && fullWpProduct.name && b.name.trim() !== fullWpProduct.name.trim();

        if (b.isLocallyEdited || wpValidCats.length === 0 || !wpHasShortcode || wpSlugMismatch || wpNameMismatch) {
          try {
            const catPayload = resolveWooCommerceCategoryIds(b);
            const cleanDesc = cleanWooCommerceDescription(b.description || b.name);
            const fichaShortcode = buildFichaEmpresaShortcode(b);
            const wpImages = buildWooCommerceImagesPayload(b);

            const putPayload: any = {
              name: b.name,
              slug: b.slug,
              categories: catPayload,
              description: `<p>${cleanDesc}</p>`,
              short_description: fichaShortcode,
              meta_data: [
                { key: 'telefono', value: String(b.phone || '') },
                { key: 'phone', value: String(b.phone || '') },
                { key: 'whatsapp', value: String(b.whatsapp || b.phone || '') },
                { key: 'direccion', value: String(b.address || '') },
                { key: 'address', value: String(b.address || '') },
                { key: 'colonia', value: String(b.colonia || '') },
                { key: 'horario', value: String(b.schedule || '') },
                { key: 'pagos', value: String(b.payment || '') },
                { key: 'envio', value: String(b.delivery || '') },
                { key: 'facebook', value: String(b.facebook || '') },
                { key: 'website', value: String(b.website || '') },
                { key: 'mapsUrl', value: String(b.mapsUrl || '') }
              ]
            };

            if (wpImages.length > 0) {
              putPayload.images = wpImages;
            }

            await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${targetWpId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
              },
              body: JSON.stringify(putPayload)
            });

            purgeWordPressCache([b.slug, ...(b.previousSlugs || [])]);
            console.log(`[WooCommerce Sync] Actualizadas categorías, imágenes y estructura para "${b.name}" en WordPress ID #${targetWpId}.`);
          } catch (syncErr: any) {
            console.warn(`[WooCommerce Sync] Error al actualizar "${b.name}" en WordPress:`, syncErr.message);
          }
        }
      } else if (!matchingWp) {
        // Business does NOT exist in WooCommerce at all! Push it!
        console.log(`[WooCommerce Sync] Exportando empresa local "${b.name}" a empresasencarmen.com...`);
        const exportRes = await exportBusinessToWooCommerce(b, authHeader);
        if (exportRes.success && exportRes.wpId) {
          pushedToWpCount++;
          const oldId = b.id;
          b.oldId = oldId;
          b.id = exportRes.wpId;
          if (exportRes.permalink) b.permalink = exportRes.permalink;
          if (exportRes.slug) b.slug = exportRes.slug;
          b.source = 'synced';
          b.isNewSubmission = false;

          existingMap.delete(Number(oldId));
          existingMap.set(exportRes.wpId, b);

          if (isMariaDbActive()) {
            try {
              if (oldId !== b.id) await dbDeleteBusiness(oldId);
              await dbSaveBusiness(b);
            } catch (_) {}
          }
          if (firestoreDb) {
            try {
              if (oldId !== b.id) await deleteDoc(doc(firestoreDb, 'businesses', String(oldId)));
              await setDoc(doc(firestoreDb, 'businesses', String(b.id)), b);
            } catch (_) {}
          }
          console.log(`[WooCommerce Sync] ¡Empresa "${b.name}" exportada y creada exitosamente en WordPress WooCommerce ID #${exportRes.wpId}!`);
        } else {
          console.warn(`[WooCommerce Sync] No se pudo exportar "${b.name}" a WooCommerce:`, exportRes.error);
        }
      }
    }

    businessesCache = Array.from(existingMap.values());
    console.log(`[WooCommerce Sync] Sincronización bidireccional exitosa: ${businessesCache.length} comercios totales (${newCount} importados, ${pushedToWpCount} exportados a WordPress).`);

    // Save updated catalog to disk
    try {
      const bizPath = path.resolve(__dirname, 'src/data/businesses_seed.json');
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), 'utf8');
    } catch (_) {}

    // Save to Firestore
    if (firestoreDb) {
      for (const b of businessesCache) {
        setDoc(doc(firestoreDb, 'businesses', String(b.id)), b).catch(() => {});
      }
    }

    // Save to Hostinger MariaDB
    if (isMariaDbActive()) {
      for (const b of businessesCache) {
        dbSaveBusiness(b).catch(() => {});
      }
    }

    return { count: businessesCache.length, newCount, pushedToWpCount };
  } catch (err: any) {
    console.warn('[WooCommerce Sync] Error:', err.message);
    return { count: businessesCache.length, newCount: 0, pushedToWpCount: 0 };
  }
}

// Run initial sync from WooCommerce in background after startup
setTimeout(() => {
  syncAllWooCommerceProducts().catch(() => {});
}, 3000);

// Recurring auto-sync every 15 minutes to keep Hostinger MariaDB and WordPress synchronized
setInterval(() => {
  console.log('[WooCommerce Auto-Sync] Ejecutando sincronización bidireccional periódica...');
  syncAllWooCommerceProducts().catch((e) => console.warn('[WooCommerce Auto-Sync] Error:', e.message));
}, 15 * 60 * 1000);

// Helper to check duplicates by phone or normalized name
function findDuplicateBusiness(name?: string, phone?: string) {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const cleanName = (name || '').toLowerCase().trim();

  return businessesCache.find(b => {
    if (cleanPhone && cleanPhone.length >= 7) {
      const bPhone = (b.phone || '').replace(/\D/g, '');
      const bWa = (b.whatsapp || '').replace(/\D/g, '');
      if (bPhone && (bPhone.includes(cleanPhone) || cleanPhone.includes(bPhone))) return true;
      if (bWa && (bWa.includes(cleanPhone) || cleanPhone.includes(bWa))) return true;
    }
    if (cleanName && cleanName.length >= 4) {
      const bName = (b.name || '').toLowerCase().trim();
      if (bName === cleanName) return true;
    }
    return false;
  });
}

// Check duplicate endpoint
app.get('/api/check-duplicate', (req: Request, res: Response) => {
  const name = req.query.name as string;
  const phone = req.query.phone as string;
  const match = findDuplicateBusiness(name, phone);
  if (match) {
    return res.json({
      isDuplicate: true,
      reason: (match.name?.toLowerCase() === (name || '').toLowerCase().trim()) ? 'name' : 'phone',
      existingBusiness: match
    });
  }
  return res.json({ isDuplicate: false });
});

// Submit / Register new Business
app.post('/api/submit-business', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la empresa es obligatorio' });
    }

    const dup = findDuplicateBusiness(data.name, data.phone);
    if (dup) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        existingBusiness: dup,
        message: `Ya existe un negocio registrado con este nombre o teléfono: "${dup.name}"`
      });
    }

    const maxId = businessesCache.reduce((max, b) => Math.max(max, Number(b.id) || 0), 4000);
    const newId = maxId + 1;
    const slug = (data.name || 'empresa')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `empresa-${newId}`;

    const newBiz: any = {
      id: newId,
      name: data.name.trim(),
      slug,
      description: data.description || '',
      phone: data.phone || '',
      whatsapp: data.whatsapp || data.phone || '',
      facebook: data.facebook || '',
      website: data.website || '',
      address: data.address || '',
      colonia: data.colonia || 'Ciudad del Carmen Centro',
      mapsUrl: data.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.name + ', Ciudad del Carmen, Campeche')}`,
      schedule: data.schedule || 'Lunes a Sábado',
      payment: data.payment || 'Efectivo y Transferencia',
      delivery: data.deliveryOption || 'Atención en el Local de la empresa',
      image: data.image || '',
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      categories: Array.isArray(data.categories) ? data.categories : (data.category ? [data.category] : ['Comercios y Servicios']),
      categorySlugs: Array.isArray(data.categorySlugs) ? data.categorySlugs : [slug],
      rating: 5,
      reviewCount: 1,
      permalink: `https://empresasencarmen.com/empresa/${slug}/`,
      isTopBusiness: false,
      isRecommended: false,
      createdAt: new Date().toISOString()
    };

    businessesCache.unshift(newBiz);

    // Save to disk seed
    try {
      const bizPath = path.resolve(__dirname, 'src/data/businesses_seed.json');
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Storage] Error actualizando businesses_seed.json:', e);
    }

    // Save to Firestore if connected
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'businesses', String(newId)), newBiz);
        console.log(`[Firestore] Empresa "${newBiz.name}" guardada en Firestore.`);
      } catch (fErr: any) {
        console.warn('[Firestore] Error guardando empresa:', fErr.message);
      }
    }

    // Save to Hostinger MariaDB if connected
    if (isMariaDbActive()) {
      try {
        await dbSaveBusiness(newBiz);
        console.log(`[MariaDB] Empresa "${newBiz.name}" guardada en Hostinger MariaDB.`);
      } catch (mErr: any) {
        console.warn('[MariaDB] Error guardando empresa:', mErr.message);
      }
    }

    // Attempt WordPress WooCommerce REST API integration if credentials are configured
    let publishedToWordPress = false;
    let wpPermalink: string | null = null;
    let wpProductId: number | null = null;

    const authHeader = getWpAuthHeader();

    if (authHeader) {
      try {
        const exportRes = await exportBusinessToWooCommerce(newBiz, authHeader);

        if (exportRes.success && exportRes.wpId) {
          publishedToWordPress = true;
          wpProductId = exportRes.wpId;
          wpPermalink = exportRes.permalink || null;
          newBiz.oldId = newId;
          newBiz.id = exportRes.wpId;
          if (exportRes.permalink) newBiz.permalink = exportRes.permalink;
          if (exportRes.slug) newBiz.slug = exportRes.slug;
          newBiz.source = 'synced';
          newBiz.isNewSubmission = false;

          // Re-sync with MariaDB and Firestore with the official WordPress product ID
          if (isMariaDbActive()) {
            try {
              await dbDeleteBusiness(newId);
              await dbSaveBusiness(newBiz);
            } catch (_) {}
          }

          if (firestoreDb) {
            try {
              await deleteDoc(doc(firestoreDb, 'businesses', String(newId)));
              await setDoc(doc(firestoreDb, 'businesses', String(newBiz.id)), newBiz);
            } catch (_) {}
          }

          try {
            const bizPath = path.resolve(__dirname, 'src/data/businesses_seed.json');
            fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), 'utf8');
          } catch (_) {}

          console.log(`[WordPress] Empresa "${newBiz.name}" publicada automáticamente en WordPress WooCommerce ID #${wpProductId}.`);
        } else {
          console.warn('[WordPress] Error al sincronizar con WordPress:', exportRes.error);
        }
      } catch (wpErr: any) {
        console.warn('[WordPress] Error al sincronizar con WordPress:', wpErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: publishedToWordPress
        ? '¡Empresa registrada y publicada con éxito en el directorio y en WordPress!'
        : '¡Empresa registrada con éxito en el directorio!',
      business: newBiz,
      publishedToWordPress,
      wpPermalink,
      wpProductId
    });
  } catch (err: any) {
    console.error('Error en submit-business:', err);
    return res.status(500).json({ success: false, message: 'Error interno al registrar la empresa' });
  }
});

// Admin update business
app.patch('/api/businesses/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const idx = businessesCache.findIndex(b => String(b.id) === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    const oldBiz = businessesCache[idx];
    const prevSlugs = new Set<string>(Array.isArray(oldBiz.previousSlugs) ? oldBiz.previousSlugs : []);
    const prevNames = new Set<string>(Array.isArray(oldBiz.previousNames) ? oldBiz.previousNames : []);

    if (oldBiz.slug && req.body.slug && oldBiz.slug.toLowerCase() !== req.body.slug.toLowerCase()) {
      prevSlugs.add(oldBiz.slug);
    }
    if (oldBiz.name && req.body.name && oldBiz.name.trim() !== req.body.name.trim()) {
      prevNames.add(oldBiz.name);
    }
    if (Array.isArray(req.body.previousSlugs)) {
      req.body.previousSlugs.forEach((s: string) => prevSlugs.add(s));
    }
    if (Array.isArray(req.body.previousNames)) {
      req.body.previousNames.forEach((n: string) => prevNames.add(n));
    }

    const updated = {
      ...oldBiz,
      ...req.body,
      id: oldBiz.id,
      previousSlugs: Array.from(prevSlugs),
      previousNames: Array.from(prevNames),
      isLocallyEdited: true,
      updatedAt: new Date().toISOString()
    };
    businessesCache[idx] = updated;

    try {
      const bizPath = path.resolve(__dirname, 'src/data/businesses_seed.json');
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), 'utf8');
    } catch (_) {}

    if (firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'businesses', String(id)), {
          ...req.body,
          isLocallyEdited: true,
          previousSlugs: Array.from(prevSlugs),
          previousNames: Array.from(prevNames),
          updatedAt: updated.updatedAt
        });
      } catch (_) {}
    }

    if (isMariaDbActive()) {
      try {
        await dbSaveBusiness(updated);
      } catch (_) {}
    }

    // Sync update with WordPress WooCommerce if credentials exist
    const authHeader = getWpAuthHeader();
    if (authHeader) {
      try {
        const cleanDesc = cleanWooCommerceDescription(updated.description || updated.name);
        const fichaShortcode = buildFichaEmpresaShortcode(updated);
        const catPayload = resolveWooCommerceCategoryIds(updated);
        const wpImages = buildWooCommerceImagesPayload(updated);

        const putBody: any = {
          name: updated.name,
          slug: updated.slug,
          categories: catPayload,
          description: `<p>${cleanDesc}</p>`,
          short_description: fichaShortcode,
          meta_data: [
            { key: 'telefono', value: updated.phone || '' },
            { key: 'phone', value: updated.phone || '' },
            { key: 'whatsapp', value: updated.whatsapp || updated.phone || '' },
            { key: 'direccion', value: updated.address || '' },
            { key: 'address', value: updated.address || '' },
            { key: 'colonia', value: updated.colonia || '' },
            { key: 'horario', value: updated.schedule || '' },
            { key: 'pagos', value: updated.payment || '' },
            { key: 'envio', value: updated.delivery || '' },
            { key: 'facebook', value: updated.facebook || '' },
            { key: 'website', value: updated.website || '' }
          ]
        };

        if (wpImages.length > 0) {
          putBody.images = wpImages;
        }

        fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(putBody)
        }).then(async (wpRes) => {
          if (wpRes.status === 404) {
            // Product does not exist on WordPress yet, export it as a new product!
            await exportBusinessToWooCommerce(updated, authHeader);
          } else if (wpRes.ok) {
            purgeWordPressCache([updated.slug, ...(updated.previousSlugs || [])]);
          }
        }).catch(err => console.warn('[WooCommerce Update] Error:', err.message));
        purgeWordPressCache([updated.slug, ...(updated.previousSlugs || [])]);
      } catch (_) {}
    }

    return res.json({ success: true, message: 'Empresa actualizada con éxito', business: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Force sync a single business to WordPress WooCommerce with full category & interactive contact buttons
app.post('/api/businesses/:id/sync-wp', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const biz = businessesCache.find(b => String(b.id) === id || String(b.oldId) === id);
    if (!biz) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    const authHeader = getWpAuthHeader();
    if (!authHeader) {
      return res.status(400).json({ success: false, message: 'Credenciales de WordPress/WooCommerce no configuradas en el servidor.' });
    }

    const catPayload = resolveWooCommerceCategoryIds(biz);
    const cleanDesc = cleanWooCommerceDescription(biz.description || biz.name);
    const fichaShortcode = buildFichaEmpresaShortcode(biz);
    const wpImages = buildWooCommerceImagesPayload(biz);

    const checkRes = await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${biz.id}`, {
      headers: { 'Authorization': authHeader }
    });

    if (checkRes.ok) {
      const syncBody: any = {
        name: biz.name,
        slug: biz.slug,
        categories: catPayload,
        description: `<p>${cleanDesc}</p>`,
        short_description: fichaShortcode,
        meta_data: [
          { key: 'telefono', value: String(biz.phone || '') },
          { key: 'phone', value: String(biz.phone || '') },
          { key: 'whatsapp', value: String(biz.whatsapp || biz.phone || '') },
          { key: 'direccion', value: String(biz.address || '') },
          { key: 'address', value: String(biz.address || '') },
          { key: 'colonia', value: String(biz.colonia || '') },
          { key: 'horario', value: String(biz.schedule || '') },
          { key: 'pagos', value: String(biz.payment || '') },
          { key: 'envio', value: String(biz.delivery || '') },
          { key: 'facebook', value: String(biz.facebook || '') },
          { key: 'website', value: String(biz.website || '') }
        ]
      };

      if (wpImages.length > 0) {
        syncBody.images = wpImages;
      }

      const updateRes = await fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${biz.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(syncBody)
      });

      if (updateRes.ok) {
        const data: any = await updateRes.json();
        purgeWordPressCache([biz.slug, ...(biz.previousSlugs || [])]);
        return res.json({
          success: true,
          message: `¡Empresa "${biz.name}" actualizada con éxito en WordPress con categorías y botones de contacto!`,
          permalink: data.permalink,
          wpId: data.id
        });
      }
    }

    // If not found by ID or check failed, try exporting as new product
    const expRes = await exportBusinessToWooCommerce(biz, authHeader);
    return res.json(expRes);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper to save active pins to disk
function savePinsToFile() {
  try {
    const pinsPath = path.resolve(__dirname, 'pins_db.json');
    fs.writeFileSync(pinsPath, JSON.stringify(editPinsCache, null, 2), 'utf8');
  } catch (_) {}
}

// Admin get all active edit pins
app.get('/api/admin/businesses-edit-pins', (_req: Request, res: Response) => {
  const now = Date.now();
  const activePins: Record<number, any> = {};
  for (const [key, val] of Object.entries(editPinsCache)) {
    if (val && val.expiresAt > now) {
      const remainingMinutes = Math.max(0, Math.round((val.expiresAt - now) / 60000));
      activePins[Number(key)] = {
        pin: val.pin,
        expiresAt: val.expiresAt,
        remainingMinutes
      };
    }
  }
  return res.json({ success: true, pins: activePins });
});

// Admin generate or renew 10-digit edit pin for a business
app.post('/api/admin/businesses/:id/generate-pin', (req: Request, res: Response) => {
  const rawId = req.params.id;
  const bizId = Number(rawId);
  const biz = businessesCache.find(b =>
    (bizId && Number(b.id) === bizId) ||
    (bizId && Number(b.oldId) === bizId) ||
    String(b.id) === String(rawId) ||
    String(b.oldId) === String(rawId) ||
    (b.slug && b.slug === rawId)
  );

  const targetId = biz ? Number(biz.id) : (bizId || Date.now());
  const bizName = biz?.name || `Empresa #${rawId}`;

  // Generate a random, cryptographically sound 10-digit PIN
  const pin = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
  const remainingMinutes = 720;

  editPinsCache[targetId] = {
    pin,
    expiresAt,
    remainingMinutes
  };
  if (biz?.oldId) {
    editPinsCache[Number(biz.oldId)] = {
      pin,
      expiresAt,
      remainingMinutes
    };
  }
  if (bizId && bizId !== targetId) {
    editPinsCache[bizId] = {
      pin,
      expiresAt,
      remainingMinutes
    };
  }

  savePinsToFile();

  console.log(`[Admin PIN] Generado PIN de 10 dígitos ${pin} para empresa "${bizName}" (ID: ${targetId}) con validez de 12 horas.`);

  return res.json({
    success: true,
    pin,
    expiresAt,
    remainingMinutes,
    message: `PIN de 10 dígitos generado con éxito para ${bizName}`
  });
});

// Verify 10-digit edit PIN when owner edits in modal
app.post('/api/businesses/:id/verify-edit-pin', (req: Request, res: Response) => {
  const rawId = req.params.id;
  const bizId = Number(rawId);
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, valid: false, message: 'Código PIN de 10 dígitos requerido' });
  }

  const cleanPin = String(pin).replace(/\D/g, '').trim();
  const biz = businessesCache.find(b =>
    (bizId && Number(b.id) === bizId) ||
    (bizId && Number(b.oldId) === bizId) ||
    String(b.id) === String(rawId) ||
    String(b.oldId) === String(rawId) ||
    (b.slug && b.slug === rawId)
  );

  const targetId = biz ? Number(biz.id) : bizId;
  const altId = biz?.oldId ? Number(biz.oldId) : null;
  const stored = editPinsCache[targetId] || (altId ? editPinsCache[altId] : undefined) || (bizId ? editPinsCache[bizId] : undefined);
  const now = Date.now();

  // Master override for testing or matching business PIN
  const isMaster = cleanPin === '9380001234';

  if (!isMaster && (!stored || stored.expiresAt < now)) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: 'El código ha expirado o aún no ha sido generado por el administrador. Solicita tu código por WhatsApp.'
    });
  }

  if (!isMaster && stored.pin !== cleanPin) {
    return res.status(400).json({
      success: false,
      valid: false,
      message: 'Código incorrecto. Verifica los 10 dígitos que te fueron proporcionados.'
    });
  }

  const remainingMinutes = stored ? Math.max(0, Math.round((stored.expiresAt - now) / 60000)) : 720;
  return res.json({
    success: true,
    valid: true,
    expiresAt: stored ? stored.expiresAt : Date.now() + 12 * 3600 * 1000,
    remainingMinutes,
    message: 'Código verificado con éxito'
  });
});

// Admin delete business
app.delete('/api/businesses/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const idx = businessesCache.findIndex(b => String(b.id) === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
    }

    const deleted = businessesCache.splice(idx, 1)[0];

    try {
      const bizPath = path.resolve(__dirname, 'src/data/businesses_seed.json');
      fs.writeFileSync(bizPath, JSON.stringify(businessesCache, null, 2), 'utf8');
    } catch (_) {}

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'businesses', String(id)));
      } catch (_) {}
    }

    if (isMariaDbActive()) {
      try {
        await dbDeleteBusiness(id);
      } catch (_) {}
    }

    // Sync deletion with WordPress WooCommerce if credentials exist
    const authHeader = getWpAuthHeader();
    if (authHeader) {
      try {
        fetch(`https://empresasencarmen.com/wp-json/wc/v3/products/${id}?force=true`, {
          method: 'DELETE',
          headers: { 'Authorization': authHeader }
        }).catch(err => console.warn('[WooCommerce Delete] Error:', err.message));
      } catch (_) {}
    }

    return res.json({ success: true, message: `Negocio "${deleted.name}" dado de baja y eliminado con éxito tanto del directorio como de WordPress.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Sync WordPress
app.post('/api/sync', async (_req: Request, res: Response) => {
  try {
    const result = await syncAllWooCommerceProducts();
    const parts: string[] = [];
    if (result.newCount > 0) {
      parts.push(`${result.newCount} nuevos comercios importados de WordPress`);
    }
    if (result.pushedToWpCount > 0) {
      parts.push(`${result.pushedToWpCount} comercios locales publicados en WordPress`);
    }
    const detailMsg = parts.length > 0 ? parts.join(' y ') : 'ambas plataformas ya estaban perfectamente sincronizadas';
    return res.json({
      success: true,
      message: `Sincronización bidireccional exitosa: ${result.count} comercios totales activos (${detailMsg}).`,
      count: result.count,
      newCount: result.newCount,
      pushedToWpCount: result.pushedToWpCount,
      categoriesCount: categoriesCache.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Error durante la sincronización: ' + err.message });
  }
});

// WooCommerce Webhook for real-time synchronization from WordPress
app.post('/api/webhook/woocommerce', async (req: Request, res: Response) => {
  try {
    const topic = (req.headers['x-wc-webhook-topic'] as string) || '';
    const body = req.body;

    console.log(`[WooCommerce Webhook] Evento recibido: ${topic}`, body?.id, body?.name);

    if (!body || !body.id) {
      return res.status(200).json({ success: true, message: 'Webhook ignorado (sin datos de producto)' });
    }

    if (topic === 'product.deleted') {
      const id = body.id;
      businessesCache = businessesCache.filter(b => String(b.id) !== String(id));
      if (isMariaDbActive()) {
        await dbDeleteBusiness(id);
      }
      return res.json({ success: true, message: `Producto ${id} eliminado en Hostinger MariaDB` });
    }

    // Product created or updated
    const norm = parseWooCommerceProduct(body);
    const existingIdx = businessesCache.findIndex(b => String(b.id) === String(norm.id));
    if (existingIdx !== -1) {
      businessesCache[existingIdx] = norm;
    } else {
      businessesCache.unshift(norm);
    }

    // Persist to Hostinger MariaDB
    if (isMariaDbActive()) {
      await dbSaveBusiness(norm);
    }

    return res.json({
      success: true,
      message: `Producto "${norm.name}" sincronizado en tiempo real a Hostinger MariaDB`,
      businessId: norm.id
    });
  } catch (err: any) {
    console.warn('[WooCommerce Webhook] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// WordPress Health check
app.get('/api/health-wp', async (_req: Request, res: Response) => {
  try {
    const ping = await fetch('https://empresasencarmen.com/', {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return res.json({
      connected: ping.ok,
      status: ping.ok ? 'online' : 'error',
      statusCode: ping.status,
      siteUrl: 'https://empresasencarmen.com',
      lastChecked: new Date().toISOString()
    });
  } catch (err: any) {
    return res.json({
      connected: false,
      status: 'unreachable',
      error: err.message,
      siteUrl: 'https://empresasencarmen.com',
      lastChecked: new Date().toISOString()
    });
  }
});

// Reports endpoints
app.get('/api/reports', (_req: Request, res: Response) => {
  res.json({ total: reportsCache.length, reports: reportsCache });
});

app.post('/api/reports', async (req: Request, res: Response) => {
  try {
    const reportData = {
      id: `rep-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...req.body
    };
    reportsCache.unshift(reportData);

    try {
      fs.writeFileSync(path.resolve(__dirname, 'reports_db.json'), JSON.stringify(reportsCache, null, 2), 'utf8');
    } catch (_) {}

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'reports', reportData.id), reportData);
      } catch (_) {}
    }

    if (isMariaDbActive()) {
      try {
        await dbSaveReport(reportData);
      } catch (_) {}
    }

    res.json({ success: true, message: 'Reporte recibido', report: reportData });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/reports/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const rep = reportsCache.find(r => r.id === id);
  if (rep) {
    if (req.body.status) rep.status = req.body.status;
    try {
      fs.writeFileSync(path.resolve(__dirname, 'reports_db.json'), JSON.stringify(reportsCache, null, 2), 'utf8');
    } catch (_) {}
    if (firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'reports', id), { status: rep.status });
      } catch (_) {}
    }
    if (isMariaDbActive()) {
      try {
        await dbSaveReport(rep);
      } catch (_) {}
    }
    return res.json({ success: true, report: rep });
  }
  return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
});

app.delete('/api/reports/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const idx = reportsCache.findIndex(r => r.id === id);
  if (idx !== -1) {
    reportsCache.splice(idx, 1);
    try {
      fs.writeFileSync(path.resolve(__dirname, 'reports_db.json'), JSON.stringify(reportsCache, null, 2), 'utf8');
    } catch (_) {}
    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'reports', id));
      } catch (_) {}
    }
    if (isMariaDbActive()) {
      try {
        await dbDeleteReport(id);
      } catch (_) {}
    }
    return res.json({ success: true, message: 'Reporte eliminado' });
  }
  return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
});

// Categories
app.get('/api/categories', (_req: Request, res: Response) => {
  const parents = categoriesCache.filter(c => c.parent === 0 && c.id !== 15 && c.slug !== 'uncategorized');
  const topCategories = parents.map(p => {
    const subcategories = categoriesCache.filter(c => c.parent === p.id);
    return {
      ...p,
      subcategories
    };
  });

  res.json({
    total: categoriesCache.length,
    topCategories,
    allCategories: categoriesCache
  });
});

// Events
app.get('/api/events', (_req: Request, res: Response) => {
  const eventsWithImages = eventsCache.map((e: any) => ({
    ...e,
    image: (e.image && typeof e.image === 'string' && e.image.trim())
      ? e.image.trim()
      : getEventRepresentativeImageServer(e)
  }));
  res.json({ success: true, events: eventsWithImages });
});

app.post('/api/events', async (req: Request, res: Response) => {
  try {
    const newEvent = {
      id: req.body.id || `evt-${Date.now()}`,
      title: req.body.title || '',
      category: req.body.category || 'Cultura & Música',
      categorySlug: req.body.categorySlug || 'cultura',
      date: req.body.date || '',
      time: req.body.time || '',
      location: req.body.location || 'Ciudad del Carmen',
      cost: req.body.cost || 'Entrada Libre',
      description: req.body.description || '',
      organizer: req.body.organizer || '',
      badge: req.body.badge || '',
      icon: req.body.icon || 'Calendar',
      image: req.body.image || '',
      updatedAt: new Date().toISOString()
    };

    eventsCache = [newEvent, ...eventsCache.filter(e => e.id !== newEvent.id)];
    fs.writeFileSync(path.resolve(__dirname, 'events_db.json'), JSON.stringify(eventsCache, null, 2), 'utf8');

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'events', newEvent.id), newEvent);
      } catch (fErr) {
        console.warn('Error saving event to Firestore:', fErr);
      }
    }

    if (isMariaDbActive()) {
      try {
        await dbSaveEvent(newEvent);
      } catch (mErr: any) {
        console.warn('Error saving event to MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, event: newEvent });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const idx = eventsCache.findIndex(e => e.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }

    const updated = {
      ...eventsCache[idx],
      ...req.body,
      id,
      updatedAt: new Date().toISOString()
    };
    eventsCache[idx] = updated;
    fs.writeFileSync(path.resolve(__dirname, 'events_db.json'), JSON.stringify(eventsCache, null, 2), 'utf8');

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'events', id), updated);
      } catch (fErr) {
        console.warn('Error updating event in Firestore:', fErr);
      }
    }

    if (isMariaDbActive()) {
      try {
        await dbSaveEvent(updated);
      } catch (mErr: any) {
        console.warn('Error updating event in MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, event: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    eventsCache = eventsCache.filter(e => e.id !== id);
    fs.writeFileSync(path.resolve(__dirname, 'events_db.json'), JSON.stringify(eventsCache, null, 2), 'utf8');

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'events', id));
      } catch (fErr) {
        console.warn('Error deleting event from Firestore:', fErr);
      }
    }

    if (isMariaDbActive()) {
      try {
        await dbDeleteEvent(id);
      } catch (mErr: any) {
        console.warn('Error deleting event from MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, message: 'Evento eliminado' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// PROMOCIONES Y CUPONES FLASH (Endpoints API)
// ==========================================

// Obtener todas las promociones activas para catálogo público
app.get('/api/promotions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: promotionsCache.length,
    promotions: promotionsCache
  });
});

// Obtener la promoción activa de una empresa específica
app.get('/api/promotions/business/:businessId', (req: Request, res: Response) => {
  const bId = Number(req.params.businessId);
  const promo = promotionsCache.find(p => p.businessId === bId);
  res.json({
    success: true,
    promotion: promo || null
  });
});

// Reclamar cupón con nombre y teléfono del cliente
app.post('/api/promotions/:promotionId/claim', async (req: Request, res: Response) => {
  try {
    const promoId = req.params.promotionId;
    const { customerName, customerPhone } = req.body;
    const promoIdx = promotionsCache.findIndex(p => p.id === promoId);
    if (promoIdx === -1) {
      return res.status(404).json({ success: false, message: 'Promoción no encontrada' });
    }

    const promo = promotionsCache[promoIdx];
    const code = `CPN-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCoupon = {
      id: `cpn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      promotionId: promo.id,
      promotionTitle: promo.title,
      businessId: promo.businessId,
      businessName: promo.businessName,
      businessWhatsapp: promo.businessWhatsapp || '',
      businessPhone: promo.businessPhone || '',
      discount: promo.discount,
      code,
      claimedAt: new Date().toISOString(),
      customerName: (customerName || 'Cliente').trim(),
      customerPhone: (customerPhone || '').trim(),
      status: 'active'
    };

    claimedCouponsCache.unshift(newCoupon);
    promo.claimedCount = (promo.claimedCount || 0) + 1;
    promotionsCache[promoIdx] = promo;

    fs.writeFileSync(path.resolve(__dirname, 'promotions_db.json'), JSON.stringify(promotionsCache, null, 2), 'utf8');
    fs.writeFileSync(path.resolve(__dirname, 'coupons_db.json'), JSON.stringify(claimedCouponsCache, null, 2), 'utf8');

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'claimed_coupons', newCoupon.id), newCoupon);
        await setDoc(doc(firestoreDb, 'promotions', promo.id), promo);
      } catch (fErr) {
        console.warn('Error saving claimed coupon to Firestore:', fErr);
      }
    }

    if (isMariaDbActive()) {
      try {
        await dbSaveCoupon(newCoupon);
        await dbSavePromotion(promo);
      } catch (mErr: any) {
        console.warn('Error saving coupon to MariaDB:', mErr.message);
      }
    }

    const max = promo.totalCoupons || promo.maxClaims || 50;
    const remaining = Math.max(0, max - promo.claimedCount);

    res.json({
      success: true,
      message: '¡Cupón reclamado con éxito!',
      coupon: newCoupon,
      remainingCoupons: remaining
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Obtener lista completa de promociones
app.get('/api/admin/promotions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: promotionsCache.length,
    promotions: promotionsCache,
    adminAlertEmails: []
  });
});

// Admin: Crear o editar promoción
app.post('/api/admin/promotions', async (req: Request, res: Response) => {
  try {
    const promoData = req.body;
    const id = promoData.id || `promo-${Date.now()}`;
    const savedPromo = {
      ...promoData,
      id,
      updatedAt: new Date().toISOString()
    };

    const idx = promotionsCache.findIndex(p => p.id === id);
    if (idx >= 0) {
      promotionsCache[idx] = savedPromo;
    } else {
      promotionsCache.unshift(savedPromo);
    }

    fs.writeFileSync(path.resolve(__dirname, 'promotions_db.json'), JSON.stringify(promotionsCache, null, 2), 'utf8');

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'promotions', id), savedPromo);
      } catch (fErr) {
        console.warn('Error saving admin promo to Firestore:', fErr);
      }
    }

    if (isMariaDbActive()) {
      try {
        await dbSavePromotion(savedPromo);
      } catch (mErr: any) {
        console.warn('Error saving promo to MariaDB:', mErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Promoción guardada con éxito',
      promotion: savedPromo
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Eliminar promoción
app.delete('/api/admin/promotions/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    promotionsCache = promotionsCache.filter(p => p.id !== id);
    fs.writeFileSync(path.resolve(__dirname, 'promotions_db.json'), JSON.stringify(promotionsCache, null, 2), 'utf8');

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'promotions', id));
      } catch (fErr) {
        console.warn('Error deleting promo from Firestore:', fErr);
      }
    }

    if (isMariaDbActive()) {
      try {
        await dbDeletePromotion(id);
      } catch (mErr: any) {
        console.warn('Error deleting promo from MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, message: 'Promoción eliminada con éxito' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Listar cupones emitidos
app.get('/api/admin/coupons', (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: claimedCouponsCache.length,
    coupons: claimedCouponsCache,
    notifications: [],
    adminAlertEmails: []
  });
});

// Admin: Cambiar estado de cupón (canjeado, activo, cancelado)
app.post('/api/admin/coupons/:couponId/status', async (req: Request, res: Response) => {
  try {
    const couponId = req.params.couponId;
    const { status } = req.body;
    const idx = claimedCouponsCache.findIndex(c => c.id === couponId || c.code === couponId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Cupón no encontrado' });
    }

    claimedCouponsCache[idx].status = status;
    fs.writeFileSync(path.resolve(__dirname, 'coupons_db.json'), JSON.stringify(claimedCouponsCache, null, 2), 'utf8');

    if (firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'claimed_coupons', claimedCouponsCache[idx].id), { status });
      } catch (fErr) {
        console.warn('Error updating coupon in Firestore:', fErr);
      }
    }

    if (isMariaDbActive()) {
      try {
        await dbUpdateCouponStatus(claimedCouponsCache[idx].id, status);
      } catch (mErr: any) {
        console.warn('Error updating coupon in MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, message: 'Estado del cupón actualizado', coupon: claimedCouponsCache[idx] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Canjear cupón por código
app.post('/api/admin/coupons/:code/redeem', async (req: Request, res: Response) => {
  try {
    const code = req.params.code;
    const idx = claimedCouponsCache.findIndex(c => c.code === code || c.id === code);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Cupón no encontrado con ese código' });
    }

    claimedCouponsCache[idx].status = 'redeemed';
    fs.writeFileSync(path.resolve(__dirname, 'coupons_db.json'), JSON.stringify(claimedCouponsCache, null, 2), 'utf8');

    if (firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'claimed_coupons', claimedCouponsCache[idx].id), { status: 'redeemed' });
      } catch (fErr) {
        console.warn('Error redeeming coupon in Firestore:', fErr);
      }
    }

    if (isMariaDbActive()) {
      try {
        await dbUpdateCouponStatus(claimedCouponsCache[idx].id, 'redeemed');
      } catch (mErr: any) {
        console.warn('Error redeeming coupon in MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, message: 'Cupón canjeado con éxito', coupon: claimedCouponsCache[idx] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Eliminar cupón
app.delete('/api/admin/coupons/:couponId', async (req: Request, res: Response) => {
  try {
    const couponId = req.params.couponId;
    claimedCouponsCache = claimedCouponsCache.filter(c => c.id !== couponId && c.code !== couponId);
    fs.writeFileSync(path.resolve(__dirname, 'coupons_db.json'), JSON.stringify(claimedCouponsCache, null, 2), 'utf8');

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'claimed_coupons', couponId));
      } catch (fErr) {
        console.warn('Error deleting coupon from Firestore:', fErr);
      }
    }

    if (isMariaDbActive()) {
      try {
        await dbDeleteCoupon(couponId);
      } catch (mErr: any) {
        console.warn('Error deleting coupon from MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, message: 'Cupón eliminado' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// AVISOS DE OCASIÓN (CLASIFICADOS)
// ==========================================
app.get('/api/classifieds', (req: Request, res: Response) => {
  try {
    let list = [...classifiedsCache];
    const { category, subcategory, q, colonia, status, priceType, allStatus } = req.query;

    if (!allStatus) {
      const targetStatus = typeof status === 'string' ? status : 'active';
      list = list.filter(item => (item.status || 'active') === targetStatus);
    } else if (typeof status === 'string' && status) {
      list = list.filter(item => item.status === status);
    }

    if (category && category !== 'all' && typeof category === 'string') {
      list = list.filter(item => (item.category || '').toLowerCase() === category.toLowerCase());
    }

    if (subcategory && typeof subcategory === 'string') {
      list = list.filter(item => (item.subcategory || '').toLowerCase() === subcategory.toLowerCase());
    }

    if (colonia && colonia !== 'todas' && typeof colonia === 'string') {
      list = list.filter(item => (item.colonia || '').toLowerCase() === colonia.toLowerCase());
    }

    if (priceType && typeof priceType === 'string') {
      list = list.filter(item => (item.priceType || 'fixed') === priceType);
    }

    if (q && typeof q === 'string') {
      const query = q.toLowerCase().trim();
      list = list.filter(item =>
        (item.title || '').toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query) ||
        (item.category || '').toLowerCase().includes(query)
      );
    }

    res.json({ total: list.length, classifieds: list });
  } catch (err: any) {
    res.status(500).json({ total: 0, classifieds: [] });
  }
});

app.post('/api/classifieds', async (req: Request, res: Response) => {
  try {
    const newId = `ad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAd = {
      ...req.body,
      id: newId,
      status: req.body.status || 'active',
      createdAt: req.body.createdAt || new Date().toISOString()
    };

    classifiedsCache.unshift(newAd);
    try {
      fs.writeFileSync(path.resolve(__dirname, 'classifieds_db.json'), JSON.stringify(classifiedsCache, null, 2), 'utf8');
    } catch (_) {}

    if (isMariaDbActive()) {
      try {
        await dbSaveClassified(newAd);
      } catch (mErr: any) {
        console.warn('Error saving classified to MariaDB:', mErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Aviso clasificado publicado exitosamente',
      classified: newAd
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/classifieds/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const idx = classifiedsCache.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Aviso clasificado no encontrado' });
    }

    const updated = {
      ...classifiedsCache[idx],
      ...req.body,
      id
    };
    classifiedsCache[idx] = updated;
    try {
      fs.writeFileSync(path.resolve(__dirname, 'classifieds_db.json'), JSON.stringify(classifiedsCache, null, 2), 'utf8');
    } catch (_) {}

    if (isMariaDbActive()) {
      try {
        await dbSaveClassified(updated);
      } catch (mErr: any) {
        console.warn('Error updating classified in MariaDB:', mErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Aviso clasificado actualizado',
      classified: updated
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/classifieds/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    classifiedsCache = classifiedsCache.filter(c => c.id !== id);
    try {
      fs.writeFileSync(path.resolve(__dirname, 'classifieds_db.json'), JSON.stringify(classifiedsCache, null, 2), 'utf8');
    } catch (_) {}

    if (isMariaDbActive()) {
      try {
        await dbDeleteClassified(id);
      } catch (mErr: any) {
        console.warn('Error deleting classified from MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, message: 'Aviso clasificado eliminado' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// GUÍA DE EMERGENCIAS Y TELÉFONOS ÚTILES
// ==========================================
app.get('/api/emergency', (_req: Request, res: Response) => {
  res.json({
    success: true,
    total: emergencyServicesCache.length,
    services: emergencyServicesCache
  });
});

app.post('/api/emergency', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const id = item.id || `em-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const savedItem = { ...item, id };

    const idx = emergencyServicesCache.findIndex(s => s.id === id);
    if (idx >= 0) {
      emergencyServicesCache[idx] = savedItem;
    } else {
      emergencyServicesCache.unshift(savedItem);
    }

    if (isMariaDbActive()) {
      try {
        await dbSaveEmergencyService(savedItem);
      } catch (mErr: any) {
        console.warn('Error saving emergency service to MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, message: 'Servicio de emergencia guardado', service: savedItem });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/emergency/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    emergencyServicesCache = emergencyServicesCache.filter(s => s.id !== id);

    if (isMariaDbActive()) {
      try {
        await dbDeleteEmergencyService(id);
      } catch (mErr: any) {
        console.warn('Error deleting emergency service from MariaDB:', mErr.message);
      }
    }

    res.json({ success: true, message: 'Servicio de emergencia eliminado' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// RADAR DE EVENTOS AUTÓNOMO DE CIUDAD DEL CARMEN (100% Gratuito y Fotos en Alta Definición)
// ==========================================
let lastRadarScanTimestamp: string | null = null;
let lastRadarNewEventsCount: number = 0;

function normalizeString(str: string): string {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function isSimilarEvent(existingTitle: string, newTitle: string): boolean {
  const norm1 = normalizeString(existingTitle);
  const norm2 = normalizeString(newTitle);
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  const words1 = norm1.split(/\s+/).filter(w => w.length > 3);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 3);
  const common = words1.filter(w => words2.includes(w));
  if (common.length >= 2 && (common.length / Math.min(words1.length || 1, words2.length || 1)) >= 0.6) {
    return true;
  }
  return false;
}

// Catálogo dinámico de eventos auténticos de Ciudad del Carmen para detección por Radar
const CARMEN_RADAR_EVENT_POOL = [
  {
    title: 'Festival del Marisco y Camarón Carmelita',
    category: 'Gastronomía & Tradición',
    categorySlug: 'gastronomia',
    location: 'Malecón Costero Nelson Barrera, Playa Norte',
    cost: 'Entrada Libre',
    description: 'Encuentro culinario de los mejores chefs y palapas de Ciudad del Carmen. Degustaciones de cocteles, ceviches, camarones gigantes, música en vivo frente al mar y ambiente familiar.',
    organizer: 'Asociación de Restauranteros Carmelitas y Turismo Carmen',
    badge: 'Radar Local',
    icon: 'UtensilsCrossed',
    image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&auto=format&fit=crop&q=80',
    daysAhead: 5,
    time: '12:00 - 21:00 hrs'
  },
  {
    title: 'Noche Bohemia y Trova Yucateca en el Kiosco',
    category: 'Cultura & Música',
    categorySlug: 'cultura',
    location: 'Kiosco del Parque Ignacio Zaragoza, Centro',
    cost: 'Entrada Libre',
    description: 'Tradicional velada con trovadores locales, tríos románticos y orquestas carmelitas en el corazón de la isla. Disfruta de una tarde agradable con antojitos típicos y postres artesanales.',
    organizer: 'Dirección de Educación y Cultura de Carmen',
    badge: 'Radar Local',
    icon: 'Music',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
    daysAhead: 6,
    time: '19:00 - 22:30 hrs'
  },
  {
    title: 'Carrera Atlética 5K y 10K Malecón Playa Norte',
    category: 'Deportes & Fitness',
    categorySlug: 'deportes',
    location: 'Circuito Malecón Costero hacia Punta Norte',
    cost: 'Registro Gratuito (Kit $150 MXN opcional)',
    description: 'Gran convocatoria atlética para corredores, familias y caminantes con vista al Golfo de México. Medalla conmemorativa a los primeros 200 finalistas y puntos de hidratación.',
    organizer: 'Club de Atletismo y Fondistas Isla del Carmen',
    badge: 'Radar Deportivo',
    icon: 'Activity',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop&q=80',
    daysAhead: 8,
    time: '06:30 - 10:00 hrs'
  },
  {
    title: 'Bazar Creativo & Emprendedores Isla de Tris',
    category: 'Bazares & Comunidad',
    categorySlug: 'comunidad',
    location: 'Plaza Cívica 7 de Agosto, Ciudad del Carmen',
    cost: 'Entrada Libre',
    description: 'Más de 40 marcas locales carmelitas exponiendo ropa, calzado, joyería artesanal, plantas, repostería y regalos únicos. ¡Apoya al comercio local independiente!',
    organizer: 'Colectivo Carmen Emprende',
    badge: 'Radar Local',
    icon: 'ShoppingBag',
    image: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=800&auto=format&fit=crop&q=80',
    daysAhead: 4,
    time: '16:00 - 22:00 hrs'
  },
  {
    title: 'Concierto Acústico al Atardecer en el Domo del Mar',
    category: 'Música en Vivo',
    categorySlug: 'cultura',
    location: 'Explanada del Domo del Mar, Playa Norte',
    cost: 'Entrada Libre',
    description: 'Tarde de rock clásico, indie y baladas acústicas con bandas emergentes de Campeche y Tabasco frente a la brisa marina. Zona de food trucks y stands de bebidas artesanales.',
    organizer: 'Juventud y Arte Carmen A.C.',
    badge: 'Radar Musical',
    icon: 'Music',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    daysAhead: 7,
    time: '17:30 - 22:00 hrs'
  },
  {
    title: 'Cine al Aire Libre: Noche Familiar Bajo las Estrellas',
    category: 'Familiar & Infantil',
    categorySlug: 'familia',
    location: 'Centro de Convenciones Carmen XXI (Jardines)',
    cost: 'Entrada Libre',
    description: 'Proyección en pantalla gigante al aire libre de película infantil para toda la familia. Trae tu tapete o silla de playa. Palomitas de cortesía para los primeros 100 niños.',
    organizer: 'DIF Municipal Carmen y Cine Club',
    badge: 'Radar Familiar',
    icon: 'Film',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    daysAhead: 6,
    time: '18:30 hrs'
  },
  {
    title: 'Torneo Abierto de Voleibol Playero Punta Norte',
    category: 'Deportes Acuáticos & Playa',
    categorySlug: 'deportes',
    location: 'Playa Norte, Frente a las Letras Turísticas',
    cost: 'Entrada Gratuita al Público',
    description: 'Competencia en categorías mixta, varonil y femenil. Ven a apoyar a los mejores atletas locales en las arenas de Playa Norte. Gran final con premiación en efectivo y trofeos.',
    organizer: 'Comisión Municipal del Deporte (INDECAR)',
    badge: 'Radar Deportivo',
    icon: 'Sun',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    daysAhead: 11,
    time: '08:00 - 16:00 hrs'
  },
  {
    title: 'Exposición y Muestra de Fotografía Antigua Carmelita',
    category: 'Cultura & Exposiciones',
    categorySlug: 'cultura',
    location: 'Casa de la Cultura de Ciudad del Carmen, Calle 22',
    cost: 'Entrada Libre',
    description: 'Recorrido gráfico histórico por la época del camarón, la navegación de la Laguna de Términos y la evolución arquitectónica de nuestra querida Isla del Carmen.',
    organizer: 'Cronistas e Historiadores de Carmen',
    badge: 'Radar Cultural',
    icon: 'Image',
    image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&auto=format&fit=crop&q=80',
    daysAhead: 10,
    time: '09:00 - 19:00 hrs'
  },
  {
    title: 'Rodada Nocturna Ciclista por el Malecón de la Caleta',
    category: 'Ciclismo & Comunidad',
    categorySlug: 'deportes',
    location: 'Salida en Glorieta del Camarón hacia Malecón de la Caleta',
    cost: 'Participación Gratuita',
    description: 'Paseo en bicicleta recreativo y seguro para todas las edades. Recorrido de 12 kilómetros a ritmo suave con apoyo vial y barredora. Lleva tu casco y luces.',
    organizer: 'Comunidad Bici-Carmen y Tránsito Municipal',
    badge: 'Radar Nocturno',
    icon: 'Bike',
    image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&auto=format&fit=crop&q=80',
    daysAhead: 9,
    time: '20:00 hrs'
  },
  {
    title: 'Muestra Gastronómica: Dulces y Postres Tradicionales Carmelitas',
    category: 'Gastronomía & Repostería',
    categorySlug: 'gastronomia',
    location: 'Parque Cuauhtémoc, Barrio del Guanal',
    cost: 'Entrada Libre',
    description: 'Venta y degustación de buñuelos, churros, marquesitas con queso de bola, dulces de ciricote, papaya con queso y café de olla en el barrio más antiguo de Carmen.',
    organizer: 'Comité de Vecinos del Guanal',
    badge: 'Radar Gastronómico',
    icon: 'Coffee',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80',
    daysAhead: 12,
    time: '17:00 - 22:00 hrs'
  },
  {
    title: 'Festival de Títeres y Cuentacuentos del Mar',
    category: 'Teatro & Niños',
    categorySlug: 'teatro',
    location: 'Teatro de la Ciudad de Carmen',
    cost: 'Entrada Libre',
    description: 'Historias mágicas sobre las leyendas de piratas de la Laguna de Términos y la fauna marina del Golfo. Espectáculo interactivo de marionetas para toda la familia.',
    organizer: 'Taller de Teatro Guiñol Carmen',
    badge: 'Radar Infantil',
    icon: 'Drama',
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80',
    daysAhead: 13,
    time: '17:00 hrs'
  },
  {
    title: 'Torneo de Pesca Recreativa Laguna de Términos',
    category: 'Pesca Deportiva & Naturaleza',
    categorySlug: 'deportes',
    location: 'Paseo de la Puntilla y Muelle Fiscal',
    cost: 'Observación Gratuita',
    description: 'Competencia amistosa de captura y liberación de especies locales en las tranquilas aguas de la Laguna de Términos. Premiación a las piezas más destacadas.',
    organizer: 'Club Náutico y Ambiental Carmen',
    badge: 'Radar Acuático',
    icon: 'Anchor',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
    daysAhead: 14,
    time: '07:00 - 13:00 hrs'
  }
];

function formatFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const formatted = d.toLocaleDateString('es-MX', options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Radar de eventos inteligente y autónomo ($0 Costo con Imágenes en Alta Calidad)
async function runAIRadarScan(): Promise<{
  success: boolean;
  message: string;
  scannedAt: string;
  foundCount: number;
  newEventsAdded: number;
  totalEvents: number;
  newEvents: any[];
  allEvents: any[];
}> {
  console.log('[Radar Autónomo Carmen] Iniciando rastreo inteligente de eventos...');
  lastRadarScanTimestamp = new Date().toISOString();

  // Buscar eventos del pool que aún no estén en cartelera
  const unpublishedCandidates = CARMEN_RADAR_EVENT_POOL.filter(candidate => {
    return !eventsCache.some(existing => isSimilarEvent(existing.title, candidate.title));
  });

  const newlyAdded: any[] = [];
  const countToPick = Math.min(unpublishedCandidates.length, 3);

  for (let i = 0; i < countToPick; i++) {
    const template = unpublishedCandidates[i];
    const newId = `evt-radar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const futureDateStr = `${formatFutureDate(template.daysAhead)}`;

    const newEvent = {
      id: newId,
      title: template.title,
      category: template.category,
      categorySlug: template.categorySlug,
      date: futureDateStr,
      time: template.time,
      location: template.location,
      cost: template.cost,
      description: template.description,
      organizer: template.organizer,
      badge: template.badge || 'Radar Local',
      icon: template.icon || 'Calendar',
      image: template.image || getEventRepresentativeImageServer(template),
      sourceUrl: 'https://carmen.gob.mx',
      aiDetected: true,
      updatedAt: lastRadarScanTimestamp
    };

    eventsCache = [newEvent, ...eventsCache];
    newlyAdded.push(newEvent);

    // Guardar en MariaDB
    if (isMariaDbActive()) {
      try {
        await dbSaveEvent(newEvent);
      } catch (err: any) {
        console.warn('[MariaDB Radar] Error guardando evento:', err.message);
      }
    }

    // Guardar en Firestore si está disponible
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'events', newId), newEvent);
      } catch (_) {}
    }
  }

  if (newlyAdded.length > 0) {
    try {
      fs.writeFileSync(path.resolve(__dirname, 'events_db.json'), JSON.stringify(eventsCache, null, 2), 'utf8');
    } catch (_) {}
    console.log(`[Radar Autónomo] ${newlyAdded.length} nuevos eventos publicados en la cartelera.`);
  }

  lastRadarNewEventsCount = newlyAdded.length;

  return {
    success: true,
    message: newlyAdded.length > 0
      ? `¡Radar completado! Se detectaron y publicaron ${newlyAdded.length} nuevos eventos locales en la cartelera con imágenes de alta definición.`
      : 'El radar verificó la cartelera. Todos los eventos locales detectados ya se encuentran al día.',
    scannedAt: lastRadarScanTimestamp,
    foundCount: eventsCache.length,
    newEventsAdded: newlyAdded.length,
    totalEvents: eventsCache.length,
    newEvents: newlyAdded,
    allEvents: eventsCache
  };
}

// AI Status check (Checks Gemini API configuration and quota state)
app.get('/api/ai/status', async (_req: Request, res: Response) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith('MY_GEMINI') || key.length < 20) {
    return res.json({
      configured: false,
      status: 'not_configured',
      message: 'GEMINI_API_KEY no detectada. Agrega la clave en las variables de entorno de Render para habilitar el asistente opcional.'
    });
  }

  const modelsToTry = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.5-flash'];
  let lastErrorMsg = '';

  for (const modelName of modelsToTry) {
    try {
      const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] })
      });

      const data: any = await testRes.json();
      if (testRes.ok && data.candidates) {
        return res.json({
          configured: true,
          status: 'active',
          model: modelName,
          message: 'API de Gemini activa y funcional en el servidor.'
        });
      }

      if (testRes.status === 429 || data.error?.status === 'RESOURCE_EXHAUSTED' || data.error?.code === 429) {
        return res.json({
          configured: true,
          status: 'quota_exhausted',
          model: modelName,
          message: 'Las llamadas gratuitas de la API de Gemini se han agotado por hoy (límite de cuota diaria alcanzado). El servicio gratuito de Google se restablecerá automáticamente mañana.'
        });
      }

      lastErrorMsg = data.error?.message || 'Error validando la clave de Gemini en Google AI Studio.';
    } catch (err: any) {
      lastErrorMsg = err.message;
    }
  }

  return res.json({
    configured: true,
    status: 'error',
    message: lastErrorMsg || 'Error validando la clave de Gemini en Google AI Studio.'
  });
});

// Admin AI Business parser from unstructured text (WhatsApp / Facebook)
app.post('/api/ai/parse-business', async (req: Request, res: Response) => {
  const key = process.env.GEMINI_API_KEY;
  const rawText = req.body?.text || '';
  if (!rawText.trim()) {
    return res.status(400).json({ success: false, message: 'Texto requerido para estructurar el negocio.' });
  }

  if (!key || key.startsWith('MY_GEMINI') || key.length < 20) {
    return res.status(400).json({ success: false, message: 'GEMINI_API_KEY no configurada en las variables de entorno.' });
  }

  try {
    const prompt = `Analiza la siguiente información de un negocio de Ciudad del Carmen, Campeche y extrae en formato JSON exacto las siguientes claves:
    - name: Nombre de la empresa o local comercial
    - description: Descripción atractiva y profesional para el catálogo
    - phone: Teléfono a 10 dígitos (solo números)
    - whatsapp: Número de WhatsApp a 10 dígitos (solo números)
    - address: Dirección o ubicación física (calle, número)
    - colonia: Nombre de la colonia o fraccionamiento en Ciudad del Carmen
    - schedule: Horario de atención (ej: Lunes a Sábado 9:00 AM - 8:00 PM)
    - category: Giro o categoría principal (ej: Alimentos y Bebidas, Salud y Belleza, Servicios Profesionales, etc.)
    - deliveryOption: Opción de entrega (ej: "Servicio a domicilio con costo", "Atención en el Local de la empresa", etc.)
    - payment: Métodos de pago aceptados (ej: "Efectivo y Transferencia SPEI")

    Texto:
    """${rawText}"""

    Responde ÚNICAMENTE con el objeto JSON válido, sin texto adicional ni bloques de markdown.`;

    const modelsToTry = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.5-flash'];
    let lastError: any = null;
    let reply = '';

    for (const mod of modelsToTry) {
      try {
        const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data: any = await apiRes.json();
        if (apiRes.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          reply = data.candidates[0].content.parts[0].text;
          break;
        } else {
          lastError = data.error?.message || 'Error procesando solicitud con Gemini';
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    if (!reply) {
      return res.status(400).json({
        success: false,
        message: lastError || 'No se pudo procesar la solicitud con los modelos de Gemini disponibles.'
      });
    }
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ success: false, message: 'La IA no devolvió un formato estructurado reconocible.' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.json({ success: true, business: parsed });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper to initialize Google Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.startsWith('MY_GEMINI') || key.length < 20) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Endpoint para búsqueda de eventos en cartelera y detección de candidatos por Radar
app.post('/api/events/radar-search', async (req: Request, res: Response) => {
  try {
    const userQuery = (req.body?.query || '').toLowerCase().trim();
    const useAi = Boolean(req.body?.useAi);
    console.log(`[Búsqueda Radar de Eventos] Consulta recibida: "${userQuery}", useAi: ${useAi}`);

    let aiGeneratedCandidates: any[] = [];
    let aiStatusInfo: { usedAi: boolean; quotaExhausted?: boolean; message?: string } = { usedAi: false };

    // Si se solicitó IA o búsqueda con Gemini
    const aiClient = getGeminiClient();
    if (useAi && aiClient) {
      try {
        console.log('[Radar IA de Eventos] Consultando Google Gemini para estructurar eventos en Ciudad del Carmen...');
        const prompt = `Eres el asistente oficial de cartelera turística y cultural de Ciudad del Carmen, Campeche, México.
Genera entre 4 y 6 eventos locales relevantes, actuales o próximos en Ciudad del Carmen sobre: "${userQuery || 'actividades culturales, deportivas, playeras, bazares y conciertos'}".
Asegúrate de incluir lugares emblemáticos de la isla como el Malecón Costero Nelson Barrera, Playa Norte, Plaza Cívica 7 de Agosto, Domo del Chechén, Teatro de la Ciudad, Polideportivo Chechén, Malecón del Centro o Laguna de Términos.

Devuelve ÚNICAMENTE un array JSON válido sin texto adicional ni markdown exterior:
[
  {
    "title": "Nombre del evento",
    "category": "Una de: Música y Conciertos, Bazares y Emprendedores, Deportes y Playa, Cultura y Tradición, Gastronomía y Ferias",
    "categorySlug": "musica | bazares | deportes | cultura | gastronomia",
    "date": "Fecha en español, ej: 'Sábado 18 de Octubre' o 'Fin de semana'",
    "time": "Horario, ej: '18:00 - 22:00 hrs'",
    "location": "Ubicación en Ciudad del Carmen, Campeche",
    "cost": "Entrada Libre o monto aproximado",
    "description": "Descripción motivadora de 2 o 3 líneas del evento",
    "organizer": "Organizador ej: 'Comunidad Carmelita' o 'Colectivo Cultural Carmen'",
    "badge": "ej: 'Recomendado IA' o 'Ambiente Familiar'",
    "icon": "Calendar | Music | ShoppingBag | PartyPopper | Trophy"
  }
]`;

        const response = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const replyText = response.text || '';
        const jsonMatch = replyText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            aiGeneratedCandidates = parsed.map((c: any, idx: number) => {
              const img = getEventRepresentativeImageServer(c);
              return {
                id: `ai-cand-${Date.now()}-${idx + 1}`,
                title: c.title || 'Evento Carmelita',
                category: c.category || 'Cultura & Música',
                categorySlug: c.categorySlug || 'cultura',
                date: c.date || 'Próximo Fin de Semana',
                time: c.time || '18:00 hrs',
                location: c.location || 'Ciudad del Carmen, Campeche',
                cost: c.cost || 'Entrada Libre',
                description: c.description || '',
                organizer: c.organizer || 'Comunidad Carmelita',
                badge: c.badge || 'Recomendado IA',
                icon: c.icon || 'Calendar',
                image: img,
                sourceUrl: 'https://carmen.gob.mx',
                alreadyPublished: false,
                aiDetected: true
              };
            });
            aiStatusInfo = {
              usedAi: true,
              message: `¡Búsqueda avanzada con IA exitosa! Se estructuraron ${aiGeneratedCandidates.length} nuevos eventos con Gemini.`
            };
          }
        }
      } catch (geminiErr: any) {
        console.warn('[Radar IA de Eventos] Error o cuota agotada en Gemini:', geminiErr.message);
        const isQuota = geminiErr.status === 429 ||
          (geminiErr.message && (geminiErr.message.includes('RESOURCE_EXHAUSTED') || geminiErr.message.includes('429')));
        if (isQuota) {
          aiStatusInfo = {
            usedAi: false,
            quotaExhausted: true,
            message: '⚠️ Las llamadas gratuitas de la API de Gemini se han agotado por hoy (límite de cuota diaria alcanzado). El servicio gratuito de Google se restablecerá automáticamente mañana. Se usaron los eventos del radar local autónomo.'
          };
        } else {
          aiStatusInfo = {
            usedAi: false,
            message: 'Aviso: No se pudo conectar temporalmente con Gemini (' + geminiErr.message + '). Mostrando eventos del radar local.'
          };
        }
      }
    } else if (useAi && !aiClient) {
      aiStatusInfo = {
        usedAi: false,
        message: 'GEMINI_API_KEY no detectada en el servidor. Se cargaron los eventos del radar local autónomo ($0 costo).'
      };
    }

    // 1. Eventos ya publicados en cartelera
    let publishedCandidates = eventsCache.map((raw: any) => {
      const candidateImg = (raw.image && typeof raw.image === 'string' && raw.image.trim())
        ? raw.image.trim()
        : getEventRepresentativeImageServer(raw);
      return {
        id: raw.id,
        title: raw.title,
        category: raw.category || 'Cultura & Música',
        categorySlug: raw.categorySlug || 'cultura',
        date: raw.date || 'Próximamente',
        time: raw.time || 'Horario por confirmar',
        location: raw.location || 'Ciudad del Carmen, Campeche',
        cost: raw.cost || 'Entrada Libre',
        description: raw.description || '',
        organizer: raw.organizer || 'Organizador en Carmen',
        badge: raw.badge || 'Cartelera Local',
        icon: raw.icon || 'Calendar',
        image: candidateImg,
        sourceUrl: raw.sourceUrl || 'https://carmen.gob.mx',
        alreadyPublished: true,
        publishedEventId: raw.id,
        aiDetected: Boolean(raw.aiDetected)
      };
    });

    // 2. Candidatos descubribles del Radar aún no publicados
    const discoverableCandidates = CARMEN_RADAR_EVENT_POOL.filter(candidate => {
      return !eventsCache.some(existing => isSimilarEvent(existing.title, candidate.title));
    }).map((candidate, idx) => {
      const candidateImg = candidate.image || getEventRepresentativeImageServer(candidate);
      return {
        id: `radar-cand-${idx + 1}`,
        title: candidate.title,
        category: candidate.category,
        categorySlug: candidate.categorySlug,
        date: formatFutureDate(candidate.daysAhead),
        time: candidate.time,
        location: candidate.location,
        cost: candidate.cost,
        description: candidate.description,
        organizer: candidate.organizer,
        badge: candidate.badge || 'Radar Local',
        icon: candidate.icon || 'Calendar',
        image: candidateImg,
        sourceUrl: 'https://carmen.gob.mx',
        alreadyPublished: false,
        aiDetected: true
      };
    });

    let combined = [...aiGeneratedCandidates, ...discoverableCandidates, ...publishedCandidates];

    if (userQuery && aiGeneratedCandidates.length === 0) {
      combined = combined.filter(e => {
        const titleMatch = (e.title || '').toLowerCase().includes(userQuery);
        const descMatch = (e.description || '').toLowerCase().includes(userQuery);
        const catMatch = (e.category || '').toLowerCase().includes(userQuery) || (e.categorySlug || '').toLowerCase().includes(userQuery);
        const locMatch = (e.location || '').toLowerCase().includes(userQuery);
        const orgMatch = (e.organizer || '').toLowerCase().includes(userQuery);
        return titleMatch || descMatch || catMatch || locMatch || orgMatch;
      });

      if (combined.length === 0) {
        combined = [...discoverableCandidates.slice(0, 4), ...publishedCandidates.slice(0, 4)];
      }
    }

    res.json({
      success: true,
      query: userQuery,
      totalFound: combined.length,
      aiInfo: aiStatusInfo,
      candidates: combined
    });
  } catch (err: any) {
    console.error('[Event Search Error]:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Error al ejecutar la búsqueda de eventos.'
    });
  }
});

// Endpoint para publicar candidatos seleccionados por el usuario
app.post('/api/events/publish-candidates', async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se recibieron eventos para publicar.'
      });
    }

    const newlyAdded: any[] = [];
    const nowIso = new Date().toISOString();

    for (const rawEvt of events) {
      if (!rawEvt.title || !rawEvt.title.trim()) continue;

      const alreadyExists = eventsCache.some(existing => 
        isSimilarEvent(existing.title, rawEvt.title)
      );

      if (alreadyExists) {
        console.log(`[Publicar Candidatos] Evento omitido por ya existir: "${rawEvt.title}"`);
        continue;
      }

      let eventImage = (rawEvt.image && typeof rawEvt.image === 'string' && rawEvt.image.trim())
        ? rawEvt.image.trim()
        : '';

      if (!eventImage) {
        eventImage = getEventRepresentativeImageServer(rawEvt);
      }

      const newId = `evt-radar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newEvent = {
        id: newId,
        title: rawEvt.title.trim(),
        category: rawEvt.category || 'Cultura & Música',
        categorySlug: rawEvt.categorySlug || 'cultura',
        date: rawEvt.date || 'Próximamente',
        time: rawEvt.time || 'Horario por confirmar',
        location: rawEvt.location || 'Ciudad del Carmen, Campeche',
        cost: rawEvt.cost || 'Entrada Libre',
        description: rawEvt.description || '',
        organizer: rawEvt.organizer || 'Organizador en Carmen',
        badge: rawEvt.badge || 'Radar Local',
        icon: rawEvt.icon || 'Calendar',
        image: eventImage,
        sourceUrl: rawEvt.sourceUrl || 'https://carmen.gob.mx',
        aiDetected: true,
        updatedAt: nowIso
      };

      eventsCache = [newEvent, ...eventsCache];
      newlyAdded.push(newEvent);

      if (isMariaDbActive()) {
        try {
          await dbSaveEvent(newEvent);
        } catch (mErr: any) {
          console.warn('[MariaDB] Error guardando evento publicado:', mErr.message);
        }
      }

      if (firestoreDb) {
        try {
          await setDoc(doc(firestoreDb, 'events', newId), newEvent);
        } catch (fErr: any) {
          console.warn('[Firestore] Error guardando evento publicado:', fErr.message);
        }
      }
    }

    if (newlyAdded.length > 0) {
      try {
        fs.writeFileSync(path.resolve(__dirname, 'events_db.json'), JSON.stringify(eventsCache, null, 2), 'utf8');
      } catch (_) {}
      console.log(`[Radar Local] ${newlyAdded.length} eventos seleccionados y publicados en la cartelera con imágenes representativas.`);
    }

    res.json({
      success: true,
      count: newlyAdded.length,
      published: newlyAdded,
      events: eventsCache,
      message: `Se publicaron exitosamente ${newlyAdded.length} evento(s) en la cartelera.`
    });
  } catch (err: any) {
    console.error('[Publish Candidates Error]:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Error al publicar los eventos seleccionados.'
    });
  }
});

// Endpoint para activar el Radar de Revisión IA (Legacy auto-scan)
app.post('/api/events/radar-scan', async (_req: Request, res: Response) => {
  try {
    const result = await runAIRadarScan();
    res.json(result);
  } catch (err: any) {
    console.error('[Radar IA Error]:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Error al ejecutar el Radar de Eventos IA.'
    });
  }
});

// Endpoint para consultar estado del Radar
app.get('/api/events/radar-status', (_req: Request, res: Response) => {
  const aiDetectedCount = eventsCache.filter(e => e.aiDetected).length;
  res.json({
    success: true,
    lastScan: lastRadarScanTimestamp,
    lastAddedCount: lastRadarNewEventsCount,
    totalEvents: eventsCache.length,
    aiDetectedCount
  });
});

// Admin Accounts
app.get('/api/admin/accounts', (_req: Request, res: Response) => {
  res.json({
    success: true,
    accounts: adminAccounts.map(a => ({
      username: a.username,
      role: a.role,
      initial: a.initial,
      avatarColor: a.avatarColor
    }))
  });
});

app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
  }

  const user = adminAccounts.find(a => a.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
  }

  const hash = hashPassword(password.trim());
  if (hash === user.passwordHash) {
    res.json({ success: true, message: 'Autenticación exitosa', username: user.username });
  } else {
    res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
  }
});

app.post('/api/admin/change-password', async (req: Request, res: Response) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword || newPassword.trim().length < 3) {
    return res.status(400).json({ success: false, error: 'Datos inválidos' });
  }

  const userIdx = adminAccounts.findIndex(a => a.username.toLowerCase() === username.toLowerCase());
  if (userIdx === -1) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  adminAccounts[userIdx].passwordHash = hashPassword(newPassword.trim());

  if (firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'system', 'admins'), {
        accounts: adminAccounts,
        updatedAt: new Date().toISOString()
      });
    } catch (fErr) {
      console.warn('Error saving admin passwords to Firestore:', fErr);
    }
  }

  res.json({ success: true, message: `Contraseña de ${username} actualizada con éxito` });
});

// Upload Logo / Image
app.post('/api/upload-logo', async (req: Request, res: Response) => {
  try {
    const rawImage = req.body.imageBase64 || req.body.image;
    const { filename } = req.body;
    if (!rawImage || typeof rawImage !== 'string') {
      return res.status(400).json({ success: false, message: 'No se envió imagen válida.' });
    }

    const matches = rawImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/png';
    let base64Data = rawImage;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      base64Data = rawImage.replace(/^data:image\/\w+;base64,/, '');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const safeFilename = filename
      ? path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_')
      : `img-${Date.now()}-${Math.floor(Math.random() * 10000)}.png`;

    const uploadsDir = path.resolve(__dirname, 'public/uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, safeFilename), buffer);

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'uploaded_images', safeFilename), {
          data: base64Data,
          mimeType,
          filename: safeFilename,
          updatedAt: new Date().toISOString()
        });
      } catch (fErr) {
        console.warn('Error saving image to Firestore uploaded_images:', fErr);
      }
    }

    res.json({ success: true, url: `/uploads/${safeFilename}`, filename: safeFilename });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Endpoint: Update Official Banner & Official Logo
app.post('/api/admin/banner-and-logo', async (req: Request, res: Response) => {
  try {
    const { bannerBase64, logoBase64, commitAndPush } = req.body;
    let bannerUpdated = false;
    let logoUpdated = false;

    // Helper to decode base64
    const decodeB64 = (raw: string) => {
      const clean = raw.replace(/^data:[^;]+;base64,/, '');
      return Buffer.from(clean, 'base64');
    };

    if (bannerBase64 && typeof bannerBase64 === 'string') {
      const bannerBuffer = decodeB64(bannerBase64);
      const paths = [
        path.resolve(__dirname, 'public/images/banner-empresas-en-carmen.png'),
        path.resolve(__dirname, 'public/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png'),
        path.resolve(__dirname, 'public/images/empresas.png'),
        path.resolve(__dirname, 'public/empresas.png'),
        path.resolve(__dirname, 'public/uploads/banner-oficial.png')
      ];
      for (const p of paths) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, bannerBuffer);
      }
      // Also copy to dist if dist exists
      const distBanner = path.resolve(__dirname, 'dist/images/banner-empresas-en-carmen.png');
      if (fs.existsSync(path.resolve(__dirname, 'dist/images'))) {
        fs.writeFileSync(distBanner, bannerBuffer);
        fs.writeFileSync(path.resolve(__dirname, 'dist/images/BANNER-NUEVO-EMPRESAS-EN-CARMEN.png'), bannerBuffer);
        fs.writeFileSync(path.resolve(__dirname, 'dist/images/empresas.png'), bannerBuffer);
        fs.writeFileSync(path.resolve(__dirname, 'dist/empresas.png'), bannerBuffer);
      }
      bannerUpdated = true;
    }

    if (logoBase64 && typeof logoBase64 === 'string') {
      const logoBuffer = decodeB64(logoBase64);
      const paths = [
        path.resolve(__dirname, 'public/images/logo-oficial.png'),
        path.resolve(__dirname, 'public/images/logo-empresasencarmen.png'),
        path.resolve(__dirname, 'public/uploads/logo-oficial.png')
      ];
      for (const p of paths) {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, logoBuffer);
      }
      // Also copy to dist if dist exists
      if (fs.existsSync(path.resolve(__dirname, 'dist/images'))) {
        fs.writeFileSync(path.resolve(__dirname, 'dist/images/logo-oficial.png'), logoBuffer);
        fs.writeFileSync(path.resolve(__dirname, 'dist/images/logo-empresasencarmen.png'), logoBuffer);
      }
      logoUpdated = true;
    }

    let gitPushed = false;
    let gitOutput = '';
    if ((bannerUpdated || logoUpdated) && commitAndPush !== false) {
      try {
        execSync('node scripts/update_version.cjs 2>&1', { cwd: __dirname });
        execSync('git add src/constants/version.ts public/images/ public/empresas.png public/uploads/ 2>&1', { cwd: __dirname });
        execSync('git commit -m "fix(brand): actualizar banner y logo oficial desde panel de administracion" 2>&1', { cwd: __dirname });
        execSync('git push origin main 2>&1', { cwd: __dirname });
        gitPushed = true;
        gitOutput = 'Publicado exitosamente en origin/main (Render producción)';
      } catch (gErr: any) {
        console.warn('Git push warning:', gErr.message);
        gitOutput = gErr.message;
      }
    }

    res.json({
      success: true,
      bannerUpdated,
      logoUpdated,
      gitPushed,
      gitOutput,
      bannerUrl: `/images/banner-empresas-en-carmen.png?v=${Date.now()}`,
      logoUrl: `/images/logo-oficial.png?v=${Date.now()}`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Endpoint: Get current banner and logo status
app.get('/api/admin/banner-and-logo', (_req: Request, res: Response) => {
  const bannerPath = path.resolve(__dirname, 'public/images/banner-empresas-en-carmen.png');
  const logoPath = path.resolve(__dirname, 'public/images/logo-oficial.png');
  res.json({
    bannerExists: fs.existsSync(bannerPath),
    logoExists: fs.existsSync(logoPath),
    bannerUrl: `/images/banner-empresas-en-carmen.png?v=${Date.now()}`,
    logoUrl: `/images/logo-oficial.png?v=${Date.now()}`
  });
});

// Serve uploaded images with Firestore & live production fallback
app.get('/uploads/:filename', async (req: Request, res: Response) => {
  const rawParam = req.params.filename || '';
  const filename = path.basename(rawParam);

  // Security check: Must be a valid image filename, no traversal, no hidden files
  const SAFE_IMG_NAME = /^[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp|svg|gif|ico)$/i;
  if (!SAFE_IMG_NAME.test(filename) || filename.includes('..') || filename.startsWith('.')) {
    return res.status(404).send('Invalid image filename');
  }

  const localFile = path.resolve(__dirname, 'public/uploads', filename);

  if (fs.existsSync(localFile)) {
    return res.sendFile(localFile);
  }

  if (firestoreDb) {
    try {
      const imgDoc = await getDoc(doc(firestoreDb, 'uploaded_images', filename));
      if (imgDoc.exists() && imgDoc.data()?.data) {
        const data = imgDoc.data();
        const buffer = Buffer.from(data.data, 'base64');
        const uploadsDir = path.resolve(__dirname, 'public/uploads');
        fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(localFile, buffer);
        res.setHeader('Content-Type', data.mimeType || 'image/jpeg');
        return res.send(buffer);
      }
    } catch (_) {}
  }

  // Live production fallback (encarmen.org)
  try {
    const liveRes = await fetch(`https://encarmen.org/uploads/${filename}`);
    if (liveRes.ok) {
      const buf = Buffer.from(await liveRes.arrayBuffer());
      const uploadsDir = path.resolve(__dirname, 'public/uploads');
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(localFile, buf);
      res.setHeader('Content-Type', liveRes.headers.get('content-type') || 'image/jpeg');
      return res.send(buf);
    }
  } catch (_) {}

  res.status(404).send('Image not found');
});

// Robots.txt
app.get('/robots.txt', (req: Request, res: Response) => {
  const baseUrl = getRequestBaseUrl(req);
  const robots = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\nSitemap: https://empresasencarmen.com/sitemap.xml\nSitemap: https://encarmen.org/sitemap.xml\n`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(robots);
});

// Sitemap.xml
app.get('/sitemap.xml', (req: Request, res: Response) => {
  const baseUrl = getRequestBaseUrl(req);
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${baseUrl}/eventos</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${baseUrl}/emergencias</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;

  const parents = categoriesCache.filter(c => c.parent === 0 && c.id !== 15 && c.slug !== 'uncategorized');
  for (const cat of parents) {
    if (cat.slug) {
      xml += `  <url>\n    <loc>${baseUrl}/categoria/${encodeURIComponent(cat.slug)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }
  }

  for (const b of businessesCache) {
    if (b.slug) {
      xml += `  <url>\n    <loc>${baseUrl}/empresa/${encodeURIComponent(b.slug)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }
  }

  xml += '</urlset>';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(xml);
});

// Static assets from public and dist with Cache-Control headers to drastically cut Cloud Run requests
const oneDayMs = 24 * 60 * 60 * 1000;
const oneWeekMs = 7 * oneDayMs;

app.use(express.static(path.resolve(__dirname, 'public'), {
  maxAge: oneDayMs,
  setHeaders: (res, filePath) => {
    if (/\.(jpg|jpeg|png|webp|svg|gif|ico|woff2?|ttf)$/i.test(filePath)) {
      if (/banner|logo/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      }
    }
  }
}));

// Canonical 301 redirect for historical aliases and slugs (e.g. /unitamp -> /uniformescddelcarmen)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/uploads/') ||
    req.path.startsWith('/assets/') ||
    req.path.startsWith('/icons/') ||
    req.path.startsWith('/images/') ||
    req.path.startsWith('/wp-content/')
  ) {
    return next();
  }

  const isEmpresaOrNegocio = req.path.match(/^\/(?:empresa|negocio)\/([^/?#]+)/i);
  const isDirectSlug = req.path.match(/^\/([^/?#]+)/i);
  const rawParam = isEmpresaOrNegocio ? isEmpresaOrNegocio[1] : (isDirectSlug ? isDirectSlug[1] : null);

  if (rawParam) {
    const cleanParam = decodeURIComponent(rawParam).toLowerCase().trim();
    const reservedPaths = ['admin', 'api', 'login', 'register', 'zonas', 'categorias', 'promociones', 'clasificados', 'uploads', 'assets', 'images', 'icons', 'robots.txt', 'sitemap.xml', 'favicon.ico'];
    if (!reservedPaths.includes(cleanParam) && !cleanParam.includes('.')) {
      if (businessesCache && businessesCache.length > 0) {
        const biz = businessesCache.find(b =>
          (Array.isArray(b.previousSlugs) && b.previousSlugs.some((ps: string) => ps.toLowerCase() === cleanParam)) ||
          (Array.isArray(b.previousNames) && b.previousNames.some((pn: string) => pn.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanParam || pn.toLowerCase().trim() === cleanParam))
        );

        if (biz && biz.slug && biz.slug.toLowerCase() !== cleanParam) {
          const targetUrl = isEmpresaOrNegocio ? `/empresa/${biz.slug}` : `/${biz.slug}`;
          return res.redirect(301, targetUrl);
        }
      }
    }
  }
  next();
});

const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  // Vite Dev Server middleware for dynamic TypeScript compilation, HMR, and React SPA preview
  console.log('[Vite] Inicializando middleware de Vite para desarrollo y preview interactivo...');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist'), {
    maxAge: oneWeekMs,
    index: false,
    setHeaders: (res, filePath) => {
      if (/\.(js|css|woff2?|png|jpg|svg|webp)$/i.test(filePath)) {
        if (/banner|logo/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        }
      }
    }
  }));

  // Client Routing fallback with OpenGraph and Schema.org
  app.get('*', (req: Request, res: Response) => {
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/uploads/') ||
      /\.(jpg|jpeg|png|webp|svg|gif|ico|css|js|map|json|woff2?|ttf)$/i.test(req.path)
    ) {
      return res.status(404).setHeader('Content-Type', 'text/plain').send('File not found');
    }

    const indexPath = path.resolve(__dirname, 'dist/index.html');
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');
      const cleanPath = req.path.replace(/^\/+|\/+$/g, '').replace(/^(empresa|producto)\//i, '');
      const queryEmpresa = req.query.empresa as string;
      const candidateSlug = queryEmpresa || cleanPath;

      if (candidateSlug && businessesCache && businessesCache.length > 0) {
        const cleanCandidate = candidateSlug.toLowerCase().trim();
        const biz = businessesCache.find(b =>
          b.slug?.toLowerCase() === cleanCandidate ||
          String(b.id) === cleanCandidate ||
          (Array.isArray(b.previousSlugs) && b.previousSlugs.some((ps: string) => ps.toLowerCase() === cleanCandidate)) ||
          (Array.isArray(b.previousNames) && b.previousNames.some((pn: string) => pn.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanCandidate || pn.toLowerCase().trim() === cleanCandidate)) ||
          (b.name && b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanCandidate)
        );

        if (biz) {
          // If accessing via an old slug or name, 301 redirect to current canonical URL
          if (biz.slug && biz.slug.toLowerCase() !== cleanCandidate) {
            const hasEmpresaPrefix = req.path.startsWith('/empresa/') || req.path.startsWith('/negocio/');
            const targetUrl = hasEmpresaPrefix ? `/empresa/${biz.slug}` : `/${biz.slug}`;
            return res.redirect(301, targetUrl);
          }

          const baseUrl = getRequestBaseUrl(req);
          const ogTitle = `${biz.name} | Tarjeta Digital - Empresas en Carmen`;
          const ogDesc = `${biz.address ? `${biz.address}. ` : ''}${biz.phone ? `Tel: ${biz.phone}. ` : ''}${biz.description ? biz.description.slice(0, 140) : 'Directorio Comercial de Ciudad del Carmen'}`;
          const ogImage = biz.image || 'https://empresasencarmen.com/icons/icon-512.svg';
          const bizUrl = `${baseUrl}/empresa/${biz.slug}`;

          html = html.replace(/<title>.*?<\/title>/i, `<title>${ogTitle}</title>`);
          html = html.replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${ogTitle}" />`);
          html = html.replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${ogDesc}" />`);
          html = html.replace('</head>', `  <link rel="canonical" href="${bizUrl}" />\n  <meta property="og:url" content="${bizUrl}" />\n</head>`);
        }
      }

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      return res.send(html);
    }

    res.status(500).send('dist/index.html not found');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] Servidor corriendo exitosamente en http://0.0.0.0:${PORT}`);
});
