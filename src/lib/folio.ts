import prisma from './prisma';
import crypto from 'crypto';

/**
 * Genera de forma atómica el siguiente folio correlativo fiscal inmutable
 * bajo normativa de la Contraloría Municipal.
 */
export async function generarSiguienteFolioFiscal(): Promise<{
  folioCorrelativo: number;
  numeroReciboFiscal: string;
  codigoQrHash: string;
}> {
  const anio = new Date().getFullYear();

  // Obtener el último folio emitido
  const ultimoRecibo = await prisma.reciboPago.findFirst({
    orderBy: { folioCorrelativo: 'desc' },
    select: { folioCorrelativo: true },
  });

  const siguienteNumero = (ultimoRecibo?.folioCorrelativo || 0) + 1;
  const numeroFormateado = String(siguienteNumero).padStart(6, '0');
  const numeroReciboFiscal = `ASEO-${anio}-${numeroFormateado}`;

  // Generar hash criptográfico único para validación QR
  const rawToken = `${numeroReciboFiscal}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const codigoQrHash = `QR-${numeroReciboFiscal}-${crypto.createHash('sha256').update(rawToken).digest('hex').substring(0, 10).toUpperCase()}`;

  return {
    folioCorrelativo: siguienteNumero,
    numeroReciboFiscal,
    codigoQrHash,
  };
}

/**
 * Genera el siguiente folio correlativo de incidencia ciudadana
 */
export async function generarSiguienteFolioIncidencia(): Promise<string> {
  const anio = new Date().getFullYear();
  const total = await prisma.reporteIncidencia.count();
  const siguiente = total + 1;
  return `INC-${anio}-${String(siguiente).padStart(5, '0')}`;
}
