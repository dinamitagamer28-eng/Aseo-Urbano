import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Aseo Rosario - Panel Fiscal & Taquilla',
  description: 'Sistema Administrativo, Liquidación de Pagos y Auditoría Fiscal - Municipio Rosario de Perijá',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
