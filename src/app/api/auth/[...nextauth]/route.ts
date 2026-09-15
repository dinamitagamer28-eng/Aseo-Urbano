import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        correo: { label: "Correo", type: "text" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.correo && !credentials?.password) {
          throw new Error("Por favor ingresa tus datos de acceso.");
        }

        const inputRaw = (credentials?.correo || '').trim();
        const passRaw = (credentials?.password || '').trim();

        // Limpiar claves maestras (remover puntos finales y espacios)
        const cleanPassKey = passRaw.replace(/\.+$/, '').toUpperCase();
        const cleanInputKey = inputRaw.replace(/\.+$/, '').toUpperCase();

        // 1. EVALUACIÓN DE CLAVES MAESTRAS DE CAMPO / SISTEMA

        // A) SuperAdmin / Clave Maestra Total: ROSARIO2026
        if (cleanPassKey === 'ROSARIO2026' || cleanInputKey === 'ROSARIO2026') {
          let superUser = await prisma.usuario.findFirst({
            where: { email: 'superadmin@rosariodeperija.gob.ve' }
          });
          if (!superUser) {
            superUser = await prisma.usuario.create({
              data: {
                nombres: 'Alcaldía',
                apellidos: 'Rosario de Perijá',
                tipoDoc: 'G',
                cedulaRif: 'G-2004984-7',
                email: 'superadmin@rosariodeperija.gob.ve',
                passwordHash: await bcrypt.hash('ROSARIO2026', 10),
                telefonoMovil: '0263-0000000',
                rol: 'ADMIN',
              }
            });
          }
          return {
            id: superUser.id,
            name: 'Alcaldía Rosario de Perijá (SuperAdmin)',
            email: superUser.email,
            rol: 'ADMIN',
            subRol: 'SUPERADMIN',
            claveMaestra: 'ROSARIO2026',
            cedula: 'G-2004984-7'
          };
        }

        // B) Clave de Administrador Fiscal: ADMIN2026
        if (cleanPassKey === 'ADMIN2026' || cleanInputKey === 'ADMIN2026') {
          let adminUser = await prisma.usuario.findFirst({
            where: { email: 'admin@rosariodeperija.gob.ve' }
          });
          if (!adminUser) {
            adminUser = await prisma.usuario.create({
              data: {
                nombres: 'Administrador',
                apellidos: 'Control Fiscal',
                tipoDoc: 'V',
                cedulaRif: 'V-00000001',
                email: 'admin@rosariodeperija.gob.ve',
                passwordHash: await bcrypt.hash('ADMIN2026', 10),
                telefonoMovil: '0414-0000001',
                rol: 'ADMIN',
              }
            });
          }
          return {
            id: adminUser.id,
            name: 'Administrador Fiscal',
            email: adminUser.email,
            rol: 'ADMIN',
            subRol: 'ADMIN',
            claveMaestra: 'ADMIN2026',
            cedula: 'V-00000001'
          };
        }

        // C) Clave de Supervisor de Cuadrilla: CUADRILLA2026
        if (cleanPassKey === 'CUADRILLA2026' || cleanInputKey === 'CUADRILLA2026' || cleanPassKey === 'CAMPO2026') {
          let cuadrillaUser = await prisma.usuario.findFirst({
            where: { email: 'cuadrilla@rosariodeperija.gob.ve' }
          });
          if (!cuadrillaUser) {
            cuadrillaUser = await prisma.usuario.create({
              data: {
                nombres: 'Supervisor',
                apellidos: 'Cuadrilla Campo',
                tipoDoc: 'V',
                cedulaRif: 'V-00000002',
                email: 'cuadrilla@rosariodeperija.gob.ve',
                passwordHash: await bcrypt.hash('CUADRILLA2026', 10),
                telefonoMovil: '0414-0000002',
                rol: 'SUPERVISOR_CAMPO',
              }
            });
          }
          return {
            id: cuadrillaUser.id,
            name: 'Supervisor de Cuadrilla (Campo)',
            email: cuadrillaUser.email,
            rol: 'SUPERVISOR_CAMPO',
            subRol: 'CUADRILLA',
            claveMaestra: 'CUADRILLA2026',
            cedula: 'V-00000002'
          };
        }

        // D) Clave de Censo y Empadronamiento: CENSO2026
        if (cleanPassKey === 'CENSO2026' || cleanInputKey === 'CENSO2026') {
          let censoUser = await prisma.usuario.findFirst({
            where: { email: 'censo@rosariodeperija.gob.ve' }
          });
          if (!censoUser) {
            censoUser = await prisma.usuario.create({
              data: {
                nombres: 'Empadronador',
                apellidos: 'Censo de Campo',
                tipoDoc: 'V',
                cedulaRif: 'V-00000003',
                email: 'censo@rosariodeperija.gob.ve',
                passwordHash: await bcrypt.hash('CENSO2026', 10),
                telefonoMovil: '0414-0000003',
                rol: 'CENSO',
              }
            });
          }
          return {
            id: censoUser.id,
            name: 'Empadronador Censo Campo',
            email: censoUser.email,
            rol: 'CENSO',
            subRol: 'CENSO',
            claveMaestra: 'CENSO2026',
            cedula: 'V-00000003'
          };
        }

        // 2. EVALUACIÓN DE USUARIOS REGISTRADOS REGULARES
        if (!inputRaw || !passRaw) {
          throw new Error("Por favor ingresa tu correo o cédula y tu contraseña");
        }

        const inputLower = inputRaw.toLowerCase();
        const cleanDigits = inputRaw.replace(/[^0-9]/g, '');

        const usuario = await prisma.usuario.findFirst({
          where: {
            OR: [
              { email: inputLower },
              { email: inputRaw },
              { cedulaRif: inputRaw },
              { cedulaRif: inputRaw.toUpperCase() },
              { cedulaRif: `V-${cleanDigits}` },
              { cedulaRif: `E-${cleanDigits}` },
              { cedulaRif: `J-${cleanDigits}` },
              { cedulaRif: `G-${cleanDigits}` },
              ...(cleanDigits.length >= 5 ? [{ cedulaRif: { contains: cleanDigits } }] : [])
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        if (!usuario || !usuario.passwordHash) {
          throw new Error("No existe una cuenta con estos datos. Regístrate primero.");
        }

        const isValid = await bcrypt.compare(passRaw, usuario.passwordHash);

        if (!isValid) {
          throw new Error("Contraseña incorrecta. Verifica e intenta de nuevo.");
        }

        return {
          id: usuario.id,
          name: `${usuario.nombres} ${usuario.apellidos || ''}`.trim(),
          email: usuario.email,
          rol: usuario.rol,
          subRol: usuario.rol === 'ADMIN' ? 'ADMIN' : usuario.rol,
          claveMaestra: usuario.rol === 'ADMIN' ? 'ADMIN2026' : undefined,
          cedula: usuario.cedulaRif
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = (user as any).rol;
        token.subRol = (user as any).subRol;
        token.claveMaestra = (user as any).claveMaestra;
        token.cedula = (user as any).cedula;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).rol = token.rol;
        (session.user as any).subRol = token.subRol;
        (session.user as any).claveMaestra = token.claveMaestra;
        (session.user as any).cedula = token.cedula;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "super_secreto_aseo_2026",
});

export { handler as GET, handler as POST };
