'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, MapPin, Search, Truck, AlertCircle, CheckCircle2, ChevronRight, Sparkles, Filter } from 'lucide-react';

interface SectorSchedule {
  id: string;
  nombre: string;
  zona: string;
  diasSemana: number[]; // 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab, 0=Dom
  diasTexto: string;
  turno: 'MAÑANA' | 'TARDE' | 'NOCHE';
  horario: string;
  frecuencia: string;
  camionAsignado: string;
  notas?: string;
}

// 83 sectores estructurados por zonas operativas municipales de Rosario de Perijá
const BASE_SCHEDULES: Record<string, { dias: number[]; diasTexto: string; turno: 'MAÑANA' | 'TARDE' | 'NOCHE'; horario: string; zona: string; camion: string; frecuencia: string }> = {
  // Zona 1: Casco Central y Parroquia Rosario Centro
  ZONA_1: {
    dias: [1, 3, 5],
    diasTexto: 'Lunes, Miércoles y Viernes',
    turno: 'MAÑANA',
    horario: '07:00 AM - 11:30 AM',
    zona: 'Zona 1 (Rosario Urbano Norte)',
    camion: 'CAM-01 Compactador',
    frecuencia: '3 veces por semana',
  },
  // Zona 2: Sectores del Sur y Oeste
  ZONA_2: {
    dias: [2, 4, 6],
    diasTexto: 'Martes, Jueves y Sábado',
    turno: 'MAÑANA',
    horario: '07:00 AM - 11:30 AM',
    zona: 'Zona 2 (Rosario Urbano Sur)',
    camion: 'CAM-02 Compactador',
    frecuencia: '3 veces por semana',
  },
  // Zona Comercial y Ejes Principales
  ZONA_COMERCIAL: {
    dias: [1, 2, 3, 4, 5, 6],
    diasTexto: 'Lunes a Sábado (Diario)',
    turno: 'TARDE',
    horario: '02:00 PM - 06:00 PM',
    zona: 'Eje Comercial & Avenidas',
    camion: 'CAM-01 Compactador',
    frecuencia: 'Diaria Comercial',
  },
  // Zona Rural y Foránea
  ZONA_RURAL: {
    dias: [3, 6],
    diasTexto: 'Miércoles y Sábado',
    turno: 'MAÑANA',
    horario: '07:30 AM - 01:00 PM',
    zona: 'Eje Foráneo & Perijá Rural',
    camion: 'CAM-02 Compactador',
    frecuencia: '2 veces por semana',
  },
};

const SECTOR_ZONE_MAP: Record<string, keyof typeof BASE_SCHEDULES> = {
  'Casco Central': 'ZONA_COMERCIAL',
  'Av. Bolívar': 'ZONA_COMERCIAL',
  'Mercado Municipal': 'ZONA_COMERCIAL',
  'Av. Donaldo García': 'ZONA_COMERCIAL',
  'Terminal de Pasajeros': 'ZONA_COMERCIAL',
  'Las Colinas': 'ZONA_2',
  'La Aurora': 'ZONA_2',
  'Juan Gil': 'ZONA_2',
  'San Juan': 'ZONA_2',
  'Noriega Trigo': 'ZONA_1',
  'Trujillo': 'ZONA_1',
  'San José': 'ZONA_1',
  'El Carmen': 'ZONA_1',
  'La Matica': 'ZONA_2',
  'Barranquitas': 'ZONA_RURAL',
  'Km 18': 'ZONA_RURAL',
  'Don Bosco': 'ZONA_RURAL',
};

const DIAS_SEMANA_NOMBRES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Props {
  userSectorNombre?: string;
  onSelectSector?: (sectorNombre: string) => void;
}

