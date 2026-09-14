'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReceiptModal, { ReciboData } from '@/components/ReceiptModal';
import LeafletMap from '@/components/LeafletMap';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
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
  Loader2,
  Settings,
  LogOut,
  X,
  XCircle,
  Send,
  History,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CiudadanoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cedulaInput, setCedulaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contribuyenteData, setContribuyenteData] = useState<any>(null);
  const [tasaBcv, setTasaBcv] = useState<number>(832.49);
  const [activeTab, setActiveTab] = useState<'estado' | 'pago' | 'reportar' | 'mis-reportes'>('estado');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dynamic BCV fetch on mount
  useEffect(() => {
    fetch('/api/bcv')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.valorUsdBs) {
          setTasaBcv(data.valorUsdBs);
        }
      })
      .catch(() => {});
  }, []);

  // Authentication guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Payment Form States
  const [pagoSubmitting, setPagoSubmitting] = useState(false);
  const [metodoPago, setMetodoPago] = useState('PAGO_MOVIL');
  const [referencia, setReferencia] = useState('');
  const [bancoEmisor, setBancoEmisor] = useState('Banesco');
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);
  const [reciboModalData, setReciboModalData] = useState<ReciboData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Report Form States
  const [reporteSubmitting, setReporteSubmitting] = useState(false);
  const [tipoProblema, setTipoProblema] = useState('BASURA_ACUMULADA');
  const [descripcionReporte, setDescripcionReporte] = useState('');
  const [archivoReporte, setArchivoReporte] = useState<File | null>(null);
  const [reporteCoords, setReporteCoords] = useState<{ lat: number; lng: number }>({
    lat: 10.3180,
    lng: -72.3150,
  });
  const [reporteSuccess, setReporteSuccess] = useState<string | null>(null);
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [gpsDetectado, setGpsDetectado] = useState(false);

  // Dismissed Alert States
  const [reportesVistos, setReportesVistos] = useState<string[]>([]);
  const [pagosRechazadosDescartados, setPagosRechazadosDescartados] = useState<string[]>([]);

  useEffect(() => {
    try {
      const vistos = localStorage.getItem('reportes_rechazados_vistos');
      if (vistos) setReportesVistos(JSON.parse(vistos));
      const pagosDesc = localStorage.getItem('pagos_rechazados_descartados');
      if (pagosDesc) setPagosRechazadosDescartados(JSON.parse(pagosDesc));
    } catch (e) {}
  }, []);

  const handleMarcarReporteVisto = (reporteId: string) => {
    const updated = [...reportesVistos, reporteId];
    setReportesVistos(updated);
    try {
      localStorage.setItem('reportes_rechazados_vistos', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleDescartarAlertaPago = (reciboId: string) => {
    const updated = [...pagosRechazadosDescartados, reciboId];
    setPagosRechazadosDescartados(updated);
    try {
      localStorage.setItem('pagos_rechazados_descartados', JSON.stringify(updated));
    } catch (e) {}
  };

  const obtenerUbicacionGpsActual = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Tu dispositivo o navegador no soporta geolocalización GPS.');
      return;
    }
    setObteniendoGps(true);

    // Tier 1: Try High Accuracy GPS
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setReporteCoords({ lat, lng });
        setGpsDetectado(true);
        setObteniendoGps(false);
      },
      (err) => {
        console.warn('GPS High Accuracy fallo/timeout, intentando red móvil/WiFi:', err);
        // Tier 2: Fallback to standard/network geolocation
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setReporteCoords({ lat, lng });
            setGpsDetectado(true);
            setObteniendoGps(false);
          },
          (fallbackErr) => {
            console.error('GPS Fallback failed:', fallbackErr);
            setObteniendoGps(false);
            if (fallbackErr.code === 1) {
              alert('Permiso de GPS no concedido. Por favor autoriza el acceso a la ubicación en tu navegador o selecciona tu punto directamente en el mapa satelital.');
            } else {
              alert('No se pudo obtener la posición GPS automáticamente. Puedes pulsar directamente sobre el mapa satelital para fijar el lugar del reporte.');
            }
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const fetchContribuyente = async (cedula: string) => {
    if (!cedula) return;
    setLoading(true);
    try {
      const res = await consultarContribuyentePorCedula(cedula);
      setContribuyenteData(res.usuario);
      
      // Fetch dynamic BCV rate
      try {
        const bcvRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        const bcvData = await bcvRes.json();
        if (bcvData && bcvData.promedio) {
          setTasaBcv(bcvData.promedio);
        } else if (res.tasaBcv) {
          setTasaBcv(res.tasaBcv.valorUsdBs);
        }
      } catch (e) {
        if (res.tasaBcv) setTasaBcv(res.tasaBcv.valorUsdBs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      const userCed = (session?.user as any)?.cedula || '33891378';
      const c = userCed.replace(/^[VEJG]-?/, '');
      setCedulaInput(c);
      fetchContribuyente(c);
    }
  }, [session, status]);

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
      let urlComprobante = '';
      if (archivoComprobante) {
        const formData = new FormData();
        formData.append('file', archivoComprobante);
        formData.append('type', 'pagos');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        urlComprobante = uploadData.url;
      }

      const res = await registrarPagoCiudadano({
        inmuebleId: inmuebleVinculado.id,
        usuarioId: contribuyenteData.id,
        metodoPago,
        referenciaBancaria: referencia || 'PAGO-MOVIL-REF',
        bancoOrigen: bancoEmisor,
        capturaComprobanteUrl: urlComprobante,
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
      if (!archivoReporte) {
        throw new Error("Debes adjuntar una foto de la incidencia.");
      }

      let urlReporte = '';
      const formData = new FormData();
      formData.append('file', archivoReporte);
      formData.append('type', 'reportes');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      urlReporte = uploadData.url;

      const res = await crearReporteCiudadano({
        usuarioId: contribuyenteData.id,
        sectorId: inmuebleVinculado.sectorId,
        inmuebleId: inmuebleVinculado.id,
        tipoProblema,
        descripcion: descripcionReporte,
        latitud: reporteCoords.lat,
        longitud: reporteCoords.lng,
        fotoReporteUrl: urlReporte,
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
        {/* PWA Install Banner */}
        <PWAInstallPrompt />

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
            {contribuyenteData && (
              <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 text-sm font-semibold shadow-sm">
                <Settings className="w-4 h-4 text-sky-400" />
                Ajustes
              </button>
            )}
          </div>
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

            {/* Rejected Payment Notification Banner (Only if the latest receipt is still RECHAZADO and not yet corrected/dismissed) */}
            {(() => {
              const ultimoRecibo = inmuebleVinculado.recibos?.[0];
              const mostrarAlertaPagoRechazado =
                ultimoRecibo &&
                ultimoRecibo.estado === 'RECHAZADO' &&
                !pagosRechazadosDescartados.includes(ultimoRecibo.id);

              if (!mostrarAlertaPagoRechazado) return null;

              return (
                <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/60 border-2 border-red-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold text-xs uppercase tracking-wide">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Pago Rechazado por el Administrador
                        </div>
                        <button
                          onClick={() => handleDescartarAlertaPago(ultimoRecibo.id)}
                          className="text-xs text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                          title="Cerrar notificación"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-base font-bold text-white">
                        Tu reporte de pago reciente no fue aprobado en la conciliación bancaria
                      </h3>
                      <div className="bg-slate-950/90 p-3.5 rounded-xl border border-red-500/30 text-xs text-red-200 mt-2 space-y-1">
                        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                          <span>Ref: {ultimoRecibo.referenciaBancaria || 'N/A'}</span>
                          <span>Monto: Bs. {ultimoRecibo.montoTotalBs?.toFixed(2)}</span>
                        </div>
                        <span className="font-bold text-red-400 block uppercase tracking-wider text-[10px]">
                          Motivo / Mensaje del Administrador:
                        </span>
                        <p className="font-semibold text-sm leading-relaxed text-red-100 bg-red-950/40 p-2 rounded-lg border border-red-500/20">
                          {ultimoRecibo.observacionesFiscales || 'Referencia bancaria no encontrada o monto incorrecto.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => handleDescartarAlertaPago(ultimoRecibo.id)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition border border-slate-700"
                    >
                      <span>Entendido</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('pago')}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 transition flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Corregir y Enviar Nuevo Pago</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Rejected Incident Report Notification Banner with OK/Seen Option */}
            {(() => {
              const reportesRechazadosSinVer =
                contribuyenteData.reportesCreados?.filter(
                  (r: any) => r.estado === 'RECHAZADO' && !reportesVistos.includes(r.id)
                ) || [];

              if (reportesRechazadosSinVer.length === 0) return null;

              const repRechazado = reportesRechazadosSinVer[0];

              return (
                <div className="bg-gradient-to-r from-red-950/90 via-slate-900 to-amber-950/70 border-2 border-red-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold text-xs uppercase tracking-wide">
                          <XCircle className="w-3.5 h-3.5" />
                          Reporte de Incidencia Rechazado por la Cuadrilla
                        </div>
                        <button
                          onClick={() => handleMarcarReporteVisto(repRechazado.id)}
                          className="text-xs text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                          title="Cerrar notificación"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-base font-bold text-white">
                        La cuadrilla de campo desestimó tu reporte de recolección
                      </h3>
                      <div className="bg-slate-950/90 p-3.5 rounded-xl border border-red-500/30 text-xs text-red-200 mt-2 space-y-1">
                        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                          <span>Folio: {repRechazado.folioIncidencia}</span>
                          <span>Tipo: {repRechazado.tipoProblema?.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="font-bold text-red-400 block uppercase tracking-wider text-[10px]">
                          Motivo / Explicación de la Cuadrilla:
                        </span>
                        <p className="font-semibold text-sm leading-relaxed text-red-100 bg-red-950/40 p-2 rounded-lg border border-red-500/20">
                          {repRechazado.notasResolucion || 'Incidencia no procede según normativa de aseo domiciliario ordinario.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => handleMarcarReporteVisto(repRechazado.id)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 shadow-sm"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>OK, Entendido (Ya lo vi)</span>
                    </button>
                    <button
                      onClick={() => {
                        handleMarcarReporteVisto(repRechazado.id);
                        setActiveTab('reportar');
                      }}
                      className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/30 transition flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Corregir y Enviar Nuevo Reporte</span>
                    </button>
                  </div>
                </div>
              );
            })()}

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
                        Próximo paso estimado por tu calle ({inmuebleVinculado.calle?.nombreCalle || 'Calle Principal'}): <strong>Hoy 08:30 AM</strong>
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

                {/* Live Satellite Tracking Map (Sierra de Perijá & Truck Radar) */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-amber-400" />
                        Monitoreo Satelital GPS en Vivo • Rosario de Perijá
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Relieves de la Sierra de Perijá, geocerca de tu sector y seguimiento en tiempo real del camión de aseo.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Radar Activo
                    </span>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-slate-800">
                    <LeafletMap
                      center={[10.3180, -72.3150]}
                      zoom={16}
                      height="360px"
                      autoFollowTruck={true}
                      interactive={true}
                      polygons={[
                        {
                          id: 'poly-colinas',
                          name: 'Sector Las Colinas (Geocerca de Ruta Activa)',
                          color: '#0284c7',
                          coordinates: [
                            [10.3150, -72.3190],
                            [10.3150, -72.3110],
                            [10.3210, -72.3110],
                            [10.3210, -72.3190],
                            [10.3150, -72.3190],
                          ],
                        },
                      ]}
                      markers={[
                        {
                          id: 'truck-01',
                          lat: 10.3184,
                          lng: -72.3149,
                          title: 'Camión 01 Compactador',
                          description: 'Recolectando en Sector Las Colinas • En Servicio',
                          type: 'truck',
                        },
                        {
                          id: 'user-property',
                          lat: 10.3175,
                          lng: -72.3155,
                          title: `Tu Vivienda (${inmuebleVinculado?.numeroCasaLocal || 'Nº 12'})`,
                          description: `Sector ${inmuebleVinculado?.sector?.nombre || 'Las Colinas'} • Estado: ${estadoCuenta}`,
                          type: 'property',
                        },
                      ]}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 flex-wrap gap-2">
                    <span>💡 Usa el botón <strong>[ 🛰️ Seguir Camión ]</strong> para bloquear la cámara en el vehículo de aseo.</span>
                    <span className="text-amber-400 font-bold">Frecuencia: Lunes, Miércoles y Viernes</span>
                  </div>
                </div>

                {/* Recent Receipts List */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Tus Comprobantes Fiscales y Pagos Reportados
                  </h3>

                  {inmuebleVinculado.recibos && inmuebleVinculado.recibos.length > 0 ? (
                    <div className="space-y-3">
                      {inmuebleVinculado.recibos.map((recibo: any) => (
                        <div
                          key={recibo.id}
                          className={`bg-slate-950 p-4 rounded-2xl border transition-all ${
                            recibo.estado === 'RECHAZADO'
                              ? 'border-2 border-red-500/80 bg-red-950/15 shadow-lg shadow-red-950/20'
                              : recibo.estado === 'APROBADO'
                              ? 'border-emerald-500/40 bg-slate-950'
                              : 'border-2 border-amber-500/80 bg-amber-950/15 shadow-lg shadow-amber-950/20'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-sky-400 text-sm">
                                  {recibo.numeroReciboFiscal}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase flex items-center gap-1 ${
                                    recibo.estado === 'APROBADO'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                      : recibo.estado === 'RECHAZADO'
                                      ? 'bg-red-500/20 text-red-400 border-2 border-red-500 font-extrabold shadow-sm'
                                      : 'bg-amber-500/20 text-amber-300 border-2 border-amber-500 font-extrabold shadow-sm'
                                  }`}
                                >
                                  {recibo.estado === 'APROBADO' ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Aprobado</span>
                                    </>
                                  ) : recibo.estado === 'RECHAZADO' ? (
                                    <>
                                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                                      <span>Rechazado</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Pendiente por Validación</span>
                                    </>
                                  )}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {new Date(recibo.createdAt).toLocaleDateString('es-VE')} • Método: {recibo.metodoPago} • Ref: <strong className="text-slate-200 font-mono">{recibo.referenciaBancaria || 'Taquilla'}</strong>
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
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                  recibo.estado === 'RECHAZADO'
                                    ? 'bg-red-950/80 hover:bg-red-800 border-red-500/60 text-red-200'
                                    : recibo.estado === 'APROBADO'
                                    ? 'bg-slate-800 hover:bg-sky-600 border-slate-700 text-white'
                                    : 'bg-amber-950/80 hover:bg-amber-800 border-amber-500/60 text-amber-200'
                                }`}
                              >
                                Ver Recibo
                              </button>
                            </div>
                          </div>

                          {/* Admin rejection reason details */}
                          {recibo.estado === 'RECHAZADO' && (
                            <div className="mt-3 pt-2.5 border-t border-red-500/20 bg-red-950/30 p-3 rounded-xl">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1">
                                Motivo del Rechazo (Administrador):
                              </span>
                              <p className="text-xs text-red-200 font-medium italic">
                                "{recibo.observacionesFiscales || 'Comprobante no coincide con la conciliación bancaria.'}"
                              </p>
                              <div className="mt-2 text-right">
                                <button
                                  onClick={() => setActiveTab('pago')}
                                  className="text-xs text-red-300 hover:text-white underline font-bold"
                                >
                                  Corregir y reenviar pago →
                                </button>
                              </div>
                            </div>
                          )}
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
                              <option value="Banesco">0134 - Banesco</option>
                              <option value="Banco de Venezuela">0102 - Banco de Venezuela</option>
                              <option value="Venezolano de Credito">0104 - Banco Venezolano de Crédito</option>
                              <option value="Mercantil">0105 - Banco Mercantil</option>
                              <option value="Provincial">0108 - Banco Provincial</option>
                              <option value="Bancaribe">0114 - Bancaribe</option>
                              <option value="Exterior">0115 - Banco Exterior</option>
                              <option value="Caroni">0128 - Banco Caroní</option>
                              <option value="Plaza">0138 - Banco Plaza</option>
                              <option value="Fondo Comun">0151 - Fondo Común</option>
                              <option value="100% Banco">0156 - 100% Banco</option>
                              <option value="Del Sur">0157 - Del Sur</option>
                              <option value="Tesoro">0163 - Banco del Tesoro</option>
                              <option value="Agricola">0166 - Banco Agrícola</option>
                              <option value="Bancrecer">0168 - Bancrecer</option>
                              <option value="Mi Banco">0169 - Mi Banco</option>
                              <option value="Activo">0171 - Banco Activo</option>
                              <option value="Bancamiga">0172 - Bancamiga</option>
                              <option value="Banplus">0174 - Banplus</option>
                              <option value="Bicentenario">0175 - Banco Bicentenario</option>
                              <option value="Fuerza Armada">0177 - Banco de la Fuerza Armada</option>
                              <option value="BNC">0191 - BNC Nacional de Crédito</option>
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
                              minLength={6}
                              maxLength={6}
                              pattern="\d{6}"
                              title="Debe tener exactamente 6 dígitos"
                              value={referencia}
                              onChange={(e) => setReferencia(e.target.value.replace(/\D/g, ''))}
                              placeholder="Ej: 894512"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Captura del Comprobante (Opcional):
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setArchivoComprobante(e.target.files[0]);
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-sm text-white focus:outline-none focus:border-sky-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                          />
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
                      <p className="text-slate-400 mb-4">
                        Al completar la transferencia, registra tu pago ingresando el correo emisor en la referencia y carga el comprobante.
                      </p>
                      
                      <form onSubmit={handlePagar} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Correo de origen (Zelle):
                            </label>
                            <input
                              type="email"
                              required
                              value={referencia}
                              onChange={(e) => setReferencia(e.target.value)}
                              placeholder="ej: tu_correo@gmail.com"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Captura del Comprobante (Requerida):
                            </label>
                            <input
                              type="file"
                              required
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setArchivoComprobante(e.target.files[0]);
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-sm text-white focus:outline-none focus:border-purple-500 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={pagoSubmitting}
                          className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
                        >
                          <Sparkles className="w-5 h-5 text-purple-200" />
                          <span>{pagoSubmitting ? 'Procesando Recibo...' : 'Registrar Pago Zelle'}</span>
                        </button>
                      </form>
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
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        {archivoReporte ? (
                          <div className="w-24 h-24 rounded-xl border border-sky-500 overflow-hidden shrink-0">
                            <img src={URL.createObjectURL(archivoReporte)} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0">
                            <Camera className="w-8 h-8 text-slate-500" />
                          </div>
                        )}
                        <div className="space-y-2 text-xs w-full">
                          <p className="text-slate-400 text-xs">
                            Se requiere una foto clara para que la cuadrilla pueda ubicar y dimensionar la recolección.
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setArchivoReporte(e.target.files[0]);
                              }
                            }}
                            className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Coordinates and Leaflet Map */}
                    <div>
                      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                        <label className="block text-xs font-semibold text-slate-300">
                          Ubicación de la Incidencia (Mapa GPS):
                        </label>
                        <button
                          type="button"
                          onClick={obtenerUbicacionGpsActual}
                          disabled={obteniendoGps}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{obteniendoGps ? 'Detectando señal GPS...' : gpsDetectado ? '✓ Ubicación GPS Fijada' : '📍 Usar Mi Ubicación GPS Actual'}</span>
                        </button>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-slate-800">
                        <LeafletMap
                          center={[reporteCoords.lat, reporteCoords.lng]}
                          zoom={16}
                          height="220px"
                          interactive={true}
                          onMapClick={(lat, lng) => {
                            setReporteCoords({ lat, lng });
                            setGpsDetectado(true);
                          }}
                          markers={[
                            {
                              id: 'pin-reporte',
                              lat: reporteCoords.lat,
                              lng: reporteCoords.lng,
                              title: 'Ubicación de tu Reporte',
                              description: 'Posición georreferenciada enviada a la cuadrilla',
                              type: 'incident',
                            },
                          ]}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 flex-wrap gap-1">
                        <span>Coordenadas fijadas: <strong className="text-sky-400 font-mono">{reporteCoords.lat.toFixed(5)}, {reporteCoords.lng.toFixed(5)}</strong></span>
                        <span className="text-slate-500">Toca en el mapa si deseas ajustar la posición</span>
                      </div>
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
                              ) : rep.estado === 'RECHAZADO' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-xs font-bold">
                                  <XCircle className="w-4 h-4" />
                                  <span>REPORTE RECHAZADO</span>
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
                              ) : rep.estado === 'RECHAZADO' ? (
                                <div className="w-full h-28 bg-red-950/20 border border-dashed border-red-500/40 rounded-xl flex flex-col items-center justify-center text-center p-2 text-[11px] text-red-400 space-y-0.5">
                                  <XCircle className="w-5 h-5 text-red-400" />
                                  <span className="font-bold text-xs">Reporte Desestimado</span>
                                  <span className="text-[10px] text-slate-500">No procede recolección</span>
                                </div>
                              ) : (
                                <div className="w-full h-28 bg-slate-900 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-center p-2 text-[11px] text-slate-500">
                                  <span>En espera de foto de cuadrilla en campo...</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Rejection Details if rejected */}
                          {rep.estado === 'RECHAZADO' && (
                            <div className="mt-3 pt-2.5 border-t border-red-500/20 bg-red-950/30 p-3.5 rounded-xl space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block flex items-center gap-1.5">
                                <XCircle className="w-3.5 h-3.5" /> Motivo del Rechazo / Desestimación (Cuadrilla):
                              </span>
                              <p className="text-xs text-red-200 font-medium italic">
                                "{rep.notasResolucion || 'Incidencia no procede según las normas de recolección ordinaria.'}"
                              </p>
                              <div className="flex justify-between items-center pt-1.5 text-[11px] text-slate-400 flex-wrap gap-1">
                                <span>Si consideras que la situación persiste, puedes corregir y enviar un nuevo reporte.</span>
                                <button
                                  onClick={() => setActiveTab('reportar')}
                                  className="text-xs text-sky-400 hover:text-sky-300 font-bold underline"
                                >
                                  Crear nuevo reporte →
                                </button>
                              </div>
                            </div>
                          )}
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
        ) : loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            <span className="ml-3 text-slate-400 font-semibold">Cargando tus datos del inmueble...</span>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Consulta o Vincula tu Inmueble</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Ingresa tu Cédula de Identidad para ver tu estado de cuenta, realizar pagos digitales a tasa oficial BCV y reportar incidencias.
            </p>
            <form onSubmit={handleSearch} className="max-w-xs mx-auto flex gap-2">
              <input
                type="text"
                value={cedulaInput}
                onChange={(e) => setCedulaInput(e.target.value)}
                placeholder="Ej. 33891378"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-md shrink-0"
              >
                Cargar
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        recibo={reciboModalData}
      />

      {/* Settings Modal */}
      {isSettingsOpen && contribuyenteData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-sky-400" />
              Ajustes de Cuenta
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs text-slate-500 uppercase font-bold">Datos Personales</div>
                <div className="font-semibold text-slate-200">{contribuyenteData.nombres} {contribuyenteData.apellidos}</div>
                <div className="text-slate-400 text-sm">C.I / RIF: {contribuyenteData.tipoDoc}-{contribuyenteData.cedulaRif}</div>
                <div className="text-slate-400 text-sm">Correo: {contribuyenteData.email}</div>
              </div>
              
              {inmuebleVinculado && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-500 uppercase font-bold">Inmueble Vinculado</div>
                  <div className="text-slate-200 text-sm">{inmuebleVinculado.codigoCatastral}</div>
                  <div className="text-slate-400 text-sm">Sector: {inmuebleVinculado.sector?.nombre}</div>
                  <div className="text-slate-400 text-sm">Dirección: {inmuebleVinculado.direccionExacta || inmuebleVinculado.numeroCasaLocal}</div>
                </div>
              )}

              {(session?.user as any)?.rol === 'ADMIN' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                  <div className="text-xs text-emerald-400 uppercase font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Accesos de Administrador
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="/cuadrilla"
                      className="flex items-center justify-center gap-1.5 py-2 px-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-xs font-bold transition border border-amber-500/30 text-center"
                    >
                      <Truck className="w-3.5 h-3.5" /> App Cuadrilla
                    </a>
                    <a
                      href="/admin"
                      className="flex items-center justify-center gap-1.5 py-2 px-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 rounded-lg text-xs font-bold transition border border-emerald-500/30 text-center"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Panel Admin
                    </a>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white font-bold rounded-xl transition-colors border border-red-500/20"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
