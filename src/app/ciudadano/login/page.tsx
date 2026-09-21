'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LogIn,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2
} from 'lucide-react';

export default function CiudadanoLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form
  const [tipoDocLogin, setTipoDocLogin] = useState('V');
  const [cedulaLogin, setCedulaLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const cleanCed = cedulaLogin.replace(/[^0-9]/g, '');
    const cleanPass = passwordLogin.trim();

    if (!cleanCed || !cleanPass) {
      setErrorMsg('Por favor ingresa tu cédula y contraseña.');
      setLoading(false);
      return;
    }

    const identifier = `${tipoDocLogin}-${cleanCed}`;

    try {
      const result = await signIn('credentials', {
        redirect: false,
        correo: identifier,
        password: cleanPass,
      });

      if (result?.error) {
        throw new Error('Cédula o contraseña incorrecta.');
      }

      sessionStorage.setItem('role_scope', 'CIUDADANO');
      localStorage.setItem('usuario_ciudadano', JSON.stringify({ cedula: identifier }));
      window.location.href = '/';
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      {/* Top Breadcrumb Bar */}
      <div className="w-full max-w-lg mb-3 flex justify-between items-center text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 transition py-1.5 px-3 rounded-lg bg-white border border-slate-200 shadow-sm font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Inicio</span>
        </Link>
        <span className="text-slate-500 font-bold">Alcaldía de Rosario de Perijá • IMAUR</span>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl shadow-xl overflow-hidden">
        {/* Institutional Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-800 p-6 text-center text-white relative">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-emerald-200 p-1">
            <Image
              src="/icons/imaur_logo.png"
              alt="IMAUR Logo"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <h1 className="font-black text-xl tracking-tight text-white">Portal del Ciudadano</h1>
          <p className="text-emerald-100 text-xs mt-0.5">Alcaldía del Municipio Rosario de Perijá • IMAUR</p>
          <div className="mt-2 inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/60 text-emerald-200 border border-emerald-400/40">
            Gestión de Aseo Urbano, Solvencias y Catastro
          </div>
        </div>

        <div className="p-6">
          {/* Alerts */}
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-xs font-bold border border-red-200 flex items-start gap-2.5 mb-4 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2.5 mb-4 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form: Login */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cédula de Identidad o RIF <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={tipoDocLogin}
                  onChange={(e) => setTipoDocLogin(e.target.value)}
                  className="bg-slate-50 border border-slate-300 px-3 py-3 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
                >
                  <option value="V">V-</option>
                  <option value="E">E-</option>
                  <option value="J">J-</option>
                  <option value="G">G-</option>
                </select>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej. 14234567"
                  value={cedulaLogin}
                  onChange={(e) => setCedulaLogin(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-3 rounded-xl bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 font-mono font-bold"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Ingresa tu número de cédula para consultar recibos y solvencias.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={passwordLogin}
                  onChange={(e) => setPasswordLogin(e.target.value)}
                  className="w-full border border-slate-300 pl-9 pr-3 py-3 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50 mt-6 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar a Mi Portal Ciudadano</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          IMAUR • Alcaldía del Municipio Rosario de Perijá, Estado Zulia
        </div>
      </div>
    </div>
  );
}
