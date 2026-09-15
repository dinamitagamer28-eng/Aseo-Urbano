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

export interface SectorTarifaExportItem {
  codigo: string;
  nombre: string;
  estrato: string;
  tarifaUsd: number;
  tarifaBs: number;
  parroquia: string;
  fase: string;
}

export interface TurnoExportItem {
  id?: string;
  fecha: string;
  camion: string;
  supervisor: string;
  sector: string;
  estado: string;
  toneladas: number;
  novedades?: string;
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

function s2ab(s: string): ArrayBuffer {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xff;
  }
  return buf;
}

export function exportToExcelOficial(
  recibos: ReciboExportItem[],
  reportes: ReporteExportItem[],
  sectores?: SectorTarifaExportItem[],
  resumen?: ResumenGestion,
  turnos?: TurnoExportItem[],
  nombreArchivo?: string
) {
  const fechaHoy = new Date().toISOString().split('T')[0];
  const filename = nombreArchivo || `Libro_Fiscal_Aseo_Rosario_${fechaHoy}`;

  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // 1. HOJA DE RECAUDACIÓN Y CONCILIACIÓN FISCAL
  // -------------------------------------------------------------
  const dataRecibos = (recibos && recibos.length > 0 ? recibos : [
    {
      numeroReciboFiscal: 'ASEO-2026-000001',
      folioCorrelativo: 1,
      fechaEmision: new Date().toISOString(),
      cedulaRif: 'V-14234567',
      contribuyente: 'Contribuyente Taquilla',
      codigoCatastral: 'TAQ-C-14234567',
      sector: 'Casco Central',
      metodoPago: 'PUNTO_VENTA',
      referenciaBancaria: 'TAQ-918234',
      tasaBcvUsd: resumen?.tasaBcvActual || 842.21,
      montoTotalBs: 2526.63,
      montoTotalUsd: 3.00,
      estado: 'APROBADO',
      observacionesFiscales: 'Cobro en Taquilla Municipal',
    }
  ]).map((r) => ({
    'Folio Fiscal': String(r.numeroReciboFiscal || 'N/A'),
    'Nº Correlativo': r.folioCorrelativo ? `#${r.folioCorrelativo}` : '-',
    'Fecha de Emisión': r.fechaEmision ? (r.fechaEmision.includes('T') ? new Date(r.fechaEmision).toLocaleString('es-VE') : r.fechaEmision) : '-',
    'C.I / RIF': String(r.cedulaRif || 'N/A'),
    'Contribuyente': String(r.contribuyente || 'Contribuyente'),
    'Código Catastral': String(r.codigoCatastral || 'N/A'),
    'Sector / Parroquia': String(r.sector || 'Rosario de Perijá'),
    'Método de Pago': String(r.metodoPago || 'PAGO_MOVIL'),
    'Ref. Bancaria': String(r.referenciaBancaria || 'TAQUILLA'),
    'Tasa BCV Aplicada (Bs/$)': Number(r.tasaBcvUsd || 842.21).toFixed(2),
    'Monto Pagado (Bs)': Number(r.montoTotalBs || 0).toFixed(2),
    'Monto Pagado (USD)': Number(r.montoTotalUsd || 0).toFixed(2),
    'Estado Fiscal': String(r.estado || 'APROBADO'),
    'Observaciones / Conciliación': String(r.observacionesFiscales || 'Conforme en cuenta bancaria municipal'),
  }));

  const wsRecibos = XLSX.utils.json_to_sheet(dataRecibos);
  wsRecibos['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 28 },
    { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 22 },
    { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, wsRecibos, 'Recaudación y Pagos');

  // -------------------------------------------------------------
  // 2. HOJA DE REPORTES E INCIDENCIAS VECINALES
  // -------------------------------------------------------------
  const dataReportes = (reportes && reportes.length > 0 ? reportes : [
    {
      folio: 'REP-2026-001',
      fecha: new Date().toISOString(),
      tipo: 'BASURA_ACUMULADA',
      sector: 'Casco Central',
      descripcion: 'Bolsas acumuladas frente al comercio',
      usuario: 'Santiago Morales',
      telefono: '0412-1414060',
      estado: 'RESUELTO',
      cuadrilla: 'CAM-01 (Compactador)',
      motivoRechazo: 'Atendido en campo con foto de evidencia.',
    }
  ]).map((rep) => ({
    'Folio Reporte': String(rep.folio || 'REP-001'),
    'Fecha': rep.fecha ? (rep.fecha.includes('T') ? new Date(rep.fecha).toLocaleDateString('es-VE') : rep.fecha) : '-',
    'Tipo de Incidencia': String(rep.tipo || 'INCIDENCIA').replace(/_/g, ' '),
    'Sector': String(rep.sector || 'Rosario'),
    'Detalle / Descripción': String(rep.descripcion || '-'),
    'Ciudadano': String(rep.usuario || 'Vecino'),
    'Teléfono': String(rep.telefono || '-'),
    'Estado': String(rep.estado || 'PENDIENTE'),
    'Cuadrilla / Operario': String(rep.cuadrilla || 'CAM-01 Compactador'),
    'Resolución / Observación': String(rep.motivoRechazo || 'Atendido en campo'),
  }));

  const wsReportes = XLSX.utils.json_to_sheet(dataReportes);
  wsReportes['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 22 }, { wch: 35 },
    { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, wsReportes, 'Reportes de Incidencias');

  // -------------------------------------------------------------
  // 3. HOJA DE TURNOS OPERATIVOS DE CUADRILLA & PESAJE
  // -------------------------------------------------------------
  if (turnos && turnos.length > 0) {
    const dataTurnos = turnos.map((t, idx) => ({
      'Nº Turno': `#${idx + 1}`,
      'Fecha': t.fecha,
      'Camión / Unidad': String(t.camion || 'CAM-01'),
      'Supervisor en Campo': String(t.supervisor || 'Supervisor Operativo'),
      'Sector / Ruta': String(t.sector || 'Casco Central'),
      'Estado del Turno': String(t.estado || 'FINALIZADO'),
      'Toneladas Recolectadas (Tn)': Number(t.toneladas || 0).toFixed(2),
      'Novedades / Cierre': String(t.novedades || 'Ruta completada hacia relleno sanitario'),
    }));
    const wsTurnos = XLSX.utils.json_to_sheet(dataTurnos);
    wsTurnos['!cols'] = [
      { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 26 },
      { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTurnos, 'Turnos y Cuadrillas');
  }

  // -------------------------------------------------------------
  // 4. HOJA DE ZONIFICACIÓN Y TARIFAS MUNICIPALES (83 SECTORES)
  // -------------------------------------------------------------
  if (sectores && sectores.length > 0) {
    const dataSectores = sectores.map((s) => ({
      'Código Sector': String(s.codigo || '-'),
      'Nombre del Sector': String(s.nombre || '-'),
      'Parroquia': String(s.parroquia || 'El Rosario'),
      'Estrato Tarifario': String(s.estrato || 'RESIDENCIAL'),
      'Tarifa Base ($ USD)': Number(s.tarifaUsd || 0).toFixed(2),
      'Tarifa en Bolívares (Bs)': Number(s.tarifaBs || 0).toFixed(2),
      'Fase de Recolección': String(s.fase || 'ACTIVO'),
    }));
    const wsSectores = XLSX.utils.json_to_sheet(dataSectores);
    wsSectores['!cols'] = [
      { wch: 16 }, { wch: 30 }, { wch: 22 }, { wch: 20 },
      { wch: 20 }, { wch: 22 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSectores, 'Zonificación y Tarifas');
  }

  // -------------------------------------------------------------
  // 5. HOJA DE RESUMEN EJECUTIVO Y MÉTRICAS MUNICIPALES
  // -------------------------------------------------------------
  const tasaBcvVal = Number(resumen?.tasaBcvActual) || 842.21;
  const totBsVal = Number(resumen?.totalRecaudadoBs) || 0;
  const totUsdVal = Number(resumen?.totalRecaudadoUsd) || 0;

  const dataResumen = [
    { 'Métrica Municipal': 'Ente Emisor', 'Valor / Detalle': 'Alcaldía del Municipio Rosario de Perijá - Dirección de Administración Tributaria (SETRIB)' },
    { 'Métrica Municipal': 'RIF Institucional', 'Valor / Detalle': 'G-2004984-7' },
    { 'Métrica Municipal': 'Fecha de Generación del Informe', 'Valor / Detalle': new Date().toLocaleString('es-VE') },
    { 'Métrica Municipal': 'Tasa Oficial BCV de Referencia', 'Valor / Detalle': `Bs. ${tasaBcvVal.toFixed(2)} / USD` },
    { 'Métrica Municipal': 'Total Recaudado en Bolívares (Bs)', 'Valor / Detalle': `Bs. ${totBsVal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { 'Métrica Municipal': 'Total Recaudado en Dólares ($ USD)', 'Valor / Detalle': `$ ${totUsdVal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` },
    { 'Métrica Municipal': 'Recibos Fiscales Aprobados (Solventes)', 'Valor / Detalle': String(resumen?.totalRecibosAprobados ?? 0) },
    { 'Métrica Municipal': 'Pagos Pendientes por Conciliar', 'Valor / Detalle': String(resumen?.totalRecibosPendientes ?? 0) },
    { 'Métrica Municipal': 'Pagos Rechazados / Observados', 'Valor / Detalle': String(resumen?.totalRecibosRechazados ?? 0) },
    { 'Métrica Municipal': 'Reportes de Incidencias Resueltos', 'Valor / Detalle': String(resumen?.totalReportesResueltos ?? 0) },
    { 'Métrica Municipal': 'Reportes de Incidencias Pendientes', 'Valor / Detalle': String(resumen?.totalReportesPendientes ?? 0) },
    { 'Métrica Municipal': 'Toneladas de Residuos Recolectadas', 'Valor / Detalle': `${Number(resumen?.totalToneladasMes || 0).toFixed(2)} Toneladas (Relleno Sanitario)` },
    { 'Métrica Municipal': 'Unidades de Recolección Operativas', 'Valor / Detalle': '2 Camiones Compactadores (CAM-01 y CAM-02)' },
    { 'Métrica Municipal': 'Total de Sectores Atendidos', 'Valor / Detalle': '83 Sectores en las 3 Parroquias' },
  ];
  const wsResumen = XLSX.utils.json_to_sheet(dataResumen);
  wsResumen['!cols'] = [{ wch: 45 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');

  // -------------------------------------------------------------
  // DESCARGA ROBUSTA CON BINARY ARRAYBUFFER Y BLOB NATIVO
  // -------------------------------------------------------------
  try {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const blob = new Blob([s2ab(wbout)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    if (typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    }
  } catch (err) {
    console.error('Error generando archivo Excel con Blob:', err);
    try {
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e2) {
      console.error('Error en fallback de exportación Excel:', e2);
      throw new Error('No se pudo generar el archivo Excel en el navegador.');
    }
  }
}
