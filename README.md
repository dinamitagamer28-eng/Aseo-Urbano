# Sistema de Gestión de Aseo Urbano - Alcaldía de Rosario de Perijá

Sistema web para la administración, catastro, facturación y recaudación de tasas de aseo urbano comercial y residencial.

---

## 🚀 Requisitos previos

- **Node.js**: v18+ o v20+ recomendado
- **npm** o **pnpm**

---

## 🛠️ Instalación y configuración local

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd aseo
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
   *(Verifica los valores dentro de `.env` si necesitas personalizar el puerto o la base de datos)*.

4. **Inicializar y poblar la Base de Datos:**
   Para desarrollo local con SQLite:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5000](http://localhost:5000) en tu navegador.

---

## 📁 Estructura del Proyecto

- `src/app`: Rutas y páginas de Next.js (App Router)
- `src/components`: Componentes reutilizables de UI (PrimeReact, TailwindCSS, etc.)
- `src/lib`: Utilidades, clientes de base de datos (Prisma) y helpers
- `prisma/`: Esquema de base de datos (`schema.prisma`) y script de semilla (`seed.ts`)
- `docker-compose.yml` / `Dockerfile`: Configuración para despliegue en contenedores

---

## 📜 Scripts disponibles

- `npm run dev`: Inicia el servidor de desarrollo en el puerto 5000.
- `npm run build`: Compila la aplicación para producción.
- `npm run start`: Inicia el servidor en modo producción.
- `npm run lint`: Ejecuta el linter ESLint.
- `npm run db:push`: Aplica los cambios del esquema de Prisma a la base de datos.
- `npm run db:seed`: Ejecuta el seed de datos iniciales.
