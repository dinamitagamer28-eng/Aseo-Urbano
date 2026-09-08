'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import LeafletMap from '@/components/LeafletMap';
import PWAInstallCuadrilla from '@/components/PWAInstallCuadrilla';
import {
  iniciarTurnoCuadrilla,
  marcarTramoCompletado,
  resolverReporteCuadrilla,
  finalizarTurnoCuadrilla,
  obtenerReportesCuadrilla,
} from '@/lib/actions';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Camera,
  AlertCircle,
  Clock,
  CheckSquare,
  Square,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Lock,
  Unlock,
  LogOut,
  Download,
  KeyRound,
  FileText,
  X
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';

export default function CuadrillaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Pin & Lock states
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Operational states
  const [supervisorCode, setSupervisorCode] = useState('SUP-01 (Roberto González)');
  const [camionCode, setCamionCode] = useState('CAM-01 (Compactador 6.5 Tn)');
  const [sectorName, setSectorName] = useState('Municipio Rosario de Perijá');
  const [turnoActivo, setTurnoActivo] = useState(true);

  const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const todayStr = new Date().toISOString().split('T')[0];
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(todayStr);
  const [historialRutas, setHistorialRutas] = useState<{ tramo: string; fecha: string; tipo: string }[]>([]);

  // Check auth and PIN unlock status
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPin = sessionStorage.getItem('cuadrilla_unlocked');
      if (savedPin === 'true') {
        setIsUnlocked(true);
      }
    }
  }, []);

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === 'CUADRILLA2026' || pinInput.trim() === 'ROSARIO2026') {
      setIsUnlocked(true);
      sessionStorage.setItem('cuadrilla_unlocked', 'true');
      setPinError('');
    } else {
      setPinError('Clave de acceso incorrecta. Intenta nuevamente.');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('historialRutas');
    if (saved) {
      try {
        setHistorialRutas(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('historialRutas', JSON.stringify(historialRutas));
  }, [historialRutas]);

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

  const getTramoStatus = (tramo: string, tipo: string) => {
    const doneToday = historialRutas.find((h) => h.tramo === tramo && h.fecha === fechaSeleccionada);
    if (doneToday) return { isCompleted: true, doneToday: true };
    let daysCooldown = 0;
    const tLower = tipo.toLowerCase();
    if (tLower.includes('catorcenal')) daysCooldown = 14;
    else if (tLower.includes('quincenal')) daysCooldown = 15;
    else if (tLower.includes('semanal')) daysCooldown = 7;
    else if (tLower.includes('trimotos')) daysCooldown = 1;
    if (daysCooldown === 0) return { isCompleted: false, doneToday: false };
    const pastCompletions = historialRutas
      .filter((h) => h.tramo === tramo && new Date(h.fecha) <= new Date(fechaSeleccionada))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    if (pastCompletions.length > 0) {
      const lastDate = new Date(pastCompletions[0].fecha + 'T00:00:00');
      const selectedDate = new Date(fechaSeleccionada + 'T00:00:00');
      const diffDays = Math.ceil(Math.abs(selectedDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < daysCooldown) return { isCompleted: true, doneToday: false, diffDays };
    }
    return { isCompleted: false, doneToday: false };
  };

  const toggleTramo = (tramo: string, tipo: string) => {
    const exists = historialRutas.find((h) => h.tramo === tramo && h.fecha === fechaSeleccionada);
    if (exists) setHistorialRutas(historialRutas.filter((h) => h !== exists));
    else setHistorialRutas([...historialRutas, { tramo, tipo, fecha: fechaSeleccionada }]);
  };

  const [year, month, day] = fechaSeleccionada.split('-').map(Number);
  const diaSeleccionado = DIAS_SEMANA[new Date(year, month - 1, day).getDay()];
  const rutasDelDia = RUTAS_POR_DIA[diaSeleccionado as keyof typeof RUTAS_POR_DIA] || [];

  // Real Field Incidents List from Database
  const [reportes, setReportes] = useState<any[]>([]);

  const fetchReportes = async () => {
    try {
      const res = await obtenerReportesCuadrilla();
      const mapped = res.map((r: any) => ({
        id: r.id,
        folio: r.folioIncidencia,
        tipo: r.tipoProblema,
        descripcion: r.descripcion,
        estado: r.estado,
        sector: r.sector?.nombre || 'Sector Rosario',
        usuario: r.usuario ? `${r.usuario.nombres} ${r.usuario.apellidos}` : 'Ciudadano',
        latitud: r.latitud,
        longitud: r.longitud,
        fotoVecino: r.fotoReporteUrl,
        fotoResolucion: r.fotoResolucionUrl,
      }));
      setReportes(mapped);
    } catch (e) {
      console.error("Error al cargar reportes:", e);
    }
  };

  useEffect(() => {
    fetchReportes();
  }, []);

  // Selected Report for Resolution
  const [selectedReporte, setSelectedReporte] = useState<any>(null);
  const [fotoEvidenciaCapturada, setFotoEvidenciaCapturada] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);

  // Shift Close Form
  const [toneladas, setToneladas] = useState('4.5');
  const [novedades, setNovedades] = useState('');
  const [turnoFinalizado, setTurnoFinalizado] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const totalTramosHoy = rutasDelDia.reduce((acc, g) => acc + g.tramos.length, 0);
  const completadosCount = rutasDelDia.reduce((acc, g) => acc + g.tramos.filter((t) => getTramoStatus(t, g.tipo).isCompleted).length, 0);
  const porcentaje = totalTramosHoy === 0 ? 100 : Math.round((completadosCount / totalTramosHoy) * 100);

  const handleTomarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraActive(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'reportes');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setFotoEvidenciaCapturada(data.url);
    } catch (e) {
      console.error(e);
      alert('Error al subir la foto de evidencia');
    } finally {
      setCameraActive(false);
    }
  };

  const handleResolverReclamo = async () => {
    if (!fotoEvidenciaCapturada) {
      alert('¡ERROR OPERATIVO! Se requiere la foto de evidencia obligatoria.');
      return;
    }

    setResolviendo(true);
    try {
      const res = await resolverReporteCuadrilla({
        reporteId: selectedReporte.id,
        supervisorId: (session?.user as any)?.id || undefined,
        fotoResolucionUrl: fotoEvidenciaCapturada,
        notasResolucion: `Atendido en campo por ${supervisorCode}. Foto adjunta.`
      });

      if (res && res.success) {
        setReportes((prev) =>
          prev.map((r) =>
            r.id === selectedReporte.id
              ? { ...r, estado: 'RESUELTO', fotoResolucion: fotoEvidenciaCapturada }
              : r
          )
        );
        setSelectedReporte(null);
        setFotoEvidenciaCapturada(null);
        alert('¡Reclamo resuelto con éxito! La foto de evidencia ha sido enviada al ciudadano.');
        fetchReportes();
      }
    } catch (e: any) {
      alert(e.message || 'Error al resolver reclamo');
    } finally {
      setResolviendo(false);
    }
  };

  const handleFinalizarTurno = async () => {
    setFinalizando(true);
    try {
      await finalizarTurnoCuadrilla({
        toneladasEstimadas: parseFloat(toneladas) || 4.5,
        novedadesCierre: novedades || 'Turno concluido en Relleno Sanitario Municipal conforme a ordenanza.',
      });

      // Generate Downloadable PDF
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('ALCALDÍA DEL MUNICIPIO ROSARIO DE PERIJÁ', 105, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text('COMPROBANTE OPERATIVO DE DESCARGA - ASEO URBANO', 105, 20, { align: 'center' });
      doc.text('RIF: G-2004984-7 • Perijá Digital', 105, 27, { align: 'center' });

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.text(`Fecha de Turno: ${fechaSeleccionada}`, 14, 42);
      doc.text(`Hora de Cierre: ${new Date().toLocaleTimeString('es-VE')}`, 14, 50);
      doc.text(`Supervisor: ${supervisorCode}`, 14, 58);
      doc.text(`Unidad de Recolección: ${camionCode}`, 14, 66);
      doc.text(`Sector Asignado: ${sectorName}`, 14, 74);

      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(1);
      doc.rect(14, 82, 182, 38);
      doc.setFontSize(13);
      doc.setTextColor(217, 119, 6);
      doc.text('RESUMEN DE DESCARGA EN RELLENO SANITARIO', 20, 92);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Toneladas Estimadas Descargadas: ${toneladas} Tn`, 20, 102);
      doc.text(`Novedades: ${novedades || 'Ruta completada sin novedades mecánicas.'}`, 20, 110);

      doc.setFontSize(11);
      doc.text(`Tramos y Calles Cubiertas: ${completadosCount} de ${totalTramosHoy} (${porcentaje}%)`, 14, 132);
      doc.text(`Reclamos de Incidencias Resueltos: ${reportes.filter((r) => r.estado === 'RESUELTO').length}`, 14, 140);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Comprobante oficial emitido por el Sistema de Cuadrillas de Rosario de Perijá.', 105, 280, { align: 'center' });

      doc.save(`Comprobante_Descarga_${fechaSeleccionada}_${camionCode.split(' ')[0]}.pdf`);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setTurnoFinalizado(true);
      setTurnoActivo(false);
      alert(`¡Turno finalizado con éxito! Descarga de ${toneladas} Tn registrada y comprobante PDF descargado.`);
    } catch (e: any) {
      alert(e.message || 'Error al finalizar turno');
    } finally {
      setFinalizando(false);
    }
  };

  const handleCerrarSesion = () => {
    sessionStorage.removeItem('cuadrilla_unlocked');
    signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Verificando sesión...</span>
        </div>
      </div>
    );
  }

  // PIN Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border-2 border-amber-500/40 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8 text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/20">
            <KeyRound className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white">App Cuadrilla</h1>
            <p className="text-xs text-amber-300/80 font-bold uppercase tracking-wider mt-1">
              Acceso Operativo de Campo
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Ingresa la clave de acceso de cuadrilla para desbloquear la consola de recolección y rutas.
            </p>
          </div>

          {pinError && (
            <div className="bg-red-500/10 text-red-400 text-xs font-bold p-3 rounded-xl border border-red-500/30">
              {pinError}
            </div>
          )}

          <form onSubmit={handleUnlockPin} className="space-y-4">
            <div>
              <input
                type="password"
                required
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Ingresa clave de cuadrilla"
                className="w-full text-center text-lg tracking-widest font-mono uppercase bg-slate-950 border-2 border-slate-700 focus:border-amber-500 rounded-2xl p-4 text-white focus:outline-none placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all transform active:scale-95"
            >
              Desbloquear App Cuadrilla
            </button>
          </form>

          <div className="border-t border-slate-800 pt-4">
            <button
              onClick={() => router.push('/login')}
              className="text-xs text-slate-400 hover:text-white transition font-medium"
            >
              Ir a Iniciar Sesión General
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      <Navbar />

      {/* Field Crew Top Status Banner with Logout */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-slate-950 py-3 px-4 shadow-lg sticky top-[57px] z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2 font-black text-sm tracking-tight">
            <Truck className="w-6 h-6 animate-bounce text-slate-950" />
            <span>OPERACIÓN DE CAMPO: CAMIÓN 01</span>
            <span className="bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-xs">LAS COLINAS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold hidden sm:block">
              <span>Progreso: {completadosCount}/{totalTramosHoy} ({porcentaje}%)</span>
            </div>
            <button
              onClick={handleCerrarSesion}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 text-amber-300 hover:text-white text-xs font-bold rounded-lg transition"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* PWA Install Banner for Field Workers */}
        <PWAInstallCuadrilla />

        {/* Active Shift Header & Attendance Geofence */}
        <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-black text-amber-400 tracking-wider uppercase">Jornada Activa de Recolección</div>
              <h1 className="text-2xl font-black text-white mt-0.5">{supervisorCode}</h1>
              <p className="text-xs text-slate-300">Unidad: {camionCode} • Sector: {sectorName}</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>ASISTENCIA GPS VALIDADA</span>
            </div>
          </div>

          {/* Large Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>Avance de la Ruta de Calles:</span>
              <span className="text-amber-400 font-mono text-sm">{porcentaje}% COMPLETADO</span>
            </div>
            <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        </div>

        {/* Interactive Street Checklist with Dynamic Calendar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                Rutas y Cronograma Operativo
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona la fecha para visualizar o marcar las calles atendidas:
              </p>
            </div>
            <div>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-amber-400 font-bold px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            {rutasDelDia.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No hay rutas programadas para este día.</p>
            ) : (
              rutasDelDia.map((grupo, gIdx) => (
                <div key={gIdx} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
                  <div className="text-xs font-bold text-amber-400/90 uppercase tracking-wider flex items-center justify-between">
                    <span>{grupo.tipo}</span>
                    <span className="text-[10px] text-slate-500 lowercase">
                      {grupo.tramos.filter((t) => getTramoStatus(t, grupo.tipo).isCompleted).length} / {grupo.tramos.length} listos
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {grupo.tramos.map((tramo, tIdx) => {
                      const statusObj = getTramoStatus(tramo, grupo.tipo);
                      return (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={() => toggleTramo(tramo, grupo.tipo)}
                          className={`flex items-center gap-3 p-3 rounded-xl text-left border transition-all ${
                            statusObj.isCompleted
                              ? statusObj.doneToday
                                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                                : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60'
                              : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="shrink-0">
                            {statusObj.isCompleted ? (
                              <CheckCircle2 className={`w-5 h-5 ${statusObj.doneToday ? 'text-emerald-400' : 'text-slate-500'}`} />
                            ) : (
                              <Square className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold truncate ${statusObj.isCompleted ? 'line-through' : ''}`}>
                              {tramo}
                            </div>
                            {statusObj.isCompleted && !statusObj.doneToday && (
                              <div className="text-[10px] text-slate-500">
                                Hace {statusObj.diffDays} días (Vigente)
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real Incidents from Citizens */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Incidencias y Reclamos Ciudadanos
            </h2>
            <button
              onClick={fetchReportes}
              className="text-xs text-sky-400 hover:underline font-bold"
            >
              Actualizar
            </button>
          </div>

          {reportes.length === 0 ? (
            <div className="text-center py-8 bg-slate-950 p-6 rounded-2xl border border-slate-800 text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">¡No hay incidencias pendientes!</p>
              <p className="text-xs">Los reportes enviados por los ciudadanos aparecerán aquí en tiempo real.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportes.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4"
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <div className="text-xs font-mono font-bold text-amber-400">{rep.folio}</div>
                      <h3 className="font-black text-white text-base mt-0.5">{rep.tipo.replace(/_/g, ' ')}</h3>
                      <p className="text-xs text-slate-400">Sector: {rep.sector} • Reportado por: {rep.usuario}</p>
                      {rep.descripcion && <p className="text-xs text-slate-300 mt-1 italic">"{rep.descripcion}"</p>}
                      {rep.latitud && rep.longitud && (
                        <div className="flex items-center gap-2 pt-2 flex-wrap">
                          <span className="text-[11px] text-sky-400 font-mono bg-sky-950/80 px-2.5 py-1 rounded-lg border border-sky-600/30 flex items-center gap-1.5 font-bold">
                            <MapPin className="w-3.5 h-3.5 text-sky-400" />
                            GPS: {rep.latitud.toFixed(5)}, {rep.longitud.toFixed(5)}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${rep.latitud},${rep.longitud}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30"
                          >
                            📍 Ver en Google Maps ↗
                          </a>
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        rep.estado === 'RESUELTO'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {rep.estado}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-400 mb-1 font-bold">Foto del Ciudadano:</div>
                      {rep.fotoVecino ? (
                        <img
                          src={rep.fotoVecino}
                          alt="Evidencia Vecino"
                          className="w-full h-40 object-cover rounded-xl border border-slate-800"
                        />
                      ) : (
                        <div className="w-full h-40 bg-slate-900 rounded-xl flex items-center justify-center text-xs text-slate-600">
                          Sin foto
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs text-slate-400 mb-1 font-bold">Foto de Resolución (Cuadrilla):</div>
                      {rep.fotoResolucion ? (
                        <img
                          src={rep.fotoResolucion}
                          alt="Evidencia Cuadrilla"
                          className="w-full h-40 object-cover rounded-xl border border-emerald-500/40"
                        />
                      ) : (
                        <div className="w-full h-40 bg-slate-900 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-3 text-center">
                          <Lock className="w-6 h-6 text-amber-500/60 mb-1" />
                          <span className="text-[11px] text-slate-400 font-bold">Pendiente por Atender</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {rep.estado !== 'RESUELTO' && (
                    <button
                      onClick={() => {
                        setSelectedReporte(rep);
                        setFotoEvidenciaCapturada(null);
                      }}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
                    >
                      <Camera className="w-4 h-4" />
                      <span>ATENDER REPORTE & TOMAR FOTO DE EVIDENCIA</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolution Modal */}
        {selectedReporte && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 border-2 border-amber-500/40 w-full max-w-lg rounded-3xl shadow-2xl p-6 relative space-y-4">
              <button
                onClick={() => setSelectedReporte(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <div className="text-xs font-mono font-bold text-amber-400">{selectedReporte.folio}</div>
                <h3 className="text-lg font-black text-white">Atención y Resolución en Campo</h3>
                <p className="text-xs text-slate-400">{selectedReporte.tipo.replace(/_/g, ' ')} • Sector: {selectedReporte.sector}</p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Foto de Evidencia del Trabajo Realizado (Limpio):
                </label>

                {fotoEvidenciaCapturada ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50">
                    <img
                      src={fotoEvidenciaCapturada}
                      alt="Foto Evidencia"
                      className="w-full h-48 object-cover"
                    />
                    <span className="absolute bottom-2 right-2 bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded">
                      Foto Lista
                    </span>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition">
                    <Camera className="w-10 h-10 text-amber-400 mb-2" />
                    <span className="text-xs font-bold text-slate-200">Tomar o Cargar Foto de Evidencia</span>
                    <span className="text-[10px] text-slate-500 mt-1">Obligatorio para marcar como resuelto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleTomarFoto}
                      className="hidden"
                    />
                  </label>
                )}

                {cameraActive && (
                  <p className="text-xs text-amber-400 text-center animate-pulse">Cargando foto al servidor...</p>
                )}

                <button
                  disabled={!fotoEvidenciaCapturada || resolviendo}
                  onClick={handleResolverReclamo}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg"
                >
                  {resolviendo ? (
                    <span>Sincronizando con Alcaldía...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>MARCAR RESUELTO & NOTIFICAR AL CIUDADANO</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHIFT CLOSE SECTION */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Cierre de Turno y Resumen de Carga
          </h2>

          {turnoFinalizado ? (
            <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 p-6 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto" />
              <h3 className="text-lg font-bold">¡Jornada de Campo Finalizada con Éxito!</h3>
              <p className="text-xs text-slate-300">
                Se registraron <strong>{toneladas} Toneladas</strong> recolectadas y el comprobante PDF fue generado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Toneladas Estimadas Recolectadas en este Turno:
                </label>
                <div className="flex gap-2">
                  {['3.5', '4.5', '6.0', '8.0'].map((ton) => (
                    <button
                      key={ton}
                      type="button"
                      onClick={() => setToneladas(ton)}
                      className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${
                        toneladas === ton
                          ? 'bg-amber-500 border-amber-400 text-slate-950'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      {ton} Tn
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Novedades u Observaciones Operativas:
                </label>
                <input
                  type="text"
                  value={novedades}
                  onChange={(e) => setNovedades(e.target.value)}
                  placeholder="Ej: Calle 3 despejada, sin fallas mecánicas."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                disabled={finalizando}
                onClick={handleFinalizarTurno}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                <span>{finalizando ? 'Procesando descarga...' : 'FINALIZAR TURNO Y DESCARGAR EN RELLENO SANITARIO'}</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
