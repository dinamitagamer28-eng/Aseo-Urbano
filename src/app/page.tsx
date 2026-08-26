"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, MapPin, CreditCard, Shield, AlertTriangle, ListTodo, LogIn, FileText, Loader2, BarChart3, Phone, Mail, Upload, ImagePlus, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';

// --- MOCK DATA ---
const SECTORES = [
  { id: "1", nombre: "Casco Central" },
  { id: "2", nombre: "Alcaldía Rosario de Perijá" },
  { id: "3", nombre: "SETRIB" },
  { id: "4", nombre: "Intendencia Municipal" },
  { id: "5", nombre: "Instituto Municipal de Atención al Ciudadano" },
  { id: "6", nombre: "Residencias Portal El Rosario" },
  { id: "7", nombre: "IMA" },
  { id: "8", nombre: "Urb. Villa Karelis" },
  { id: "9", nombre: "Residencias Villa Encantada" },
  { id: "10", nombre: "Residencias Villa Nueva" },
  { id: "11", nombre: "Residencias Los Ángeles" },
  { id: "12", nombre: "Urb. Rodolfito Rincón" },
  { id: "13", nombre: "Residencias Villa Hermosa" },
  { id: "14", nombre: "Calle Municipal" },
  { id: "15", nombre: "Sector Los Pereguetos" },
  { id: "16", nombre: "Sector Las Cayapas" },
  { id: "17", nombre: "Av. 18 Maestra Sara Zegarra" },
  { id: "18", nombre: "Residencias Los Carrasco" },
  { id: "19", nombre: "Urb. Las Colinas" },
  { id: "20", nombre: "Los Chaguaramos" },
  { id: "21", nombre: "Los Chaguaramos CECAT" },
  { id: "22", nombre: "Calle El Márquez" },
  { id: "23", nombre: "Sector El Recreo" },
  { id: "24", nombre: "Sector El Valle" },
  { id: "25", nombre: "Sector María Alejandra" },
  { id: "26", nombre: "Container Unidad de Diálisis" },
  { id: "27", nombre: "Urb. Prados de la Villa" },
  { id: "28", nombre: "Urb. San Andrés" },
  { id: "29", nombre: "C.D.I. San Andrés" },
  { id: "30", nombre: "Sector Venezuela" },
  { id: "31", nombre: "Calle Dabajuro" },
  { id: "32", nombre: "Sector Rafael Caldera" },
  { id: "33", nombre: "Sector La Culebra" },
  { id: "34", nombre: "Sector Barrio Oscuro" },
  { id: "35", nombre: "Calle (La Curva)" },
  { id: "36", nombre: "Calle Adolfo López" },
  { id: "37", nombre: "Calle El Pantano" },
  { id: "38", nombre: "Calle Santa Teresa" },
  { id: "39", nombre: "Sector Inmaculada" },
  { id: "40", nombre: "Sector San José" },
  { id: "41", nombre: "Calle Bolívar" },
  { id: "42", nombre: "Sector Aurora I" },
  { id: "43", nombre: "Sector Aurora II" },
  { id: "44", nombre: "Calle Jesús Enrique Lozada" },
  { id: "45", nombre: "Calle Gérico" },
  { id: "46", nombre: "Calle Vargas" },
  { id: "47", nombre: "Calle 18 de Octubre" },
  { id: "48", nombre: "Calle Concepción" },
  { id: "49", nombre: "Sector Corito" },
  { id: "50", nombre: "San Francisco de Corito" },
  { id: "51", nombre: "Sector Trujillo I" },
  { id: "52", nombre: "Sector Trujillo II" },
  { id: "53", nombre: "Sector Trujillo III" },
  { id: "54", nombre: "Calle Falcón" },
  { id: "55", nombre: "Sector La Cueva" },
  { id: "56", nombre: "Sector Amparo" },
  { id: "57", nombre: "Sector Juan Gil" },
  { id: "58", nombre: "2 de febrero" },
  { id: "59", nombre: "El Delirio" },
  { id: "60", nombre: "Sector 6 de Agosto" },
  { id: "61", nombre: "Sector Valdemar Sandoval" },
  { id: "62", nombre: "La Victoria" },
  { id: "63", nombre: "C.D.I. Ilapeca" },
  { id: "64", nombre: "Sector Las Palmeras" },
  { id: "65", nombre: "Sector Delicias" },
  { id: "66", nombre: "Sector Los Haticos" },
  { id: "67", nombre: "Sector El Carmen" },
  { id: "68", nombre: "Sector Altos de Jalisco Bicentenario" },
  { id: "69", nombre: "Sector La Melaza" },
  { id: "70", nombre: "Sector Noriega Trigo I" },
  { id: "71", nombre: "Sector Noriega Trigo II" },
  { id: "72", nombre: "Sector Ilapeca" },
  { id: "73", nombre: "Sector Cañada Larga" },
  { id: "74", nombre: "Sector Puentecitos" },
  { id: "75", nombre: "Sector Arimpia" },
  { id: "76", nombre: "Sector Juan Gil 1" },
  { id: "77", nombre: "Sector Juan Gil 2" },
  { id: "78", nombre: "Sector Maticas" },
  { id: "79", nombre: "Sector Palmita" }
];

