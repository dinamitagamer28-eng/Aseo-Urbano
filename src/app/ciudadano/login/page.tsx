'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  LogIn,
  UserPlus,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  Home,
  MapPin,
  ShieldCheck,
  Building2
} from 'lucide-react';

export default function CiudadanoLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get('mode') === 'registro' || searchParams?.get('tab') === 'registro';

  const [isRegistering, setIsRegistering] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form
  const [tipoDocLogin, setTipoDocLogin] = useState('V');
  const [cedulaLogin, setCedulaLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');

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

  // Dynamic Sectors & Streets from Database
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
          }
        }
      })
      .catch((err) => console.warn('Error cargando sectores:', err));
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
        throw new Error("Cédula o contraseña incorrecta. Si aún no estás registrado, pulsa en 'Crear Cuenta'.");
      }

      sessionStorage.setItem('role_scope', 'CIUDADANO');
      localStorage.setItem('usuario_ciudadano', JSON.stringify({ cedula: identifier }));
      window.location.href = '/';
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
      setErrorMsg('Por favor completa todos los campos obligatorios (*).');
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
        throw new Error(data.message || 'Error al registrar la vivienda.');
      }

      setSuccessMsg('¡Registro exitoso! Iniciando sesión en tu portal ciudadano...');

      // Auto login
      const identifier = `${regTipoDoc}-${cleanCed}`;
      const loginRes = await signIn('credentials', {
        redirect: false,
        correo: identifier,
        password: cleanPass,
      });

      if (loginRes?.error) {
        setIsRegistering(false);
        setCedulaLogin(cleanCed);
        setTipoDocLogin(regTipoDoc);
        setSuccessMsg('Cuenta creada exitosamente. Inicia sesión con tu contraseña.');
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
          sector: regSectorNombre,
          calle: regCalle,
          casa: regNumeroCasa || 'S/N',
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

        {/* Tab Switcher */}
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
                ? 'bg-emerald-600 text-white shadow-md'
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
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 bg-white/70'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear Cuenta / Registrarse</span>
          </button>
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

          {/* Form 1: Login */}
          {!isRegistering ? (
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
                  Ingresa tu número de cédula tal como registraste tu vivienda.
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
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50 mt-6"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Verificando...' : 'Entrar a Mi Portal Ciudadano'}</span>
              </button>
            </form>
          ) : (
            /* Form 2: Register */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Roberto González"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cédula / RIF <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={regTipoDoc}
                      onChange={(e) => setRegTipoDoc(e.target.value)}
                      className="bg-slate-50 border border-slate-300 px-2.5 py-2.5 rounded-xl text-slate-900 font-bold text-xs shrink-0"
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
                      placeholder="14234567"
                      value={regCedula}
                      onChange={(e) => setRegCedula(e.target.value)}
                      className="w-full border border-slate-300 px-3 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono Móvil *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="0414-1234567"
                    value={regTelefono}
                    onChange={(e) => setRegTelefono(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2.5 rounded-xl bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-xl bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sector de La Villa <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={regSectorId}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-2.5 py-2.5 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {sectores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Calle / Vía <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    list="calles-registro"
                    placeholder="Selecciona o escribe..."
                    value={regCalle}
                    onChange={(e) => setRegCalle(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2.5 rounded-xl bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <datalist id="calles-registro">
                    {callesDisponibles.map((c, idx) => (
                      <option key={idx} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nº Casa / Local <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Casa Nº 14-B"
                    value={regNumeroCasa}
                    onChange={(e) => setRegNumeroCasa(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2.5 rounded-xl bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Referencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Frente a la plaza"
                    value={regReferencia}
                    onChange={(e) => setRegReferencia(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2.5 rounded-xl bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Crear Contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-xl bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 disabled:opacity-50 mt-4"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Registrando...' : 'Completar Registro de Vivienda'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer Link to Institutional Login */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-xs">
          <p className="text-slate-500 mb-1">¿Eres empleado o funcionario de la Alcaldía?</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ir al Acceso Institucional</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
