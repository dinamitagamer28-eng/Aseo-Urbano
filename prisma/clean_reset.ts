import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🔄 Iniciando reseteo de cuentas, reportes, turnos y pagos...');

  // 1. Eliminar datos transaccionales y cuentas
  await prisma.reporteTrazabilidad.deleteMany();
  await prisma.reporteIncidencia.deleteMany();
  await prisma.cuadrillaTramoAvance.deleteMany();
  await prisma.cuadrillaTurno.deleteMany();
  await prisma.reciboPago.deleteMany();
  await prisma.facturaTasa.deleteMany();
  await prisma.periodoFacturacion.deleteMany();
  await prisma.inmuebleContribuyente.deleteMany();
  await prisma.inmuebleCatastro.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.tasaBcv.deleteMany();

  console.log('🧹 Cuentas, reportes, pagos y turnos eliminados con éxito.');

  // 2. Obtener y registrar la tasa BCV oficial actualizada en tiempo real
  let valorBcv = 832.49;
  const hoy = new Date().toISOString().split('T')[0];

  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    const data = await res.json();
    if (data && data.promedio) {
      valorBcv = data.promedio;
      console.log(`📡 Tasa oficial BCV obtenida en tiempo real: Bs. ${valorBcv}`);
    }
  } catch (err) {
    console.warn('⚠️ No se pudo consultar la API en vivo, usando tasa estándar:', valorBcv);
  }

  await prisma.tasaBcv.create({
    data: {
      fecha: hoy,
      valorUsdBs: valorBcv,
      valorEurBs: valorBcv * 1.08,
      fuente: 'BCV_OFICIAL',
      capturadoAutomatico: true,
    },
  });

  // 3. Asegurar que existan los camiones operativos
  const countCamiones = await prisma.camion.count();
  if (countCamiones === 0) {
    await prisma.camion.createMany({
      data: [
        { codigoUnidad: 'CAM-01', placa: 'A89BC12', capacidadToneladas: 6.5, estado: 'OPERATIVO' },
        { codigoUnidad: 'CAM-02', placa: 'A94DE34', capacidadToneladas: 8.0, estado: 'OPERATIVO' },
      ],
    });
  }

  // 4. Verificar sectores y calles
  const countSectores = await prisma.sector.count();
  const countCalles = await prisma.calleTramo.count();

  console.log(`✅ Base de datos reseteada exitosamente.`);
  console.log(`📊 Sectores preservados: ${countSectores}`);
  console.log(`🛣️ Calles/Tramos preservados: ${countCalles}`);
  console.log(`💵 Tasa BCV registrada: Bs. ${valorBcv.toFixed(2)}`);
  console.log(`👤 Usuarios registrados: 0 (Cada usuario debe crear su cuenta previamente)`);
}

resetDatabase()
  .catch((e) => {
    console.error('Error al resetear la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
