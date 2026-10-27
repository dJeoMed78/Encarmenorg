# En Carmen (.org) - Directorio Comercial y Turístico de Ciudad del Carmen

Aplicación web progresiva (PWA) y plataforma completa de directorio comercial, eventos, clasificados y emergencias para Ciudad del Carmen, Campeche.

Totalmente conectada con:
- **Base de Datos MariaDB / MySQL en Hostinger**: Lectura y escritura en tiempo real de comercios, reportes, eventos y reseñas (fuente principal de datos).
- **Almacenamiento Local de Medios Autónomo**: Más de 1,800 archivos multimedia históricos servidos directamente desde el servidor.
- **Servidor Express + Vite + React + Tailwind CSS**.

---

## 🚀 Despliegue Gratuito / Independiente

Puedes desplegar este proyecto en plataformas gratuitas o de muy bajo costo como:
1. **Render.com** (Free Web Service)
2. **Railway.app**
3. **Hostinger Node.js Application** (si tu plan de Hostinger soporta Node.js o VPS)
4. **Fly.io** o **Koyeb**

### Variables de Entorno Requeridas (.env)

Configura las siguientes variables en la plataforma de tu elección:

```env
PORT=3000
NODE_ENV=production

# Base de Datos Hostinger MariaDB
DB_HOST=srv1356.hstgr.io
DB_PORT=3306
DB_USER=u293982346_appuser
DB_PASSWORD="TU_PASSWORD_AQUI"
DB_NAME=u293982346_encarmenapp
```

---

## 🛠 Comandos de Instalación y Ejecución

- **Comando de Build:**
  ```bash
  npm install && npm run build
  ```

- **Comando de Inicio (Start Command):**
  ```bash
  npm start
  ```

---

## 📦 Características Principales

- **Directorio de más de 200 empresas y negocios locales.**
- **Búsqueda instantánea, categorías y filtros por colonia.**
- **Integración con Google Maps / Waze / WhatsApp directo.**
- **Arquitectura 100% autónoma:** Sin dependencias externas de CMS ni llamadas a APIs de WordPress/WooCommerce.
- **SEO optimizado:** OpenGraph dinámico para compartir en WhatsApp y Facebook con vista previa de cada negocio.

