'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LogIn,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Lock,
  User,
  Loader2
} from 'lucide-react';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const cleanId = loginIdentifier.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanId || !cleanPass) {
      setErrorMsg('Por favor ingresa tu usuario/cédula y contraseña.');
      setLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', {
        redirect: false,
        correo: cleanId,
        password: cleanPass,
      });

      if (result?.error) {
        throw new Error(result.error || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
      }

      const lower = cleanId.toLowerCase();
      if (lower === 'admin' || lower === 'admin@rosariodeperija.gob.ve') {
        window.location.href = '/admin';
        return;
      }

      // Check role
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        if (sessionData?.user?.rol === 'ADMIN') {
          window.location.href = '/admin';
        } else if (sessionData?.user?.rol === 'SUPERVISOR_CAMPO') {
          window.location.href = '/cuadrilla';
        } else {
          sessionStorage.setItem('role_scope', 'CIUDADANO');
          localStorage.setItem('usuario_ciudadano', JSON.stringify(sessionData?.user || { identifier: cleanId }));
          window.location.href = '/';
        }
      } catch {
        sessionStorage.setItem('role_scope', 'CIUDADANO');
        localStorage.setItem('usuario_ciudadano', JSON.stringify({ identifier: cleanId }));
        window.location.href = '/';
      }
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
          className="inline-flex items-center gap-1.5 text-slate-700 hover:text-emerald-700 transition py-1.5 px-3 rounded-lg bg-white border border-slate-200 shadow-sm font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Inicio</span>
        </Link>
        <span className="text-slate-600 font-bold">Alcaldía de Rosario de Perijá • IMAUR</span>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Banner - Alcaldia Institutional Green */}
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
          <h1 className="font-black text-xl tracking-tight text-white">Sistema Integral IMAUR</h1>
          <p className="text-emerald-100 text-xs mt-0.5">Alcaldía Bolivariana de Rosario de Perijá</p>
          <div className="mt-2 inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/60 text-emerald-200 border border-emerald-400/40">
            Aseo Urbano, Gestión Fiscal y Padrón Territorial 2026
          </div>
        </div>

        {/* Messages */}
        <div className="px-6 pt-5">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-200 flex items-start gap-2.5 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2.5 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Form: Iniciar Sesión */}
        <form onSubmit={handleLoginSubmit} className="p-6 pt-2 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Usuario, Cédula o Correo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                required
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                className="w-full border border-slate-300 pl-9 pr-3 py-3 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400"
                placeholder="ej. admin o V-12345678"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Administradores: use su usuario oficial. Ciudadanos: use su cédula (ej. V-12345678).
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
                className="w-full border border-slate-300 pl-9 pr-3 py-3 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400"
                placeholder="Ingresa tu contraseña"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-700/30 disabled:opacity-70 disabled:cursor-not-allowed mt-6 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          IMAUR • Alcaldía del Municipio Rosario de Perijá, Estado Zulia
        </div>
      </div>
    </div>
  );
}
