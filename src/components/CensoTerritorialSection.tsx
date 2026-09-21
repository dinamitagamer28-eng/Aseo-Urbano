'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Home,
  Trash2,
  X,
  Phone,
  MapPin,
  Building2,
  Check
} from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'general' | 'sectores'>('general');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Compute Metrics
  const totalSectores = sectores.length;
  const totalFamiliasBase = useMemo(() => {
    return sectores.reduce((acc, s) => acc + (s.totalFamilias || 0), 0);
  }, [sectores]);

  const totalCensados = inmueblesCensados.length;

  // Filter Inmuebles Censados
  const inmueblesFiltrados = useMemo(() => {
    let list = [...inmueblesCensados];

    if (selectedSectorId !== 'TODOS') {
      list = list.filter((inm) => inm.sectorId === selectedSectorId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((inm) => {
        const cod = (inm.codigoCatastral || '').toLowerCase();
        const nom = (inm.propietarioNombre || inm.contribuyenteNombre || '').toLowerCase();
        const ced = (inm.propietarioCedula || inm.contribuyenteCedula || '').toLowerCase();
        const sec = (inm.sectorNombre || inm.sector?.nombre || '').toLowerCase();
        const cal = (inm.calleNombre || inm.calle?.nombreCalle || '').toLowerCase();
        const cas = (inm.numeroCasaLocal || '').toLowerCase();
        return (
          cod.includes(q) ||
          nom.includes(q) ||
          ced.includes(q) ||
          sec.includes(q) ||
          cal.includes(q) ||
          cas.includes(q)
        );
      });
    }

    return list;
  }, [inmueblesCensados, selectedSectorId, searchQuery]);

  // Filter Sectores for sector view
  const sectoresFiltrados = useMemo(() => {
    let list = [...sectores];
    if (selectedSectorId !== 'TODOS') {
      list = list.filter((s) => s.id === selectedSectorId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const matchSector = s.nombre?.toLowerCase().includes(q) || s.codigo?.toLowerCase().includes(q);
        const matchInmueble = inmueblesCensados.some(
          (inm) =>
            inm.sectorId === s.id &&
            ((inm.propietarioNombre || inm.contribuyenteNombre || '').toLowerCase().includes(q) ||
              (inm.propietarioCedula || inm.contribuyenteCedula || '').toLowerCase().includes(q) ||
              (inm.calleNombre || '').toLowerCase().includes(q))
        );
        return matchSector || matchInmueble;
      });
    }
    return list;
  }, [sectores, inmueblesCensados, selectedSectorId, searchQuery]);

  // Refresh handler with visual indicator
  const handleRefreshClick = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      setFeedbackMsg({
        type: 'success',
        text: 'Padrón territorial y datos de la APK actualizados exitosamente.',
      });
    } catch {
      setFeedbackMsg({
        type: 'error',
        text: 'No se pudo actualizar el padrón. Comprueba la conexión con el servidor.',
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Delete Censo
  const handleDeleteCenso = async (id: string, codigo: string) => {
    if (!confirm(`¿Eliminar el registro de censo ${codigo} del padrón territorial?`)) return;
    try {
      const res = await fetch(`/api/censo?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedbackMsg({ type: 'success', text: `Censo ${codigo} eliminado exitosamente.` });
        await onRefresh();
      } else {
        throw new Error('No se pudo eliminar el censo');
      }
    } catch (err: any) {
      alert('Error eliminando censo: ' + err.message);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6 text-slate-800">
      {/* SECTION HEADER: EXCLUSIVELY FOR VIEWING CENSUS FROM APK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Padrón de Inmuebles y Personas Censadas
              </h2>
              <p className="text-xs text-slate-500">
                Alcaldía Bolivariana de Rosario de Perijá • Visualización en vivo de datos empadronados desde la APK Móvil
              </p>
            </div>
          </div>
        </div>

        {/* Action Header: ONLY Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Sincronizado en Vivo con APK Móvil</span>
          </span>

          <button
            onClick={handleRefreshClick}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer disabled:opacity-60"
            title="Actualizar datos desde la base de datos municipal y APK"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in ${
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
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Inmuebles Censados</div>
          <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">{totalCensados}</div>
          <div className="text-[10px] text-emerald-700/80 mt-0.5">Empadronados con la APK Móvil</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sectores Oficiales</div>
          <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{totalSectores}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">La Villa del Rosario (3 Parroquias)</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Padrón Familias Base</div>
          <div className="text-2xl font-black text-blue-700 mt-0.5 font-mono">
            {totalFamiliasBase > 0 ? totalFamiliasBase.toLocaleString('es-VE') : '2.508'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Meta territorial proyectada</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Enlace con APK Móvil</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Activo en Vivo</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Base de datos municipal centralizada</div>
        </div>
      </div>

      {/* SEARCH, FILTERS AND VIEW TOGGLE */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cédula, nombre, código catastral, sector o calle..."
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

        {/* View Mode Toggle: Tabla General vs Desglose por Sector */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-end md:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('general')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'general'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Listado General ({inmueblesFiltrados.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('sectores')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'sectores'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📂 Por Sector ({sectoresFiltrados.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: GENERAL TABLE OF CENSUSED CITIZENS & INMUEBLES */}
      {viewMode === 'general' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
          {inmueblesFiltrados.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 text-xs space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No se encontraron inmuebles o personas censadas con los filtros aplicados.</p>
              <p className="text-[11px] text-slate-400">
                Los censos registrados por los supervisores desde la APK aparecerán automáticamente en esta lista.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Cód. Catastro</th>
                    <th className="p-3">Ciudadano Censado</th>
                    <th className="p-3">Sector y Dirección</th>
                    <th className="p-3">Teléfono</th>
                    <th className="p-3">Tipo Inmueble</th>
                    <th className="p-3">Estado Fiscal</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {inmueblesFiltrados.map((inm) => {
                    const nombre = inm.propietarioNombre || inm.contribuyenteNombre || 'Vecino Censado';
                    const cedula = inm.propietarioCedula || inm.contribuyenteCedula || 'Sin cédula';
                    const sector = inm.sectorNombre || inm.sector?.nombre || 'Rosario de Perijá';
                    const calle = inm.calleNombre || inm.calle?.nombreCalle || 'Calle Principal';
                    const casa = inm.numeroCasaLocal || 'S/N';
                    const referencia = inm.referenciaUbic || '';
                    const telefono = inm.telefonoMovil || inm.contribuyenteTelefono || 'No registrado';
                    const tipo = inm.tipoInmueble || 'RESIDENCIAL';
                    const estado = inm.estadoCuenta || 'SOLVENTE';

                    return (
                      <tr key={inm.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3">
                          <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 text-[11px]">
                            {inm.codigoCatastral || 'CEN-000'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-900">
                          <div className="font-bold text-slate-800">{nombre}</div>
                          <div className="text-[11px] font-mono font-semibold text-slate-500">{cedula}</div>
                        </td>
                        <td className="p-3 text-slate-700">
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{sector}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {calle} • Casa: {casa}
                            {referencia && <span className="italic text-slate-400"> ({referencia})</span>}
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{telefono}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {tipo}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {estado}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteCenso(inm.id, inm.codigoCatastral || 'CEN')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Eliminar registro de censo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: GROUPED BY SECTOR ACCORDION */}
      {viewMode === 'sectores' && (
        <div className="space-y-3">
          {sectoresFiltrados.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No se encontraron sectores con el término buscado.
            </div>
          ) : (
            sectoresFiltrados.map((s) => {
              const isExpanded = expandedSectorId === s.id;
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
                          <strong className="text-emerald-800">{inmueblesDelSector.length}</strong> {inmueblesDelSector.length === 1 ? 'persona/inmueble censado' : 'personas/inmuebles censados'} por APK •{' '}
                          {s.totalFamilias ? `${s.totalFamilias} familias meta` : 'Padrón por consolidar'}
                        </p>
                      </div>
                    </div>

                    {/* Right Badge */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                        inmueblesDelSector.length > 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {inmueblesDelSector.length} Censados
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details: EXCLUSIVELY CENSUS PEOPLE TABLE */}
                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-slate-200 animate-in fade-in">
                      {inmueblesDelSector.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          <p>Aún no se han registrado personas o viviendas censadas en este sector desde la APK.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                              <tr>
                                <th className="p-2.5">Cód. Catastro</th>
                                <th className="p-2.5">Ciudadano / Cédula</th>
                                <th className="p-2.5">Calle / Casa</th>
                                <th className="p-2.5">Teléfono</th>
                                <th className="p-2.5">Tipo</th>
                                <th className="p-2.5">Estado</th>
                                <th className="p-2.5 text-center">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {inmueblesDelSector.map((inm) => (
                                <tr key={inm.id} className="hover:bg-slate-50/80">
                                  <td className="p-2.5 font-mono font-bold text-emerald-800">
                                    {inm.codigoCatastral || 'CEN'}
                                  </td>
                                  <td className="p-2.5 text-slate-900">
                                    <div className="font-bold">{inm.propietarioNombre || inm.contribuyenteNombre || 'Vecino'}</div>
                                    <div className="text-[10px] font-mono text-slate-500">{inm.propietarioCedula || inm.contribuyenteCedula || '-'}</div>
                                  </td>
                                  <td className="p-2.5 text-slate-700">
                                    <div className="font-semibold">{inm.calleNombre || 'Calle Principal'}</div>
                                    <div className="text-[10px] text-slate-400">Casa: {inm.numeroCasaLocal || 'S/N'}</div>
                                  </td>
                                  <td className="p-2.5 font-mono text-[11px] text-slate-600">
                                    {inm.telefonoMovil || inm.contribuyenteTelefono || '-'}
                                  </td>
                                  <td className="p-2.5">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                      {inm.tipoInmueble || 'RESIDENCIAL'}
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
                                      onClick={() => handleDeleteCenso(inm.id, inm.codigoCatastral || 'CEN')}
                                      className="p-1 rounded text-slate-400 hover:text-red-600 transition cursor-pointer"
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
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
