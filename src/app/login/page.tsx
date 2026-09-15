"use client";

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, Loader2, LogIn, UserPlus, ArrowLeft, CheckCircle2, Lock, Mail, User, Phone, MapPin } from 'lucide-react';
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

      // Detectar si se ingresó clave maestra directa
      const passClean = cleanPassword.replace(/\.+$/, '').toUpperCase();
      const userClean = cleanIdentifier.replace(/\.+$/, '').toUpperCase();

      if (passClean === 'CUADRILLA2026' || userClean === 'CUADRILLA2026') {
        sessionStorage.setItem('role_scope', 'CUADRILLA');
        localStorage.setItem('cuadrilla_unlocked', 'true');
        await signIn('credentials', { redirect: false, correo: 'cuadrilla@rosariodeperija.gob.ve', password: 'CUADRILLA2026' });
        window.location.href = '/cuadrilla';
        return;
      }

      if (passClean === 'ADMIN2026' || userClean === 'ADMIN2026') {
        sessionStorage.setItem('role_scope', 'ADMIN');
        localStorage.setItem('admin_unlocked', 'true');
        await signIn('credentials', { redirect: false, correo: 'admin@rosariodeperija.gob.ve', password: 'ADMIN2026' });
        window.location.href = '/admin';
        return;
      }

      if (passClean === 'CENSO2026' || userClean === 'CENSO2026') {
        sessionStorage.setItem('role_scope', 'CENSO');
        localStorage.setItem('censo_unlocked_pin', 'CENSO2026');
        await signIn('credentials', { redirect: false, correo: 'censo@rosariodeperija.gob.ve', password: 'CENSO2026' });
        window.location.href = '/censo';
        return;
      }

      if (passClean === 'ROSARIO2026' || userClean === 'ROSARIO2026') {
        sessionStorage.setItem('role_scope', 'SUPERADMIN');
        localStorage.setItem('admin_unlocked', 'true');
        localStorage.setItem('censo_unlocked_pin', 'ROSARIO2026');
        localStorage.setItem('cuadrilla_unlocked', 'true');
        await signIn('credentials', { redirect: false, correo: 'superadmin@rosariodeperija.gob.ve', password: 'ROSARIO2026' });
        window.location.href = '/admin';
        return;
      }

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

      // Consultar sesión para verificar rol exacto y redirigir
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const userRol = sessionData?.user?.rol;
        const subRol = sessionData?.user?.subRol;

        if (subRol === 'SUPERADMIN' || userRol === 'ADMIN') {
          sessionStorage.setItem('role_scope', subRol === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN');
          localStorage.setItem('admin_unlocked', 'true');
          window.location.href = '/admin';
        } else if (subRol === 'CUADRILLA' || userRol === 'SUPERVISOR_CAMPO') {
          sessionStorage.setItem('role_scope', 'CUADRILLA');
          localStorage.setItem('cuadrilla_unlocked', 'true');
          window.location.href = '/cuadrilla';
        } else if (subRol === 'CENSO' || userRol === 'CENSO') {
          sessionStorage.setItem('role_scope', 'CENSO');
          localStorage.setItem('censo_unlocked_pin', 'CENSO2026');
          window.location.href = '/censo';
        } else {
          sessionStorage.setItem('role_scope', 'CIUDADANO');
          window.location.href = '/ciudadano';
        }
      } catch {
        window.location.href = '/ciudadano';
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

      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 p-5 text-center text-white relative">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-xl border border-sky-400/30">
            <Shield className="w-7 h-7 text-sky-400" />
          </div>
          <h1 className="font-black text-xl tracking-tight">Sistema de Aseo Urbano</h1>
          <p className="text-sky-100 text-xs mt-0.5">Alcaldía del Municipio Rosario de Perijá</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 gap-1.5">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setErrorMsg(""); setSuccessMsg(""); }}
            className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              !isRegistering
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setErrorMsg(""); setSuccessMsg(""); }}
            className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              isRegistering
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
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

          {isRegistering ? (
            /* Register Fields */
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre y Apellido <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    required
                    type="text"
                    autoComplete="name"
                    className="w-full border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-slate-500"
                    placeholder="Ej. Juan Pérez"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Cédula o RIF <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    className="bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shrink-0"
                    value={formData.tipoDoc}
                    onChange={e => setFormData({ ...formData, tipoDoc: e.target.value })}
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
                    className="w-full border border-slate-700 px-3 py-2.5 rounded-xl bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="Ej. 14234567"
                    value={formData.documento}
                    onChange={e => setFormData({ ...formData, documento: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Teléfono de Contacto
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="w-full border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="Ej. 04141234567"
                    value={formData.telefono}
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Sector donde reside <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  className="w-full border border-slate-700 px-3 py-2.5 rounded-xl bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={formData.sectorId}
                  onChange={e => setFormData({ ...formData, sectorId: e.target.value })}
                >
                  {sectores.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Dirección o Nº de Casa
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    className="w-full border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="Ej. Casa #14, Calle 2"
                    value={formData.ubicacion}
                    onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Correo Electrónico <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    required
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="email"
                    className="w-full border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="correo@ejemplo.com"
                    value={formData.correo}
                    onChange={e => setFormData({ ...formData, correo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Contraseña <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    className="w-full border border-slate-700 pl-9 pr-3 py-2.5 rounded-xl bg-slate-800/90 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="Crea una contraseña"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                  Clave de Empleado (Solo Alcaldía / Cuadrilla)
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  className="w-full border border-amber-500/30 px-3 py-2.5 rounded-xl bg-slate-950 text-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-amber-500/30"
                  placeholder="Dejar vacío si eres ciudadano"
                  value={formData.claveAcceso}
                  onChange={e => setFormData({ ...formData, claveAcceso: e.target.value })}
                />
              </div>
            </>
          ) : (
            /* Login Fields */
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Correo Electrónico o Cédula <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    required
                    type="text"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="username"
                    className="w-full border border-slate-700 pl-9 pr-3 py-3 rounded-xl bg-slate-800/90 text-white text-base focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="Ej. correo@ejemplo.com o 14234567"
                    value={formData.correo}
                    onChange={e => setFormData({ ...formData, correo: e.target.value })}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Puedes ingresar con tu correo registrado o tu número de cédula.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
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
                    className="w-full border border-slate-700 pl-9 pr-3 py-3 rounded-xl bg-slate-800/90 text-white text-base focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="Ingresa tu contraseña"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit Action Button */}
          <button
            disabled={loading}
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/30 disabled:opacity-70 disabled:cursor-not-allowed mt-6 touch-manipulation cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isRegistering ? "Creando cuenta..." : "Verificando acceso..."}</span>
              </>
            ) : (
              <>
                {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                <span>{isRegistering ? "Crear Mi Cuenta" : "Entrar al Sistema"}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 text-center text-xs text-slate-500">
          <p>Rosario de Perijá • Edo. Zulia</p>
        </div>
      </div>
    </div>
  );
}
