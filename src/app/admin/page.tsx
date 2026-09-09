'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LeafletMap from '@/components/LeafletMap';
import ReceiptModal, { ReciboData } from '@/components/ReceiptModal';
import {
  liquidarCobroTaquillaExpress,
  validarPagoDigital,
  obtenerRecibosAdmin,
  obtenerReportesCuadrilla,
  obtenerTodosSectoresConTarifas,
  actualizarTarifaDeSector,
} from '@/lib/actions';
import {
  ShieldCheck,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Truck,
  Users,
  MapPin,
  Settings,
  Layers,
  Download,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Eye,
  Edit3,
  ExternalLink,
  Check,
  X,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'kpis' | 'taquilla' | 'auditoria' | 'validar' | 'tarifas' | 'mapa'>('kpis');
  const [tasaBcv, setTasaBcv] = useState(0);
  const [loadingData, setLoadingData] = useState(false);

  // Security guard
  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && (session?.user as any)?.rol !== 'ADMIN')) {
      router.push('/login');
    }
  }, [status, session, router]);

  // Load BCV Rate
  useEffect(() => {
    fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.promedio) setTasaBcv(data.promedio);
      })
      .catch((err) => console.error('Error tasa:', err));
  }, []);

  // Real Database States
  const [recibosFiscales, setRecibosFiscales] = useState<any[]>([]);
  const [sectoresTarifas, setSectoresTarifas] = useState<any[]>([]);
  const [reportesIncidencias, setReportesIncidencias] = useState<any[]>([]);

  // Taquilla Cashier State
  const [taquillaCedula, setTaquillaCedula] = useState('');
  const [taquillaNombre, setTaquillaNombre] = useState('');
  const [taquillaSectorId, setTaquillaSectorId] = useState('');
  const [taquillaUbicacion, setTaquillaUbicacion] = useState('');
  const [metodoTaquilla, setMetodoTaquilla] = useState('PUNTO_VENTA');
  const [montoTaquillaUsd, setMontoTaquillaUsd] = useState(3.0);
  const [taquillaProcessing, setTaquillaProcessing] = useState(false);

  // Receipt Modal State
  const [reciboEmitido, setReciboEmitido] = useState<ReciboData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Proof Screenshot Modal State
  const [comprobanteModalUrl, setComprobanteModalUrl] = useState<string | null>(null);

  // Tariff Edit Modal State
  const [editingTarifaSector, setEditingTarifaSector] = useState<any | null>(null);
  const [nuevoMontoTarifa, setNuevoMontoTarifa] = useState<number>(3.0);
  const [nuevaDescTarifa, setNuevaDescTarifa] = useState<string>('');
  const [guardandoTarifa, setGuardandoTarifa] = useState(false);

  // Search & Filter States
  const [searchAuditoria, setSearchAuditoria] = useState('');
  const [filtroEstadoAuditoria, setFiltroEstadoAuditoria] = useState('TODOS');
  const [searchTarifas, setSearchTarifas] = useState('');
  const [filtroValidar, setFiltroValidar] = useState<'PENDIENTES' | 'APROBADOS' | 'RECHAZADOS' | 'TODOS'>('PENDIENTES');
  const [filtroMapa, setFiltroMapa] = useState<'TODOS' | 'RECIBIDO' | 'RESUELTO'>('TODOS');

  // Load All Data from DB
  const cargarDatosCompletos = async () => {
    setLoadingData(true);
    try {
      const [recibos, sectores, reportes] = await Promise.all([
        obtenerRecibosAdmin(),
        obtenerTodosSectoresConTarifas(),
        obtenerReportesCuadrilla(),
      ]);

      const mappedRecibos = recibos.map((r: any) => ({
        id: r.id,
        folioCorrelativo: r.folioCorrelativo,
        numeroReciboFiscal: r.numeroReciboFiscal,
        fecha: new Date(r.createdAt).toLocaleString('es-VE'),
        cedula: r.usuario?.cedulaRif || 'N/A',
        contribuyente: `${r.usuario?.nombres || ''} ${r.usuario?.apellidos || ''}`.trim() || 'Vecino',
        inmueble: r.inmueble?.codigoCatastral || 'N/A',
        sector: r.inmueble?.sector?.nombre || 'Rosario de Perijá',
        montoUsd: r.montoTotalUsd,
        tasaBcv: r.tasaBcvAplicada,
        montoBs: r.montoTotalBs,
        metodo: r.metodoPago,
        estado: r.estado,
        origen: r.origenPago,
        referencia: r.referenciaBancaria,
        comprobanteUrl: r.capturaComprobanteUrl,
        codigoQrHash: r.codigoQrHash,
        observacionesFiscales: r.observacionesFiscales,
        createdAt: r.createdAt,
        rawUsuario: r.usuario,
        rawInmueble: r.inmueble,
      }));

      setRecibosFiscales(mappedRecibos);
      setSectoresTarifas(sectores);
      setReportesIncidencias(reportes);

      if (sectores.length > 0 && !taquillaSectorId) {
        setTaquillaSectorId(sectores[0].id);
      }
    } catch (e) {
      console.error('Error cargando datos administrativos:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.rol === 'ADMIN') {
      cargarDatosCompletos();
    }
  }, [status, session]);

  // Taquilla Cashier Action with Real DB Liquidation
  const handleCobroTaquilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taquillaCedula.trim()) {
      alert('Por favor ingresa la Cédula o RIF del contribuyente.');
      return;
    }

    setTaquillaProcessing(true);
    try {
      const res = await liquidarCobroTaquillaExpress({
        cedulaRif: taquillaCedula,
        nombres: taquillaNombre.trim() || undefined,
        sectorId: taquillaSectorId || undefined,
        ubicacion: taquillaUbicacion.trim() || undefined,
        montoUsd: montoTaquillaUsd,
        metodoPago: metodoTaquilla,
        cajeroId: (session?.user as any)?.id || 'admin',
        referenciaBancaria: `TAQ-${Date.now().toString().slice(-6)}`,
        observaciones: `Cobro en Taquilla Municipal. Cajero: ${(session?.user as any)?.name || 'Admin'}`,
      });

      if (res.success && res.recibo) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });

        const nuevoReciboParaModal: ReciboData = {
          id: res.recibo.id,
          folioCorrelativo: res.recibo.folioCorrelativo,
          numeroReciboFiscal: res.recibo.numeroReciboFiscal,
          montoTotalUsd: res.recibo.montoTotalUsd,
          tasaBcvAplicada: res.recibo.tasaBcvAplicada,
          montoTotalBs: res.recibo.montoTotalBs,
          metodoPago: res.recibo.metodoPago,
          referenciaBancaria: res.recibo.referenciaBancaria || 'TAQUILLA-DIRECTO',
          estado: res.recibo.estado || 'APROBADO',
          codigoQrHash: res.recibo.codigoQrHash,
          createdAt: res.recibo.createdAt,
          usuario: {
            nombres: res.recibo.usuario.nombres,
            apellidos: res.recibo.usuario.apellidos || '',
            tipoDoc: res.recibo.usuario.tipoDoc,
            cedulaRif: res.recibo.usuario.cedulaRif,
          },
          inmueble: {
            codigoCatastral: res.recibo.inmueble.codigoCatastral,
            numeroCasaLocal: res.recibo.inmueble.numeroCasaLocal,
            sector: {
              nombre: res.recibo.inmueble.sector.nombre,
            },
          },
        };

        setReciboEmitido(nuevoReciboParaModal);
        setIsReceiptOpen(true);

        // Reset Taquilla form
        setTaquillaCedula('');
        setTaquillaNombre('');
        setTaquillaUbicacion('');
        setMontoTaquillaUsd(3.0);

        // Reload updated DB state
        await cargarDatosCompletos();
      }
    } catch (err: any) {
      console.error('Error al liquidar en taquilla:', err);
      alert(`Error al procesar cobro en taquilla: ${err?.message || 'Error desconocido'}`);
    } finally {
      setTaquillaProcessing(false);
    }
  };

  // Open any existing receipt in receipt modal
  const handleVerReciboModal = (r: any) => {
    const dataModal: ReciboData = {
      id: r.id,
      folioCorrelativo: r.folioCorrelativo,
      numeroReciboFiscal: r.numeroReciboFiscal,
      montoTotalUsd: r.montoUsd,
      tasaBcvAplicada: r.tasaBcv,
      montoTotalBs: r.montoBs,
      metodoPago: r.metodo,
      referenciaBancaria: r.referencia || 'N/A',
      estado: r.estado || 'APROBADO',
      codigoQrHash: r.codigoQrHash || `QR-${r.numeroReciboFiscal}`,
      createdAt: r.createdAt,
      usuario: {
        nombres: r.contribuyente,
        apellidos: '',
        tipoDoc: r.cedula.substring(0, 1),
        cedulaRif: r.cedula,
      },
      inmueble: {
        codigoCatastral: r.inmueble,
        numeroCasaLocal: r.rawInmueble?.numeroCasaLocal || 'Inmueble Registrado',
        sector: {
          nombre: r.sector,
        },
      },
    };
    setReciboEmitido(dataModal);
    setIsReceiptOpen(true);
  };

  // Validate Digital Citizen Payments
  const handleValidarPago = async (id: string, aprobar: boolean) => {
    let motivo: string | undefined = undefined;
    if (!aprobar) {
      const resp = prompt('Ingrese el motivo del rechazo del pago (ej. Referencia no encontrada / Monto incorrecto):');
      if (resp === null) return;
      motivo = resp.trim() || 'Comprobante no coincide con la conciliación bancaria.';
    }

    try {
      const adminId = (session?.user as any)?.id || 'admin';
      await validarPagoDigital(id, adminId, aprobar, motivo);
      setRecibosFiscales((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: aprobar ? 'APROBADO' : 'RECHAZADO' } : r))
      );
      alert(aprobar ? '✅ Pago digital aprobado con éxito.' : '❌ Pago digital rechazado.');
    } catch (e: any) {
      alert(`Error al validar: ${e?.message || 'Error desconocido'}`);
    }
  };

  // Save Sector Tariff to DB
  const handleGuardarTarifaSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarifaSector) return;
    setGuardandoTarifa(true);
    try {
      await actualizarTarifaDeSector(editingTarifaSector.id, nuevoMontoTarifa, nuevaDescTarifa);
      setSectoresTarifas((prev) =>
        prev.map((s) =>
          s.id === editingTarifaSector.id
            ? { ...s, tarifaUsd: nuevoMontoTarifa, descripcion: nuevaDescTarifa }
            : s
        )
      );
      setEditingTarifaSector(null);
      alert('✅ Tarifa del sector actualizada exitosamente.');
    } catch (e: any) {
      alert(`Error al guardar tarifa: ${e?.message || 'Error desconocido'}`);
    } finally {
      setGuardandoTarifa(false);
    }
  };

  // Export to Excel for Contraloría Municipal
  const exportarExcelContraloria = () => {
    const dataFormatted = recibosFiscales.map((r) => ({
      'Folio Correlativo': r.folioCorrelativo,
      'Número Recibo Fiscal': r.numeroReciboFiscal,
      'Fecha y Hora': r.fecha,
      'Cédula / RIF': r.cedula,
      'Contribuyente': r.contribuyente,
      'Inmueble / Catastro': r.inmueble,
      'Sector': r.sector,
      'Tarifa Base ($ USD)': r.montoUsd,
      'Tasa BCV Aplicada': r.tasaBcv,
      'Total Cobrado (Bs.)': r.montoBs,
      'Forma de Pago': r.metodo,
      'Nº Referencia': r.referencia,
      'Origen de Cobro': r.origen,
      'Estado Fiscal': r.estado,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataFormatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Libro Ingresos Aseo');
    XLSX.writeFile(workbook, `Libro_Fiscal_Aseo_Contraloria_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF for Contraloría
  const exportarPdfContraloria = () => {
    const doc = new jsPDF('landscape');
    doc.setFillColor(2, 132, 199);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ALCALDÍA DEL MUNICIPIO ROSARIO DE PERIJÁ — CONTRALORÍA MUNICIPAL', 148, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('LIBRO DIARIO DE RECAUDACIÓN CORRELATIVA DE ASEO URBANO 2026', 148, 17, { align: 'center' });

    autoTable(doc, {
      startY: 28,
      head: [['Folio', 'Nº Recibo', 'Fecha', 'Cédula/RIF', 'Contribuyente', 'Sector', 'Tarifa $', 'Tasa BCV', 'Monto Bs.', 'Método', 'Estado']],
      body: recibosFiscales.map((r) => [
        `#${r.folioCorrelativo}`,
        r.numeroReciboFiscal,
        r.fecha,
        r.cedula,
        r.contribuyente,
        r.sector,
        `$${r.montoUsd.toFixed(2)}`,
        `Bs. ${r.tasaBcv.toFixed(2)}`,
        `Bs. ${r.montoBs.toFixed(2)}`,
        r.metodo,
        r.estado,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [2, 132, 199], fontSize: 8 },
      styles: { fontSize: 7.5 },
    });

    doc.save(`Libro_Fiscal_Contraloria_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // KPI calculations
  const totalBs = recibosFiscales.filter((r) => r.estado === 'APROBADO').reduce((acc, curr) => acc + curr.montoBs, 0);
  const totalUsd = recibosFiscales.filter((r) => r.estado === 'APROBADO').reduce((acc, curr) => acc + curr.montoUsd, 0);
  const totalDigitalesPendientes = recibosFiscales.filter((r) => r.estado === 'PENDIENTE_VALIDACION').length;
  const reportesResueltosCount = reportesIncidencias.filter((rep) => rep.estado === 'RESUELTO').length;

  // Filtered Lists
  const recibosFiltradosAuditoria = recibosFiscales.filter((r) => {
    const matchSearch =
      r.numeroReciboFiscal?.toLowerCase().includes(searchAuditoria.toLowerCase()) ||
      r.contribuyente?.toLowerCase().includes(searchAuditoria.toLowerCase()) ||
      r.cedula?.toLowerCase().includes(searchAuditoria.toLowerCase()) ||
      r.sector?.toLowerCase().includes(searchAuditoria.toLowerCase()) ||
      r.metodo?.toLowerCase().includes(searchAuditoria.toLowerCase()) ||
      String(r.folioCorrelativo).includes(searchAuditoria);

    const matchEstado = filtroEstadoAuditoria === 'TODOS' || r.estado === filtroEstadoAuditoria;
    return matchSearch && matchEstado;
  });

  const recibosFiltradosValidar = recibosFiscales.filter((r) => {
    if (filtroValidar === 'PENDIENTES') return r.estado === 'PENDIENTE_VALIDACION';
    if (filtroValidar === 'APROBADOS') return r.estado === 'APROBADO' && r.origen === 'WEB_CIUDADANO';
    if (filtroValidar === 'RECHAZADOS') return r.estado === 'RECHAZADO';
    return r.origen === 'WEB_CIUDADANO' || r.estado === 'PENDIENTE_VALIDACION';
  });

  const sectoresFiltrados = sectoresTarifas.filter((s) =>
    s.nombre.toLowerCase().includes(searchTarifas.toLowerCase()) ||
    s.codigo.toLowerCase().includes(searchTarifas.toLowerCase()) ||
    s.parroquia.toLowerCase().includes(searchTarifas.toLowerCase())
  );

  const reportesFiltradosMapa = reportesIncidencias.filter((rep) => {
    if (filtroMapa === 'TODOS') return true;
    return rep.estado === filtroMapa;
  });

  if (status === 'loading' || (session?.user as any)?.rol !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Verificando credenciales de Contraloría...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar tasaBcv={tasaBcv} />

      {/* Admin Top Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 py-4 px-6 sticky top-[57px] z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Panel Administrativo & Control Fiscal</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Alcaldía de Rosario de Perijá • Módulo de Recaudación, Taquilla y Auditoría de Contraloría
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={cargarDatosCompletos}
              disabled={loadingData}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
              title="Recargar base de datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{loadingData ? 'Cargando...' : 'Actualizar'}</span>
            </button>

            <a
              href="/ciudadano"
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-950/80 hover:bg-sky-900 border border-sky-600/40 text-sky-300 rounded-xl text-xs font-bold transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Ver Ciudadano</span>
            </a>

            <a
              href="/cuadrilla"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/40 text-amber-300 rounded-xl text-xs font-bold transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Ver Cuadrilla</span>
            </a>

            <button
              onClick={exportarExcelContraloria}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              onClick={exportarPdfContraloria}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Libro PDF</span>
            </button>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-950/80 hover:bg-red-800 border border-red-500/40 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'kpis' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>KPIs y Tablero</span>
          </button>

          <button
            onClick={() => setActiveTab('taquilla')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'taquilla' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Taquilla Municipal (Cajero)</span>
          </button>

          <button
            onClick={() => setActiveTab('auditoria')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'auditoria' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Auditoría Fiscal (Folios)</span>
          </button>

          <button
            onClick={() => setActiveTab('validar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'validar' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Validar Pagos Digitales ({totalDigitalesPendientes})</span>
          </button>

          <button
            onClick={() => setActiveTab('tarifas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'tarifas' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Zonificación & Tarifas ({sectoresTarifas.length} Sectores)</span>
          </button>

          <button
            onClick={() => setActiveTab('mapa')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'mapa' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Monitoreo en Mapa (GPS)</span>
          </button>
        </div>

        {/* TAB 1: KPIs & DASHBOARD */}
        {activeTab === 'kpis' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="text-xs text-slate-400 font-medium">Recaudación Neta Total</div>
                <div className="text-3xl font-black text-emerald-400 mt-1 font-mono">
                  Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Equivalente: <strong className="text-white">${totalUsd.toFixed(2)} USD</strong> (Tasa BCV {tasaBcv.toFixed(2)})
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="text-xs text-slate-400 font-medium">Folios Fiscales Emitidos</div>
                <div className="text-3xl font-black text-sky-400 mt-1 font-mono">
                  #{recibosFiscales.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {recibosFiscales.filter((r) => r.estado === 'APROBADO').length} Solventes • {totalDigitalesPendientes} Por Validar
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="text-xs text-slate-400 font-medium">Incidencias Atendidas</div>
                <div className="text-3xl font-black text-amber-400 mt-1 font-mono">
                  {reportesResueltosCount} / {reportesIncidencias.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Reportes ciudadanos con evidencia fotográfica
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="text-xs text-slate-400 font-medium">Sectores y Rutas Activas</div>
                <div className="text-3xl font-black text-purple-400 mt-1 font-mono">
                  {sectoresTarifas.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Cobertura en las 3 Parroquias de Rosario
                </div>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Últimos Recibos Fiscales Registrados
                </h3>
                <button
                  onClick={() => setActiveTab('auditoria')}
                  className="text-xs text-sky-400 hover:underline font-semibold"
                >
                  Ver todos los folios ↗
                </button>
              </div>

              {recibosFiscales.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Aún no se han emitido recibos fiscales en esta jornada. Cobra en taquilla o valida pagos digitales.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Folio</th>
                        <th className="p-3">Nº Recibo Fiscal</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Cédula</th>
                        <th className="p-3">Contribuyente</th>
                        <th className="p-3">Monto Bs.</th>
                        <th className="p-3">Método</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {recibosFiscales.slice(0, 8).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-850/50">
                          <td className="p-3 font-mono font-bold text-slate-400">#{r.folioCorrelativo}</td>
                          <td className="p-3 font-mono font-bold text-sky-400">{r.numeroReciboFiscal}</td>
                          <td className="p-3 text-slate-400">{r.fecha}</td>
                          <td className="p-3 font-mono text-slate-300">{r.cedula}</td>
                          <td className="p-3 font-semibold text-white">{r.contribuyente}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">Bs. {r.montoBs.toFixed(2)}</td>
                          <td className="p-3 text-slate-300">{r.metodo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                r.estado === 'APROBADO'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : r.estado === 'RECHAZADO'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {r.estado}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleVerReciboModal(r)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                              title="Ver / Imprimir Recibo"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ver</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TAQUILLA MUNICIPAL (POS CAJERO) */}
        {activeTab === 'taquilla' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Printer className="w-6 h-6 text-emerald-400" />
                    Ventanilla de Cobro Rápido en Taquilla
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Emisión instantánea de Recibo Fiscal de Contraloría guardado directamente en Base de Datos.
                  </p>
                </div>
                <div className="bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full text-xs text-emerald-300 font-bold">
                  Cajero Activo: {(session?.user as any)?.name || 'Elena Rincón'} (Taquilla 01)
                </div>
              </div>

              <form onSubmit={handleCobroTaquilla} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cédula / RIF del Vecino: *
                    </label>
                    <input
                      type="text"
                      required
                      value={taquillaCedula}
                      onChange={(e) => setTaquillaCedula(e.target.value)}
                      placeholder="Ej. 14234567 o V-14234567"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nombre / Razón Social:
                    </label>
                    <input
                      type="text"
                      value={taquillaNombre}
                      onChange={(e) => setTaquillaNombre(e.target.value)}
                      placeholder="Nombre del contribuyente"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Sector del Inmueble:
                    </label>
                    <select
                      value={taquillaSectorId}
                      onChange={(e) => {
                        setTaquillaSectorId(e.target.value);
                        const sel = sectoresTarifas.find((s) => s.id === e.target.value);
                        if (sel) setMontoTaquillaUsd(sel.tarifaUsd);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    >
                      {sectoresTarifas.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} (${s.tarifaUsd.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Dirección / Nº Casa o Local:
                    </label>
                    <input
                      type="text"
                      value={taquillaUbicacion}
                      onChange={(e) => setTaquillaUbicacion(e.target.value)}
                      placeholder="Ej. Casa #24, Calle Central"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Método de Cobro en Ventanilla:
                    </label>
                    <select
                      value={metodoTaquilla}
                      onChange={(e) => setMetodoTaquilla(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="PUNTO_VENTA">💳 Punto de Venta (Tarjeta de Débito/Crédito)</option>
                      <option value="EFECTIVO_BS">💵 Efectivo en Bolívares</option>
                      <option value="EFECTIVO_USD">💵 Efectivo en Divisas ($ USD)</option>
                      <option value="PAGO_MOVIL">📲 Pago Móvil Conciliado en Sede</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Monto Tarifa Base ($ USD):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={montoTaquillaUsd}
                      onChange={(e) => setMontoTaquillaUsd(parseFloat(e.target.value) || 3.0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <span className="text-xs text-slate-400">Total liquidado a Tasa Oficial BCV ({tasaBcv.toFixed(2)} Bs./USD):</span>
                    <div className="text-3xl font-black text-amber-400 font-mono">
                      Bs. {(Math.round(montoTaquillaUsd * tasaBcv * 100) / 100).toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={taquillaProcessing}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    <Printer className="w-5 h-5" />
                    <span>{taquillaProcessing ? 'Liquidando y Guardando...' : 'COBRAR & IMPRIMIR RECIBO FISCAL'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: AUDITORÍA FISCAL DE CONTRALORÍA */}
        {activeTab === 'auditoria' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-sky-400" />
                    Libro Diario de Ingresos Inmutable (Contraloría Municipal)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Registro legal secuencial de todos los folios emitidos bajo estricta trazabilidad contable.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={exportarExcelContraloria}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={exportarPdfContraloria}
                    className="flex items-center gap-1.5 px-3 py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF Oficial</span>
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={searchAuditoria}
                    onChange={(e) => setSearchAuditoria(e.target.value)}
                    placeholder="Buscar por Nº Folio, Cédula, Nombre o Sector..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filtroEstadoAuditoria}
                    onChange={(e) => setFiltroEstadoAuditoria(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl text-xs text-white px-3 py-2 focus:outline-none focus:border-sky-500 font-semibold"
                  >
                    <option value="TODOS">Todos los Estados</option>
                    <option value="APROBADO">Solo Aprobados</option>
                    <option value="PENDIENTE_VALIDACION">Solo Pendientes</option>
                    <option value="RECHAZADO">Solo Rechazados</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Folio</th>
                      <th className="p-3">Nº Recibo Fiscal</th>
                      <th className="p-3">Fecha y Hora</th>
                      <th className="p-3">Contribuyente</th>
                      <th className="p-3">Sector</th>
                      <th className="p-3">Tasa BCV</th>
                      <th className="p-3">Total Bs.</th>
                      <th className="p-3">Método</th>
                      <th className="p-3">Origen</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recibosFiltradosAuditoria.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-500">
                          No se encontraron registros fiscales que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      recibosFiltradosAuditoria.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-850/50">
                          <td className="p-3 font-mono font-bold text-slate-400">#{r.folioCorrelativo}</td>
                          <td className="p-3 font-mono font-bold text-sky-400">{r.numeroReciboFiscal}</td>
                          <td className="p-3 text-slate-400">{r.fecha}</td>
                          <td className="p-3">
                            <div className="font-semibold text-white">{r.contribuyente}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{r.cedula}</div>
                          </td>
                          <td className="p-3 text-slate-300">{r.sector}</td>
                          <td className="p-3 font-mono text-slate-400">Bs. {r.tasaBcv.toFixed(2)}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">Bs. {r.montoBs.toFixed(2)}</td>
                          <td className="p-3 text-slate-300">{r.metodo}</td>
                          <td className="p-3 text-slate-400">{r.origen}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                r.estado === 'APROBADO'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : r.estado === 'RECHAZADO'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {r.estado}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleVerReciboModal(r)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                              title="Ver / Imprimir Recibo Oficial"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Recibo</span>
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
        )}

        {/* TAB 4: VALIDACIÓN DE PAGOS DIGITALES */}
        {activeTab === 'validar' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="w-6 h-6 text-amber-400" />
                    Bandeja de Pagos Digitales para Conciliación
                  </h2>
                  <p className="text-xs text-slate-400">
                    Verifica las transferencias y pagos móviles reportados por los ciudadanos antes de la aprobación fiscal final.
                  </p>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    onClick={() => setFiltroValidar('PENDIENTES')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      filtroValidar === 'PENDIENTES' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pendientes ({totalDigitalesPendientes})
                  </button>
                  <button
                    onClick={() => setFiltroValidar('APROBADOS')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      filtroValidar === 'APROBADOS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Aprobados
                  </button>
                  <button
                    onClick={() => setFiltroValidar('RECHAZADOS')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      filtroValidar === 'RECHAZADOS' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rechazados
                  </button>
                  <button
                    onClick={() => setFiltroValidar('TODOS')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      filtroValidar === 'TODOS' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {recibosFiltradosValidar.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No hay pagos digitales en esta bandeja ({filtroValidar.toLowerCase()}).
                  </div>
                ) : (
                  recibosFiltradosValidar.map((recibo) => (
                    <div
                      key={recibo.id}
                      className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sky-400 text-sm">{recibo.numeroReciboFiscal}</span>
                          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold">
                            {recibo.metodo}
                          </span>
                          <span className="text-xs text-slate-500">{recibo.fecha}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm">
                          {recibo.contribuyente} <span className="text-slate-400 font-mono">({recibo.cedula})</span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Sector: <strong className="text-slate-200">{recibo.sector}</strong> • Inmueble:{' '}
                          <span className="font-mono text-slate-300">{recibo.inmueble}</span>
                        </p>
                        <p className="text-xs text-slate-400">
                          Referencia Bancaria:{' '}
                          <strong className="text-amber-400 font-mono text-sm tracking-wider">
                            {recibo.referencia || 'N/A'}
                          </strong>
                        </p>
                        {recibo.observacionesFiscales && (
                          <p className="text-[11px] text-slate-400 italic">
                            Nota: {recibo.observacionesFiscales}
                          </p>
                        )}
                        <div className="text-xs font-mono font-bold text-emerald-400 pt-1">
                          Monto Liquidado: Bs. {recibo.montoBs.toFixed(2)} (${recibo.montoUsd.toFixed(2)} USD a BCV {recibo.tasaBcv.toFixed(2)})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {recibo.comprobanteUrl && (
                          <button
                            onClick={() => setComprobanteModalUrl(recibo.comprobanteUrl)}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-slate-700"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ver Comprobante</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleVerReciboModal(recibo)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Recibo</span>
                        </button>

                        {recibo.estado === 'PENDIENTE_VALIDACION' ? (
                          <>
                            <button
                              onClick={() => handleValidarPago(recibo.id, true)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Aprobar Pago</span>
                            </button>
                            <button
                              onClick={() => handleValidarPago(recibo.id, false)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Rechazar</span>
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-3 py-1.5 rounded-full font-bold text-xs ${
                              recibo.estado === 'APROBADO'
                                ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-600/40'
                                : 'text-red-400 bg-red-950/60 border border-red-600/40'
                            }`}
                          >
                            {recibo.estado}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ZONIFICACIÓN & TARIFAS POR SECTOR */}
        {activeTab === 'tarifas' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="w-6 h-6 text-sky-400" />
                    Zonificación Tarifaria por Sector ({sectoresTarifas.length} Sectores del Municipio)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configuración de montos diferenciados de la tasa de aseo urbano guardados en Base de Datos.
                  </p>
                </div>
              </div>

              {/* Search Bar for Sectors */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchTarifas}
                  onChange={(e) => setSearchTarifas(e.target.value)}
                  placeholder="Buscar entre los 83 sectores por nombre o parroquia..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Sector</th>
                      <th className="p-3">Parroquia</th>
                      <th className="p-3">Estrato</th>
                      <th className="p-3">Tarifa Fijada ($ USD)</th>
                      <th className="p-3">Equivalente Hoy (Bs.)</th>
                      <th className="p-3">Base Legal / Ordenanza</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sectoresFiltrados.map((tar) => (
                      <tr key={tar.id} className="hover:bg-slate-850/50">
                        <td className="p-3 font-mono font-semibold text-slate-400">{tar.codigo}</td>
                        <td className="p-3 font-bold text-white">{tar.nombre}</td>
                        <td className="p-3 text-slate-400">{tar.parroquia}</td>
                        <td className="p-3">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-sky-300 font-semibold text-[11px]">
                            {tar.estrato}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400 text-sm">
                          ${tar.tarifaUsd.toFixed(2)} USD
                        </td>
                        <td className="p-3 font-mono text-amber-400 font-semibold">
                          Bs. {(tar.tarifaUsd * tasaBcv).toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-400 truncate max-w-xs">{tar.descripcion}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setEditingTarifaSector(tar);
                              setNuevoMontoTarifa(tar.tarifaUsd);
                              setNuevaDescTarifa(tar.descripcion || 'Ordenanza Municipal de Aseo Urbano 2026');
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar Tarifa</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MONITOREO CARTOGRÁFICO EN VIVO (LEAFLET GPS) */}
        {activeTab === 'mapa' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-emerald-400" />
                    Monitoreo Cartográfico de Rutas e Incidencias en Vivo (GPS)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Visualización satelital con georreferenciación en tiempo real de reportes vecinales y cuadrillas.
                  </p>
                </div>

                {/* Filter Map Markers */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                  <button
                    onClick={() => setFiltroMapa('TODOS')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      filtroMapa === 'TODOS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({reportesIncidencias.length})
                  </button>
                  <button
                    onClick={() => setFiltroMapa('RECIBIDO')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      filtroMapa === 'RECIBIDO' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pendientes ({reportesIncidencias.filter((r) => r.estado === 'RECIBIDO').length})
                  </button>
                  <button
                    onClick={() => setFiltroMapa('RESUELTO')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      filtroMapa === 'RESUELTO' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Resueltos ({reportesResueltosCount})
                  </button>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-800">
                <LeafletMap
                  center={[10.318, -72.315]}
                  zoom={15}
                  height="480px"
                  interactive={true}
                  polygons={[
                    {
                      id: 'poly-colinas',
                      name: 'Sector Las Colinas (Geocerca Operativa)',
                      color: '#0284c7',
                      coordinates: [
                        [10.315, -72.319],
                        [10.315, -72.311],
                        [10.321, -72.311],
                        [10.321, -72.319],
                        [10.315, -72.319],
                      ],
                    },
                  ]}
                  markers={[
                    {
                      id: 'cam-01',
                      lat: 10.3181,
                      lng: -72.3151,
                      title: 'Camión Compactador 01 (Activo)',
                      description: 'Cuadrilla Operativa: Roberto González. Rango: Casco Central y Las Colinas.',
                      type: 'truck',
                    },
                    ...reportesFiltradosMapa.map((rep, idx) => ({
                      id: rep.id,
                      lat: rep.latitud || 10.3188 + (idx * 0.001 - 0.002),
                      lng: rep.longitud || -72.3159 + (idx * 0.0012 - 0.002),
                      title: `Incidencia Nº ${rep.numeroIncidencia || `INC-${idx + 1}`}`,
                      description: `${rep.descripcionIncidencia || 'Reporte de aseo'} • Sector: ${rep.sector?.nombre || 'General'} • Estado: ${rep.estado}`,
                      type: 'incident' as const,
                      status: rep.estado as any,
                      photoUrl: rep.fotoUrl,
                    })),
                  ]}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        recibo={reciboEmitido}
      />

      {/* Proof Screenshot Full Preview Modal */}
      {comprobanteModalUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-sky-400" />
                Comprobante de Pago Adjunto por el Ciudadano
              </h3>
              <button
                onClick={() => setComprobanteModalUrl(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-96 flex items-center justify-center">
              <img
                src={comprobanteModalUrl}
                alt="Comprobante de pago"
                className="max-h-96 w-auto object-contain rounded-lg"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setComprobanteModalUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Cerrar Vista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tariff Edit Modal */}
      {editingTarifaSector && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-sky-400" />
                Editar Tarifa Oficial: {editingTarifaSector.nombre}
              </h3>
              <button
                onClick={() => setEditingTarifaSector(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarTarifaSector} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monto de Tarifa Base Mensual ($ USD):
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.5"
                  required
                  value={nuevoMontoTarifa}
                  onChange={(e) => setNuevoMontoTarifa(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-amber-400 mt-1 font-mono">
                  Equivalente actual: Bs. {(nuevoMontoTarifa * tasaBcv).toFixed(2)} a Tasa BCV ({tasaBcv.toFixed(2)})
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descripción u Ordenanza Municipal:
                </label>
                <textarea
                  rows={2}
                  value={nuevaDescTarifa}
                  onChange={(e) => setNuevaDescTarifa(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTarifaSector(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTarifa}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>{guardandoTarifa ? 'Guardando...' : 'Guardar Tarifa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
