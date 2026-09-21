'use client';

import React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Clock,
  Layers,
  Settings,
  Users,
  MapPin,
  Printer,
  LogOut,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  totalPagosPendientes: number;
  totalSectores: number;
  totalPersonal: number;
  userName?: string;
  userEmail?: string;
  userRol?: string;
  isOpenMobile?: boolean;
  setIsOpenMobile?: (open: boolean) => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  totalPagosPendientes,
  totalSectores,
  totalPersonal,
  userName = 'Administrador',
  userEmail = 'admin@rosariodeperija.gob.ve',
  userRol = 'ADMIN',
  isOpenMobile = false,
  setIsOpenMobile,
}: AdminSidebarProps) {
  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    if (setIsOpenMobile) setIsOpenMobile(false);
  };

  return (
    <>
      {/* Backdrop for Mobile */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile && setIsOpenMobile(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Main Aside Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header with Official IMAUR Branding */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-sky-600 to-amber-400 p-[1.5px] shadow-lg shadow-emerald-500/20 shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden p-0.5">
                  <img
                    src="/icons/imaur_logo_512.png"
                    alt="IMAUR Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Shield className="w-5 h-5 text-emerald-400 hidden" />
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-black text-white tracking-wider uppercase truncate">
                    IMAUR Rosario
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                    Fiscal
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  Alcaldía Rosario de Perijá
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsOpenMobile && setIsOpenMobile(false)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Menu List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Section 1: Gestión Fiscal & Contable */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-black tracking-widest text-slate-500 uppercase">
              GESTIÓN FISCAL & CONTABLE
            </div>

            <button
              onClick={() => handleSelectTab('kpis')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'kpis'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4" />
                <span>Tablero & KPIs</span>
              </div>
              {activeTab === 'kpis' && <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />}
            </button>

            <button
              onClick={() => handleSelectTab('analiticas')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'analiticas'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4" />
                <span>Analíticas & Reportes</span>
              </div>
              {activeTab === 'analiticas' && <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />}
            </button>

            <button
              onClick={() => handleSelectTab('auditoria')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'auditoria'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Auditoría de Folios</span>
              </div>
              {activeTab === 'auditoria' && <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />}
            </button>

            <button
              onClick={() => handleSelectTab('validar')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'validar'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4" />
                <span>Validar Pagos Web</span>
              </div>
              {totalPagosPendientes > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                  {totalPagosPendientes}
                </span>
              ) : (
                activeTab === 'validar' && <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />
              )}
            </button>
          </div>

          {/* Section 2: Administración y Catastro */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-black tracking-widest text-slate-500 uppercase">
              ADMINISTRACIÓN Y CATASTRO
            </div>

            <button
              onClick={() => handleSelectTab('sectores')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'sectores'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Sectores & Calles</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">({totalSectores})</span>
            </button>

            <button
              onClick={() => handleSelectTab('tarifas')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'tarifas'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>Zonificación & Tarifas</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">({totalSectores})</span>
            </button>

            <button
              onClick={() => handleSelectTab('personal')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Personal Alcaldía</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">({totalPersonal})</span>
            </button>
          </div>

          {/* Section 3: Supervisión Operativa */}
          <div className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center justify-between">
              <span>SUPERVISIÓN OPERATIVA</span>
              <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded">Restringido</span>
            </div>

            <button
              onClick={() => handleSelectTab('mapa')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'mapa'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <span>Monitoreo GPS Satelital</span>
              </div>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded font-mono">
                SALA
              </span>
            </button>
          </div>

          {/* Quick Terminal Taquilla */}
          <div className="pt-2">
            <button
              onClick={() => handleSelectTab('taquilla')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-sky-500/30 bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 text-xs font-bold transition group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>Terminal de Taquilla</span>
              </div>
              <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded uppercase font-semibold">
                Caja
              </span>
            </button>
          </div>
        </div>

        {/* Bottom User Profile Card and Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-bold text-white truncate">{userName}</div>
              <div className="text-[10px] text-emerald-400 font-semibold truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{userRol}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/60 hover:bg-red-900/80 border border-red-500/30 text-red-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
