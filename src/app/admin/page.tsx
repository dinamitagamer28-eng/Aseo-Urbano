'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';
import SectoresManagement from '@/components/SectoresManagement';
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
  getPersonalAlcaldia,
  crearPersonalAlcaldia,
  actualizarPersonalAlcaldia,
  cambiarPasswordPersonal,
  toggleEstadoPersonal,
  obtenerParroquiasAdmin,
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
  Phone,
  Key,
  Plus,
  Menu,
  ChevronRight,
  UserPlus,
  Building2,
  Navigation,
  Compass,
  Lock,
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

  const [activeTab, setActiveTab] = useState<
    'kpis' | 'analiticas' | 'taquilla' | 'auditoria' | 'validar' | 'sectores' | 'tarifas' | 'personal' | 'mapa'
  >('kpis');
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [tasaBcv, setTasaBcv] = useState(849.56);
  const [loadingData, setLoadingData] = useState(false);

  // Security guard
  useEffect(() => {
    const roleScope = sessionStorage.getItem('role_scope');
    if (roleScope === 'CUADRILLA') {
      alert('⚠️ Tu clave de acceso (CUADRILLA2026) es exclusiva para la App de Cuadrilla.');
      router.push('/cuadrilla');
      return;
    }
    if (roleScope === 'CENSO') {
      alert('⚠️ Tu clave de acceso (CENSO2026) es exclusiva para la App de Censo.');
      router.push('/censo');
      return;
    }
    if (roleScope === 'CAJERO_TAQUILLA' || (session?.user as any)?.rol === 'CAJERO_TAQUILLA') {
      router.push('/taquilla');
      return;
    }
    if (
      status === 'unauthenticated' ||
      (status === 'authenticated' &&
        (session?.user as any)?.rol !== 'ADMIN' &&
        (session?.user as any)?.rol !== 'AUDITOR_CONTRALORIA')
    ) {
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

  // Database States
  const [recibosFiscales, setRecibosFiscales] = useState<any[]>([]);
  const [sectoresTarifas, setSectoresTarifas] = useState<any[]>([]);
  const [parroquias, setParroquias] = useState<any[]>([]);
  const [reportesIncidencias, setReportesIncidencias] = useState<any[]>([]);
  const [turnosCuadrilla, setTurnosCuadrilla] = useState<any[]>([]);
  const [inmueblesCensados, setInmueblesCensados] = useState<any[]>([]);
  const [personalAlcaldia, setPersonalAlcaldia] = useState<any[]>([]);

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
  const [motivoRechazoInput, setMotivoRechazoInput] = useState<string>(
    'Referencia bancaria no encontrada en la conciliación de la Alcaldía.'
  );
  const [procesandoRechazo, setProcesandoRechazo] = useState(false);

  // Personal Management States
  const [searchPersonal, setSearchPersonal] = useState('');
  const [filtroRolPersonal, setFiltroRolPersonal] = useState('TODOS');
  const [modalCrearPersonalOpen, setModalCrearPersonalOpen] = useState(false);
  const [formNuevoPersonal, setFormNuevoPersonal] = useState({
    nombres: '',
    apellidos: '',
    tipoDoc: 'V',
    cedula: '',
    email: '',
    telefonoMovil: '',
    rol: 'SUPERVISOR_CAMPO',
    password: '',
  });
  const [guardandoPersonal, setGuardandoPersonal] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<any | null>(null);
  const [modalEditarPersonalOpen, setModalEditarPersonalOpen] = useState(false);
  const [targetPasswordPersonal, setTargetPasswordPersonal] = useState<string | null>(null);
  const [targetPasswordPersonalNombre, setTargetPasswordPersonalNombre] = useState('');
  const [nuevoPasswordPersonal, setNuevoPasswordPersonal] = useState('');
  const [modalPasswordPersonalOpen, setModalPasswordPersonalOpen] = useState(false);

  // Map & Ficha Catastral States
  const [filtroMapaSector, setFiltroMapaSector] = useState('');
  const [filtroMapaEstado, setFiltroMapaEstado] = useState('TODOS');
  const [filtroMapaSearch, setFiltroMapaSearch] = useState('');
  const [fichaCatastralModal, setFichaCatastralModal] = useState<any | null>(null);
  const [guardandoSolvencia, setGuardandoSolvencia] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.318, -72.315]);
  const [mapZoom, setMapZoom] = useState(15);

  // Search & Filter States
  const [searchAuditoria, setSearchAuditoria] = useState('');
  const [filtroEstadoAuditoria, setFiltroEstadoAuditoria] = useState('TODOS');
  const [searchTarifas, setSearchTarifas] = useState('');
  const [filtroValidar, setFiltroValidar] = useState<'PENDIENTES' | 'APROBADOS' | 'RECHAZADOS' | 'TODOS'>('PENDIENTES');

  // Load All Data from DB
  const cargarDatosCompletos = async () => {
    setLoadingData(true);
    try {
      const [recibos, sectores, reportes, turnos, censados, personal, parrs] = await Promise.all([
        obtenerRecibosAdmin(),
        obtenerTodosSectoresConTarifas(),
        obtenerReportesCuadrilla(),
        obtenerTurnosCuadrilla(),
        obtenerInmueblesCensadosAdmin(),
        getPersonalAlcaldia(),
        obtenerParroquiasAdmin(),
      ]);

      const mappedRecibos = (recibos || []).map((r: any) => ({
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
      setSectoresTarifas(sectores || []);
      setReportesIncidencias(reportes || []);
      setTurnosCuadrilla(turnos || []);
      setInmueblesCensados(censados || []);
      setPersonalAlcaldia(personal || []);
      setParroquias(parrs || []);

      if (sectores && sectores.length > 0 && !taquillaSectorId) {
        setTaquillaSectorId(sectores[0].id);
      }
    } catch (e) {
      console.error('Error cargando datos administrativos:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (
      status === 'authenticated' &&
      ((session?.user as any)?.rol === 'ADMIN' || (session?.user as any)?.rol === 'AUDITOR_CONTRALORIA')
    ) {
      cargarDatosCompletos();
    }
  }, [status, session]);

  // Taquilla Cashier Action
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

        setTaquillaCedula('');
        setTaquillaNombre('');
        setTaquillaUbicacion('');
        setMontoTaquillaUsd(3.0);

        await cargarDatosCompletos();
      }
    } catch (err: any) {
      console.error('Error al liquidar en taquilla:', err);
      alert(`Error al procesar cobro en taquilla: ${err?.message || 'Error desconocido'}`);
    } finally {
      setTaquillaProcessing(false);
    }
  };

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

  // Personal Handlers
  const handleCrearPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPersonal(true);
    try {
      await crearPersonalAlcaldia(formNuevoPersonal);
      alert('✅ Funcionario registrado exitosamente.');
      setModalCrearPersonalOpen(false);
      setFormNuevoPersonal({
        nombres: '',
        apellidos: '',
        tipoDoc: 'V',
        cedula: '',
        email: '',
        telefonoMovil: '',
        rol: 'SUPERVISOR_CAMPO',
        password: '',
      });
      await cargarDatosCompletos();
    } catch (err: any) {
      alert(`❌ Error al registrar: ${err?.message || err}`);
    } finally {
      setGuardandoPersonal(false);
    }
  };

  const handleActualizarPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPersonal) return;
    setGuardandoPersonal(true);
    try {
      await actualizarPersonalAlcaldia(editingPersonal.id, editingPersonal);
      alert('✅ Funcionario actualizado correctamente.');
      setModalEditarPersonalOpen(false);
      setEditingPersonal(null);
      await cargarDatosCompletos();
    } catch (err: any) {
      alert(`❌ Error al actualizar: ${err?.message || err}`);
    } finally {
      setGuardandoPersonal(false);
    }
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPasswordPersonal || !nuevoPasswordPersonal) return;
    setGuardandoPersonal(true);
    try {
      await cambiarPasswordPersonal(targetPasswordPersonal, nuevoPasswordPersonal);
      alert('✅ Contraseña restablecida con éxito.');
      setModalPasswordPersonalOpen(false);
      setTargetPasswordPersonal(null);
      setNuevoPasswordPersonal('');
    } catch (err: any) {
      alert(`❌ Error: ${err?.message || err}`);
    } finally {
      setGuardandoPersonal(false);
    }
  };

  const handleToggleEstadoPersonal = async (id: string, nombre: string, activo: boolean) => {
    if (confirm(`¿Estás seguro de que deseas ${activo ? 'desactivar' : 'activar'} el acceso de ${nombre}?`)) {
      try {
        await toggleEstadoPersonal(id);
        await cargarDatosCompletos();
      } catch (err: any) {
        alert(`❌ Error: ${err?.message || err}`);
      }
    }
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

  // Export to Excel for Contraloría Municipal
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
        tasaBcvUsd: Number(r.tasaBcv) || tasaBcv || 849.56,
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
        tarifaBs: Math.round((Number(s.tarifaUsd) || 3.0) * (Number(tasaBcv) || 849.56) * 100) / 100,
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
          `Bs. ${(Number(r.tasaBcv) || tasaBcv || 849.56).toFixed(2)}`,
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

  // KPIs Calculations
  const totalBs = recibosFiscales.filter((r) => r.estado === 'APROBADO').reduce((acc, r) => acc + (Number(r.montoBs) || 0), 0);
  const totalUsd = recibosFiscales.filter((r) => r.estado === 'APROBADO').reduce((acc, r) => acc + (Number(r.montoUsd) || 0), 0);
  const totalDigitalesPendientes = recibosFiscales.filter((r) => r.estado === 'PENDIENTE_VALIDACION').length;
  const reportesResueltosCount = reportesIncidencias.filter((rep) => rep.estado === 'RESUELTO').length;
  const totalToneladasMes = turnosCuadrilla.reduce((acc, t) => acc + (Number(t.toneladasEstimadas) || 0), 0);

  const totalRecibosCount = recibosFiscales.length || 1;
  const recibosPagoMovil = recibosFiscales.filter((r) => r.metodo === 'PAGO_MOVIL');
  const recibosTaquillaPos = recibosFiscales.filter((r) => ['PUNTO_VENTA', 'EFECTIVO_BS', 'EFECTIVO_USD'].includes(r.metodo));
  const recibosTransf = recibosFiscales.filter((r) => ['TRANSFERENCIA', 'ZELLE'].includes(r.metodo));

  const pctPagoMovil = Math.round((recibosPagoMovil.length / totalRecibosCount) * 100);
  const pctTaquillaPos = Math.round((recibosTaquillaPos.length / totalRecibosCount) * 100);
  const pctTransf = Math.round((recibosTransf.length / totalRecibosCount) * 100);

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

  const personalFiltrado = personalAlcaldia.filter((p) => {
    const q = searchPersonal.toLowerCase().trim();
    const matchQ =
      !q ||
      p.nombres?.toLowerCase().includes(q) ||
      p.apellidos?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.cedulaRif?.toLowerCase().includes(q);
    const matchRol = filtroRolPersonal === 'TODOS' || p.rol === filtroRolPersonal;
    return matchQ && matchRol;
  });

  const inmueblesFiltradosMapa = inmueblesCensados.filter((inm) => {
    const matchSector = !filtroMapaSector || inm.sectorId === filtroMapaSector;
    const matchEstado =
      filtroMapaEstado === 'TODOS' ||
      (filtroMapaEstado === 'SOLVENTE' && (inm.estadoCuenta || 'SOLVENTE') === 'SOLVENTE') ||
      (filtroMapaEstado === 'PENDIENTE' && inm.estadoCuenta === 'PENDIENTE') ||
      (filtroMapaEstado === 'MORA' && inm.estadoCuenta === 'MORA') ||
      (filtroMapaEstado === 'EXONERADO' && (inm.estadoCuenta === 'EXONERADO' || inm.estadoCuenta === 'DESOCUPADO'));
    const matchSearch =
      !filtroMapaSearch.trim() ||
      inm.codigoCatastral?.toLowerCase().includes(filtroMapaSearch.toLowerCase()) ||
      inm.contribuyenteNombre?.toLowerCase().includes(filtroMapaSearch.toLowerCase()) ||
      inm.contribuyenteCedula?.toLowerCase().includes(filtroMapaSearch.toLowerCase()) ||
      inm.sectorNombre?.toLowerCase().includes(filtroMapaSearch.toLowerCase()) ||
      inm.calleNombre?.toLowerCase().includes(filtroMapaSearch.toLowerCase());
    return matchSector && matchEstado && matchSearch;
  });

  const handleUpdateSolvencia = async (inmuebleId: string, nuevoEstado: string) => {
    setGuardandoSolvencia(true);
    try {
      await actualizarSolvenciaInmuebleAdmin({ inmuebleId, nuevoEstado });
      setInmueblesCensados((prev) =>
        prev.map((inm) => (inm.id === inmuebleId ? { ...inm, estadoCuenta: nuevoEstado } : inm))
      );
      if (fichaCatastralModal && fichaCatastralModal.id === inmuebleId) {
        setFichaCatastralModal((prev: any) => ({ ...prev, estadoCuenta: nuevoEstado }));
      }
      alert(`✅ Estado de solvencia actualizado a ${nuevoEstado}.`);
    } catch (e: any) {
      alert(`Error al actualizar estado: ${e?.message || e}`);
    } finally {
      setGuardandoSolvencia(false);
    }
  };

  const handleVerEnMapa = (secId: string) => {
    setFiltroMapaSector(secId);
    const s = sectoresTarifas.find((sec) => sec.id === secId);
    if (s && s.centroLat && s.centroLng) {
      setMapCenter([s.centroLat, s.centroLng]);
      setMapZoom(16);
    }
    setActiveTab('mapa');
  };

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
      {/* Sidebar Responsive */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalPagosPendientes={totalDigitalesPendientes}
        totalSectores={sectoresTarifas.length}
        totalPersonal={personalAlcaldia.length}
        userName={(session?.user as any)?.name || 'Administrador Control Fiscal'}
        userEmail={(session?.user as any)?.email || 'admin@rosariodeperija.gob.ve'}
        userRol={(session?.user as any)?.rol || 'ADMIN'}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
      />

      {/* Main Content Area (padded left on lg to accommodate w-72 sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Sticky Top Header Bar */}
        <header className="bg-slate-900 border-b border-slate-800 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsOpenMobile(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  {activeTab === 'kpis' && 'Tablero Ejecutivo & KPIs'}
                  {activeTab === 'analiticas' && 'Analíticas & Reportes Oficiales'}
                  {activeTab === 'auditoria' && 'Auditoría Fiscal & Folios Inmutables'}
                  {activeTab === 'validar' && 'Validación de Pagos Digitales'}
                  {activeTab === 'sectores' && 'Mantenimiento de Sectores, Calles & Límites GPS'}
                  {activeTab === 'tarifas' && 'Zonificación Catastral & Tarifas'}
                  {activeTab === 'personal' && 'Gestión de Funcionarios de la Alcaldía'}
                  {activeTab === 'mapa' && 'Sala Situacional: Monitoreo GPS'}
                  {activeTab === 'taquilla' && 'Taquilla Municipal de Cobro'}
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Alcaldía del Municipio Rosario de Perijá • Control Fiscal y Recaudación Digital
                </p>
              </div>
            </div>

            {/* Right actions: BCV rate and refresh */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-400 font-mono shadow-inner">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>
                  Tasa BCV: Bs. {tasaBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                </span>
              </div>

              <button
                onClick={cargarDatosCompletos}
                disabled={loadingData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Recargar base de datos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">{loadingData ? 'Cargando...' : 'Actualizar'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* TAB 1: KPIS & EXECUTIVE DASHBOARD (Matches boss screenshot 100%) */}
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

              {/* Table of Latest Receipts */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>Últimos Recibos Fiscales Registrados</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('auditoria')}
                    className="text-xs text-sky-400 hover:underline font-semibold cursor-pointer"
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
                            <td className="p-3 font-mono font-bold text-emerald-400">
                              Bs. {Number(r.montoBs).toFixed(2)}
                            </td>
                            <td className="p-3">
                              <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px] font-semibold text-slate-300">
                                {r.metodo}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.estado === 'APROBADO'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                    : r.estado === 'PENDIENTE_VALIDACION'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {r.estado}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleVerReciboModal(r)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition-colors"
                              >
                                Ver Recibo
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

          {/* TAB 2: ANALÍTICAS */}
          {activeTab === 'analiticas' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 mb-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Reportes Ejecutivos y Contraloría Municipal</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">Analíticas de Recaudación & Operatividad</h2>
                  <p className="text-xs text-slate-400">
                    Monitoreo en tiempo real de ingresos por concepto de tasa de aseo urbano en Rosario de Perijá
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={exportarExcelContraloria}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Descargar Excel</span>
                  </button>
                  <button
                    onClick={exportarPdfContraloria}
                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Libro PDF</span>
                  </button>
                </div>
              </div>

              {/* Channels breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                  <div className="text-xs text-slate-400 font-medium">Pago Móvil Interbancario</div>
                  <div className="text-2xl font-black text-sky-400 mt-1 font-mono">{pctPagoMovil}%</div>
                  <div className="text-xs text-slate-400 mt-1">{recibosPagoMovil.length} transacciones registradas</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                  <div className="text-xs text-slate-400 font-medium">Taquilla Municipal (POS / Efectivo)</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{pctTaquillaPos}%</div>
                  <div className="text-xs text-slate-400 mt-1">{recibosTaquillaPos.length} recibos en sede</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                  <div className="text-xs text-slate-400 font-medium">Transferencia & Otros</div>
                  <div className="text-2xl font-black text-purple-400 mt-1 font-mono">{pctTransf}%</div>
                  <div className="text-xs text-slate-400 mt-1">{recibosTransf.length} pagos conciliados</div>
                </div>
              </div>

              {/* Sector ranking and fleet */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-400" />
                    <span>Recaudación por Sector</span>
                  </h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {recaudacionPorSector.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <span className="font-semibold text-white">{s.sector}</span>
                        <div className="text-right">
                          <span className="font-mono text-emerald-400 font-bold">${s.totalUsd.toFixed(2)} USD</span>
                          <span className="text-slate-400 text-[10px] block">Bs. {s.totalBs.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-400" />
                    <span>Toneladas Recolectadas por Camión</span>
                  </h3>
                  <div className="space-y-3">
                    {camionesStats.map((c) => (
                      <div key={c.codigo} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-white">{c.codigo} (Capacidad {c.capacidad} Ton)</span>
                          <span className="font-mono text-sky-400 font-bold">{c.toneladas.toFixed(1)} Ton ({c.pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, c.pct)}%` }}></div>
                        </div>
                        <div className="text-[10px] text-slate-400">Rutas: {c.rutas}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDITORÍA DE FOLIOS */}
          {activeTab === 'auditoria' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-sky-400" />
                      <span>Libro Diario de Ingresos Inmutable (Contraloría Municipal)</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Registro legal secuencial de todos los folios emitidos bajo estricta trazabilidad contable.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={exportarExcelContraloria}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel Contraloría</span>
                    </button>
                    <button
                      onClick={exportarPdfContraloria}
                      className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Libro PDF</span>
                    </button>
                  </div>
                </div>

                {/* Filter bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={searchAuditoria}
                      onChange={(e) => setSearchAuditoria(e.target.value)}
                      placeholder="Buscar por correlativo, recibo, cédula, nombre o sector..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <select
                    value={filtroEstadoAuditoria}
                    onChange={(e) => setFiltroEstadoAuditoria(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
                  >
                    <option value="TODOS">Todos los Estados</option>
                    <option value="APROBADO">Solvente / Aprobado</option>
                    <option value="PENDIENTE_VALIDACION">Pendiente Validación</option>
                    <option value="RECHAZADO">Rechazado</option>
                  </select>
                </div>

                {/* Receipts Table */}
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-3">Folio</th>
                        <th className="p-3">Recibo Fiscal</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Cédula</th>
                        <th className="p-3">Contribuyente</th>
                        <th className="p-3">Sector</th>
                        <th className="p-3">Monto USD</th>
                        <th className="p-3">Monto Bs.</th>
                        <th className="p-3">Método</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {recibosFiltradosAuditoria.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-850/50">
                          <td className="p-3 font-mono font-bold text-slate-400">#{r.folioCorrelativo}</td>
                          <td className="p-3 font-mono font-bold text-sky-400">{r.numeroReciboFiscal}</td>
                          <td className="p-3 text-slate-400">{r.fecha}</td>
                          <td className="p-3 font-mono text-slate-300">{r.cedula}</td>
                          <td className="p-3 font-semibold text-white">{r.contribuyente}</td>
                          <td className="p-3 text-slate-300">{r.sector}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">${Number(r.montoUsd).toFixed(2)}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">Bs. {Number(r.montoBs).toFixed(2)}</td>
                          <td className="p-3 text-slate-300">{r.metodo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.estado === 'APROBADO'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                  : r.estado === 'PENDIENTE_VALIDACION'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {r.estado}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleVerReciboModal(r)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                                title="Ver comprobante"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
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
                                  } catch (err) {
                                    alert('Error al generar certificado de solvencia');
                                  }
                                }}
                                className="p-1.5 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/30 rounded-lg transition"
                                title="Certificado Solvencia PDF"
                              >
                                <Award className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VALIDAR PAGOS DIGITALES */}
          {activeTab === 'validar' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Clock className="w-6 h-6 text-amber-400" />
                      <span>Bandeja de Pagos Digitales para Conciliación</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Verifica las transferencias y pagos móviles reportados por los ciudadanos antes de la aprobación fiscal final.
                    </p>
                  </div>

                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                    <button
                      onClick={() => setFiltroValidar('PENDIENTES')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        filtroValidar === 'PENDIENTES' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Pendientes ({totalDigitalesPendientes})
                    </button>
                    <button
                      onClick={() => setFiltroValidar('APROBADOS')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        filtroValidar === 'APROBADOS' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      Aprobados
                    </button>
                    <button
                      onClick={() => setFiltroValidar('RECHAZADOS')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        filtroValidar === 'RECHAZADOS' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      Rechazados
                    </button>
                  </div>
                </div>

                {recibosFiltradosValidar.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No hay pagos digitales en esta bandeja.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Recibo</th>
                          <th className="p-3">Contribuyente</th>
                          <th className="p-3">Sector</th>
                          <th className="p-3">Monto Bs.</th>
                          <th className="p-3">Monto USD</th>
                          <th className="p-3">Referencia</th>
                          <th className="p-3">Comprobante</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3 text-center">Acción Fiscal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {recibosFiltradosValidar.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-850/50">
                            <td className="p-3 font-mono font-bold text-sky-400">{r.numeroReciboFiscal}</td>
                            <td className="p-3">
                              <div className="font-bold text-white">{r.contribuyente}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{r.cedula}</div>
                            </td>
                            <td className="p-3 text-slate-300">{r.sector}</td>
                            <td className="p-3 font-mono font-bold text-emerald-400">Bs. {Number(r.montoBs).toFixed(2)}</td>
                            <td className="p-3 font-mono text-slate-300">${Number(r.montoUsd).toFixed(2)}</td>
                            <td className="p-3 font-mono text-amber-300">{r.referencia || 'N/A'}</td>
                            <td className="p-3">
                              {r.comprobanteUrl ? (
                                <button
                                  onClick={() => setComprobanteModalUrl(r.comprobanteUrl)}
                                  className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-bold"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Ver Captura</span>
                                </button>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Sin captura</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  r.estado === 'APROBADO'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                    : r.estado === 'PENDIENTE_VALIDACION'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {r.estado}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {r.estado === 'PENDIENTE_VALIDACION' ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleValidarPago(r, true)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow transition"
                                  >
                                    Aprobar
                                  </button>
                                  <button
                                    onClick={() => handleValidarPago(r, false)}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow transition"
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px] font-mono">Conciliado</span>
                              )}
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

          {/* TAB 5: SECTORES & CALLES (With SectoresManagement Component) */}
          {activeTab === 'sectores' && (
            <SectoresManagement
              sectores={sectoresTarifas}
              parroquias={parroquias}
              tasaBcv={tasaBcv}
              onDataRefresh={cargarDatosCompletos}
              onVerEnMapa={handleVerEnMapa}
            />
          )}

          {/* TAB 6: ZONIFICACIÓN Y TARIFAS */}
          {activeTab === 'tarifas' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Settings className="w-6 h-6 text-sky-400" />
                      <span>Zonificación Tarifaria por Sector ({sectoresTarifas.length} Sectores del Municipio)</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configuración de montos diferenciados de la tasa de aseo urbano guardados en Base de Datos.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={searchTarifas}
                    onChange={(e) => setSearchTarifas(e.target.value)}
                    placeholder="Buscar sector por nombre o código..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectoresFiltrados.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex flex-col justify-between gap-3 shadow-md hover:border-slate-700 transition"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-xs font-bold text-sky-400">{s.codigo}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                            {s.estrato}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm mt-1">{s.nombre}</h4>
                        <p className="text-xs text-slate-400">{typeof s.parroquia === 'string' ? s.parroquia : s.parroquia?.nombre || 'El Rosario'}</p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                        <div>
                          <div className="text-base font-mono font-black text-emerald-400">
                            ${(s.tarifaUsd || 3).toFixed(2)} USD
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            Bs. {((s.tarifaUsd || 3) * tasaBcv).toFixed(2)}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setEditingTarifaSector(s);
                            setNuevoMontoTarifa(s.tarifaUsd || 3.0);
                            setNuevaDescTarifa(s.descripcion || '');
                          }}
                          className="px-3 py-1.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modificar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PERSONAL ALCALDÍA */}
          {activeTab === 'personal' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Users className="w-6 h-6" />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>Gestión de Funcionarios de la Alcaldía</span>
                        <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-600/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
                          {personalAlcaldia.length} Registrados
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Supervisores de campo, cuadrillas, empadronadores de censo, cajeros y auditores fiscales.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setFormNuevoPersonal({
                        nombres: '',
                        apellidos: '',
                        tipoDoc: 'V',
                        cedula: '',
                        email: '',
                        telefonoMovil: '',
                        rol: 'SUPERVISOR_CAMPO',
                        password: '',
                      });
                      setModalCrearPersonalOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Nuevo Funcionario</span>
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={searchPersonal}
                      onChange={(e) => setSearchPersonal(e.target.value)}
                      placeholder="Buscar por nombre, cédula o correo..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <select
                    value={filtroRolPersonal}
                    onChange={(e) => setFiltroRolPersonal(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer w-full sm:w-auto"
                  >
                    <option value="TODOS">Todos los Roles</option>
                    <option value="ADMIN">Administrador Fiscal</option>
                    <option value="SUPERVISOR_CAMPO">Supervisor de Cuadrilla</option>
                    <option value="CENSO">Empadronador de Censo</option>
                    <option value="CAJERO_TAQUILLA">Cajero de Taquilla</option>
                    <option value="AUDITOR_CONTRALORIA">Auditor Contraloría</option>
                  </select>
                </div>

                {/* Personal Table */}
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-3.5">Funcionario</th>
                        <th className="p-3.5">Cédula Laboral</th>
                        <th className="p-3.5">Correo Institucional</th>
                        <th className="p-3.5">Rol Asignado</th>
                        <th className="p-3.5">Estado</th>
                        <th className="p-3.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {personalFiltrado.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            No se encontraron funcionarios con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        personalFiltrado.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-850/50">
                            <td className="p-3.5">
                              <div className="font-bold text-white text-sm">
                                {p.nombres} {p.apellidos || ''}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{p.telefonoMovil || 'Sin teléfono'}</span>
                              </div>
                            </td>
                            <td className="p-3.5 font-mono text-slate-300">
                              <span className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                {p.cedulaRif}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-300 font-mono">{p.email || 'N/A'}</td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                {p.rol}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.activo !== false
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/30'
                                    : 'bg-rose-950/80 text-rose-400 border border-rose-600/30'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${p.activo !== false ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                                <span>{p.activo !== false ? 'Activo' : 'Inactivo'}</span>
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPersonal(p);
                                    setModalEditarPersonalOpen(true);
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                                  title="Editar funcionario"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setTargetPasswordPersonal(p.id);
                                    setTargetPasswordPersonalNombre(`${p.nombres} ${p.apellidos || ''}`);
                                    setNuevoPasswordPersonal('');
                                    setModalPasswordPersonalOpen(true);
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-amber-950/60 text-slate-300 hover:text-amber-400 rounded-lg transition"
                                  title="Cambiar contraseña"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleToggleEstadoPersonal(
                                      p.id,
                                      `${p.nombres} ${p.apellidos || ''}`,
                                      p.activo !== false
                                    )
                                  }
                                  className={`p-1.5 rounded-lg transition ${
                                    p.activo !== false
                                      ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400'
                                      : 'bg-slate-800 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-400'
                                  }`}
                                  title={p.activo !== false ? 'Desactivar acceso' : 'Reactivar acceso'}
                                >
                                  {p.activo !== false ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                </button>
                              </div>
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

          {/* TAB 8: MONITOREO GPS / MAPA */}
          {activeTab === 'mapa' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <MapPin className="w-6 h-6 text-emerald-400" />
                      <span>Geovisor Catastral e Inteligencia Territorial (GPS)</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Visualización satelital de sectores, viviendas censadas y geocercas en Rosario de Perijá.
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={filtroMapaSector}
                      onChange={(e) => setFiltroMapaSector(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="">Todos los Sectores</option>
                      {sectoresTarifas.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filtroMapaEstado}
                      onChange={(e) => setFiltroMapaEstado(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="TODOS">Todos los Estados</option>
                      <option value="SOLVENTE">Solventes</option>
                      <option value="PENDIENTE">Por Validar</option>
                      <option value="MORA">En Mora</option>
                    </select>
                  </div>
                </div>

                {/* Map Component */}
                <div className="h-[520px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                  <LeafletMap
                    initialCenter={mapCenter}
                    initialZoom={mapZoom}
                    sectoresPolygons={sectoresTarifas.map((s, idx) => ({
                      id: s.id,
                      name: s.nombre,
                      color: idx % 2 === 0 ? '#0284c7' : '#10b981',
                      coordinates: [
                        [s.centroLat || 10.318, s.centroLng || -72.315],
                        [(s.centroLat || 10.318) + 0.005, s.centroLng || -72.315],
                        [(s.centroLat || 10.318) + 0.005, (s.centroLng || -72.315) + 0.005],
                        [s.centroLat || 10.318, (s.centroLng || -72.315) + 0.005],
                      ],
                    }))}
                    reportesMarcadores={inmueblesFiltradosMapa
                      .filter((inm) => inm.latitud && inm.longitud)
                      .map((inm) => ({
                        id: inm.id,
                        lat: inm.latitud,
                        lng: inm.longitud,
                        tipo: inm.estadoCuenta === 'SOLVENTE' ? 'RESUELTO' : 'PENDIENTE',
                        folio: inm.codigoCatastral,
                        sector: inm.sectorNombre,
                        descripcion: `${inm.contribuyenteNombre} • Casa: ${inm.numeroCasaLocal}`,
                      }))}
                    onMarkerClick={(id: any) => {
                      const found = inmueblesCensados.find((i) => i.id === id);
                      if (found) setFichaCatastralModal(found);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: TAQUILLA */}
          {activeTab === 'taquilla' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Printer className="w-6 h-6 text-emerald-400" />
                      <span>Ventanilla de Cobro Rápido en Taquilla</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Emisión instantánea de Recibo Fiscal de Contraloría guardado directamente en Base de Datos.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCobroTaquilla} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Cédula o RIF del Contribuyente</label>
                    <input
                      type="text"
                      required
                      value={taquillaCedula}
                      onChange={(e) => setTaquillaCedula(e.target.value)}
                      placeholder="Ej. 14234567 o V-14234567"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Nombres y Apellidos</label>
                    <input
                      type="text"
                      value={taquillaNombre}
                      onChange={(e) => setTaquillaNombre(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Sector Catastral</label>
                    <select
                      value={taquillaSectorId}
                      onChange={(e) => setTaquillaSectorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {sectoresTarifas.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} (${(s.tarifaUsd || 3).toFixed(2)} USD)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Método de Pago</label>
                    <select
                      value={metodoTaquilla}
                      onChange={(e) => setMetodoTaquilla(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="PUNTO_VENTA">Punto de Venta (Tarjeta Débito/Crédito)</option>
                      <option value="EFECTIVO_BS">Efectivo en Bolívares</option>
                      <option value="EFECTIVO_USD">Efectivo en Dólares ($)</option>
                      <option value="PAGO_MOVIL">Pago Móvil Recibido en Caja</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Monto en USD</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={montoTaquillaUsd}
                      onChange={(e) => setMontoTaquillaUsd(parseFloat(e.target.value) || 3)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-emerald-400 text-base font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs text-amber-400 font-mono mt-1 block">
                      Total a Cobrar: Bs. {(montoTaquillaUsd * tasaBcv).toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Dirección / Detalle</label>
                    <input
                      type="text"
                      value={taquillaUbicacion}
                      onChange={(e) => setTaquillaUbicacion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2">
                    <button
                      type="submit"
                      disabled={taquillaProcessing}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Printer className="w-5 h-5" />
                      <span>{taquillaProcessing ? 'Liquidando Cobro...' : 'Liquidar y Emitir Recibo Fiscal'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Modificar Tarifa */}
      {editingTarifaSector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Modificar Tarifa: {editingTarifaSector.nombre}</h3>
            <form onSubmit={handleGuardarTarifaSector} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tarifa Mensual ($ USD)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={nuevoMontoTarifa}
                  onChange={(e) => setNuevoMontoTarifa(parseFloat(e.target.value) || 3)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-mono font-bold"
                />
                <span className="text-xs text-amber-400 font-mono mt-1 block">
                  Equivalente: Bs. {(nuevoMontoTarifa * tasaBcv).toFixed(2)}
                </span>
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
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold"
                >
                  {guardandoTarifa ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Crear Personal */}
      {modalCrearPersonalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Registrar Funcionario Municipal</h3>
            <form onSubmit={handleCrearPersonal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombres *</label>
                <input
                  type="text"
                  required
                  value={formNuevoPersonal.nombres}
                  onChange={(e) => setFormNuevoPersonal({ ...formNuevoPersonal, nombres: e.target.value })}
                  placeholder="Ej. Pedro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={formNuevoPersonal.apellidos}
                  onChange={(e) => setFormNuevoPersonal({ ...formNuevoPersonal, apellidos: e.target.value })}
                  placeholder="Ej. González"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Cédula de Identidad *</label>
                <input
                  type="text"
                  required
                  value={formNuevoPersonal.cedula}
                  onChange={(e) => setFormNuevoPersonal({ ...formNuevoPersonal, cedula: e.target.value })}
                  placeholder="Ej. 18234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Correo Institucional</label>
                <input
                  type="email"
                  value={formNuevoPersonal.email}
                  onChange={(e) => setFormNuevoPersonal({ ...formNuevoPersonal, email: e.target.value })}
                  placeholder="ej. pedro@rosariodeperija.gob.ve"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Rol Asignado</label>
                <select
                  value={formNuevoPersonal.rol}
                  onChange={(e) => setFormNuevoPersonal({ ...formNuevoPersonal, rol: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                >
                  <option value="SUPERVISOR_CAMPO">Supervisor de Cuadrilla</option>
                  <option value="CENSO">Empadronador de Censo</option>
                  <option value="CAJERO_TAQUILLA">Cajero de Taquilla</option>
                  <option value="AUDITOR_CONTRALORIA">Auditor Contraloría</option>
                  <option value="ADMIN">Administrador Fiscal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Contraseña Inicial</label>
                <input
                  type="password"
                  value={formNuevoPersonal.password}
                  onChange={(e) => setFormNuevoPersonal({ ...formNuevoPersonal, password: e.target.value })}
                  placeholder="Por defecto: ADMIN2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCrearPersonalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPersonal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  {guardandoPersonal ? 'Guardando...' : 'Crear Funcionario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Personal */}
      {modalEditarPersonalOpen && editingPersonal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Editar Funcionario</h3>
            <form onSubmit={handleActualizarPersonal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombres</label>
                <input
                  type="text"
                  required
                  value={editingPersonal.nombres}
                  onChange={(e) => setEditingPersonal({ ...editingPersonal, nombres: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={editingPersonal.apellidos || ''}
                  onChange={(e) => setEditingPersonal({ ...editingPersonal, apellidos: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Rol</label>
                <select
                  value={editingPersonal.rol}
                  onChange={(e) => setEditingPersonal({ ...editingPersonal, rol: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                >
                  <option value="SUPERVISOR_CAMPO">Supervisor de Cuadrilla</option>
                  <option value="CENSO">Empadronador de Censo</option>
                  <option value="CAJERO_TAQUILLA">Cajero de Taquilla</option>
                  <option value="AUDITOR_CONTRALORIA">Auditor Contraloría</option>
                  <option value="ADMIN">Administrador Fiscal</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEditarPersonalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPersonal}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold"
                >
                  {guardandoPersonal ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cambiar Password Personal */}
      {modalPasswordPersonalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Cambiar Contraseña: {targetPasswordPersonalNombre}</h3>
            <form onSubmit={handleCambiarPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={nuevoPasswordPersonal}
                  onChange={(e) => setNuevoPasswordPersonal(e.target.value)}
                  placeholder="Ingresa nueva contraseña"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalPasswordPersonalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPersonal}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
                >
                  {guardandoPersonal ? 'Guardando...' : 'Restablecer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ficha Catastral Oficial */}
      {fichaCatastralModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-sky-400">Ficha Catastral Oficial</span>
                <h3 className="text-lg font-black text-white mt-0.5">{fichaCatastralModal.codigoCatastral}</h3>
              </div>
              <button
                onClick={() => setFichaCatastralModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Contribuyente Registrado</div>
                <div><strong>Nombre:</strong> {fichaCatastralModal.contribuyenteNombre}</div>
                <div><strong>Cédula / RIF:</strong> {fichaCatastralModal.contribuyenteCedula}</div>
                <div><strong>Teléfono:</strong> {fichaCatastralModal.contribuyenteTelefono}</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Dirección Catastral</div>
                <div><strong>Sector:</strong> {fichaCatastralModal.sectorNombre}</div>
                <div><strong>Calle:</strong> {fichaCatastralModal.calleNombre}</div>
                <div><strong>Casa/Local:</strong> {fichaCatastralModal.numeroCasaLocal}</div>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Modificar Estado de Solvencia Fiscal:</label>
              <div className="flex flex-wrap gap-2">
                {['SOLVENTE', 'PENDIENTE', 'MORA', 'EXONERADO'].map((est) => (
                  <button
                    key={est}
                    disabled={guardandoSolvencia}
                    onClick={() => handleUpdateSolvencia(fichaCatastralModal.id, est)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      fichaCatastralModal.estadoCuenta === est
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                        : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {est}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setFichaCatastralModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprobante Image Viewer Modal */}
      {comprobanteModalUrl && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">Comprobante de Pago Adjunto por el Ciudadano</h3>
              <button
                onClick={() => setComprobanteModalUrl(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-96 flex items-center justify-center">
              <img src={comprobanteModalUrl} alt="Comprobante" className="max-h-96 w-auto object-contain rounded-lg" />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setComprobanteModalUrl(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rechazarModalRecibo && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-red-400">
                  {rechazarModalRecibo.numeroReciboFiscal} • {rechazarModalRecibo.contribuyente}
                </div>
                <h3 className="font-bold text-white text-base mt-0.5 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span>Rechazar Pago y Notificar al Ciudadano</span>
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
                Escribe el motivo del rechazo. Este mensaje le aparecerá al ciudadano en su portal:
              </p>
              <textarea
                rows={3}
                value={motivoRechazoInput}
                onChange={(e) => setMotivoRechazoInput(e.target.value)}
                className="w-full bg-slate-950 border border-red-500/30 focus:border-red-500 rounded-xl p-3 text-xs text-white focus:outline-none"
              />
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
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {procesandoRechazo ? 'Rechazando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        recibo={reciboEmitido}
      />
    </div>
  );
}
