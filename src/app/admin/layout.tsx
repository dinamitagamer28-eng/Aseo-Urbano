import type { Metadata, Viewport } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Panel Fiscal & Taquilla | Aseo Rosario',
  description: 'Panel Administrativo, Taquilla Municipal y Auditoría de Contraloría - Municipio Rosario de Perijá',
  applicationName: 'Aseo Admin PWA',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aseo Admin',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {children}
    </div>
  );
}
