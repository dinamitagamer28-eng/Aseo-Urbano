import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
          telefonoMovil: inm.contribuyentes?.[0]?.usuario?.telefonoMovil || '',
          createdAt: inm.createdAt,
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

// POST /api/censo - Registra una vivienda y su habitante desde el aplicativo móvil o web
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 0. VERIFICACIÓN ESTRICTA DE LOGIN: SOLO USUARIOS CREADOS EN LA WEB
    if (body.action === 'login') {
      const input = (body.usuario || body.identifier || body.correo || body.cedula || '').trim();
      const password = (body.password || '').trim();

      if (!input || !password) {
        return NextResponse.json(
          { success: false, error: 'Por favor ingresa tu usuario/correo y contraseña.' },
          { status: 400, headers: corsHeaders }
        );
      }

      const inputLower = input.toLowerCase();
      const cleanDigits = input.replace(/[^0-9]/g, '');

      // Buscar usuario en base de datos por correo exacto o cédula registrada
      const matchedUser = await prisma.usuario.findFirst({
        where: {
          OR: [
            { email: inputLower },
            { email: input },
            { cedulaRif: input },
            { cedulaRif: input.toUpperCase() },
            { cedulaRif: `V-${cleanDigits}` },
            { cedulaRif: `E-${cleanDigits}` },
            { cedulaRif: `J-${cleanDigits}` },
            { cedulaRif: `G-${cleanDigits}` },
            ...(cleanDigits.length >= 5 ? [{ cedulaRif: { contains: cleanDigits } }] : [])
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      // Si el usuario no fue creado en la base de datos de la web: DENEGAR ACCESO TOTALMENTE
      if (!matchedUser) {
        return NextResponse.json(
          { 
            success: false, 
            error: '🚫 Acceso Denegado: Este usuario no existe. Debes crear tu cuenta primero en la página web del Aseo Urbano.' 
          },
          { status: 404, headers: corsHeaders }
        );
      }

      // Si no tiene contraseña creada en la web
      if (!matchedUser.passwordHash) {
        return NextResponse.json(
          { 
            success: false, 
            error: '🚫 Esta cuenta no tiene una contraseña creada en la web. Regístrate en la página web del Aseo para definir tu contraseña.' 
          },
          { status: 401, headers: corsHeaders }
        );
      }

      // Validar estrictamente la contraseña contra el hash de la base de datos
      const isValidPassword = await bcrypt.compare(password, matchedUser.passwordHash);

      if (!isValidPassword) {
        return NextResponse.json(
          { 
            success: false, 
            error: '🚫 Contraseña incorrecta. Debes ingresar la misma contraseña con la que creaste tu usuario en la web del Aseo.' 
          },
          { status: 401, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: `¡Bienvenido ${matchedUser.nombres}!`,
          user: {
            id: matchedUser.id,
            nombre: `${matchedUser.nombres} ${matchedUser.apellidos || ''}`.trim(),
            email: matchedUser.email,
            cedula: matchedUser.cedulaRif,
            rol: matchedUser.rol,
            telefono: matchedUser.telefonoMovil
          }
        },
        { headers: corsHeaders }
      );
    }

    // ACCIÓN: CREAR CALLE DESDE WEB O APK
    if (body.action === 'crear_calle') {
      const { sectorId, nombreCalle, diaRecoleccion, horaEstimada } = body;
      if (!sectorId || !nombreCalle) {
        return NextResponse.json(
          { success: false, error: 'sectorId y nombreCalle son requeridos.' },
          { status: 400, headers: corsHeaders }
        );
      }
      const existingCallesCount = await prisma.calleTramo.count({ where: { sectorId } });
      const nuevaCalle = await prisma.calleTramo.create({
        data: {
          sectorId,
          nombreCalle: nombreCalle.trim(),
          ordenRecoleccion: existingCallesCount + 1,
          diaRecoleccion: diaRecoleccion || 'LUNES Y JUEVES',
          horaEstimada: horaEstimada || '07:00 AM'
        }
      });
      return NextResponse.json({ success: true, calle: nuevaCalle }, { headers: corsHeaders });
    }

    // ACCIÓN: CREAR SECTOR DESDE WEB O APK
    if (body.action === 'crear_sector') {
      const { nombre, totalFamilias, estrato, codigo } = body;
      if (!nombre) {
        return NextResponse.json(
          { success: false, error: 'El nombre del sector es requerido.' },
          { status: 400, headers: corsHeaders }
        );
      }
      let parroquia = await prisma.parroquia.findFirst({ where: { codigo: 'PAR-ROS' } });
      if (!parroquia) {
        parroquia = await prisma.parroquia.create({
          data: { codigo: 'PAR-ROS', nombre: 'Parroquia El Rosario' }
        });
      }
      const nuevoSector = await prisma.sector.create({
        data: {
          parroquiaId: parroquia.id,
          codigo: codigo || `SEC-${Date.now().toString().slice(-4)}`,
          nombre: nombre.trim(),
          estrato: estrato || 'POPULAR',
          activo: true,
          centroLat: 10.3267,
          centroLng: -72.3125
        }
      });
      return NextResponse.json({ success: true, sector: nuevoSector }, { headers: corsHeaders });
    }

    let {
      sectorId,
      sectorNombre,
      sector: sectorAlias,
      calleId,
      calleNombre,
      calle: calleAlias,
      numeroCasaLocal,
      numero: numeroAlias,
      referenciaUbic,
      referencia: referenciaAlias,
      tipoInmueble = 'RESIDENCIAL',
      tarifaBaseUsd = 2.0,
      latitud,
      lat,
      longitud,
      lng,
      codigoCatastral,
      tipoDoc = 'V',
      cedulaNumero,
      cedula: cedulaAlias,
      nombres,
      nombre: nombreAlias,
      apellidos = '',
      telefonoMovil,
      telefono: telefonoAlias,
      email,
      tipoRelacion = 'PROPIETARIO',
      esResponsablePago = true,
    } = body;

    // Normalizar aliases
    const rawSector = sectorNombre || sectorAlias || '';
    const rawCalle = calleNombre || calleAlias || 'Calle Principal';
    const numCasa = (numeroCasaLocal || numeroAlias || 'S/N').toString().trim();
    const rawCedula = (cedulaNumero || cedulaAlias || '').toString().trim();
    const rawNombres = (nombres || nombreAlias || '').toString().trim();
    const refUbic = (referenciaUbic || referenciaAlias || '').toString().trim();
    const tel = (telefonoMovil || telefonoAlias || '').toString().trim();

    if (!rawCedula || !rawNombres) {
      return NextResponse.json(
        { success: false, error: 'La cédula y el nombre del ciudadano son requeridos.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Resolver o Crear Sector en La Villa del Rosario
    let resolvedSector = null;
    if (sectorId) {
      resolvedSector = await prisma.sector.findUnique({ where: { id: sectorId } });
    }
    if (!resolvedSector && rawSector) {
      const cleanSearch = rawSector.replace('Sector', '').trim();
      resolvedSector = await prisma.sector.findFirst({
        where: { nombre: { contains: cleanSearch } }
      });
    }
    if (!resolvedSector) {
      resolvedSector = await prisma.sector.findFirst({ where: { codigo: 'SEC-CENTRO' } });
    }
    if (!resolvedSector) {
      let parroquia = await prisma.parroquia.findFirst({ where: { codigo: 'PAR-ROS' } });
      if (!parroquia) {
        parroquia = await prisma.parroquia.create({
          data: { codigo: 'PAR-ROS', nombre: 'Parroquia El Rosario' }
        });
      }
      resolvedSector = await prisma.sector.create({
        data: {
          parroquiaId: parroquia.id,
          codigo: 'SEC-CENTRO',
          nombre: 'Sector Casco Central',
          centroLat: 10.3267,
          centroLng: -72.3125,
          activo: true
        }
      });
    }

    // Guardar coordenadas exactas capturadas por el dispositivo móvil en tiempo real
    let finalLat = Number(latitud !== undefined && latitud !== null ? latitud : lat);
    let finalLng = Number(longitud !== undefined && longitud !== null ? longitud : lng);
    if (isNaN(finalLat) || isNaN(finalLng) || (finalLat === 0 && finalLng === 0)) {
      finalLat = resolvedSector.centroLat || 10.3267;
      finalLng = resolvedSector.centroLng || -72.3125;
    }

    // 2. Resolver o Crear Calle en el Sector
    let resolvedCalle = null;
    if (calleId) {
      resolvedCalle = await prisma.calleTramo.findUnique({ where: { id: calleId } });
    }
    if (!resolvedCalle && resolvedSector) {
      resolvedCalle = await prisma.calleTramo.findFirst({
        where: { sectorId: resolvedSector.id, nombreCalle: { contains: rawCalle.trim() } }
      });
    }
    if (!resolvedCalle && resolvedSector) {
      const existingCallesCount = await prisma.calleTramo.count({ where: { sectorId: resolvedSector.id } });
      resolvedCalle = await prisma.calleTramo.create({
        data: {
          sectorId: resolvedSector.id,
          nombreCalle: rawCalle.trim() || 'Calle Principal',
          ordenRecoleccion: existingCallesCount + 1,
          diaRecoleccion: 'LUNES Y JUEVES',
          horaEstimada: '07:00 AM'
        }
      });
    }

    // 3. Procesar Cédula y Ciudadano
    let cleanDigits = rawCedula.replace(/[^0-9]/g, '');
    let docType = (tipoDoc || 'V').toUpperCase();
    if (rawCedula.toUpperCase().startsWith('E-') || rawCedula.toUpperCase().startsWith('E')) docType = 'E';
    else if (rawCedula.toUpperCase().startsWith('J-') || rawCedula.toUpperCase().startsWith('J')) docType = 'J';
    else if (rawCedula.toUpperCase().startsWith('G-') || rawCedula.toUpperCase().startsWith('G')) docType = 'G';

    const cedulaCompleta = `${docType}-${cleanDigits}`;

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
          nombres: rawNombres,
          apellidos: apellidos ? apellidos.trim() : usuario.apellidos,
          telefonoMovil: tel || usuario.telefonoMovil,
          email: email ? email.trim().toLowerCase() : usuario.email,
        },
      });
    } else {
      usuario = await prisma.usuario.create({
        data: {
          tipoDoc: docType,
          cedulaRif: cedulaCompleta,
          nombres: rawNombres,
          apellidos: (apellidos || '').trim(),
          telefonoMovil: tel || '0414-0000000',
          email: email ? email.trim().toLowerCase() : null,
          rol: 'CIUDADANO',
        },
      });
    }

    // 4. Generar Código Catastral Municipal
    const countInmueblesSector = await prisma.inmuebleCatastro.count({
      where: { sectorId: resolvedSector.id },
    });
    const codSectorPrefijo = resolvedSector.codigo ? resolvedSector.codigo.replace('SEC-', '') : 'GEN';
    const codigoCatastralFinal =
      codigoCatastral?.trim() ||
      `CEN-${codSectorPrefijo}-${String(countInmueblesSector + 1).padStart(3, '0')}`;

    // 5. Crear Inmueble Catastral
    const nuevoInmueble = await prisma.inmuebleCatastro.create({
      data: {
        codigoCatastral: codigoCatastralFinal,
        sectorId: resolvedSector.id,
        calleId: resolvedCalle ? resolvedCalle.id : 'calle-default',
        numeroCasaLocal: numCasa,
        referenciaUbic: refUbic || null,
        tipoInmueble,
        tarifaBaseUsd: Number(tarifaBaseUsd) || 2.0,
        estadoCuenta: 'SOLVENTE',
        latitud: finalLat,
        longitud: finalLng,
      },
      include: {
        sector: true,
        calle: true,
      },
    });

    // 6. Vincular Ciudadano con Inmueble
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
        mensaje: `Censo registrado exitosamente en la base de datos municipal: ${nuevoInmueble.codigoCatastral}`,
        inmueble: {
          id: nuevoInmueble.id,
          codigoCatastral: nuevoInmueble.codigoCatastral,
          numeroCasaLocal: nuevoInmueble.numeroCasaLocal,
          referenciaUbic: nuevoInmueble.referenciaUbic,
          tipoInmueble: nuevoInmueble.tipoInmueble,
          tarifaBaseUsd: nuevoInmueble.tarifaBaseUsd,
          latitud: nuevoInmueble.latitud,
          longitud: nuevoInmueble.longitud,
          sectorNombre: nuevoInmueble.sector?.nombre,
          calleNombre: nuevoInmueble.calle?.nombreCalle,
          propietarioNombre: `${usuario.nombres} ${usuario.apellidos || ''}`.trim(),
          propietarioCedula: usuario.cedulaRif,
          telefonoMovil: usuario.telefonoMovil,
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

// DELETE /api/censo - Permite borrar un censo o inmueble de la base de datos
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const codigo = searchParams.get('codigo');

    if (!id && !codigo) {
      return NextResponse.json(
        { success: false, error: 'Debe especificar el ID o código catastral a eliminar.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const inmueble = await prisma.inmuebleCatastro.findFirst({
      where: {
        OR: [
          ...(id ? [{ id: id }] : []),
          ...(id ? [{ codigoCatastral: id }] : []),
          ...(codigo ? [{ codigoCatastral: codigo }] : [])
        ]
      }
    });

    if (!inmueble) {
      return NextResponse.json(
        { success: true, mensaje: 'Registro ya no existe en la base de datos.' },
        { headers: corsHeaders }
      );
    }

    // Eliminar vínculos
    await prisma.inmuebleContribuyente.deleteMany({ where: { inmuebleId: inmueble.id } });
    await prisma.reciboPago.deleteMany({ where: { inmuebleId: inmueble.id } });
    await prisma.facturaTasa.deleteMany({ where: { inmuebleId: inmueble.id } });
    await prisma.reporteIncidencia.deleteMany({ where: { inmuebleId: inmueble.id } });
    await prisma.inmuebleCatastro.delete({ where: { id: inmueble.id } });

    return NextResponse.json(
      { success: true, mensaje: `Censo ${inmueble.codigoCatastral} eliminado correctamente de la base de datos.` },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error en API censo DELETE:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar censo' },
      { status: 500, headers: corsHeaders }
    );
  }
}
