import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { correo, password, nombre, tipoDoc, documento, telefono, sectorId, ubicacion, claveAcceso } = data;

    if (!correo || !password || !nombre || !documento || !sectorId || !ubicacion) {
      return NextResponse.json({ message: "Faltan datos obligatorios" }, { status: 400 });
    }

    let rol = 'CIUDADANO';
    if (claveAcceso && claveAcceso.trim().length > 0) {
      const cleanKey = claveAcceso.trim().toUpperCase();
      if (cleanKey === 'ROSARIO2026') {
        rol = 'ADMIN';
      } else {
        return NextResponse.json({ 
          message: "La Clave de Empleado ingresada es incorrecta. Si eres ciudadano deja este campo vacío." 
        }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cedulaCompleta = `${tipoDoc}-${documento}`;

    // Verificar si ya existe por cédula o correo
    const exists = await prisma.usuario.findFirst({
      where: {
        OR: [
          { cedulaRif: cedulaCompleta },
          { email: correo.trim().toLowerCase() }
        ]
      }
    });

    if (exists) {
      return NextResponse.json({ 
        message: exists.email === correo.trim().toLowerCase()
          ? "Este correo electrónico ya está registrado. Inicia sesión directamente."
          : "Esta cédula ya se encuentra registrada en el sistema."
      }, { status: 400 });
    }

    // Para la tarifa fija de $3.00, y asignar el sector elegido
    const sector = await prisma.sector.findUnique({
      where: { id: sectorId },
      include: { callesTramos: true }
    });

    if (!sector) {
      return NextResponse.json({ message: "Sector no válido" }, { status: 400 });
    }

    let calleId = sector.callesTramos.length > 0 ? sector.callesTramos[0].id : null;

    if (!calleId) {
       // Create a default street for the sector if none exists
       let dia = 'LUNES Y JUEVES';
       if (sector.codigo === 'SEC-CENTRO') dia = 'MARTES Y VIERNES';
       if (sector.codigo === 'SEC-NORUEGA') dia = 'MIERCOLES Y SABADO';
       const nuevaCalle = await prisma.calleTramo.create({
         data: {
           sectorId: sector.id,
           nombreCalle: 'Calle Principal',
           diaRecoleccion: dia
         }
       });
       calleId = nuevaCalle.id;
    }

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombres: nombre,
        apellidos: '',
        tipoDoc,
        cedulaRif: cedulaCompleta,
        email: correo,
        passwordHash: hashedPassword,
        telefonoMovil: telefono || '',
        rol,
        inmueblesRelacionados: {
          create: {
            tipoRelacion: 'PROPIETARIO',
            inmueble: {
              create: {
                codigoCatastral: `REG-C-${documento}`,
                sectorId: sector.id,
                calleId: calleId,
                numeroCasaLocal: ubicacion,
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
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
