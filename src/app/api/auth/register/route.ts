import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    let { correo, password, nombre, tipoDoc, documento, telefono, sectorId, ubicacion, claveAcceso } = data;

    correo = (correo || '').trim().toLowerCase();
    password = (password || '').trim();
    nombre = (nombre || '').trim();
    tipoDoc = (tipoDoc || 'V').toUpperCase();
    const docClean = (documento || '').toString().replace(/[^0-9]/g, '');

    if (!correo || !password || !nombre || !docClean) {
      return NextResponse.json({ message: "Por favor completa todos los campos obligatorios." }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ message: "La contraseña debe tener al menos 4 caracteres." }, { status: 400 });
    }

    let rol = 'CIUDADANO';
    if (claveAcceso && claveAcceso.trim().length > 0) {
      const cleanKey = claveAcceso.trim().toUpperCase();
      if (cleanKey === 'ROSARIO2026' || cleanKey === 'ADMIN2026') {
        rol = 'ADMIN';
      } else if (cleanKey === 'CUADRILLA2026' || cleanKey === 'CAMPO2026' || cleanKey === 'SUPERVISOR2026') {
        rol = 'SUPERVISOR_CAMPO';
      } else {
        return NextResponse.json({ 
          message: "La Clave de Empleado ingresada es incorrecta. Si eres ciudadano deja este campo vacío." 
        }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cedulaCompleta = `${tipoDoc}-${docClean}`;

    // Verificar si ya existe por cédula o correo
    const exists = await prisma.usuario.findFirst({
      where: {
        OR: [
          { cedulaRif: cedulaCompleta },
          { cedulaRif: docClean },
          { email: correo }
        ]
      }
    });

    if (exists) {
      return NextResponse.json({ 
        message: exists.email === correo
          ? "Este correo electrónico ya está registrado. Inicia sesión directamente."
          : "Esta cédula ya se encuentra registrada en el sistema."
      }, { status: 400 });
    }

    // Buscar sector seleccionado o fallback al primer sector
    let sector = null;
    if (sectorId) {
      sector = await prisma.sector.findUnique({
        where: { id: sectorId },
        include: { callesTramos: true }
      });
    }

    if (!sector) {
      sector = await prisma.sector.findFirst({
        where: { nombre: { contains: 'Las Colinas' } },
        include: { callesTramos: true }
      }) || await prisma.sector.findFirst({ include: { callesTramos: true } });
    }

    if (!sector) {
      return NextResponse.json({ message: "Error interno: no hay sectores configurados." }, { status: 500 });
    }

    let calleId = sector.callesTramos && sector.callesTramos.length > 0 ? sector.callesTramos[0].id : null;

    if (!calleId) {
       const nuevaCalle = await prisma.calleTramo.create({
         data: {
           sectorId: sector.id,
           nombreCalle: 'Calle Principal',
           diaRecoleccion: 'LUNES Y JUEVES'
         }
       });
       calleId = nuevaCalle.id;
    }

    const ubicacionFinal = (ubicacion || '').trim() || `Sector ${sector.nombre}`;

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombres: nombre,
        apellidos: '',
        tipoDoc,
        cedulaRif: cedulaCompleta,
        email: correo,
        passwordHash: hashedPassword,
        telefonoMovil: (telefono || '').trim(),
        rol,
        inmueblesRelacionados: {
          create: {
            tipoRelacion: 'PROPIETARIO',
            inmueble: {
              create: {
                codigoCatastral: `REG-C-${docClean}`,
                sectorId: sector.id,
                calleId: calleId,
                numeroCasaLocal: ubicacionFinal,
                tarifaBaseUsd: 3.00,
                estadoCuenta: 'SOLVENTE'
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ message: "Registro exitoso", userId: nuevoUsuario.id, rol }, { status: 201 });

  } catch (error: any) {
    console.error("Error al registrar:", error);
    return NextResponse.json({ message: "Error interno del servidor al procesar el registro" }, { status: 500 });
  }
}
