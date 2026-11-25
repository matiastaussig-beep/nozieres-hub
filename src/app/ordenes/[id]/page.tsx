import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText, CheckCircle2, Edit, Award, Download, Camera, Clock, User, Wrench, Phone } from 'lucide-react';
import db from '@/lib/db';
import { requireSesion, puedeVerSucursal, can } from '@/lib/auth';
import { listarArchivos } from '@/lib/files';
import { duracionMin, fmtDur, ESTADO_CLASE, ESTADO_LABEL } from '@/lib/queries';
import { fechaCorta } from '@/lib/tiempo';
import AvisoWhatsApp from '@/components/AvisoWhatsApp';

export const dynamic = 'force-dynamic';
const CAT: Record<string, string> = { foto_frente: 'Frente', foto_trasera: 'Trasera', foto_lateral_izq: 'Lateral izq.', foto_lateral_der: 'Lateral der.', foto_tablero: 'Tablero', foto_salida: 'Salida' };

export default async function OrdenDetalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ [k: string]: string | undefined }> }) {
    const ses = await requireSesion('ordenes.ver');
    const id = parseInt((await params).id); const sp = await searchParams;
    const o = db.prepare(`SELECT o.*, v.patente, v.marca, v.modelo, v.tipo_vehiculo, c.id cliente_id, c.nombre cliente_nombre, c.telefono, s.nombre sucursal_nombre
        FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id JOIN clientes c ON c.id = v.cliente_id LEFT JOIN sucursales s ON s.id = o.sucursal_id WHERE o.id = ?`).get(id) as any;
    if (!o || !puedeVerSucursal(ses, o.sucursal_id)) notFound();
    const archivos = listarArchivos({ ordenId: id });
    const fotos = archivos.filter(a => a.categoria in CAT);
    const pdfs = archivos.filter(a => a.categoria === 'presupuesto_pdf');
    const firma = archivos.find(a => a.categoria === 'firma');
    const otros = archivos.filter(a => a.categoria === 'otro');
    const listaServicios = [...JSON.parse(o.servicios_autos || '[]'), ...JSON.parse(o.servicios_camioneta || '[]'), ...JSON.parse(o.servicios_camion || '[]'), ...JSON.parse(o.complementos || '[]')] as string[];
    const puntos = db.prepare('SELECT puntos FROM puntos_historial WHERE orden_id = ? AND puntos > 0 LIMIT 1').get(id) as { puntos: number } | undefined;
    const abierta = o.estado === 'en_proceso';
    // Cartel emergente para acordarse de mandar el WhatsApp al abrir o cerrar la orden
    const aviso = (sp.avisar === 'recibimos' || sp.avisar === 'listo')
        ? db.prepare("SELECT id, destino, cuerpo FROM mensajes WHERE clave_unica = ? AND canal = 'whatsapp' AND estado IN ('manual','pendiente') AND destino IS NOT NULL").get(`${sp.avisar === 'recibimos' ? 'recibimos' : 'listo'}:${id}`) as { id: number; destino: string; cuerpo: string } | undefined
        : undefined;

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1rem' }}>
            {aviso && <AvisoWhatsApp mensajeId={aviso.id} destino={aviso.destino} cuerpo={aviso.cuerpo} titulo={sp.avisar === 'recibimos' ? 'Avisale al cliente que recibimos su vehículo' : 'Avisale al cliente que su vehículo está listo'} />}
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Orden #{String(id).padStart(4, '0')} · {o.patente} <span className={`badge ${ESTADO_CLASE[o.estado]}`}>{ESTADO_LABEL[o.estado] || o.estado}</span></h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>{[o.marca, o.modelo].filter(Boolean).join(' ')} · {o.sucursal_nombre}</p>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                    {abierta && can(ses.rol, 'ordenes.cerrar') && <Link href={`/ordenes/${id}/cerrar`} className="btn-primary"><CheckCircle2 size={18} /> Terminar orden</Link>}
                    <Link href={`/ordenes/${id}/imprimir`} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}><FileText size={18} /> Ficha / imprimir</Link>
                    {can(ses.rol, 'ordenes.editar') && <Link href={`/ordenes/${id}/editar`} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}><Edit size={18} /> Editar</Link>}
                    {!abierta && can(ses.rol, 'puntos.canje') && <Link href={`/ordenes/${id}/canje`} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }}><Award size={18} /> Puntos</Link>}
                </div>
            </div>
            {sp.cerrada && <p style={{ color: '#4ade80' }}>✓ Orden terminada{puntos ? ` · se acreditaron ${puntos.puntos} puntos al cliente` : ''}. El aviso al cliente va por mail y por WhatsApp (cartel de arriba).</p>}
            {sp.duplicada && <p style={{ color: '#fbbf24' }}>Este vehículo ya tenía una orden abierta: estás viendo esa.</p>}
            {sp.aviso && <p style={{ color: '#fbbf24' }}>⚠️ {sp.aviso}</p>}

            <div className="card-grid">
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}><User size={12} /> Cliente</div><b>{o.cliente_nombre}</b><br /><span style={{ fontSize: '.85rem' }}><Phone size={11} /> {o.telefono || 'sin teléfono'}</span></div>
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}><Wrench size={12} /> Técnico</div><b>{o.tecnico_asignado || 'Sin asignar'}</b></div>
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}><Clock size={12} /> Tiempo</div><b>{fmtDur(duracionMin(o))}</b><br /><span style={{ fontSize: '.8rem' }}>Ingreso {o.hora_ingreso || '-'}{o.cerrada_at ? ` · Fin ${o.hora_fin_real}` : ''}</span></div>
                <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.78rem' }}>Presupuesto (Boxer)</div><b>{o.presupuesto_nro || '—'}</b>
                    {pdfs.map(p => <div key={p.id}><a href={`/api/archivos/${p.id}`} target="_blank" className="btn-primary" style={{ marginTop: '.4rem', padding: '.3rem .7rem', fontSize: '.8rem' }}><Download size={13} /> Ver PDF</a></div>)}</div>
            </div>

            <div className="card" style={{ width: '100%' }}>
                <h3 style={{ marginBottom: '.5rem' }}>Trabajo a realizar</h3>
                {listaServicios.length ? <ul style={{ columns: 2, fontSize: '.9rem' }}>{listaServicios.map((s, i) => <li key={i}>✔ {s}</li>)}</ul> : <p style={{ color: 'var(--text-muted)' }}>Sin servicios tildados.</p>}
                {o.observaciones_cliente && <p style={{ marginTop: '.6rem' }}><b>Pedido del cliente:</b> {o.observaciones_cliente}</p>}
                {o.observaciones_tecnicas && <p style={{ marginTop: '.4rem' }}><b>Observaciones técnicas:</b> {o.observaciones_tecnicas}</p>}
                {o.proximo_servicio_fecha && <p style={{ marginTop: '.4rem' }}><b>Próximo service:</b> {fechaCorta(o.proximo_servicio_fecha)}{o.proximo_servicio_km ? ` o ${o.proximo_servicio_km} km` : ''}</p>}
            </div>

            {fotos.length > 0 && (
                <div className="card" style={{ width: '100%' }}>
                    <h3 style={{ marginBottom: '.6rem' }}><Camera size={16} /> Fotos</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '.6rem' }}>
                        {fotos.map(f => (<a key={f.id} href={`/api/archivos/${f.id}`} target="_blank">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/archivos/${f.id}`} alt={CAT[f.categoria]} loading="lazy" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} /><div style={{ fontSize: '.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>{CAT[f.categoria]}</div></a>))}
                    </div>
                </div>
            )}
            {(firma || otros.length > 0) && (
                <div className="card" style={{ width: '100%' }}>
                    {firma && <><h3>Firma del cliente</h3>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/archivos/${firma.id}`} alt="Firma" style={{ background: '#fff', borderRadius: 8, maxWidth: 360, width: '100%' }} /></>}
                    {otros.map(a => <div key={a.id}><a href={`/api/archivos/${a.id}`} target="_blank" style={{ color: 'var(--accent)' }}>📎 {a.nombre}</a></div>)}
                </div>
            )}
        </main>
    );
}
