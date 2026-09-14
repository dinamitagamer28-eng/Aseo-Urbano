import { NextResponse } from 'next/server';
import { getTasaBcvActual } from '@/lib/bcv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rateInfo = await getTasaBcvActual();
    return NextResponse.json(rateInfo, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Error en /api/bcv:', error);
    return NextResponse.json(
      { valorUsdBs: 832.49, fecha: new Date().toISOString().split('T')[0], fuente: 'BCV_OFICIAL' },
      { status: 200 }
    );
  }
}
