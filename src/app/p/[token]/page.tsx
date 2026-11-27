import { notFound } from 'next/navigation';
import { datosPortalCliente } from '@/lib/portal';
import { tokenCertificado, baseUrl, cfg } from '@/lib/mensajes';
import { fechaCorta } from '@/lib/tiempo';
import QRCode from 'qrcode';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mi historial · Nozieres', robots: { index: false, follow: false } };

export default async function Portal({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const d = datosPortalCliente(token);
    if (!d) notFound();
    const tel = cfg('empresa_whatsapp').replace(/\D/g, '');
    const base = baseUrl();
    return (
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.2rem', color: '#e5e7eb' }}>
            <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Nozieres" style={{ height: 44, margin: '0 auto 8px' }} />
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Hola, {d.cliente.nombre.split(' ')[0]} 👋</h1>
                <p style={{ color: '#9ca3af', fontSize: '.9rem' }}>Acá está el historial de service de tus vehículos y tus puntos.</p>
            </header>
            <section className="card" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '.8rem', color: '#9ca3af' }}>Tus puntos Nozieres</div>
                <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#fbbf24' }}>⭐ {d.puntos.toLocaleString('es-AR')}</div>
                {d.canjeMinimo > 0 && (<div style={{ margin: '.6rem auto 0', maxWidth: 320 }}>
                    <div style={{ height: 8, borderRadius: 4, background: '#ffffff1a', overflow: 'hidden' }}><div style={{ width: `${Math.min(100, Math.round(d.puntos / d.canjeMinimo * 100))}%`, height: '100%', background: '#fbbf24' }} /></div>
                    <div style={{ fontSize: '.78rem', color: '#9ca3af', marginTop: 4 }}>{d.puntos >= d.canjeMinimo ? '¡Ya podés canjear tus puntos!' : `Te faltan ${(d.canjeMinimo - d.puntos).toLocaleString('es-AR')} puntos para poder canjear`}</div></div>)}
                <div style={{ fontSize: '.8rem', color: '#9ca3af', marginTop: '.4rem' }}>Canjealos en cualquiera de nuestras sucursales.</div>
            </section>
            {await Promise.all(d.vehiculos.map(async v => {
                const cert = v.actual && v.cert_token && base ? await QRCode.toDataURL(`${base}/v/${v.cert_token}`, { margin: 1, width: 160 }) : null;
                return (
                    <section key={`${v.vehiculo_id}-${v.desde}`} className="card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                            <div><div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: 1 }}>{v.patente}</div>
                                <div style={{ color: '#9ca3af', fontSize: '.9rem' }}>{[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}</div>
                                {!v.actual && <div style={{ fontSize: '.78rem', color: '#fbbf24' }}>Ya no es tuyo (hasta {fechaCorta(v.hasta)}). Se muestra sólo el historial de tu período.</div>}</div>
                            {cert && <div style={{ textAlign: 'center' }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={cert} alt="QR certificado" width={80} height={80} style={{ background: '#fff', borderRadius: 6 }} /><div style={{ fontSize: '.65rem', color: '#9ca3af' }}>Certificado</div></div>}
                        </div>
                        {v.actual && v.historial[0]?.proximo_fecha && <div style={{ background: '#fbbf2415', border: '1px solid #fbbf2455', borderRadius: 8, padding: '.5rem .7rem', margin: '.6rem 0', fontSize: '.85rem' }}>🔧 Próximo service: <b>{fechaCorta(v.historial[0].proximo_fecha)}</b>{v.historial[0].proximo_km ? ` o ${v.historial[0].proximo_km.toLocaleString('es-AR')} km` : ''}</div>}
                        {v.actual && v.cert_token && <p style={{ fontSize: '.78rem', color: '#9ca3af', margin: '.5rem 0' }}>Si vendés el vehículo, compartí su <a href={`/v/${v.cert_token}`} style={{ color: '#fbbf24' }}>certificado de historial</a>: el próximo dueño lo hereda.</p>}
                        {v.historial.length ? v.historial.map(h => (
                            <div key={h.id} style={{ borderTop: '1px solid #ffffff1a', padding: '.6rem 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{fechaCorta(h.fecha)}</b><span style={{ color: '#9ca3af', fontSize: '.85rem' }}>{h.km ? `${h.km.toLocaleString('es-AR')} km` : ''} · {h.sucursal}</span></div>
                                <div style={{ fontSize: '.85rem', color: '#d1d5db' }}>{h.servicios.length ? h.servicios.join(' · ') : 'Service realizado'}</div>
                                {h.proximo_fecha && <div style={{ fontSize: '.78rem', color: '#9ca3af' }}>Próximo service: {fechaCorta(h.proximo_fecha)}{h.proximo_km ? ` o ${h.proximo_km.toLocaleString('es-AR')} km` : ''}</div>}
                            </div>
                        )) : <p style={{ color: '#9ca3af', fontSize: '.85rem' }}>Todavía no hay servicios registrados.</p>}
                    </section>
                );
            }))}
            {d.movimientos.length > 0 && (
                <section className="card" style={{ marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1rem', marginBottom: '.4rem' }}>Movimientos de puntos</h2>
                    {d.movimientos.map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '.25rem 0' }}><span>{m.concepto}</span><b style={{ color: m.puntos > 0 ? '#4ade80' : '#f87171' }}>{m.puntos > 0 ? '+' : ''}{m.puntos}</b></div>)}
                </section>
            )}
            {tel && <p style={{ textAlign: 'center' }}><a href={`https://wa.me/${tel.length === 10 ? '549' + tel : tel}`} className="btn-primary">Pedir turno por WhatsApp</a></p>}
        </main>
    );
}
