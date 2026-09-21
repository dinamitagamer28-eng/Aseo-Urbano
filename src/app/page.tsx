import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getTasaBcvActual } from '@/lib/bcv';
import { Truck, Users, ArrowRight, CheckCircle2, QrCode } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const tasaBcv = await getTasaBcvActual();

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col selection:bg-emerald-600 selection:text-white">
      <Navbar tasaBcv={tasaBcv.valorUsdBs} />

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          {/* Logo Oficial IMAUR en la web */}
          <div className="flex justify-center pt-2">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-600 rounded-3xl blur opacity-25 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-2 border-emerald-400/80 bg-white shadow-xl p-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                <img
                  src="/icons/imaur_logo.png"
                  alt="Logo Oficial IMAUR - Rosario de Perijá"
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide uppercase shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
            Plan Piloto Operativo: 27 Sectores • Cobertura Municipal 2026
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            Sistema Integral de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-green-700 to-emerald-800">
              Aseo Urbano (IMAUR)
            </span>{' '}
            y Control Fiscal
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Plataforma municipal de recaudación digital a tasa oficial BCV, auditoría inmutable para la Contraloría Municipal, herramientas de censo GPS en campo y operativa para cuadrillas de recolección en Rosario de Perijá.
          </p>
        </div>

        {/* 3 Main Apps Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Card 1: App Ciudadana */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md hover:shadow-xl hover:border-emerald-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">App Ciudadana</h3>
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-0.5">Web / PWA Móvil</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consulta de solvencia por cédula, cronograma de recolección, reporte geolocalizado con foto y Pago Móvil con tasa oficial BCV.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Sin contraseñas difíciles</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Pago Móvil a tasa oficial</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Recibo digital inmutable con QR</span>
                </li>
              </ul>
            </div>
            <div className="pt-5">
              <Link
                href="/ciudadano"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-700/20 transition-all"
              >
                <span>Portal Ciudadano</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: App de Cuadrilla */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md hover:shadow-xl hover:border-amber-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">App de Cuadrilla</h3>
                <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mt-0.5">Operativa en Campo</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Interfaz de alto contraste para camiones. Checklist de tramos a un toque, geocerca de asistencia y cierre con foto de evidencia.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Botones grandes para sol y guantes</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Asistencia con geocerca GPS</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Foto de evidencia obligatoria</span>
                </li>
              </ul>
            </div>
            <div className="pt-5">
              <Link
                href="/cuadrilla"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 transition-all"
              >
                <span>App Cuadrilla</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: App para el Censo */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md hover:shadow-xl hover:border-blue-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">App para el Censo</h3>
                <p className="text-xs text-blue-700 font-bold uppercase tracking-wider mt-0.5">Descarga Oficial APK</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                App móvil oficial para empadronadores casa x casa con GPS satelital, geocerca de La Villa del Rosario y sincronización directa.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Código QR para descarga directa</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>GPS satelital con geocerca Villa</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>Acceso con tu usuario de la web</span>
                </li>
              </ul>
            </div>
            <div className="pt-5">
              <Link
                href="/censo"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-700/20 transition-all cursor-pointer"
              >
                <span>App para el Censo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Alcaldía Bolivariana de Rosario de Perijá • IMAUR • Estado Zulia, Venezuela</p>
        <p className="mt-1 text-slate-500">Sistema Integral de Recolección de Desechos Sólidos con Cobro Digital • Gestión 2026</p>
      </footer>
    </div>
  );
}
