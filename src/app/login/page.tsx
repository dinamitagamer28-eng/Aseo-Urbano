"use client";

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, Loader2, LogIn, UserPlus, ArrowLeft, CheckCircle2, Lock, Mail, User, Users, Phone, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function LoginScreen() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    correo: '',
    password: '',
    nombre: '',
    tipoDoc: 'V',
    documento: '',
    sectorId: '',
    ubicacion: '',
    telefono: '',
    claveAcceso: ''
  });

  const [sectores, setSectores] = useState<any[]>([
    { id: '1', nombre: 'Sector Las Colinas' },
    { id: '2', nombre: 'Sector Casco Central' }
  ]);

  useEffect(() => {
    fetch('/api/sectores')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSectores(data);
          setFormData(f => ({ ...f, sectorId: f.sectorId || data[0].id }));
        }
      })
      .catch(err => console.warn('Error loading sectores:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const cleanIdentifier = formData.correo.trim();
    const cleanPassword = formData.password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      setErrorMsg("Por favor completa los campos requeridos.");
      setLoading(false);
      return;
    }

    try {
      let registeredRole = 'CIUDADANO';

      if (isRegistering) {
        if (!formData.nombre.trim()) {
          throw new Error("Ingresa tu Nombre y Apellido.");
        }
        if (!formData.documento.trim()) {
          throw new Error("Ingresa tu número de Cédula o RIF.");
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            correo: cleanIdentifier,
            password: cleanPassword,
            nombre: formData.nombre.trim(),
            tipoDoc: formData.tipoDoc,
            documento: formData.documento.trim(),
            sectorId: formData.sectorId || (sectores.length > 0 ? sectores[0].id : ''),
            ubicacion: formData.ubicacion.trim(),
            telefono: formData.telefono.trim(),
            claveAcceso: formData.claveAcceso.trim()
          })
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.message || "Error al registrar la cuenta.");
        }

        registeredRole = resData.rol || 'CIUDADANO';
        setSuccessMsg("¡Cuenta creada exitosamente! Iniciando sesión...");
      }

      // Iniciar sesión con NextAuth
      const result = await signIn('credentials', {
        redirect: false,
        correo: cleanIdentifier,
        password: cleanPassword
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (cleanIdentifier.toLowerCase() === 'admin' || cleanIdentifier.toLowerCase() === 'admin@rosariodeperija.gob.ve') {
        window.location.href = '/admin';
        return;
      }

      // Redirección inmediata según el rol
      if (registeredRole === 'ADMIN') {
        window.location.href = '/admin';
      } else if (registeredRole === 'SUPERVISOR_CAMPO') {
        window.location.href = '/cuadrilla';
      } else {
        // Consultar sesión para verificar rol
        try {
          const sessionRes = await fetch('/api/auth/session');
          const sessionData = await sessionRes.json();
          if (sessionData?.user?.rol === 'ADMIN') {
            window.location.href = '/admin';
          } else if (sessionData?.user?.rol === 'SUPERVISOR_CAMPO') {
            window.location.href = '/cuadrilla';
          } else {
            window.location.href = '/ciudadano';
          }
        } catch {
          window.location.href = '/ciudadano';
        }
      }

    } catch (err: any) {
      console.error('Error de autenticación:', err);
      setErrorMsg(err.message || "Ocurrió un error. Verifica tus datos.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 sm:px-6">
      {/* Back to Home Link */}
      <div className="w-full max-w-md mb-3 flex justify-between items-center text-xs">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Inicio</span>
        </Link>
        <span className="text-slate-500 font-medium">Perijá Digital 2026</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-blue-700 p-6 text-center text-white relative">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl border border-sky-400/30">
            <Shield className="w-7 h-7 text-sky-400" />
          </div>
          <h1 className="font-black text-xl tracking-tight">Acceso Institucional</h1>
          <p className="text-sky-100 text-xs mt-0.5">Alcaldía del Municipio Rosario de Perijá • IMAUR</p>
          <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-950/60 text-sky-200 border border-sky-400/30">
            Personal y Funcionarios del Sistema
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-red-500/15 text-red-300 p-3 rounded-xl text-xs font-bold border border-red-500/30 flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/15 text-emerald-300 p-3 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Usuario o Correo Institucional <span className="text-red-400">*</span>
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
                className="w-full border border-slate-700 pl-9 pr-3 py-3 rounded-xl bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                placeholder="ej. admin@rosariodeperija.gob.ve o admin"
                value={formData.correo}
                onChange={e => setFormData({ ...formData, correo: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Acceso exclusivo para personal autorizado de la Alcaldía.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Contraseña <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                required
                type="password"
                autoComplete="current-password"
                className="w-full border border-slate-700 pl-9 pr-3 py-3 rounded-xl bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                placeholder="Ingresa tu contraseña"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            disabled={loading}
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/30 disabled:opacity-70 disabled:cursor-not-allowed mt-6 touch-manipulation cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verificando acceso...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Entrar al Sistema</span>
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-500">
              Las cuentas del personal son creadas y gestionadas por el Administrador Fiscal.
            </p>
          </div>
        </form>

        {/* Footer Citizen Link */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400 mb-1.5">¿Eres vecino, residente o comerciante del municipio?</p>
          <Link
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition"
            href="/ciudadano/login"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Ingresar al Portal Ciudadano</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
