import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aseo Rosario - App Ciudadana',
    short_name: 'Aseo Ciudadano',
    description: 'Portal y Aplicación Móvil del Contribuyente - Municipio Rosario de Perijá',
    start_url: '/ciudadano',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#020617',
    theme_color: '#0284c7',
    categories: ['utilities', 'government', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icons/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml'
      }
    ],
    shortcuts: [
      {
        name: 'PWA Censo de Campo',
        url: '/censo',
        description: 'Empadronamiento casa por casa con GPS y QR'
      },
      {
        name: 'Consultar Solvencia y Pagar',
        url: '/ciudadano?tab=pago',
        description: 'Paga tu tasa de aseo con Pago Móvil o Zelle'
      },
      {
        name: 'App de Cuadrilla',
        url: '/cuadrilla',
        description: 'Control de recolección en campo y rutas'
      },
      {
        name: 'Reportar Incidencia',
        url: '/ciudadano?tab=reportar',
        description: 'Reporta acumulación de basura o solicita poda con foto'
      }
    ]
  };
}
