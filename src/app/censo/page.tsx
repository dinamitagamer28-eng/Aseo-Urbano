'use client';

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
        fullUrl = 'http://13.140.37.157/censo-aseo-alcaldia.apk';
      } else {
        fullUrl = `${window.location.origin}/censo-aseo-alcaldia.apk`;
      }
      setApkUrl(fullUrl);

      QRCode.toDataURL(fullUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0b3b24',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => {
          setQrDataUrl(url);
        })
        .catch((err) => {
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-700 hover:text-emerald-700 transition py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl overflow-hidden bg-white border border-slate-200 p-0.5 flex items-center justify-center">
              <img src="/icons/imaur_logo.png" alt="IMAUR" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs text-slate-800 font-black">Alcaldía de Rosario de Perijá • IMAUR</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 flex flex-col items-center justify-center">
        <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
          {/* Header Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider shadow-sm">
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Descarga Oficial APK para Android</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              App para el{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-green-700 to-emerald-800">
                Censo Territorial
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
              Escanea el código QR desde tu teléfono Android o descarga el instalador APK directamente para iniciar el empadronamiento catastral con GPS satelital sincronizado en vivo con la web municipal.
            </p>
          </div>

          {/* QR & Download Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center gap-8">
            {/* QR Section */}
            <div className="flex flex-col items-center shrink-0">
              <div className="p-3 bg-white rounded-2xl shadow-lg border-4 border-emerald-100">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR para descargar APK de Censo"
                    className="w-56 h-56 rounded-xl"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400">
                    <QrCode className="w-12 h-12 animate-pulse" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Apunta la cámara de tu teléfono para descargar</span>
              </p>
            </div>

            {/* Information & Direct Download */}
            <div className="flex-1 space-y-5 text-left w-full">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Versión 2.0 Oficial
                  </span>
                  <span className="text-xs text-slate-500">• 260 KB • APK Firmado</span>
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Censo y Catastro Municipal IMAUR
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Diseñado para empadronadores de campo, inspectores fiscales y cuadrillas. Permite registrar viviendas, negocios, validar solvencias y sincronizar en vivo con el panel del administrador.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Geolocalización GPS satelital</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Funciona sin conexión (Offline)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>27 Sectores y 120 Calles oficiales</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sincronización directa bidireccional</span>
                </div>
              </div>

              {/* Direct Download Button */}
              <div className="space-y-3 pt-2">
                <a
                  href="/censo-aseo-alcaldia.apk"
                  download="censo-aseo-alcaldia.apk"
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-emerald-700/20 active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Instalador APK Directo</span>
                </a>

                {/* Direct Link Box */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs">
                  <span className="text-slate-400 font-mono text-[11px] truncate flex-1 px-2">
                    {apkUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition shrink-0"
                    title="Copiar enlace directo"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Alcaldía Bolivariana de Rosario de Perijá • IMAUR • Estado Zulia</p>
      </footer>
    </div>
  );
}
