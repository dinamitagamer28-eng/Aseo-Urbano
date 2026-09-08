import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        correo: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.correo || !credentials?.password) {
          throw new Error("Faltan datos");
        }

        const usuario = await prisma.usuario.findFirst({
          where: { email: credentials.correo },
          orderBy: { createdAt: 'desc' }
        });

        if (!usuario || !usuario.passwordHash) {
          throw new Error("Usuario no encontrado");
        }

        const isValid = await bcrypt.compare(credentials.password, usuario.passwordHash);

        if (!isValid) {
          throw new Error("Contraseña incorrecta");
        }

        return {
          id: usuario.id,
          name: `${usuario.nombres} ${usuario.apellidos}`,
          email: usuario.email,
          rol: usuario.rol,
          cedula: usuario.cedulaRif
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = (user as any).rol;
        token.cedula = (user as any).cedula;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).rol = token.rol;
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
