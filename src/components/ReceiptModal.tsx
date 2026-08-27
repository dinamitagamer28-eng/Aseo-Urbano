'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Share2, CheckCircle2, ShieldCheck, Printer, FileText } from 'lucide-react';
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

  const descargarPdf = () => {
    const doc = new jsPDF();

    // Membrete Oficial
    doc.setFillColor(2, 132, 199);
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
    doc.text(`Sector: ${recibo.inmueble?.sector?.nombre} - ${recibo.inmueble?.calle?.nombreCalle}`, 14, 78);

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
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL PAGADO: Bs. ${recibo.montoTotalBs.toFixed(2)} (Equiv. $${recibo.montoTotalUsd.toFixed(2)} USD)`, 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Forma de Pago: ${recibo.metodoPago} | Ref: ${recibo.referenciaBancaria || 'TAQUILLA'}`, 14, finalY + 6);
    doc.text(`Estado Fiscal: ${recibo.estado}`, 14, finalY + 11);

    // Add QR code if available
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 150, finalY - 5, 40, 40);
      doc.setFontSize(7);
      doc.text('Escanee para verificar', 170, finalY + 38, { align: 'center' });
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Documento emitido conforme a las directrices de la Contraloría Municipal de Rosario de Perijá.',
      105,
      280,
      { align: 'center' }
    );

    doc.save(`Recibo-${recibo.numeroReciboFiscal}.pdf`);
  };

  const compartirWhatsApp = () => {
    const texto = `*Comprobante de Pago Aseo Urbano - Alcaldía Rosario de Perijá*%0A*Folio:* ${recibo.numeroReciboFiscal}%0A*Contribuyente:* ${recibo.usuario?.nombres} ${recibo.usuario?.apellidos}%0A*Inmueble:* ${recibo.inmueble?.codigoCatastral} (${recibo.inmueble?.sector?.nombre})%0A*Monto Pagado:* Bs. ${recibo.montoTotalBs.toFixed(2)} ($${recibo.montoTotalUsd.toFixed(2)} USD)%0A*Verificación:* ${window.location.origin}/verificar/${recibo.numeroReciboFiscal}`;
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-700 to-sky-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base leading-none">Comprobante Oficial Fiscal</h3>
              <p className="text-xs text-sky-200 mt-0.5">Alcaldía de Rosario de Perijá • RIF: G-2004984-7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-sky-800 hover:bg-sky-700 text-sky-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Official Receipt */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Badge & Folio */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs font-bold text-sky-700 tracking-wider uppercase">Folio Fiscal Único</div>
              <div className="text-xl font-extrabold text-slate-900 font-mono">{recibo.numeroReciboFiscal}</div>
              <div className="text-xs text-slate-500 mt-0.5">Nº Correlativo: #{recibo.folioCorrelativo}</div>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{recibo.estado}</span>
            </div>
          </div>

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
