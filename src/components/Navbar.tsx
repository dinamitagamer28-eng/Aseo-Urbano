'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, ShieldCheck, Users, DollarSign, Shield } from 'lucide-react';

interface NavbarProps {
  tasaBcv?: number;
}

export default function Navbar({ tasaBcv }: NavbarProps) {
  const pathname = usePathname();
  const [tasaState, setTasaState] = useState<number>(tasaBcv && tasaBcv > 0 ? tasaBcv : 832.49);

  useEffect(() => {
    if (tasaBcv && tasaBcv > 0) {
      setTasaState(tasaBcv);
    } else {
      fetch('/api/bcv')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.valorUsdBs) {
            setTasaState(data.valorUsdBs);
          }
        })
        .catch(() => {});
    }
  }, [tasaBcv]);

  const isCuadrilla = pathname.startsWith('/cuadrilla');
  const isCiudadano = pathname.startsWith('/ciudadano');
  const isAdmin = pathname.startsWith('/admin');
  const isHome = pathname === '/';

  return (
    <header
      className={`${
        isCuadrilla
          ? 'bg-slate-950 border-amber-500/30'
          : isAdmin
          ? 'bg-slate-950 border-emerald-500/30'
          : 'bg-slate-900 border-slate-800'
      } border-b text-white sticky top-0 z-50 transition-colors`}
    >
      {/* Top Banner Tasa Oficial BCV */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-sky-950 py-1.5 px-4 text-xs border-b border-sky-800/40">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Alcaldía del Municipio Rosario de Perijá</span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline text-slate-400">RIF: G-2004984-7</span>
          </div>
          <div className="flex items-center gap-2 bg-sky-900/60 px-2.5 py-0.5 rounded-full border border-sky-600/40 text-sky-200 font-semibold shadow-sm">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Tasa Oficial BCV: <strong className="text-white">Bs. {tasaState.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> / USD
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand per App */}
          {isCiudadano && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-600 p-0.5 shadow-lg shadow-sky-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
                  ASEO URBANO
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    App Ciudadana
                  </span>
                </div>
                <p className="text-xs text-slate-400">Portal Oficial del Contribuyente • Rosario de Perijá</p>
              </div>
            </div>
          )}

          {isCuadrilla && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
                  ASEO URBANO
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    App Cuadrilla
                  </span>
                </div>
                <p className="text-xs text-amber-200/70">Operativa de Campo • Cuadrillas y Turnos</p>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
                  ASEO URBANO
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Panel Fiscal
                  </span>
                </div>
                <p className="text-xs text-slate-400">Gestión, Taquilla & Contraloría Municipal</p>
              </div>
            </div>
          )}

          {isHome && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-600 p-0.5 shadow-lg shadow-sky-500/20 flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-1.5">
                  ASEO URBANO
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    Perijá Digital
                  </span>
                </div>
                <p className="text-xs text-slate-400">Rosario de Perijá • Edo. Zulia</p>
              </div>
            </div>
          )}

          {/* Right Status Badge */}
          <div className="flex items-center gap-2">
            {isCiudadano && (
              <div className="flex items-center gap-2 bg-sky-950/80 border border-sky-600/40 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-300">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                <span>PWA Ciudadana</span>
              </div>
            )}

            {isCuadrilla && (
              <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-600/40 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>PWA Cuadrilla</span>
              </div>
            )}

            {isAdmin && (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-600/40 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acceso Seguro</span>
              </div>
            )}

            {isHome && (
              <Link
                href="/login"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition shadow-md"
              >
                Ingresar al Sistema
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
