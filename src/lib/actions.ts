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
  const sectores = await prisma.sector.findMany({
    orderBy: { nombre: 'asc' },
    include: {
      tarifasSectores: true,
      parroquia: true,
      _count: { select: { inmuebles: true } },
    },
  });

  return sectores.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    codigo: s.codigo,
    parroquia: s.parroquia?.nombre || 'El Rosario',
    estrato: s.estrato || 'RESIDENCIAL',
    inmueblesCount: s._count.inmuebles,
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

export async function registrarCensoInmuebleCiudadano(data: {
  usuarioId: string;
  inmuebleId?: string;
  sectorId: string;
  calleId?: string;
  nombreCalle?: string;
  numeroCasaLocal: string;
  puntoReferencia?: string;
  tipoInmueble?: string;
  latitud: number;
  longitud: number;
  tarifaBaseUsd?: number;
}) {
  try {
    // 1. Validar sector
    const sector = await prisma.sector.findUnique({
      where: { id: data.sectorId },
      include: { callesTramos: true, tarifasSectores: true },
    });
    if (!sector) throw new Error('Sector no encontrado en los 83 sectores oficiales.');

    // 2. Resolver calle
    let calleId = data.calleId;
    if (!calleId) {
      if (data.nombreCalle && data.nombreCalle.trim()) {
        const calleCreada = await prisma.calleTramo.create({
          data: {
            sectorId: sector.id,
            nombreCalle: data.nombreCalle.trim(),
            diaRecoleccion: 'LUNES Y JUEVES',
          },
        });
        calleId = calleCreada.id;
      } else if (sector.callesTramos.length > 0) {
        calleId = sector.callesTramos[0].id;
      } else {
        const calleNueva = await prisma.calleTramo.create({
          data: {
            sectorId: sector.id,
            nombreCalle: 'Calle Principal',
            diaRecoleccion: 'LUNES Y JUEVES',
          },
        });
        calleId = calleNueva.id;
      }
    }

    const tarifaUsd = data.tarifaBaseUsd || sector.tarifasSectores?.[0]?.montoTarifaUsd || 3.00;
    const tipo = data.tipoInmueble || 'RESIDENCIAL';

    let inmueble;
    if (data.inmuebleId) {
      inmueble = await prisma.inmuebleCatastro.update({
        where: { id: data.inmuebleId },
        data: {
          sectorId: sector.id,
          calleId,
          numeroCasaLocal: data.numeroCasaLocal,
          referenciaUbic: data.puntoReferencia || null,
          tipoInmueble: tipo,
          tarifaBaseUsd: tarifaUsd,
          latitud: data.latitud,
          longitud: data.longitud,
        },
        include: { sector: true, calle: true },
      });
    } else {
      // Generar código catastral municipal
      const totalInmuebles = await prisma.inmuebleCatastro.count();
      const codCat = `${sector.codigo || 'SEC'}-C${String(totalInmuebles + 1).padStart(3, '0')}`;

      inmueble = await prisma.inmuebleCatastro.create({
        data: {
          codigoCatastral: codCat,
          sectorId: sector.id,
          calleId,
          numeroCasaLocal: data.numeroCasaLocal,
          referenciaUbic: data.puntoReferencia || null,
          tipoInmueble: tipo,
          tarifaBaseUsd: tarifaUsd,
          estadoCuenta: 'SOLVENTE',
          latitud: data.latitud,
          longitud: data.longitud,
        },
        include: { sector: true, calle: true },
      });

      // Vincular al contribuyente
      const existingLink = await prisma.inmuebleContribuyente.findFirst({
        where: { usuarioId: data.usuarioId, inmuebleId: inmueble.id },
      });
      if (!existingLink) {
        await prisma.inmuebleContribuyente.create({
          data: {
            usuarioId: data.usuarioId,
            inmuebleId: inmueble.id,
            tipoRelacion: 'PROPIETARIO',
          },
        });
      }
    }

    revalidatePath('/ciudadano');
    revalidatePath('/admin');

    return {
      success: true,
      inmueble,
    };
  } catch (error: any) {
    console.error('Error al registrar censo de inmueble:', error);
    throw new Error(error.message || 'Error al guardar el censo de vivienda.');
  }
}

