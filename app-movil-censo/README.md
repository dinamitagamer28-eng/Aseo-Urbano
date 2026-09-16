# 📱 Aplicativo Móvil de Censo Territorial y Catastro (APK Flutter)
### Alcaldía del Municipio Rosario de Perijá, Estado Zulia, Venezuela

Aplicación móvil nativa e independiente desarrollada en **Flutter (Dart)** de uso **exclusivo para los funcionarios, fiscalizadores y censistas de la Alcaldía**. Permite el levantamiento catastral en campo geolocalizado en tiempo real con GPS satelital, registro de viviendas y vinculación de ciudadanos contribuyentes.

---

## 🏗️ Arquitectura del Proyecto Flutter

```
Aseo-Censo-Flutter/
├── pubspec.yaml                  # Dependencias oficiales (flutter_map, geolocator, http, latlong2)
├── android/
│   └── app/src/main/
│       └── AndroidManifest.xml   # Permisos de GPS Satelital, Red y Cámara
├── lib/
│   ├── main.dart                 # Punto de entrada de la app con tema oscuro institucional
│   ├── config/
│   │   ├── app_theme.dart        # Paleta de diseño oscuro (Slate 950, Sky Blue, Emerald)
│   │   └── api_config.dart       # Configuración de conexión con el backend de la Alcaldía
│   ├── models/
│   │   └── censo_models.dart     # Modelos de Sector, Calle, Predio, Inmueble y Ciudadano
│   ├── services/
│   │   └── api_service.dart      # Conexión REST JSON con el servidor y persistencia Offline
│   ├── screens/
│   │   ├── login_screen.dart     # Autenticación exclusiva con Clave de Empleado Municipal
│   │   └── censo_map_screen.dart # Pantalla del Mapa GPS satelital con pines y seguimiento
│   └── widgets/
│       ├── censo_bottom_bar.dart # Barra flotante inferior de acciones táctiles de campo
│       └── censo_form_modal.dart # Modal deslizable para captura de Casa y Habitante
```

---

## 🚀 Requisitos para Compilar el APK

1. **Flutter SDK**: v3.16 o superior ([https://flutter.dev](https://flutter.dev))
2. **Android Studio** / **Android SDK** con Command-line Tools y Build-Tools instalados.
3. **Java JDK**: 17 o superior.

---

## 🛠️ Comandos para Compilar y Generar el APK

Abre una terminal en la carpeta del proyecto:

```bash
cd Aseo-Censo-Flutter
```

### 1. Descargar dependencias:
```bash
flutter pub get
```

### 2. Probar en emulador o dispositivo conectado:
```bash
flutter run
```

### 3. Compilar APK Release para producción:
```bash
flutter build apk --release
```

El archivo APK ejecutable se generará en:
```
build/app/outputs/flutter-apk/app-release.apk
```

### 4. Compilar App Bundle para Google Play (opcional):
```bash
flutter build appbundle --release
```

---

## 🛰️ Configuración del Servidor de la Alcaldía

Edita el archivo `lib/config/api_config.dart` según el entorno:

- **En Emulador Android:** Por defecto apunta a `http://10.0.2.2:5000` (el localhost de tu PC).
- **En Teléfono Físico:** Cambia a la IP local de la computadora en la misma red Wi-Fi (ej: `http://192.168.1.50:5000`).
- **En Servidor en Producción:** Cambia a la URL pública con HTTPS (ej: `https://aseo.alcaldiarosario.gob.ve`).

---

## 🔑 Credenciales de Acceso para el Personal

El acceso está restringido estrictamente para personal municipal. En la pantalla de login:

- **Usuario:** Cédula del funcionario (ej: `V-30643300`) o correo institucional.
- **Contraseña:** Mínimo 4 caracteres.
- **Clave de Empleado Municipal:**
  - `ADMIN2026` (Acceso Administrador de Catastro)
  - `CUADRILLA2026` (Acceso Censista de Campo)
