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
  obtenerTurnosCuadrilla,
  obtenerInmueblesCensadosAdmin,
  actualizarSolvenciaInmuebleAdmin,
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
  BarChart3,
  PieChart,
  Activity,
  Sparkles,
  Award,
  Home,
  Building2,
  Map,
  Navigation2,
  CheckCheck,
  QrCode,
  Phone
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';
import { exportToExcelOficial } from '@/lib/excelExport';
import { generarCertificadoSolvenciaPdf } from '@/lib/generarCertificadoSolvencia';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'kpis' | 'analiticas' | 'taquilla' | 'auditoria' | 'validar' | 'tarifas' | 'mapa'>('kpis');
  const [tasaBcv, setTasaBcv] = useState(832.49);
  const [loadingData, setLoadingData] = useState(false);

  // Security guard
  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && (session?.user as any)?.rol !== 'ADMIN')) {
      router.push('/login');
    }
  }, [status, session, router]);

  // Load BCV Rate
  useEffect(() => {
    fetch('/api/bcv')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.valorUsdBs) setTasaBcv(data.valorUsdBs);
      })
      .catch((err) => console.error('Error tasa:', err));
  }, []);

  // Real Database States
  const [recibosFiscales, setRecibosFiscales] = useState<any[]>([]);
  const [sectoresTarifas, setSectoresTarifas] = useState<any[]>([]);
  const [reportesIncidencias, setReportesIncidencias] = useState<any[]>([]);
  const [turnosCuadrilla, setTurnosCuadrilla] = useState<any[]>([]);
  const [inmueblesCensados, setInmueblesCensados] = useState<any[]>([]);

  // Cadastral Geovisor States
  const [filtroCapaMapa, setFiltroCapaMapa] = useState<'TODOS' | 'VIVIENDAS' | 'INCIDENCIAS' | 'CAMION'>('TODOS');
  const [filtroSolvenciaMapa, setFiltroSolvenciaMapa] = useState<'TODOS' | 'SOLVENTE' | 'PENDIENTE' | 'MORA' | 'EXONERADO'>('TODOS');
  const [sectorMapaSeleccionado, setSectorMapaSeleccionado] = useState<string>('');
  const [searchInmueblesMapa, setSearchInmueblesMapa] = useState<string>('');
  const [inmuebleDetalleModal, setInmuebleDetalleModal] = useState<any | null>(null);
  const [cambiandoSolvencia, setCambiandoSolvencia] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.3180, -72.3150]);
  const [mapZoom, setMapZoom] = useState<number>(15);

  // Taquilla Cashier State
  const [taquillaCedula, setTaquillaCedula] = useState('14234567');
  const [taquillaNombre, setTaquillaNombre] = useState('Contribuyente Taquilla');
  const [taquillaSectorId, setTaquillaSectorId] = useState('');
  const [taquillaUbicacion, setTaquillaUbicacion] = useState('Sede Municipal / Taquilla');
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

  // Rejection Modal State
  const [rechazarModalRecibo, setRechazarModalRecibo] = useState<any | null>(null);
  const [motivoRechazoInput, setMotivoRechazoInput] = useState<string>('Referencia bancaria no encontrada en la conciliación de la Alcaldía.');
  const [procesandoRechazo, setProcesandoRechazo] = useState(false);

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
      const [recibos, sectores, reportes, turnos, inmuebles] = await Promise.all([
        obtenerRecibosAdmin(),
        obtenerTodosSectoresConTarifas(),
        obtenerReportesCuadrilla(),
        obtenerTurnosCuadrilla(),
        obtenerInmueblesCensadosAdmin(),
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
      setTurnosCuadrilla(turnos || []);
      setInmueblesCensados(inmuebles || []);

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
  const handleValidarPago = async (recibo: any, aprobar: boolean) => {
    if (!aprobar) {
      setRechazarModalRecibo(recibo);
      setMotivoRechazoInput('Referencia bancaria no encontrada en la conciliación de la Alcaldía.');
      return;
    }

    try {
      const adminId = (session?.user as any)?.id || 'admin';
      await validarPagoDigital(recibo.id, adminId, true);
      setRecibosFiscales((prev) =>
        prev.map((r) => (r.id === recibo.id ? { ...r, estado: 'APROBADO' } : r))
      );
      alert('✅ Pago digital aprobado con éxito.');
    } catch (e: any) {
      alert(`Error al validar: ${e?.message || 'Error desconocido'}`);
    }
  };

  const handleConfirmarRechazo = async () => {
    if (!rechazarModalRecibo) return;
    setProcesandoRechazo(true);
    try {
      const adminId = (session?.user as any)?.id || 'admin';
      const motivo = motivoRechazoInput.trim() || 'Comprobante no coincide con la conciliación bancaria.';
      await validarPagoDigital(rechazarModalRecibo.id, adminId, false, motivo);
      setRecibosFiscales((prev) =>
        prev.map((r) =>
          r.id === rechazarModalRecibo.id
            ? { ...r, estado: 'RECHAZADO', observacionesFiscales: `Rechazado por el Administrador: ${motivo}` }
            : r
        )
      );
      setRechazarModalRecibo(null);
      alert('❌ Pago rechazado. El mensaje fue guardado y el ciudadano lo verá en su portal.');
    } catch (e: any) {
      alert(`Error al rechazar: ${e?.message || 'Error desconocido'}`);
    } finally {
      setProcesandoRechazo(false);
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

  // Export to Excel for Contraloría Municipal & Auditoría Oficial
  const exportarExcelContraloria = () => {
    try {
      const dataRecibos = (recibosFiscales || []).map((r) => ({
        numeroReciboFiscal: String(r.numeroReciboFiscal || 'N/A'),
        folioCorrelativo: r.folioCorrelativo || 1,
        fechaEmision: String(r.fecha || new Date().toLocaleString('es-VE')),
        cedulaRif: String(r.cedula || 'N/A'),
        contribuyente: String(r.contribuyente || 'Contribuyente'),
        codigoCatastral: String(r.inmueble || 'N/A'),
        sector: String(r.sector || 'Rosario de Perijá'),
        metodoPago: String(r.metodo || 'PAGO_MOVIL'),
        referenciaBancaria: String(r.referencia || 'N/A'),
        tasaBcvUsd: Number(r.tasaBcv) || tasaBcv || 842.21,
        montoTotalBs: Number(r.montoBs) || 0,
        montoTotalUsd: Number(r.montoUsd) || 0,
        estado: String(r.estado || 'APROBADO'),
        observacionesFiscales: String(r.observacionesFiscales || 'Conforme'),
      }));

      const dataReportes = (reportesIncidencias || []).map((rep) => ({
        folio: String(rep.folio || rep.folioIncidencia || 'REP-001'),
        fecha: String(rep.createdAt || new Date().toISOString()),
        tipo: String(rep.tipo || rep.tipoProblema || 'INCIDENCIA'),
        sector: String(rep.sector?.nombre || rep.sector || 'Rosario'),
        descripcion: String(rep.descripcion || '-'),
        usuario: String(
          rep.usuario?.nombres ? `${rep.usuario.nombres} ${rep.usuario.apellidos || ''}`.trim() : rep.usuario || 'Vecino'
        ),
        telefono: String(rep.telefono || rep.usuario?.telefonoMovil || '-'),
        estado: String(rep.estado || 'PENDIENTE'),
        cuadrilla: String(rep.cuadrillaAsignada || 'CAM-01 Compactador'),
        motivoRechazo: String(rep.notasResolucion || '-'),
      }));

      const dataSectores = (sectoresTarifas || []).map((s) => ({
        codigo: String(s.codigo || '-'),
        nombre: String(s.nombre || '-'),
        estrato: String(s.estrato || 'POPULAR'),
        tarifaUsd: Number(s.tarifaUsd) || 3.0,
        tarifaBs: Math.round((Number(s.tarifaUsd) || 3.0) * (Number(tasaBcv) || 842.21) * 100) / 100,
        parroquia: typeof s.parroquia === 'string' ? s.parroquia : (s.parroquia?.nombre || 'El Rosario'),
        fase: String(s.faseDespliegue || s.fase || 'ACTIVO_FASE_1'),
      }));

      const dataTurnos = (turnosCuadrilla || []).map((t, idx) => ({
        id: t.id || `TURNO-${idx + 1}`,
        fecha: String(t.fechaTurno || new Date().toISOString().split('T')[0]),
        camion: String(t.camion?.codigoUnidad || 'CAM-01'),
        supervisor: String(t.supervisor?.nombres ? `${t.supervisor.nombres} ${t.supervisor.apellidos || ''}`.trim() : 'Supervisor'),
        sector: String(t.sector?.nombre || 'Rosario'),
        estado: String(t.estadoTurno || 'FINALIZADO'),
        toneladas: Number(t.toneladasEstimadas) || 0,
        novedades: String(t.novedadesCierre || 'Operativo regular'),
      }));

      const resumen = {
        totalRecaudadoBs: totalBs,
        totalRecaudadoUsd: totalUsd,
        totalRecibosAprobados: recibosFiscales.filter((r) => r.estado === 'APROBADO').length,
        totalRecibosPendientes: totalDigitalesPendientes,
        totalRecibosRechazados: recibosFiscales.filter((r) => r.estado === 'RECHAZADO').length,
        totalReportesResueltos: reportesResueltosCount,
        totalReportesPendientes: reportesIncidencias.filter((rep) => rep.estado === 'PENDIENTE' || rep.estado === 'RECIBIDO').length,
        totalToneladasMes: totalToneladasMes,
        tasaBcvActual: tasaBcv,
      };

      exportToExcelOficial(dataRecibos, dataReportes, dataSectores, resumen, dataTurnos);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch (e: any) {
      console.error('Error al exportar Excel:', e);
      alert(`Error al generar el archivo Excel: ${e?.message || e}`);
    }
  };

  // Export to PDF for Contraloría
  const exportarPdfContraloria = () => {
    try {
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
          `#${r.folioCorrelativo || 1}`,
          r.numeroReciboFiscal || 'N/A',
          r.fecha || '-',
          r.cedula || '-',
          r.contribuyente || 'Contribuyente',
          r.sector || 'Rosario',
          `$${(Number(r.montoUsd) || 0).toFixed(2)}`,
          `Bs. ${(Number(r.tasaBcv) || tasaBcv || 842.21).toFixed(2)}`,
          `Bs. ${(Number(r.montoBs) || 0).toFixed(2)}`,
          r.metodo || 'PUNTO_VENTA',
          r.estado || 'APROBADO',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [2, 132, 199], fontSize: 8 },
        styles: { fontSize: 7.5 },
      });

      doc.save(`Libro_Fiscal_Contraloria_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e: any) {
      console.error('Error al exportar PDF:', e);
      alert(`Error al generar el archivo PDF: ${e?.message || e}`);
    }
  };

  // Generate and Download Official Municipal Solvency Certificate PDF
  const handleDescargarSolvenciaAdmin = async (r: any) => {
    try {
      await generarCertificadoSolvenciaPdf({
        contribuyenteNombre: r.contribuyente,
        contribuyenteCedula: r.cedula,
        codigoCatastral: r.inmueble || '04-03-URB-01',
        sectorNombre: r.sector || 'Casco Urbano',
        ultimoReciboFolio: r.numeroReciboFiscal,
        ultimoReciboFecha: r.fecha,
        montoUltimoPagoBs: Number(r.montoBs) || 0,
        montoUltimoPagoUsd: Number(r.montoUsd) || 0,
      });
      confetti({ particleCount: 70, spread: 50, origin: { y: 0.6 } });
    } catch (e) {
      alert('Error al generar certificado de solvencia');
    }
  };

  // Real Database KPI calculations
  const totalBs = recibosFiscales.filter((r) => r.estado === 'APROBADO').reduce((acc, curr) => acc + (Number(curr.montoBs) || 0), 0);
  const totalUsd = recibosFiscales.filter((r) => r.estado === 'APROBADO').reduce((acc, curr) => acc + (Number(curr.montoUsd) || 0), 0);
  const totalDigitalesPendientes = recibosFiscales.filter((r) => r.estado === 'PENDIENTE_VALIDACION').length;
  const reportesResueltosCount = reportesIncidencias.filter((rep) => rep.estado === 'RESUELTO').length;

  // Real Toneladas & Cuadrilla Metrics
  const turnosCerrados = turnosCuadrilla.filter((t) => t.estadoTurno === 'FINALIZADO' || (Number(t.toneladasEstimadas) || 0) > 0);
  const totalToneladasMes = turnosCuadrilla.reduce((sum, t) => sum + (Number(t.toneladasEstimadas) || 0), 0);

  // Real Payment Method Percentages
  const totalRecibosCount = recibosFiscales.length || 1;
  const recibosPagoMovil = recibosFiscales.filter((r) => r.metodo === 'PAGO_MOVIL');
  const recibosTaquillaPos = recibosFiscales.filter((r) => ['PUNTO_VENTA', 'EFECTIVO_BS', 'EFECTIVO_USD'].includes(r.metodo));
  const recibosTransf = recibosFiscales.filter((r) => ['TRANSFERENCIA', 'ZELLE'].includes(r.metodo));

  const pctPagoMovil = Math.round((recibosPagoMovil.length / totalRecibosCount) * 100);
  const pctTaquillaPos = Math.round((recibosTaquillaPos.length / totalRecibosCount) * 100);
  const pctTransf = Math.round((recibosTransf.length / totalRecibosCount) * 100);

  // Real Sector Collection Ranking
  const recaudacionPorSector = Object.entries(
    recibosFiscales.reduce((acc: Record<string, { totalUsd: number; totalBs: number; count: number }>, r) => {
      const sec = r.sector || 'Rosario de Perijá';
      if (!acc[sec]) acc[sec] = { totalUsd: 0, totalBs: 0, count: 0 };
      acc[sec].totalUsd += Number(r.montoUsd) || 0;
      acc[sec].totalBs += Number(r.montoBs) || 0;
      acc[sec].count += 1;
      return acc;
    }, {})
  )
    .map(([sector, data]) => ({ sector, ...data }))
    .sort((a, b) => b.totalUsd - a.totalUsd);

  // Real Tonnage Distribution by Truck Unit
  const camionesStats = ['CAM-01', 'CAM-02'].map((codigo) => {
    const turnosCamion = turnosCuadrilla.filter((t) => t.camion?.codigoUnidad === codigo || t.camionId === codigo);
    const tons = turnosCamion.reduce((acc, t) => acc + (Number(t.toneladasEstimadas) || 0), 0);
    const pct = totalToneladasMes > 0 ? Math.round((tons / totalToneladasMes) * 100) : (codigo === 'CAM-01' ? 60 : 40);
    const rutas = Array.from(new Set(turnosCamion.map((t) => t.sector?.nombre).filter(Boolean))).join(', ') || (codigo === 'CAM-01' ? 'Casco Central, Las Colinas' : 'Noriega Trigo, San Andrés');
    return {
      codigo,
      capacidad: codigo === 'CAM-01' ? 6.5 : 8.0,
      toneladas: tons,
      turnosCount: turnosCamion.length,
      pct,
      rutas,
    };
  });

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
    (typeof s.parroquia === 'string' ? s.parroquia : (s.parroquia?.nombre || '')).toLowerCase().includes(searchTarifas.toLowerCase())
  );

  const reportesFiltradosMapa = reportesIncidencias.filter((rep) => {
    if (filtroMapa === 'TODOS') return true;
    return rep.estado === filtroMapa;
  });

  // Cadastral Census Calculations
  const totalInmueblesConGps = inmueblesCensados.filter((i) => i.latitud && i.longitud).length;
  const inmueblesSolventes = inmueblesCensados.filter((i) => (i.estadoCuenta || 'SOLVENTE') === 'SOLVENTE').length;
  const inmueblesPendientes = inmueblesCensados.filter((i) => i.estadoCuenta === 'PENDIENTE').length;
  const inmueblesEnMora = inmueblesCensados.filter((i) => i.estadoCuenta === 'MORA').length;
  const inmueblesExentos = inmueblesCensados.filter((i) => i.estadoCuenta === 'EXONERADO' || i.estadoCuenta === 'DESOCUPADO').length;
  const porcentajeSolvenciaCatastro = inmueblesCensados.length > 0
    ? Math.round((inmueblesSolventes / inmueblesCensados.length) * 100)
    : 100;

  // Cadastral Handlers
  const handleCambiarSolvenciaInmueble = async (inmuebleId: string, nuevoEstado: string) => {
    setCambiandoSolvencia(true);
    try {
      await actualizarSolvenciaInmuebleAdmin({
        inmuebleId,
        nuevoEstado,
      });
      setInmueblesCensados((prev) =>
        prev.map((inm) => (inm.id === inmuebleId ? { ...inm, estadoCuenta: nuevoEstado } : inm))
      );
      if (inmuebleDetalleModal && inmuebleDetalleModal.id === inmuebleId) {
        setInmuebleDetalleModal((prev: any) => ({ ...prev, estadoCuenta: nuevoEstado }));
      }
      alert(`✅ Estado de solvencia actualizado a ${nuevoEstado}.`);
    } catch (e: any) {
      alert(`Error al actualizar estado: ${e?.message || e}`);
    } finally {
      setCambiandoSolvencia(false);
    }
  };

  const handleCargarInmuebleEnTaquilla = (inm: any) => {
    setTaquillaCedula(inm.contribuyenteCedula || '');
    setTaquillaNombre(inm.contribuyenteNombre || '');
    setTaquillaSectorId(inm.sectorId || '');
    setTaquillaUbicacion(`${inm.calleNombre} • Casa/Local: ${inm.numeroCasaLocal}`);
    setMontoTaquillaUsd(inm.tarifaBaseUsd || 3.0);
    setActiveTab('taquilla');
    setInmuebleDetalleModal(null);
  };

  const handleSeleccionarSectorMapa = (secId: string) => {
    setSectorMapaSeleccionado(secId);
    if (!secId) {
      setMapCenter([10.3180, -72.3150]);
      setMapZoom(15);
      return;
    }
    const sec = sectoresTarifas.find((s) => s.id === secId);
    if (sec) {
      const lat = sec.centroLat || 10.3167;
      const lng = sec.centroLng || -72.3167;
      setMapCenter([lat, lng]);
      setMapZoom(16);
    }
  };

  const handleDescargarSolvenciaInmueble = async (inm: any) => {
    try {
      await generarCertificadoSolvenciaPdf({
        contribuyenteNombre: inm.contribuyenteNombre || 'Vecino',
        contribuyenteCedula: inm.contribuyenteCedula || 'V-00000000',
        codigoCatastral: inm.codigoCatastral || 'INM-001',
        sectorNombre: inm.sectorNombre || 'Rosario de Perijá',
        ultimoReciboFolio: inm.ultimoReciboFolio || `SOLV-${Date.now().toString().slice(-6)}`,
        ultimoReciboFecha: inm.ultimoReciboFecha || new Date().toLocaleDateString('es-VE'),
        montoUltimoPagoBs: (inm.tarifaBaseUsd || 3.0) * tasaBcv,
        montoUltimoPagoUsd: inm.tarifaBaseUsd || 3.0,
      });
      confetti({ particleCount: 70, spread: 50, origin: { y: 0.6 } });
    } catch (e) {
      alert('Error al generar certificado de solvencia');
    }
  };

  // Filtered Properties for Geovisor Map and Table
  const inmueblesFiltradosMapa = inmueblesCensados.filter((inm) => {
    const matchSector = !sectorMapaSeleccionado || inm.sectorId === sectorMapaSeleccionado;
    const matchSolvencia =
      filtroSolvenciaMapa === 'TODOS' ||
      (filtroSolvenciaMapa === 'SOLVENTE' && (inm.estadoCuenta || 'SOLVENTE') === 'SOLVENTE') ||
      (filtroSolvenciaMapa === 'PENDIENTE' && inm.estadoCuenta === 'PENDIENTE') ||
      (filtroSolvenciaMapa === 'MORA' && inm.estadoCuenta === 'MORA') ||
      (filtroSolvenciaMapa === 'EXONERADO' && (inm.estadoCuenta === 'EXONERADO' || inm.estadoCuenta === 'DESOCUPADO'));

    const matchSearch =
      !searchInmueblesMapa.trim() ||
      inm.codigoCatastral?.toLowerCase().includes(searchInmueblesMapa.toLowerCase()) ||
      inm.contribuyenteNombre?.toLowerCase().includes(searchInmueblesMapa.toLowerCase()) ||
      inm.contribuyenteCedula?.toLowerCase().includes(searchInmueblesMapa.toLowerCase()) ||
      inm.sectorNombre?.toLowerCase().includes(searchInmueblesMapa.toLowerCase()) ||
      inm.calleNombre?.toLowerCase().includes(searchInmueblesMapa.toLowerCase());

    return matchSector && matchSolvencia && matchSearch;
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
            onClick={() => setActiveTab('analiticas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'analiticas' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analíticas & Reportes Oficiales</span>
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
                          <td className="p-3 text-center flex items-center justify-center gap-1.5">
                            {r.estado === 'APROBADO' && (
                              <button
                                onClick={() => handleDescargarSolvenciaAdmin(r)}
                                className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                                title="Descargar Certificado Oficial de Solvencia Municipal"
                              >
                                <Award className="w-3 h-3 text-emerald-400" />
                                <span>Solvencia</span>
                              </button>
                            )}
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

        {/* TAB 1.5: ANALÍTICAS Y REPORTES OFICIALES */}
        {activeTab === 'analiticas' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header with Export Actions */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 mb-2">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Reportes Ejecutivos y Contraloría Municipal</span>
                </div>
                <h2 className="text-2xl font-black text-white">Analíticas de Recaudación & Operatividad</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Métricas calculadas en tiempo real a partir de la base de datos oficial de la Alcaldía de Rosario de Perijá.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <button
                  onClick={exportarExcelContraloria}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  title="Descargar libro fiscal multitab en Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar a Excel Oficial (.xlsx)</span>
                </button>

                <button
                  onClick={exportarPdfContraloria}
                  className="flex items-center gap-2 px-4 py-2.5 bg-sky-700 hover:bg-sky-600 text-white font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer"
                  title="Descargar libro en PDF"
                >
                  <FileText className="w-4 h-4" />
                  <span>Libro PDF</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recaudación Neta (USD)</span>
                <div className="text-2xl font-black text-emerald-400 font-mono">${totalUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</div>
                <span className="text-[11px] text-slate-400 block font-medium">Equiv. Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa {tasaBcv.toFixed(2)})</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toneladas Recolectadas Mes</span>
                <div className="text-2xl font-black text-amber-400 font-mono">{totalToneladasMes.toFixed(2)} Tn</div>
                <span className="text-[11px] text-slate-400 block font-medium">{turnosCerrados.length} turnos operativos registrados</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasa de Solvencia Fiscal</span>
                <div className="text-2xl font-black text-sky-400 font-mono">
                  {recibosFiscales.length > 0 ? Math.round((recibosFiscales.filter((r) => r.estado === 'APROBADO').length / recibosFiscales.length) * 100) : 100}%
                </div>
                <span className="text-[11px] text-slate-400 block font-medium">{recibosFiscales.filter((r) => r.estado === 'APROBADO').length} de {recibosFiscales.length} recibos aprobados</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Efectividad de Cuadrillas</span>
                <div className="text-2xl font-black text-purple-400 font-mono">
                  {reportesIncidencias.length > 0 ? Math.round((reportesResueltosCount / reportesIncidencias.length) * 100) : 100}%
                </div>
                <span className="text-[11px] text-slate-400 block font-medium">{reportesResueltosCount} de {reportesIncidencias.length} incidencias resueltas con foto</span>
              </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sector Revenue Breakdown (Real DB Ranking) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Recaudación por Sector / Parroquia
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Total: ${totalUsd.toFixed(2)} USD</span>
                </div>

                <div className="space-y-3 pt-2">
                  {recaudacionPorSector.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No hay cobros registrados aún en la base de datos.
                    </div>
                  ) : (
                    recaudacionPorSector.slice(0, 6).map((item, idx) => {
                      const pct = totalUsd > 0 ? Math.round((item.totalUsd / totalUsd) * 100) : 100;
                      return (
                        <div key={idx} className="space-y-1 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              {item.sector}
                            </span>
                            <span className="text-emerald-400 font-mono">
                              ${item.totalUsd.toFixed(2)} USD ({pct}%) • {item.count} recibo{item.count > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 8)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Equivalente: Bs. {item.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Tonnage Distribution by Truck & Sector (Real DB Data) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Truck className="w-5 h-5 text-amber-400" />
                    Distribución de Toneladas por Camión
                  </h3>
                  <span className="text-xs text-amber-400 font-mono font-bold">{totalToneladasMes.toFixed(2)} Tn Totales</span>
                </div>

                <div className="space-y-3 pt-2">
                  {camionesStats.map((c, idx) => (
                    <div key={idx} className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
                          <span className="text-white">{c.codigo} Compactador (Cap. {c.capacidad} Tn)</span>
                        </div>
                        <span className={`${idx === 0 ? 'text-amber-400' : 'text-sky-400'} font-mono`}>
                          {c.toneladas.toFixed(2)} Tn ({c.pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${idx === 0 ? 'bg-amber-500' : 'bg-sky-500'}`}
                          style={{ width: `${Math.max(c.pct, 5)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Rutas atendidas: {c.rutas}</span>
                        <span>{c.turnosCount} turno{c.turnosCount !== 1 ? 's' : ''} registrado{c.turnosCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))}

                  {/* Payment Method Breakdown (100% Real DB Data) */}
                  <div className="border-t border-slate-800 pt-3">
                    <div className="text-xs font-bold text-slate-300 mb-2">Canales de Recaudación Tributaria (Real):</div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-bold">PAGO MÓVIL</span>
                        <span className="font-bold text-emerald-400 font-mono text-sm">{pctPagoMovil}%</span>
                        <span className="text-[9px] text-slate-500 block">{recibosPagoMovil.length} recibos</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-bold">TAQUILLA POS</span>
                        <span className="font-bold text-sky-400 font-mono text-sm">{pctTaquillaPos}%</span>
                        <span className="text-[9px] text-slate-500 block">{recibosTaquillaPos.length} recibos</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-bold">TRANSFERENCIA</span>
                        <span className="font-bold text-amber-400 font-mono text-sm">{pctTransf}%</span>
                        <span className="text-[9px] text-slate-500 block">{recibosTransf.length} recibos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                          <td className="p-3 text-center flex items-center justify-center gap-1.5">
                            {r.estado === 'APROBADO' && (
                              <button
                                onClick={() => handleDescargarSolvenciaAdmin(r)}
                                className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                                title="Descargar Certificado Oficial de Solvencia Municipal"
                              >
                                <Award className="w-3 h-3 text-emerald-400" />
                                <span>Solvencia</span>
                              </button>
                            )}
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
                              onClick={() => handleValidarPago(recibo, true)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Aprobar Pago</span>
                            </button>
                            <button
                              onClick={() => handleValidarPago(recibo, false)}
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

        {/* TAB 6: GEOVISOR CATASTRAL E INTELIGENCIA TERRITORIAL (LEAFLET GPS) */}
        {activeTab === 'mapa' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Geovisor Controls Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <MapPin className="w-6 h-6" />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Geovisor Catastral e Inteligencia Territorial (GPS)
                        <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-600/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                          {inmueblesCensados.length} Inmuebles
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Monitoreo satelital HD de viviendas censadas con semáforo de solvencia tributaria, incidencias y cuadrillas en Rosario de Perijá.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sector Camera Selector & Quick Zoom */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                    <Navigation2 className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs font-bold text-slate-400">Volar a Sector:</span>
                    <select
                      value={sectorMapaSeleccionado}
                      onChange={(e) => handleSeleccionarSectorMapa(e.target.value)}
                      className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-slate-900 text-white">Todos los Sectores (Vista General)</option>
                      {sectoresTarifas.map((sec) => (
                        <option key={sec.id} value={sec.id} className="bg-slate-900 text-white">
                          {sec.nombre} ({sec.parroquia})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setSectorMapaSeleccionado('');
                      setMapCenter([10.3180, -72.3150]);
                      setMapZoom(15);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    title="Restablecer vista a Rosario de Perijá"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restablecer</span>
                  </button>
                </div>
              </div>

              {/* Cadastral Census KPI Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="text-[11px] text-slate-400 font-medium">Inmuebles Censados</div>
                  <div className="text-2xl font-black text-white font-mono mt-0.5">
                    {inmueblesCensados.length}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                    {totalInmueblesConGps} con GPS satelital
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5">
                  <div className="text-[11px] text-slate-400 font-medium">Solvencia Territorial</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                    {porcentajeSolvenciaCatastro}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Cumplimiento fiscal
                  </div>
                </div>

                <div
                  onClick={() => setFiltroSolvenciaMapa('SOLVENTE')}
                  className={`bg-slate-950/80 border rounded-2xl p-3.5 cursor-pointer transition ${
                    filtroSolvenciaMapa === 'SOLVENTE' ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500' : 'border-emerald-500/30 hover:border-emerald-500/60'
                  }`}
                >
                  <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Solventes</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                    {inmueblesSolventes}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Al día con aseo</div>
                </div>

                <div
                  onClick={() => setFiltroSolvenciaMapa('PENDIENTE')}
                  className={`bg-slate-950/80 border rounded-2xl p-3.5 cursor-pointer transition ${
                    filtroSolvenciaMapa === 'PENDIENTE' ? 'border-amber-500 bg-amber-950/20 ring-1 ring-amber-500' : 'border-amber-500/30 hover:border-amber-500/60'
                  }`}
                >
                  <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Por Validar</span>
                  </div>
                  <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                    {inmueblesPendientes}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Pago en revisión</div>
                </div>

                <div
                  onClick={() => setFiltroSolvenciaMapa('MORA')}
                  className={`bg-slate-950/80 border rounded-2xl p-3.5 cursor-pointer transition ${
                    filtroSolvenciaMapa === 'MORA' ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500' : 'border-red-500/30 hover:border-red-500/60'
                  }`}
                >
                  <div className="text-[11px] text-red-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>En Mora</span>
                  </div>
                  <div className="text-2xl font-black text-red-400 font-mono mt-0.5">
                    {inmueblesEnMora}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Sin pago registrado</div>
                </div>

                <div
                  onClick={() => setFiltroSolvenciaMapa('EXONERADO')}
                  className={`bg-slate-950/80 border rounded-2xl p-3.5 cursor-pointer transition ${
                    filtroSolvenciaMapa === 'EXONERADO' ? 'border-slate-500 bg-slate-800/40 ring-1 ring-slate-400' : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Exonerados</span>
                  </div>
                  <div className="text-2xl font-black text-slate-300 font-mono mt-0.5">
                    {inmueblesExentos}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Baldíos / Exentos</div>
                </div>
              </div>

              {/* Multi-Layer & Solvency Filter Bar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                {/* Layer Selector */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
                  <span className="text-slate-400 mr-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>Capa:</span>
                  </span>
                  <button
                    onClick={() => setFiltroCapaMapa('TODOS')}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      filtroCapaMapa === 'TODOS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-900'
                    }`}
                  >
                    Todas las Capas
                  </button>
                  <button
                    onClick={() => setFiltroCapaMapa('VIVIENDAS')}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                      filtroCapaMapa === 'VIVIENDAS' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-900'
                    }`}
                  >
                    <span>🏠 Casas Censadas ({inmueblesFiltradosMapa.length})</span>
                  </button>
                  <button
                    onClick={() => setFiltroCapaMapa('INCIDENCIAS')}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                      filtroCapaMapa === 'INCIDENCIAS' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-900'
                    }`}
                  >
                    <span>⚠️ Incidencias ({reportesIncidencias.length})</span>
                  </button>
                  <button
                    onClick={() => setFiltroCapaMapa('CAMION')}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${
                      filtroCapaMapa === 'CAMION' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-900'
                    }`}
                  >
                    <span>🚛 Cuadrilla Activa</span>
                  </button>
                </div>

                {/* Solvency Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
                  <span className="text-slate-400 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Semáforo:</span>
                  </span>
                  <button
                    onClick={() => setFiltroSolvenciaMapa('TODOS')}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] ${
                      filtroSolvenciaMapa === 'TODOS' ? 'bg-slate-700 text-white font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroSolvenciaMapa('SOLVENTE')}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 ${
                      filtroSolvenciaMapa === 'SOLVENTE' ? 'bg-emerald-600 text-white font-black shadow-md' : 'text-emerald-400 hover:bg-emerald-950/40'
                    }`}
                  >
                    <span>🟢 Solventes</span>
                  </button>
                  <button
                    onClick={() => setFiltroSolvenciaMapa('PENDIENTE')}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 ${
                      filtroSolvenciaMapa === 'PENDIENTE' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-amber-400 hover:bg-amber-950/40'
                    }`}
                  >
                    <span>🟡 Por Validar</span>
                  </button>
                  <button
                    onClick={() => setFiltroSolvenciaMapa('MORA')}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 ${
                      filtroSolvenciaMapa === 'MORA' ? 'bg-red-600 text-white font-black shadow-md' : 'text-red-400 hover:bg-red-950/40'
                    }`}
                  >
                    <span>🔴 En Mora</span>
                  </button>
                  <button
                    onClick={() => setFiltroSolvenciaMapa('EXONERADO')}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 ${
                      filtroSolvenciaMapa === 'EXONERADO' ? 'bg-slate-600 text-white font-black shadow-md' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>⚪ Exonerados</span>
                  </button>
                </div>
              </div>

              {/* Leaflet Satellite HD Map Container */}
              <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                <LeafletMap
                  center={mapCenter}
                  zoom={mapZoom}
                  height="500px"
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
                    // 1. Truck Marker
                    ...(filtroCapaMapa === 'TODOS' || filtroCapaMapa === 'CAMION'
                      ? [
                          {
                            id: 'cam-01',
                            lat: 10.3181,
                            lng: -72.3151,
                            title: 'Camión Compactador 01 (Activo)',
                            description: 'Cuadrilla Operativa: Roberto González. Rango: Casco Central y Las Colinas.',
                            type: 'truck' as const,
                          },
                        ]
                      : []),

                    // 2. Incident Markers
                    ...(filtroCapaMapa === 'TODOS' || filtroCapaMapa === 'INCIDENCIAS'
                      ? reportesFiltradosMapa.map((rep, idx) => ({
                          id: rep.id,
                          lat: rep.latitud || 10.3188 + (idx * 0.001 - 0.002),
                          lng: rep.longitud || -72.3159 + (idx * 0.0012 - 0.002),
                          title: `Incidencia Nº ${rep.numeroIncidencia || `INC-${idx + 1}`}`,
                          description: `${rep.descripcionIncidencia || 'Reporte de aseo'} • Sector: ${rep.sector?.nombre || 'General'} • Estado: ${rep.estado}`,
                          type: 'incident' as const,
                          status: rep.estado as any,
                          photoUrl: rep.fotoUrl,
                        }))
                      : []),

                    // 3. Cadastral Properties (Houses with Solvency Color Pins)
                    ...(filtroCapaMapa === 'TODOS' || filtroCapaMapa === 'VIVIENDAS'
                      ? inmueblesFiltradosMapa
                          .filter((inm) => inm.latitud && inm.longitud)
                          .map((inm) => ({
                            id: `inm-${inm.id}`,
                            lat: inm.latitud,
                            lng: inm.longitud,
                            title: inm.codigoCatastral,
                            description: `${inm.sectorNombre} • ${inm.calleNombre} • Casa/Local: ${inm.numeroCasaLocal}`,
                            type: 'property' as const,
                            solvencia: inm.estadoCuenta || 'SOLVENTE',
                            status: inm.estadoCuenta || 'SOLVENTE',
                            sector: inm.sectorNombre,
                            contribuyente: inm.contribuyenteNombre,
                            cedula: inm.contribuyenteCedula,
                            telefono: inm.contribuyenteTelefono,
                            codigoCatastral: inm.codigoCatastral,
                            tipoInmueble: inm.tipoInmueble,
                            numeroCasa: inm.numeroCasaLocal,
                            referencia: inm.referenciaUbic,
                            tarifaUsd: inm.tarifaBaseUsd,
                            ultimoPagoFecha: inm.ultimoReciboFecha,
                          }))
                      : []),
                  ]}
                />
              </div>

              {/* Live Cadastral Property List & Technical Inspection Grid */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Home className="w-5 h-5 text-sky-400" />
                      Padrón Catastral Georreferenciado ({inmueblesFiltradosMapa.length} Inmuebles Listados)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Registro oficial de viviendas censadas con coordenadas GPS, solvencia y emisión de certificados.
                    </p>
                  </div>

                  {/* Search Properties */}
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={searchInmueblesMapa}
                      onChange={(e) => setSearchInmueblesMapa(e.target.value)}
                      placeholder="Buscar por cédula, nombre, código catastral, sector..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {inmueblesFiltradosMapa.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                    No se encontraron viviendas censadas que coincidan con los filtros seleccionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[460px] rounded-2xl border border-slate-800">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="p-3">Código Catastral</th>
                          <th className="p-3">Contribuyente</th>
                          <th className="p-3">Cédula / RIF</th>
                          <th className="p-3">Sector & Calle</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Tarifa Mes</th>
                          <th className="p-3">Solvencia</th>
                          <th className="p-3">GPS</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900">
                        {inmueblesFiltradosMapa.map((inm) => (
                          <tr key={inm.id} className="hover:bg-slate-850/60 transition">
                            <td className="p-3 font-mono font-bold text-sky-400">
                              {inm.codigoCatastral}
                            </td>
                            <td className="p-3 font-bold text-white">
                              {inm.contribuyenteNombre}
                            </td>
                            <td className="p-3 font-mono text-slate-300">
                              {inm.contribuyenteCedula}
                            </td>
                            <td className="p-3 text-slate-300">
                              <div className="font-semibold text-white">{inm.sectorNombre}</div>
                              <div className="text-[11px] text-slate-400">{inm.calleNombre} • Casa: {inm.numeroCasaLocal}</div>
                            </td>
                            <td className="p-3">
                              <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-300">
                                {inm.tipoInmueble}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-400">
                              ${(inm.tarifaBaseUsd || 3).toFixed(2)} USD
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                  (inm.estadoCuenta || 'SOLVENTE') === 'SOLVENTE'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                    : inm.estadoCuenta === 'PENDIENTE'
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                    : inm.estadoCuenta === 'MORA'
                                    ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                <span>{(inm.estadoCuenta || 'SOLVENTE') === 'SOLVENTE' ? '🟢 SOLVENTE' : inm.estadoCuenta === 'PENDIENTE' ? '🟡 PENDIENTE' : inm.estadoCuenta === 'MORA' ? '🔴 EN MORA' : '⚪ EXENTO'}</span>
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-400">
                              {inm.latitud && inm.longitud ? (
                                <button
                                  onClick={() => {
                                    setMapCenter([inm.latitud, inm.longitud]);
                                    setMapZoom(18);
                                  }}
                                  className="text-sky-400 hover:underline flex items-center gap-1 font-bold"
                                  title="Centrar en el mapa"
                                >
                                  <MapPin className="w-3 h-3 text-emerald-400" />
                                  <span>{inm.latitud.toFixed(4)}, {inm.longitud.toFixed(4)}</span>
                                </button>
                              ) : (
                                <span className="text-slate-600 italic">Sin GPS</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setInmuebleDetalleModal(inm)}
                                  className="p-1.5 bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg transition"
                                  title="Ver Ficha Técnica Catastral Completa"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDescargarSolvenciaInmueble(inm)}
                                  className="p-1.5 bg-emerald-950 hover:bg-emerald-700 text-emerald-300 hover:text-white border border-emerald-600/40 rounded-lg transition"
                                  title="Generar Certificado Oficial de Solvencia en PDF"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleCargarInmuebleEnTaquilla(inm)}
                                  className="p-1.5 bg-amber-950 hover:bg-amber-700 text-amber-300 hover:text-white border border-amber-600/40 rounded-lg transition"
                                  title="Cobrar en Taquilla Express"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
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

      {/* Rejection Note Modal */}
      {rechazarModalRecibo && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-red-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-red-400">
                  {rechazarModalRecibo.numeroReciboFiscal} • {rechazarModalRecibo.contribuyente}
                </div>
                <h3 className="font-bold text-white text-base mt-0.5 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  Rechazar Pago y Enviar Notificación al Ciudadano
                </h3>
              </div>
              <button
                onClick={() => setRechazarModalRecibo(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Escribe el motivo del rechazo. Este mensaje <strong className="text-red-300">le aparecerá de inmediato al ciudadano</strong> en su portal web para que pueda corregirlo o reenviar su pago.
              </p>

              {/* Quick Preset Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Motivos Frecuentes (Toca para autocompletar):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Referencia no encontrada en la conciliación bancaria.',
                    'El monto transferido no corresponde a la tasa oficial del día.',
                    'Comprobante ilegible o captura incompleta.',
                    'Pago transferido a una cuenta no autorizada de la Alcaldía.',
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setMotivoRechazoInput(preset)}
                      className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  Mensaje personalizado para el Contribuyente:
                </label>
                <textarea
                  rows={3}
                  required
                  value={motivoRechazoInput}
                  onChange={(e) => setMotivoRechazoInput(e.target.value)}
                  className="w-full bg-slate-950 border border-red-500/30 focus:border-red-500 rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-slate-500"
                  placeholder="Escribe el motivo detallado..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRechazarModalRecibo(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={procesandoRechazo || !motivoRechazoInput.trim()}
                  onClick={handleConfirmarRechazo}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{procesandoRechazo ? 'Rechazando...' : 'Confirmar Rechazo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cadastral Inspection Sheet Modal */}
      {inmuebleDetalleModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-400">Ficha Catastral Oficial</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        (inmuebleDetalleModal.estadoCuenta || 'SOLVENTE') === 'SOLVENTE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : inmuebleDetalleModal.estadoCuenta === 'PENDIENTE'
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : inmuebleDetalleModal.estadoCuenta === 'MORA'
                          ? 'bg-red-950 text-red-300 border border-red-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {inmuebleDetalleModal.estadoCuenta || 'SOLVENTE'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-0.5">
                    {inmuebleDetalleModal.codigoCatastral}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setInmuebleDetalleModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Technical Cadastral Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Contribuyente */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Contribuyente Registrado</span>
                </div>
                <div><strong>Nombre:</strong> <span className="text-slate-200">{inmuebleDetalleModal.contribuyenteNombre}</span></div>
                <div><strong>Cédula / RIF:</strong> <span className="text-sky-300 font-mono">{inmuebleDetalleModal.contribuyenteCedula}</span></div>
                <div><strong>Teléfono Móvil:</strong> <span className="text-slate-300">{inmuebleDetalleModal.contribuyenteTelefono}</span></div>
              </div>

              {/* Ubicación Catastral */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Dirección Catastral</span>
                </div>
                <div><strong>Parroquia:</strong> <span className="text-slate-200">{inmuebleDetalleModal.parroquiaNombre}</span></div>
                <div><strong>Sector:</strong> <span className="text-amber-300 font-bold">{inmuebleDetalleModal.sectorNombre}</span></div>
                <div><strong>Calle / Tramo:</strong> <span className="text-slate-300">{inmuebleDetalleModal.calleNombre}</span></div>
                <div><strong>Casa / Local:</strong> <span className="text-white font-bold">{inmuebleDetalleModal.numeroCasaLocal}</span></div>
                {inmuebleDetalleModal.referenciaUbic && (
                  <div className="text-[11px] text-slate-400 italic">📌 {inmuebleDetalleModal.referenciaUbic}</div>
                )}
              </div>

              {/* Georreferenciación GPS */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Map className="w-3.5 h-3.5" />
                  <span>Georreferenciación Satelital</span>
                </div>
                <div><strong>Latitud:</strong> <span className="font-mono text-white">{inmuebleDetalleModal.latitud ? inmuebleDetalleModal.latitud.toFixed(6) : 'N/A'}</span></div>
                <div><strong>Longitud:</strong> <span className="font-mono text-white">{inmuebleDetalleModal.longitud ? inmuebleDetalleModal.longitud.toFixed(6) : 'N/A'}</span></div>
                {inmuebleDetalleModal.latitud && inmuebleDetalleModal.longitud && (
                  <a
                    href={`https://www.google.com/maps?q=${inmuebleDetalleModal.latitud},${inmuebleDetalleModal.longitud}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline inline-flex items-center gap-1 pt-1 font-bold text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir en Google Maps Satélite ↗</span>
                  </a>
                )}
              </div>

              {/* Tarifa & Deuda Fiscal */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Parámetros Tributarios</span>
                </div>
                <div><strong>Tipo Inmueble:</strong> <span className="text-white font-bold">{inmuebleDetalleModal.tipoInmueble}</span></div>
                <div><strong>Tarifa Base Aseo:</strong> <span className="font-mono text-emerald-400 font-bold">${(inmuebleDetalleModal.tarifaBaseUsd || 3).toFixed(2)} USD</span> (Bs. {((inmuebleDetalleModal.tarifaBaseUsd || 3) * tasaBcv).toFixed(2)})</div>
                <div><strong>Último Recibo:</strong> <span className="text-slate-300">{inmuebleDetalleModal.ultimoReciboFolio || 'Sin recibos registrados'}</span></div>
                {inmuebleDetalleModal.ultimoReciboFecha && (
                  <div><strong>Fecha Último Pago:</strong> <span className="text-slate-400">{inmuebleDetalleModal.ultimoReciboFecha}</span></div>
                )}
              </div>
            </div>

            {/* Change Solvency Status Inspector Bar */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                🛠️ Inspección Municipal / Modificar Estado de Solvencia Fiscal:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={cambiandoSolvencia}
                  onClick={() => handleCambiarSolvenciaInmueble(inmuebleDetalleModal.id, 'SOLVENTE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    (inmuebleDetalleModal.estadoCuenta || 'SOLVENTE') === 'SOLVENTE'
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                      : 'bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-slate-800'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>🟢 Solvente (Al Día)</span>
                </button>

                <button
                  disabled={cambiandoSolvencia}
                  onClick={() => handleCambiarSolvenciaInmueble(inmuebleDetalleModal.id, 'PENDIENTE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    inmuebleDetalleModal.estadoCuenta === 'PENDIENTE'
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                      : 'bg-slate-900 text-amber-400 border border-amber-500/30 hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>🟡 Por Validar</span>
                </button>

                <button
                  disabled={cambiandoSolvencia}
                  onClick={() => handleCambiarSolvenciaInmueble(inmuebleDetalleModal.id, 'MORA')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    inmuebleDetalleModal.estadoCuenta === 'MORA'
                      ? 'bg-red-600 text-white ring-2 ring-red-400'
                      : 'bg-slate-900 text-red-400 border border-red-500/30 hover:bg-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>🔴 En Mora</span>
                </button>

                <button
                  disabled={cambiandoSolvencia}
                  onClick={() => handleCambiarSolvenciaInmueble(inmuebleDetalleModal.id, 'EXONERADO')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    inmuebleDetalleModal.estadoCuenta === 'EXONERADO'
                      ? 'bg-slate-600 text-white ring-2 ring-slate-400'
                      : 'bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span>⚪ Exonerado / Baldío</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-2 flex-wrap">
              <button
                onClick={() => setInmuebleDetalleModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>

              <button
                onClick={() => handleDescargarSolvenciaInmueble(inmuebleDetalleModal)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Award className="w-4 h-4" />
                <span>Emitir Certificado de Solvencia PDF</span>
              </button>

              <button
                onClick={() => handleCargarInmuebleEnTaquilla(inmuebleDetalleModal)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md font-black"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cobrar en Taquilla Express</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
