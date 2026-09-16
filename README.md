# 🏙️ Sistema Integral de Aseo Urbano y Censo Territorial Municipal

Bienvenido al repositorio oficial del **Sistema de Aseo Urbano y Censo Territorial**. Este proyecto comprende un ecosistema tecnológico completo desarrollado para la Alcaldía, compuesto por la **Plataforma Web Central** y la **Aplicación Móvil Nativa de Censo (Flutter / Android)**.

---

## 🚀 Arquitectura del Ecosistema

El proyecto está organizado como un monorepo profesional que divide claramente las responsabilidades del sistema:

```
Aseo-Urbano/
├── 🌐 Plataforma Web (Next.js + Prisma)
│   ├── src/app/              # Rutas públicas y administrativas (Ciudadano, Cuadrilla, Admin)
│   ├── src/app/api/censo/    # Endpoints REST para sincronización de datos de la App Móvil
│   ├── prisma/               # Modelos de base de datos relacional (SQLite / PostgreSQL)
│   └── public/               # Recursos estáticos y manifiesto PWA
│
├── 📱 App Móvil de Censo (Flutter / Dart)
│   └── app-movil-censo/      # Aplicativo móvil exclusivo para encuestadores de la Alcaldía
│       ├── lib/              # Código fuente Dart (Pantallas GPS, Dock, Modales, Auth)
│       ├── android/          # Configuración y manifiesto nativo Android
│       ├── preview/          # Simulador web interactivo para pruebas rápidas
│       └── pubspec.yaml      # Dependencias (flutter_map, geolocator, latlong2, http)
│
└── 📦 Releases y Distribución
    └── releases/             # Instaladores APK listos para teléfonos Android
        └── censo-aseo-alcaldia.apk
```

---

## 🌟 Componentes del Sistema

### 1. Plataforma Web Central
- **Portal Ciudadano:** Consulta de rutas de recolección, horarios por sector, registro de solicitudes y visualización de tarifas.
- **Portal de Cuadrilla:** Control de rutas en tiempo real y reporte de incidencias en campo.
- **Panel Administrativo / Taquilla:** Gestión de cobros, reportes de recaudación y catastro.
- **API REST de Censo:** Servicio seguro con soporte CORS en `/api/censo` y `/api/censo/buscar` para recibir los levantamientos de los encuestadores en calle.

### 2. Aplicación Móvil de Censo (Exclusiva Alcaldía)
- **Autenticación Estricta:** Acceso protegido exclusivamente con credenciales de empleado (`ADMIN2026` o `CUADRILLA2026`).
- **Mapa GPS Satelital:** Visualización en tiempo real de la posición del encuestador y ubicación de las viviendas censadas (capas Esri World Imagery y OpenStreetMap).
- **Dock Flotante Ergonómico:** Indicador de precisión GPS en metros, contador de viviendas censadas en la jornada y acceso rápido a nuevo registro.
- **Formulario Desplegable (Bottom Sheet):**
  - **Inmueble:** Sector, calle, número, punto de referencia, tipo de inmueble (residencial, comercial, industrial), tarifa USD sugerida y fijación de coordenadas GPS automáticas.
  - **Habitante:** Búsqueda automática y validación por Cédula de Identidad, nombres, teléfono WhatsApp, parentesco y número de residentes.
- **Almacenamiento Local y Sincronización:** Diseñado para operar en zonas sin señal de internet (offline-first) y sincronizar los registros con el servidor central al recuperar conectividad.

---

## 🛠️ Requisitos Previos

Para colaborar en este proyecto, asegúrate de tener instalado en tu computadora:

- **Node.js** v18.0 o superior (`node -v`)
- **Git** v2.30 o superior (`git -v`)
- **Flutter SDK** v3.19+ (opcional, solo para compilar/editar la app móvil)
- **Android Studio** o SDK de Android (para pruebas en emulador o compilar APK)

---

## 💻 Puesta en Marcha

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/dinamitagamer28-eng/Aseo-Urbano.git
cd Aseo-Urbano
```

### Paso 2: Ejecutar la Plataforma Web
```bash
# 1. Instalar dependencias
npm install

# 2. Configurar base de datos con Prisma
npx prisma generate
npx prisma db push

# 3. Poblar sectores y datos iniciales (opcional)
node seed-sectores.js

# 4. Iniciar servidor de desarrollo
npm run dev
```
> La plataforma web estará disponible en: **http://localhost:5000** (o http://localhost:3000).

---

### Paso 3: Ejecutar y Desarrollar la App Móvil (Flutter)
```bash
cd app-movil-censo

# 1. Descargar paquetes de Flutter
flutter pub get

# 2. Ejecutar en emulador o teléfono conectado
flutter run

# 3. Compilar APK de producción
flutter build apk --release
```
> El APK resultante se generará en: `build/app/outputs/flutter-apk/app-release.apk`.

---

## 📲 Probar la App Móvil sin Flutter (Simulador y APK Directo)

1. **Simulador Web Interactivo:**
   Dentro de la carpeta `app-movil-censo/preview`, ejecuta:
   ```bash
   node serve.js
   ```
   Y abre en tu navegador: **http://localhost:5050**.

2. **Instalación Directa en Teléfono Android:**
   Puedes tomar directamente el archivo ya compilado en:
   `releases/censo-aseo-alcaldia.apk`
   Enviarlo por WhatsApp a tu teléfono e instalarlo activando "Permitir fuentes desconocidas".

---

## 🤝 Guía de Contribución y Colaboración

¡Las contribuciones son bienvenidas! Para mantener la calidad y orden del proyecto:

1. **Crea una nueva rama** para tu funcionalidad:
   ```bash
   git checkout -b feature/nombre-de-tu-mejora
   ```
2. **Realiza tus cambios y verifica** que tanto la web como la app compilen sin errores.
3. **Haz commit con mensajes claros y descriptivos:**
   ```bash
   git commit -m "feat(mobile): agregar filtro de sectores en el mapa"
   ```
4. **Sube tus cambios y abre un Pull Request:**
   ```bash
   git push origin feature/nombre-de-tu-mejora
   ```

---

## 🔒 Claves y Credenciales de Prueba

Para pruebas de desarrollo local, utiliza las siguientes credenciales autorizadas:

| Rol | Clave de Acceso | Acceso |
|---|---|---|
| **Encuestador Cuadrilla** | `CUADRILLA2026` | App Móvil de Censo |
| **Administrador Municipal** | `ADMIN2026` | App Móvil & Panel Web |

---

## 📄 Licencia

Desarrollado para la **Alcaldía Municipal & Dirección de Aseo Urbano** - Gestión 2026.
