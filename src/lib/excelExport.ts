import * as XLSX from 'xlsx';

export interface ReciboExportItem {
  numeroReciboFiscal: string;
  folioCorrelativo?: number | string;
  fechaEmision: string;
  cedulaRif: string;
  contribuyente: string;
  email?: string;
  telefono?: string;
  codigoCatastral?: string;
  sector?: string;
  metodoPago: string;
  referenciaBancaria?: string;
  tasaBcvUsd?: number;
  montoTotalBs: number;
  montoTotalUsd: number;
  estado: string;
  observacionesFiscales?: string;
}

export interface ReporteExportItem {
  folio: string;
  fecha: string;
  tipo: string;
  sector: string;
  descripcion?: string;
  usuario: string;
  telefono?: string;
  estado: string;
  cuadrilla?: string;
  motivoRechazo?: string;
}

export interface ResumenGestion {
  totalRecaudadoBs: number;
  totalRecaudadoUsd: number;
  totalRecibosAprobados: number;
  totalRecibosPendientes: number;
  totalRecibosRechazados: number;
  totalReportesResueltos: number;
  totalReportesPendientes: number;
  totalToneladasMes: number;
  tasaBcvActual: number;
}

export function exportToExcelOficial(
  recibos: ReciboExportItem[],
  reportes: ReporteExportItem[],
  resumen?: ResumenGestion,
  nombreArchivo: string = `Reporte_Oficial_Aseo_Rosario_${new Date().toISOString().split('T')[0]}`
) {
  const wb = XLSX.utils.book_new();

  // 1. Hoja de Recaudación y Pagos Fiscales
  const dataRecibos = recibos.map((r) => ({
    'Folio Fiscal': r.numeroReciboFiscal,
    'Nº Correlativo': r.folioCorrelativo || '-',
    'Fecha de Emisión': r.fechaEmision ? new Date(r.fechaEmision).toLocaleDateString('es-VE') : '-',
    'C.I / RIF': r.cedulaRif,
    'Contribuyente': r.contribuyente,
    'Código Catastral': r.codigoCatastral || 'N/A',
    'Sector / Parroquia': r.sector || 'Rosario de Perijá',
    'Método de Pago': r.metodoPago,
    'Ref. Bancaria': r.referenciaBancaria || 'TAQUILLA',
    'Tasa BCV (Bs/$)': r.tasaBcvUsd ? Number(r.tasaBcvUsd).toFixed(2) : '-',
    'Monto Pagado (Bs)': Number(r.montoTotalBs).toFixed(2),
    'Monto Pagado (USD)': Number(r.montoTotalUsd).toFixed(2),
    'Estado Fiscal': r.estado,
    'Observaciones / Motivo': r.observacionesFiscales || '-',
  }));

  const wsRecibos = XLSX.utils.json_to_sheet(dataRecibos);
  XLSX.utils.book_append_sheet(wb, wsRecibos, 'Recaudación y Pagos');

  // 2. Hoja de Reportes e Incidencias Vecinales
  const dataReportes = reportes.map((rep) => ({
    'Folio Reporte': rep.folio,
    'Fecha': rep.fecha ? new Date(rep.fecha).toLocaleDateString('es-VE') : '-',
    'Tipo de Incidencia': rep.tipo.replace(/_/g, ' '),
    'Sector': rep.sector,
    'Detalle / Descripción': rep.descripcion || '-',
    'Ciudadano': rep.usuario,
    'Teléfono': rep.telefono || '-',
    'Estado': rep.estado,
    'Cuadrilla / Operario': rep.cuadrilla || 'Cuadrilla Activa',
    'Motivo Rechazo': rep.motivoRechazo || '-',
  }));

  const wsReportes = XLSX.utils.json_to_sheet(dataReportes);
  XLSX.utils.book_append_sheet(wb, wsReportes, 'Reportes de Incidencias');

  // 3. Hoja de Resumen Ejecutivo y Métricas Municipales
  if (resumen) {
    const dataResumen = [
      { Métrica: 'Total Recaudado en Bolívares (Bs)', Valor: `Bs. ${resumen.totalRecaudadoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` },
      { Métrica: 'Total Recaudado en Dólares ($)', Valor: `$ ${resumen.totalRecaudadoUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD` },
      { Métrica: 'Tasa Oficial BCV de Referencia', Valor: `Bs. ${resumen.tasaBcvActual.toFixed(2)} / USD` },
      { Métrica: 'Recibos Fiscales Aprobados', Valor: resumen.totalRecibosAprobados },
      { Métrica: 'Pagos Pendientes por Conciliar', Valor: resumen.totalRecibosPendientes },
      { Métrica: 'Pagos Rechazados / Observados', Valor: resumen.totalRecibosRechazados },
      { Métrica: 'Reportes de Aseo Resueltos en Campo', Valor: resumen.totalReportesResueltos },
      { Métrica: 'Reportes Pendientes por Cuadrilla', Valor: resumen.totalReportesPendientes },
      { Métrica: 'Toneladas de Basura Recolectadas este Mes', Valor: `${resumen.totalToneladasMes.toFixed(2)} Ton` },
      { Métrica: 'Fecha de Generación del Informe', Valor: new Date().toLocaleString('es-VE') },
      { Métrica: 'Ente Emisor', Valor: 'Alcaldía del Municipio Rosario de Perijá - Dirección de Servicios Públicos y Rentas' },
    ];
    const wsResumen = XLSX.utils.json_to_sheet(dataResumen);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');
  }

  // Descarga del archivo en el navegador
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}