export default function AseoUrbanoApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'ciudadano' | 'supervisor' | 'admin' | 'settings'>('ciudadano');
  const [userData, setUserData] = useState({ nombre: '', sector: '', documento: '', uid: '', correo: '', rol: 'ciudadano' });
  const [loadingSession, setLoadingSession] = useState(true);

  // Estado global falso (mock) para los reportes de la sesión
  const [reportesActivos, setReportesActivos] = useState<any[]>([]);
  // Estado global falso (mock) para los pagos de la sesión
  const [pagosActivos, setPagosActivos] = useState<any[]>([]);
  // Historial de rutas completadas por los camiones
  const [historialRutas, setHistorialRutas] = useState<{ tramo: string, fecha: string, tipo: string }[]>([]);

  const handleSubmitReport = (nuevoReporte: any) => {
    const r = { 
      ...nuevoReporte, 
      id: Date.now().toString(),
      usuario: userData.nombre,
      cedula: userData.documento,
      sector: SECTORES.find(s => s.id === userData.sector)?.nombre || userData.sector
    };
    setReportesActivos([r, ...reportesActivos]);
  };

  const handleResolveReport = (id: string, nuevoEstado: string, fotoRespuesta?: string) => {
    setReportesActivos(reportesActivos.map(r => r.id === id ? { ...r, estado: nuevoEstado, ...(fotoRespuesta && { fotoRespuesta }) } : r));
  };

  const handleSubmitPago = (nuevoPago: any) => {
    const p = { ...nuevoPago, id: Date.now().toString() };
    setPagosActivos([p, ...pagosActivos]);
  };

  const handleApprovePago = (id: string) => {
    setPagosActivos(pagosActivos.map(p => p.id === id ? { ...p, estado: 'aprobado' } : p));
  };

  const handleRejectPago = (id: string) => {
    setPagosActivos(pagosActivos.map(p => p.id === id ? { ...p, estado: 'rechazado' } : p));
  };

  // Escuchar el estado de autenticación en tiempo real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Buscar datos extra en Firestore
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({ ...data as any, uid: user.uid, correo: user.email });
            // Forzar vista de ciudadano si no es admin/supervisor
            if (data.rol === 'ciudadano') {
              setActiveTab('ciudadano');
            }
          } else {
            setUserData({ nombre: 'Usuario', sector: 'Desconocido', documento: '', uid: user.uid, correo: user.email || '', rol: 'ciudadano' });
          }
          setIsLoggedIn(true);
        } catch (error) {
          console.error("Error cargando perfil de Firestore:", error);
          setUserData({ nombre: 'Usuario', sector: 'Error de BD', documento: '', uid: user.uid, correo: user.email || '', rol: 'ciudadano' });
          setIsLoggedIn(true); // Permitir entrar aunque falle la BD para que pueda cerrar sesión
        }
      } else {
        setIsLoggedIn(false);
      }
      setLoadingSession(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-green-700">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="font-bold">Cargando sistema...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AuthScreen onLogin={(data) => {
      setUserData(data);
      setIsLoggedIn(true);
      if (data.rol === 'ciudadano') setActiveTab('ciudadano');
    }} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {/* HEADER GLOBAL */}
      <header className="bg-green-700 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-full shadow-sm">
            <Shield className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <h1 className="font-black text-lg leading-none tracking-tight">Alcaldía</h1>
            <p className="text-green-100 text-xs">Sistema de Aseo Urbano</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('settings')} className="p-2 bg-green-800 hover:bg-green-900 rounded-full transition shadow-inner">
             <Settings className="w-5 h-5 text-white" />
          </button>
          <button onClick={handleLogout} className="text-xs font-bold bg-green-800 hover:bg-green-900 px-3 py-2 rounded-lg transition shadow-inner">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* NAVBAR: MODO DE PRUEBA (Solo visible para Admin/Supervisor) */}
      {userData.rol !== 'ciudadano' && (
        <div className="bg-white border-b shadow-sm p-3 flex justify-between items-center text-sm font-bold sticky top-[72px] z-10">
          <span className="text-gray-500 uppercase">Modo Personal:</span>
          <select 
            className="bg-transparent border-none focus:outline-none text-green-700 cursor-pointer text-right"
            value={activeTab === 'settings' ? (userData.rol === 'admin' ? 'admin' : 'supervisor') : activeTab} 
            onChange={(e) => setActiveTab(e.target.value as any)}
          >
            <option value="ciudadano">Vista Ciudadano</option>
            <option value="supervisor">App Supervisor</option>
            <option value="admin">Panel Admin (Oficina)</option>
          </select>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-md md:max-w-3xl lg:max-w-4xl mx-auto w-full p-4 relative z-0">
        {activeTab === 'ciudadano' && <AppCiudadana userData={userData} onSubmitReport={handleSubmitReport} reportesActivos={reportesActivos} pagosActivos={pagosActivos} onSubmitPago={handleSubmitPago} />}
        {activeTab === 'supervisor' && <AppSupervisor reportesActivos={reportesActivos} onResolveReport={handleResolveReport} historialRutas={historialRutas} setHistorialRutas={setHistorialRutas} />}
        {activeTab === 'admin' && <PanelAdmin pagosActivos={pagosActivos} onApprovePago={handleApprovePago} onRejectPago={handleRejectPago} onResetPagos={() => setPagosActivos(pagosActivos.filter(p => p.estado !== 'aprobado'))} />}
        {activeTab === 'settings' && <SettingsScreen userData={userData} reportesActivos={reportesActivos} pagosActivos={pagosActivos} onBack={() => setActiveTab(userData.rol === 'admin' ? 'admin' : userData.rol === 'supervisor' ? 'supervisor' : 'ciudadano')} />}
      </main>
    </div>
  );
}

