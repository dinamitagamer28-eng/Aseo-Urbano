import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import prisma from '@/lib/prisma';
import { getTasaBcvActual } from '@/lib/bcv';
import { Truck, Users, ShieldCheck, DollarSign, ArrowRight, MapPin, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const tasaBcv = await getTasaBcvActual();

  // Metrics from DB
  const totalInmuebles = await prisma.inmuebleCatastro.count();
  const totalSectores = await prisma.sector.count();
  const totalRecaudado = await prisma.reciboPago.aggregate({
    _sum: { montoTotalBs: true, montoTotalUsd: true },
    where: { estado: 'APROBADO' },
  });
  const totalReportesResueltos = await prisma.reporteIncidencia.count({
    where: { estado: 'RESUELTO' },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      <Navbar tasaBcv={tasaBcv.valorUsdBs} />

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Plan Piloto Operativo: Sector Las Colinas • Parroquia El Rosario
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Sistema Integral de <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">Aseo Urbano</span> y Control Fiscal
          </h1>
          <p className="text-base sm:text-lg text-slate-400">
            Plataforma municipal de recaudación digital a tasa oficial BCV, auditoría inmutable para la Contraloría Municipal y herramientas operativas para cuadrillas de recolección en Rosario de Perijá.
          </p>
        </div>

        {/* Live KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs text-slate-400 font-medium">Recaudación Neta</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              Bs. {(totalRecaudado._sum.montoTotalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Equiv. ${(totalRecaudado._sum.montoTotalUsd || 0).toFixed(2)} USD
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs text-slate-400 font-medium">Padrón Catastral</div>
            <div className="text-2xl font-black text-sky-400 mt-1 font-mono">
              {totalInmuebles} <span className="text-sm font-normal text-slate-400">viviendas</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Sector Las Colinas (Piloto)
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs text-slate-400 font-medium">Sectores Mapeados</div>
            <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
              {totalSectores} <span className="text-sm font-normal text-slate-400">zonas</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Expansión a toda La Villa
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="text-xs text-slate-400 font-medium">Incidencias Resueltas</div>
            <div className="text-2xl font-black text-purple-400 mt-1 font-mono">
              {totalReportesResueltos} <span className="text-sm font-normal text-slate-400">con foto</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              100% con evidencia en campo
            </div>
          </div>
        </div>

        {/* 3 Main Apps Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Card 1: App Ciudadana */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-sky-500/30 rounded-3xl p-7 shadow-xl hover:border-sky-500 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">App Ciudadana</h3>
                <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider mt-0.5">Web / PWA Móvil</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Consulta de solvencia por cédula, cronograma de recolección en Las Colinas, reporte geolocalizado de basura con foto y pasarela de Pago Móvil con tasa oficial BCV y recibo QR.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Sin contraseñas difíciles (Cédula/RIF)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Pago Móvil en Bolívares a tasa oficial</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Comprobante digital inmutable con QR</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link
                href="/ciudadano"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-sky-600/30 transition-all"
              >
                <span>Ingresar al Portal Ciudadano</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: App de Cuadrilla */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-amber-500/30 rounded-3xl p-7 shadow-xl hover:border-amber-500 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">App de Cuadrilla</h3>
                <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mt-0.5">Operativa en Campo</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Interfaz de alto contraste táctil para supervisores y camiones. Checklist de tramos a un solo toque, geocerca de asistencia en Las Colinas y resolución de reportes con foto de evidencia obligatoria.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Botones gigantes (58px+) para sol y guantes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Marcaje de asistencia con geocerca GPS</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Cierre bloqueado sin foto de evidencia</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link
                href="/cuadrilla"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-600/30 transition-all"
              >
                <span>Abrir App de Campo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Panel Admin & Taquilla */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-emerald-500/30 rounded-3xl p-7 shadow-xl hover:border-emerald-500 transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Panel Admin & Taquilla</h3>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">Gestión y Contraloría</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tablero de control gerencial con PrimeReact DataTables. Módulo de taquilla express para cobro presencial en ventanilla y exportación de Libros de Ingresos Correlativos en Excel y PDF para Contraloría.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Taquilla express con recibos térmicos</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Exportación a Excel / PDF para Contraloría</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Zonificación de tarifas por sector</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <Link
                href="/admin"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all"
              >
                <span>Entrar al Panel de Control</span>
                <ArrowRight className="w-4 h-4" />
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
