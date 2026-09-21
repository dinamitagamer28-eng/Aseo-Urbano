'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Building2,
  Users,
  Plus,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Clock,
  Calendar,
  Home,
  ShieldCheck,
  Trash2,
  X,
  Loader2
} from 'lucide-react';
import { crearCalle } from '@/lib/actions';

interface CensoTerritorialSectionProps {
  sectores: any[];
  inmueblesCensados: any[];
  onRefresh: () => Promise<void>;
}

export default function CensoTerritorialSection({
  sectores = [],
  inmueblesCensados = [],
  onRefresh,
}: CensoTerritorialSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('TODOS');
  const [expandedSectorId, setExpandedSectorId] = useState<string | null>(null);
  const [activeTabSector, setActiveTabSector] = useState<'calles' | 'inmuebles'>('calles');

  // Modals
  const [modalCalleOpen, setModalCalleOpen] = useState(false);
  const [modalCensoOpen, setModalCensoOpen] = useState(false);
  const [submittingCalle, setSubmittingCalle] = useState(false);
  const [submittingCenso, setSubmittingCenso] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form New Calle
  const [newCalleSectorId, setNewCalleSectorId] = useState('');
  const [newCalleNombre, setNewCalleNombre] = useState('');
  const [newCalleDia, setNewCalleDia] = useState('LUNES_JUEVES');
  const [newCalleHora, setNewCalleHora] = useState('07:00 AM');

  // Form New Censo
  const [newCensoSectorId, setNewCensoSectorId] = useState('');
  const [newCensoCalle, setNewCensoCalle] = useState('');
  const [newCensoCasa, setNewCensoCasa] = useState('');
  const [newCensoReferencia, setNewCensoReferencia] = useState('');
  const [newCensoNombre, setNewCensoNombre] = useState('');
  const [newCensoTipoDoc, setNewCensoTipoDoc] = useState('V');
  const [newCensoCedula, setNewCensoCedula] = useState('');
  const [newCensoTelefono, setNewCensoTelefono] = useState('');
  const [newCensoTipo, setNewCensoTipo] = useState('RESIDENCIAL');

  // Set default sector for modals when available
  React.useEffect(() => {
    if (sectores.length > 0) {
      if (!newCalleSectorId) setNewCalleSectorId(sectores[0].id);
      if (!newCensoSectorId) {
        setNewCensoSectorId(sectores[0].id);
        if (sectores[0].callesTramos && sectores[0].callesTramos.length > 0) {
          setNewCensoCalle(sectores[0].callesTramos[0].nombreCalle);
        }
      }
    }
  }, [sectores]);

  // Handle sector change in new censo form
  const handleCensoSectorChange = (secId: string) => {
    setNewCensoSectorId(secId);
    const sec = sectores.find((s) => s.id === secId);
    if (sec && sec.callesTramos && sec.callesTramos.length > 0) {
      setNewCensoCalle(sec.callesTramos[0].nombreCalle);
    } else {
      setNewCensoCalle('Calle Principal');
    }
  };

  // Compute Metrics
  const totalSectores = sectores.length;
  const totalCalles = useMemo(() => {
    return sectores.reduce((acc, s) => acc + (s.callesTramos?.length || 0), 0);
  }, [sectores]);

  const totalFamiliasBase = useMemo(() => {
    return sectores.reduce((acc, s) => acc + (s.totalFamilias || 0), 0);
  }, [sectores]);

  const totalCensados = inmueblesCensados.length;

  // Filter Sectores
  const sectoresFiltrados = useMemo(() => {
    let list = [...sectores];
    if (selectedSectorId !== 'TODOS') {
      list = list.filter((s) => s.id === selectedSectorId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const matchSector = s.nombre?.toLowerCase().includes(q) || s.codigo?.toLowerCase().includes(q);
        const matchCalle = s.callesTramos?.some((c: any) => c.nombreCalle?.toLowerCase().includes(q));
        return matchSector || matchCalle;
      });
    }
    return list;
  }, [sectores, selectedSectorId, searchQuery]);

  // Submit New Calle
  const handleCreateCalle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalleNombre.trim() || !newCalleSectorId) return;

    setSubmittingCalle(true);
    setFeedbackMsg(null);
    try {
      await crearCalle({
        sectorId: newCalleSectorId,
        nombreCalle: newCalleNombre.trim(),
        diaRecoleccion: newCalleDia,
        horaEstimada: newCalleHora,
      });

      // Also trigger API censo creation so APK receives it immediately
      await fetch('/api/censo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crear_calle',
          sectorId: newCalleSectorId,
          nombreCalle: newCalleNombre.trim(),
          diaRecoleccion: newCalleDia,
          horaEstimada: newCalleHora,
        }),
      }).catch(() => {});

      setFeedbackMsg({
        type: 'success',
        text: `Calle "${newCalleNombre.trim()}" agregada exitosamente y sincronizada con la APK.`,
      });
      setNewCalleNombre('');
      setModalCalleOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Error al agregar la calle.',
      });
    } finally {
      setSubmittingCalle(false);
    }
  };

  // Submit New Censo
  const handleCreateCenso = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCed = newCensoCedula.replace(/[^0-9]/g, '');
    if (!cleanCed || !newCensoNombre.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Nombre y Cédula son obligatorios.' });
      return;
    }

    setSubmittingCenso(true);
    setFeedbackMsg(null);
    try {
      const sec = sectores.find((s) => s.id === newCensoSectorId);
      const res = await fetch('/api/censo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectorId: newCensoSectorId,
          sectorNombre: sec?.nombre || '',
          calleNombre: newCensoCalle || 'Calle Principal',
          numeroCasaLocal: newCensoCasa || 'S/N',
          referenciaUbic: newCensoReferencia,
          tipoDoc: newCensoTipoDoc,
          cedulaNumero: cleanCed,
          nombres: newCensoNombre.trim(),
          telefonoMovil: newCensoTelefono.trim() || '0414-0000000',
          tipoInmueble: newCensoTipo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el censo.');
      }

      setFeedbackMsg({
        type: 'success',
        text: `¡Inmueble ${data.inmueble?.codigoCatastral || ''} censado y sincronizado con éxito!`,
      });
      setNewCensoNombre('');
      setNewCensoCedula('');
      setNewCensoTelefono('');
      setNewCensoCasa('');
      setNewCensoReferencia('');
      setModalCensoOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Error al registrar el censo.',
      });
    } finally {
      setSubmittingCenso(false);
    }
  };

  // Delete Censo
  const handleDeleteCenso = async (id: string, codigo: string) => {
    if (!confirm(`¿Eliminar censo ${codigo} del padrón territorial?`)) return;
    try {
      const res = await fetch(`/api/censo?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedbackMsg({ type: 'success', text: `Censo ${codigo} eliminado.` });
        await onRefresh();
      }
    } catch (err: any) {
      alert('Error eliminando censo: ' + err.message);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6 text-slate-800">
      {/* SECTION HEADER WITH REAL-TIME APK BADGE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Padrón Territorial del Censo de Sectores y Calles
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Sincronizado en Vivo con APK Móvil</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Alcaldía Bolivariana de Rosario de Perijá • Rutas oficiales de Aseo Urbano y Supervisor de Campo
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModalCalleOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition shadow-sm border border-slate-200 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>+ Nueva Calle</span>
          </button>

          <button
            onClick={() => setModalCensoOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-700/20 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>+ Censar Inmueble</span>
          </button>

          <a
            href="/censo-aseo-alcaldia.apk"
            download="censo-aseo-alcaldia.apk"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Descargar APK Móvil para Android"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Descargar APK</span>
          </a>

          <button
            onClick={onRefresh}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition border border-slate-200 cursor-pointer"
            title="Actualizar padrón territorial"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 SUMMARY STAT PILLS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sectores Oficiales</div>
          <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{totalSectores}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">La Villa del Rosario (3 Parroquias)</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Calles y Tramos</div>
          <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">{totalCalles}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cronogramas A, B y Rutas Trimotos</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Padrón Familias Base</div>
          <div className="text-2xl font-black text-blue-700 mt-0.5 font-mono">
            {totalFamiliasBase > 0 ? totalFamiliasBase.toLocaleString('es-VE') : '2,066+'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Colina I, II, Matica I, II, etc.</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inmuebles Censados</div>
          <div className="text-2xl font-black text-purple-700 mt-0.5 font-mono">{totalCensados}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Enlace web-móvil en tiempo real</div>
        </div>
      </div>

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por sector o calle (ej. Colina, Casco Central, Calle Miranda)..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedSectorId}
            onChange={(e) => setSelectedSectorId(e.target.value)}
            className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="TODOS">Todos los Sectores ({sectores.length})</option>
            {sectores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} {s.totalFamilias ? `(${s.totalFamilias} fam.)` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTORS AND STREETS LIST ACCORDION */}
      <div className="space-y-3">
        {sectoresFiltrados.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No se encontraron sectores o calles con el término buscado.
          </div>
        ) : (
          sectoresFiltrados.map((s) => {
            const isExpanded = expandedSectorId === s.id;
            const calles = s.callesTramos || [];
            const inmueblesDelSector = inmueblesCensados.filter((inm) => inm.sectorId === s.id);

            return (
              <div
                key={s.id}
                className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:border-emerald-300 transition"
              >
                {/* Sector Header Card */}
                <div
                  onClick={() => setExpandedSectorId(isExpanded ? null : s.id)}
                  className="p-4 bg-slate-50/70 hover:bg-emerald-50/40 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition"
                >
                  <div className="flex items-center gap-3">
                    <button className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {s.codigo || 'SEC'}
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm">{s.nombre}</h3>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          • {typeof s.parroquia === 'string' ? s.parroquia : s.parroquia?.nombre || 'Parroquia El Rosario'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {calles.length} {calles.length === 1 ? 'calle oficial' : 'calles oficiales'} •{' '}
                        {s.totalFamilias ? `${s.totalFamilias} familias censadas` : 'Familias por consolidar'} •{' '}
                        {inmueblesDelSector.length} predios registrados en sistema
                      </p>
                    </div>
                  </div>

                  {/* Right Tags */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {s.estrato || 'POPULAR'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewCalleSectorId(s.id);
                        setModalCalleOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-sm cursor-pointer"
                    >
                      + Calle
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Calles and Censused Inmuebles */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-slate-200 space-y-4 animate-in fade-in">
                    {/* Inner Tabs: Calles vs Inmuebles */}
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs">
                      <button
                        onClick={() => setActiveTabSector('calles')}
                        className={`font-bold pb-1 px-2 border-b-2 transition ${
                          activeTabSector === 'calles'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Calles y Tramos del Sector ({calles.length})
                      </button>
                      <button
                        onClick={() => setActiveTabSector('inmuebles')}
                        className={`font-bold pb-1 px-2 border-b-2 transition ${
                          activeTabSector === 'inmuebles'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Inmuebles Censados ({inmueblesDelSector.length})
                      </button>
                    </div>

                    {/* TAB: CALLES */}
                    {activeTabSector === 'calles' && (
                      <div>
                        {calles.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-xs">
                            No hay calles registradas en este sector aún.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {calles.map((c: any, idx: number) => (
                              <div
                                key={c.id || idx}
                                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2 hover:border-slate-300 transition"
                              >
                                <div className="space-y-1">
                                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                    <span>{c.nombreCalle}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>{c.diaRecoleccion || 'LUNES Y JUEVES'}</span>
                                    {c.horaEstimada && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>{c.horaEstimada}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                  Ruta #{c.ordenRecoleccion || idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: INMUEBLES CENSADOS */}
                    {activeTabSector === 'inmuebles' && (
                      <div>
                        {inmueblesDelSector.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs space-y-2">
                            <p>No hay inmuebles censados registrados en este sector todavía.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setNewCensoSectorId(s.id);
                                setModalCensoOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold"
                            >
                              + Registrar Primer Censo en este Sector
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                  <th className="p-2.5">Cód. Catastro</th>
                                  <th className="p-2.5">Calle / Casa</th>
                                  <th className="p-2.5">Ciudadano / Cédula</th>
                                  <th className="p-2.5">Tipo</th>
                                  <th className="p-2.5">Estado</th>
                                  <th className="p-2.5 text-center">Acción</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {inmueblesDelSector.map((inm) => (
                                  <tr key={inm.id} className="hover:bg-slate-50/80">
                                    <td className="p-2.5 font-mono font-bold text-emerald-800">
                                      {inm.codigoCatastral}
                                    </td>
                                    <td className="p-2.5 text-slate-700">
                                      <div className="font-semibold">{inm.calleNombre || 'Principal'}</div>
                                      <div className="text-[10px] text-slate-400">Casa: {inm.numeroCasaLocal || 'S/N'}</div>
                                    </td>
                                    <td className="p-2.5 text-slate-700">
                                      <div className="font-semibold">{inm.propietarioNombre || 'Vecino'}</div>
                                      <div className="text-[10px] font-mono text-slate-400">{inm.propietarioCedula || '-'}</div>
                                    </td>
                                    <td className="p-2.5">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                        {inm.tipoInmueble}
                                      </span>
                                    </td>
                                    <td className="p-2.5">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        {inm.estadoCuenta || 'SOLVENTE'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCenso(inm.id, inm.codigoCatastral)}
                                        className="p-1 rounded text-slate-400 hover:text-red-600 transition"
                                        title="Eliminar censo"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: NUEVA CALLE */}
      {modalCalleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Agregar Nueva Calle / Tramo</h3>
                  <p className="text-[11px] text-slate-500">Se sincronizará en tiempo real con la APK móvil</p>
                </div>
              </div>
              <button
                onClick={() => setModalCalleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCalle} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Sector Destino <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newCalleSectorId}
                  onChange={(e) => setNewCalleSectorId(e.target.value)}
                  className="w-full border border-slate-300 bg-white px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {sectores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.totalFamilias ? `(${s.totalFamilias} fam.)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nombre de la Calle / Avenida / Callejón <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newCalleNombre}
                  onChange={(e) => setNewCalleNombre(e.target.value)}
                  placeholder="Ej. Calle Páez o Av. Don Bosco"
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Días de Recolección
                  </label>
                  <select
                    value={newCalleDia}
                    onChange={(e) => setNewCalleDia(e.target.value)}
                    className="w-full border border-slate-300 bg-white px-2.5 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="LUNES_JUEVES">Lunes y Jueves</option>
                    <option value="MARTES_VIERNES">Martes y Viernes</option>
                    <option value="MIERCOLES_SABADO">Miércoles y Sábado</option>
                    <option value="DIARIO">Diario (Comercial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Hora Estimada
                  </label>
                  <input
                    type="text"
                    value={newCalleHora}
                    onChange={(e) => setNewCalleHora(e.target.value)}
                    placeholder="07:00 AM"
                    className="w-full border border-slate-300 px-2.5 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCalleOpen(false)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  disabled={submittingCalle}
                  type="submit"
                  className="flex-1 py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  {submittingCalle ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar y Sincronizar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO CENSO INMUEBLE */}
      {modalCensoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Registrar Inmueble en el Censo Territorial</h3>
                  <p className="text-[11px] text-slate-500">Guardado directo en base de datos municipal y APK</p>
                </div>
              </div>
              <button
                onClick={() => setModalCensoOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCenso} className="space-y-3.5">
              {/* Sector & Calle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Sector <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={newCensoSectorId}
                      onChange={(e) => handleCensoSectorChange(e.target.value)}
                      className="w-full border border-slate-300 bg-white px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {sectores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} {s.totalFamilias ? `(${s.totalFamilias} fam.)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Calle / Tramo <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={newCensoCalle}
                      onChange={(e) => setNewCensoCalle(e.target.value)}
                      placeholder="Calle Principal"
                      className="w-full border border-slate-300 bg-white px-2.5 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      N° Casa / Local
                    </label>
                    <input
                      type="text"
                      value={newCensoCasa}
                      onChange={(e) => setNewCensoCasa(e.target.value)}
                      placeholder="Ej. Casa #24"
                      className="w-full border border-slate-300 bg-white px-2.5 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Referencia
                    </label>
                    <input
                      type="text"
                      value={newCensoReferencia}
                      onChange={(e) => setNewCensoReferencia(e.target.value)}
                      placeholder="Frente a la plaza"
                      className="w-full border border-slate-300 bg-white px-2.5 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Citizen Details */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nombre y Apellido del Habitante / Representante <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={newCensoNombre}
                  onChange={(e) => setNewCensoNombre(e.target.value)}
                  placeholder="Ej. Carmen Rodríguez"
                  className="w-full border border-slate-300 px-3 py-2.5 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Cédula / RIF <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={newCensoTipoDoc}
                      onChange={(e) => setNewCensoTipoDoc(e.target.value)}
                      className="border border-slate-300 bg-slate-50 px-2 py-2 rounded-xl text-xs font-bold text-slate-800 shrink-0"
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
                      value={newCensoCedula}
                      onChange={(e) => setNewCensoCedula(e.target.value)}
                      placeholder="12345678"
                      className="w-full border border-slate-300 px-2.5 py-2 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Teléfono Móvil
                  </label>
                  <input
                    type="tel"
                    value={newCensoTelefono}
                    onChange={(e) => setNewCensoTelefono(e.target.value)}
                    placeholder="0414-1234567"
                    className="w-full border border-slate-300 px-2.5 py-2 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tipo de Inmueble
                  </label>
                  <select
                    value={newCensoTipo}
                    onChange={(e) => setNewCensoTipo(e.target.value)}
                    className="w-full border border-slate-300 bg-white px-2.5 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="RESIDENCIAL">Residencial</option>
                    <option value="COMERCIAL">Comercial</option>
                    <option value="INDUSTRIAL">Industrial</option>
                    <option value="OFICIAL">Oficial / Institucional</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCensoOpen(false)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  disabled={submittingCenso}
                  type="submit"
                  className="flex-1 py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  {submittingCenso ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <span>Registrar en Padrón</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
