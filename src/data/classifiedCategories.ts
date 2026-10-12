export interface ClassifiedSubcategory {
  id: string;
  name: string;
  description: string;
  isJobCategory?: boolean;
}

export interface ClassifiedCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  subcategories: ClassifiedSubcategory[];
}

export const CLASSIFIED_CATEGORIES: ClassifiedCategory[] = [
  {
    id: 'inmuebles',
    name: '1. Inmuebles (Bienes Raíces)',
    icon: 'Home',
    color: 'text-indigo-500',
    subcategories: [
      { id: 'inmuebles-venta', name: 'Venta', description: 'Casas, departamentos, terrenos y locales comerciales.' },
      { id: 'inmuebles-renta', name: 'Renta / Alquiler', description: 'Casas, departamentos, cuartos y espacios comerciales.' },
      { id: 'inmuebles-traspasos', name: 'Traspasos y otros', description: 'Oportunidades inmobiliarias especiales.' }
    ]
  },
  {
    id: 'vehiculos',
    name: '2. Vehículos',
    icon: 'Car',
    color: 'text-blue-500',
    subcategories: [
      { id: 'vehiculos-autos', name: 'Autos y camionetas', description: 'Usados, seminuevos y de agencia.' },
      { id: 'vehiculos-motos', name: 'Motos y motonetas', description: 'De diferentes cilindradas y estilos.' },
      { id: 'vehiculos-pesados', name: 'Vehículos pesados', description: 'Camiones, autobuses y remolques.' },
      { id: 'vehiculos-accesorios', name: 'Accesorios y refacciones', description: 'Llantas, refacciones y partes.' }
    ]
  },
  {
    id: 'empleos',
    name: '3. Empleos y Bolsa de Trabajo',
    icon: 'Briefcase',
    color: 'text-amber-500',
    subcategories: [
      { id: 'empleos-ofertas', name: 'Ofertas de empleo (Vacantes)', description: 'Puestos de trabajo activos en Carmen.' },
      { id: 'empleos-busqueda', name: 'Se busca trabajo (CVs)', description: 'Personas ofreciendo sus servicios profesionales.' }
    ]
  },
  {
    id: 'compra-venta',
    name: '4. Compra - Venta (Bazar)',
    icon: 'ShoppingBag',
    color: 'text-emerald-500',
    subcategories: [
      { id: 'bazar-hogar', name: 'Hogar y Muebles', description: 'Salas, comedores, refrigeradores, estufas.' },
      { id: 'bazar-electronica', name: 'Electrónica y Celulares', description: 'Teléfonos, computadoras, pantallas.' },
      { id: 'bazar-ropa', name: 'Ropa, Calzado y Accesorios', description: 'Prendas y calzado.' },
      { id: 'bazar-herramientas', name: 'Herramientas y Maquinaria', description: 'Herramientas industriales y de taller.' },
      { id: 'bazar-otros', name: 'Otros artículos', description: 'Todo lo demás para comprar o vender.' }
    ]
  },
  {
    id: 'mascotas',
    name: '5. Mascotas y Animales',
    icon: 'Heart',
    color: 'text-rose-500',
    subcategories: [
      { id: 'mascotas-adopcion', name: 'Adopción responsable', description: 'Perritos y gatitos en busca de hogar.' },
      { id: 'mascotas-perdidas', name: 'Extraviadas / Encontradas', description: 'Ayuda para localizar mascotas perdidas.' },
      { id: 'mascotas-accesorios', name: 'Accesorios y alimentos', description: 'Casitas, jaulas y alimento.' }
    ]
  },
  {
    id: 'eventos',
    name: '6. Servicios y Eventos',
    icon: 'Calendar',
    color: 'text-purple-500',
    subcategories: [
      { id: 'servicios-fiestas', name: 'Fiestas y banquetes', description: 'Música, inflables, mesas y banquetes.' },
      { id: 'servicios-oficios', name: 'Oficios y reparaciones', description: 'Albañilería, plomería, pintura y clima.' },
      { id: 'servicios-cursos', name: 'Cursos y clases particulares', description: 'Idiomas, regularización y deportes.' }
    ]
  }
];
