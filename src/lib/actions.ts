'use server';

import prisma from './prisma';
import { getTasaBcvActual, calcularMontoBs } from './bcv';
import { generarSiguienteFolioFiscal, generarSiguienteFolioIncidencia } from './folio';
import { revalidatePath } from 'next/cache';

// -------------------------------------------------------------
// 1. ACCIONES CIUDADANAS (CONSULTA, PAGO, REPORTES)
// -------------------------------------------------------------

export async function consultarContribuyentePorCedula(cedulaRif: string) {
  const cleanDoc = cedulaRif.trim().toUpperCase().replace(/^[VEJG]-?/, '');

  const usuario = await prisma.usuario.findFirst({
    where: {
      cedulaRif: {
        contains: cleanDoc,
      },
    },
    include: {
      inmueblesRelacionados: {
        include: {
          inmueble: {
            include: {
              sector: {
                include: {
                  parroquia: true,
                  tarifasSectores: true,
                },
              },
              calle: true,
              facturas: {
                where: { estado: 'PENDIENTE' },
                include: { periodo: true },
              },
              recibos: {
                orderBy: { createdAt: 'desc' },
                take: 5,
              },
            },
          },
        },
      },
      reportesCreados: {
        orderBy: { createdAt: 'desc' },
        include: {
          sector: true,
        },
      },
    },
  });

  const tasaBcv = await getTasaBcvActual();

  return {
    usuario,
    tasaBcv,
  };
}

export async function registrarPagoCiudadano(formData: {
  inmuebleId: string;
  usuarioId: string;
  facturaId?: string;
  metodoPago: string;
  referenciaBancaria?: string;
  bancoOrigen?: string;
  capturaComprobanteUrl?: string;
  montoUsd: number;
}) {
  const tasaBcv = await getTasaBcvActual();
  const montoTotalBs = calcularMontoBs(formData.montoUsd, tasaBcv.valorUsdBs);
  const { folioCorrelativo, numeroReciboFiscal, codigoQrHash } = await generarSiguienteFolioFiscal();

  const recibo = await prisma.reciboPago.create({
    data: {
      folioCorrelativo,
      numeroReciboFiscal,
      facturaId: formData.facturaId || null,
      inmuebleId: formData.inmuebleId,
      usuarioId: formData.usuarioId,
      montoTotalUsd: formData.montoUsd,
      tasaBcvAplicada: tasaBcv.valorUsdBs,
      montoTotalBs,
      metodoPago: formData.metodoPago,
      referenciaBancaria: formData.referenciaBancaria || null,
      bancoOrigen: formData.bancoOrigen || null,
      bancoDestino: '0102 - Banco de Venezuela (Alcaldía)',
      capturaComprobanteUrl: formData.capturaComprobanteUrl || null,
      estado: 'PENDIENTE_VALIDACION',
      origenPago: 'PORTAL_CIUDADANO',
      codigoQrHash,
      observacionesFiscales: 'Pago reportado por el ciudadano vía portal web. En espera de conciliación bancaria.',
    },
    include: {
      inmueble: {
        include: { sector: true, calle: true },
      },
      usuario: true,
    },
  });

  revalidatePath('/ciudadano');
  revalidatePath('/admin');

  return {
    success: true,
    recibo,
  };
}

export async function crearReporteCiudadano(data: {
  usuarioId: string;
  sectorId: string;
  inmuebleId?: string;
  tipoProblema: string;
  descripcion?: string;
  latitud: number;
  longitud: number;
  fotoReporteUrl: string;
}) {
  if (!data.fotoReporteUrl) {
    throw new Error('La foto del problema es obligatoria.');
  }

  const folioIncidencia = await generarSiguienteFolioIncidencia();

  const reporte = await prisma.reporteIncidencia.create({
    data: {
      folioIncidencia,
      usuarioId: data.usuarioId,
      sectorId: data.sectorId,
      inmuebleId: data.inmuebleId || null,
      tipoProblema: data.tipoProblema,
      descripcion: data.descripcion || null,
      latitud: data.latitud,
      longitud: data.longitud,
      fotoReporteUrl: data.fotoReporteUrl,
      estado: 'RECIBIDO',
    },
  });

  await prisma.reporteTrazabilidad.create({
    data: {
      reporteId: reporte.id,
      estadoNuevo: 'RECIBIDO',
      modificadoPorId: data.usuarioId,
      comentario: 'Incidencia creada por el ciudadano desde la aplicación web.',
    },
  });

  revalidatePath('/ciudadano');
  revalidatePath('/cuadrilla');
  revalidatePath('/admin');

  return {
    success: true,
    reporte,
  };
}