export async function obtenerInmueblesCensadosAdmin() {
  try {
    const inmuebles = await prisma.inmuebleCatastro.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        sector: {
          include: {
            parroquia: true,
            tarifasSectores: true,
          },
        },
        calle: true,
        contribuyentes: {
          include: {
            usuario: true,
          },
        },
        recibos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        facturas: {
          where: { estado: 'PENDIENTE' },
        },
      },
    });

    return inmuebles.map((inm) => {
      const prop = inm.contribuyentes?.[0]?.usuario;
      const ultimoRecibo = inm.recibos?.[0];
      return {
        id: inm.id,
        codigoCatastral: inm.codigoCatastral,
        numeroCasaLocal: inm.numeroCasaLocal,
        referenciaUbic: inm.referenciaUbic,
        tipoInmueble: inm.tipoInmueble,
        tarifaBaseUsd: inm.tarifaBaseUsd,
        estadoCuenta: inm.estadoCuenta || 'SOLVENTE',
        latitud: inm.latitud,
        longitud: inm.longitud,
        createdAt: inm.createdAt,
        sectorId: inm.sectorId,
        sectorNombre: inm.sector?.nombre || 'Rosario de Perijá',
        sectorCodigo: inm.sector?.codigo || 'SEC',
        sectorEstrato: inm.sector?.estrato || 'POPULAR',
        parroquiaNombre: inm.sector?.parroquia?.nombre || 'El Rosario',
        calleNombre: inm.calle?.nombreCalle || 'Calle Principal',
        contribuyenteId: prop?.id || null,
        contribuyenteNombre: prop ? `${prop.nombres} ${prop.apellidos || ''}`.trim() : 'Sin Asignar',
        contribuyenteCedula: prop?.cedulaRif || 'N/A',
        contribuyenteTelefono: prop?.telefonoMovil || 'N/A',
        ultimoReciboFolio: ultimoRecibo?.numeroReciboFiscal || null,
        ultimoReciboFecha: ultimoRecibo ? new Date(ultimoRecibo.createdAt).toLocaleDateString('es-VE') : null,
        ultimoReciboMontoUsd: ultimoRecibo?.montoTotalUsd || null,
        deudaPendienteUsd: (inm.facturas || []).reduce((acc, f) => acc + (f.montoUsd || 0), 0),
      };
    });
  } catch (error: any) {
    console.error('Error al obtener inmuebles censados:', error);
    return [];
  }
}

export async function actualizarSolvenciaInmuebleAdmin(data: {
  inmuebleId: string;
  nuevoEstado: string;
  observaciones?: string;
}) {
  try {
    const inmueble = await prisma.inmuebleCatastro.update({
      where: { id: data.inmuebleId },
      data: {
        estadoCuenta: data.nuevoEstado,
      },
      include: { sector: true, calle: true },
    });

    revalidatePath('/admin');
    revalidatePath('/ciudadano');

    return {
      success: true,
      inmueble,
    };
  } catch (error: any) {
    console.error('Error al actualizar solvencia de inmueble:', error);
    throw new Error(error.message || 'Error al actualizar solvencia.');
  }
}

// -------------------------------------------------------------
// 4. MÓDULO DE EMPADRONAMIENTO Y CENSO DE CAMPO (/censo)
// -------------------------------------------------------------

