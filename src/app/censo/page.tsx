"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { ArrowLeft, Download, Smartphone, QrCode, Shield, CheckCircle2, Copy, Check } from 'lucide-react';

export default function DescargarAppCensoPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [apkUrl, setApkUrl] = useState<string>('/censo-aseo-alcaldia.apk');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let fullUrl = '/censo-aseo-alcaldia.apk';
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        fullUrl = 'http://192.168.86.248:5000/censo-aseo-alcaldia.apk';
      } else {
        fullUrl = `${window.location.origin}/censo-aseo-alcaldia.apk`;
      }
      setApkUrl(fullUrl);

      QRCode.toDataURL(fullUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0284c7',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      }).then(url => {
        setQrDataUrl(url);
      }).catch(err => {
        console.error('Error generando QR:', err);
      });
    }
  }, []);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(apkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs text-slate-400 font-medium">Alcaldía Rosario de Perijá</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 flex flex-col items-center justify-center">
        <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Header Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Descarga Oficial APK para Android</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              App para el <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">Censo Territorial</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Escanea el código QR desde tu teléfono Android o descarga el instalador APK directamente para iniciar el empadronamiento catastral con GPS satelital.
            </p>
          </div>

          {/* QR & Download Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center gap-8">
            
            {/* QR Section */}
            <div className="flex flex-col items-center shrink-0">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-slate-800">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR para descargar APK de Censo"
                    className="w-56 h-56 rounded-xl"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center bg-slate-100 text-slate-400">
                    <QrCode className="w-12 h-12 animate-pulse" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-3 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Apunta la cámara de tu teléfono</span>
              </p>
            </div>

            {/* Actions & Details Section */}
            <div className="flex-1 space-y-5 w-full text-left">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span>Instalador Municipal Verificado</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Paquete firmado digitalmente por la Dirección de Aseo Urbano y Catastro.
                </p>
              </div>

              {/* Technical Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Archivo</span>
                  <span className="font-mono text-slate-200 font-bold truncate block">censo-aseo-alcaldia.apk</span>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tamaño</span>
                  <span className="font-mono text-emerald-400 font-bold block">124.7 KB (Ultraligero)</span>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Compatibilidad</span>
                  <span className="text-slate-200 font-bold block">Android 7.0 o superior</span>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Versión</span>
                  <span className="text-sky-400 font-bold block">v2.4 (Rosario de Perijá)</span>
                </div>
              </div>

              {/* Direct Download Button */}
              <div className="space-y-2 pt-1">
                <a
                  href="/censo-aseo-alcaldia.apk"
                  download="censo-aseo-alcaldia.apk"
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-6 bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600 hover:opacity-95 active:scale-[0.99] text-white rounded-2xl font-black text-sm sm:text-base shadow-xl shadow-sky-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5 animate-bounce" />
                  <span>Descargar APK Directamente</span>
                </a>

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Enlace copiado para compartir por WhatsApp!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar enlace de descarga directa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Installation Steps Guide */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 text-left space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋 Pasos para Instalar en tu Teléfono:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-black">1</div>
                <h4 className="font-bold text-white text-sm">Escanea o Descarga</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Apunta con la cámara de tu teléfono al código QR de arriba o presiona el botón de descarga directa.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">2</div>
                <h4 className="font-bold text-white text-sm">Acepta la Descarga</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Si tu teléfono muestra una advertencia de seguridad de Android, selecciona <strong>"Descargar de todos modos"</strong>.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">3</div>
                <h4 className="font-bold text-white text-sm">Instala la Aplicación</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Toca la notificación de descarga o abre tu carpeta de Descargas. Si es la primera vez, activa <strong>"Permitir desde esta fuente"</strong>.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">4</div>
                <h4 className="font-bold text-white text-sm">Inicia Sesión con tu Usuario</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Abre la App e introduce el <strong>Usuario y Contraseña</strong> que creaste previamente en esta página web del Aseo Urbano.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>Alcaldía del Municipio Rosario de Perijá • Estado Zulia, Venezuela</p>
        <p className="mt-0.5 text-[11px]">Dirección de Aseo Urbano, Catastro y Recaudación Digital • Gestión 2026</p>
      </footer>
    </div>
  );
}
