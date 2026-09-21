import React from 'react';
import Navbar from '@/components/Navbar';
import prisma from '@/lib/prisma';
import { getTasaBcvActual } from '@/lib/bcv';
import { ShieldCheck, CheckCircle2, AlertTriangle, FileText, ArrowLeft, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface VerifyPageProps {
  params: Promise<{ folio: string }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { folio } = await params;
  const tasaBcv = await getTasaBcvActual();

  const recibo = await prisma.reciboPago.findFirst({
    where: {
      numeroReciboFiscal: folio,
    },
    include: {
      inmueble: {
        include: { sector: true, calle: true },
      },
      usuario: true,
      validadoPor: true,
    },
  });

  const isRechazado = recibo?.estado === 'RECHAZADO';
  const isPendiente = recibo?.estado === 'PENDIENTE_VALIDACION' || recibo?.estado === 'PENDIENTE';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-600 selection:text-slate-900">
      <Navbar tasaBcv={tasaBcv.valorUsdBs} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 space-y-6">
        <div className="text-center space-y-2">
          <div
            className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg ${
              isRechazado
                ? 'bg-red-500/20 border border-red-500/40 text-red-400 shadow-red-500/10'
                : isPendiente
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-amber-500/10'
                : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-emerald-500/10'
            }`}
          >
            {isRechazado ? (
              <XCircle className="w-9 h-9" />
            ) : isPendiente ? (
              <Clock className="w-9 h-9" />
            ) : (
              <ShieldCheck className="w-9 h-9" />
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900">Validación de Comprobante Fiscal</h1>
          <p className="text-xs text-slate-600">
            Contraloría Municipal y Dirección de Servicios Públicos • Rosario de Perijá
          </p>
        </div>

        {recibo ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-slate-800">
            {/* Status Header */}
            <div
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 border ${
                isRechazado
                  ? 'bg-red-50 border-red-200'
                  : isPendiente
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {isRechazado ? (
                  <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                ) : isPendiente ? (
                  <Clock className="w-6 h-6 text-amber-400 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {isRechazado
                      ? 'Comprobante Fiscal Rechazado (No Válido)'
                      : isPendiente
                      ? 'Comprobante Pendiente por Validación Fiscal'
                      : 'Comprobante Fiscal Válido y Auténtico'}
                  </h3>
                  <p
                    className={`text-[11px] ${
                      isRechazado ? 'text-red-700 font-semibold' : isPendiente ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'
                    }`}
                  >
                    {isRechazado
                      ? 'El pago reportado fue desestimado en la conciliación.'
                      : isPendiente
                      ? 'En cola de verificación bancaria con la Alcaldía.'
                      : 'Asentado en los libros contables de la Alcaldía.'}
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 font-black rounded-lg text-xs tracking-wider ${
                  isRechazado
                    ? 'bg-red-600 text-slate-900'
                    : isPendiente
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {recibo.estado}
              </span>
            </div>

            {/* Inmutable Folio Block */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-xs text-slate-600">Número de Recibo Fiscal:</span>
              <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                {recibo.numeroReciboFiscal}
              </div>
              <div className="text-xs text-slate-500">
                Folio Correlativo Inmutable: <strong>#{recibo.folioCorrelativo}</strong>
              </div>
            </div>

            {/* Details Table */}
            <div className="space-y-3 text-xs divide-y divide-slate-200">
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Contribuyente:</span>
                <strong className="text-slate-900">{recibo.usuario.nombres} {recibo.usuario.apellidos}</strong>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-slate-400">Cédula / RIF:</span>
                <strong className="text-slate-900 font-mono">{recibo.usuario.tipoDoc}-{recibo.usuario.cedulaRif}</strong>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-slate-400">Código Catastral:</span>
                <strong className="text-slate-800">{recibo.inmueble.codigoCatastral} ({recibo.inmueble.numeroCasaLocal})</strong>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-slate-400">Sector / Parroquia:</span>
                <strong className="text-slate-800">{recibo.inmueble.sector.nombre}</strong>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-slate-400">Tasa Oficial BCV Aplicada:</span>
                <strong className="text-amber-400 font-mono">Bs. {recibo.tasaBcvAplicada.toFixed(2)}</strong>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-slate-400">Forma de Pago / Ref:</span>
                <strong className="text-slate-800">{recibo.metodoPago} ({recibo.referenciaBancaria || 'Taquilla'})</strong>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-slate-400">Fecha y Hora de Emisión:</span>
                <strong className="text-slate-700">{new Date(recibo.createdAt).toLocaleString('es-VE')}</strong>
              </div>

              <div className="flex justify-between items-baseline pt-4">
                <span className="text-sm font-bold text-slate-900">TOTAL CANCELADO:</span>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    Bs. {recibo.montoTotalBs.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">
                    (${recibo.montoTotalUsd.toFixed(2)} USD)
                  </div>
                </div>
              </div>
            </div>

            {/* QR Token Fingerprint */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-600 truncate">
              Firma criptográfica: {recibo.codigoQrHash}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 text-slate-800">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Comprobante no encontrado</h3>
            <p className="text-xs text-slate-600">
              No se localizó ningún recibo fiscal con el folio <strong>{folio}</strong> en la base de datos municipal.
            </p>
          </div>
        )}

        <div className="text-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Portal Principal</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
