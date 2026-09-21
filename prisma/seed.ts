import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando carga de datos semilla (Rosario de Perijá)...');

  // Limpiar datos previos
  await prisma.reporteTrazabilidad.deleteMany();
  await prisma.reporteIncidencia.deleteMany();
  await prisma.cuadrillaTramoAvance.deleteMany();
  await prisma.cuadrillaTurno.deleteMany();
  await prisma.camion.deleteMany();
  await prisma.reciboPago.deleteMany();
  await prisma.facturaTasa.deleteMany();
  await prisma.periodoFacturacion.deleteMany();
  await prisma.tasaBcv.deleteMany();
  await prisma.inmuebleContribuyente.deleteMany();
  await prisma.inmuebleCatastro.deleteMany();
  await prisma.calleTramo.deleteMany();
  await prisma.tarifaSector.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.parroquia.deleteMany();
  await prisma.usuario.deleteMany();

  // 1. Parroquias
  const parroquiaRosario = await prisma.parroquia.create({
    data: {
      codigo: 'PAR-ROS',
      nombre: 'Parroquia El Rosario',
    },
  });

  const parroquiaSixto = await prisma.parroquia.create({
    data: {
      codigo: 'PAR-SIX',
      nombre: 'Parroquia Sixto Zambrano',
    },
  });

  const parroquiaDonaldo = await prisma.parroquia.create({
    data: {
      codigo: 'PAR-DON',
      nombre: 'Parroquia Donaldo García',
    },
  });

  // 2. Sectores de La Villa del Rosario
  const sectorColinas = await prisma.sector.create({
    data: {
      parroquiaId: parroquiaRosario.id,
      codigo: 'SEC-COLINAS',
      nombre: 'Sector Las Colinas',
      estrato: 'POPULAR',
      faseDespliegue: 'PILOTO_ACTIVO',
      centroLat: 10.3180,
      centroLng: -72.3150,
      geocercaGeoJson: JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [-72.3190, 10.3150],
            [-72.3110, 10.3150],
            [-72.3110, 10.3210],
            [-72.3190, 10.3210],
            [-72.3190, 10.3150],
          ],
        ],
      }),
    },
  });

  const sectorCentro = await prisma.sector.create({
    data: {
      parroquiaId: parroquiaRosario.id,
      codigo: 'SEC-CENTRO',
      nombre: 'Sector Casco Central',
      estrato: 'COMERCIAL',
      faseDespliegue: 'FASE_2',
      centroLat: 10.3200,
      centroLng: -72.3100,
    },
  });

  const sectorNoruega = await prisma.sector.create({
    data: {
      parroquiaId: parroquiaRosario.id,
      codigo: 'SEC-NORUEGA',
      nombre: 'Sector Noruega',
      estrato: 'MEDIO',
      faseDespliegue: 'FASE_2',
      centroLat: 10.3240,
      centroLng: -72.3210,
    },
  });

  const sectorCarmen = await prisma.sector.create({
    data: {
      parroquiaId: parroquiaRosario.id,
      codigo: 'SEC-CARMEN',
      nombre: 'Sector El Carmen',
      estrato: 'POPULAR',
      faseDespliegue: 'FASE_3',
      centroLat: 10.3120,
      centroLng: -72.3190,
    },
  });

  // 3. Tarifas Diferenciadas por Sector y Tipo de Inmueble
  await prisma.tarifaSector.createMany({
    data: [
      {
        sectorId: sectorColinas.id,
        tipoInmueble: 'RESIDENCIAL',
        montoTarifaUsd: 2.00,
        descripcionOrdenanza: 'Tarifa social residencial Sector Las Colinas (Art. 12)',
      },
      {
        sectorId: sectorColinas.id,
        tipoInmueble: 'COMERCIAL_PEQ',
        montoTarifaUsd: 8.00,
        descripcionOrdenanza: 'Pequeño comercio Las Colinas (Bodegas, abastos)',
      },
      {
        sectorId: sectorColinas.id,
        tipoInmueble: 'BALDIO',
        montoTarifaUsd: 1.00,
        descripcionOrdenanza: 'Terreno baldío / desocupado Las Colinas',
      },
      {
        sectorId: sectorCentro.id,
        tipoInmueble: 'RESIDENCIAL',
        montoTarifaUsd: 3.50,
        descripcionOrdenanza: 'Residencial Casco Central',
      },
      {
        sectorId: sectorCentro.id,
        tipoInmueble: 'COMERCIAL_PEQ',
        montoTarifaUsd: 15.00,
        descripcionOrdenanza: 'Comercio menor Casco Central',
      },
      {
        sectorId: sectorCentro.id,
        tipoInmueble: 'COMERCIAL_GDE',
        montoTarifaUsd: 35.00,
        descripcionOrdenanza: 'Comercio mayor / Supermercados Casco Central',
      },
      {
        sectorId: sectorNoruega.id,
        tipoInmueble: 'RESIDENCIAL',
        montoTarifaUsd: 2.50,
        descripcionOrdenanza: 'Residencial Sector Noruega',
      },
    ],
  });

  // 4. Calles y Tramos de Las Colinas
  const calle1 = await prisma.calleTramo.create({
    data: {
      sectorId: sectorColinas.id,
      nombreCalle: 'Calle 1 (Av. Principal a Plaza Las Colinas)',
      ordenRecoleccion: 1,
      diaRecoleccion: 'LUNES_JUEVES',
      horaEstimada: '07:30 AM',
    },
  });

  const calle2 = await prisma.calleTramo.create({
    data: {
      sectorId: sectorColinas.id,
      nombreCalle: 'Calle 2 Los Pinos (Casa 01 a 40)',
      ordenRecoleccion: 2,
      diaRecoleccion: 'LUNES_JUEVES',
      horaEstimada: '08:30 AM',
    },
  });

  const calle3 = await prisma.calleTramo.create({
    data: {
      sectorId: sectorColinas.id,
      nombreCalle: 'Calle 3 El Samán (Sector Cancha)',
      ordenRecoleccion: 3,
      diaRecoleccion: 'LUNES_JUEVES',
      horaEstimada: '09:30 AM',
    },
  });

  const calle4 = await prisma.calleTramo.create({
    data: {
      sectorId: sectorColinas.id,
      nombreCalle: 'Calle 4 Las Flores',
      ordenRecoleccion: 4,
      diaRecoleccion: 'LUNES_JUEVES',
      horaEstimada: '10:30 AM',
    },
  });

  // 5. Usuarios (Ciudadanos, Supervisores, Cajeros, Auditores)
  const ciudadano1 = await prisma.usuario.create({
    data: {
      tipoDoc: 'V',
      cedulaRif: '18456789',
      nombres: 'Carlos Eduardo',
      apellidos: 'Mendoza Gutiérrez',
      telefonoMovil: '0414-6123456',
      telefonoWhatsapp: '0414-6123456',
      email: 'carlos.mendoza@email.com',
      rol: 'CIUDADANO',
    },
  });

  const ciudadano2 = await prisma.usuario.create({
    data: {
      tipoDoc: 'V',
      cedulaRif: '14234567',
      nombres: 'María Auxiliadora',
      apellidos: 'Pérez Morán',
      telefonoMovil: '0424-6789012',
      telefonoWhatsapp: '0424-6789012',
      email: 'maria.perez@email.com',
      rol: 'CIUDADANO',
    },
  });

  const comercio1 = await prisma.usuario.create({
    data: {
      tipoDoc: 'J',
      cedulaRif: '29876543-1',
      nombres: 'Abasto & Víveres',
      apellidos: 'Las Colinas C.A.',
      telefonoMovil: '0412-5554433',
      telefonoWhatsapp: '0412-5554433',
      email: 'abastolascolinas@email.com',
      rol: 'CIUDADANO',
    },
  });

  const supervisor = await prisma.usuario.create({
    data: {
      tipoDoc: 'V',
      cedulaRif: '19888777',
      nombres: 'Roberto Antonio',
      apellidos: 'González Villalobos',
      telefonoMovil: '0414-7778899',
      rol: 'SUPERVISOR_CAMPO',
    },
  });

  const cajero = await prisma.usuario.create({
    data: {
      tipoDoc: 'V',
      cedulaRif: '20111222',
      nombres: 'Elena Beatriz',
      apellidos: 'Rincón Acosta',
      telefonoMovil: '0416-3332211',
      rol: 'CAJERO_TAQUILLA',
    },
  });

  const auditor = await prisma.usuario.create({
    data: {
      tipoDoc: 'V',
      cedulaRif: '15666777',
      nombres: 'Dr. Marcos',
      apellidos: 'Villalobos (Contraloría)',
      telefonoMovil: '0414-9990011',
      rol: 'AUDITOR_CONTRALORIA',
    },
  });

  const adminHash = await bcrypt.hash('ADMIN2026', 10);
  const adminUser = await prisma.usuario.create({
    data: {
      tipoDoc: 'V',
      cedulaRif: 'INT-00000001',
      nombres: 'Administrador Control Fiscal',
      apellidos: 'IMAUR',
      telefonoMovil: '0414-0000000',
      email: 'admin@rosariodeperija.gob.ve',
      passwordHash: adminHash,
      rol: 'ADMIN',
    },
  });

  // 6. Inmuebles Catastrales
  const inmueble1 = await prisma.inmuebleCatastro.create({
    data: {
      codigoCatastral: 'COL-C01-014',
      sectorId: sectorColinas.id,
      calleId: calle1.id,
      numeroCasaLocal: 'Casa #14',
      referenciaUbic: 'Frente a la bodega de Don José',
      tipoInmueble: 'RESIDENCIAL',
      tarifaBaseUsd: 2.00,
      estadoCuenta: 'SOLVENTE',
      latitud: 10.3175,
      longitud: -72.3148,
    },
  });

  const inmueble2 = await prisma.inmuebleCatastro.create({
    data: {
      codigoCatastral: 'COL-C02-028',
      sectorId: sectorColinas.id,
      calleId: calle2.id,
      numeroCasaLocal: 'Casa #28',
      referenciaUbic: 'Diagonal al parque infantil',
      tipoInmueble: 'RESIDENCIAL',
      tarifaBaseUsd: 2.00,
      estadoCuenta: 'PENDIENTE',
      latitud: 10.3185,
      longitud: -72.3155,
    },
  });

  const inmuebleComercio = await prisma.inmuebleCatastro.create({
    data: {
      codigoCatastral: 'COL-C01-002',
      sectorId: sectorColinas.id,
      calleId: calle1.id,
      numeroCasaLocal: 'Local Comercial 02',
      referenciaUbic: 'Esquina de la entrada principal',
      tipoInmueble: 'COMERCIAL_PEQ',
      tarifaBaseUsd: 8.00,
      estadoCuenta: 'SOLVENTE',
      latitud: 10.3168,
      longitud: -72.3140,
    },
  });

  // Vinculaciones Inmueble-Contribuyente
  await prisma.inmuebleContribuyente.create({
    data: {
      inmuebleId: inmueble1.id,
      usuarioId: ciudadano1.id,
      tipoRelacion: 'PROPIETARIO',
    },
  });

  await prisma.inmuebleContribuyente.create({
    data: {
      inmuebleId: inmueble2.id,
      usuarioId: ciudadano2.id,
      tipoRelacion: 'PROPIETARIO',
    },
  });

  await prisma.inmuebleContribuyente.create({
    data: {
      inmuebleId: inmuebleComercio.id,
      usuarioId: comercio1.id,
      tipoRelacion: 'PROPIETARIO',
    },
  });

  // 7. Tasas BCV
  const tasaBcvActual = await prisma.tasaBcv.create({
    data: {
      fecha: '2026-08-26',
      valorUsdBs: 65.40,
      valorEurBs: 71.20,
      fuente: 'BCV_OFICIAL',
      capturadoAutomatico: true,
    },
  });

  // 8. Periodos Fiscales
  const periodoAgosto = await prisma.periodoFacturacion.create({
    data: {
      anio: 2026,
      mes: 8,
      codigoPeriodo: '2026-08',
      fechaVencimiento: '2026-08-31',
      cerrado: false,
    },
  });

  // Facturas de tasa
  const factura1 = await prisma.facturaTasa.create({
    data: {
      inmuebleId: inmueble1.id,
      periodoId: periodoAgosto.id,
      montoUsd: 2.00,
      estado: 'PAGADA',
    },
  });

  const factura2 = await prisma.facturaTasa.create({
    data: {
      inmuebleId: inmueble2.id,
      periodoId: periodoAgosto.id,
      montoUsd: 2.00,
      estado: 'PENDIENTE',
    },
  });

  // 9. Recibos Inmutables de Contraloría
  await prisma.reciboPago.create({
    data: {
      folioCorrelativo: 1,
      numeroReciboFiscal: 'ASEO-2026-000001',
      facturaId: factura1.id,
      inmuebleId: inmueble1.id,
      usuarioId: ciudadano1.id,
      montoTotalUsd: 2.00,
      tasaBcvAplicada: 65.40,
      montoTotalBs: 130.80,
      metodoPago: 'PAGO_MOVIL',
      referenciaBancaria: '984210',
      bancoOrigen: 'Banesco',
      bancoDestino: 'Banco de Venezuela',
      estado: 'APROBADO',
      origenPago: 'PORTAL_CIUDADANO',
      validadoPorId: cajero.id,
      fechaValidacion: new Date(),
      codigoQrHash: 'QR-ASEO-2026-000001-C4D9A',
      observacionesFiscales: 'Tasa mensual de aseo urbano cancelada conforme a ordenanza.',
    },
  });

  // 10. Camiones
  const camion1 = await prisma.camion.create({
    data: {
      codigoUnidad: 'CAM-01',
      placa: 'A89BC12',
      capacidadToneladas: 6.5,
      estado: 'OPERATIVO',
    },
  });

  await prisma.camion.create({
    data: {
      codigoUnidad: 'CAM-02',
      placa: 'A94DE34',
      capacidadToneladas: 8.0,
      estado: 'OPERATIVO',
    },
  });

  // 11. Turno de Cuadrilla de muestra
  const turnoHoy = await prisma.cuadrillaTurno.create({
    data: {
      supervisorId: supervisor.id,
      camionId: camion1.id,
      sectorId: sectorColinas.id,
      fechaTurno: '2026-08-26',
      estadoTurno: 'EN_CURSO',
      checkinLat: 10.3181,
      checkinLng: -72.3151,
      asistenciaEnGeocerca: true,
      toneladasEstimadas: 3.2,
      novedadesCierre: 'Ruta ejecutada con normalidad en Las Colinas.',
    },
  });

  // Avance de tramo
  await prisma.cuadrillaTramoAvance.create({
    data: {
      turnoId: turnoHoy.id,
      tramoId: calle1.id,
      completado: true,
      latitudMarca: 10.3174,
      longitudMarca: -72.3149,
    },
  });

  // 12. Reportes de Incidencias Ciudadanas
  await prisma.reporteIncidencia.create({
    data: {
      folioIncidencia: 'INC-2026-00001',
      usuarioId: ciudadano2.id,
      sectorId: sectorColinas.id,
      inmuebleId: inmueble2.id,
      tipoProblema: 'BASURA_ACUMULADA',
      descripcion: 'Acumulación de bolsas de basura en la esquina de la cancha.',
      latitud: 10.3188,
      longitud: -72.3159,
      fotoReporteUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60',
      estado: 'RECIBIDO',
    },
  });

  await prisma.reporteIncidencia.create({
    data: {
      folioIncidencia: 'INC-2026-00002',
      usuarioId: ciudadano1.id,
      sectorId: sectorColinas.id,
      inmuebleId: inmueble1.id,
      tipoProblema: 'PODA_ESCOMBROS',
      descripcion: 'Restos de poda recolectados en la acera.',
      latitud: 10.3176,
      longitud: -72.3145,
      fotoReporteUrl: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=600&auto=format&fit=crop&q=60',
      estado: 'RESUELTO',
      turnoId: turnoHoy.id,
      fotoResolucionUrl: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=60',
      notasResolucion: 'Cuadrilla retiró poda y dejó el área completamente limpia.',
      fechaResolucion: new Date(),
    },
  });

  console.log('✅ Base de datos poblada exitosamente con datos del Municipio Rosario de Perijá.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
