import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#0284c7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Aseo Rosario - App Ciudadana | Portal del Contribuyente',
  description: 'Aplicación Móvil del Contribuyente - Consulta de Solvencia, Pago de Tasa y Reporte de Incidencias',
  manifest: '/manifest-ciudadano.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aseo Ciudadano',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function CiudadanoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
