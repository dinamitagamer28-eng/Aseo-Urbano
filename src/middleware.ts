import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Permitir acceso público a login y registro ciudadano
    if (pathname.startsWith("/ciudadano/login") || pathname.startsWith("/ciudadano/registro")) {
      return NextResponse.next();
    }

    // Solo usuarios con rol ADMIN pueden entrar a /admin
    if (pathname.startsWith("/admin") && token?.rol !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        if (pathname.startsWith("/ciudadano/login") || pathname.startsWith("/ciudadano/registro")) {
          return true;
        }
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/ciudadano/:path*", "/cuadrilla/:path*", "/admin/:path*"],
};