// -------------------------------------------------------------
// 2. ACCIONES DE CUADRILLA DE CAMPO (CHECK-IN, TRAMOS, RESOLUCIÓN)
// -------------------------------------------------------------

export async function iniciarTurnoCuadrilla(data: {
  supervisorId: string;
  camionId: string;
  sectorId: string;
  checkinLat: number;
  checkinLng: number;
}) {
  const hoy = new Date().toISOString().split('T')[0];

  const turno = await prisma.cuadrillaTurno.create({
    data: {
      supervisorId: data.supervisorId,
      camionId: data.camionId,
      sectorId: data.sectorId,
      fechaTurno: hoy,
      estadoTurno: 'EN_CURSO',
      checkinLat: data.checkinLat,
      checkinLng: data.checkinLng,
      asistenciaEnGeocerca: true,
    },
  });

  revalidatePath('/cuadrilla');
  revalidatePath('/admin');

  return {
    success: true,
    turno,
  };
}

export async function marcarTramoCompletado(data: {
  turnoId: string;
  tramoId: string;
  latitud?: number;
  longitud?: number;
}) {
  const avanceExistente = await prisma.cuadrillaTramoAvance.findFirst({
    where: {
      turnoId: data.turnoId,
      tramoId: data.tramoId,
    },
  });

  if (avanceExistente) {
    await prisma.cuadrillaTramoAvance.delete({
      where: { id: avanceExistente.id },
    });
  } else {
    await prisma.cuadrillaTramoAvance.create({
      data: {
        turnoId: data.turnoId,
        tramoId: data.tramoId,
        completado: true,
        latitudMarca: data.latitud || null,
        longitudMarca: data.longitud || null,
      },
    });
  }

  revalidatePath('/cuadrilla');
  revalidatePath('/admin');

  return { success: true };
}

/**
 * REGLA DE ORO: Validación estricta en Backend de Foto de Evidencia
 */
export async function resolverReporteCuadrilla(data: {
  reporteId: string;
  supervisorId: string;
  turnoId: string;
  fotoResolucionUrl: string;
  notasResolucion?: string;
}) {
  if (!data.fotoResolucionUrl || data.fotoResolucionUrl.trim().length === 0) {
    throw new Error('REGLA FISCAL/OPERATIVA: No se puede marcar un reporte como resuelto sin adjuntar la foto de evidencia.');
  }

  const reporte = await prisma.reporteIncidencia.update({
    where: { id: data.reporteId },
    data: {
      estado: 'RESUELTO',
      turnoId: data.turnoId,
      fotoResolucionUrl: data.fotoResolucionUrl,
      notasResolucion: data.notasResolucion || 'Atendido y limpiado por cuadrilla operativa.',
      fechaResolucion: new Date(),
    },
  });

  await prisma.reporteTrazabilidad.create({
    data: {
      reporteId: reporte.id,
      estadoAnterior: 'RECIBIDO',
      estadoNuevo: 'RESUELTO',
      modificadoPorId: data.supervisorId,
      comentario: `Resuelto en campo por cuadrilla. Evidencia fotográfica adjunta: ${data.fotoResolucionUrl}`,
    },
  });

  revalidatePath('/ciudadano');
  revalidatePath('/cuadrilla');
  revalidatePath('/admin');

  return {
    success: true,
    reporte,
  };
}

export async function finalizarTurnoCuadrilla(data: {
  turnoId: string;
  toneladasEstimadas: number;
  novedadesCierre?: string;
}) {
  const turno = await prisma.cuadrillaTurno.update({
    where: { id: data.turnoId },
    data: {
      estadoTurno: 'FINALIZADO',
      horaFin: new Date(),
      toneladasEstimadas: data.toneladasEstimadas,
      novedadesCierre: data.novedadesCierre || 'Turno culminado sin novedades mayores.',
    },
  });

  revalidatePath('/cuadrilla');
  revalidatePath('/admin');

  return {
    success: true,
    turno,
  };
}