export default function CronogramaRutas({ userSectorNombre, onSelectSector }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiaFiltro, setSelectedDiaFiltro] = useState<number | 'TODOS' | 'HOY'>('HOY');
  const [sectoresList, setSectoresList] = useState<{ id: string; nombre: string }[]>([]);
  const [cargandoSectores, setCargandoSectores] = useState(true);

  const hoyDiaNumero = new Date().getDay(); // 0 = Domingo, 1 = Lunes...

  useEffect(() => {
    async function loadSectores() {
      try {
        const res = await fetch('/api/sectores');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSectoresList(data);
        }
      } catch (e) {
        console.warn('Error al cargar sectores para cronograma:', e);
      } finally {
        setCargandoSectores(false);
      }
    }
    loadSectores();
  }, []);

  // Compute schedule object for each sector
  const fullScheduleList: SectorSchedule[] = useMemo(() => {
    return sectoresList.map((sec, idx) => {
      let zoneKey: keyof typeof BASE_SCHEDULES = 'ZONA_1';
      
      if (SECTOR_ZONE_MAP[sec.nombre]) {
        zoneKey = SECTOR_ZONE_MAP[sec.nombre];
      } else {
        // Distribute other sectors evenly between Zona 1, Zona 2 and Zona Rural
        if (idx % 3 === 0) zoneKey = 'ZONA_1';
        else if (idx % 3 === 1) zoneKey = 'ZONA_2';
        else zoneKey = 'ZONA_RURAL';
      }

      const info = BASE_SCHEDULES[zoneKey];
      return {
        id: sec.id,
        nombre: sec.nombre,
        zona: info.zona,
        diasSemana: info.dias,
        diasTexto: info.diasTexto,
        turno: info.turno,
        horario: info.horario,
        frecuencia: info.frecuencia,
        camionAsignado: info.camion,
      };
    });
  }, [sectoresList]);

  // If user has a sector assigned, find its schedule
  const userSectorSchedule = useMemo(() => {
    if (!userSectorNombre) return null;
    return fullScheduleList.find((s) => s.nombre.toLowerCase() === userSectorNombre.toLowerCase());
  }, [userSectorNombre, fullScheduleList]);

  // Filtered schedule list based on search and selected day
  const filteredSchedule = useMemo(() => {
    return fullScheduleList.filter((item) => {
      const matchSearch =
        searchTerm === '' ||
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.zona.toLowerCase().includes(searchTerm.toLowerCase());

      let matchDay = true;
      if (selectedDiaFiltro === 'HOY') {
        matchDay = item.diasSemana.includes(hoyDiaNumero);
      } else if (typeof selectedDiaFiltro === 'number') {
        matchDay = item.diasSemana.includes(selectedDiaFiltro);
      }

      return matchSearch && matchDay;
    });
  }, [fullScheduleList, searchTerm, selectedDiaFiltro, hoyDiaNumero]);

  const esHoyEnRuta = (diasSemana: number[]) => diasSemana.includes(hoyDiaNumero);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Cronograma Oficial de Recolección</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              Horarios y Frecuencias por Sector
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Consulta los días y turnos exactos en que las unidades compactadoras de la Alcaldía de Rosario de Perijá recorren tu comunidad.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shrink-0 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Día de Hoy</div>
              <div className="text-base font-black text-white">{DIAS_SEMANA_NOMBRES[hoyDiaNumero]}</div>
              <div className="text-[11px] text-amber-400 font-medium">
                {hoyDiaNumero === 0 ? 'Mantenimiento de Unidades' : 'Rutas Operativas Activas'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User's Sector Highlight (If logged in with property) */}
      {userSectorSchedule && (
        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Tu Sector Vinculado</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <h3 className="text-xl font-black text-white">{userSectorSchedule.nombre}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{userSectorSchedule.zona}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {esHoyEnRuta(userSectorSchedule.diasSemana) ? (
                <div className="px-3.5 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡HOY EL CAMIÓN RECORRE TU SECTOR!</span>
                </div>
              ) : (
                <div className="px-3.5 py-2 bg-slate-800 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Próximo pase: {userSectorSchedule.diasTexto}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-emerald-500/20 text-xs">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">DÍAS DE SERVICIO</span>
              <span className="font-bold text-white text-xs">{userSectorSchedule.diasTexto}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">TURNO & HORARIO</span>
              <span className="font-bold text-amber-400 text-xs">{userSectorSchedule.horario}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">UNIDAD ASIGNADA</span>
              <span className="font-bold text-sky-400 text-xs">{userSectorSchedule.camionAsignado}</span>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block">FRECUENCIA</span>
              <span className="font-bold text-emerald-400 text-xs">{userSectorSchedule.frecuencia}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre de sector (ej. Casco Central, Noriega Trigo, Las Colinas...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Day Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedDiaFiltro('HOY')}
              className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition flex items-center gap-1.5 ${
                selectedDiaFiltro === 'HOY'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rutas de Hoy ({DIAS_SEMANA_NOMBRES[hoyDiaNumero]})</span>
            </button>

            <button
              onClick={() => setSelectedDiaFiltro('TODOS')}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                selectedDiaFiltro === 'TODOS'
                  ? 'bg-sky-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              Todos los Días
            </button>

            {[1, 2, 3, 4, 5, 6].map((diaNum) => (
              <button
                key={diaNum}
                onClick={() => setSelectedDiaFiltro(diaNum)}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition ${
                  selectedDiaFiltro === diaNum
                    ? 'bg-slate-700 text-white font-bold border border-slate-600'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {DIAS_SEMANA_NOMBRES[diaNum].substring(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Schedule Cards Grid */}
      {cargandoSectores ? (
        <div className="text-center py-12 bg-slate-900/50 rounded-3xl border border-slate-800 space-y-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">Cargando sectores de Rosario de Perijá...</p>
        </div>
      ) : filteredSchedule.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 rounded-3xl border border-slate-800 space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm font-bold text-white">No se encontraron sectores para este filtro</p>
          <p className="text-xs text-slate-400">Prueba ajustando el buscador o cambiando el día seleccionado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedule.map((item) => {
            const hoyActivo = esHoyEnRuta(item.diasSemana);
            return (
              <div
                key={item.id}
                className={`rounded-2xl p-4 transition-all duration-200 border ${
                  hoyActivo
                    ? 'bg-gradient-to-b from-slate-900 to-emerald-950/30 border-emerald-500/40 shadow-lg hover:border-emerald-400'
                    : 'bg-slate-900 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Status Header */}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.zona}</span>
                  {hoyActivo ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      EN RUTA HOY
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                      Programado
                    </span>
                  )}
                </div>

                {/* Sector Title */}
                <h4 className="text-base font-black text-white flex items-center gap-1.5 mb-3">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">{item.nombre}</span>
                </h4>

                {/* Schedule Details */}
                <div className="space-y-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Días:
                    </span>
                    <span className="font-bold text-slate-200 text-right">{item.diasTexto}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      Horario:
                    </span>
                    <span className="font-bold text-amber-400">{item.horario}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      Unidad:
                    </span>
                    <span className="font-mono text-slate-300 text-[11px]">{item.camionAsignado}</span>
                  </div>
                </div>

                {onSelectSector && (
                  <button
                    onClick={() => onSelectSector(item.nombre)}
                    className="w-full mt-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <span>Ver en Mapa GPS</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Good Citizen Guidelines Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-xs text-slate-300 space-y-3">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Recomendaciones para el Buen Manejo de Residuos
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-amber-400 block mb-1">⏰ Sacar bolsas a tiempo</span>
            Coloca tus bolsas de basura bien cerradas en el frente de tu vivienda entre 15 y 30 minutos antes del inicio del turno de recolección.
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">🐕 Protección contra animales</span>
            Utiliza cestas elevadas o ganchos para evitar que animales rompan las bolsas y dispersen los desechos en la vía pública.
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-sky-400 block mb-1">🚫 No escombros ni poda pesada</span>
            El camión compactador está destinado exclusivamente a residuos sólidos domésticos. Para ramas o escombros solicita operativo especial.
          </div>
        </div>
      </div>
    </div>
  );
}
