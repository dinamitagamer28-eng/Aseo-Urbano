'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LeafletMap from '@/components/LeafletMap';
import ReceiptModal, { ReciboData } from '@/components/ReceiptModal';
import {
  liquidarPagoEnTaquilla,
  validarPagoDigital,
  actualizarTarifaSector,
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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'kpis' | 'taquilla' | 'auditoria' | 'validar' | 'tarifas' | 'mapa'>('kpis');
  const [tasaBcv, setTasaBcv] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && (session?.user as any)?.rol !== 'ADMIN')) {
      router.push('/login');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetch('https://ve.dolarapi.com/v1/dolares/oficial')
      .then(res => res.json())
      .then(data => { if (data && data.promedio) setTasaBcv(data.promedio); })
      .catch(err => console.error("Error tasa:", err));
  }, []);

  // Taquilla Cashier State
  const [taquillaCedula, setTaquillaCedula] = useState('14234567');
  const [metodoTaquilla, setMetodoTaquilla] = useState('PUNTO_VENTA');
  const [montoTaquillaUsd, setMontoTaquillaUsd] = useState(2.00);
  const [taquillaProcessing, setTaquillaProcessing] = useState(false);
  const [reciboEmitido, setReciboEmitido] = useState<ReciboData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Mocked/Synced Real-time Data for Admin
  const [recibosFiscales, setRecibosFiscales] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && (session?.user as any)?.rol !== 'ADMIN')) {
      router.push('/login');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.rol === 'ADMIN') {
      const load = async () => {
        try {
          const { obtenerRecibosAdmin } = await import('@/lib/actions');
          const recibos = await obtenerRecibosAdmin();
          const mapped = recibos.map((r: any) => ({
            id: r.id,
            folioCorrelativo: r.folioCorrelativo,
            numeroReciboFiscal: r.numeroReciboFiscal,
            fecha: new Date(r.createdAt).toLocaleString(),
            cedula: r.usuario.cedulaRif,
            contribuyente: r.usuario.nombres + ' ' + r.usuario.apellidos,
            inmueble: r.inmueble.codigoCatastral,
            sector: r.inmueble.sector.nombre,
            montoUsd: r.montoTotalUsd,
            tasaBcv: r.tasaBcvAplicada,
            montoBs: r.montoTotalBs,
            metodo: r.metodoPago,
            estado: r.estado,
            origen: r.origenPago,
            referencia: r.referenciaBancaria,
            comprobanteUrl: r.capturaComprobanteUrl,
          }));
          setRecibosFiscales(mapped);
        } catch (e) {
          console.error(e);
        }
      };
      load();
    }
  }, [status, session]);

  // Sector Dynamic Tariffs
  const [tarifasSectores, setTarifasSectores] = useState([
    { id: 'tar-1', sector: 'Sector Las Colinas (Piloto)', tipo: 'RESIDENCIAL', montoUsd: 2.00, desc: 'Tarifa social Las Colinas' },
    { id: 'tar-2', sector: 'Sector Las Colinas (Piloto)', tipo: 'COMERCIAL_PEQ', montoUsd: 8.00, desc: 'Comercios y bodegas' },
    { id: 'tar-3', sector: 'Sector Casco Central', tipo: 'RESIDENCIAL', montoUsd: 3.50, desc: 'Zona céntrica urbana' },
    { id: 'tar-4', sector: 'Sector Casco Central', tipo: 'COMERCIAL_GDE', montoUsd: 35.00, desc: 'Supermercados y mayoristas' },
    { id: 'tar-5', sector: 'Sector Noruega', tipo: 'RESIDENCIAL', montoUsd: 2.50, desc: 'Sector residencial medio' },
    { id: 'tar-6', sector: 'Sector El Carmen', tipo: 'RESIDENCIAL', montoUsd: 2.00, desc: 'Sector popular' },
  ]);

  // Taquilla Cashier Action
  const handleCobroTaquilla = (e: React.FormEvent) => {
    e.preventDefault();
    setTaquillaProcessing(true);

    const nextFolio = recibosFiscales.length + 1;
    const numFiscal = `ASEO-2026-${String(nextFolio).padStart(6, '0')}`;
    const montoBs = Math.round(montoTaquillaUsd * tasaBcv * 100) / 100;

    setTimeout(() => {
      const nuevoRecibo: any = {
        id: `rec-${nextFolio}`,
        folioCorrelativo: nextFolio,
        numeroReciboFiscal: numFiscal,
        cedula: `V-${taquillaCedula}`,
        contribuyente: 'Contribuyente en Taquilla',
        inmueble: 'COL-C02-028 (Las Colinas Casa #28)',
        sector: 'Sector Las Colinas',
        montoUsd: montoTaquillaUsd,
        tasaBcv: tasaBcv,
        montoBs: montoBs,
        metodo: metodoTaquilla,
        referencia: 'TAQ-VENTANILLA-01',
        estado: 'APROBADO',
        origen: 'TAQUILLA_MUNICIPAL',
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
        codigoQrHash: `QR-${numFiscal}-MUNICIPAL`,
        createdAt: new Date(),
        montoTotalUsd: montoTaquillaUsd,
        tasaBcvAplicada: tasaBcv,
        montoTotalBs: montoBs,
        metodoPago: metodoTaquilla,
        usuario: { nombres: 'María', apellidos: 'Pérez', tipoDoc: 'V', cedulaRif: taquillaCedula },
        inmuebleData: { codigoCatastral: 'COL-C02-028', numeroCasaLocal: 'Casa #28', sector: { nombre: 'Las Colinas' } },
      };

      setRecibosFiscales([nuevoRecibo, ...recibosFiscales]);
      setReciboEmitido(nuevoRecibo);
      setIsReceiptOpen(true);
      setTaquillaProcessing(false);
    }, 600);
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
    doc.text('LIBRO DIARIO DE RECAUDACIÓN CORRELATIVA DE ASEO URBANO', 148, 17, { align: 'center' });

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

  const handleValidarPago = async (id: string, aprobar: boolean) => {
    try {
      const { validarPagoDigital } = await import('@/lib/actions');
      await validarPagoDigital(id, 'admin-123', aprobar);
      setRecibosFiscales((prev) =>
        prev.map((r) => (r.id === id ? { ...r, estado: aprobar ? 'APROBADO' : 'RECHAZADO' } : r))
      );
    } catch (e) {
      alert("Error al validar");
    }
  };

  const totalBs = recibosFiscales.filter((r) => r.estado === 'APROBADO').reduce((acc, curr) => acc + curr.montoBs, 0);
  const totalUsd = recibosFiscales.filter((r) => r.estado === 'APROBADO').reduce((acc, curr) => acc + curr.montoUsd, 0);

  if (status === 'loading' || (session?.user as any)?.rol !== 'ADMIN') {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Verificando credenciales...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar tasaBcv={tasaBcv} />

      {/* Admin Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 py-4 px-6">
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

          {/* Quick Action Export Buttons & App Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
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
              activeTab === 'kpis'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>KPIs y Tablero</span>
          </button>

          <button
            onClick={() => setActiveTab('taquilla')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'taquilla'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Taquilla Municipal (Cajero)</span>
          </button>

          <button
            onClick={() => setActiveTab('auditoria')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'auditoria'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Auditoría Fiscal (Folios)</span>
          </button>

          <button
            onClick={() => setActiveTab('validar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'validar'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Validar Pagos Digitales ({recibosFiscales.filter((r) => r.estado === 'PENDIENTE_VALIDACION').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tarifas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'tarifas'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Zonificación & Tarifas por Sector</span>
          </button>

          <button
            onClick={() => setActiveTab('mapa')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'mapa'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Monitoreo en Mapa (Leaflet)</span>
          </button>
        </div>

        {/* TAB 1: KPIs & DASHBOARD */}
        {activeTab === 'kpis' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="text-xs text-slate-400 font-medium">Recaudación Neta Oficial</div>
                <div className="text-3xl font-black text-emerald-400 mt-1 font-mono">
                  Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Equivalente: <strong>${totalUsd.toFixed(2)} USD</strong> (Tasa BCV {tasaBcv})
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="text-xs text-slate-400 font-medium">Índice de Solvencia</div>
                <div className="text-3xl font-black text-sky-400 mt-1 font-mono">
                  78.5%
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Sector Las Colinas (314 / 400 viviendas)
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="text-xs text-slate-400 font-medium">Tonelaje Recolectado</div>
                <div className="text-3xl font-black text-amber-400 mt-1 font-mono">
                  42.5 <span className="text-lg font-normal text-slate-400">Tn</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Unidades: CAM-01 y CAM-02 en campo
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="text-xs text-slate-400 font-medium">Folios Fiscales Emitidos</div>
                <div className="text-3xl font-black text-purple-400 mt-1 font-mono">
                  #{recibosFiscales.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Secuencia inmutable sin saltos
                </div>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Últimos Recibos Fiscales Procesados
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Folio</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Cédula</th>
                      <th className="p-3">Contribuyente</th>
                      <th className="p-3">Monto Bs.</th>
                      <th className="p-3">Método</th>
                      <th className="p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recibosFiscales.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-850/50">
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
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {r.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    Emisión instantánea de Recibo Fiscal de Contraloría para contribuyentes en sede municipal.
                  </p>
                </div>
                <div className="bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full text-xs text-emerald-300 font-bold">
                  Cajero Activo: Elena Rincón (Taquilla 01)
                </div>
              </div>

              <form onSubmit={handleCobroTaquilla} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cédula / RIF del Vecino:
                    </label>
                    <input
                      type="text"
                      value={taquillaCedula}
                      onChange={(e) => setTaquillaCedula(e.target.value)}
                      placeholder="14234567"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Método de Cobro en Ventanilla:
                    </label>
                    <select
                      value={metodoTaquilla}
                      onChange={(e) => setMetodoTaquilla(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="PUNTO_VENTA">💳 Punto de Venta (Tarjeta)</option>
                      <option value="EFECTIVO_BS">💵 Efectivo en Bolívares</option>
                      <option value="EFECTIVO_USD">💵 Efectivo en Divisas ($ USD)</option>
                      <option value="PAGO_MOVIL">📲 Pago Móvil Conciliado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Monto Tarifa Base ($ USD):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={montoTaquillaUsd}
                      onChange={(e) => setMontoTaquillaUsd(parseFloat(e.target.value) || 2.0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <span className="text-xs text-slate-400">Total liquidado a Tasa Oficial BCV ({tasaBcv.toFixed(2)}):</span>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      Bs. {(Math.round(montoTaquillaUsd * tasaBcv * 100) / 100).toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={taquillaProcessing}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-emerald-600/30 flex items-center gap-2 transition-all"
                  >
                    <Printer className="w-5 h-5" />
                    <span>{taquillaProcessing ? 'Emitiendo...' : 'COBRAR & IMPRIMIR RECIBO FISCAL'}</span>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recibosFiscales.map((r) => (
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
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {r.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
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
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-400" />
                Bandeja de Pagos Digitales para Conciliación
              </h2>
              <p className="text-xs text-slate-400">
                Verifica las referencias bancarias de Pago Móvil reportadas por los ciudadanos antes de la aprobación fiscal final.
              </p>

              <div className="space-y-3">
                {recibosFiscales.map((recibo) => (
                  <div
                    key={recibo.id}
                    className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-400 text-sm">{recibo.numeroReciboFiscal}</span>
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{recibo.metodo}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm">{recibo.contribuyente} ({recibo.cedula})</h4>
                      <p className="text-xs text-slate-400">
                        Inmueble: {recibo.inmueble}   Referencia Bancaria: <strong className="text-amber-400 font-mono">{recibo.referencia}</strong>
                        {recibo.comprobanteUrl && (
                          <a href={recibo.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="ml-4 text-sky-400 underline font-semibold">Ver Comprobante</a>
                        )}
                      </p>
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        Monto: Bs. {rMonto(recibo.montoBs)} (${recibo.montoUsd.toFixed(2)} USD)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                          className={`px-3 py-1 rounded-full font-bold text-xs ${
                            recibo.estado === 'APROBADO' ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-600/40' : 'text-red-400 bg-red-950/60 border border-red-600/40'
                          }`}
                        >
                          {recibo.estado}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
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
                    Zonificación Tarifaria por Sector (Todo el Municipio)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configuración de montos diferenciados de la tasa de aseo según sector, estrato y tipo de inmueble.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Sector</th>
                      <th className="p-3">Tipo de Inmueble</th>
                      <th className="p-3">Tarifa Fijada ($ USD)</th>
                      <th className="p-3">Equivalente Hoy (Bs.)</th>
                      <th className="p-3">Base / Ordenanza</th>
                      <th className="p-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {tarifasSectores.map((tar) => (
                      <tr key={tar.id} className="hover:bg-slate-850/50">
                        <td className="p-3 font-bold text-white">{tar.sector}</td>
                        <td className="p-3">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-sky-300 font-semibold text-[11px]">
                            {tar.tipo}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400 text-sm">
                          ${tar.montoUsd.toFixed(2)} USD
                        </td>
                        <td className="p-3 font-mono text-amber-400 font-semibold">
                          Bs. {(tar.montoUsd * tasaBcv).toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-400">{tar.desc}</td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              const nuevo = prompt(`Ingrese nueva tarifa en USD para ${tar.sector} (${tar.tipo}):`, tar.montoUsd.toString());
                              if (nuevo && !isNaN(parseFloat(nuevo))) {
                                setTarifasSectores((prev) =>
                                  prev.map((t) => (t.id === tar.id ? { ...t, montoUsd: parseFloat(nuevo) } : t))
                                );
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                          >
                            Editar Tarifa
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

        {/* TAB 6: MONITOREO CARTOGRÁFICO EN VIVO (LEAFLET) */}
        {activeTab === 'mapa' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-400" />
                Monitoreo Cartográfico de Rutas e Incidencias en Las Colinas
              </h2>
              <p className="text-xs text-slate-400">
                Visualización satelital y vectorial de la geocerca de Las Colinas, camión activo e incidencias reportadas.
              </p>

              <div className="rounded-2xl overflow-hidden border border-slate-800">
                <LeafletMap
                  center={[10.3180, -72.3150]}
                  zoom={15}
                  height="450px"
                  interactive={true}
                  polygons={[
                    {
                      id: 'poly-colinas',
                      name: 'Sector Las Colinas (Geocerca Piloto)',
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
                      id: 'cam-01',
                      lat: 10.3181,
                      lng: -72.3151,
                      title: 'Camión 01 (Activo)',
                      description: 'Recolectando en Calle 2 Los Pinos. Operario: Roberto González',
                      type: 'truck',
                    },
                    {
                      id: 'inc-01',
                      lat: 10.3188,
                      lng: -72.3159,
                      title: 'Incidencia Nº INC-2026-00001',
                      description: 'Basura acumulada en esquina de la cancha',
                      type: 'incident',
                      status: 'RECIBIDO',
                      photoUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=60',
                    },
                    {
                      id: 'inc-02',
                      lat: 10.3176,
                      lng: -72.3145,
                      title: 'Incidencia Nº INC-2026-00002',
                      description: 'Poda de árboles retirada por cuadrilla',
                      type: 'incident',
                      status: 'RESUELTO',
                      photoUrl: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=60',
                    },
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
    </div>
  );
}

function rMonto(m: number) {
  return m.toFixed(2);
}
