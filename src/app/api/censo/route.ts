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

// GET /api/censo - Entrega sectores, calles, ordenanzas y predios al aplicativo móvil
export async function GET(request: Request) {
  try {
    const sectores = await prisma.sector.findMany({
      where: { activo: true },
      include: {
        parroquia: true,
        callesTramos: { orderBy: { ordenRecoleccion: 'asc' } },
        tarifasSectores: true,
      },
      orderBy: { nombre: 'asc' },
    });

    const inmuebles = await prisma.inmuebleCatastro.findMany({
      include: {
        sector: { select: { id: true, nombre: true, codigo: true } },
        calle: { select: { id: true, nombreCalle: true } },
        contribuyentes: {
          include: {
            usuario: {
              select: { id: true, nombres: true, apellidos: true, cedulaRif: true, telefonoMovil: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const censadosHoy = await prisma.inmuebleCatastro.count({
      where: {
        createdAt: { gte: inicioDia },
      },
    });

    return NextResponse.json(
      {
        success: true,
        totalInmuebles: inmuebles.length,
        censadosHoy,
        sectores,
        inmuebles: inmuebles.map((inm) => ({
          id: inm.id,
          codigoCatastral: inm.codigoCatastral,
          numeroCasaLocal: inm.numeroCasaLocal,
          referenciaUbic: inm.referenciaUbic,
          tipoInmueble: inm.tipoInmueble,
          tarifaBaseUsd: inm.tarifaBaseUsd,
          estadoCuenta: inm.estadoCuenta,
          latitud: inm.latitud,
          longitud: inm.longitud,
          sectorNombre: inm.sector?.nombre,
          calleNombre: inm.calle?.nombreCalle,
          propietarioNombre: inm.contribuyentes?.[0]?.usuario
            ? `${inm.contribuyentes[0].usuario.nombres} ${inm.contribuyentes[0].usuario.apellidos || ''}`.trim()
            : 'Sin asignar',
          propietarioCedula: inm.contribuyentes?.[0]?.usuario?.cedulaRif || '',
        })),
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error en API censo GET:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener datos del censo' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/censo - Registra una vivienda y su habitante desde el aplicativo móvil
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sectorId,
      calleId,
      numeroCasaLocal,
      referenciaUbic,
      tipoInmueble = 'RESIDENCIAL',
      tarifaBaseUsd = 2.0,
      latitud,
      longitud,
      codigoCatastral,
      tipoDoc = 'V',
      cedulaNumero,
      nombres,
      apellidos = '',
      telefonoMovil,
      email,
      tipoRelacion = 'PROPIETARIO',
      esResponsablePago = true,
    } = body;

    if (!sectorId || !calleId || !numeroCasaLocal || !cedulaNumero || !nombres) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios para el censo.' },
        { status: 400 }
      );
    }

    const cleanDigits = cedulaNumero.toString().replace(/[^0-9]/g, '');
    const cedulaCompleta = `${tipoDoc.toUpperCase()}-${cleanDigits}`;

    // 1. Buscar o crear ciudadano
    let usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { cedulaRif: cedulaCompleta },
          { cedulaRif: cleanDigits },
          ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ],
      },
    });

    if (usuario) {
      usuario = await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          telefonoMovil: telefonoMovil || usuario.telefonoMovil,
          email: email ? email.trim().toLowerCase() : usuario.email,
        },
      });
    } else {
      usuario = await prisma.usuario.create({
        data: {
          tipoDoc: tipoDoc.toUpperCase(),
          cedulaRif: cedulaCompleta,
          nombres: nombres.trim(),
          apellidos: (apellidos || '').trim(),
          telefonoMovil: (telefonoMovil || '').trim(),
          email: email ? email.trim().toLowerCase() : null,
          rol: 'CIUDADANO',
        },
      });
    }

    // 2. Generar Código Catastral
    const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
    const countInmueblesSector = await prisma.inmuebleCatastro.count({
      where: { sectorId },
    });

    const codSectorPrefijo = sector?.codigo ? sector.codigo.replace('SEC-', '') : 'GEN';
    const codigoCatastralFinal =
      codigoCatastral?.trim() ||
      `CEN-${codSectorPrefijo}-${String(countInmueblesSector + 1).padStart(3, '0')}`;

    // 3. Crear Inmueble
    const nuevoInmueble = await prisma.inmuebleCatastro.create({
      data: {
        codigoCatastral: codigoCatastralFinal,
        sectorId,
        calleId,
        numeroCasaLocal: numeroCasaLocal.trim(),
        referenciaUbic: referenciaUbic?.trim() || null,
        tipoInmueble,
        tarifaBaseUsd: Number(tarifaBaseUsd) || 2.0,
        estadoCuenta: 'SOLVENTE',
        latitud: latitud ? Number(latitud) : null,
        longitud: longitud ? Number(longitud) : null,
      },
      include: {
        sector: true,
        calle: true,
      },
    });

    // 4. Vincular Ciudadano con Inmueble
    await prisma.inmuebleContribuyente.create({
      data: {
        inmuebleId: nuevoInmueble.id,
        usuarioId: usuario.id,
        tipoRelacion: tipoRelacion || 'PROPIETARIO',
        esResponsablePago: esResponsablePago ?? true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        mensaje: `Censo guardado exitosamente: ${nuevoInmueble.codigoCatastral}`,
        inmueble: {
          id: nuevoInmueble.id,
          codigoCatastral: nuevoInmueble.codigoCatastral,
          numeroCasaLocal: nuevoInmueble.numeroCasaLocal,
          tipoInmueble: nuevoInmueble.tipoInmueble,
          tarifaBaseUsd: nuevoInmueble.tarifaBaseUsd,
          latitud: nuevoInmueble.latitud,
          longitud: nuevoInmueble.longitud,
          sectorNombre: nuevoInmueble.sector?.nombre,
          calleNombre: nuevoInmueble.calle?.nombreCalle,
          propietarioNombre: `${usuario.nombres} ${usuario.apellidos || ''}`.trim(),
          propietarioCedula: usuario.cedulaRif,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error en API censo POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al guardar el censo' },
      { status: 500, headers: corsHeaders }
    );
  }
}