// -------------------------------------------------------------
// 3. ACCIONES ADMINISTRATIVAS & TAQUILLA MUNICIPAL (CONTRALORÍA)
// -------------------------------------------------------------

export async function liquidarPagoEnTaquilla(data: {
  inmuebleId: string;
  usuarioId: string;
  facturaId?: string;
  cajeroId: string;
  montoUsd: number;
  metodoPago: string; // EFECTIVO_BS, EFECTIVO_USD, PUNTO_VENTA, PAGO_MOVIL
  referenciaBancaria?: string;
  observacionesFiscales?: string;
}) {
  const tasaBcv = await getTasaBcvActual();
  const montoTotalBs = calcularMontoBs(data.montoUsd, tasaBcv.valorUsdBs);
  const { folioCorrelativo, numeroReciboFiscal, codigoQrHash } = await generarSiguienteFolioFiscal();

  const recibo = await prisma.reciboPago.create({
    data: {
      folioCorrelativo,
      numeroReciboFiscal,
      facturaId: data.facturaId || null,
      inmuebleId: data.inmuebleId,
      usuarioId: data.usuarioId,
      montoTotalUsd: data.montoUsd,
      tasaBcvAplicada: tasaBcv.valorUsdBs,
      montoTotalBs,
      metodoPago: data.metodoPago,
      referenciaBancaria: data.referenciaBancaria || 'TAQUILLA-DIRECTO',
      bancoDestino: 'Caja Recaudadora Municipal',
      estado: 'APROBADO',
      origenPago: 'TAQUILLA_MUNICIPAL',
      validadoPorId: data.cajeroId,
      fechaValidacion: new Date(),
      codigoQrHash,
      observacionesFiscales: data.observacionesFiscales || 'Cobro presencial en ventanilla de la Alcaldía de Rosario de Perijá.',
    },
    include: {
      inmueble: { include: { sector: true, calle: true } },
      usuario: true,
      validadoPor: true,
    },
  });

  // Si había factura pendiente, marcarla pagada
  if (data.facturaId) {
    await prisma.facturaTasa.update({
      where: { id: data.facturaId },
      data: { estado: 'PAGADA' },
    });
  }

  // Actualizar estado del inmueble a Solvente si no debe más
  const facturasRestantes = await prisma.facturaTasa.count({
    where: {
      inmuebleId: data.inmuebleId,
      estado: 'PENDIENTE',
    },
  });

  if (facturasRestantes === 0) {
    await prisma.inmuebleCatastro.update({
      where: { id: data.inmuebleId },
      data: { estadoCuenta: 'SOLVENTE' },
    });
  }

  revalidatePath('/admin');
  revalidatePath('/ciudadano');

  return {
    success: true,
    recibo,
  };
}

export async function validarPagoDigital(reciboId: string, auditorId: string, aprobar: boolean, motivoRechazo?: string) {
  const recibo = await prisma.reciboPago.update({
    where: { id: reciboId },
    data: {
      estado: aprobar ? 'APROBADO' : 'RECHAZADO',
      validadoPorId: auditorId,
      fechaValidacion: new Date(),
      observacionesFiscales: aprobar
        ? 'Pago verificado conforme en conciliación bancaria municipal.'
        : `Rechazado: ${motivoRechazo || 'Referencia no encontrada o monto incorrecto.'}`,
    },
    include: { inmueble: true },
  });

  if (aprobar && recibo.facturaId) {
    await prisma.facturaTasa.update({
      where: { id: recibo.facturaId },
      data: { estado: 'PAGADA' },
    });

    await prisma.inmuebleCatastro.update({
      where: { id: recibo.inmuebleId },
      data: { estadoCuenta: 'SOLVENTE' },
    });
  }

  revalidatePath('/admin');
  revalidatePath('/ciudadano');

  return { success: true, recibo };
}

export async function actualizarTarifaSector(data: {
  tarifaId: string;
  montoUsd: number;
  descripcion?: string;
}) {
  const tarifa = await prisma.tarifaSector.update({
    where: { id: data.tarifaId },
    data: {
      montoTarifaUsd: data.montoUsd,
      descripcionOrdenanza: data.descripcion || undefined,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/ciudadano');

  return { success: true, tarifa };
}
