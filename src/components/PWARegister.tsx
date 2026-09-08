'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA ServiceWorker registrado con éxito:', reg.scope);
          })
          .catch((err) => {
            console.warn('Error al registrar ServiceWorker:', err);
          });
      });
    }
  }, []);

  return null;
}
