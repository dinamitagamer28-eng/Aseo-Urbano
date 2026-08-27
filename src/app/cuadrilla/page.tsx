'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import LeafletMap from '@/components/LeafletMap';
import {
  iniciarTurnoCuadrilla,
  marcarTramoCompletado,
  resolverReporteCuadrilla,
  finalizarTurnoCuadrilla,
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
} from 'lucide-react';

export default function CuadrillaPage() {
  // Session States
  const [supervisorCode, setSupervisorCode] = useState('SUP-01 (Roberto González)');
  const [camionCode, setCamionCode] = useState('CAM-01 (Compactador 6.5 Tn)');
  const [sectorName, setSectorName] = useState('Sector Las Colinas (Piloto)');
  const [turnoActivo, setTurnoActivo] = useState(true);
  const [turnoId, setTurnoId] = useState('turno-demo-01');

  // Checklist of Streets (Las Colinas)
  const [tramos, setTramos] = useState([
    { id: 'tramo-1', nombre: 'Calle 1 (Av. Principal a Plaza)', hora: '07:30 AM', completado: true },
    { id: 'tramo-2', nombre: 'Calle 2 Los Pinos (Casa 01 a 40)', hora: '08:30 AM', completado: false },
    { id: 'tramo-3', nombre: 'Calle 3 El Samán (Sector Cancha)', hora: '09:30 AM', completado: false },
    { id: 'tramo-4', nombre: 'Calle 4 Las Flores', hora: '10:30 AM', completado: false },
    { id: 'tramo-5', nombre: 'Calle 5 La Esperanza', hora: '11:30 AM', completado: false },
  ]);

  // Field Incidents List
  const [reportes, setReportes] = useState([
    {
      id: 'rep-01',
      folio: 'INC-2026-00001',
      tipo: 'Basura Acumulada en Cancha',
      descripcion: 'Acumulación de bolsas en la esquina de la cancha de Las Colinas',
      fotoVecino: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60',
      estado: 'ASIGNADO',
      fotoResolucion: null as string | null,
    },
    {
      id: 'rep-02',
      folio: 'INC-2026-00002',
      tipo: 'Poda y Escombros',
      descripcion: 'Poda pesada en la acera frente a casa #14',
      fotoVecino: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=600&auto=format&fit=crop&q=60',
      estado: 'RESUELTO',
      fotoResolucion: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=60',
    },
  ]);

  // Selected Report for Resolution
  const [selectedReporte, setSelectedReporte] = useState<any>(null);
  const [fotoEvidenciaCapturada, setFotoEvidenciaCapturada] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);

  // Shift Close Form
  const [toneladas, setToneladas] = useState('4.5');
  const [novedades, setNovedades] = useState('');
  const [turnoFinalizado, setTurnoFinalizado] = useState(false);

  const totalTramos = tramos.length;
  const completadosCount = tramos.filter((t) => t.completado).length;
  const porcentaje = Math.round((completadosCount / totalTramos) * 100);

  const toggleTramo = (id: string) => {
    setTramos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completado: !t.completado } : t))
    );
  };

  const handleTomarFoto = () => {
    setCameraActive(true);
    setTimeout(() => {
      setFotoEvidenciaCapturada('https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=60');
      setCameraActive(false);
    }, 1000);
  };

  const handleResolverReclamo = async () => {
    if (!fotoEvidenciaCapturada) {
      alert('¡ERROR OPERATIVO! Se requiere la foto de evidencia obligatoria.');
      return;
    }

    setResolviendo(true);
    setTimeout(() => {
      setReportes((prev) =>
        prev.map((r) =>
          r.id === selectedReporte.id
            ? { ...r, estado: 'RESUELTO', fotoResolucion: fotoEvidenciaCapturada }
            : r
        )
      );
      setResolviendo(false);
      setSelectedReporte(null);
      setFotoEvidenciaCapturada(null);
      alert('¡Reclamo resuelto y foto de evidencia sincronizada exitosamente con la Alcaldía!');
    }, 800);
  };

  const handleFinalizarTurno = () => {
    setTurnoFinalizado(true);
    setTurnoActivo(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      <Navbar />

      {/* Field Crew Top Status Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-slate-950 py-3 px-4 shadow-lg sticky top-[57px] z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2 font-black text-sm tracking-tight">
            <Truck className="w-6 h-6 animate-bounce text-slate-950" />
            <span>OPERACIÓN DE CAMPO: CAMIÓN 01</span>
            <span className="bg-slate-950 text-amber-400 px-2 py-0.5 rounded text-xs">LAS COLINAS</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span>Progreso: {completadosCount}/{totalTramos} ({porcentaje}%)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-950 animate-ping"></span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
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

        {/* 1-TOUCH STREET CHECKLIST (Extreme Usability / Touch Targets 58px+) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-400" />
              Checklist de Tramos de Calle (Toca para Completar)
            </h2>
            <span className="text-xs text-slate-400">Las Colinas</span>
          </div>

          <div className="space-y-3">
            {tramos.map((tramo) => (
              <button
                key={tramo.id}
                onClick={() => toggleTramo(tramo.id)}
                className={`w-full min-h-[64px] p-4 rounded-2xl border-2 text-left flex items-center justify-between gap-4 transition-all active:scale-[0.98] ${
                  tramo.completado
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-md shadow-emerald-950/50'
                    : 'bg-slate-950 border-amber-500/40 text-slate-200 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tramo.completado ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-amber-500/50 flex items-center justify-center flex-shrink-0 text-amber-400">
                      <Square className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className={`text-base font-extrabold ${tramo.completado ? 'line-through text-emerald-300' : 'text-white'}`}>
                      {tramo.nombre}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">Hora programada: {tramo.hora}</span>
                  </div>
                </div>

                <div>
                  {tramo.completado ? (
                    <span className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-lg text-xs tracking-wider uppercase">
                      LISTO
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 bg-amber-500 text-slate-950 font-black rounded-lg text-xs tracking-wider uppercase">
                      COMPLETAR
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* FIELD INCIDENTS SECTION WITH STRICT MANDATORY PHOTO LOCK */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                Reclamos e Incidencias Asignadas al Camión
              </h2>
              <p className="text-xs text-slate-400">
                Debes capturar la foto de evidencia de la calle limpia para resolver cada caso.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold">
              {reportes.filter((r) => r.estado !== 'RESUELTO').length} Pendientes
            </span>
          </div>

          <div className="space-y-4">
            {reportes.map((rep) => (
              <div
                key={rep.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-400">{rep.folio}</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{rep.tipo}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{rep.descripcion}</p>
                  </div>
                  <div>
                    {rep.estado === 'RESUELTO' ? (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>RESUELTO</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-xs font-bold animate-pulse flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>PENDIENTE EN RUTA</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Photos Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                      📸 Foto del Vecino:
                    </span>
                    <img
                      src={rep.fotoVecino}
                      alt="Foto vecino"
                      className="w-full h-28 object-cover rounded-xl border border-slate-800"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                      🟢 Foto Evidencia Cuadrilla:
                    </span>
                    {rep.fotoResolucion ? (
                      <img
                        src={rep.fotoResolucion}
                        alt="Evidencia resolución"
                        className="w-full h-28 object-cover rounded-xl border border-emerald-500"
                      />
                    ) : (
                      <div className="w-full h-28 bg-slate-900 border-2 border-dashed border-amber-500/40 rounded-xl flex flex-col items-center justify-center text-center p-2 text-xs text-amber-300/80">
                        <Lock className="w-5 h-5 mb-1 text-amber-400" />
                        <span>Requiere Foto Obligatoria</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                {rep.estado !== 'RESUELTO' && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setSelectedReporte(rep);
                        setFotoEvidenciaCapturada(null);
                      }}
                      className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      <span>ATENDER REPORTE & TOMAR FOTO DE EVIDENCIA</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* MODAL / BOTTOM SHEET: RESOLUCIÓN DE RECLAMO CON CÁMARA */}
        {selectedReporte && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-bold text-amber-400">Atención de Reclamo en Campo</span>
                  <h3 className="text-xl font-black text-white">{selectedReporte.folio}</h3>
                  <p className="text-xs text-slate-400">{selectedReporte.tipo}</p>
                </div>
                <button
                  onClick={() => setSelectedReporte(null)}
                  className="px-3 py-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold"
                >
                  Cancelar
                </button>
              </div>

              {/* Step 1: Camera Capture */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">
                  Paso 1: Captura la Foto de Evidencia (Limpio):
                </label>

                {cameraActive ? (
                  <div className="w-full h-48 bg-slate-950 rounded-2xl flex flex-col items-center justify-center text-amber-400 animate-pulse border border-amber-500">
                    <Camera className="w-10 h-10 mb-2" />
                    <span className="font-bold text-sm">Abriendo Cámara del Dispositivo...</span>
                  </div>
                ) : fotoEvidenciaCapturada ? (
                  <div className="relative">
                    <img
                      src={fotoEvidenciaCapturada}
                      alt="Evidencia capturada"
                      className="w-full h-48 object-cover rounded-2xl border-2 border-emerald-500"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Foto Capturada</span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleTomarFoto}
                    className="w-full h-40 bg-slate-950 hover:bg-slate-900 border-2 border-dashed border-amber-500/60 rounded-2xl flex flex-col items-center justify-center text-amber-400 transition-colors"
                  >
                    <Camera className="w-10 h-10 mb-2" />
                    <span className="font-black text-sm uppercase tracking-wider">Tocar para Abrir Cámara y Capturar</span>
                  </button>
                )}
              </div>

              {/* Step 2: Strict Button Lock */}
              <div className="pt-2">
                {fotoEvidenciaCapturada ? (
                  <button
                    type="button"
                    onClick={handleResolverReclamo}
                    disabled={resolviendo}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-base flex items-center justify-center gap-2 shadow-xl transition-all"
                  >
                    <Unlock className="w-5 h-5" />
                    <span>{resolviendo ? 'Sincronizando con Alcaldía...' : 'CONFIRMAR Y RESOLVER RECLAMO'}</span>
                  </button>
                ) : (
                  <div className="w-full py-4 bg-slate-800 text-slate-500 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                    <Lock className="w-5 h-5 text-slate-600" />
                    <span>BOTÓN BLOQUEADO: TOMA LA FOTO PRIMERO</span>
                  </div>
                )}
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
                Se registraron <strong>{toneladas} Toneladas</strong> recolectadas en el Sector Las Colinas y los datos han sido sincronizados con el Panel Administrativo.
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
                onClick={handleFinalizarTurno}
                className="w-full py-4 bg-slate-800 hover:bg-red-700 hover:text-white text-slate-200 font-extrabold rounded-2xl text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <span>🏁 FINALIZAR TURNO Y DESCARGAR EN RELLENO SANITARIO</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