export async function verificarClaveUniversal(clave: string) {
  if (!clave || !clave.trim()) {
    return { success: false, message: 'Ingresa una clave de acceso válida.' };
  }

  const clean = clave.trim().replace(/\.+$/, '').toUpperCase();

  // 1. SuperAdmin: Acceso Total a los 4 apartados
  if (clean === 'ROSARIO2026') {
    return {
      success: true,
      rol: 'SUPERADMIN',
      subRol: 'SUPERADMIN',
      nombre: 'Alcaldía Rosario de Perijá (SuperAdmin)',
      redirectUrl: '/admin',
      puedeCambiar: true,
      appPermitida: 'TODAS',
      claveMaestra: 'ROSARIO2026',
    };
  }

  // 2. Administrador Fiscal: Solo Admin y Censo
  if (clean === 'ADMIN2026') {
    return {
      success: true,
      rol: 'ADMIN',
      subRol: 'ADMIN',
      nombre: 'Administrador Fiscal',
      redirectUrl: '/admin',
      puedeCambiar: false,
      appPermitida: 'ADMIN',
      claveMaestra: 'ADMIN2026',
    };
  }

  // 3. Cuadrilla: Solo Cuadrilla (sin opción a cambio)
  if (clean === 'CUADRILLA2026' || clean === 'CAMPO2026') {
    return {
      success: true,
      rol: 'SUPERVISOR_CAMPO',
      subRol: 'CUADRILLA',
      nombre: 'Supervisor de Cuadrilla',
      redirectUrl: '/cuadrilla',
      puedeCambiar: false,
      appPermitida: 'CUADRILLA',
      claveMaestra: 'CUADRILLA2026',
    };
  }

  // 4. Censo: Solo Censo (sin opción a cambio a admin)
  if (clean === 'CENSO2026' || clean === 'EMPADRONADOR2026') {
    return {
      success: true,
      rol: 'CENSO',
      subRol: 'CENSO',
      nombre: 'Empadronador de Censo',
      redirectUrl: '/censo',
      puedeCambiar: false,
      appPermitida: 'CENSO',
      claveMaestra: 'CENSO2026',
    };
  }

  // 5. Verificar contraseña en la base de datos de usuarios
  try {
    const bcrypt = await import('bcrypt');
    const usuarios = await prisma.usuario.findMany({
      where: { passwordHash: { not: null } },
    });

    for (const u of usuarios) {
      if (u.passwordHash) {
        const match = await bcrypt.compare(clave.trim(), u.passwordHash);
        if (match) {
          const dest = u.rol === 'ADMIN' ? '/admin' : u.rol === 'SUPERVISOR_CAMPO' ? '/cuadrilla' : u.rol === 'CENSO' ? '/censo' : '/ciudadano';
          return {
            success: true,
            rol: u.rol,
            subRol: u.rol,
            nombre: `${u.nombres} ${u.apellidos || ''}`.trim(),
            redirectUrl: dest,
            puedeCambiar: u.rol === 'ADMIN',
            appPermitida: u.rol,
          };
        }
      }
    }
  } catch (e) {
    console.warn('Error verificando hash universal:', e);
  }

  return { success: false, message: 'Clave de acceso incorrecta. Verifica e intenta de nuevo.' };
}

export async function verificarClaveAdminCenso(clave: string) {
  if (!clave || !clave.trim()) {
    return { success: false, message: 'Ingresa la clave de acceso.' };
  }

  const clean = clave.trim().replace(/\.+$/, '').toUpperCase();

  // Si intentó meter la clave de Cuadrilla en Censo:
  if (clean === 'CUADRILLA2026') {
    return {
      success: false,
      message: 'La clave CUADRILLA2026 es exclusiva de la App de Cuadrilla. Serás redirigido.',
      redirectUrl: '/cuadrilla',
    };
  }

  if (clean === 'ROSARIO2026') {
    return { success: true, rol: 'SUPERADMIN', puedeCambiar: true, claveMaestra: 'ROSARIO2026' };
  }

  if (clean === 'ADMIN2026') {
    return { success: true, rol: 'ADMIN', puedeCambiar: false, claveMaestra: 'ADMIN2026' };
  }

  if (clean === 'CENSO2026' || clean === 'CAMPO2026') {
    return { success: true, rol: 'CENSO', puedeCambiar: false, claveMaestra: 'CENSO2026' };
  }

  // Verificar si coincide con la contraseña de algún usuario administrador
  try {
    const bcrypt = await import('bcrypt');
    const adminUsers = await prisma.usuario.findMany({
      where: {
        OR: [{ rol: 'ADMIN' }, { rol: 'CENSO' }],
        passwordHash: { not: null },
      },
    });

    for (const admin of adminUsers) {
      if (admin.passwordHash) {
        const match = await bcrypt.compare(clave.trim(), admin.passwordHash);
        if (match) {
          return { success: true, rol: admin.rol, nombre: admin.nombres };
        }
      }
    }
  } catch (e) {
    console.warn('Error verificando hash de admin:', e);
  }

  return { success: false, message: 'Clave de Acceso al Censo incorrecta.' };
}

