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

  let usuario: any = await prisma.usuario.findFirst({
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
        include: { sector: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Si el usuario no existe (ej. tras limpieza de base de datos pero con sesión activa), auto-crearlo
  if (!usuario) {
    let sectorDefault = await prisma.sector.findFirst({
      where: { nombre: { contains: 'Casco Central' } },
      include: { callesTramos: true },
    }) || await prisma.sector.findFirst({ include: { callesTramos: true } });

    if (sectorDefault) {
      let calleId = sectorDefault.callesTramos.length > 0 ? sectorDefault.callesTramos[0].id : null;
      if (!calleId) {
        const nuevaCalle = await prisma.calleTramo.create({
          data: {
            sectorId: sectorDefault.id,
            nombreCalle: 'Avenida Principal',
            diaRecoleccion: 'LUNES Y JUEVES',
          },
        });
        calleId = nuevaCalle.id;
      }

      usuario = await prisma.usuario.create({
        data: {
          tipoDoc: 'V',
          cedulaRif: `V-${cleanDoc}`,
          nombres: 'Vecino Contribuyente',
          apellidos: '',
          telefonoMovil: '0414-0000000',
          rol: 'CIUDADANO',
          inmueblesRelacionados: {
            create: {
              tipoRelacion: 'PROPIETARIO',
              inmueble: {
                create: {
                  codigoCatastral: `INM-${cleanDoc}`,
                  sectorId: sectorDefault.id,
                  calleId: calleId,
                  numeroCasaLocal: 'Casa Principal',
                  tarifaBaseUsd: 3.00,
                  estadoCuenta: 'SOLVENTE',
                },
              },
            },
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
            include: { sector: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }
  } else if (!usuario.inmueblesRelacionados || usuario.inmueblesRelacionados.length === 0) {
    // Si existe el usuario pero no tiene inmueble asignado
    let sectorDefault = await prisma.sector.findFirst({
      where: { nombre: { contains: 'Casco Central' } },
      include: { callesTramos: true },
    }) || await prisma.sector.findFirst({ include: { callesTramos: true } });

    if (sectorDefault) {
      let calleId = sectorDefault.callesTramos.length > 0 ? sectorDefault.callesTramos[0].id : null;
      if (!calleId) {
        const nuevaCalle = await prisma.calleTramo.create({
          data: {
            sectorId: sectorDefault.id,
            nombreCalle: 'Avenida Principal',
            diaRecoleccion: 'LUNES Y JUEVES',
          },
        });
        calleId = nuevaCalle.id;
      }

      const nuevoInmueble = await prisma.inmuebleCatastro.create({
        data: {
          codigoCatastral: `INM-${cleanDoc}`,
          sectorId: sectorDefault.id,
          calleId: calleId,
          numeroCasaLocal: 'Casa Principal',
          tarifaBaseUsd: 3.00,
          estadoCuenta: 'SOLVENTE',
        },
      });

      await prisma.inmuebleContribuyente.create({
        data: {
          usuarioId: usuario.id,
          inmuebleId: nuevoInmueble.id,
          tipoRelacion: 'PROPIETARIO',
        },
      });

      // Recargar usuario con el nuevo inmueble
      usuario = await prisma.usuario.findUnique({
        where: { id: usuario.id },
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
            include: { sector: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }
  }

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

  try {
    await prisma.reporteTrazabilidad.create({
      data: {
        reporteId: reporte.id,
        estadoNuevo: 'RECIBIDO',
        modificadoPorId: data.usuarioId,
        comentario: 'Incidencia creada por el ciudadano desde la aplicación web.',
      },
    });
  } catch (e) {
    console.warn("Trazabilidad create error:", e);
  }

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
  supervisorId?: string;
  camionId?: string;
  sectorId?: string;
  checkinLat: number;
  checkinLng: number;
}) {
  const hoy = new Date().toISOString().split('T')[0];

  let supervisor = null;
  if (data.supervisorId) {
    supervisor = await prisma.usuario.findUnique({ where: { id: data.supervisorId } });
  }
  if (!supervisor) {
    supervisor = await prisma.usuario.findFirst({ where: { rol: 'SUPERVISOR_CAMPO' } });
  }
  if (!supervisor) {
    supervisor = await prisma.usuario.create({
      data: {
        tipoDoc: 'V',
        cedulaRif: '19888777',
        nombres: 'Supervisor de Campo',
        apellidos: 'Alcaldía de Rosario',
        telefonoMovil: '0414-7778899',
        rol: 'SUPERVISOR_CAMPO',
      }
    });
  }

  let camion = null;
  if (data.camionId) {
    camion = await prisma.camion.findUnique({ where: { id: data.camionId } });
  }
  if (!camion) {
    camion = await prisma.camion.findFirst();
  }
  if (!camion) {
    camion = await prisma.camion.create({
      data: {
        codigoUnidad: 'CAM-01',
        placa: 'A89BC12',
        capacidadToneladas: 6.5,
        estado: 'OPERATIVO',
      }
    });
  }

  let sector = null;
  if (data.sectorId) {
    sector = await prisma.sector.findUnique({ where: { id: data.sectorId } });
  }
  if (!sector) {
    sector = await prisma.sector.findFirst();
  }

  const turno = await prisma.cuadrillaTurno.create({
    data: {
      supervisorId: supervisor.id,
      camionId: camion.id,
      sectorId: sector ? sector.id : '',
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
  let validTurnoId = data.turnoId;
  const turnoExists = await prisma.cuadrillaTurno.findUnique({ where: { id: data.turnoId } });
  if (!turnoExists) {
    const defaultTurno = await prisma.cuadrillaTurno.findFirst({ where: { estadoTurno: 'EN_CURSO' } });
    if (defaultTurno) {
      validTurnoId = defaultTurno.id;
    }
  }

  const avanceExistente = await prisma.cuadrillaTramoAvance.findFirst({
    where: {
      turnoId: validTurnoId,
      tramoId: data.tramoId,
    },
  });

  if (avanceExistente) {
    await prisma.cuadrillaTramoAvance.delete({
      where: { id: avanceExistente.id },
    });
  } else {
    try {
      await prisma.cuadrillaTramoAvance.create({
        data: {
          turnoId: validTurnoId,
          tramoId: data.tramoId,
          completado: true,
          latitudMarca: data.latitud || null,
          longitudMarca: data.longitud || null,
        },
      });
    } catch (e) {
      console.warn("Tramo avance warning:", e);
    }
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
  supervisorId?: string;
  turnoId?: string;
  fotoResolucionUrl: string;
  notasResolucion?: string;
}) {
  if (!data.fotoResolucionUrl || data.fotoResolucionUrl.trim().length === 0) {
    throw new Error('REGLA FISCAL/OPERATIVA: No se puede marcar un reporte como resuelto sin adjuntar la foto de evidencia.');
  }

  let validSupervisorId: string | null = null;
  if (data.supervisorId) {
    try {
      const user = await prisma.usuario.findUnique({ where: { id: data.supervisorId } });
      if (user) validSupervisorId = user.id;
    } catch (e) {}
  }

  let validTurnoId: string | null = null;
  if (data.turnoId) {
    try {
      const t = await prisma.cuadrillaTurno.findUnique({ where: { id: data.turnoId } });
      if (t) validTurnoId = t.id;
    } catch (e) {}
  }

  const reporte = await prisma.reporteIncidencia.update({
    where: { id: data.reporteId },
    data: {
      estado: 'RESUELTO',
      turnoId: validTurnoId,
      fotoResolucionUrl: data.fotoResolucionUrl,
      notasResolucion: data.notasResolucion || 'Atendido y solventado con éxito por la cuadrilla de aseo.',
      fechaResolucion: new Date(),
    },
  });

  try {
    await prisma.reporteTrazabilidad.create({
      data: {
        reporteId: reporte.id,
        estadoAnterior: 'RECIBIDO',
        estadoNuevo: 'RESUELTO',
        modificadoPorId: validSupervisorId,
        comentario: `Resuelto en campo por cuadrilla operativa. Foto de evidencia adjunta: ${data.fotoResolucionUrl}`,
      },
    });
  } catch (e) {
    console.warn("Trazabilidad warning:", e);
  }

  revalidatePath('/ciudadano');
  revalidatePath('/cuadrilla');
  revalidatePath('/admin');

  return {
    success: true,
    reporte,
  };
}

export async function finalizarTurnoCuadrilla(data: {
  turnoId?: string;
  toneladasEstimadas: number;
  novedadesCierre?: string;
}) {
  let turno = null;
  if (data.turnoId) {
    try {
      const exists = await prisma.cuadrillaTurno.findUnique({ where: { id: data.turnoId } });
      if (exists) {
        turno = await prisma.cuadrillaTurno.update({
          where: { id: data.turnoId },
          data: {
            estadoTurno: 'FINALIZADO',
            horaFin: new Date(),
            toneladasEstimadas: data.toneladasEstimadas,
            novedadesCierre: data.novedadesCierre || 'Turno culminado en relleno sanitario.',
          },
        });
      }
    } catch (e) {}
  }

  if (!turno) {
    try {
      let supervisor = await prisma.usuario.findFirst({ where: { rol: 'SUPERVISOR_CAMPO' } });
      if (!supervisor) {
        supervisor = await prisma.usuario.create({
          data: {
            tipoDoc: 'V',
            cedulaRif: '19888777',
            nombres: 'Supervisor de Campo',
            apellidos: 'Alcaldía de Rosario',
            telefonoMovil: '0414-7778899',
            rol: 'SUPERVISOR_CAMPO',
          }
        });
      }
      let camion = await prisma.camion.findFirst();
      if (!camion) {
        camion = await prisma.camion.create({
          data: {
            codigoUnidad: 'CAM-01',
            placa: 'A89BC12',
            capacidadToneladas: 6.5,
            estado: 'OPERATIVO',
          }
        });
      }
      let sector = await prisma.sector.findFirst();

      turno = await prisma.cuadrillaTurno.create({
        data: {
          supervisorId: supervisor.id,
          camionId: camion.id,
          sectorId: sector ? sector.id : '',
          fechaTurno: new Date().toISOString().split('T')[0],
          estadoTurno: 'FINALIZADO',
          horaFin: new Date(),
          toneladasEstimadas: data.toneladasEstimadas,
          novedadesCierre: data.novedadesCierre || 'Turno culminado en relleno sanitario.',
        }
      });
    } catch (e) {
      console.error("Error creating shift:", e);
    }
  }

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

  if (data.facturaId) {
    await prisma.facturaTasa.update({
      where: { id: data.facturaId },
      data: { estado: 'PAGADA' },
    });
  }

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
  const motivoLimpio = motivoRechazo?.trim() || 'Referencia bancaria no encontrada o monto incorrecto.';
  const observaciones = aprobar
    ? 'Pago verificado conforme en conciliación bancaria municipal.'
    : `Rechazado por el Administrador: ${motivoLimpio}`;

  const recibo = await prisma.reciboPago.update({
    where: { id: reciboId },
    data: {
      estado: aprobar ? 'APROBADO' : 'RECHAZADO',
      validadoPorId: auditorId,
      fechaValidacion: new Date(),
      observacionesFiscales: observaciones,
    },
    include: { inmueble: true, usuario: true },
  });

  if (aprobar) {
    if (recibo.facturaId) {
      await prisma.facturaTasa.update({
        where: { id: recibo.facturaId },
        data: { estado: 'PAGADA' },
      });
    }

    await prisma.inmuebleCatastro.update({
      where: { id: recibo.inmuebleId },
      data: { estadoCuenta: 'SOLVENTE' },
    });
  } else {
    // Cuando se rechaza el pago, el inmueble se marca como PENDIENTE
    await prisma.inmuebleCatastro.update({
      where: { id: recibo.inmuebleId },
      data: { estadoCuenta: 'PENDIENTE' },
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

export async function liquidarCobroTaquillaExpress(data: {
  cedulaRif: string;
  nombres?: string;
  sectorId?: string;
  ubicacion?: string;
  montoUsd: number;
  metodoPago: string;
  cajeroId: string;
  referenciaBancaria?: string;
  observaciones?: string;
}) {
  const cleanDoc = data.cedulaRif.trim().toUpperCase();
  const cedulaCompleta = cleanDoc.startsWith('V-') || cleanDoc.startsWith('E-') || cleanDoc.startsWith('J-') || cleanDoc.startsWith('G-')
    ? cleanDoc
    : `V-${cleanDoc}`;

  // 1. Obtener sector y calle válidos
  let sector = null;
  if (data.sectorId) {
    sector = await prisma.sector.findUnique({
      where: { id: data.sectorId },
      include: { callesTramos: true },
    });
  }
  if (!sector) {
    sector = await prisma.sector.findFirst({
      where: { nombre: { contains: 'Casco Central' } },
      include: { callesTramos: true },
    }) || await prisma.sector.findFirst({ include: { callesTramos: true } });
  }

  if (!sector) throw new Error('No hay sectores configurados en el sistema.');

  let calleId = sector.callesTramos.length > 0 ? sector.callesTramos[0].id : null;
  if (!calleId) {
    const nuevaCalle = await prisma.calleTramo.create({
      data: {
        sectorId: sector.id,
        nombreCalle: 'Calle Principal',
        diaRecoleccion: 'LUNES Y JUEVES',
      },
    });
    calleId = nuevaCalle.id;
  }

  // 2. Buscar o crear usuario
  let usuario = await prisma.usuario.findFirst({
    where: { cedulaRif: cedulaCompleta },
    include: { inmueblesRelacionados: { include: { inmueble: true } } },
  });

  if (!usuario) {
    usuario = await prisma.usuario.create({
      data: {
        tipoDoc: cedulaCompleta.substring(0, 1),
        cedulaRif: cedulaCompleta,
        nombres: data.nombres || 'Contribuyente en Taquilla',
        apellidos: '',
        telefonoMovil: '0414-0000000',
        rol: 'CIUDADANO',
        inmueblesRelacionados: {
          create: {
            tipoRelacion: 'PROPIETARIO',
            inmueble: {
              create: {
                codigoCatastral: `TAQ-C-${cedulaCompleta.replace(/[^0-9]/g, '')}`,
                sectorId: sector.id,
                calleId: calleId,
                numeroCasaLocal: data.ubicacion || 'Sede Municipal / Taquilla',
                tarifaBaseUsd: data.montoUsd,
                estadoCuenta: 'SOLVENTE',
              },
            },
          },
        },
      },
      include: { inmueblesRelacionados: { include: { inmueble: true } } },
    });
  }

  let inmuebleId = usuario.inmueblesRelacionados?.[0]?.inmuebleId;
  if (!inmuebleId) {
    const nuevoInmueble = await prisma.inmuebleCatastro.create({
      data: {
        codigoCatastral: `TAQ-C-${cedulaCompleta.replace(/[^0-9]/g, '')}`,
        sectorId: sector.id,
        calleId: calleId,
        numeroCasaLocal: data.ubicacion || 'Sede Municipal / Taquilla',
        tarifaBaseUsd: data.montoUsd,
        estadoCuenta: 'SOLVENTE',
      },
    });
    await prisma.inmuebleContribuyente.create({
      data: {
        usuarioId: usuario.id,
        inmuebleId: nuevoInmueble.id,
        tipoRelacion: 'PROPIETARIO',
      },
    });
    inmuebleId = nuevoInmueble.id;
  }

  const tasaBcv = await getTasaBcvActual();
  const montoTotalBs = calcularMontoBs(data.montoUsd, tasaBcv.valorUsdBs);
  let validCajeroId: string | null = null;
  if (data.cajeroId) {
    try {
      const cajeroExists = await prisma.usuario.findUnique({ where: { id: data.cajeroId } });
      if (cajeroExists) validCajeroId = cajeroExists.id;
    } catch (e) {}
  }
  if (!validCajeroId) {
    try {
      const adminUser = await prisma.usuario.findFirst({ where: { rol: 'ADMIN' } });
      if (adminUser) validCajeroId = adminUser.id;
    } catch (e) {}
  }

  const { folioCorrelativo, numeroReciboFiscal, codigoQrHash } = await generarSiguienteFolioFiscal();

  const recibo = await prisma.reciboPago.create({
    data: {
      folioCorrelativo,
      numeroReciboFiscal,
      inmuebleId: inmuebleId,
      usuarioId: usuario.id,
      montoTotalUsd: data.montoUsd,
      tasaBcvAplicada: tasaBcv.valorUsdBs,
      montoTotalBs,
      metodoPago: data.metodoPago,
      referenciaBancaria: data.referenciaBancaria || 'TAQ-VENTANILLA-01',
      bancoDestino: 'Caja Recaudadora Municipal',
      estado: 'APROBADO',
      origenPago: 'TAQUILLA_MUNICIPAL',
      validadoPorId: validCajeroId,
      fechaValidacion: new Date(),
      codigoQrHash,
      observacionesFiscales: data.observaciones || 'Cobro presencial en ventanilla de la Alcaldía de Rosario de Perijá.',
    },
    include: {
      inmueble: { include: { sector: true, calle: true } },
      usuario: true,
      validadoPor: true,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/ciudadano');

  return {
    success: true,
    recibo,
  };
}

export async function obtenerTodosSectoresConTarifas() {
  const FAMILIAS_MAP: Record<string, number> = {
    'Sector Casco Central': 350,
    'Sector Las Colinas': 1030,
    'Sector Colina I': 1030,
    'Sector Colina II': 516,
    'Sector Matica I': 170,
    'Sector Matica II': 230,
    'Sector Villa Encantada': 120,
    'Sector La Matica': 400,
    'Sector San José': 110,
    'Sector Las Palmeras': 95,
    'Sector El Carmen': 85,
    'Sector Noriega Trigo': 90,
    'Sector Aurora': 75,
    'Sector La Florida': 80,
    'Sector Juan Vicente Gómez': 105,
    'Sector 2 de Febrero': 90,
    'Sector Corito': 115,
    'Sector Los Haticos': 95,
  };

  const sectores = await prisma.sector.findMany({
    orderBy: { nombre: 'asc' },
    include: {
      tarifasSectores: true,
      parroquia: true,
      callesTramos: { orderBy: { ordenRecoleccion: 'asc' } },
      _count: { select: { inmuebles: true, callesTramos: true } },
    },
  });

  return sectores.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    codigo: s.codigo,
    parroquia: s.parroquia?.nombre || 'El Rosario',
    estrato: s.estrato || 'RESIDENCIAL',
    inmueblesCount: s._count.inmuebles,
    callesCount: s._count.callesTramos,
    callesTramos: s.callesTramos || [],
    totalFamilias: FAMILIAS_MAP[s.nombre] || (s.callesTramos?.length ? s.callesTramos.length * 18 : 60),
    tarifaUsd: s.tarifasSectores?.[0]?.montoTarifaUsd || 3.00,
    tarifaId: s.tarifasSectores?.[0]?.id || null,
    descripcion: s.tarifasSectores?.[0]?.descripcionOrdenanza || 'Ordenanza Municipal de Aseo Urbano 2026',
  }));
}

export async function actualizarTarifaDeSector(sectorId: string, nuevoMontoUsd: number, descripcion?: string) {
  const sector = await prisma.sector.findUnique({
    where: { id: sectorId },
    include: { tarifasSectores: true },
  });

  if (!sector) throw new Error('Sector no encontrado');

  if (sector.tarifasSectores && sector.tarifasSectores.length > 0) {
    await prisma.tarifaSector.update({
      where: { id: sector.tarifasSectores[0].id },
      data: {
        montoTarifaUsd: nuevoMontoUsd,
        descripcionOrdenanza: descripcion || 'Actualización de tarifa por Alcaldía',
      },
    });
  } else {
    await prisma.tarifaSector.create({
      data: {
        sectorId: sector.id,
        tipoInmueble: 'RESIDENCIAL',
        montoTarifaUsd: nuevoMontoUsd,
        descripcionOrdenanza: descripcion || 'Ordenanza Municipal de Aseo Urbano 2026',
      },
    });
  }

  revalidatePath('/admin');
  revalidatePath('/ciudadano');

  return { success: true };
}

export async function obtenerRecibosAdmin() {
  return await prisma.reciboPago.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      inmueble: { include: { sector: true, calle: true } },
      usuario: true,
    },
  });
}

export async function obtenerReportesCuadrilla() {
  return await prisma.reporteIncidencia.findMany({
    orderBy: { createdAt: 'desc' },
    include: { sector: true, usuario: true },
  });
}

export async function obtenerSectoresRegistro() {
  return await prisma.sector.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
}

export async function eliminarReporteCuadrilla(reporteId: string) {
  try {
    await prisma.reporteTrazabilidad.deleteMany({
      where: { reporteId },
    });
    await prisma.reporteIncidencia.delete({
      where: { id: reporteId },
    });

    revalidatePath('/cuadrilla');
    revalidatePath('/admin');
    revalidatePath('/ciudadano');

    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar reporte:', error);
    throw new Error('No se pudo eliminar el reporte.');
  }
}

export async function rechazarReporteCuadrilla(data: {
  reporteId: string;
  supervisorId?: string;
  motivoRechazo: string;
}) {
  const motivoLimpio = data.motivoRechazo?.trim() || 'Incidencia no procede o fuera de geocerca del servicio ordinario.';

  let validSupervisorId: string | null = null;
  if (data.supervisorId) {
    try {
      const user = await prisma.usuario.findUnique({ where: { id: data.supervisorId } });
      if (user) validSupervisorId = user.id;
    } catch (e) {}
  }

  const reporte = await prisma.reporteIncidencia.update({
    where: { id: data.reporteId },
    data: {
      estado: 'RECHAZADO',
      notasResolucion: `Rechazado por Cuadrilla: ${motivoLimpio}`,
      fechaResolucion: new Date(),
    },
  });

  try {
    await prisma.reporteTrazabilidad.create({
      data: {
        reporteId: reporte.id,
        estadoAnterior: 'RECIBIDO',
        estadoNuevo: 'RECHAZADO',
        modificadoPorId: validSupervisorId,
        comentario: `Rechazado en campo por cuadrilla operativa. Motivo: ${motivoLimpio}`,
      },
    });
  } catch (e) {
    console.warn('Trazabilidad warning:', e);
  }

  revalidatePath('/ciudadano');
  revalidatePath('/cuadrilla');
  revalidatePath('/admin');

  return {
    success: true,
    reporte,
  };
}

export async function resetearTodosLosReportesCuadrilla() {
  try {
    await prisma.reporteTrazabilidad.deleteMany();
    await prisma.reporteIncidencia.deleteMany();

    revalidatePath('/cuadrilla');
    revalidatePath('/admin');
    revalidatePath('/ciudadano');

    return { success: true };
  } catch (error: any) {
    console.error('Error al resetear reportes:', error);
    throw new Error('No se pudieron resetear los reportes.');
  }
}

export async function obtenerTurnosCuadrilla() {
  try {
    return await prisma.cuadrillaTurno.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        supervisor: true,
        camion: true,
        sector: { include: { parroquia: true } },
        avancesTramos: { include: { tramo: true } },
      },
    });
  } catch (error) {
    console.error('Error al obtener turnos de cuadrilla:', error);
    return [];
  }
}

// -------------------------------------------------------------
// 6. MÓDULO DE CENSO TERRITORIAL Y CATASTRO MUNICIPAL CON GPS
// -------------------------------------------------------------

export async function obtenerDatosCensoInicial() {
  try {
    const sectores = await prisma.sector.findMany({
      where: { activo: true },
      include: {
        parroquia: true,
        callesTramos: { orderBy: { ordenRecoleccion: 'asc' } },
        tarifasSectores: true,
      },
      orderBy: { nombre: 'asc' },
    });

    const inmuebles = await prisma.inmuebleCatastro.findMany({
      include: {
        sector: true,
        calle: true,
        contribuyentes: {
          include: {
            usuario: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const censadosHoy = await prisma.inmuebleCatastro.count({
      where: {
        createdAt: {
          gte: inicioDia,
        },
      },
    });

    return {
      success: true,
      sectores,
      inmuebles,
      totalInmuebles: inmuebles.length,
      censadosHoy,
    };
  } catch (error: any) {
    console.error('Error al obtener datos iniciales del censo:', error);
    return {
      success: false,
      sectores: [],
      inmuebles: [],
      totalInmuebles: 0,
      censadosHoy: 0,
      error: error.message,
    };
  }
}

export async function buscarCiudadanoPorCedula(cedulaRif: string) {
  try {
    const cleanDoc = cedulaRif.trim().toUpperCase().replace(/^[VEJG]-?/, '');
    const cleanDigits = cleanDoc.replace(/[^0-9]/g, '');

    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { cedulaRif: cleanDoc },
          { cedulaRif: `V-${cleanDigits}` },
          { cedulaRif: `E-${cleanDigits}` },
          { cedulaRif: `J-${cleanDigits}` },
          { cedulaRif: `G-${cleanDigits}` },
          ...(cleanDigits.length >= 5 ? [{ cedulaRif: { contains: cleanDigits } }] : []),
        ],
      },
      include: {
        inmueblesRelacionados: {
          include: {
            inmueble: true,
          },
        },
      },
    });

    return {
      encontrado: !!usuario,
      usuario: usuario
        ? {
            id: usuario.id,
            tipoDoc: usuario.tipoDoc,
            cedulaRif: usuario.cedulaRif,
            nombres: usuario.nombres,
            apellidos: usuario.apellidos,
            telefonoMovil: usuario.telefonoMovil,
            email: usuario.email,
          }
        : null,
    };
  } catch (error: any) {
    console.error('Error buscando ciudadano:', error);
    return { encontrado: false, usuario: null };
  }
}

export async function registrarCensoPredio(data: {
  // Datos del Inmueble
  sectorId: string;
  calleId: string;
  numeroCasaLocal: string;
  referenciaUbic?: string;
  tipoInmueble: string;
  tarifaBaseUsd: number;
  latitud?: number | null;
  longitud?: number | null;
  codigoCatastral?: string;
  // Datos del Ciudadano
  tipoDoc: string;
  cedulaNumero: string;
  nombres: string;
  apellidos?: string;
  telefonoMovil: string;
  email?: string;
  tipoRelacion?: string;
  esResponsablePago?: boolean;
}) {
  try {
    const {
      sectorId,
      calleId,
      numeroCasaLocal,
      referenciaUbic,
      tipoInmueble = 'RESIDENCIAL',
      tarifaBaseUsd = 2.0,
      latitud,
      longitud,
      tipoDoc = 'V',
      cedulaNumero,
      nombres,
      apellidos = '',
      telefonoMovil,
      email,
      tipoRelacion = 'PROPIETARIO',
      esResponsablePago = true,
    } = data;

    if (!sectorId || !calleId || !numeroCasaLocal || !cedulaNumero || !nombres) {
      throw new Error('Por favor complete todos los campos obligatorios del censo.');
    }

    const cleanDigits = cedulaNumero.toString().replace(/[^0-9]/g, '');
    const cedulaFormateada = `${tipoDoc.toUpperCase()}-${cleanDigits}`;

    // 1. Buscar o crear el ciudadano / contribuyente
    let usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { cedulaRif: cedulaFormateada },
          { cedulaRif: cleanDigits },
          ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ],
      },
    });

    if (usuario) {
      // Actualizar datos de contacto si fueron provistos
      usuario = await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          telefonoMovil: telefonoMovil || usuario.telefonoMovil,
          email: email ? email.trim().toLowerCase() : usuario.email,
        },
      });
    } else {
      // Crear nuevo usuario ciudadano
      usuario = await prisma.usuario.create({
        data: {
          tipoDoc: tipoDoc.toUpperCase(),
          cedulaRif: cedulaFormateada,
          nombres: nombres.trim(),
          apellidos: (apellidos || '').trim(),
          telefonoMovil: (telefonoMovil || '').trim(),
          email: email ? email.trim().toLowerCase() : null,
          rol: 'CIUDADANO',
        },
      });
    }

    // 2. Generar Código Catastral si no viene definido
    const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
    const countInmueblesSector = await prisma.inmuebleCatastro.count({
      where: { sectorId },
    });

    const codSectorPrefijo = sector?.codigo ? sector.codigo.replace('SEC-', '') : 'GEN';
    const codigoCatastralFinal =
      data.codigoCatastral?.trim() ||
      `CEN-${codSectorPrefijo}-${String(countInmueblesSector + 1).padStart(3, '0')}`;

    // 3. Crear el Inmueble Catastral
    const nuevoInmueble = await prisma.inmuebleCatastro.create({
      data: {
        codigoCatastral: codigoCatastralFinal,
        sectorId,
        calleId,
        numeroCasaLocal: numeroCasaLocal.trim(),
        referenciaUbic: referenciaUbic?.trim() || null,
        tipoInmueble,
        tarifaBaseUsd: Number(tarifaBaseUsd) || 2.0,
        estadoCuenta: 'SOLVENTE',
        latitud: latitud ? Number(latitud) : null,
        longitud: longitud ? Number(longitud) : null,
      },
      include: {
        sector: true,
        calle: true,
      },
    });

    // 4. Vincular el inmueble con el ciudadano mediante InmuebleContribuyente
    await prisma.inmuebleContribuyente.create({
      data: {
        inmuebleId: nuevoInmueble.id,
        usuarioId: usuario.id,
        tipoRelacion: tipoRelacion || 'PROPIETARIO',
        esResponsablePago: esResponsablePago ?? true,
      },
    });

    revalidatePath('/censo');
    revalidatePath('/admin');
    revalidatePath('/ciudadano');

    return {
      success: true,
      inmueble: nuevoInmueble,
      usuario,
      mensaje: `¡Censo registrado exitosamente! Código: ${nuevoInmueble.codigoCatastral}`,
    };
  } catch (error: any) {
    console.error('Error al registrar censo:', error);
    return {
      success: false,
      error: error.message || 'Error al guardar el censo catastral.',
    };
  }
}

// -------------------------------------------------------------
// 7. ACCIONES DE GESTIÓN ADMINISTRATIVA Y CATASTRO MUNICIPAL
// -------------------------------------------------------------

export async function obtenerParroquiasAdmin() {
  try {
    const parroquias = await prisma.parroquia.findMany({
      include: {
        sectores: {
          include: { callesTramos: true },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    return parroquias;
  } catch (error: any) {
    console.error('Error al obtener parroquias:', error);
    return [];
  }
}

export async function getPersonalAlcaldia() {
  try {
    const personal = await prisma.usuario.findMany({
      where: {
        rol: {
          in: ['ADMIN', 'SUPERVISOR_CAMPO', 'CAJERO_TAQUILLA', 'AUDITOR_CONTRALORIA', 'FISCAL_TERRENO', 'OPERARIO', 'CENSO'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return personal;
  } catch (error: any) {
    console.error('Error al obtener personal:', error);
    return [];
  }
}

export async function crearPersonalAlcaldia(data: {
  nombres: string;
  apellidos?: string;
  tipoDoc?: string;
  cedula: string;
  email?: string;
  telefonoMovil?: string;
  rol: string;
  password?: string;
}) {
  try {
    const bcrypt = require('bcrypt');
    const cleanDoc = data.cedula.trim().toUpperCase().replace(/^[VEJG]-?/, '');
    const tipo = data.tipoDoc || 'V';
    const cedulaRif = `${tipo}-${cleanDoc}`;

    const exists = await prisma.usuario.findFirst({
      where: { cedulaRif },
    });
    if (exists) {
      throw new Error(`Ya existe un usuario con la cédula ${cedulaRif}`);
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = data.password ? bcrypt.hashSync(data.password, salt) : bcrypt.hashSync('ADMIN2026', salt);

    const user = await prisma.usuario.create({
      data: {
        tipoDoc: tipo,
        cedulaRif,
        nombres: data.nombres.trim(),
        apellidos: data.apellidos?.trim() || '',
        email: data.email?.trim() || null,
        telefonoMovil: data.telefonoMovil?.trim() || '0414-0000000',
        rol: data.rol || 'SUPERVISOR_CAMPO',
        passwordHash,
        activo: true,
      },
    });

    revalidatePath('/admin');
    return { success: true, user };
  } catch (error: any) {
    console.error('Error al crear personal:', error);
    throw new Error(error.message || 'Error al crear funcionario');
  }
}

export async function actualizarPersonalAlcaldia(id: string, data: any) {
  try {
    const cleanDoc = data.cedula ? data.cedula.trim().toUpperCase().replace(/^[VEJG]-?/, '') : undefined;
    const tipo = data.tipoDoc || 'V';
    const cedulaRif = cleanDoc ? `${tipo}-${cleanDoc}` : undefined;

    const user = await prisma.usuario.update({
      where: { id },
      data: {
        nombres: data.nombres?.trim(),
        apellidos: data.apellidos?.trim() ?? '',
        ...(cedulaRif ? { cedulaRif, tipoDoc: tipo } : {}),
        email: data.email?.trim() || null,
        telefonoMovil: data.telefonoMovil?.trim() || undefined,
        rol: data.rol || undefined,
        activo: data.activo !== undefined ? data.activo : undefined,
      },
    });

    revalidatePath('/admin');
    return { success: true, user };
  } catch (error: any) {
    console.error('Error al actualizar personal:', error);
    throw new Error(error.message || 'Error al actualizar funcionario');
  }
}

export async function cambiarPasswordPersonal(id: string, newPassword: string) {
  try {
    const bcrypt = require('bcrypt');
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    await prisma.usuario.update({
      where: { id },
      data: { passwordHash },
    });

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error al cambiar contraseña:', error);
    throw new Error(error.message || 'Error al cambiar contraseña');
  }
}

export async function toggleEstadoPersonal(id: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { id } });
    if (!user) throw new Error('Funcionario no encontrado');

    const updated = await prisma.usuario.update({
      where: { id },
      data: { activo: !user.activo },
    });

    revalidatePath('/admin');
    return { success: true, activo: updated.activo };
  } catch (error: any) {
    console.error('Error al cambiar estado de personal:', error);
    throw new Error(error.message || 'Error al cambiar estado');
  }
}

export async function obtenerInmueblesCensadosAdmin() {
  try {
    const inmuebles = await prisma.inmuebleCatastro.findMany({
      include: {
        sector: {
          include: { parroquia: true },
        },
        calle: true,
        contribuyentes: {
          include: { usuario: true },
        },
        recibos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return inmuebles.map((inm) => {
      const resp = inm.contribuyentes.find((c) => c.esResponsablePago) || inm.contribuyentes[0];
      const ultimoRecibo = inm.recibos && inm.recibos.length > 0 ? inm.recibos[0] : null;

      return {
        id: inm.id,
        codigoCatastral: inm.codigoCatastral,
        sectorId: inm.sectorId,
        sectorNombre: inm.sector?.nombre || 'Rosario',
        parroquiaNombre: inm.sector?.parroquia?.nombre || 'El Rosario',
        calleId: inm.calleId,
        calleNombre: inm.calle?.nombreCalle || 'Calle Principal',
        numeroCasaLocal: inm.numeroCasaLocal,
        referenciaUbic: inm.referenciaUbic,
        tipoInmueble: inm.tipoInmueble,
        tarifaBaseUsd: inm.tarifaBaseUsd,
        estadoCuenta: inm.estadoCuenta,
        latitud: inm.latitud,
        longitud: inm.longitud,
        contribuyenteNombre: resp?.usuario ? `${resp.usuario.nombres} ${resp.usuario.apellidos || ''}`.trim() : 'Sin asignar',
        contribuyenteCedula: resp?.usuario?.cedulaRif || 'N/A',
        contribuyenteTelefono: resp?.usuario?.telefonoMovil || 'Sin teléfono',
        ultimoReciboFolio: ultimoRecibo?.numeroReciboFiscal || null,
        ultimoReciboFecha: ultimoRecibo ? new Date(ultimoRecibo.createdAt).toLocaleDateString('es-VE') : null,
      };
    });
  } catch (error: any) {
    console.error('Error al obtener inmuebles censados:', error);
    return [];
  }
}

export async function actualizarSolvenciaInmuebleAdmin(data: { inmuebleId: string; nuevoEstado: string } | string, nuevoEstadoArg?: string) {
  try {
    const inmuebleId = typeof data === 'object' ? data.inmuebleId : data;
    const nuevoEstado = typeof data === 'object' ? data.nuevoEstado : (nuevoEstadoArg || 'SOLVENTE');

    const updated = await prisma.inmuebleCatastro.update({
      where: { id: inmuebleId },
      data: { estadoCuenta: nuevoEstado },
    });

    revalidatePath('/admin');
    return { success: true, inmueble: updated };
  } catch (error: any) {
    console.error('Error al actualizar solvencia de inmueble:', error);
    throw new Error(error.message || 'Error al actualizar solvencia');
  }
}

export async function crearSector(data: any) {
  try {
    let codigo = data.codigo?.trim();
    if (!codigo) {
      const count = await prisma.sector.count();
      codigo = `SEC-${(count + 1).toString().padStart(3, '0')}`;
    }

    const sector = await prisma.sector.create({
      data: {
        nombre: data.nombre.trim(),
        codigo,
        parroquiaId: data.parroquiaId,
        estrato: data.estrato || 'POPULAR',
        faseDespliegue: data.faseDespliegue || 'PILOTO_ACTIVO',
        centroLat: Number(data.centroLat) || 10.3167,
        centroLng: Number(data.centroLng) || -72.3167,
        geocercaGeoJson: data.geocercaGeoJson || (data.coordenadasGps ? JSON.stringify({ type: 'Polygon', coordinates: [] }) : null),
        activo: data.activo !== undefined ? data.activo : true,
        tarifasSectores: {
          create: {
            tipoInmueble: 'RESIDENCIAL',
            montoTarifaUsd: Number(data.tarifaBaseUsd) || 3.0,
            descripcionOrdenanza: `Tarifa base sector ${data.nombre}`,
            activo: true,
          },
        },
        ...(data.primeraCalle
          ? {
              callesTramos: {
                create: {
                  nombreCalle: data.primeraCalle.trim(),
                  diaRecoleccion: 'LUNES_JUEVES',
                  ordenRecoleccion: 1,
                  horaEstimada: '07:00 AM',
                },
              },
            }
          : {}),
      },
      include: {
        parroquia: true,
        callesTramos: true,
        tarifasSectores: true,
      },
    });

    revalidatePath('/admin');
    return { success: true, sector };
  } catch (error: any) {
    console.error('Error al crear sector:', error);
    throw new Error(error.message || 'Error al crear sector');
  }
}

export async function actualizarSector(id: string, data: any) {
  try {
    const sector = await prisma.sector.update({
      where: { id },
      data: {
        nombre: data.nombre.trim(),
        ...(data.codigo ? { codigo: data.codigo.trim() } : {}),
        ...(data.parroquiaId ? { parroquiaId: data.parroquiaId } : {}),
        estrato: data.estrato || undefined,
        faseDespliegue: data.faseDespliegue || undefined,
        centroLat: data.centroLat !== undefined ? Number(data.centroLat) : undefined,
        centroLng: data.centroLng !== undefined ? Number(data.centroLng) : undefined,
        geocercaGeoJson: data.geocercaGeoJson || undefined,
        activo: data.activo !== undefined ? data.activo : undefined,
      },
    });

    if (data.tarifaBaseUsd !== undefined) {
      const tarifa = await prisma.tarifaSector.findFirst({
        where: { sectorId: id, tipoInmueble: 'RESIDENCIAL' },
      });
      if (tarifa) {
        await prisma.tarifaSector.update({
          where: { id: tarifa.id },
          data: { montoTarifaUsd: Number(data.tarifaBaseUsd) },
        });
      } else {
        await prisma.tarifaSector.create({
          data: {
            sectorId: id,
            tipoInmueble: 'RESIDENCIAL',
            montoTarifaUsd: Number(data.tarifaBaseUsd),
            descripcionOrdenanza: `Tarifa base sector ${data.nombre}`,
          },
        });
      }
    }

    revalidatePath('/admin');
    return { success: true, sector };
  } catch (error: any) {
    console.error('Error al actualizar sector:', error);
    throw new Error(error.message || 'Error al actualizar sector');
  }
}

export async function toggleEstadoSector(id: string, activo: boolean) {
  try {
    const sector = await prisma.sector.update({
      where: { id },
      data: { activo },
    });
    revalidatePath('/admin');
    return { success: true, sector };
  } catch (error: any) {
    console.error('Error al cambiar estado de sector:', error);
    throw new Error(error.message || 'Error al cambiar estado');
  }
}

export async function eliminarSector(id: string) {
  try {
    const inmueblesCount = await prisma.inmuebleCatastro.count({ where: { sectorId: id } });
    if (inmueblesCount > 0) {
      throw new Error(`No se puede eliminar este sector porque tiene ${inmueblesCount} inmueble(s) asociado(s).`);
    }
    await prisma.tarifaSector.deleteMany({ where: { sectorId: id } });
    await prisma.calleTramo.deleteMany({ where: { sectorId: id } });
    await prisma.sector.delete({ where: { id } });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar sector:', error);
    throw new Error(error.message || 'Error al eliminar sector');
  }
}

export async function crearCalle(data: {
  sectorId: string;
  nombreCalle: string;
  diaRecoleccion?: string;
  horaEstimada?: string;
  ordenRecoleccion?: number;
}) {
  try {
    const calle = await prisma.calleTramo.create({
      data: {
        sectorId: data.sectorId,
        nombreCalle: data.nombreCalle.trim(),
        diaRecoleccion: data.diaRecoleccion || 'LUNES_JUEVES',
        horaEstimada: data.horaEstimada || '07:00 AM',
        ordenRecoleccion: data.ordenRecoleccion || 1,
      },
    });
    revalidatePath('/admin');
    return { success: true, calle };
  } catch (error: any) {
    console.error('Error al crear calle:', error);
    throw new Error(error.message || 'Error al crear calle');
  }
}

export async function actualizarCalle(id: string, data: {
  nombreCalle: string;
  diaRecoleccion?: string;
  horaEstimada?: string;
  ordenRecoleccion?: number;
}) {
  try {
    const calle = await prisma.calleTramo.update({
      where: { id },
      data: {
        nombreCalle: data.nombreCalle.trim(),
        diaRecoleccion: data.diaRecoleccion || undefined,
        horaEstimada: data.horaEstimada || undefined,
        ordenRecoleccion: data.ordenRecoleccion || undefined,
      },
    });
    revalidatePath('/admin');
    return { success: true, calle };
  } catch (error: any) {
    console.error('Error al actualizar calle:', error);
    throw new Error(error.message || 'Error al actualizar calle');
  }
}

export async function eliminarCalle(id: string) {
  try {
    const inmueblesCount = await prisma.inmuebleCatastro.count({ where: { calleId: id } });
    if (inmueblesCount > 0) {
      throw new Error(`No se puede eliminar esta calle porque tiene ${inmueblesCount} inmueble(s) asociado(s).`);
    }
    await prisma.calleTramo.delete({ where: { id } });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar calle:', error);
    throw new Error(error.message || 'Error al eliminar calle');
  }
}
