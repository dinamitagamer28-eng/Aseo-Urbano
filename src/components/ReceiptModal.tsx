'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Download,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Printer,
  FileText,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReciboData {
  id: string;
  folioCorrelativo: number;
  numeroReciboFiscal: string;
  montoTotalUsd: number;
  tasaBcvAplicada: number;
  montoTotalBs: number;
  metodoPago: string;
  referenciaBancaria?: string | null;
  estado: string;
  codigoQrHash: string;
  createdAt: string | Date;
  observacionesFiscales?: string | null;
  inmueble?: {
    codigoCatastral: string;
    numeroCasaLocal: string;
    sector?: { nombre: string };
    calle?: { nombreCalle: string };
  };
  usuario?: {
    nombres: string;
    apellidos: string;
    tipoDoc: string;
    cedulaRif: string;
    telefonoMovil?: string;
  };
}

interface ReceiptModalProps {
  recibo: ReciboData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiptModal({ recibo, isOpen, onClose }: ReceiptModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (recibo?.codigoQrHash) {
      const verifyUrl = `${window.location.origin}/verificar/${recibo.numeroReciboFiscal}`;
      QRCode.toDataURL(verifyUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(setQrDataUrl);
    }
  }, [recibo]);

  if (!isOpen || !recibo) return null;

  const fechaFormateada = new Date(recibo.createdAt).toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const isRechazado = recibo.estado === 'RECHAZADO';
  const isPendiente = recibo.estado === 'PENDIENTE_VALIDACION' || recibo.estado === 'PENDIENTE';
  const isAprobado = recibo.estado === 'APROBADO';

