# ENCARMEN

Portal empresarial y directorio digital para Ciudad del Carmen, Campeche.

## Arquitectura

- Servidor: Express + Vite + React + Tailwind CSS.
- Persistencia autorizada: MariaDB/MySQL en Hostinger.
- Imágenes: almacenamiento local administrado por ENCARMEN. Se conservan rutas históricas durante la migración para evitar enlaces rotos.
- WordPress y WooCommerce están retirados del flujo operativo, sincronización, registro y administración.

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

Los secretos deben mantenerse en el gestor de variables del entorno y nunca en el repositorio. No configures credenciales de servicios retirados.

## Instalación y ejecución

```bash
npm ci
npm run build
npm start
```

## Funcionalidades

- Directorio empresarial y búsqueda por categorías y colonias.
- Administración de comercios con MariaDB como fuente autorizada.
- Google Maps, eventos, clasificados y servicios de emergencia.
- Registro público sujeto a validación y persistencia confirmada.

## Compatibilidad de imágenes

Las rutas locales que resuelven imágenes históricas se mantienen deliberadamente hasta verificar la migración y disponibilidad de todos los archivos. Su conservación no implica conexión ni sincronización externa.
