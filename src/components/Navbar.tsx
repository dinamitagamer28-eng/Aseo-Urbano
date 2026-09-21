'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, ShieldCheck, Users, DollarSign, Shield, LogIn } from 'lucide-react';

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
    <header className="sticky top-0 z-50 transition-colors shadow-sm">
      {/* Top Banner: Alcaldia Forest Green #0b3b24 */}
      <div className="bg-[#0b3b24] py-1.5 px-4 text-xs border-b border-[#062416] text-white">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-100 font-semibold">Alcaldía Bolivariana de Rosario de Perijá • IMAUR</span>
            <span className="hidden sm:inline text-emerald-300/40">•</span>
            <span className="hidden sm:inline text-emerald-200/80">RIF: G-2004984-7</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-100 font-semibold shadow-sm">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Tasa Oficial BCV: <strong className="text-white">Bs. {tasaState.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> / USD
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar: Clean White Background with Crisp Border */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Brand (Siempre enlaza a "/") */}
            {isCiudadano && (
              <Link href="/" className="flex items-center gap-3 group transition">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center border border-slate-200 bg-white p-1 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <img src="/icons/imaur_logo.png" alt="Logo Oficial IMAUR" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="font-black text-base sm:text-lg leading-tight tracking-tight text-slate-900 flex items-center gap-1.5">
                    ASEO URBANO
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      App Ciudadana
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Portal Oficial del Contribuyente • Rosario de Perijá</p>
                </div>
              </Link>
            )}

            {isCuadrilla && (
              <Link href="/" className="flex items-center gap-3 group transition">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center border border-slate-200 bg-white p-1 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <img src="/icons/imaur_logo.png" alt="Logo Oficial IMAUR" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="font-black text-base sm:text-lg leading-tight tracking-tight text-slate-900 flex items-center gap-1.5">
                    ASEO URBANO
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      App Cuadrilla
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Operativa de Campo • Cuadrillas y Turnos</p>
                </div>
              </Link>
            )}

            {isAdmin && (
              <Link href="/" className="flex items-center gap-3 group transition">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center border border-slate-200 bg-white p-1 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <img src="/icons/imaur_logo.png" alt="Logo Oficial IMAUR" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="font-black text-base sm:text-lg leading-tight tracking-tight text-slate-900 flex items-center gap-1.5">
                    ASEO URBANO
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Panel Fiscal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Gestión, Taquilla & Contraloría Municipal</p>
                </div>
              </Link>
            )}

            {isHome && (
              <Link href="/" className="flex items-center gap-3 group transition">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center border border-slate-200 bg-white p-1 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <img src="/icons/imaur_logo.png" alt="Logo Oficial IMAUR" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="font-black text-base sm:text-lg leading-tight tracking-tight text-slate-900 flex items-center gap-2">
                    <span>ASEO URBANO</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      IMAUR
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Alcaldía Bolivariana de Rosario de Perijá</p>
                </div>
              </Link>
            )}

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {isCiudadano && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>PWA Ciudadana</span>
                </div>
              )}

              {isCuadrilla && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>PWA Cuadrilla</span>
                </div>
              )}

              {isAdmin && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Acceso Fiscal Seguro</span>
                </div>
              )}

              {isHome && (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Ingresar al Sistema</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
