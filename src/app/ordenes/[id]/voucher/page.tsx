import db from '@/lib/db';
import { notFound } from 'next/navigation';
import { ArrowLeft, Printer, Award, CheckCircle2, ShieldCheck, Ticket } from 'lucide-react';
import Link from 'next/link';
import PrintSummaryButton from '@/components/PrintSummaryButton';
import { requireSesion, puedeVerSucursal } from '@/lib/auth';

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ puntos?: string; anteriores?: string; restantes?: string }>;
}

export default async function VoucherCanjePage({ params, searchParams }: Props) {
    const ses = await requireSesion('puntos.canje');
    const { id } = await params;
    const { puntos, anteriores, restantes } = await searchParams;

    const orden = db.prepare(`
        SELECT o.*, v.patente as vehiculo_patente, v.marca as vehiculo_marca, v.modelo as vehiculo_modelo,
               c.nombre as cliente_nombre, c.dni as cliente_dni, c.telefono as cliente_telefono,
               s.nombre as sucursal_nombre
        FROM ordenes_trabajo o
        JOIN vehiculos v ON o.vehiculo_id = v.id
        JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN sucursales s ON o.sucursal_id = s.id
        WHERE o.id = ?
    `).get(id) as any;

    if (!orden || !puedeVerSucursal(ses, orden.sucursal_id)) {
        notFound();
    }

    const ptsCanjeados = parseInt(puntos || '0');
    const ptsAnteriores = parseInt(anteriores || '0');
    const ptsRestantes = parseInt(restantes || '0');

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-2xl mx-auto font-sans">
            {/* Header de navegación (Oculto al imprimir) */}
            <div className="no-print flex justify-between items-center mb-6">
                <Link href={`/ordenes/${orden.id}/canje`} className="btn-secondary flex items-center gap-2 text-xs py-2 px-3">
                    <ArrowLeft size={16} /> Volver al canje de puntos
                </Link>
                <PrintSummaryButton />
            </div>

            {/* VOUCHER COMPROBANTE OFICIAL (Imprimible) */}
            <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-slate-100">
                
                {/* Encabezado de Marca */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-6 mb-6">
                    <div>
                        <div className="bg-white/95 p-2 rounded-xl inline-block mb-3 border border-slate-700 shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo.png" alt="Nozieres Lubricantes" className="h-8 object-contain" />
                        </div>
                        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                            <Ticket className="text-amber-400" size={22} /> VOUCHER DE CANJE DE PUNTOS
                        </h1>
                        <p className="text-xs text-amber-400 font-medium mt-1">
                            Comprobante Oficial de Fidelidad · Sucursal: {orden.sucursal_nombre || 'Central (Ledesma)'}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-400 block font-mono">Orden OT #{orden.id.toString().padStart(4, '0')}</span>
                        <span className="text-xs text-slate-400 block mt-0.5">
                            {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* Datos del Cliente y Vehículo */}
                <div className="grid grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-xs mb-6">
                    <div>
                        <p className="text-slate-400 font-medium">Titular de la Cuenta:</p>
                        <p className="text-sm font-bold text-white mt-0.5">{orden.cliente_nombre}</p>
                        <p className="text-slate-400 mt-0.5">DNI / ID: <strong className="text-slate-200">{orden.cliente_dni || 'N/A'}</strong></p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-400 font-medium">Vehículo Atendido:</p>
                        <p className="text-sm font-bold text-amber-400 mt-0.5">{orden.vehiculo_patente?.toUpperCase()}</p>
                        <p className="text-slate-400 mt-0.5">{orden.vehiculo_marca} {orden.vehiculo_modelo}</p>
                    </div>
                </div>

                {/* Detalle del Beneficio y Movimiento de Puntos */}
                <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-5 mb-6">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Award size={16} /> Resumen de Operación de Fidelización
                    </h3>

                    <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                            <span className="text-slate-400">Puntos Acumulados Anteriores:</span>
                            <span className="font-bold text-slate-200">{ptsAnteriores.toLocaleString()} pts</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                            <span className="text-slate-400 font-medium">Puntos Canjeados en esta Orden:</span>
                            <span className="font-extrabold text-amber-400 text-sm">- {ptsCanjeados.toLocaleString()} pts</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-slate-300 font-bold">Saldo Restante Actualizado:</span>
                            <span className="font-black text-emerald-400 text-base">
                                {ptsRestantes === 0 ? '0 pts (Saldo Agotado)' : `${ptsRestantes.toLocaleString()} pts`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* LEYENDA FORMAL DE SOLICITUD Y CONFORMIDAD */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-[11px] text-slate-300 leading-relaxed mb-8">
                    <p className="flex items-start gap-2">
                        <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5" />
                        <span>
                            <strong>CONSTANCIA DE CONFORMIDAD:</strong> El cliente <strong>{orden.cliente_nombre}</strong> (DNI: {orden.cliente_dni || 'N/A'}) solicitó expresamente la utilización y descuento de <strong>{ptsCanjeados} puntos</strong> de su programa de fidelidad Nozieres Lubricantes para la aplicación de beneficio/descuento en la Orden de Trabajo N° {orden.id}. Su saldo anterior de {ptsAnteriores} pts queda actualizado a <strong>{ptsRestantes === 0 ? '0 (Cero)' : ptsRestantes} pts disponibles</strong>.
                        </span>
                    </p>
                </div>

                {/* Firmas de Conformidad */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-800 text-center text-xs">
                    <div>
                        <div className="h-12 border-b border-dashed border-slate-700 mb-2"></div>
                        <p className="font-semibold text-slate-300">Firma del Cliente</p>
                        <p className="text-[10px] text-slate-400">{orden.cliente_nombre}</p>
                    </div>
                    <div>
                        <div className="h-12 border-b border-dashed border-slate-700 mb-2"></div>
                        <p className="font-semibold text-slate-300">Responsable de Taller</p>
                        <p className="text-[10px] text-slate-400">Nozieres Lubricantes</p>
                    </div>
                </div>

                <footer className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-900 pt-4">
                    Comprobante generado electrónicamente por Nozieres Hub Multi-Sucursal.
                </footer>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    .no-print, nav, header { display: none !important; }
                    body { background: white !important; color: black !important; }
                    main { padding: 0 !important; max-width: 100% !important; }
                    .bg-slate-900, .bg-slate-950, .bg-slate-950\\/70, .bg-slate-950\\/80 { background: white !important; color: black !important; border-color: #ccc !important; }
                    .text-white, .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-400 { color: black !important; }
                    .text-amber-400 { color: #b45309 !important; }
                    .text-emerald-400 { color: #15803d !important; }
                    * { box-shadow: none !important; text-shadow: none !important; }
                }
            `}} />
        </main>
    );
}
