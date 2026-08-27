import prisma from './prisma';

export interface BcvRateInfo {
  fecha: string;
  valorUsdBs: number;
  valorEurBs?: number;
  fuente: string;
}

/**
 * Obtiene la tasa oficial BCV del día.
 * Si no existe en BD para la fecha actual, intenta obtenerla o utiliza el valor por defecto configurado.
 */
export async function getTasaBcvActual(): Promise<BcvRateInfo> {
  const hoy = new Date().toISOString().split('T')[0];

  try {
    const tasaBd = await prisma.tasaBcv.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (tasaBd) {
      return {
        fecha: tasaBd.fecha,
        valorUsdBs: tasaBd.valorUsdBs,
        valorEurBs: tasaBd.valorEurBs || undefined,
        fuente: tasaBd.fuente,
      };
    }
  } catch (error) {
    console.error('Error al consultar tasa BCV de base de datos:', error);
  }

  // Tasa fallback segura
  const fallbackRate = parseFloat(process.env.DEFAULT_BCV_RATE || '65.40');
  return {
    fecha: hoy,
    valorUsdBs: fallbackRate,
    valorEurBs: fallbackRate * 1.08,
    fuente: 'BCV_OFICIAL',
  };
}

/**
 * Convierte un monto en USD a Bolívares a la tasa oficial del día
 */
export function calcularMontoBs(montoUsd: number, tasaBcv: number): number {
  return Math.round(montoUsd * tasaBcv * 100) / 100;
}

/**
 * Formateador de moneda en Bolívares (VES)
 */
export function formatBs(monto: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(monto)
    .replace('VES', 'Bs.');
}

/**
 * Formateador de moneda en Dólares (USD)
 */
export function formatUsd(monto: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(monto)
    .replace('USD', '$');
}
