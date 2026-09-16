import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST /api/censo/buscar - Búsqueda de ciudadano por cédula para autocompletado en app móvil
export async function POST(request: Request) {
  try {
    const { cedula } = await request.json();
    if (!cedula) {
      return NextResponse.json({ encontrado: false }, { headers: corsHeaders });
    }

    const cleanDoc = cedula.toString().trim().toUpperCase().replace(/^[VEJG]-?/, '');
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
      select: {
        id: true,
        tipoDoc: true,
        cedulaRif: true,
        nombres: true,
        apellidos: true,
        telefonoMovil: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        encontrado: !!usuario,
        usuario: usuario || null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error al buscar ciudadano por API:', error);
    return NextResponse.json({ encontrado: false, usuario: null }, { headers: corsHeaders });
  }
}
