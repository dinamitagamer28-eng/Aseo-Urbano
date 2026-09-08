'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Download, X, Share, PlusSquare, Check } from 'lucide-react';

export default function PWAInstallCuadrilla() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      const userAgent = window.navigator.userAgent.toLowerCase();
      const iosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(iosDevice);

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      window.addEventListener('appinstalled', () => {
        setIsInstallable(false);
        setInstalledSuccessfully(true);
        setTimeout(() => setInstalledSuccessfully(false), 5000);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowIOSModal(true);
    }
  };

  if (isStandalone) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 border border-amber-500/40 p-3 sm:p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-100 animate-in fade-in">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-2">
              Instalar App Cuadrilla (Campo)
              <span className="text-[10px] uppercase font-extrabold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded">
                PWA OPERATIVA
              </span>
            </div>
            <p className="text-xs text-amber-200/80">
              Instala la aplicación en el teléfono del supervisor o chofer para marcar rutas y evidencias en campo sin navegador.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {installedSuccessfully ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-2 rounded-xl">
              <Check className="w-4 h-4" /> App Instalada
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all transform active:scale-95"
            >
              <Download className="w-4 h-4" />
              Instalar en Dispositivo
            </button>
          )}
        </div>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 relative text-slate-100">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Truck className="w-7 h-7 text-slate-950" />
              </div>
              <h3 className="text-lg font-bold text-white">Instalar App Cuadrilla</h3>
              <p className="text-xs text-slate-400">
                Agrega la App Cuadrilla de Rosario de Perijá a la pantalla de inicio del dispositivo de campo:
              </p>
            </div>

            <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-900/80 border border-amber-600/50 flex items-center justify-center font-bold text-amber-300 shrink-0">
                  1
                </div>
                <div className="text-slate-300">
                  Toca el botón <strong className="text-white">Compartir</strong> <Share className="w-3.5 h-3.5 inline text-amber-400 mx-1" /> o el menú de tres puntos <strong className="text-white">⋮</strong> del navegador.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-900/80 border border-amber-600/50 flex items-center justify-center font-bold text-amber-300 shrink-0">
                  2
                </div>
                <div className="text-slate-300">
                  Selecciona <strong className="text-white">"Agregar a la pantalla de inicio"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-amber-400 mx-1" /> o <strong className="text-white">"Instalar aplicación"</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-900/80 border border-amber-600/50 flex items-center justify-center font-bold text-amber-300 shrink-0">
                  3
                </div>
                <div className="text-slate-300">
                  Confirma tocando <strong className="text-white">"Agregar"</strong>. La App quedará lista como acceso directo en campo.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
