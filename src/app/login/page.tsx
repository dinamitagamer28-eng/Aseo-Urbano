"use client";

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, Loader2, LogIn } from 'lucide-react';

const SECTORES = [
  { id: "1", nombre: "Casco Central" },
  { id: "2", nombre: "Alcaldía Rosario de Perijá" },
  { id: "3", nombre: "SETRIB" },
  // ... añadir el resto según sea necesario
];

export default function LoginScreen() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const [sectores, setSectores] = useState<any[]>([]);

  React.useEffect(() => {
    import('@/lib/actions').then(({ obtenerSectoresRegistro }) => {
      obtenerSectoresRegistro().then(data => {
        setSectores(data);
        if (data.length > 0) setFormData(f => ({ ...f, sectorId: data[0].id }));
      });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      let registeredRole = 'CIUDADANO';
      if (isRegistering) {
        // Llamar a API para registrar
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        const resData = await res.json();
        if (!res.ok) {
           throw new Error(resData.message || "Error al registrar");
        }
        if (resData.rol === 'ADMIN') {
          registeredRole = 'ADMIN';
        }
      } 
      
      // Iniciar sesión con NextAuth
      const result = await signIn('credentials', {
        redirect: false,
        correo: formData.correo,
        password: formData.password
      });

      if (result?.error) {
        throw new Error(result.error);
      } else {
        // Get fresh session to determine redirect route
        try {
          const sessionRes = await fetch('/api/auth/session');
          const sessionData = await sessionRes.json();
          if (sessionData?.user?.rol === 'ADMIN' || registeredRole === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/ciudadano');
          }
        } catch (e) {
          if (registeredRole === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/ciudadano');
          }
        }
        router.refresh();
      }
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocurrió un error. Verifica tus datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-sky-600 p-6 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg border border-sky-500/30">
            <Shield className="w-8 h-8 text-sky-400" />
          </div>
          <h1 className="text-white font-black text-2xl">Aseo Urbano</h1>
          <p className="text-sky-100 text-sm">Rosario de Perijá</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-center font-bold text-slate-200 text-lg mb-2">
            {isRegistering ? "Crea tu cuenta" : "Inicia Sesión"}
          </h2>
          
          {errorMsg && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm font-bold border border-red-500/20 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> {errorMsg}
            </div>
          )}

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre y Apellido</label>
                <input required type="text" className="w-full border border-slate-700 p-2.5 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Ej. Juan Pérez Sánchez" 
                  value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cédula o RIF</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <select className="appearance-none bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 pr-8"
                      value={formData.tipoDoc} onChange={e => setFormData({...formData, tipoDoc: e.target.value})}>
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                      <option value="J">J-</option>
                    </select>
                  </div>
                  <input required type="text" inputMode="numeric" minLength={7} maxLength={9} className="w-full border border-slate-700 p-2.5 rounded-lg bg-slate-800 flex-1 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Ej. 12345678" 
                    value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value.replace(/\D/g, '').slice(0, 9)})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Teléfono</label>
                <input required type="tel" inputMode="numeric" minLength={11} maxLength={11} className="w-full border border-slate-700 p-2.5 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Ej. 04141234567" 
                  value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value.replace(/\D/g, '').slice(0, 11)})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sector donde reside</label>
                <select required className="w-full border border-slate-700 p-2.5 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={formData.sectorId} onChange={e => setFormData({...formData, sectorId: e.target.value})}>
                  {sectores.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Dirección Exacta (Nº de Casa)</label>
                <input required type="text" className="w-full border border-slate-700 p-2.5 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Ej. Casa 5A, Frente a la Plaza" 
                  value={formData.ubicacion} onChange={e => setFormData({...formData, ubicacion: e.target.value})} />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Correo Electrónico</label>
            <input required type="email" className="w-full border border-slate-700 p-2.5 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="correo@ejemplo.com" 
              value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contraseña</label>
            <input required type="password" minLength={6} className="w-full border border-slate-700 p-2.5 rounded-lg bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Mínimo 6 caracteres" 
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          {isRegistering && (
            <div>
              <label className="block text-xs font-bold text-amber-500/80 uppercase mb-1">Clave de Empleado (Opcional)</label>
              <input type="password" title="Solo para personal de la Alcaldía" className="w-full border border-amber-500/30 p-2.5 rounded-lg bg-slate-900 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-amber-500/40" placeholder="Para Admin/Cuadrilla" 
                value={formData.claveAcceso} onChange={e => setFormData({...formData, claveAcceso: e.target.value})} />
            </div>
          )}

          <button disabled={loading} type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl mt-6 flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <LogIn className="w-5 h-5"/>} 
            {isRegistering ? "Crear Cuenta" : "Entrar"}
          </button>
          
          <div className="text-center mt-4">
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(""); }} className="text-sm font-bold text-sky-400 hover:underline">
              {isRegistering ? "¿Ya tienes cuenta? Inicia sesión aquí" : "¿No tienes cuenta? Regístrate aquí"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
