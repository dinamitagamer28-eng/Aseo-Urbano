"use client";

import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle, MapPin, CreditCard, Shield, AlertTriangle, ListTodo, LogIn, FileText, Loader2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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
  const [activeTab, setActiveTab] = useState<'ciudadano' | 'supervisor' | 'admin'>('ciudadano');
  const [userData, setUserData] = useState({ nombre: '', sector: '', documento: '', uid: '', rol: 'ciudadano' });
  const [loadingSession, setLoadingSession] = useState(true);

  // Estado global falso (mock) para los reportes de la sesión
  const [reportesActivos, setReportesActivos] = useState<any[]>([]);

  const handleSubmitReport = (nuevoReporte: any) => {
    const r = { ...nuevoReporte, id: Date.now().toString() };
    setReportesActivos([r, ...reportesActivos]);
  };

  const handleResolveReport = (id: string, nuevoEstado: string) => {
    setReportesActivos(reportesActivos.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r));
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
            setUserData({ ...data as any, uid: user.uid });
            // Forzar vista de ciudadano si no es admin/supervisor
            if (data.rol === 'ciudadano') {
              setActiveTab('ciudadano');
            }
          } else {
            setUserData({ nombre: 'Usuario', sector: 'Desconocido', documento: '', uid: user.uid, rol: 'ciudadano' });
          }
          setIsLoggedIn(true);
        } catch (error) {
          console.error("Error cargando perfil de Firestore:", error);
          setUserData({ nombre: 'Usuario', sector: 'Error de BD', documento: '', uid: user.uid, rol: 'ciudadano' });
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* HEADER PRINCIPAL */}
      <header className="bg-green-700 text-white p-4 shadow-md z-10 sticky top-0 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" />
          <div>
            <h1 className="font-black text-lg leading-tight">Alcaldía de Rosario de Perijá</h1>
            <p className="text-green-100 text-xs">Sistema de Aseo Urbano</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs font-bold bg-green-800 hover:bg-green-900 px-3 py-2 rounded-lg transition">
          Cerrar Sesión
        </button>
      </header>

      {/* NAVBAR: MODO DE PRUEBA (Solo visible para Admin/Supervisor) */}
      {userData.rol !== 'ciudadano' && (
        <div className="bg-white border-b shadow-sm p-3 flex justify-between items-center text-sm font-bold sticky top-[72px] z-10">
          <span className="text-gray-500 uppercase">Modo Personal:</span>
          <select 
            className="bg-transparent border-none focus:outline-none text-green-700 cursor-pointer text-right"
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value as any)}
          >
            <option value="ciudadano">Vista Ciudadano</option>
            <option value="supervisor">App Supervisor</option>
            <option value="admin">Panel Admin (Oficina)</option>
          </select>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-md mx-auto w-full p-4 relative z-0">
        {activeTab === 'ciudadano' && <AppCiudadana userData={userData} onSubmitReport={handleSubmitReport} />}
        {activeTab === 'supervisor' && <AppSupervisor reportesActivos={reportesActivos} onResolveReport={handleResolveReport} />}
        {activeTab === 'admin' && <PanelAdmin />}
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
          onLogin({ ...docSnap.data(), uid: user.uid });
        } else {
          // Fallback por si la cuenta existe pero no tiene documento
          onLogin({ nombre: 'Usuario', sector: '1', documento: '', uid: user.uid, rol: 'ciudadano' });
        }
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') setErrorMsg("Este correo ya está registrado.");
      else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') setErrorMsg("Correo o contraseña incorrectos.");
      else if (error.code === 'auth/user-not-found') setErrorMsg("No existe una cuenta con este correo.");
      else setErrorMsg("Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-green-700 p-6 text-center text-white">
          <Shield className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-black">Aseo Urbano</h1>
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre y Apellido</label>
                <input required type="text" className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Ej. Juan Pérez" 
                  value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cédula o RIF</label>
                <div className="flex gap-2">
                  <div className="relative">
                    <select className="appearance-none border p-2.5 pr-8 rounded-lg bg-gray-50 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer" 
                      value={formData.tipoDoc} onChange={e => setFormData({...formData, tipoDoc: e.target.value})}>
                      <option value="V">V</option>
                      <option value="E">E</option>
                      <option value="J">J</option>
                      <option value="G">G</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                  <input required type="text" inputMode="numeric" pattern="\d*" maxLength={10} className="w-full border p-2.5 rounded-lg bg-gray-50 flex-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Ej. 12345678" 
                    value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                <input required type="tel" inputMode="numeric" className="w-full border p-2.5 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Ej. 04141234567" 
                  value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value.replace(/\D/g, '')})} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sector (Ruta de Recolección)</label>
                <div className="relative">
                  <select className="appearance-none w-full border p-2.5 pr-8 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                    value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})}>
                    {SECTORES.map(s => <option key={s.id} value={s.id}>{s.id} - {s.nombre}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
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
                  ⚠️ <b>Atención:</b> Este campo es exclusivo para empleados y supervisores de la Alcaldía. Si eres ciudadano, déjalo en blanco.
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
          
          <div className="text-center mt-4">
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

function AppCiudadana({ userData, onSubmitReport }: { userData: any, onSubmitReport: (r: any) => void }) {
  const [view, setView] = useState<'home' | 'report' | 'pay'>('home');
  const [tasaBcv, setTasaBcv] = useState<number>(36.5);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'submitted'>('pending');
  const [paymentMethod, setPaymentMethod] = useState<'pago_movil' | 'zelle' | 'efectivo'>('efectivo');
  
  const [reportData, setReportData] = useState({ problema: '', ubicacion: '' });

  const TARIFA_USD = 5;
  const TARIFA_BS = TARIFA_USD * tasaBcv;

  useEffect(() => {
    fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      .then(res => res.json())
      .then(data => { if (data && data.promedio) setTasaBcv(data.promedio); })
      .catch(err => console.error("Error tasa:", err));
  }, []);

  return (
    <div className="space-y-6">
      {view === 'home' && (
        <>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sector Actual</p>
            <h2 className="text-xl font-black text-gray-800 leading-tight">
              {SECTORES.find(s => s.id === userData.sector)?.nombre || 'Sector no especificado'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{userData.documento} • {userData.nombre}</p>
            <div className="mt-4 inline-block bg-green-100 text-green-800 text-xs font-black px-3 py-1 rounded-full">Servicio Activo</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setView('report')} className="bg-white border-2 border-green-600 p-6 rounded-2xl shadow-sm hover:bg-green-50 transition flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-10 h-10 text-green-600" />
              <span className="font-bold text-green-900 leading-tight">Reportar<br/>Falla</span>
            </button>
            <button onClick={() => { setView('pay'); setPaymentStatus('pending'); }} className="bg-green-600 p-6 rounded-2xl shadow-sm hover:bg-green-700 transition flex flex-col items-center justify-center gap-3 text-white">
              <CreditCard className="w-10 h-10" />
              <span className="font-bold leading-tight">Pagar<br/>Mensualidad</span>
            </button>
          </div>
        </>
      )}

      {view === 'report' && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-black text-gray-800 mb-4 border-b pb-3">Reportar Problema</h2>
          
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            onSubmitReport({ ...reportData, estado: 'asignado', tiempo: 'Hace 1 min' }); 
            setView('home'); 
            setReportData({ problema: '', ubicacion: '' });
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Problema</label>
              <select required className="w-full border p-3 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-gray-800 cursor-pointer"
                value={reportData.problema} onChange={e => setReportData({...reportData, problema: e.target.value})}>
                <option value="">Selecciona el problema...</option>
                <option value="Basura no recolectada">Basura no recolectada</option>
                <option value="Contenedor desbordado o dañado">Contenedor desbordado o dañado</option>
                <option value="Escombros o poda pesada">Escombros o poda pesada</option>
                <option value="Otro">Otro (Especifique en la ubicación)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Punto Exacto del Problema</label>
              <input required type="text" className="w-full border p-3 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" placeholder="Ej. Frente a la panadería..." 
                value={reportData.ubicacion} onChange={e => setReportData({...reportData, ubicacion: e.target.value})} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Evidencia Fotográfica</label>
              <label className="w-full block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 hover:bg-gray-50 hover:border-green-500 cursor-pointer transition">
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-50 text-red-500" />
                <p className="font-bold text-gray-700">Añadir Foto <span className="text-red-500 uppercase text-xs ml-1">(Obligatoria)</span></p>
                <input required type="file" accept="image/*" capture="environment" className="hidden" />
              </label>
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
                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subir Comprobante</label>
                  <label className="w-full block border-2 border-dashed border-gray-300 rounded-xl p-4 text-center text-gray-500 hover:bg-gray-50 hover:border-green-500 cursor-pointer transition">
                    <Upload className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="font-bold text-sm">Seleccionar imagen</p>
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                </div>
              )}
              <button className="w-full bg-green-600 text-white font-bold py-3 rounded-lg mt-4 flex items-center justify-center gap-2" onClick={() => setPaymentStatus('submitted')}>
                <FileText className="w-5 h-5"/> Enviar
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

function AppSupervisor({ reportesActivos, onResolveReport }: { reportesActivos: any[], onResolveReport: (id: string, step: string) => void }) {
  const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaHoyString = DIAS_SEMANA[new Date().getDay()];
  
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(diaHoyString);
  const [tramosCompletados, setTramosCompletados] = useState<string[]>([]);

  const toggleTramo = (tramo: string) => {
    if (tramosCompletados.includes(tramo)) {
      setTramosCompletados(tramosCompletados.filter(t => t !== tramo));
    } else {
      setTramosCompletados([...tramosCompletados, tramo]);
    }
  };

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

      {/* CHECKLIST DE RUTAS */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-black text-xl text-gray-800 flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-green-600"/> Tramos Asignados
          </h2>
          <div className="relative w-full">
            <select className="appearance-none w-full border-2 border-green-600 p-3 pr-8 rounded-lg bg-green-50 text-green-800 font-black focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer capitalize"
              value={diaSeleccionado} onChange={(e) => setDiaSeleccionado(e.target.value)}>
              {DIAS_SEMANA.map((dia) => (
                <option key={dia} value={dia}>Rutas del día: {dia} {dia === diaHoyString ? '(Hoy)' : ''}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {rutasDelDia.map((grupoRuta) => (
            <div key={grupoRuta.tipo}>
              <div className="bg-gray-100 px-4 py-2 border-b border-t font-black text-xs text-gray-500 uppercase tracking-wider">{grupoRuta.tipo}</div>
              {grupoRuta.tramos.map((tramo, index) => {
                const isCompleted = tramosCompletados.includes(tramo);
                return (
                  <div key={tramo} className={`p-4 border-b flex items-center justify-between transition ${isCompleted ? 'bg-green-50' : 'bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{index + 1}</div>
                      <span className={`font-bold text-base sm:text-lg leading-tight ${isCompleted ? 'text-green-800 line-through opacity-70' : 'text-gray-800'}`}>{tramo}</span>
                    </div>
                    <button onClick={() => toggleTramo(tramo)} className={`px-4 py-3 rounded-lg font-bold text-xs sm:text-sm uppercase transition flex-shrink-0 ml-2 ${isCompleted ? 'bg-gray-200 text-gray-600' : 'bg-green-600 text-white shadow-md'}`}>
                      {isCompleted ? 'Deshacer' : 'Completar'}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* REPORTES ASIGNADOS */}
      <div className="space-y-4 pt-4 border-t-2 border-dashed border-gray-300">
        <h2 className="font-black text-xl text-gray-800">Reportes Asignados ({reportesActivos.length})</h2>
        
        {reportesActivos.length === 0 && (
          <div className="p-6 text-center text-gray-500 font-bold bg-white rounded-xl border border-dashed">
            No hay reportes pendientes en tu ruta.
          </div>
        )}

        {reportesActivos.map((reporte) => (
          <div key={reporte.id} className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm mb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-black rounded mb-2 uppercase">Alta Prioridad</span>
                <h3 className="font-bold text-lg leading-tight">{reporte.problema}</h3>
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4"/> {reporte.ubicacion}
                </p>
              </div>
              <span className="text-xs font-bold text-gray-400">{reporte.tiempo}</span>
            </div>

            {reporte.estado === 'asignado' && (
              <button onClick={() => onResolveReport(reporte.id, 'foto_requerida')} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-lg uppercase flex items-center justify-center gap-2 transition">
                <CheckCircle className="w-6 h-6" /> Iniciar Resolución
              </button>
            )}

            {reporte.estado === 'foto_requerida' && (
              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                <p className="text-orange-800 font-bold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5"/> ¡Evidencia requerida por el sistema!
                </p>
                <label className="w-full cursor-pointer bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl text-lg uppercase flex items-center justify-center gap-2 shadow-lg">
                  <Camera className="w-6 h-6" /> Tomar Foto Evidencia
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={() => onResolveReport(reporte.id, 'resuelto')} />
                </label>
              </div>
            )}

            {reporte.estado === 'resuelto' && (
              <div className="w-full bg-gray-100 text-green-700 font-black py-4 rounded-xl text-lg flex items-center justify-center gap-2 border-2 border-green-200">
                <CheckCircle className="w-6 h-6" /> ¡Resuelto y Sincronizado!
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 3. PANEL ADMIN
// ==========================================
function PanelAdmin() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase font-bold">Recaudación (Mes)</p>
          <p className="text-2xl font-black text-gray-800 mt-1">45,600 Bs</p>
          <p className="text-xs text-green-600 font-bold mt-1">~ $1,250 USD</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase font-bold">Reportes Resueltos</p>
          <p className="text-2xl font-black text-gray-800 mt-1">89%</p>
          <p className="text-xs text-gray-400 mt-1">De 142 recibidos</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Auditoría de Folios (Contraloría)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-3 py-2 rounded-tl-lg">Folio</th>
                <th className="px-3 py-2">Sector</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2 rounded-tr-lg">Método</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-3 py-2 font-mono font-bold text-gray-700">#001024</td>
                <td className="px-3 py-2">Las Colinas</td>
                <td className="px-3 py-2">182.50 Bs</td>
                <td className="px-3 py-2"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">Pago Móvil</span></td>
              </tr>
              <tr className="border-b">
                <td className="px-3 py-2 font-mono font-bold text-gray-700">#001025</td>
                <td className="px-3 py-2">Las Colinas</td>
                <td className="px-3 py-2">182.50 Bs</td>
                <td className="px-3 py-2"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">Efectivo</span></td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono font-bold text-gray-700">#001026</td>
                <td className="px-3 py-2">Las Colinas</td>
                <td className="px-3 py-2">182.50 Bs</td>
                <td className="px-3 py-2"><span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold">Zelle</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
