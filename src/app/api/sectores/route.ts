import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function sanitizarNombre(nombre: string): string {
  if (!nombre) return '';
  return nombre
    .replace(/Alcald[\?\uFFFD]a/gi, 'Alcaldía')
    .replace(/Perij[\?\uFFFD]/gi, 'Perijá')
    .replace(/L[\?\uFFFD]pez/gi, 'López')
    .replace(/Bol[\?\uFFFD]var/gi, 'Bolívar')
    .replace(/M[\?\uFFFD]rquez/gi, 'Márquez')
    .replace(/Jes[\?\uFFFD]s/gi, 'Jesús')
    .replace(/concepci[\?\uFFFD]n/gi, 'Concepción')
    .replace(/falc[\?\uFFFD]n/gi, 'Falcón')
    .replace(/Di[\?\uFFFD]lisis/gi, 'Diálisis')
    .replace(/Andr[\?\uFFFD]s/gi, 'Andrés')
    .replace(/Ca[\?\uFFFD]ada/gi, 'Cañada')
    .replace(/Jos[\?\uFFFD]/gi, 'José')
    .replace(/[\uFFFD]/g, '');
}

export async function GET() {
  try {
    const sectores = await prisma.sector.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    const sectoresSanitizados = sectores.map((s) => ({
      ...s,
      nombre: sanitizarNombre(s.nombre),
    }));
    return NextResponse.json(sectoresSanitizados, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
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
