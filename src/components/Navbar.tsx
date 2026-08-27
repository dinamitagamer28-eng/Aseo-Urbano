'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, Home, ShieldCheck, Users, DollarSign } from 'lucide-react';

interface NavbarProps {
  tasaBcv?: number;
}

export default function Navbar({ tasaBcv = 65.40 }: NavbarProps) {
  const pathname = usePathname();

  const isCuadrilla = pathname.startsWith('/cuadrilla');

  return (
    <header className={`${isCuadrilla ? 'bg-slate-950 border-amber-500/30' : 'bg-slate-900 border-slate-800'} border-b text-white sticky top-0 z-50 transition-colors`}>
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
            <span>Tasa Oficial BCV: <strong className="text-white">Bs. {tasaBcv.toFixed(2)}</strong> / USD</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-600 p-0.5 shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
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
          </Link>

          {/* Navigation Apps Switcher */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
            <Link
              href="/ciudadano"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === '/ciudadano'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Users className="w-4 h-4 text-sky-300" />
              <span>App Ciudadana</span>
            </Link>

            <Link
              href="/cuadrilla"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === '/cuadrilla'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>App Cuadrilla (Campo)</span>
            </Link>

            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === '/admin'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Panel Admin & Taquilla</span>
            </Link>
          </nav>

          {/* Home Link */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title="Portal Principal"
            >
              <Home className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
