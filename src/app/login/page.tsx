'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  LogIn,
  UserPlus,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  User,
  MapPin,
  Building2,
  Loader2,
  Users
} from 'lucide-react';

export default function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get('mode') === 'registro' || searchParams?.get('tab') === 'registro';

  const [isRegistering, setIsRegistering] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form
  const [regNombre, setRegNombre] = useState('');
  const [regTipoDoc, setRegTipoDoc] = useState('V');
  const [regCedula, setRegCedula] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSectorId, setRegSectorId] = useState('');
  const [regSectorNombre, setRegSectorNombre] = useState('');
  const [regCalle, setRegCalle] = useState('');
  const [regNumeroCasa, setRegNumeroCasa] = useState('');
  const [regReferencia, setRegReferencia] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Dynamic Sectors & Streets
  const [sectores, setSectores] = useState<any[]>([]);
  const [callesDisponibles, setCallesDisponibles] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/censo')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.sectores) && data.sectores.length > 0) {
          setSectores(data.sectores);
          setRegSectorId(data.sectores[0].id);
          setRegSectorNombre(data.sectores[0].nombre);
          if (data.sectores[0].callesTramos && data.sectores[0].callesTramos.length > 0) {
            setCallesDisponibles(data.sectores[0].callesTramos.map((c: any) => c.nombreCalle));
            setRegCalle(data.sectores[0].callesTramos[0].nombreCalle);
          } else {
            setCallesDisponibles(['Calle Principal']);
            setRegCalle('Calle Principal');
          }
        }
      })
      .catch((err) => console.warn('Error cargando sectores para registro:', err));
  }, []);

  const handleSectorChange = (secId: string) => {
    setRegSectorId(secId);
    const found = sectores.find((s) => s.id === secId);
    if (found) {
      setRegSectorNombre(found.nombre);
      if (found.callesTramos && found.callesTramos.length > 0) {
        setCallesDisponibles(found.callesTramos.map((c: any) => c.nombreCalle));
        setRegCalle(found.callesTramos[0].nombreCalle);
      } else {
        setCallesDisponibles(['Calle Principal']);
        setRegCalle('Calle Principal');
      }
    }
  };

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

  // Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const cleanNombre = regNombre.trim();
    const cleanCed = regCedula.replace(/[^0-9]/g, '');
    const cleanTel = regTelefono.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPass = regPassword.trim();

    if (!cleanNombre || !cleanCed || !cleanTel || !cleanPass) {
      setErrorMsg('Por favor completa todos los campos requeridos (*).');
      setLoading(false);
      return;
    }

    try {
      const fullUbicacion = `${regCalle ? `Calle: ${regCalle}, ` : ''}Casa/Local: ${regNumeroCasa || 'S/N'}${regReferencia ? ` (${regReferencia})` : ''}`;

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: cleanEmail || `${regTipoDoc}-${cleanCed}@alcaldiadeperija.gob.ve`,
          password: cleanPass,
          nombre: cleanNombre,
          tipoDoc: regTipoDoc,
          documento: cleanCed,
          sectorId: regSectorId,
          sectorNombre: regSectorNombre,
          calleNombre: regCalle,
          numeroCasaLocal: regNumeroCasa || 'S/N',
          referenciaUbic: regReferencia,
          ubicacion: fullUbicacion,
          telefono: cleanTel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar la cuenta.');
      }

      setSuccessMsg('¡Cuenta creada exitosamente! Conectando...');

      // Auto login
      const identifier = cleanEmail || `${regTipoDoc}-${cleanCed}`;
      const loginRes = await signIn('credentials', {
        redirect: false,
        correo: identifier,
        password: cleanPass,
      });

      if (loginRes?.error) {
        setIsRegistering(false);
        setLoginIdentifier(identifier);
        setSuccessMsg('Cuenta creada exitosamente. Inicia sesión con tus credenciales.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('role_scope', 'CIUDADANO');
      localStorage.setItem(
        'usuario_ciudadano',
        JSON.stringify({
          nombre: cleanNombre,
          cedula: `${regTipoDoc}-${cleanCed}`,
          telefono: cleanTel,
          email: cleanEmail,
          sector: regSectorNombre,
          calle: regCalle,
          casa: regNumeroCasa || 'S/N',
          referencia: regReferencia,
        })
      );
      window.location.href = '/';
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo completar el registro.');
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

        {/* Tab Switcher: Iniciar Sesión / Crear Cuenta */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              !isRegistering
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 bg-white/70'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              isRegistering
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 bg-white/70'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {/* Messages */}
        <div className="px-6 pt-4">
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

        {/* TAB 1: INICIAR SESION */}
        {!isRegistering ? (
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

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                ¿No tienes cuenta registrada?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </form>
        ) : (
          /* TAB 2: CREAR CUENTA / REGISTRO */
          <form onSubmit={handleRegisterSubmit} className="p-6 pt-2 space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre y Apellido / Razón Social <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  required
                  type="text"
                  className="w-full border border-slate-300 pl-9 pr-3 py-2.5 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400"
                  placeholder="Ej. Juan Pérez"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                />
              </div>
            </div>

            {/* Documento */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cédula de Identidad o RIF <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={regTipoDoc}
                  onChange={(e) => setRegTipoDoc(e.target.value)}
                  className="bg-slate-50 border border-slate-300 px-3 py-2.5 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 shrink-0"
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
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400 font-mono font-bold"
                  placeholder="Ej. 18234567"
                  value={regCedula}
                  onChange={(e) => setRegCedula(e.target.value)}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Teléfono Móvil <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    required
                    type="tel"
                    className="w-full border border-slate-300 pl-9 pr-3 py-2 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400 font-mono"
                    placeholder="0414-1234567"
                    value={regTelefono}
                    onChange={(e) => setRegTelefono(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    className="w-full border border-slate-300 pl-9 pr-3 py-2 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400"
                    placeholder="correo@ejemplo.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Ubicación Territorial: Sector y Calles Oficiales */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Ubicación Territorial (Sectores y Calles Oficiales)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-950 uppercase mb-1">
                    Sector Municipal <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={regSectorId}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full border border-emerald-300 bg-white px-3 py-2 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {sectores.length > 0 ? (
                      sectores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} {s.totalFamilias ? `(${s.totalFamilias} fam.)` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="">Cargando sectores...</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-emerald-950 uppercase mb-1">
                    Calle / Avenida / Tramo <span className="text-red-500">*</span>
                  </label>
                  {callesDisponibles.length > 0 ? (
                    <select
                      required
                      value={regCalle}
                      onChange={(e) => setRegCalle(e.target.value)}
                      className="w-full border border-emerald-300 bg-white px-3 py-2 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {callesDisponibles.map((c, idx) => (
                        <option key={idx} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      type="text"
                      className="w-full border border-emerald-300 bg-white px-3 py-2 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      placeholder="Nombre de la calle"
                      value={regCalle}
                      onChange={(e) => setRegCalle(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-emerald-950 uppercase mb-1">
                    N° Casa o Local
                  </label>
                  <input
                    type="text"
                    className="w-full border border-emerald-300 bg-white px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="Ej. Casa #14, Apto 2B"
                    value={regNumeroCasa}
                    onChange={(e) => setRegNumeroCasa(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-950 uppercase mb-1">
                    Punto de Referencia
                  </label>
                  <input
                    type="text"
                    className="w-full border border-emerald-300 bg-white px-3 py-2 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="Ej. Frente a la bodega, portón azul"
                    value={regReferencia}
                    onChange={(e) => setRegReferencia(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Crea tu Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  className="w-full border border-slate-300 pl-9 pr-3 py-2.5 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400"
                  placeholder="Mínimo 4 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-700/30 disabled:opacity-70 disabled:cursor-not-allowed mt-4 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Registrando vivienda...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Crear Cuenta y Registrar Vivienda</span>
                </>
              )}
            </button>

            <div className="pt-1 text-center">
              <p className="text-xs text-slate-500">
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                >
                  Inicia sesión aquí
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          IMAUR • Alcaldía del Municipio Rosario de Perijá, Estado Zulia
        </div>
      </div>
    </div>
  );
}
