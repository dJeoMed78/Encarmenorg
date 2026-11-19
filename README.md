# ENCARMEN

Portal empresarial y directorio digital para Ciudad del Carmen, Campeche.

## Arquitectura

- Servidor: Express + Vite + React + Tailwind CSS.
- Persistencia autorizada: MariaDB/MySQL en Hostinger.
- Medios históricos: archivos locales administrados por ENCARMEN; se conservan rutas compatibles hasta validar la disponibilidad de todos los recursos.
- Integraciones WordPress/WooCommerce retiradas: no forman parte del registro, administración, sincronización ni operación del portal.

## Variables de entorno

```env
PORT=3000
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=usuario
DB_PASSWORD=contraseña
DB_NAME=base_de_datos
```

Los secretos deben configurarse en el gestor seguro del entorno y nunca guardarse en el repositorio.

## Instalación

```bash
npm ci
npm run lint
npm run build
npm start
```

## Funcionalidades

- Directorio empresarial y búsqueda por categorías y colonias.
- Administración y persistencia de comercios en MariaDB.
- Google Maps, eventos, clasificados y servicios de emergencia.
- Registro público sujeto a validación y persistencia confirmada.

Las rutas de imágenes históricas se mantienen para compatibilidad local; no deben provocar solicitudes a plataformas retiradas.
