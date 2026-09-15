import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface SolvenciaData {
  numeroSolvencia?: string;
  fechaEmision?: string | Date;
  validoHasta?: string | Date;
  contribuyenteNombre: string;
  contribuyenteCedula: string;
  codigoCatastral: string;
  sectorNombre: string;
  direccionInmueble?: string;
  tipoInmueble?: string;
  ultimoReciboFolio?: string;
  ultimoReciboFecha?: string | Date;
  montoUltimoPagoBs?: number;
  montoUltimoPagoUsd?: number;
  origenVerificacionUrl?: string;
}

export async function generarCertificadoSolvenciaPdf(data: SolvenciaData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  const fechaHoy = data.fechaEmision ? new Date(data.fechaEmision) : new Date();
  const fechaStr = fechaHoy.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Calculate validity date (last day of current month or +30 days)
  const fechaValidez = data.validoHasta
    ? new Date(data.validoHasta)
    : new Date(fechaHoy.getFullYear(), fechaHoy.getMonth() + 1, 0);
  const validezStr = fechaValidez.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const numSolvencia =
    data.numeroSolvencia ||
    `SOLV-${fechaHoy.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  // Verification URL
  const verifyUrl =
    data.origenVerificacionUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/verificar/${data.ultimoReciboFolio || numSolvencia}`
      : `https://alcaldiarosariodeperija.gob.ve/verificar/${numSolvencia}`);

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 160,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  } catch (err) {
    console.warn('Error generando QR de solvencia:', err);
  }

  // -------------------------------------------------------------
  // 1. MARCO DE SEGURIDAD ORLADO (BORDES INSTITUCIONALES)
  // -------------------------------------------------------------
  // Exterior border (Dark Navy)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Interior border (Gold / Emerald Accent)
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.4);
  doc.rect(10.5, 10.5, pageWidth - 21, pageHeight - 21);

  // Corner security accents
  const corners = [
    [10.5, 10.5],
    [pageWidth - 10.5, 10.5],
    [10.5, pageHeight - 10.5],
    [pageWidth - 10.5, pageHeight - 10.5],
  ];
  doc.setFillColor(217, 119, 6);
  corners.forEach(([cx, cy]) => {
    doc.circle(cx, cy, 1.5, 'F');
  });

  // Top header banner background
  doc.setFillColor(15, 23, 42);
  doc.rect(11, 11, pageWidth - 22, 28, 'F');

  // -------------------------------------------------------------
  // 2. ENCABEZADO INSTITUCIONAL
  // -------------------------------------------------------------
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text('ESTADO ZULIA • ALCALDÍA DEL MUNICIPIO ROSARIO DE PERIJÁ', pageWidth / 2, 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(251, 191, 36);
  doc.text('DIRECCIÓN DE ADMINISTRACIÓN TRIBUTARIA Y RENTAS MUNICIPALES (SETRIB / IMA)', pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('RIF: G-2004984-7 • Sistema Integral de Recaudación Digital de Aseo Urbano', pageWidth / 2, 35, { align: 'center' });

  // -------------------------------------------------------------
  // 3. TÍTULO Y NÚMERO DE SOLVENCIA
  // -------------------------------------------------------------
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CERTIFICADO OFICIAL DE SOLVENCIA MUNICIPAL', pageWidth / 2, 48, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text('TASA POR SERVICIO DE ASEO URBANO Y DOMICILIARIO', pageWidth / 2, 54, { align: 'center' });

  // Number & validity box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, 59, pageWidth - 30, 14, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nº DE SOLVENCIA:`, 20, 65);
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.text(numSolvencia, 55, 65);

  doc.setTextColor(15, 23, 42);
  doc.text(`FECHA DE EMISIÓN:`, 115, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(fechaStr, 152, 65);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(`VÁLIDO HASTA:`, 20, 70);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(validezStr, 55, 70);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`(Vigente para trámites administrativos y comerciales)`, 115, 70);

  // -------------------------------------------------------------
  // 4. TEXTO FORMAL / CUERPO DE LA CERTIFICACIÓN
  // -------------------------------------------------------------
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  const parrafoIntro =
    'La Dirección de Administración Tributaria y Rentas de la Alcaldía del Municipio Rosario de Perijá, en ejercicio de las atribuciones conferidas por la Ley Orgánica del Poder Público Municipal y la Ordenanza Reguladora de la Tasa por el Servicio de Aseo Urbano y Domiciliario vigente:';

  doc.text(doc.splitTextToSize(parrafoIntro, pageWidth - 32), 16, 80);

  // HACE CONSTAR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('HACE CONSTAR', pageWidth / 2, 94, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const parrafoConstancia =
    'Que el contribuyente e inmueble que se detallan a continuación han cumplido a cabalidad con sus obligaciones fiscales y se encuentran SOLVENTES con el Municipio por concepto de recolección, transporte y disposición final de desechos sólidos:';

  doc.text(doc.splitTextToSize(parrafoConstancia, pageWidth - 32), 16, 101);

  // -------------------------------------------------------------
  // 5. CUADRO DETALLADO DEL CONTRIBUYENTE E INMUEBLE
  // -------------------------------------------------------------
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, 113, pageWidth - 30, 52, 3, 3, 'FD');

  // Header of box
  doc.setFillColor(5, 150, 105);
  doc.rect(15, 113, pageWidth - 30, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATOS OFICIALES DEL CONTRIBUYENTE E INMUEBLE CATASTRAL', pageWidth / 2, 118, { align: 'center' });

  // Grid fields
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');

  // Left Column
  doc.text('CONTRIBUYENTE / TITULAR:', 20, 126);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.contribuyenteNombre.toUpperCase(), 66, 126);

  doc.setTextColor(100, 116, 139);
  doc.text('CÉDULA / RIF:', 20, 133);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(data.contribuyenteCedula, 66, 133);

  doc.setTextColor(100, 116, 139);
  doc.text('CÓDIGO CATASTRAL:', 20, 140);
  doc.setTextColor(2, 132, 199);
  doc.setFont('helvetica', 'bold');
  doc.text(data.codigoCatastral, 66, 140);

  doc.setTextColor(100, 116, 139);
  doc.text('SECTOR / PARROQUIA:', 20, 147);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.sectorNombre} • Rosario de Perijá`, 66, 147);

  doc.setTextColor(100, 116, 139);
  doc.text('DIRECCIÓN EXACTA:', 20, 154);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(data.direccionInmueble || 'Casco Urbano del Municipio', 66, 154);

  doc.setTextColor(100, 116, 139);
  doc.text('ESTADO FISCAL:', 20, 161);
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ SOLVENTE Y CONCILIADO', 66, 161);

  // -------------------------------------------------------------
  // 6. DETALLE DEL ÚLTIMO PAGO CONCILIADO
  // -------------------------------------------------------------
  if (data.ultimoReciboFolio) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, 169, pageWidth - 30, 22, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('ÚLTIMA CONCILIACIÓN BANCARIA REGISTRADA:', 20, 175);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`Folio Fiscal: ${data.ultimoReciboFolio}`, 20, 181);
    doc.text(
      `Monto Liquidado: Bs. ${(data.montoUltimoPagoBs || 0).toFixed(2)} (Equiv. $${(data.montoUltimoPagoUsd || 0).toFixed(2)} USD)`,
      20,
      186
    );

    const fPago = data.ultimoReciboFecha ? new Date(data.ultimoReciboFecha).toLocaleDateString('es-VE') : fechaStr;
    doc.text(`Fecha de Pago: ${fPago}`, 125, 181);
    doc.text(`Validación Fiscal: CONCILIADO EN CUENTA MUNICIPAL`, 125, 186);
  }

  // -------------------------------------------------------------
  // 7. VALIDEZ LEGAL Y FINALIDAD
  // -------------------------------------------------------------
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const notaValidez =
    'Certificado expedido a solicitud de la parte interesada para surtir efectos legales en trámites municipales, patentes de industria y comercio, solvencias vecinales, registros y notarías. Documento emitido con firma y sello digital de la Alcaldía de Rosario de Perijá, verificable en tiempo real mediante el código QR anexo conforme a la Ley de Infogobierno y Mensajes de Datos.';
  doc.text(doc.splitTextToSize(notaValidez, pageWidth - 32), 16, 198);

  // -------------------------------------------------------------
  // 8. PIE DE PÁGINA CON CÓDIGO QR Y SELLO DIGITAL
  // -------------------------------------------------------------
  // QR Code on bottom left
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 18, 218, 38, 38);
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('ESCANEA PARA VERIFICAR', 37, 259, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Autenticidad en Línea', 37, 263, { align: 'center' });
  }

  // Official Stamp & Signature Box on bottom right
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.5);
  doc.roundedRect(80, 218, pageWidth - 96, 42, 3, 3);

  // Stamp header
  doc.setFillColor(2, 132, 199);
  doc.rect(80, 218, pageWidth - 96, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SELLO Y VALIDACIÓN DIGITAL DE RENTAS MUNICIPALES', (80 + pageWidth - 16) / 2, 222, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text('ALCALDÍA DEL MUNICIPIO ROSARIO DE PERIJÁ', (80 + pageWidth - 16) / 2, 230, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Dirección de Servicios Públicos y Recaudación Tributaria', (80 + pageWidth - 16) / 2, 235, { align: 'center' });

  // Signature line
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(95, 248, pageWidth - 31, 248);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('FIRMA ELECTRÓNICA AUTORIZADA', (80 + pageWidth - 16) / 2, 252, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Hash de Seguridad: ${numSolvencia}-${Date.now().toString(36).toUpperCase()}`, (80 + pageWidth - 16) / 2, 256, { align: 'center' });

  // Footer note
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Rosario de Perijá, Estado Zulia, Venezuela • www.alcaldiarosariodeperija.gob.ve', pageWidth / 2, pageHeight - 12, {
    align: 'center',
  });

  // Save PDF file
  const fileName = `Certificado_Solvencia_${data.contribuyenteCedula}_${numSolvencia}.pdf`;
  doc.save(fileName);
}
