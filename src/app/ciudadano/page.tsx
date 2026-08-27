'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ReceiptModal, { ReciboData } from '@/components/ReceiptModal';
import LeafletMap from '@/components/LeafletMap';
import {
  consultarContribuyentePorCedula,
  registrarPagoCiudadano,
  crearReporteCiudadano,
} from '@/lib/actions';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  Camera,
  Copy,
  Check,
  MapPin,
  FileText,
  Truck,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CiudadanoPage() {
  const [cedulaInput, setCedulaInput] = useState('18456789');
  const [loading, setLoading] = useState(false);
  const [contribuyenteData, setContribuyenteData] = useState<any>(null);
  const [tasaBcv, setTasaBcv] = useState<number>(65.40);
  const [activeTab, setActiveTab] = useState<'estado' | 'pago' | 'reportar' | 'mis-reportes'>('estado');

  // Payment Form States
  const [pagoSubmitting, setPagoSubmitting] = useState(false);
  const [metodoPago, setMetodoPago] = useState('PAGO_MOVIL');
  const [referencia, setReferencia] = useState('');
  const [bancoEmisor, setBancoEmisor] = useState('Banesco');
  const [reciboModalData, setReciboModalData] = useState<ReciboData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Report Form States
  const [reporteSubmitting, setReporteSubmitting] = useState(false);
  const [tipoProblema, setTipoProblema] = useState('BASURA_ACUMULADA');
  const [descripcionReporte, setDescripcionReporte] = useState('');
  const [fotoReporte, setFotoReporte] = useState('https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60');
  const [reporteCoords, setReporteCoords] = useState<{ lat: number; lng: number }>({
    lat: 10.3180,
    lng: -72.3150,
  });
  const [reporteSuccess, setReporteSuccess] = useState<string | null>(null);

  const fetchContribuyente = async (cedula: string) => {
    setLoading(true);
    try {
      const res = await consultarContribuyentePorCedula(cedula);
      setContribuyenteData(res.usuario);
      if (res.tasaBcv) {
        setTasaBcv(res.tasaBcv.valorUsdBs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContribuyente(cedulaInput);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (cedulaInput.trim()) {
      fetchContribuyente(cedulaInput);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Main property
  const inmuebleVinculado = contribuyenteData?.inmueblesRelacionados?.[0]?.inmueble;
  const tarifaUsd = inmuebleVinculado?.tarifaBaseUsd || 2.00;
  const montoTotalBs = Math.round(tarifaUsd * tasaBcv * 100) / 100;
  const estadoCuenta = inmuebleVinculado?.estadoCuenta || 'SOLVENTE';

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribuyenteData || !inmuebleVinculado) return;

    setPagoSubmitting(true);
    try {
      const res = await registrarPagoCiudadano({
        inmuebleId: inmuebleVinculado.id,
        usuarioId: contribuyenteData.id,
        metodoPago,
        referenciaBancaria: referencia || 'PAGO-MOVIL-REF',
        bancoOrigen: bancoEmisor,
        montoUsd: tarifaUsd,
      });

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        setReciboModalData({
          ...res.recibo,
          createdAt: res.recibo.createdAt.toString(),
        } as any);
        setIsReceiptOpen(true);
        setActiveTab('estado');
        fetchContribuyente(cedulaInput);
      }
    } catch (err) {
      alert('Error al registrar el pago');
    } finally {
      setPagoSubmitting(false);
    }
  };

  const handleCrearReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribuyenteData || !inmuebleVinculado) return;

    setReporteSubmitting(true);
    try {
      const res = await crearReporteCiudadano({
        usuarioId: contribuyenteData.id,
        sectorId: inmuebleVinculado.sectorId,
        inmuebleId: inmuebleVinculado.id,
        tipoProblema,
        descripcion: descripcionReporte,
        latitud: reporteCoords.lat,
        longitud: reporteCoords.lng,
        fotoReporteUrl: fotoReporte,
      });

      if (res.success) {
        setReporteSuccess(`¡Reporte registrado exitosamente con Folio ${res.reporte.folioIncidencia}!`);
        setDescripcionReporte('');
        fetchContribuyente(cedulaInput);
        setTimeout(() => {
          setActiveTab('mis-reportes');
          setReporteSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      alert(err.message || 'Error al enviar reporte');
    } finally {
      setReporteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar tasaBcv={tasaBcv} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Search Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-sky-400" />
                Portal del Contribuyente
              </h1>
              <p className="text-xs text-slate-400">
                Consulta tu solvencia, paga en Bolívares a tasa oficial BCV y reporta incidencias en tu sector.
              </p>
            </div>

            {/* Quick Demo Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Probar:</span>
              <button
                onClick={() => { setCedulaInput('18456789'); fetchContribuyente('18456789'); }}
                className="px-2 py-1 bg-slate-800 hover:bg-sky-600 hover:text-white rounded-lg border border-slate-700 text-sky-300 transition-colors"
              >
                Carlos (V-18456789)
              </button>
              <button
                onClick={() => { setCedulaInput('14234567'); fetchContribuyente('14234567'); }}
                className="px-2 py-1 bg-slate-800 hover:bg-sky-600 hover:text-white rounded-lg border border-slate-700 text-sky-300 transition-colors"
              >
                María (V-14234567)
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">V-</span>
              <input
                type="text"
                value={cedulaInput}
                onChange={(e) => setCedulaInput(e.target.value)}
                placeholder="Ingresa tu número de Cédula o RIF"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-sky-600/30 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Buscando...' : 'Consultar'}</span>
            </button>
          </form>
        </div>

        {contribuyenteData && inmuebleVinculado ? (
          <>
            {/* Citizen Property Card */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-sky-400 font-semibold uppercase tracking-wider">Inmueble Registrado</div>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {contribuyenteData.nombres} {contribuyenteData.apellidos}
                  </h2>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                      C.I: {contribuyenteData.tipoDoc}-{contribuyenteData.cedulaRif}
                    </span>
                    <span>•</span>
                    <span className="bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800">
                      Catastro: {inmuebleVinculado.codigoCatastral}
                    </span>
                  </div>
                </div>

                {/* Solvency Badge Traffic Light */}
                <div>
                  {estadoCuenta === 'SOLVENTE' ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 font-bold text-sm shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>INMUEBLE SOLVENTE</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 font-bold text-sm shadow-sm animate-pulse">
                      <AlertTriangle className="w-5 h-5" />
                      <span>MES PENDIENTE DE PAGO</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location and Schedule Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Sector Piloto:</span>
                  <strong className="text-slate-200 text-sm font-semibold">{inmuebleVinculado.sector?.nombre}</strong>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Dirección / Casa:</span>
                  <strong className="text-slate-200 text-sm font-semibold">
                    {inmuebleVinculado.calle?.nombreCalle} - {inmuebleVinculado.numeroCasaLocal}
                  </strong>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block">Cronograma de Aseo:</span>
                  <strong className="text-emerald-400 text-sm font-semibold">
                    {inmuebleVinculado.calle?.diaRecoleccion || 'LUNES Y JUEVES'} ({inmuebleVinculado.calle?.horaEstimada || '07:30 AM'})
                  </strong>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('estado')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeTab === 'estado'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Estado del Servicio</span>
              </button>

              <button
                onClick={() => setActiveTab('pago')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeTab === 'pago'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Pagar Aseo (Pago Móvil)</span>
              </button>

              <button
                onClick={() => setActiveTab('reportar')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeTab === 'reportar'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Reportar Falla / Bote</span>
              </button>

              <button
                onClick={() => setActiveTab('mis-reportes')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeTab === 'mis-reportes'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Mis Reportes ({contribuyenteData.reportesCreados?.length || 0})</span>
              </button>
            </div>

            {/* TAB CONTENT: Estado del Servicio */}
            {activeTab === 'estado' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Truck Status Alert */}
                <div className="bg-gradient-to-r from-sky-950 to-slate-900 border border-sky-600/40 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400 flex-shrink-0">
                      <Truck className="w-7 h-7 animate-bounce" />
                    </div>
                    <div>
                      <div className="text-xs text-sky-400 font-bold uppercase tracking-wider">Unidad en Ruta Hoy</div>
                      <h3 className="text-lg font-bold text-white">Camión 01 (Compactador) en Las Colinas</h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Próximo paso estimado por tu calle ({inmuebleVinculado.calle?.nombreCalle}): <strong>Hoy 08:30 AM</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('pago')}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors whitespace-nowrap"
                  >
                    Ver Cuenta & Pagar
                  </button>
                </div>

                {/* Recent Receipts List */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Tus Comprobantes Fiscales Emitidos
                  </h3>

                  {inmuebleVinculado.recibos && inmuebleVinculado.recibos.length > 0 ? (
                    <div className="space-y-2">
                      {inmuebleVinculado.recibos.map((recibo: any) => (
                        <div
                          key={recibo.id}
                          className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-slate-700 transition-colors"
                        >
                          <div>
                            <div className="font-mono font-bold text-sky-400 text-sm">
                              {recibo.numeroReciboFiscal}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {new Date(recibo.createdAt).toLocaleDateString('es-VE')} • Método: {recibo.metodoPago} • Ref: {recibo.referenciaBancaria || 'Taquilla'}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 justify-between sm:justify-end">
                            <div className="text-right">
                              <div className="font-bold text-emerald-400 font-mono text-sm">
                                Bs. {recibo.montoTotalBs.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                (${recibo.montoTotalUsd.toFixed(2)} USD)
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setReciboModalData({
                                  ...recibo,
                                  usuario: contribuyenteData,
                                  inmueble: inmuebleVinculado,
                                  createdAt: recibo.createdAt.toString(),
                                });
                                setIsReceiptOpen(true);
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                            >
                              Ver Recibo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No posees comprobantes anteriores registrados.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Pasarela de Pago Multimoneda con Tasa BCV */}
            {activeTab === 'pago' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Dynamic Dual Calculator */}
                <div className="bg-gradient-to-br from-sky-950 via-slate-900 to-slate-900 border border-sky-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-2 border-b border-sky-800/40 pb-3">
                    <div>
                      <span className="text-xs text-sky-400 font-semibold uppercase">Liquidación Oficial del Mes</span>
                      <h3 className="text-xl font-extrabold text-white">Tasa de Aseo Urbano - Sector {inmuebleVinculado.sector?.nombre}</h3>
                    </div>
                    <div className="bg-sky-900/60 px-3 py-1 rounded-full border border-sky-600/40 text-xs font-bold text-sky-200">
                      Tasa BCV del día: Bs. {tasaBcv.toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                      <span className="text-xs text-slate-400">Tarifa Base fijada en Ordenanza:</span>
                      <div className="text-3xl font-black text-white font-mono mt-1">${tarifaUsd.toFixed(2)} <span className="text-sm text-slate-400 font-normal">USD</span></div>
                      <span className="text-[11px] text-slate-500">Tarifa Residencial {inmuebleVinculado.sector?.nombre}</span>
                    </div>

                    <div className="bg-sky-900/40 p-4 rounded-2xl border border-sky-600/40">
                      <span className="text-xs text-sky-300">TOTAL A LIQUIDAR EN BOLÍVARES:</span>
                      <div className="text-3xl font-black text-amber-400 font-mono mt-1">Bs. {montoTotalBs.toFixed(2)}</div>
                      <span className="text-[11px] text-slate-300">Equivalente exacto a tasa oficial de hoy</span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-sky-400" />
                    Selecciona tu Método de Pago
                  </h3>

                  {/* Method Selector Tabs */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodoPago('PAGO_MOVIL')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        metodoPago === 'PAGO_MOVIL'
                          ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      📲 Pago Móvil
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago('ZELLE')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        metodoPago === 'ZELLE'
                          ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      💵 Zelle
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago('TAQUILLA')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        metodoPago === 'TAQUILLA'
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      🏢 Taquilla Alcaldía
                    </button>
                  </div>

                  {/* Pago Movil Details */}
                  {metodoPago === 'PAGO_MOVIL' && (
                    <div className="space-y-4">
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                        <div className="text-xs font-bold text-sky-400 uppercase">Datos Oficiales para Pago Móvil</div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <div>
                              <span className="text-slate-500 block text-[10px]">Banco Receptor:</span>
                              <strong className="text-slate-200">0102 - Banco de Venezuela</strong>
                            </div>
                            <button
                              onClick={() => copyToClipboard('0102', 'banco')}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sky-400"
                              title="Copiar"
                            >
                              {copiedField === 'banco' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <div>
                              <span className="text-slate-500 block text-[10px]">RIF de la Alcaldía:</span>
                              <strong className="text-slate-200">G-2004984-7</strong>
                            </div>
                            <button
                              onClick={() => copyToClipboard('G20049847', 'rif')}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sky-400"
                              title="Copiar"
                            >
                              {copiedField === 'rif' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            <div>
                              <span className="text-slate-500 block text-[10px]">Teléfono Pago Móvil:</span>
                              <strong className="text-slate-200">0414-6000000</strong>
                            </div>
                            <button
                              onClick={() => copyToClipboard('04146000000', 'telefono')}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sky-400"
                              title="Copiar"
                            >
                              {copiedField === 'telefono' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-sky-600/40">
                            <div>
                              <span className="text-sky-400 block text-[10px] font-bold">Monto Exacto a Transferir:</span>
                              <strong className="text-amber-400 font-mono font-extrabold text-sm">Bs. {montoTotalBs.toFixed(2)}</strong>
                            </div>
                            <button
                              onClick={() => copyToClipboard(montoTotalBs.toFixed(2), 'monto')}
                              className="p-1.5 bg-sky-900 hover:bg-sky-800 rounded-lg text-amber-400"
                              title="Copiar"
                            >
                              {copiedField === 'monto' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Payment Registration Form */}
                      <form onSubmit={handlePagar} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Banco de donde pagaste:
                            </label>
                            <select
                              value={bancoEmisor}
                              onChange={(e) => setBancoEmisor(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500"
                            >
                              <option value="Banesco">Banesco</option>
                              <option value="Banco de Venezuela">Banco de Venezuela</option>
                              <option value="Mercantil">Banco Mercantil</option>
                              <option value="Provincial">BBVA Provincial</option>
                              <option value="BOD / BNC">BNC Banco Nacional de Crédito</option>
                              <option value="Bancaribe">Bancaribe</option>
                              <option value="Otro">Otro Banco Nacional</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Número de Referencia (Últimos 6 dígitos):
                            </label>
                            <input
                              type="text"
                              required
                              value={referencia}
                              onChange={(e) => setReferencia(e.target.value)}
                              placeholder="Ej: 894512"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={pagoSubmitting}
                          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
                        >
                          <Sparkles className="w-5 h-5 text-amber-300" />
                          <span>{pagoSubmitting ? 'Procesando Recibo...' : 'Registrar Pago y Emitir Recibo Digital'}</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {metodoPago === 'ZELLE' && (
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                      <div className="font-bold text-purple-400 uppercase">Instrucciones de Pago por Zelle</div>
                      <p className="text-slate-300">
                        Envía <strong>${tarifaUsd.toFixed(2)} USD</strong> a la cuenta autorizada de la Alcaldía:
                      </p>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                        <div><strong>Correo:</strong> tesoreria@rosariodeperija.gob.ve</div>
                        <div><strong>Titular:</strong> Alcaldía Bolivariana Rosario de Perijá</div>
                      </div>
                      <p className="text-slate-400">
                        Al completar la transferencia, registra tu pago ingresando el correo emisor en la referencia.
                      </p>
                    </div>
                  )}

                  {metodoPago === 'TAQUILLA' && (
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                      <div className="font-bold text-emerald-400 uppercase">Pago Presencial en Taquilla Municipal</div>
                      <p className="text-slate-300">
                        Acércate a la taquilla de recaudación de la Alcaldía (Plaza Bolívar) e indica tu número de Cédula: <strong>{contribuyenteData.cedulaRif}</strong> o Código Catastral: <strong>{inmuebleVinculado.codigoCatastral}</strong>.
                      </p>
                      <p className="text-slate-400">
                        Aceptamos Efectivo en Bolívares, Divisas ($) y Punto de Venta con emisión instantánea de recibo fiscal impreso.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Reportar Falla con Foto y Coordenadas */}
            {activeTab === 'reportar' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Camera className="w-6 h-6 text-sky-400" />
                      Reportar Incidencia o Falla en tu Calle
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Envía un reporte directo a la cuadrilla de recolección de Las Colinas con fotografía georreferenciada.
                    </p>
                  </div>

                  {reporteSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{reporteSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleCrearReporte} className="space-y-5">
                    {/* Category Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Tipo de Problema:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {[
                          { id: 'BASURA_ACUMULADA', label: '🗑️ Basura Acumulada' },
                          { id: 'CAMION_NO_PASO', label: '🚛 Camión no Pasó' },
                          { id: 'PODA_ESCOMBROS', label: '🌿 Poda / Escombros' },
                          { id: 'ANIMAL_MUERTO', label: '⚠️ Animal Muerto' },
                          { id: 'CONTENEDOR_LLENO', label: '📦 Contenedor Lleno' },
                          { id: 'OTRO', label: '📝 Otro Reclamo' },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setTipoProblema(cat.id)}
                            className={`p-3 rounded-xl border text-left font-bold transition-all ${
                              tipoProblema === cat.id
                                ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Photo Upload & Preview (Mandatory) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Foto Obligatoria del Problema:
                      </label>
                      <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <img
                          src={fotoReporte}
                          alt="Foto del problema"
                          className="w-24 h-24 rounded-xl object-cover border border-slate-700"
                        />
                        <div className="space-y-2 text-xs">
                          <p className="text-slate-400 text-xs">
                            Se requiere una foto clara para que la cuadrilla pueda ubicar y dimensionar la recolección.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFotoReporte('https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60')}
                              className="px-3 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700"
                            >
                              Foto 1 (Basura)
                            </button>
                            <button
                              type="button"
                              onClick={() => setFotoReporte('https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=600&auto=format&fit=crop&q=60')}
                              className="px-3 py-1 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700"
                            >
                              Foto 2 (Poda)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coordinates and Leaflet Map */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Ubicación en el Mapa (Sector Las Colinas):
                      </label>
                      <div className="rounded-2xl overflow-hidden border border-slate-800">
                        <LeafletMap
                          center={[reporteCoords.lat, reporteCoords.lng]}
                          zoom={16}
                          height="220px"
                          interactive={true}
                          onMapClick={(lat, lng) => setReporteCoords({ lat, lng })}
                          markers={[
                            {
                              id: 'pin-reporte',
                              lat: reporteCoords.lat,
                              lng: reporteCoords.lng,
                              title: 'Ubicación de tu Reporte',
                              description: 'Haz clic en el mapa para ajustar la posición exacta',
                              type: 'incident',
                            },
                          ]}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Coordenadas fijadas: {reporteCoords.lat.toFixed(4)}, {reporteCoords.lng.toFixed(4)}
                      </span>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Descripción o Puntos de Referencia:
                      </label>
                      <textarea
                        rows={2}
                        value={descripcionReporte}
                        onChange={(e) => setDescripcionReporte(e.target.value)}
                        placeholder="Ej: Bolsas acumuladas frente al árbol de mango en la esquina."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={reporteSubmitting}
                      className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2 transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      <span>{reporteSubmitting ? 'Enviando Reporte...' : 'Enviar Reporte a la Cuadrilla'}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Mis Reportes & Seguimiento en Vivo */}
            {activeTab === 'mis-reportes' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-sky-400" />
                    Historial de Reportes y Estado en Tiempo Real
                  </h3>

                  {contribuyenteData.reportesCreados && contribuyenteData.reportesCreados.length > 0 ? (
                    <div className="space-y-4">
                      {contribuyenteData.reportesCreados.map((rep: any) => (
                        <div
                          key={rep.id}
                          className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3"
                        >
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <div className="font-mono font-bold text-sky-400 text-sm">
                                {rep.folioIncidencia}
                              </div>
                              <h4 className="font-semibold text-white text-sm mt-0.5">
                                {rep.tipoProblema.replace('_', ' ')}
                              </h4>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {rep.descripcion || 'Sin descripción adicional'}
                              </p>
                            </div>

                            {/* Stepper Status */}
                            <div>
                              {rep.estado === 'RESUELTO' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>RESUELTO CON FOTO</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-full text-xs font-bold animate-pulse">
                                  <Clock className="w-4 h-4" />
                                  <span>EN PROCESO / CUADRILLA</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Photos Comparison Before vs After */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                            <div>
                              <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                                📸 Tu Foto Inicial:
                              </span>
                              <img
                                src={rep.fotoReporteUrl}
                                alt="Foto inicial"
                                className="w-full h-28 object-cover rounded-xl border border-slate-800"
                              />
                            </div>

                            <div>
                              <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                                🟢 Foto Evidencia Cuadrilla:
                              </span>
                              {rep.fotoResolucionUrl ? (
                                <img
                                  src={rep.fotoResolucionUrl}
                                  alt="Evidencia resolución"
                                  className="w-full h-28 object-cover rounded-xl border border-emerald-500/40"
                                />
                              ) : (
                                <div className="w-full h-28 bg-slate-900 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-center p-2 text-[11px] text-slate-500">
                                  <span>En espera de foto de cuadrilla en campo...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No has realizado reportes de incidencias.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-sm">
            Ingresa tu número de Cédula o RIF en el buscador superior para consultar tu inmueble.
          </div>
        )}
      </main>

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        recibo={reciboModalData}
      />
    </div>
  );
}