export async function obtenerPadronCompletoCenso(sectorIdFiltro?: string) {
  try {
    const whereInmueble: any = {};
    if (sectorIdFiltro && sectorIdFiltro !== 'TODOS') {
      whereInmueble.sectorId = sectorIdFiltro;
    }

    const [inmuebles, sectores] = await Promise.all([
      prisma.inmuebleCatastro.findMany({
        where: whereInmueble,
        orderBy: [{ sector: { nombre: 'asc' } }, { createdAt: 'desc' }],
        include: {
          sector: {
            include: {
              parroquia: true,
              tarifasSectores: true,
            },
          },
          calle: true,
          contribuyentes: {
            include: {
              usuario: true,
            },
          },
          recibos: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.sector.findMany({
        orderBy: { nombre: 'asc' },
        include: {
          parroquia: true,
          callesTramos: true,
          _count: { select: { inmuebles: true } },
        },
      }),
    ]);

    const mappedInmuebles = inmuebles.map((inm) => {
      const prop = inm.contribuyentes?.[0]?.usuario;
      const tieneGps = Boolean(inm.latitud && inm.longitud);
      const ultimoRecibo = inm.recibos?.[0];

      return {
        id: inm.id,
        codigoCatastral: inm.codigoCatastral,
        numeroCasaLocal: inm.numeroCasaLocal,
        referenciaUbic: inm.referenciaUbic,
        tipoInmueble: inm.tipoInmueble || 'RESIDENCIAL',
        tarifaBaseUsd: inm.tarifaBaseUsd || 3.0,
        estadoCuenta: inm.estadoCuenta || 'SOLVENTE',
        latitud: inm.latitud,
        longitud: inm.longitud,
        censado: tieneGps,
        estadoCenso: tieneGps ? 'CENSADO' : 'FALTANTE',
        createdAt: inm.createdAt,
        sectorId: inm.sectorId,
        sectorNombre: inm.sector?.nombre || 'Rosario de Perijá',
        sectorCodigo: inm.sector?.codigo || 'SEC',
        sectorEstrato: inm.sector?.estrato || 'POPULAR',
        parroquiaNombre: inm.sector?.parroquia?.nombre || 'El Rosario',
        calleId: inm.calleId,
        calleNombre: inm.calle?.nombreCalle || 'Calle Principal',
        contribuyenteId: prop?.id || null,
        contribuyenteNombre: prop ? `${prop.nombres} ${prop.apellidos || ''}`.trim() : 'Propietario por Asignar',
        contribuyenteCedula: prop?.cedulaRif || 'S/C',
        contribuyenteTelefono: prop?.telefonoMovil || 'S/T',
        contribuyenteEmail: prop?.email || '',
        ultimoReciboFolio: ultimoRecibo?.numeroReciboFiscal || null,
        ultimoReciboFecha: ultimoRecibo ? new Date(ultimoRecibo.createdAt).toLocaleDateString('es-VE') : null,
      };
    });

    const totalInmuebles = mappedInmuebles.length;
    const totalCensados = mappedInmuebles.filter((i) => i.censado).length;
    const totalFaltantes = totalInmuebles - totalCensados;
    const porcentajeAvance = totalInmuebles > 0 ? Math.round((totalCensados / totalInmuebles) * 100) : 0;

    return {
      success: true,
      inmuebles: mappedInmuebles,
      sectores,
      metricas: {
        totalInmuebles,
        totalCensados,
        totalFaltantes,
        porcentajeAvance,
      },
    };
  } catch (error: any) {
    console.error('Error al obtener padrón de censo:', error);
    return {
      success: false,
      inmuebles: [],
      sectores: [],
      metricas: { totalInmuebles: 0, totalCensados: 0, totalFaltantes: 0, porcentajeAvance: 0 },
    };
  }
}

export async function guardarCensoCampo(data: {
  inmuebleId: string;
  latitud: number;
  longitud: number;
  numeroCasaLocal?: string;
  referenciaUbic?: string;
  tipoInmueble?: string;
  calleId?: string;
}) {
  try {
    const updateData: any = {
      latitud: data.latitud,
      longitud: data.longitud,
    };

    if (data.numeroCasaLocal && data.numeroCasaLocal.trim()) {
      updateData.numeroCasaLocal = data.numeroCasaLocal.trim();
    }
    if (data.referenciaUbic !== undefined) {
      updateData.referenciaUbic = data.referenciaUbic.trim() || null;
    }
    if (data.tipoInmueble) {
      updateData.tipoInmueble = data.tipoInmueble;
    }
    if (data.calleId) {
      updateData.calleId = data.calleId;
    }

    const inmueble = await prisma.inmuebleCatastro.update({
      where: { id: data.inmuebleId },
      data: updateData,
      include: { sector: true, calle: true, contribuyentes: { include: { usuario: true } } },
    });

    revalidatePath('/censo');
    revalidatePath('/admin');
    revalidatePath('/ciudadano');

    return {
      success: true,
      inmueble,
    };
  } catch (error: any) {
    console.error('Error al guardar censo de campo:', error);
    throw new Error(error.message || 'Error al actualizar censo.');
  }
}

export async function crearNuevoInmuebleCensoCampo(data: {
  cedulaRif: string;
  nombres: string;
  apellidos?: string;
  telefonoMovil?: string;
  sectorId: string;
  calleNombre?: string;
  calleId?: string;
  numeroCasaLocal: string;
  referenciaUbic?: string;
  tipoInmueble?: string;
  latitud: number;
  longitud: number;
  tarifaBaseUsd?: number;
}) {
  try {
    const cleanDoc = data.cedulaRif.trim().toUpperCase();
    const cedulaCompleta = cleanDoc.startsWith('V-') || cleanDoc.startsWith('E-') || cleanDoc.startsWith('J-') || cleanDoc.startsWith('G-')
      ? cleanDoc
      : `V-${cleanDoc}`;

    // 1. Sector
    const sector = await prisma.sector.findUnique({
      where: { id: data.sectorId },
      include: { callesTramos: true, tarifasSectores: true },
    });
    if (!sector) throw new Error('Sector no encontrado.');

    // 2. Calle
    let calleId = data.calleId;
    if (!calleId) {
      if (data.calleNombre && data.calleNombre.trim()) {
        const calleCreada = await prisma.calleTramo.create({
          data: {
            sectorId: sector.id,
            nombreCalle: data.calleNombre.trim(),
            diaRecoleccion: 'LUNES Y JUEVES',
          },
        });
        calleId = calleCreada.id;
      } else if (sector.callesTramos.length > 0) {
        calleId = sector.callesTramos[0].id;
      } else {
        const calleNueva = await prisma.calleTramo.create({
          data: {
            sectorId: sector.id,
            nombreCalle: 'Calle Principal',
            diaRecoleccion: 'LUNES Y JUEVES',
          },
        });
        calleId = calleNueva.id;
      }
    }

    // 3. Usuario / Contribuyente
    let usuario = await prisma.usuario.findFirst({
      where: { cedulaRif: cedulaCompleta },
    });

    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          tipoDoc: cedulaCompleta.substring(0, 1),
          cedulaRif: cedulaCompleta,
          nombres: data.nombres.trim(),
          apellidos: (data.apellidos || '').trim(),
          telefonoMovil: (data.telefonoMovil || '0414-0000000').trim(),
          rol: 'CIUDADANO',
        },
      });
    }

    // 4. Generar código catastral municipal
    const totalInmuebles = await prisma.inmuebleCatastro.count();
    const codCat = `${sector.codigo || 'SEC'}-C${String(totalInmuebles + 1).padStart(3, '0')}`;
    const tarifaUsd = data.tarifaBaseUsd || sector.tarifasSectores?.[0]?.montoTarifaUsd || 3.0;

    const inmueble = await prisma.inmuebleCatastro.create({
      data: {
        codigoCatastral: codCat,
        sectorId: sector.id,
        calleId: calleId as string,
        numeroCasaLocal: data.numeroCasaLocal.trim(),
        referenciaUbic: (data.referenciaUbic || '').trim() || null,
        tipoInmueble: data.tipoInmueble || 'RESIDENCIAL',
        tarifaBaseUsd: tarifaUsd,
        estadoCuenta: 'SOLVENTE',
        latitud: data.latitud,
        longitud: data.longitud,
      },
      include: { sector: true, calle: true },
    });

    // Vincular al usuario
    await prisma.inmuebleContribuyente.create({
      data: {
        usuarioId: usuario.id,
        inmuebleId: inmueble.id,
        tipoRelacion: 'PROPIETARIO',
        esResponsablePago: true,
      },
    });

    revalidatePath('/censo');
    revalidatePath('/admin');
    revalidatePath('/ciudadano');

    return {
      success: true,
      inmueble,
      usuario,
    };
  } catch (error: any) {
    console.error('Error al crear nuevo inmueble en censo:', error);
    throw new Error(error.message || 'Error al registrar nueva vivienda en campo.');
  }
}






