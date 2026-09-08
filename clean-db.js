const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  console.log('🧹 Limpiando reportes de prueba, trazabilidades, recibos, facturas y usuarios...');

  // 1. Borrar trazabilidades de reportes
  await prisma.reporteTrazabilidad.deleteMany({});

  // 2. Borrar reportes de incidencias
  await prisma.reporteIncidencia.deleteMany({});

  // 3. Borrar avances de tramos y turnos de cuadrilla
  await prisma.cuadrillaTramoAvance.deleteMany({});
  await prisma.cuadrillaTurno.deleteMany({});

  // 4. Borrar recibos de pago
  await prisma.reciboPago.deleteMany({});

  // 5. Borrar facturas
  await prisma.facturaTasa.deleteMany({});

  // 6. Borrar vinculaciones inmueble-contribuyente
  await prisma.inmuebleContribuyente.deleteMany({});

  // 7. Borrar inmuebles creados por usuarios registrados (cuyo codigoCatastral empiece por REG-)
  await prisma.inmuebleCatastro.deleteMany({
    where: {
      codigoCatastral: { startsWith: 'REG-' }
    }
  });

  // 8. Borrar todos los usuarios registrados
  await prisma.usuario.deleteMany({});

  console.log('✅ Base de datos limpiada con éxito. Sectores y calles preservados.');
}

clean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
