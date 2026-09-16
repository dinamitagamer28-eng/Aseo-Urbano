# Guía para Colaboradores - Aseo Urbano & Censo Territorial

¡Gracias por unirte al equipo de desarrollo! Esta guía te ayudará a colaborar de forma efectiva.

## 📌 Normas del Proyecto

1. **Separación de Contextos:**
   - La **Web** es de uso público para ciudadanos y administrativo para la alcaldía. Las funciones de levantamiento de censo en calle **no deben exponerse** en la interfaz web pública.
   - La **App Móvil** en `app-movil-censo/` es de uso exclusivo en campo para los operarios de la alcaldía.
2. **Estilo de Código:**
   - En la Web: TypeScript con componentes funcionales de React, Tailwind CSS y buenas prácticas de Next.js (App Router).
   - En Móvil: Dart/Flutter con widgets limpios, tipado estricto y manejo de estados desacoplado.
3. **Base de Datos:**
   - Cualquier cambio en la estructura de datos debe definirse en `prisma/schema.prisma` y sincronizarse con `npx prisma db push`.

## 🌿 Flujo de Trabajo con Git

1. Mantén siempre tu rama `main` actualizada:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Crea una rama descriptiva:
   - Nuevas funciones: `feature/descripcion`
   - Correcciones de errores: `fix/descripcion`
   - Documentación o configuración: `docs/descripcion` o `chore/descripcion`
3. Antes de solicitar revisión:
   - Asegúrate de que `npm run build` compile sin errores.
   - Si trabajaste en Flutter, corre `flutter analyze`.

¡Cualquier duda, contáctate con el equipo municipal a través del repositorio!
