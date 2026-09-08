import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#d97706',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Aseo Rosario - App Cuadrilla | Operativa de Campo',
  description: 'Aplicación Operativa de Cuadrillas de Aseo Urbano - Municipio Rosario de Perijá',
  manifest: '/manifest-cuadrilla.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'App Cuadrilla',
  },
  icons: {
    icon: [
      { url: '/icons/cuadrilla-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/cuadrilla-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/cuadrilla-apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function CuadrillaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
