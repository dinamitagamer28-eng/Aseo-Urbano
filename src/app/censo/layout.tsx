import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Aseo Rosario - Censo Catastral & Empadronamiento de Campo',
  description: 'Aplicación PWA Móvil para Empadronadores de Campo - Censo Casa por Casa y Geolocalización Catastral en Rosario de Perijá',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Censo Rosario',
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

export default function CensoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