// ==========================================
// PANTALLA DE AUTENTICACIÓN (CON FIREBASE)
// ==========================================
function AuthScreen({ onLogin }: { onLogin: (data: any) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    correo: '',
    password: '',
    nombre: '',
    tipoDoc: 'V',
    documento: '',
    sector: SECTORES[0].id,
    direccionExtra: '',
    telefono: '',
    codigoAcceso: ''
  });

  // Clave secreta para habilitar permisos de supervisor/admin
  const CLAVE_SECRETA = "ROSARIO2026";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const rolAsignado = (formData.codigoAcceso === CLAVE_SECRETA) ? 'admin' : 'ciudadano';

    try {
      if (isRegistering) {
        // Registrar en Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.correo, formData.password);
        const user = userCredential.user;
        
        // Guardar datos extra en Firestore
        const docData = {
          nombre: formData.nombre,
          correo: formData.correo,
          telefono: formData.telefono,
          sector: formData.sector, // Guarda el ID numérico
          documento: `${formData.tipoDoc}-${formData.documento}`,
          direccionExtra: formData.direccionExtra,
          rol: rolAsignado,
          fechaRegistro: new Date().toISOString()
        };
        await setDoc(doc(db, 'usuarios', user.uid), docData);
        
        onLogin({ ...docData, uid: user.uid });
      } else {
        // Iniciar Sesión en Auth
        const userCredential = await signInWithEmailAndPassword(auth, formData.correo, formData.password);
        const user = userCredential.user;
        
        // Recuperar datos extra de Firestore
        const docSnap = await getDoc(doc(db, 'usuarios', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          onLogin({ ...data, uid: user.uid, correo: data.correo || user.email });
        } else {
          // Fallback por si la cuenta existe pero no tiene documento
          onLogin({ nombre: 'Usuario', sector: '1', documento: '', uid: user.uid, correo: user.email, rol: 'ciudadano' });
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setErrorMsg("El correo ya está registrado.");
      else if (err.code === 'auth/invalid-credential') setErrorMsg("Correo o contraseña incorrectos.");
      else setErrorMsg("Ocurrió un error. Verifica tus datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!formData.correo) {
      setErrorMsg("Por favor, ingresa tu correo electrónico arriba para poder enviarte el enlace de recuperación.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, formData.correo);
      alert("Te hemos enviado un enlace de recuperación. Por favor, revisa tu bandeja de entrada (y la carpeta de spam).");
    } catch (err: any) {
      setErrorMsg("No se pudo enviar el correo: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-green-700 p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Shield className="w-8 h-8 text-green-700" />
          </div>
          <h1 className="text-white font-black text-2xl">Aseo Urbano</h1>
          <p className="text-green-100 text-sm">Rosario de Perijá</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-center font-bold text-gray-700 text-lg mb-2">
            {isRegistering ? "Crea tu cuenta" : "Inicia Sesión"}
          </h2>
          
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> {errorMsg}
            </div>
          )}

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre y Apellido Completo</label>
                <input required type="text" className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Ej. Juan Pérez Sánchez" 
                  value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cédula o RIF</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <select className="appearance-none bg-gray-50 border p-2.5 rounded-lg text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-green-500 pr-8"
                      value={formData.tipoDoc} onChange={e => setFormData({...formData, tipoDoc: e.target.value})}>
                      <option value="V">V-</option>
                      <option value="E">E-</option>
                      <option value="J">J-</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                  <input required type="text" inputMode="numeric" pattern="\d*" minLength={7} maxLength={9} className="w-full border p-2.5 rounded-lg bg-gray-50 flex-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Ej. 12345678" 
                    value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value.replace(/\D/g, '').slice(0, 9)})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sector Residencial / Comercial</label>
                <select required className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})}>
                  <option value="">Selecciona tu sector...</option>
                  {SECTORES.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                <input required type="tel" inputMode="numeric" minLength={11} maxLength={11} className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Ej. 04141234567" 
                  value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value.replace(/\D/g, '').slice(0, 11)})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección Exacta</label>
                <textarea required className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Ej. Calle 3, Casa #45, frente a la panadería..." rows={2}
                  value={formData.direccionExtra} onChange={e => setFormData({...formData, direccionExtra: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código de Personal (Opcional)</label>
                <input type="text" className="w-full border p-2.5 rounded-lg bg-yellow-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-500" placeholder="Ej. CLAVE-123" 
                  value={formData.codigoAcceso} onChange={e => setFormData({...formData, codigoAcceso: e.target.value})} />
                <p className="text-xs text-orange-600 mt-1.5 font-semibold leading-tight">
                  Solo para registro de administradores de la alcaldía. Déjalo en blanco si eres ciudadano.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
            <input required type="email" className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="correo@ejemplo.com" 
              value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contraseña</label>
            <input required type="password" minLength={6} className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Mínimo 6 caracteres" 
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <button disabled={loading} type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl mt-6 flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <LogIn className="w-5 h-5"/>} 
            {isRegistering ? "Crear Cuenta" : "Entrar"}
          </button>
          
          <div className="text-center mt-4 flex flex-col gap-3">
            {!isRegistering && (
              <button type="button" onClick={handleResetPassword} className="text-sm font-bold text-gray-500 hover:text-green-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            )}
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(""); }} className="text-sm font-bold text-green-700 hover:underline">
              {isRegistering ? "¿Ya tienes cuenta? Inicia sesión aquí" : "¿No tienes cuenta? Regístrate aquí"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

// ==========================================
// PANTALLAS (MOCKS)
// ==========================================

function SettingsScreen({ userData, reportesActivos, pagosActivos, onBack }: { userData: any, reportesActivos: any[], pagosActivos: any[], onBack: () => void }) {
  const [historyView, setHistoryView] = useState<'none' | 'reportes' | 'pagos'>('none');
  const [loading, setLoading] = useState(false);

  if (historyView === 'reportes') {
    return (
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in slide-in-from-right-4">
        <h2 className="text-xl font-black text-gray-800 border-b pb-3">Historial Global de Reportes</h2>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {reportesActivos.length === 0 && <p className="text-gray-500 text-sm font-medium text-center py-4">No hay reportes registrados.</p>}
          {reportesActivos.map(r => (
             <div key={r.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm text-gray-800">{r.problema}</span>
                  <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ml-2 ${r.estado === 'resuelto' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{r.estado === 'resuelto' ? 'Resuelto' : 'Pendiente'}</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">{r.usuario || 'Anónimo'} • {r.sector || 'Sin sector'}</p>
                <p className="text-xs text-gray-400 mt-1">{r.tiempo}</p>
             </div>
          ))}
        </div>
        <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg transition mt-4" onClick={() => setHistoryView('none')}>Volver a Ajustes</button>
      </div>
    );
  }

  if (historyView === 'pagos') {
    const pagosFiltrados = pagosActivos.filter(p => p.estado === 'aprobado' || p.estado === 'rechazado');
    return (
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in slide-in-from-right-4">
        <h2 className="text-xl font-black text-gray-800 border-b pb-3">Historial de Pagos Procesados</h2>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {pagosFiltrados.length === 0 && <p className="text-gray-500 text-sm font-medium text-center py-4">No hay pagos procesados (aprobados o rechazados).</p>}
          {pagosFiltrados.map(p => (
             <div key={p.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm text-gray-800">{p.usuario || 'Anónimo'}</span>
                  <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ml-2 ${p.estado === 'aprobado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.estado}</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">{p.monto} • {p.metodo === 'pago_movil' ? 'Pago Móvil' : p.metodo}</p>
                <p className="text-xs text-gray-400 mt-1">{p.fecha}</p>
             </div>
          ))}
        </div>
        <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg transition mt-4" onClick={() => setHistoryView('none')}>Volver a Ajustes</button>
      </div>
    );
  }

  const handlePasswordReset = async () => {
    if (!userData.correo) {
      alert("No hay un correo registrado para esta cuenta.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, userData.correo);
      alert("Te hemos enviado un correo a " + userData.correo + " con el enlace para cambiar tu contraseña.");
    } catch (err: any) {
      alert("Error al enviar el correo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center border-b pb-3">
        <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-600" /> Mi Cuenta
        </h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nombre Completo</p>
          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">{userData.nombre}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cédula de Identidad</p>
          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">{userData.documento}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Correo Electrónico</p>
          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">{userData.correo || 'correo@ejemplo.com'}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Teléfono</p>
          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">{userData.telefono || 'No registrado'}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sector Residencial</p>
          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
            {SECTORES.find(s => s.id === userData.sector)?.nombre || 'Sector no especificado'}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Rol de Sistema</p>
          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 capitalize">{userData.rol}</p>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <button 
          onClick={handlePasswordReset}
          disabled={loading}
          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 rounded-lg transition border border-blue-200 disabled:opacity-50"
        >
          {loading ? "Enviando correo..." : "Cambiar Contraseña"}
        </button>

        {userData.rol === 'admin' && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <button onClick={() => setHistoryView('reportes')} className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold py-2 rounded-lg text-sm transition">
              Historial Reportes
            </button>
            <button onClick={() => setHistoryView('pagos')} className="w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold py-2 rounded-lg text-sm transition">
              Pagos Procesados
            </button>
          </div>
        )}
      </div>

      <button className="w-full text-gray-500 font-bold py-2 text-sm hover:text-gray-800 transition" onClick={onBack}>
        Volver
      </button>
    </div>
  );
}

function AppCiudadana({ userData, onSubmitReport, reportesActivos, pagosActivos, onSubmitPago }: { userData: any, onSubmitReport: (r: any) => void, reportesActivos: any[], pagosActivos: any[], onSubmitPago: (p: any) => void }) {
  const [view, setView] = useState<'home' | 'report' | 'report-success' | 'pay' | 'settings'>('home');
  const [tasaBcv, setTasaBcv] = useState<number>(36.5);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'submitted'>('pending');
  const [paymentMethod, setPaymentMethod] = useState<'pago_movil' | 'zelle' | 'efectivo'>('efectivo');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentPhoto, setPaymentPhoto] = useState<string | null>(null);
  
  const [reportData, setReportData] = useState({ problema: '', ubicacion: '', descripcion: '' });
  const [reportPhoto, setReportPhoto] = useState<string | null>(null);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

  const TARIFA_USD = 5;
  const TARIFA_BS = TARIFA_USD * tasaBcv;

  useEffect(() => {
    fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      .then(res => res.json())
      .then(data => { if (data && data.promedio) setTasaBcv(data.promedio); })
      .catch(err => console.error("Error tasa:", err));
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportPhoto(URL.createObjectURL(file));
    }
  };

  return (
    <div className="space-y-6">
      {view === 'home' && (
        <>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sector Actual</p>
            <h2 className="text-xl font-black text-gray-800 leading-tight pr-10">
              {SECTORES.find(s => s.id === userData.sector)?.nombre || 'Sector no especificado'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{userData.documento} • {userData.nombre}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{userData.correo}</p>
            <div className="mt-4 inline-block bg-green-100 text-green-800 text-xs font-black px-3 py-1 rounded-full">Servicio Activo</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => { setView('report'); setReportPhoto(null); setReportData({ problema: '', ubicacion: '', descripcion: '' }); }} className="bg-white border-2 border-green-600 p-6 rounded-2xl shadow-sm hover:bg-green-50 transition flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-10 h-10 text-green-600" />
              <span className="font-bold text-green-900 leading-tight">Reportar<br/>Falla</span>
            </button>
            <button onClick={() => { setView('pay'); setPaymentStatus('pending'); }} className="bg-green-600 p-6 rounded-2xl shadow-sm hover:bg-green-700 transition flex flex-col items-center justify-center gap-3 text-white">
              <CreditCard className="w-10 h-10" />
              <span className="font-bold leading-tight">Pagar<br/>Mensualidad</span>
            </button>
          </div>

          <div className="mt-8">
            <h3 className="font-black text-lg text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" /> Tu Historial
            </h3>
            
            <div className="space-y-4">
              {/* PAGOS ACTIVOS DEL USUARIO */}
              {pagosActivos.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                   <div>
                      <p className="font-bold text-gray-800 text-sm">Pago de Mensualidad</p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">
                        {p.metodo === 'pago_movil' ? 'Pago Móvil' : p.metodo} 
                        {p.ref && ` • Ref: ${p.ref}`}
                        {p.foto && ` • (Foto enviada)`}
                      </p>
                   </div>
                   <span className={`text-xs font-black px-2 py-1 rounded ${p.estado === 'aprobado' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                     {p.estado === 'aprobado' ? 'Aprobado' : 'Pendiente'}
                   </span>
                </div>
              ))}

              {/* REPORTES ACTIVOS DEL USUARIO */}
              {reportesActivos.length > 0 ? reportesActivos.map(r => (
                 <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                   <div className="flex justify-between items-start">
                     <div>
                        <p className="font-bold text-gray-800 text-sm">{r.problema}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.tiempo}</p>
                     </div>
                     <span className={`text-xs font-black px-2 py-1 rounded text-center whitespace-nowrap ${
                        r.estado === 'resuelto' ? 'bg-green-100 text-green-800' :
                        r.estado === 'foto_requerida' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-600'
                     }`}>
                        {r.estado === 'resuelto' ? 'Resuelto' : 
                         r.estado === 'foto_requerida' ? 'En Proceso' : 
                         'Pendiente de Revisión'}
                     </span>
                   </div>
                   
                   {r.fotoRespuesta && (
                     <div className="mt-3 border-t pt-3 border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2 text-center">Foto de Resolución (Supervisor)</p>
                        <img src={r.fotoRespuesta} alt="Resolución" className="w-full h-auto object-cover rounded-lg border border-gray-200" />
                     </div>
                   )}
                 </div>
              )) : (
                 <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-500 font-medium">
                   Aún no has realizado reportes.
                 </div>
              )}
            </div>
          </div>
        </>
      )}

      {view === 'report' && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-black text-gray-800 mb-4 border-b pb-3">Reportar Problema</h2>
          
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            if (!reportPhoto) {
              alert("Por favor, añade una evidencia fotográfica antes de enviar el reporte.");
              return;
            }
            onSubmitReport({ ...reportData, foto: reportPhoto, estado: 'asignado', tiempo: 'Hace 1 min' }); 
            setView('report-success'); 
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Problema</label>
              <select required className="w-full border p-3 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-gray-800 cursor-pointer"
                value={reportData.problema} onChange={e => setReportData({...reportData, problema: e.target.value})}>
                <option value="">Selecciona el problema...</option>
                <option value="Basura no recolectada">Basura no recolectada</option>
                <option value="Contenedor desbordado o dañado">Contenedor desbordado o dañado</option>
                <option value="Escombros o poda pesada">Escombros o poda pesada</option>
                <option value="Otro">Otro (Especifique en la descripción)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ubicación Específica</label>
              <input required type="text" className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" placeholder="Ej. Frente a la panadería..." 
                value={reportData.ubicacion} onChange={e => setReportData({...reportData, ubicacion: e.target.value})} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción Extra</label>
              <textarea className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium min-h-[100px]" placeholder="Detalles adicionales del problema..." 
                value={reportData.descripcion} onChange={e => setReportData({...reportData, descripcion: e.target.value})} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Evidencia Fotográfica <span className="text-red-500">*</span></label>
              <div className="w-full border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                {reportPhoto ? (
                  <div className="relative">
                    <img src={reportPhoto} alt="Evidencia" className="w-full h-48 object-cover" />
                    <button type="button" onClick={() => setReportPhoto(null)} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow-md transition">
                      Quitar Foto
                    </button>
                  </div>
                ) : (
                  <div className="flex divide-x-2 divide-dashed divide-gray-300">
                    <label className="flex-1 p-4 hover:bg-green-50 cursor-pointer transition flex flex-col items-center group">
                      <Camera className="w-8 h-8 mb-2 text-gray-400 group-hover:text-green-600 transition" />
                      <p className="font-bold text-xs uppercase text-gray-600 group-hover:text-green-700">Cámara</p>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                    <label className="flex-1 p-4 hover:bg-blue-50 cursor-pointer transition flex flex-col items-center group">
                      <ImagePlus className="w-8 h-8 mb-2 text-gray-400 group-hover:text-blue-600 transition" />
                      <p className="font-bold text-xs uppercase text-gray-600 group-hover:text-blue-700">Galería</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg mt-4 transition">
              Enviar Reporte
            </button>
            <button type="button" className="w-full text-gray-500 font-bold text-sm py-2 hover:text-gray-800" onClick={() => setView('home')}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      {view === 'report-success' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-800 mb-2">¡Ha sido enviado con éxito!</h2>
          <p className="text-gray-500 mb-6 text-sm">Tu reporte ha sido asignado a la cuadrilla de limpieza más cercana.</p>
          
          <button onClick={() => { setView('report'); setReportPhoto(null); setReportData({ problema: '', ubicacion: '', descripcion: '' }); }} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg mb-3 transition">
            ¿Quieres enviar otro reporte?
          </button>
          <button onClick={() => setView('home')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-lg transition">
            Volver al Inicio
          </button>
        </div>
      )}

      {/* PANTALLA DE PAGO */}
      {view === 'pay' && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="font-bold text-lg border-b pb-2">Pago de Mensualidad</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-500 font-semibold mb-1">Total a pagar</p>
            <p className="text-3xl font-black text-green-700">{TARIFA_BS.toFixed(2)} Bs</p>
            <p className="text-xs text-gray-400 mt-1">Equivalente a ${TARIFA_USD.toFixed(2)} USD (Tasa BCV: {tasaBcv})</p>
          </div>
          {paymentStatus === 'pending' ? (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Método de pago</label>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${paymentMethod === 'pago_movil' ? 'bg-green-50 border-green-500' : ''}`}>
                  <input type="radio" name="payment" onChange={() => setPaymentMethod('pago_movil')} />
                  <span className="font-semibold text-sm">Pago Móvil</span>
                </label>
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${paymentMethod === 'zelle' ? 'bg-green-50 border-green-500' : ''}`}>
                  <input type="radio" name="payment" onChange={() => setPaymentMethod('zelle')} />
                  <span className="font-semibold text-sm">Transferencia Zelle</span>
                </label>
                <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${paymentMethod === 'efectivo' ? 'bg-green-50 border-green-500' : ''}`}>
                  <input type="radio" name="payment" defaultChecked onChange={() => setPaymentMethod('efectivo')} />
                  <span className="font-semibold text-sm">Efectivo en Taquilla</span>
                </label>
              </div>
                {(paymentMethod === 'pago_movil' || paymentMethod === 'zelle') && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Número de Referencia (Opcional si sube foto)</label>
                      <input type="text" placeholder="Ej: 0034912" className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-green-500" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Comprobante o Captura</label>
                      <label className="w-full block border-2 border-dashed border-gray-300 rounded-xl overflow-hidden text-center text-gray-500 hover:bg-gray-50 hover:border-green-500 cursor-pointer transition">
                        {paymentPhoto ? (
                          <div className="relative">
                            <img src={paymentPhoto} alt="Comprobante" className="w-full h-32 object-cover" />
                            <button type="button" onClick={(e) => { e.preventDefault(); setPaymentPhoto(null); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 px-3 text-xs font-bold shadow">Quitar</button>
                          </div>
                        ) : (
                          <div className="p-4">
                            <Upload className="w-6 h-6 mx-auto mb-1 opacity-50 text-blue-500" />
                            <p className="font-bold text-sm text-gray-600">Seleccionar imagen</p>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setPaymentPhoto(URL.createObjectURL(file));
                        }} />
                      </label>
                    </div>
                  </div>
                )}
                <button className="w-full bg-green-600 text-white font-bold py-3 rounded-lg mt-4 flex items-center justify-center gap-2" onClick={() => {
                  if ((paymentMethod === 'pago_movil' || paymentMethod === 'zelle') && !paymentRef && !paymentPhoto) {
                    alert("Debes escribir el número de referencia o subir una foto del comprobante.");
                    return;
                  }
                  onSubmitPago({
                    usuario: userData.nombre,
                    cedula: userData.documento,
                    sector: userData.sector,
                    monto: `${TARIFA_BS.toFixed(2)} Bs`,
                    metodo: paymentMethod,
                    ref: paymentRef || 'Foto adjunta',
                    foto: paymentPhoto,
                    fecha: new Date().toLocaleDateString('es-VE'),
                    estado: 'pendiente'
                  });
                  setPaymentStatus('submitted');
                }}>
                  <FileText className="w-5 h-5"/> Enviar Reporte de Pago
                </button>
              </div>
            ) : (
            <div className="bg-green-50 border-2 border-green-200 text-green-800 p-6 rounded-xl text-center mt-4">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
              <h3 className="font-bold text-lg leading-tight mb-2">Pago enviado</h3>
              <p className="text-sm opacity-90">Tu pago está pendiente de revisión por parte del supervisor.</p>
            </div>
          )}
          <button className="w-full text-gray-500 font-semibold py-2 text-sm" onClick={() => setView('home')}>Volver</button>
        </div>
      )}

    </div>
  );
}

// ==========================================
// 2. APP SUPERVISOR (UI DE CAMPO)
// ==========================================

const RUTAS_POR_DIA = {
  lunes: [
    { tipo: "Semanal 01", tramos: ["Urb. Las Colinas", "Los Chaguaramos", "Los Chaguaramos CECAT"] },
    { tipo: "Trimotos", tramos: ["Casco Central", "Alcaldía", "SETRIB", "Intendencia Municipal"] },
    { tipo: "Catorcenal", tramos: ["Calle El Márquez", "Sector El Recreo", "Sector El Valle"] },
    { tipo: "Quincenal", tramos: ["Sector María Alejandra", "Container Unidad de Diálisis"] }
  ],
  martes: [
    { tipo: "Semanal 02", tramos: ["San Andrés", "Urb. Prados de la Villa", "C.D.I. San Andres"] },
    { tipo: "Trimotos", tramos: ["Casco Central", "Res. Portal El Rosario", "IMA"] },
    { tipo: "Catorcenal", tramos: ["Sector Venezuela", "Calle Dabajuro", "Sector Rafael Caldera", "Sector La Culebra"] }
  ],
  miercoles: [
    { tipo: "Semanal 03", tramos: ["Calle Adolfo López", "Calle El Pantano", "Santa Teresa"] },
    { tipo: "Trimotos", tramos: ["Casco Central", "Urb. Villa Karelis", "Residencias Villa Encantada"] },
    { tipo: "Catorcenal", tramos: ["Sector San José", "Calle Bolívar", "Sector Aurora I", "Sector Aurora II"] }
  ],
  jueves: [
    { tipo: "Semanal 04", tramos: ["Calle Jesús Enrique Lozada", "Calle Gerico", "Calle Vargas"] },
    { tipo: "Trimotos", tramos: ["Casco Central", "Res. Villa Nueva", "Res. Los Angeles"] },
    { tipo: "Catorcenal", tramos: ["Sector Corito", "San Francisco de corito", "Sector Trujillo I"] }
  ],
  viernes: [
    { tipo: "Semanal 14", tramos: ["Sector la cueva"] },
    { tipo: "Trimotos", tramos: ["Casco Central", "Calle Municipal", "Sector Los Pereguetos"] },
    { tipo: "Catorcenal", tramos: ["Sector Amparo", "Sector juan Gil", "Sector Las Palmeras", "Sector Delicias"] }
  ],
  sabado: [
    { tipo: "Trimotos", tramos: ["Casco Central", "Av. 18 Maestra Sara Zegarra", "Res. Los Carrasco"] },
    { tipo: "Catorcenal", tramos: ["Sector los Haticos", "Sector el Carmen", "Sector Noriega Trigo I", "Sector Noriega Trigo II"] }
  ],
  domingo: [
    { tipo: "Catorcenal", tramos: ["Sector Los Haticos", "Sector Puentecitos", "Sector Arimpia", "Sector Juan Gil 1", "Sector Maticas"] }
  ]
};

function AppSupervisor({ reportesActivos, onResolveReport, historialRutas, setHistorialRutas }: { reportesActivos: any[], onResolveReport: (id: string, step: string, foto?: string) => void, historialRutas: any[], setHistorialRutas: (h: any[]) => void }) {
  const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(todayStr);
  const [expandedReportes, setExpandedReportes] = useState<string[]>([]);

  const toggleTramo = (tramo: string, tipo: string) => {
    const exists = historialRutas.find(h => h.tramo === tramo && h.fecha === fechaSeleccionada);
    if (exists) {
      setHistorialRutas(historialRutas.filter(h => h !== exists));
    } else {
      setHistorialRutas([...historialRutas, { tramo, tipo, fecha: fechaSeleccionada }]);
    }
  };

  const getTramoStatus = (tramo: string, tipo: string) => {
    // Si fue completado hoy mismo
    const doneToday = historialRutas.find(h => h.tramo === tramo && h.fecha === fechaSeleccionada);
    if (doneToday) return { isCompleted: true, doneToday: true };
    
    // Validar frecuencia
    let daysCooldown = 0;
    const tLower = tipo.toLowerCase();
    if (tLower.includes('catorcenal')) daysCooldown = 14;
    else if (tLower.includes('quincenal')) daysCooldown = 15;
    else if (tLower.includes('semanal')) daysCooldown = 7;
    else if (tLower.includes('trimotos')) daysCooldown = 1;

    if (daysCooldown === 0) return { isCompleted: false, doneToday: false };

    // Buscar si se completó recientemente
    const pastCompletions = historialRutas
       .filter(h => h.tramo === tramo && new Date(h.fecha) <= new Date(fechaSeleccionada))
       .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    if (pastCompletions.length > 0) {
       const lastDate = new Date(pastCompletions[0].fecha + 'T00:00:00');
       const selectedDate = new Date(fechaSeleccionada + 'T00:00:00');
       const diffTime = Math.abs(selectedDate.getTime() - lastDate.getTime());
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
       
       if (diffDays < daysCooldown) {
         return { isCompleted: true, doneToday: false, diffDays };
       }
    }
    return { isCompleted: false, doneToday: false };
  };

  const dateObj = new Date(fechaSeleccionada + 'T00:00:00');
  const diaSemanaIndex = dateObj.getDay();
  const diaSeleccionado = DIAS_SEMANA[diaSemanaIndex];
  const isToday = fechaSeleccionada === todayStr;
  
  const rutasDelDia = RUTAS_POR_DIA[diaSeleccionado as keyof typeof RUTAS_POR_DIA] || [];

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 text-white p-4 rounded-xl shadow-md flex justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Operario / Camión</p>
          <p className="font-black text-lg">SUP-04 / CM-02</p>
        </div>
        <div className="bg-blue-600 px-3 py-1 rounded text-xs font-bold uppercase">En Ruta</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* COLUMNA 1: CHECKLIST DE RUTAS */}
        <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-black text-xl text-gray-800 flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-green-600"/> Tramos Asignados
          </h2>
          <div className="relative w-full">
            <input 
              type="date" 
              className="appearance-none w-full border-2 border-green-600 p-3 rounded-lg bg-green-50 text-green-800 font-black focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              value={fechaSeleccionada} 
              onChange={(e) => setFechaSeleccionada(e.target.value)}
            />
          </div>
          <p className="text-sm font-bold text-gray-500 capitalize">
            Rutas del {diaSeleccionado} {isToday ? '(Hoy)' : ''}
          </p>
        </div>
        
        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {rutasDelDia.length === 0 ? (
            <div className="p-4 text-center text-gray-500 font-bold">No hay rutas asignadas para este día.</div>
          ) : rutasDelDia.map((grupoRuta) => (
            <div key={grupoRuta.tipo}>
              <div className="bg-gray-100 px-4 py-2 border-b border-t font-black text-xs text-gray-500 uppercase tracking-wider">{grupoRuta.tipo}</div>
              {grupoRuta.tramos.map((tramo, index) => {
                const status = getTramoStatus(tramo, grupoRuta.tipo);
                return (
                  <div key={tramo} className={`p-4 border-b flex items-center justify-between transition ${status.isCompleted ? 'bg-green-50' : 'bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${status.isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{index + 1}</div>
                      <div>
                        <span className={`font-bold text-base sm:text-lg leading-tight ${status.isCompleted ? 'text-green-800 line-through opacity-70' : 'text-gray-800'}`}>{tramo}</span>
                        {status.isCompleted && !status.doneToday && (
                          <p className="text-[10px] text-green-600 font-bold uppercase mt-0.5">Completado recientemente</p>
                        )}
                      </div>
                    </div>
                    {status.doneToday ? (
                      <button onClick={() => toggleTramo(tramo, grupoRuta.tipo)} className="px-4 py-3 rounded-lg font-bold text-xs sm:text-sm uppercase transition flex-shrink-0 ml-2 bg-gray-200 text-gray-600 hover:bg-gray-300">
                        Deshacer
                      </button>
                    ) : !status.isCompleted ? (
                      <button onClick={() => toggleTramo(tramo, grupoRuta.tipo)} className="px-4 py-3 rounded-lg font-bold text-xs sm:text-sm uppercase transition flex-shrink-0 ml-2 bg-green-600 hover:bg-green-700 text-white shadow-md">
                        Completar
                      </button>
                    ) : (
                      <div className="px-4 py-3 rounded-lg font-bold text-xs uppercase text-green-600 bg-green-100 flex-shrink-0 ml-2 border border-green-200">
                        <CheckCircle className="w-5 h-5 inline-block" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

        {/* COLUMNA 2: REPORTES ASIGNADOS */}
        <div className="space-y-4 pt-4 md:pt-0 border-t-2 md:border-t-0 md:border-l-2 md:pl-8 border-dashed border-gray-300">
        <h2 className="font-black text-xl text-gray-800">Reportes Asignados ({reportesActivos.length})</h2>
        
        {reportesActivos.length === 0 && (
          <div className="p-6 text-center text-gray-500 font-bold bg-white rounded-xl border border-dashed">
            No hay reportes pendientes en tu ruta.
          </div>
        )}

        {reportesActivos.filter(r => r.estado !== 'resuelto').map((reporte) => {
          const isExpanded = expandedReportes.includes(reporte.id);
          return (
            <div key={reporte.id} className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm mb-4 transition-all">
              <div 
                className={`flex justify-between items-start cursor-pointer group ${isExpanded ? 'mb-4 border-b pb-4' : ''}`}
                onClick={() => setExpandedReportes(prev => prev.includes(reporte.id) ? prev.filter(id => id !== reporte.id) : [...prev, reporte.id])}
              >
                <div className="flex-1 pr-4">
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-[10px] font-black rounded mb-2 uppercase">Alta Prioridad</span>
                  <h3 className="font-bold text-lg leading-tight text-gray-900 mb-1">{reporte.problema}</h3>
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mb-2">
                    <p className="font-bold text-sm text-gray-800">{reporte.usuario || 'Ciudadano'}</p>
                    <p className="text-xs text-gray-500">{reporte.cedula || ''} • Sector {reporte.sector || ''}</p>
                  </div>
                  <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4 flex-shrink-0"/> <span className="truncate">{reporte.ubicacion}</span>
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-xs font-bold text-gray-400 whitespace-nowrap">{reporte.tiempo}</span>
                  <div className="text-gray-400 group-hover:text-green-600 transition-colors">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="animate-fade-in">
                  {reporte.descripcion && (
                    <p className="text-gray-600 text-sm mb-4 italic border-l-2 border-gray-300 pl-3 py-1 bg-gray-50 rounded-r-lg">
                      "{reporte.descripcion}"
                    </p>
                  )}

                  {reporte.foto && (
                    <div className="mb-4 rounded-lg border border-gray-200">
                      <p className="text-xs font-bold text-gray-500 bg-gray-50 p-2 uppercase text-center border-b border-gray-200 rounded-t-lg">Foto del Ciudadano</p>
                      <img src={reporte.foto} alt="Evidencia" className="w-full h-auto max-h-64 object-contain rounded-b-lg bg-black" />
                    </div>
                  )}

                  {reporte.estado === 'asignado' && (
                    <button onClick={(e) => { e.stopPropagation(); onResolveReport(reporte.id, 'foto_requerida'); }} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-base uppercase flex items-center justify-center gap-2 transition">
                      <CheckCircle className="w-5 h-5" /> Iniciar Resolución
                    </button>
                  )}

                  {reporte.estado === 'foto_requerida' && (
                    <div className="bg-orange-50 border-2 border-dashed border-orange-300 p-4 rounded-xl text-center">
                      <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-orange-800 font-bold mb-3 leading-tight">Trabajo en sitio. Sube foto para cerrar el caso.</p>
                      
                      <div className="flex gap-2">
                        <label className="flex-1 bg-white border-2 border-orange-300 text-orange-700 hover:bg-orange-100 py-3 rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-2">
                          <Camera className="w-5 h-5"/> Tomar Foto
                          <input type="file" accept="image/*" capture="environment" className="hidden" onClick={(e) => e.stopPropagation()} onChange={(e) => {
                            if(e.target.files && e.target.files[0]) {
                              onResolveReport(reporte.id, 'resuelto', URL.createObjectURL(e.target.files[0]));
                            }
                          }}/>
                        </label>
                        <label className="flex-1 bg-white border-2 border-orange-300 text-orange-700 hover:bg-orange-100 py-3 rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-2">
                          <ImagePlus className="w-5 h-5"/> Subir Foto
                          <input type="file" accept="image/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={(e) => {
                            if(e.target.files && e.target.files[0]) {
                              onResolveReport(reporte.id, 'resuelto', URL.createObjectURL(e.target.files[0]));
                            }
                          }}/>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {reporte.estado === 'resuelto' && (
                    <div className="bg-gray-100 text-gray-500 font-bold p-4 rounded-xl text-center flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" /> Completado y Registrado
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>


    </div>
  );
}

// ==========================================
// 3. PANEL ADMINISTRATIVO (OFICINA)
// ==========================================
function PanelAdmin({ pagosActivos, onApprovePago, onRejectPago, onResetPagos }: { pagosActivos?: any[], onApprovePago?: (id: string) => void, onRejectPago?: (id: string) => void, onResetPagos?: () => void }) {
  const [adminTab, setAdminTab] = useState<'resumen' | 'pagos' | 'usuarios'>('resumen');
  const [tasaBcv, setTasaBcv] = useState<number | null>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [expandedPagos, setExpandedPagos] = useState<string[]>([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');

  useEffect(() => {
    fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      .then(res => res.json())
      .then(data => { if (data && data.promedio) setTasaBcv(data.promedio); })
      .catch(err => console.error("Error tasa:", err));

    // Escuchar cambios en la colección de usuarios en tiempo real
    const unsubscribeUsers = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuarios(usersData);
    }, (err) => {
      console.error("Error escuchando usuarios:", err);
    });

    return () => unsubscribeUsers();
  }, []);

  // Filter payments
  const pendingPayments = (pagosActivos || []).filter(p => p.estado === 'pendiente');
  const approvedPayments = (pagosActivos || []).filter(p => p.estado === 'aprobado');
  
  const TARIFA_USD = 5;
  const totalUSD = approvedPayments.length * TARIFA_USD;
  const totalBS = tasaBcv ? (totalUSD * tasaBcv).toFixed(2) : '0.00';

  const aprobarPago = (id: string) => {
    if (onApprovePago) onApprovePago(id);
    alert('Pago #00' + id + ' aprobado con éxito. Folio generado.');
  };

  const handleReset = () => {
    if (window.confirm('⚠️ ADVERTENCIA: ¿Estás seguro de que deseas restablecer la recaudación? Esto eliminará todos los pagos aprobados del cálculo actual.')) {
      if (onResetPagos) onResetPagos();
    }
  };

  const getPaymentStatus = (u: any) => {
    // Buscar si el usuario tiene algún pago enviado
    const userPayments = (pagosActivos || []).filter(p => p.cedula === u.documento || p.cedula === u.cedula || p.uid === u.id);
    
    if (userPayments.length > 0) {
      const latestPayment = userPayments[0];
      if (latestPayment.estado === 'aprobado') return { label: 'Pago Aprobado', color: 'bg-green-100 text-green-800' };
      if (latestPayment.estado === 'pendiente') return { label: 'Pago en Revisión', color: 'bg-blue-100 text-blue-800' };
    }
    
    // Si no tiene pagos activos, verificar fecha de registro
    if (u.fechaRegistro) {
      const creationDate = new Date(u.fechaRegistro);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      if (creationDate < oneMonthAgo) {
        return { label: 'Deudor (Más de 1 mes)', color: 'bg-red-100 text-red-800' };
      }
    }
    
    return { label: 'No ha enviado pago', color: 'bg-orange-100 text-orange-800' };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Navegación interna del Panel Admin (Botones más grandes) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-col md:flex-row gap-2">
        <button onClick={() => setAdminTab('resumen')} className={`flex-1 px-4 py-4 rounded-xl text-base font-black transition-colors ${adminTab === 'resumen' ? 'bg-green-700 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
          📊 Resumen
        </button>
        <button onClick={() => setAdminTab('pagos')} className={`flex-1 px-4 py-4 rounded-xl text-base font-black transition-colors flex items-center justify-center gap-2 ${adminTab === 'pagos' ? 'bg-green-700 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
          💰 Validar Pagos 
          {pendingPayments.length > 0 && <span className={`${adminTab === 'pagos' ? 'bg-white text-green-700' : 'bg-red-500 text-white'} text-sm px-2 py-0.5 rounded-full`}>{pendingPayments.length}</span>}
        </button>
        <button onClick={() => setAdminTab('usuarios')} className={`flex-1 px-4 py-4 rounded-xl text-base font-black transition-colors ${adminTab === 'usuarios' ? 'bg-green-700 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
          👥 Ciudadanos
        </button>
      </div>

      {adminTab === 'resumen' && (
        <div className="space-y-4">
          {tasaBcv && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex justify-between items-center shadow-sm">
              <span className="font-bold text-sm uppercase">Tasa BCV del Día</span>
              <span className="font-black text-lg">{tasaBcv} Bs/USD</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-bold">Recaudación (Mes)</p>
              <p className="text-2xl font-black text-gray-800 mt-1">{totalBS} Bs</p>
              <p className="text-xs text-green-600 font-bold mt-1">~ ${totalUSD} USD</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-bold">Pagos Aprobados</p>
              <p className="text-2xl font-black text-gray-800 mt-1">{approvedPayments.length}</p>
              <p className="text-xs text-gray-400 mt-1">En esta sesión</p>
            </div>
          </div>

          <button onClick={handleReset} className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold py-3 rounded-xl transition shadow-sm">
            Restablecer Recaudación
          </button>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-10 text-center">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
               <Shield className="w-8 h-8 text-gray-300" />
             </div>
             <h3 className="font-bold text-gray-500">Módulo de Estadísticas</h3>
             <p className="text-sm text-gray-400">Las gráficas se generarán al conectar con la base de datos real.</p>
          </div>
        </div>
      )}

      {adminTab === 'pagos' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center shadow-sm mb-2">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-0.5">Tarifa Oficial (5 USD)</p>
              <p className="font-black text-blue-900 text-lg">{(5 * (tasaBcv || 0)).toFixed(2)} Bs</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-blue-500 uppercase">Tasa BCV Referencial</p>
              <p className="font-bold text-blue-800">{tasaBcv || '---'} Bs/USD</p>
            </div>
          </div>

          <h3 className="font-bold text-gray-800 text-lg">Pagos por Validar</h3>
          {pendingPayments.length === 0 ? (
            <div className="bg-white p-8 rounded-xl text-center shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-gray-500 font-bold">No hay pagos pendientes de revisión.</p>
            </div>
          ) : (
            pendingPayments.map(pago => {
              const isExpanded = expandedPagos.includes(pago.id);
              return (
                <div key={pago.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 transition-all">
                  <div 
                    className={`flex justify-between items-start cursor-pointer group ${isExpanded ? 'mb-3 border-b pb-3' : ''}`}
                    onClick={() => setExpandedPagos(prev => prev.includes(pago.id) ? prev.filter(id => id !== pago.id) : [...prev, pago.id])}
                  >
                    <div>
                      <p className="font-bold text-gray-800 flex items-center gap-2">
                        {pago.usuario}
                      </p>
                      <p className="text-xs text-gray-500">{pago.cedula} • Sector {pago.sector}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-black text-green-700">{pago.monto}</p>
                        <p className="text-xs font-bold text-gray-400">{pago.fecha}</p>
                      </div>
                      <div className="text-gray-400 group-hover:text-green-600 transition-colors">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="animate-fade-in">
                      <div className="bg-gray-50 p-3 rounded-lg flex flex-col gap-2 mb-4">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500 uppercase font-bold">Método</p>
                          <p className="text-sm font-bold text-gray-800 capitalize">{pago.metodo === 'pago_movil' ? 'Pago Móvil' : pago.metodo}</p>
                        </div>
                        {pago.ref && pago.ref !== 'Foto adjunta' && (
                          <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                            <p className="text-xs text-gray-500 uppercase font-bold">Referencia</p>
                            <p className="text-sm font-mono font-bold text-gray-800">{pago.ref}</p>
                          </div>
                        )}
                        {pago.foto && (
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Comprobante / Captura</p>
                            <img src={pago.foto} alt="Comprobante" className="w-full h-auto max-h-64 object-contain rounded-lg border border-gray-300 shadow-sm" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); aprobarPago(pago.id); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-sm">
                          Aprobar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onRejectPago && onRejectPago(pago.id); }} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-lg font-bold text-sm transition-colors">
                          Rechazar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {adminTab === 'usuarios' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Directorio de Ciudadanos</h3>
            <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">{usuarios.length} Registros</span>
          </div>
          <div className="divide-y">
            {usuarios.length > 0 ? usuarios.map(u => {
              const status = getPaymentStatus(u);
              return (
              <div key={u.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-bold text-gray-800 flex items-center gap-2">
                    {u.nombre}
                    {u.rol === 'admin' && <span className="bg-purple-100 text-purple-800 text-[10px] uppercase font-black px-1.5 py-0.5 rounded">Admin</span>}
                  </p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{u.documento || u.cedula} • {SECTORES.find(s => s.id === u.sector)?.nombre || 'Sector ' + u.sector}</p>
                <p className="text-xs font-medium text-gray-600 mb-1 leading-tight line-clamp-2"><span className="font-bold">Dirección:</span> {u.direccionExtra || 'No especificada'}</p>
                {u.fechaRegistro && (
                  <p className="text-xs text-gray-400 mb-3 font-medium">Registrado el: {new Date(u.fechaRegistro).toLocaleDateString('es-VE')}</p>
                )}
                {!u.fechaRegistro && <div className="mb-3"></div>}
                
                <div className="flex flex-wrap gap-2">
                  <div 
                    title={u.telefono || 'Sin teléfono'} 
                    className="p-2 bg-gray-100 hover:bg-green-50 text-gray-500 hover:text-green-700 rounded-full cursor-pointer transition-all flex items-center gap-2 group"
                    onClick={() => {
                      if (u.telefono) {
                        navigator.clipboard.writeText(u.telefono);
                        alert("Teléfono copiado: " + u.telefono);
                      }
                    }}
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="inline-block text-xs font-bold max-w-0 overflow-hidden group-hover:max-w-[150px] transition-all duration-300 ease-in-out whitespace-nowrap">
                      {u.telefono || 'Sin teléfono'}
                    </span>
                  </div>
                  <div 
                    title={u.correo || 'Sin correo'} 
                    className="p-2 bg-gray-100 hover:bg-green-50 text-gray-500 hover:text-green-700 rounded-full cursor-pointer transition-all flex items-center gap-2 group"
                    onClick={() => {
                      if (u.correo) {
                        navigator.clipboard.writeText(u.correo);
                        alert("Correo copiado: " + u.correo);
                      }
                    }}
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="inline-block text-xs font-bold max-w-0 overflow-hidden group-hover:max-w-[250px] transition-all duration-300 ease-in-out whitespace-nowrap">
                      {u.correo || 'Sin correo'}
                    </span>
                  </div>
                </div>
              </div>
            );
            }) : (
              <div className="p-8 text-center text-gray-400 font-bold">Cargando base de datos...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




















