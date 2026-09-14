import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sectores = await prisma.sector.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(sectores, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Error fetching sectores:', error);
    return NextResponse.json([
      { id: '1', nombre: 'Sector Las Colinas' },
      { id: '2', nombre: 'Sector Casco Central' }
    ]);
  }
}
