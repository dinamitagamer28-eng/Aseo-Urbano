'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';
import LeafletMap from '@/components/LeafletMap';
import {
  obtenerPadronCompletoCenso,
  guardarCensoCampo,
  crearNuevoInmuebleCensoCampo,
  verificarClaveAdminCenso,
} from '@/lib/actions';
import { generarCertificadoSolvenciaPdf } from '@/lib/generarCertificadoSolvencia';
import {
  Shield,
  MapPin,
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  RefreshCw,
  QrCode,
  Printer,
  FileSpreadsheet,
  Users,
  Compass,
  Crosshair,
  ExternalLink,
  Lock,
  Unlock,
  Building2,
  Phone,
  Edit3,
  Check,
  X,
  AlertTriangle,
  Award,
  Navigation,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';

export default function CensoCampoPage() {
  const { data: session } = useSession();

  // Security Gate
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [verificandoPin, setVerificandoPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [sectores, setSectores] = useState<any[]>([]);
  const [tasaBcv, setTasaBcv] = useState<number>(832.49);

  // Filters & Active Selections
  const [sectorSeleccionado, setSectorSeleccionado] = useState<string>('');
  const [calleFiltro, setCalleFiltro] = useState<string>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'FALTANTES' | 'CENSADOS'>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'lista' | 'mapa' | 'calcomanias'>('lista');

  // GPS Telemetry of the Field Worker
  const [censadorLat, setCensadorLat] = useState<number | null>(null);
  const [censadorLng, setCensadorLng] = useState<number | null>(null);
  const [obteniendoGps, setObteniendoGps] = useState<boolean>(false);
  const [capturandoInmuebleId, setCapturandoInmuebleId] = useState<string | null>(null);

  // Modals
  const [nuevoInmuebleModal, setNuevoInmuebleModal] = useState<boolean>(false);
  const [qrModalInmueble, setQrModalInmueble] = useState<any | null>(null);
  const [editarModalInmueble, setEditarModalInmueble] = useState<any | null>(null);

  // Form for New Inmueble
  const [nuevoForm, setNuevoForm] = useState({
    cedulaRif: '',
    nombres: '',
    apellidos: '',
    telefonoMovil: '',
    sectorId: '',
    calleNombre: '',
    numeroCasaLocal: '',
    referenciaUbic: '',
    tipoInmueble: 'RESIDENCIAL',
    latitud: 10.3167,
    longitud: -72.3167,
  });
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  // Check stored unlock token on mount
  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('censo_master_unlocked') : null;
    if (savedToken === 'true' || (session?.user as any)?.rol === 'ADMIN') {
      setIsUnlocked(true);
    }
  }, [session]);

  // Load BCV Rate
  useEffect(() => {
    fetch('/api/bcv')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.valorUsdBs) setTasaBcv(data.valorUsdBs);
      })
      .catch((err) => console.warn('Error tasa BCV:', err));
  }, []);

  // Fetch Census Data
  const cargarDatosCenso = async (secId?: string) => {
    setLoading(true);
    try {
      const res = await obtenerPadronCompletoCenso(secId || undefined);
      if (res.success) {
        setInmuebles(res.inmuebles);
        setSectores(res.sectores);

        if (res.sectores.length > 0 && !sectorSeleccionado) {
          setSectorSeleccionado(res.sectores[0].id);
          setNuevoForm((prev) => ({ ...prev, sectorId: res.sectores[0].id }));
        }
      }
    } catch (e) {
      console.error('Error al cargar datos de censo:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      cargarDatosCenso();
      capturarGpsEmpadronador();
    }
  }, [isUnlocked]);

  // Handle Unlock with Admin Password / Master PIN
  const handleDesbloquear = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificandoPin(true);
    setPinError('');

    try {
      const res = await verificarClaveAdminCenso(adminPinInput);
      if (res.success) {
        setIsUnlocked(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('censo_master_unlocked', 'true');
          localStorage.setItem('censo_unlocked_pin', adminPinInput.trim().replace(/\.+$/, '').toUpperCase());
          if (adminPinInput.trim().replace(/\.+$/, '').toUpperCase() === 'ROSARIO2026') {
            sessionStorage.setItem('role_scope', 'SUPERADMIN');
          } else if (adminPinInput.trim().replace(/\.+$/, '').toUpperCase() === 'ADMIN2026') {
            sessionStorage.setItem('role_scope', 'ADMIN');
          } else {
            sessionStorage.setItem('role_scope', 'CENSO');
          }
        }
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } else {
        if (res.redirectUrl) {
          alert(res.message);
          window.location.href = res.redirectUrl;
          return;
        }
        setPinError(res.message || 'Clave de acceso incorrecta.');
      }
    } catch (e: any) {
      setPinError('Error de conexión al validar clave.');
    } finally {
      setVerificandoPin(false);
    }
  };

  const handleCerrarCenso = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('censo_master_unlocked');
      localStorage.removeItem('censo_unlocked_pin');
      sessionStorage.removeItem('role_scope');
    }
    setIsUnlocked(false);
    setAdminPinInput('');
  };

  // Resilient GPS Telemetry for Field Worker
  const capturarGpsEmpadronador = async (): Promise<{ lat: number; lng: number }> => {
    setObteniendoGps(true);

    return new Promise(async (resolve) => {
      const fallbackToIp = async () => {
        try {
          const res = await fetch('/api/geolocate');
          const data = await res.json();
          if (data && data.lat && data.lng) {
            setCensadorLat(data.lat);
            setCensadorLng(data.lng);
            setObteniendoGps(false);
            resolve({ lat: data.lat, lng: data.lng });
            return;
          }
        } catch (e) {}
        setCensadorLat(10.3167);
        setCensadorLng(-72.3167);
        setObteniendoGps(false);
        resolve({ lat: 10.3167, lng: -72.3167 });
      };

      if (typeof window === 'undefined' || !navigator.geolocation) {
        await fallbackToIp();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCensadorLat(pos.coords.latitude);
          setCensadorLng(pos.coords.longitude);
          setObteniendoGps(false);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        async () => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCensadorLat(pos.coords.latitude);
              setCensadorLng(pos.coords.longitude);
              setObteniendoGps(false);
              resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            async () => {
              await fallbackToIp();
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
          );
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 15000 }
      );
    });
  };

  // 1-Tap Field GPS Capture for a House
  const handleCapturarGpsCasa = async (inm: any) => {
    setCapturandoInmuebleId(inm.id);
    try {
      const coords = await capturarGpsEmpadronador();
      await guardarCensoCampo({
        inmuebleId: inm.id,
        latitud: coords.lat,
        longitud: coords.lng,
      });

      setInmuebles((prev) =>
        prev.map((item) =>
          item.id === inm.id
            ? {
                ...item,
                latitud: coords.lat,
                longitud: coords.lng,
                censado: true,
                estadoCenso: 'CENSADO',
              }
            : item
        )
      );

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    } catch (e: any) {
      alert(`Error al capturar GPS: ${e?.message || e}`);
    } finally {
      setCapturandoInmuebleId(null);
    }
  };

  // Create New Inmueble in Field
  const handleCrearNuevoInmueble = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoForm.cedulaRif || !nuevoForm.nombres || !nuevoForm.sectorId || !nuevoForm.numeroCasaLocal) {
      alert('Por favor completa los campos obligatorios (*)');
      return;
    }

    setGuardandoNuevo(true);
    try {
      const coords = await capturarGpsEmpadronador();
      const res = await crearNuevoInmuebleCensoCampo({
        cedulaRif: nuevoForm.cedulaRif,
        nombres: nuevoForm.nombres,
        apellidos: nuevoForm.apellidos,
        telefonoMovil: nuevoForm.telefonoMovil,
        sectorId: nuevoForm.sectorId,
        calleNombre: nuevoForm.calleNombre || 'Calle Principal',
        numeroCasaLocal: nuevoForm.numeroCasaLocal,
        referenciaUbic: nuevoForm.referenciaUbic,
        tipoInmueble: nuevoForm.tipoInmueble,
        latitud: coords.lat,
        longitud: coords.lng,
      });

      if (res.success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setNuevoInmuebleModal(false);
        setNuevoForm({
          cedulaRif: '',
          nombres: '',
          apellidos: '',
          telefonoMovil: '',
          sectorId: sectorSeleccionado || (sectores[0]?.id || ''),
          calleNombre: '',
          numeroCasaLocal: '',
          referenciaUbic: '',
          tipoInmueble: 'RESIDENCIAL',
          latitud: 10.3167,
          longitud: -72.3167,
        });
        await cargarDatosCenso();
      }
    } catch (e: any) {
      alert(`Error al registrar vivienda en campo: ${e?.message || e}`);
    } finally {
      setGuardandoNuevo(false);
    }
  };

  // Export to Excel for Alcaldía
  const exportarExcelCenso = () => {
    try {
      const dataParaExcel = inmueblesFiltrados.map((i, idx) => ({
        Nro: idx + 1,
        CodigoCatastral: i.codigoCatastral,
        EstadoCenso: i.censado ? 'CENSADO (CON GPS)' : 'FALTANTE POR CENSAR',
        Contribuyente: i.contribuyenteNombre,
        CedulaRif: i.contribuyenteCedula,
        Telefono: i.contribuyenteTelefono,
        Sector: i.sectorNombre,
        Parroquia: i.parroquiaNombre,
        Calle: i.calleNombre,
        NumeroCasa: i.numeroCasaLocal,
        PuntoReferencia: i.referenciaUbic || '-',
        TipoInmueble: i.tipoInmueble,
        TarifaUsd: i.tarifaBaseUsd,
        TarifaBs: Math.round(i.tarifaBaseUsd * tasaBcv * 100) / 100,
        Solvencia: i.estadoCuenta,
        LatitudGPS: i.latitud || 'Sin GPS',
        LongitudGPS: i.longitud || 'Sin GPS',
        FechaRegistro: i.createdAt ? new Date(i.createdAt).toLocaleDateString('es-VE') : '-',
      }));

      const ws = XLSX.utils.json_to_sheet(dataParaExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Padron_Censo_Campo');
      XLSX.writeFile(wb, `Censo_Catastral_Rosario_${new Date().toISOString().split('T')[0]}.xlsx`);
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
    } catch (e) {
      alert('Error al exportar a Excel');
    }
  };

  // Filtered List calculations
  const sectorActual = sectores.find((s) => s.id === sectorSeleccionado);
  const callesSector = sectorActual?.callesTramos || [];

  const inmueblesSector = inmuebles.filter(
    (inm) => !sectorSeleccionado || inm.sectorId === sectorSeleccionado
  );

  const inmueblesFiltrados = inmueblesSector.filter((inm) => {
    const matchCalle = calleFiltro === 'TODAS' || inm.calleId === calleFiltro || inm.calleNombre === calleFiltro;
    const matchEstado =
      filtroEstado === 'TODOS' ||
      (filtroEstado === 'CENSADOS' && inm.censado) ||
      (filtroEstado === 'FALTANTES' && !inm.censado);

    const matchSearch =
      !searchTerm.trim() ||
      inm.codigoCatastral?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inm.contribuyenteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inm.contribuyenteCedula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inm.calleNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inm.numeroCasaLocal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inm.referenciaUbic?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchCalle && matchEstado && matchSearch;
  });

  const totalSector = inmueblesSector.length;
  const censadosSector = inmueblesSector.filter((i) => i.censado).length;
  const faltantesSector = totalSector - censadosSector;
  const pctAvanceSector = totalSector > 0 ? Math.round((censadosSector / totalSector) * 100) : 0;

  // Render Gate Screen if not unlocked
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
        <Navbar tasaBcv={tasaBcv} />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-500/10">
                <Lock className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-black text-white tracking-tight">
                Módulo de Censo & Empadronamiento
              </h1>
              <p className="text-xs text-slate-400">
                Alcaldía de Rosario de Perijá • Acceso Restringido a Supervisores y Empadronadores de Campo
              </p>
            </div>

            <form onSubmit={handleDesbloquear} className="space-y-4">
              {pinError && (
                <div className="bg-red-950/80 border border-red-500/40 text-red-300 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <XCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{pinError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Clave de Administrador / PIN de Campo:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder="Ingresa clave maestra..."
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none placeholder:text-slate-600 font-mono tracking-wider"
                  />
                  <Shield className="w-4 h-4 text-slate-500 absolute right-4 top-3.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Puedes usar la clave de empleado de la Alcaldía o tu contraseña de administrador.
                </p>
              </div>

              <button
                type="submit"
                disabled={verificandoPin || !adminPinInput.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
              >
                {verificandoPin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando Clave...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Desbloquear Módulo de Censo</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
              <a href="/login" className="text-sky-400 hover:underline font-bold">
                Iniciar sesión con cuenta ↗
              </a>
              <a href="/" className="text-slate-500 hover:text-white">
                Ir al Inicio
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar tasaBcv={tasaBcv} />

      {/* Top Banner for Field Workers */}
      <div className="bg-slate-900 border-b border-slate-800 py-3.5 px-4 sm:px-6 sticky top-[57px] z-30 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  Censo Catastral & Empadronamiento
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                    PWA Campo
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Alcaldía de Rosario de Perijá • Registro Casa por Casa con Geolocalización Satelital
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => capturarGpsEmpadronador()}
              disabled={obteniendoGps}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Actualizar posición GPS actual"
            >
              <Crosshair className={`w-3.5 h-3.5 ${obteniendoGps ? 'animate-spin text-amber-400' : ''}`} />
              <span>
                {censadorLat && censadorLng
                  ? `GPS: ${censadorLat.toFixed(4)}, ${censadorLng.toFixed(4)}`
                  : 'Detectar GPS'}
              </span>
            </button>

            <button
              onClick={() => setNuevoInmuebleModal(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Vivienda</span>
            </button>

            <button
              onClick={exportarExcelCenso}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
              title="Exportar Censo a Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={handleCerrarCenso}
              className="px-3 py-1.5 bg-red-950/80 hover:bg-red-800 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
              title="Bloquear sesión de censo"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Bloquear</span>
            </button>

            {/* Navigation links if SuperAdmin (ROSARIO2026) or Admin (ADMIN2026) */}
            {((session?.user as any)?.subRol === 'SUPERADMIN' || (session?.user as any)?.rol === 'ADMIN' || (typeof window !== 'undefined' && ['SUPERADMIN', 'ADMIN'].includes(sessionStorage.getItem('role_scope') || ''))) && (
              <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2">
                <a
                  href="/admin"
                  className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  title="Ir al Panel Admin"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Admin</span>
                </a>
                <a
                  href="/cuadrilla"
                  className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  title="Ir a App Cuadrilla"
                >
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Cuadrilla</span>
                </a>
                <a
                  href="/ciudadano"
                  className="px-2.5 py-1.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  title="Ir a App Ciudadano"
                >
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Ciudadano</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Sector Selection & Progress Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-800 pb-4">
            {/* Sector Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <span>Sector de Trabajo:</span>
              </span>
              <select
                value={sectorSeleccionado}
                onChange={(e) => {
                  setSectorSeleccionado(e.target.value);
                  setCalleFiltro('TODAS');
                  setNuevoForm((prev) => ({ ...prev, sectorId: e.target.value }));
                }}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {sectores.map((sec) => (
                  <option key={sec.id} value={sec.id} className="bg-slate-900">
                    {sec.nombre} ({sec.parroquia?.nombre || 'Rosario'})
                  </option>
                ))}
              </select>

              {/* Calle Selector */}
              {callesSector.length > 0 && (
                <select
                  value={calleFiltro}
                  onChange={(e) => setCalleFiltro(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="TODAS">Todas las Calles del Sector</option>
                  {callesSector.map((c: any) => (
                    <option key={c.id} value={c.id} className="bg-slate-900">
                      {c.nombreCalle}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* View Mode Buttons */}
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('lista')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                  viewMode === 'lista' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Lista Casa x Casa</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('mapa')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                  viewMode === 'mapa' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Mapa Satelital</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calcomanias')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                  viewMode === 'calcomanias' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QRs de Fachada</span>
              </button>
            </div>
          </div>

          {/* Progress Bar of the Sector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <span>Avance del Censo en {sectorActual?.nombre || 'Sector'}:</span>
                <span className="text-indigo-400 font-mono font-black">{pctAvanceSector}%</span>
              </span>
              <span className="text-slate-400">
                <strong className="text-emerald-400 font-mono">{censadosSector}</strong> de{' '}
                <strong className="text-white font-mono">{totalSector}</strong> viviendas censadas
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-800 overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-indigo-500 via-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pctAvanceSector, 2)}%` }}
              ></div>
            </div>
          </div>

          {/* Metric Status Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setFiltroEstado('TODOS')}
              className={`bg-slate-950 p-3.5 rounded-2xl border transition cursor-pointer ${
                filtroEstado === 'TODOS'
                  ? 'border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] text-slate-400 font-bold">Total Viviendas Sector</div>
              <div className="text-2xl font-black text-white font-mono mt-0.5">{totalSector}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Padrón asignado</div>
            </div>

            <div
              onClick={() => setFiltroEstado('CENSADOS')}
              className={`bg-slate-950 p-3.5 rounded-2xl border transition cursor-pointer ${
                filtroEstado === 'CENSADOS'
                  ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500'
                  : 'border-emerald-500/30 hover:border-emerald-500/60'
              }`}
            >
              <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Censadas con GPS</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">{censadosSector}</div>
              <div className="text-[10px] text-emerald-300 mt-0.5">Coordenadas listas</div>
            </div>

            <div
              onClick={() => setFiltroEstado('FALTANTES')}
              className={`bg-slate-950 p-3.5 rounded-2xl border transition cursor-pointer ${
                filtroEstado === 'FALTANTES'
                  ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500'
                  : 'border-red-500/30 hover:border-red-500/60'
              }`}
            >
              <div className="text-[11px] text-red-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Faltantes por Censar</span>
              </div>
              <div className="text-2xl font-black text-red-400 font-mono mt-0.5">{faltantesSector}</div>
              <div className="text-[10px] text-red-300 mt-0.5">Pendientes por visita</div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-bold">Total Municipio</div>
              <div className="text-2xl font-black text-indigo-400 font-mono mt-0.5">{inmuebles.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">En los 83 sectores</div>
            </div>
          </div>
        </div>

        {/* VIEW MODE 1: LISTA CASA POR CASA */}
        {viewMode === 'lista' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search Bar & Instant Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por cédula, nombre, calle, casa o código..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                />
              </div>

              {/* Status Chips */}
              <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold shrink-0">
                <button
                  onClick={() => setFiltroEstado('TODOS')}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    filtroEstado === 'TODOS' ? 'bg-slate-700 text-white font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({inmueblesSector.length})
                </button>
                <button
                  onClick={() => setFiltroEstado('FALTANTES')}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                    filtroEstado === 'FALTANTES' ? 'bg-red-600 text-white font-black' : 'text-red-400 hover:bg-red-950/40'
                  }`}
                >
                  <span>🔴 Faltantes ({faltantesSector})</span>
                </button>
                <button
                  onClick={() => setFiltroEstado('CENSADOS')}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                    filtroEstado === 'CENSADOS' ? 'bg-emerald-600 text-white font-black' : 'text-emerald-400 hover:bg-emerald-950/40'
                  }`}
                >
                  <span>🟢 Censados ({censadosSector})</span>
                </button>
              </div>
            </div>

            {/* List of Houses */}
            {inmueblesFiltrados.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                <Home className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-sm font-bold">No se encontraron viviendas con los filtros actuales.</p>
                <button
                  onClick={() => setNuevoInmuebleModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Empadronar Nueva Vivienda en este Sector</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inmueblesFiltrados.map((inm) => (
                  <div
                    key={inm.id}
                    className={`rounded-3xl p-5 border transition-all space-y-3 relative overflow-hidden flex flex-col justify-between ${
                      inm.censado
                        ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                        : 'bg-slate-900 border-red-500/40 shadow-lg shadow-red-950/20'
                    }`}
                  >
                    {/* Top Status Header */}
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            inm.censado
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                              : 'bg-red-950 text-red-300 border border-red-500/50 animate-pulse'
                          }`}
                        >
                          {inm.censado ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>CENSADO • GPS OK</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              <span>FALTANTE POR CENSAR</span>
                            </>
                          )}
                        </span>

                        <span className="font-mono text-xs font-bold text-sky-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                          {inm.codigoCatastral}
                        </span>
                      </div>

                      {/* Contribuyente info */}
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{inm.contribuyenteNombre}</span>
                        </h3>
                        <div className="text-xs text-slate-300 font-mono flex items-center gap-2">
                          <span>🪪 {inm.contribuyenteCedula}</span>
                          <span className="text-slate-600">•</span>
                          <span>📞 {inm.contribuyenteTelefono}</span>
                        </div>
                      </div>

                      {/* Address Info */}
                      <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs space-y-1 mt-3">
                        <div className="text-slate-300">
                          <strong>Calle:</strong> {inm.calleNombre}
                        </div>
                        <div className="text-slate-200 font-semibold">
                          <strong>Nº Casa / Local:</strong> {inm.numeroCasaLocal}
                        </div>
                        {inm.referenciaUbic && (
                          <div className="text-[11px] text-slate-400 italic">
                            📌 Ref: {inm.referenciaUbic}
                          </div>
                        )}
                        <div className="flex justify-between items-center text-[11px] pt-1 text-slate-400 border-t border-slate-800/80 mt-1">
                          <span>Tipo: <strong className="text-slate-200">{inm.tipoInmueble}</strong></span>
                          <span>Tarifa: <strong className="text-emerald-400 font-mono">${(inm.tarifaBaseUsd || 3).toFixed(2)}</strong></span>
                        </div>
                      </div>

                      {/* Coordinates Pill */}
                      {inm.censado && (
                        <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-600/30 flex items-center justify-between mt-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>GPS: {inm.latitud.toFixed(5)}, {inm.longitud.toFixed(5)}</span>
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${inm.latitud},${inm.longitud}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      {/* 1-Tap Field GPS Capture Button */}
                      <button
                        type="button"
                        disabled={capturandoInmuebleId === inm.id}
                        onClick={() => handleCapturarGpsCasa(inm)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                          inm.censado
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        }`}
                      >
                        {capturandoInmuebleId === inm.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>Capturando Coordenadas...</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-4 h-4" />
                            <span>{inm.censado ? '📍 Actualizar GPS Aquí' : '📍 Capturar GPS de esta Casa Aquí'}</span>
                          </>
                        )}
                      </button>

                      {/* Secondary Buttons Row */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQrModalInmueble(inm)}
                          className="flex-1 py-1.5 px-2 bg-slate-950 hover:bg-indigo-950/80 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1"
                          title="Generar Código QR para puerta / fachada"
                        >
                          <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                          <span>QR Fachada</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditarModalInmueble(inm)}
                          className="py-1.5 px-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-[11px] font-bold border border-slate-800 transition"
                          title="Editar datos de la casa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await generarCertificadoSolvenciaPdf({
                                contribuyenteNombre: inm.contribuyenteNombre,
                                contribuyenteCedula: inm.contribuyenteCedula,
                                codigoCatastral: inm.codigoCatastral,
                                sectorNombre: inm.sectorNombre,
                                ultimoReciboFolio: inm.ultimoReciboFolio || 'CENSO-2026',
                                ultimoReciboFecha: inm.ultimoReciboFecha || new Date().toLocaleDateString('es-VE'),
                                montoUltimoPagoBs: (inm.tarifaBaseUsd || 3) * tasaBcv,
                                montoUltimoPagoUsd: inm.tarifaBaseUsd || 3,
                              });
                              confetti({ particleCount: 50, spread: 40, origin: { y: 0.6 } });
                            } catch (e) {
                              alert('Error al generar certificado');
                            }
                          }}
                          className="py-1.5 px-2.5 bg-slate-950 hover:bg-slate-800 text-emerald-400 rounded-xl text-[11px] font-bold border border-slate-800 transition"
                          title="Descargar Ficha / Certificado PDF"
                        >
                          <Award className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW MODE 2: MAPA SATELITAL DE CAMPO */}
        {viewMode === 'mapa' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-400" />
                    <span>Mapa Satelital de Trabajo • {sectorActual?.nombre || 'Sector'}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    🟢 Verde: Censados con GPS • 🔴 Rojo: Faltantes • 📍 Azul: Tu ubicación actual
                  </p>
                </div>
                <button
                  onClick={capturarGpsEmpadronador}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Centrar en mi ubicación</span>
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-800">
                <LeafletMap
                  center={[
                    censadorLat || sectorActual?.centroLat || 10.3167,
                    censadorLng || sectorActual?.centroLng || -72.3167,
                  ]}
                  zoom={16}
                  height="520px"
                  interactive={true}
                  markers={[
                    ...inmueblesSector
                      .filter((inm) => inm.latitud && inm.longitud)
                      .map((inm) => ({
                        id: `censo-${inm.id}`,
                        lat: inm.latitud,
                        lng: inm.longitud,
                        title: inm.codigoCatastral,
                        description: `${inm.contribuyenteNombre} • Casa: ${inm.numeroCasaLocal}`,
                        type: 'property' as const,
                        solvencia: inm.censado ? 'SOLVENTE' : 'MORA',
                        status: inm.censado ? 'SOLVENTE' : 'MORA',
                        sector: inm.sectorNombre,
                        contribuyente: inm.contribuyenteNombre,
                        cedula: inm.contribuyenteCedula,
                        codigoCatastral: inm.codigoCatastral,
                        tipoInmueble: inm.tipoInmueble,
                        numeroCasa: inm.numeroCasaLocal,
                        referencia: inm.referenciaUbic,
                        tarifaUsd: inm.tarifaBaseUsd,
                      })),
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE 3: CALCOMANÍAS Y QR DE FACHADA */}
        {viewMode === 'calcomanias' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-400" />
                  Calcomanías Catastrales Digitales con Código QR para Fachada
                </h3>
                <p className="text-xs text-slate-400">
                  Generador de fichas adhesivas oficiales para puertas y fachadas de viviendas empadronadas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {inmueblesFiltrados.map((inm) => (
                  <div
                    key={inm.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-bold text-indigo-400">{inm.sectorNombre}</span>
                        <span className="font-mono">{inm.codigoCatastral}</span>
                      </div>
                      <h4 className="font-bold text-white text-xs truncate">{inm.contribuyenteNombre}</h4>
                      <p className="text-[11px] text-slate-400 truncate">Casa: {inm.numeroCasaLocal} • {inm.calleNombre}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQrModalInmueble(inm)}
                      className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Ver Calcomanía QR</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: EMPADRONAR NUEVA VIVIENDA EN CAMPO */}
      {nuevoInmuebleModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Empadronar Nueva Vivienda</h3>
                  <p className="text-xs text-slate-400">Registro en campo de familia / local no listado</p>
                </div>
              </div>
              <button
                onClick={() => setNuevoInmuebleModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearNuevoInmueble} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Sector Oficial <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={nuevoForm.sectorId}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, sectorId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {sectores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.parroquia?.nombre || 'Rosario'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Calle / Avenida / Vereda
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Calle 2 Los Pinos"
                    value={nuevoForm.calleNombre}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, calleNombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Nº Casa o Local <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Casa #42"
                    value={nuevoForm.numeroCasaLocal}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, numeroCasaLocal: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Punto de Referencia Visual
                </label>
                <input
                  type="text"
                  placeholder="Ej. Frente al abasto, portón verde"
                  value={nuevoForm.referenciaUbic}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, referenciaUbic: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Cédula / RIF del Propietario <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. V-18456789"
                    value={nuevoForm.cedulaRif}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, cedulaRif: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Nombre del Propietario <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carmen Rodríguez"
                    value={nuevoForm.nombres}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, nombres: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Teléfono Móvil
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. 0414-7654321"
                    value={nuevoForm.telefonoMovil}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, telefonoMovil: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Tipo de Inmueble
                  </label>
                  <select
                    value={nuevoForm.tipoInmueble}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, tipoInmueble: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="RESIDENCIAL">Residencial Familiar</option>
                    <option value="COMERCIAL_PEQ">Comercio Pequeño / Bodega</option>
                    <option value="COMERCIAL_GDE">Comercio Mediano/Grande</option>
                    <option value="INDUSTRIAL">Industrial / Taller</option>
                    <option value="BALDIO">Terreno / Baldío</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-300">📍 Geolocalización Automática</div>
                  <div className="text-[11px] text-slate-400">
                    Se asignarán las coordenadas GPS actuales de tu dispositivo.
                  </div>
                </div>
                <div className="text-right font-mono text-emerald-400 font-bold text-[11px]">
                  {censadorLat ? `${censadorLat.toFixed(4)}, ${censadorLng?.toFixed(4)}` : 'GPS Listo'}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNuevoInmuebleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoNuevo}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {guardandoNuevo ? 'Guardando...' : 'Guardar & Empadronar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CALCOMANÍA QR DE FACHADA (PASO 3) */}
      {qrModalInmueble && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Calcomanía Oficial de Fachada
              </span>
              <button
                onClick={() => setQrModalInmueble(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sticker Graphic Container */}
            <div
              id="qr-sticker-printable"
              className="bg-white text-slate-950 p-6 rounded-2xl shadow-xl border-4 border-indigo-600 space-y-3 mx-auto text-center"
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-300 pb-1.5">
                ALCALDÍA DEL MUNICIPIO ROSARIO DE PERIJÁ
              </div>
              <div className="text-xs font-extrabold text-indigo-900 uppercase">
                VIVIENDA EMPADRONADA & GEORREFERENCIADA
              </div>

              {/* QR Image */}
              <div className="w-40 h-40 mx-auto bg-slate-100 p-2 rounded-xl border border-slate-300 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `https://aseo.rosariodeperija.gob.ve/verificar/${qrModalInmueble.codigoCatastral}`
                  )}`}
                  alt="QR Fachada"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-0.5 pt-1">
                <div className="text-base font-black font-mono tracking-tight text-slate-950">
                  {qrModalInmueble.codigoCatastral}
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {qrModalInmueble.sectorNombre} • Casa: {qrModalInmueble.numeroCasaLocal}
                </div>
                <div className="text-[10px] text-slate-600">
                  Contribuyente: {qrModalInmueble.contribuyenteNombre} ({qrModalInmueble.contribuyenteCedula})
                </div>
              </div>

              <div className="text-[9px] text-emerald-800 font-bold bg-emerald-100 py-1 px-2 rounded-md">
                ✓ CENSO MUNICIPAL VALIDADO • 2026
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Calcomanía</span>
              </button>

              <button
                type="button"
                onClick={() => setQrModalInmueble(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DATOS FAMILIARES DE LA VIVIENDA */}
      {editarModalInmueble && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {editarModalInmueble.codigoCatastral}
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Editar Ficha de la Vivienda</h3>
              </div>
              <button
                onClick={() => setEditarModalInmueble(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await guardarCensoCampo({
                    inmuebleId: editarModalInmueble.id,
                    latitud: editarModalInmueble.latitud || 10.3167,
                    longitud: editarModalInmueble.longitud || -72.3167,
                    numeroCasaLocal: editarModalInmueble.numeroCasaLocal,
                    referenciaUbic: editarModalInmueble.referenciaUbic,
                    tipoInmueble: editarModalInmueble.tipoInmueble,
                  });
                  setInmuebles((prev) =>
                    prev.map((i) => (i.id === editarModalInmueble.id ? editarModalInmueble : i))
                  );
                  setEditarModalInmueble(null);
                  alert('✅ Ficha actualizada con éxito.');
                } catch (err: any) {
                  alert('Error al actualizar ficha');
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nº Casa o Local:</label>
                <input
                  type="text"
                  required
                  value={editarModalInmueble.numeroCasaLocal}
                  onChange={(e) =>
                    setEditarModalInmueble({ ...editarModalInmueble, numeroCasaLocal: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Punto de Referencia:</label>
                <input
                  type="text"
                  value={editarModalInmueble.referenciaUbic || ''}
                  onChange={(e) =>
                    setEditarModalInmueble({ ...editarModalInmueble, referenciaUbic: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Tipo de Inmueble:</label>
                <select
                  value={editarModalInmueble.tipoInmueble}
                  onChange={(e) =>
                    setEditarModalInmueble({ ...editarModalInmueble, tipoInmueble: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="RESIDENCIAL">Residencial Familiar</option>
                  <option value="COMERCIAL_PEQ">Comercio Pequeño / Bodega</option>
                  <option value="COMERCIAL_GDE">Comercio Mediano/Grande</option>
                  <option value="INDUSTRIAL">Industrial / Taller</option>
                  <option value="BALDIO">Terreno / Baldío</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditarModalInmueble(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