  const descargarPdf = () => {
    const doc = new jsPDF();

    // Membrete Oficial
    const headerColor = isRechazado ? [220, 38, 38] : isPendiente ? [217, 119, 6] : [2, 132, 199];
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ALCALDÍA DEL MUNICIPIO ROSARIO DE PERIJÁ', 105, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('DIRECCIÓN DE SERVICIOS PÚBLICOS • COMPROBANTE DE RECAUDACIÓN FISCAL', 105, 17, { align: 'center' });

    // Folio y Datos
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`COMPROBANTE FISCAL: ${recibo.numeroReciboFiscal}`, 14, 36);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de Emisión: ${fechaFormateada}`, 14, 42);
    doc.text(`Folio Correlativo: Nº ${recibo.folioCorrelativo}`, 14, 47);

    // Contribuyente
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CONTRIBUYENTE E INMUEBLE:', 14, 57);
    doc.setFont('helvetica', 'normal');
    doc.text(`Contribuyente: ${recibo.usuario?.nombres} ${recibo.usuario?.apellidos}`, 14, 63);
    doc.text(`Cédula / RIF: ${recibo.usuario?.tipoDoc}-${recibo.usuario?.cedulaRif}`, 14, 68);
    doc.text(`Código Catastral: ${recibo.inmueble?.codigoCatastral || 'N/A'} (${recibo.inmueble?.numeroCasaLocal})`, 14, 73);
    doc.text(`Sector: ${recibo.inmueble?.sector?.nombre} - ${recibo.inmueble?.calle?.nombreCalle || 'Principal'}`, 14, 78);

    // Tabla de Liquidación
    autoTable(doc, {
      startY: 85,
      head: [['Concepto Gravado', 'Tarifa USD Base', 'Tasa Oficial BCV', 'Monto Liquidado Bs.']],
      body: [
        [
          'Tasa Mensual de Recolección de Aseo Urbano y Manejo de Desechos',
          `$${recibo.montoTotalUsd.toFixed(2)} USD`,
          `Bs. ${recibo.tasaBcvAplicada.toFixed(2)}`,
          `Bs. ${recibo.montoTotalBs.toFixed(2)}`,
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: headerColor as any, textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL PAGADO: Bs. ${recibo.montoTotalBs.toFixed(2)} (Equiv. $${recibo.montoTotalUsd.toFixed(2)} USD)`, 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Forma de Pago: ${recibo.metodoPago} | Ref: ${recibo.referenciaBancaria || 'TAQUILLA'}`, 14, finalY + 6);

    // Estado con color diferenciado
    if (isRechazado) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`ESTADO FISCAL: RECHAZADO (NO CONCILIADO)`, 14, finalY + 11);
      if (recibo.observacionesFiscales) {
        doc.setFontSize(8);
        doc.text(`Motivo: ${recibo.observacionesFiscales}`, 14, finalY + 16);
      }
    } else if (isPendiente) {
      doc.setTextColor(217, 119, 6);
      doc.setFont('helvetica', 'bold');
      doc.text(`ESTADO FISCAL: PENDIENTE POR VALIDACIÓN FISCAL`, 14, finalY + 11);
    } else {
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.text(`ESTADO FISCAL: APROBADO (SOLVENTE)`, 14, finalY + 11);
    }

    // Add QR code if available
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 150, finalY - 5, 40, 40);
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text('Escanee para verificar', 170, finalY + 38, { align: 'center' });
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Documento emitido conforme a las directrices de la Contraloría Municipal de Rosario de Perijá.',
      105,
      280,
      { align: 'center' }
    );

    doc.save(`Recibo-${recibo.numeroReciboFiscal}.pdf`);
  };

  const compartirWhatsApp = () => {
    const texto = `*Comprobante de Pago Aseo Urbano - Alcaldía Rosario de Perijá*%0A*Folio:* ${recibo.numeroReciboFiscal}%0A*Estado:* ${recibo.estado}%0A*Contribuyente:* ${recibo.usuario?.nombres} ${recibo.usuario?.apellidos}%0A*Inmueble:* ${recibo.inmueble?.codigoCatastral} (${recibo.inmueble?.sector?.nombre})%0A*Monto Pagado:* Bs. ${recibo.montoTotalBs.toFixed(2)} ($${recibo.montoTotalUsd.toFixed(2)} USD)%0A*Verificación:* ${window.location.origin}/verificar/${recibo.numeroReciboFiscal}`;
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Modal Header with dynamic status gradient */}
        <div
          className={`text-white p-4 flex justify-between items-center transition-colors ${
            isRechazado
              ? 'bg-gradient-to-r from-red-700 to-red-900'
              : isPendiente
              ? 'bg-gradient-to-r from-amber-600 to-amber-800'
              : 'bg-gradient-to-r from-sky-700 to-sky-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {isRechazado ? (
              <XCircle className="w-6 h-6 text-red-200 animate-pulse" />
            ) : isPendiente ? (
              <Clock className="w-6 h-6 text-amber-200 animate-spin" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            )}
            <div>
              <h3 className="font-bold text-base leading-none">Comprobante Oficial Fiscal</h3>
              <p className="text-xs text-white/80 mt-0.5">Alcaldía de Rosario de Perijá • RIF: G-2004984-7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Official Receipt */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Badge & Folio */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs font-bold text-slate-500 tracking-wider uppercase">Folio Fiscal Único</div>
              <div className="text-xl font-extrabold text-slate-900 font-mono">{recibo.numeroReciboFiscal}</div>
              <div className="text-xs text-slate-500 mt-0.5">Nº Correlativo: #{recibo.folioCorrelativo}</div>
            </div>

            {/* Dynamic Status Pill */}
            {isRechazado ? (
              <div className="flex items-center gap-1.5 bg-red-100 text-red-700 border-2 border-red-500 px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>RECHAZADO</span>
              </div>
            ) : isPendiente ? (
              <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 border-2 border-amber-500 px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>PENDIENTE POR VALIDACIÓN</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border-2 border-emerald-500 px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>APROBADO (SOLVENTE)</span>
              </div>
            )}
          </div>

          {/* Status Alert Explanations */}
          {isRechazado && (
            <div className="bg-red-50 border-2 border-red-500/40 rounded-xl p-3.5 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-1.5 font-extrabold text-red-700 uppercase tracking-wider text-[11px]">
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Pago Rechazado por la Administración Tributaria</span>
              </div>
              {recibo.observacionesFiscales && (
                <div className="bg-white p-2.5 rounded-lg border border-red-200 text-red-950 font-semibold shadow-sm">
                  <span className="block text-[10px] text-red-700 font-bold uppercase">Motivo del Rechazo:</span>
                  "{recibo.observacionesFiscales}"
                </div>
              )}
              <p className="text-red-700 text-[11px] font-medium leading-relaxed">
                Este pago no pudo ser conciliado con la cuenta receptora de la Alcaldía. Puedes corregir los datos o número de referencia y volver a enviarlo desde la pestaña <strong>Pagar Aseo</strong>.
              </p>
            </div>
          )}

          {isPendiente && (
            <div className="bg-amber-50 border-2 border-amber-500/40 rounded-xl p-3.5 space-y-1 text-xs animate-in fade-in">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-800 uppercase tracking-wider text-[11px]">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pago Pendiente por Conciliación Bancaria</span>
              </div>
              <p className="text-amber-800 text-[11px] font-medium leading-relaxed">
                Tu referencia <strong>{recibo.referenciaBancaria}</strong> ha sido registrada y está siendo validada por los auditores de la Alcaldía con el estado de cuenta bancario.
              </p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-500 block">Contribuyente:</span>
              <strong className="text-slate-800 text-sm">{recibo.usuario?.nombres} {recibo.usuario?.apellidos}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Cédula / RIF:</span>
              <strong className="text-slate-800 text-sm">{recibo.usuario?.tipoDoc}-{recibo.usuario?.cedulaRif}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Código Catastral:</span>
              <strong className="text-slate-800">{recibo.inmueble?.codigoCatastral || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Sector / Calle:</span>
              <strong className="text-slate-800">{recibo.inmueble?.sector?.nombre || 'Las Colinas'}</strong>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Tarifa Base fijada:</span>
              <span className="font-semibold">${recibo.montoTotalUsd.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Tasa Oficial BCV aplicada:</span>
              <span className="font-semibold">Bs. {recibo.tasaBcvAplicada.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Método de Pago:</span>
              <span className="font-semibold">{recibo.metodoPago} (Ref: {recibo.referenciaBancaria || 'Taquilla'})</span>
            </div>
            <div className="border-t border-sky-200 pt-2 flex justify-between items-baseline">
              <span className="font-bold text-slate-900 text-sm">TOTAL LIQUIDADO:</span>
              <div className="text-right">
                <div className="font-black text-xl text-sky-800">Bs. {recibo.montoTotalBs.toFixed(2)}</div>
                <div className="text-xs text-slate-500">($ {recibo.montoTotalUsd.toFixed(2)} USD)</div>
              </div>
            </div>
          </div>

          {/* QR Code and Validation */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Código QR Fiscal" className="w-20 h-20 rounded-lg border border-slate-200 bg-white p-1" />
            ) : (
              <div className="w-20 h-20 bg-slate-200 animate-pulse rounded-lg" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1">
                <span>Validación Contraloría Municipal</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Código QR inmutable respaldado por firma criptográfica y registro correlativo.
              </p>
              <div className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                {recibo.codigoQrHash}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
          <button
            onClick={descargarPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
          <button
            onClick={compartirWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
