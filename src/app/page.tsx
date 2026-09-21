import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getTasaBcvActual } from '@/lib/bcv';
import { Truck, Users, ArrowRight, CheckCircle2, QrCode } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const tasaBcv = await getTasaBcvActual();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      <Navbar tasaBcv={tasaBcv.valorUsdBs} />

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          {/* Logo Oficial IMAUR en la web */}
          <div className="flex justify-center pt-2">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-sky-500 rounded-3xl blur opacity-30 group-hover:opacity-70 transition duration-500"></div>
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border-2 border-amber-400/80 bg-slate-900/90 shadow-2xl p-1.5 flex items-center justify-center group-hover:scale-105 transition-transform">
                <img
                  src="/icons/imaur_logo_512.png"
                  alt="Logo Oficial IMAUR - Rosario de Perijá"
                  className="w-full h-full object-contain drop-shadow-md"
                />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Plan Piloto Operativo: Sector Las Colinas • Parroquia El Rosario
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Sistema Integral de <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">Aseo Urbano (IMAUR)</span> y Control Fiscal
          </h1>
          <p className="text-base sm:text-lg text-slate-400">
            Plataforma municipal de recaudación digital a tasa oficial BCV, auditoría inmutable para la Contraloría Municipal, herramientas de censo GPS en campo y operativa para cuadrillas de recolección en Rosario de Perijá.
          </p>
        </div>

        {/* 3 Main Apps Access Cards (Exacto a produccion en 13.140.37.157 con las mejoras IMAUR) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* Card 1: App Ciudadana */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-sky-500/30 rounded-3xl p-6 shadow-xl hover:border-sky-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">App Ciudadana</h3>
                <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider mt-0.5">Web / PWA Móvil</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Consulta de solvencia por cédula, cronograma de recolección, reporte geolocalizado con foto y Pago Móvil con tasa oficial BCV.
              </p>
              <ul className="text-xs text-slate-300 space-y-1 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Sin contraseñas difíciles</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Pago Móvil a tasa oficial</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Recibo digital inmutable con QR</span>
                </li>
              </ul>
            </div>
            <div className="pt-5">
              <Link
                href="/ciudadano"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-sky-600/30 transition-all"
              >
                <span>Portal Ciudadano</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: App de Cuadrilla */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-xl hover:border-amber-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">App de Cuadrilla</h3>
                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mt-0.5">Operativa en Campo</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interfaz de alto contraste para camiones. Checklist de tramos a un toque, geocerca de asistencia y cierre con foto de evidencia.
              </p>
              <ul className="text-xs text-slate-300 space-y-1 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Botones grandes para sol y guantes</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Asistencia con geocerca GPS</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Foto de evidencia obligatoria</span>
                </li>
              </ul>
            </div>
            <div className="pt-5">
              <Link
                href="/cuadrilla"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-600/30 transition-all"
              >
                <span>App Cuadrilla</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: App para el Censo (MODIFICADA SEGÚN SOLICITUD) */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 shadow-xl hover:border-indigo-500 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">App para el Censo</h3>
                <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mt-0.5">Descarga Oficial APK</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                App móvil oficial para empadronadores casa x casa con GPS satelital, geocerca de La Villa del Rosario y sincronización directa.
              </p>
              <ul className="text-xs text-slate-300 space-y-1 pt-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span>Código QR para descarga directa</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span>GPS satelital con geocerca Villa</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span>Acceso con tu usuario de la web</span>
                </li>
              </ul>
            </div>
            <div className="pt-5">
              <Link
                href="/censo"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>App para el Censo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>


        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>Alcaldía del Municipio Rosario de Perijá • Estado Zulia, Venezuela</p>
        <p className="mt-1">Sistema Integral de Recolección de Desechos Sólidos con Cobro Digital • Gestión 2026</p>
      </footer>
    </div>
  );
}
