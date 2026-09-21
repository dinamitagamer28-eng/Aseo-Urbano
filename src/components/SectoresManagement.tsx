'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  MapPin,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Navigation,
  Compass,
  Home,
  PenLine,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import {
  crearSector,
  actualizarSector,
  toggleEstadoSector,
  eliminarSector,
  crearCalle,
  actualizarCalle,
  eliminarCalle,
} from '@/lib/actions';

const ESTRATOS = [
  { value: 'POPULAR', label: 'Popular' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'COMERCIAL', label: 'Comercial' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'RURAL', label: 'Rural' },
];

const DIAS_RECOLECCION = [
  { value: 'LUNES_JUEVES', label: 'Lunes y Jueves' },
  { value: 'MARTES_VIERNES', label: 'Martes y Viernes' },
  { value: 'MIERCOLES_SABADO', label: 'Miércoles y Sábado' },
  { value: 'DIARIO', label: 'Diario (Comercial / Alta Densidad)' },
];

interface SectoresManagementProps {
  sectores: any[];
  parroquias: any[];
  tasaBcv: number;
  onDataRefresh: () => Promise<void>;
  onVerEnMapa?: (sectorId: string) => void;
}

export default function SectoresManagement({
  sectores,
  parroquias,
  tasaBcv,
  onDataRefresh,
  onVerEnMapa,
}: SectoresManagementProps) {
  const [search, setSearch] = useState('');
  const [filtroParroquia, setFiltroParroquia] = useState('TODAS');
  const [filtroEstrato, setFiltroEstrato] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroGps, setFiltroGps] = useState('TODOS');

  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalCallesOpen, setModalCallesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSector, setSelectedSector] = useState<any | null>(null);

  useEffect(() => {
    if (selectedSector) {
      const refreshed = sectores.find((s) => s.id === selectedSector.id);
      if (refreshed) setSelectedSector(refreshed);
    }
  }, [sectores]);

  // Form New Sector
  const [formCrear, setFormCrear] = useState({
    nombre: '',
    codigo: '',
    parroquiaId: parroquias[0]?.id || '',
    estrato: 'POPULAR',
    faseDespliegue: 'PILOTO_ACTIVO',
    tarifaBaseUsd: 3,
    centroLat: 10.3167,
    centroLng: -72.3167,
    coordenadasGps: '',
    primeraCalle: 'Calle Principal',
    activo: true,
  });

  // Form Edit Sector
  const [formEditar, setFormEditar] = useState({
    id: '',
    nombre: '',
    codigo: '',
    parroquiaId: '',
    estrato: 'POPULAR',
    faseDespliegue: 'PILOTO_ACTIVO',
    tarifaBaseUsd: 3,
    centroLat: 10.3167,
    centroLng: -72.3167,
    coordenadasGps: '',
    geocercaGeoJson: '',
    activo: true,
  });

  // Form New / Edit Street
  const [formNuevaCalle, setFormNuevaCalle] = useState({
    nombreCalle: '',
    diaRecoleccion: 'LUNES_JUEVES',
    horaEstimada: '07:00 AM',
    ordenRecoleccion: 1,
  });
  const [editingCalle, setEditingCalle] = useState<any | null>(null);

  // Filtered Sectors
  const filteredSectores = useMemo(() => {
    return sectores.filter((s) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchName = s.nombre?.toLowerCase().includes(query);
        const matchCode = s.codigo?.toLowerCase().includes(query);
        const matchParroquia = (typeof s.parroquia === 'string' ? s.parroquia : s.parroquia?.nombre || '').toLowerCase().includes(query);
        const matchStreet = s.calles?.some((c: any) => c.nombreCalle?.toLowerCase().includes(query));
        if (!matchName && !matchCode && !matchParroquia && !matchStreet) return false;
      }
      if (filtroParroquia !== 'TODAS') {
        const pName = typeof s.parroquia === 'string' ? s.parroquia : s.parroquia?.nombre;
        if (pName !== filtroParroquia) return false;
      }
      if (filtroEstrato !== 'TODOS' && s.estrato !== filtroEstrato) return false;
      if (filtroEstado === 'ACTIVOS' && !s.activo) return false;
      if (filtroEstado === 'INACTIVOS' && s.activo) return false;

      const hasGps = !!(s.coordenadasGps || s.geocercaGeoJson);
      if (filtroGps === 'CON_GPS' && !hasGps) return false;
      if (filtroGps === 'SIN_GPS' && hasGps) return false;

      return true;
    });
  }, [sectores, search, filtroParroquia, filtroEstrato, filtroEstado, filtroGps]);

  const totalActivos = useMemo(() => sectores.filter((s) => s.activo).length, [sectores]);
  const totalCalles = useMemo(() => sectores.reduce((acc, s) => acc + (s.callesCount || s.calles?.length || 0), 0), [sectores]);
  const totalConGps = useMemo(() => sectores.filter((s) => !!(s.coordenadasGps || s.geocercaGeoJson)).length, [sectores]);

  // Actions
  const handleCrearSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCrear.nombre.trim()) return alert('⚠️ El nombre del sector es obligatorio');
    setSubmitting(true);
    try {
      await crearSector({
        nombre: formCrear.nombre,
        codigo: formCrear.codigo || undefined,
        parroquiaId: formCrear.parroquiaId || parroquias[0]?.id,
        estrato: formCrear.estrato,
        faseDespliegue: formCrear.faseDespliegue,
        tarifaBaseUsd: Number(formCrear.tarifaBaseUsd),
        centroLat: Number(formCrear.centroLat),
        centroLng: Number(formCrear.centroLng),
        coordenadasGps: formCrear.coordenadasGps || undefined,
        primeraCalle: formCrear.primeraCalle || undefined,
        activo: formCrear.activo,
      });
      alert('✅ Sector creado exitosamente.');
      setModalCrearOpen(false);
      await onDataRefresh();
    } catch (err: any) {
      alert('❌ Error al crear sector: ' + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleActualizarSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEditar.nombre.trim()) return alert('⚠️ El nombre del sector es obligatorio');
    setSubmitting(true);
    try {
      await actualizarSector(formEditar.id, {
        nombre: formEditar.nombre,
        codigo: formEditar.codigo,
        parroquiaId: formEditar.parroquiaId,
        estrato: formEditar.estrato,
        faseDespliegue: formEditar.faseDespliegue,
        tarifaBaseUsd: Number(formEditar.tarifaBaseUsd),
        centroLat: Number(formEditar.centroLat),
        centroLng: Number(formEditar.centroLng),
        coordenadasGps: formEditar.coordenadasGps,
        geocercaGeoJson: formEditar.geocercaGeoJson,
        activo: formEditar.activo,
      });
      alert('✅ Sector actualizado correctamente.');
      setModalEditarOpen(false);
      await onDataRefresh();
    } catch (err: any) {
      alert('❌ Error al actualizar sector: ' + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEstadoSector = async (sector: any) => {
    const nuevoEstado = !sector.activo;
    if (
      confirm(
        nuevoEstado
          ? '¿Desea activar el sector "' + sector.nombre + '"? Volverá a estar visible en el censo y rutas.'
          : '¿Desea pausar/desactivar el sector "' + sector.nombre + '"? No aparecerá para nuevos censados ni en la app móvil.'
      )
    ) {
      setSubmitting(true);
      try {
        await toggleEstadoSector(sector.id, nuevoEstado);
        await onDataRefresh();
      } catch (err: any) {
        alert('❌ Error al cambiar estado: ' + (err?.message || err));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleEliminarSector = async (sector: any) => {
    if (
      confirm(
        '⚠️ ADVERTENCIA: ¿Está seguro de eliminar definitivamente el sector "' + sector.nombre + '" (' + sector.codigo + ')?\n\nSi tiene viviendas censadas o registros asociados el sistema bloqueará el borrado para proteger la integridad tributaria.'
      )
    ) {
      setSubmitting(true);
      try {
        await eliminarSector(sector.id);
        alert('✅ Sector eliminado exitosamente.');
        await onDataRefresh();
      } catch (err: any) {
        alert('⚠️ No fue posible eliminar: ' + (err?.message || err));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleOpenCalles = (sector: any) => {
    setSelectedSector(sector);
    setFormNuevaCalle({
      nombreCalle: '',
      diaRecoleccion: 'LUNES_JUEVES',
      horaEstimada: '07:00 AM',
      ordenRecoleccion: (sector.calles?.length || 0) + 1,
    });
    setEditingCalle(null);
    setModalCallesOpen(true);
  };

  const handleCrearCalle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSector) return;
    if (!formNuevaCalle.nombreCalle.trim()) return alert('⚠️ Ingrese el nombre de la calle');
    setSubmitting(true);
    try {
      await crearCalle({
        sectorId: selectedSector.id,
        nombreCalle: formNuevaCalle.nombreCalle,
        diaRecoleccion: formNuevaCalle.diaRecoleccion,
        horaEstimada: formNuevaCalle.horaEstimada,
        ordenRecoleccion: Number(formNuevaCalle.ordenRecoleccion),
      });
      alert('✅ Calle agregada al sector.');
      setFormNuevaCalle({
        nombreCalle: '',
        diaRecoleccion: 'LUNES_JUEVES',
        horaEstimada: '07:00 AM',
        ordenRecoleccion: (selectedSector.calles?.length || 0) + 2,
      });
      await onDataRefresh();
    } catch (err: any) {
      alert('❌ Error al crear calle: ' + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarCalle = async (calle: any) => {
    if (confirm('¿Eliminar la calle "' + calle.nombreCalle + '"?')) {
      setSubmitting(true);
      try {
        await eliminarCalle(calle.id);
        alert('✅ Calle eliminada.');
        await onDataRefresh();
      } catch (err: any) {
        alert('⚠️ No se pudo eliminar la calle: ' + (err?.message || err));
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner and KPI Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Layers className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                  Mantenimiento de Sectores, Calles & Límites GPS
                  <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-600/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {sectores.length} Sectores Registrados
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Administre el padrón territorial del Municipio Rosario de Perijá. Cree nuevos sectores, asigne calles y defina coordenadas o polígonos perimetrales GPS.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setFormCrear({
                  nombre: '',
                  codigo: '',
                  parroquiaId: parroquias[0]?.id || '',
                  estrato: 'POPULAR',
                  faseDespliegue: 'PILOTO_ACTIVO',
                  tarifaBaseUsd: 3,
                  centroLat: 10.3167,
                  centroLng: -72.3167,
                  coordenadasGps: '',
                  primeraCalle: 'Calle Principal',
                  activo: true,
                });
                setModalCrearOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Sector</span>
            </button>

            <button
              onClick={() => onDataRefresh()}
              disabled={submitting}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Actualizar listado desde base de datos"
            >
              <RefreshCw className={'w-3.5 h-3.5 ' + (submitting ? 'animate-spin text-emerald-400' : '')} />
              <span className="hidden sm:inline">Recargar</span>
            </button>
          </div>
        </div>

        {/* 4 Metric counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Total Sectores</span>
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">{sectores.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">En las 3 parroquias</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4">
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sectores Activos</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{totalActivos}</div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Disponibles en Censo y Rutas</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4">
            <div className="text-[11px] text-indigo-400 font-medium flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Calles & Tramos</span>
            </div>
            <div className="text-2xl font-black text-indigo-300 font-mono mt-1">{totalCalles}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Asignadas a sectores</div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4">
            <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Con Delimitación GPS</span>
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">{totalConGps}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Polígonos geográficos</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-2 border-t border-slate-800/60 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por sector, código o calle..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <select
              value={filtroParroquia}
              onChange={(e) => setFiltroParroquia(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="TODAS">Todas las Parroquias</option>
              {parroquias.map((p) => (
                <option key={p.id} value={p.nombre}>
                  {p.nombre}
                </option>
              ))}
            </select>

            <select
              value={filtroEstrato}
              onChange={(e) => setFiltroEstrato(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="TODOS">Todos los Estratos</option>
              {ESTRATOS.map((est) => (
                <option key={est.value} value={est.value}>
                  {est.label}
                </option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="ACTIVOS">Solo Activos</option>
              <option value="INACTIVOS">Solo Inactivos</option>
            </select>

            <select
              value={filtroGps}
              onChange={(e) => setFiltroGps(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="TODOS">Filtro GPS (Todos)</option>
              <option value="CON_GPS">Con Delimitación GPS</option>
              <option value="SIN_GPS">Sin Delimitación GPS</option>
            </select>

            {(search || filtroParroquia !== 'TODAS' || filtroEstrato !== 'TODOS' || filtroEstado !== 'TODOS' || filtroGps !== 'TODOS') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFiltroParroquia('TODAS');
                  setFiltroEstrato('TODOS');
                  setFiltroEstado('TODOS');
                  setFiltroGps('TODOS');
                }}
                className="px-2.5 py-2 text-slate-400 hover:text-white text-xs font-semibold"
                title="Limpiar filtros"
              >
                Restablecer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sectors Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="p-3.5">Código / Estado</th>
                <th className="p-3.5">Sector</th>
                <th className="p-3.5">Parroquia</th>
                <th className="p-3.5">Estrato / Fase</th>
                <th className="p-3.5">Calles Asociadas</th>
                <th className="p-3.5">Delimitación GPS</th>
                <th className="p-3.5">Tarifa Base</th>
                <th className="p-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredSectores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No se encontraron sectores que coincidan con los filtros de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredSectores.map((sec) => {
                  const hasGps = !!(sec.coordenadasGps || sec.geocercaGeoJson);
                  const numCalles = sec.callesCount || sec.calles?.length || 0;
                  const pName = typeof sec.parroquia === 'string' ? sec.parroquia : sec.parroquia?.nombre || 'El Rosario';

                  return (
                    <tr key={sec.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={'w-2.5 h-2.5 rounded-full ' + (sec.activo ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500')}
                            title={sec.activo ? 'Sector Activo en Censo y Rutas' : 'Sector Inactivo'}
                          />
                          <span className="font-mono font-semibold text-slate-300">{sec.codigo}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">{sec.nombre}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Home className="w-3 h-3 text-slate-500" />
                          <span>{sec.inmueblesCount || 0} inmuebles censados</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300 font-medium">
                          {pName}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-1">
                          <span className="inline-block bg-slate-800/80 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
                            {sec.estrato}
                          </span>
                          {sec.faseDespliegue && (
                            <div className="text-[10px] text-slate-400 font-mono">{sec.faseDespliegue}</div>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <button
                          onClick={() => handleOpenCalles(sec)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 font-bold flex items-center gap-1.5 transition cursor-pointer group"
                        >
                          <Compass className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform" />
                          <span>
                            {numCalles} {numCalles === 1 ? 'Calle' : 'Calles'}
                          </span>
                        </button>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-1">
                          {hasGps ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/40 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Polígono GPS</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Sin geocerca</span>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sec.centroLat ? sec.centroLat.toFixed(4) : '10.3167'}, {sec.centroLng ? sec.centroLng.toFixed(4) : '-72.3167'}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-emerald-400">
                          ${(sec.tarifaUsd || 3).toFixed(2)} USD
                        </div>
                        <div className="text-[10px] text-amber-400">
                          Bs. {((sec.tarifaUsd || 3) * tasaBcv).toFixed(2)}
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleOpenCalles(sec)}
                            className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition"
                            title="Gestionar calles de este sector"
                          >
                            <Compass className="w-4 h-4" />
                          </button>

                          {onVerEnMapa && (
                            <button
                              onClick={() => onVerEnMapa(sec.id)}
                              className="p-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg transition"
                              title="Ver en mapa satelital"
                            >
                              <Navigation className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedSector(sec);
                              setFormEditar({
                                id: sec.id,
                                nombre: sec.nombre,
                                codigo: sec.codigo,
                                parroquiaId: sec.parroquiaId || parroquias[0]?.id || '',
                                estrato: sec.estrato || 'POPULAR',
                                faseDespliegue: sec.faseDespliegue || 'PILOTO_ACTIVO',
                                tarifaBaseUsd: sec.tarifaUsd || 3,
                                centroLat: sec.centroLat || 10.3167,
                                centroLng: sec.centroLng || -72.3167,
                                coordenadasGps: sec.coordenadasGps || '',
                                geocercaGeoJson: sec.geocercaGeoJson || '',
                                activo: sec.activo,
                              });
                              setModalEditarOpen(true);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg transition"
                            title="Editar información y coordenadas del sector"
                          >
                            <PenLine className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleEstadoSector(sec)}
                            className={'p-1.5 rounded-lg transition ' + (sec.activo ? 'bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white' : 'bg-emerald-950/80 hover:bg-emerald-600 text-emerald-400 hover:text-white')}
                            title={sec.activo ? 'Desactivar sector' : 'Activar sector'}
                          >
                            {sec.activo ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>

                          <button
                            onClick={() => handleEliminarSector(sec)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-lg transition"
                            title="Eliminar sector (si no tiene inmuebles asociados)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Crear Sector */}
      {modalCrearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">Registrar Nuevo Sector</h3>
                  <p className="text-xs text-slate-400">Añada un sector al catastro municipal de Rosario de Perijá</p>
                </div>
              </div>
              <button
                onClick={() => setModalCrearOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearSector} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nombre del Sector <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCrear.nombre}
                    onChange={(e) => {
                      const val = e.target.value;
                      const autoCode = 'SEC-' + val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 10);
                      setFormCrear((prev) => ({
                        ...prev,
                        nombre: val,
                        codigo: prev.codigo ? prev.codigo : autoCode,
                      }));
                    }}
                    placeholder="Ej: Sector Noriega Trigo"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Código Único Catastral (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formCrear.codigo}
                    onChange={(e) => setFormCrear({ ...formCrear, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ej: SEC-NORIEGA"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Parroquia <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formCrear.parroquiaId}
                    onChange={(e) => setFormCrear({ ...formCrear, parroquiaId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {parroquias.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Estrato Socioeconómico</label>
                  <select
                    value={formCrear.estrato}
                    onChange={(e) => setFormCrear({ ...formCrear, estrato: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {ESTRATOS.map((est) => (
                      <option key={est.value} value={est.value}>
                        {est.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tarifa Base Mensual ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formCrear.tarifaBaseUsd}
                    onChange={(e) =>
                      setFormCrear({ ...formCrear, tarifaBaseUsd: parseFloat(e.target.value) || 3 })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
                    Equivalente: Bs. {(formCrear.tarifaBaseUsd * tasaBcv).toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Primera Calle / Avenida Inicial
                  </label>
                  <input
                    type="text"
                    value={formCrear.primeraCalle}
                    onChange={(e) => setFormCrear({ ...formCrear, primeraCalle: e.target.value })}
                    placeholder="Ej: Av. Principal / Calle 1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalCrearOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Crear Sector</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Sector */}
      {modalEditarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                  <PenLine className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Sector: {formEditar.nombre}</h3>
                  <p className="text-xs text-slate-400">Código: {formEditar.codigo}</p>
                </div>
              </div>
              <button
                onClick={() => setModalEditarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActualizarSector} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nombre del Sector <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formEditar.nombre}
                    onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Código Único Catastral</label>
                  <input
                    type="text"
                    value={formEditar.codigo}
                    onChange={(e) => setFormEditar({ ...formEditar, codigo: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Parroquia</label>
                  <select
                    value={formEditar.parroquiaId}
                    onChange={(e) => setFormEditar({ ...formEditar, parroquiaId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {parroquias.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Estrato</label>
                  <select
                    value={formEditar.estrato}
                    onChange={(e) => setFormEditar({ ...formEditar, estrato: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {ESTRATOS.map((est) => (
                      <option key={est.value} value={est.value}>
                        {est.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tarifa Base Mensual ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formEditar.tarifaBaseUsd}
                    onChange={(e) =>
                      setFormEditar({ ...formEditar, tarifaBaseUsd: parseFloat(e.target.value) || 3 })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Estado de Operación</label>
                  <select
                    value={formEditar.activo ? 'ACTIVO' : 'INACTIVO'}
                    onChange={(e) => setFormEditar({ ...formEditar, activo: e.target.value === 'ACTIVO' })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="ACTIVO">Activo (Visible en Censo y Rutas)</option>
                    <option value="INACTIVO">Inactivo / Pausado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalEditarOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-sky-600/30 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Calles */}
      {modalCallesOpen && selectedSector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Compass className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Calles y Tramos: {selectedSector.nombre}
                    <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      {selectedSector.codigo}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedSector.calles?.length || 0} calles registradas para recorridos y censo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalCallesOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Add Street */}
            <form onSubmit={handleCrearCalle} className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Agregar Nueva Calle a este Sector</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">Nombre de la Calle / Avenida</label>
                  <input
                    type="text"
                    required
                    value={formNuevaCalle.nombreCalle}
                    onChange={(e) => setFormNuevaCalle({ ...formNuevaCalle, nombreCalle: e.target.value })}
                    placeholder="Ej: Calle 3 Los Pinos"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Día de Recolección</label>
                  <select
                    value={formNuevaCalle.diaRecoleccion}
                    onChange={(e) => setFormNuevaCalle({ ...formNuevaCalle, diaRecoleccion: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {DIAS_RECOLECCION.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Hora Estimada</label>
                  <input
                    type="text"
                    value={formNuevaCalle.horaEstimada}
                    onChange={(e) => setFormNuevaCalle({ ...formNuevaCalle, horaEstimada: e.target.value })}
                    placeholder="07:00 AM"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Guardar Calle</span>
                </button>
              </div>
            </form>

            {/* List of streets in sector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 px-1">
                <span>Calles registradas</span>
                <span>{selectedSector.calles?.length || 0} Calles</span>
              </div>
              <div className="overflow-x-auto max-h-[300px] border border-slate-800 rounded-2xl bg-slate-950/60">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Calle / Tramo</th>
                      <th className="p-2.5">Frecuencia / Día</th>
                      <th className="p-2.5">Horario</th>
                      <th className="p-2.5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {!selectedSector.calles || selectedSector.calles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500">
                          No hay calles registradas en este sector. Agrega una arriba.
                        </td>
                      </tr>
                    ) : (
                      selectedSector.calles.map((c: any, idx: number) => (
                        <tr key={c.id} className="hover:bg-slate-900/60">
                          <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-white">{c.nombreCalle}</td>
                          <td className="p-2.5 text-slate-300">{c.diaRecoleccion}</td>
                          <td className="p-2.5 text-slate-400 font-mono">{c.horaEstimada || '07:00 AM'}</td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleEliminarCalle(c)}
                              className="p-1 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 rounded-lg transition"
                              title="Eliminar calle"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
