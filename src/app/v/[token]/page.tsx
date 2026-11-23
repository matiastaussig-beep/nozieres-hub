import { notFound } from 'next/navigation';
import { datosCertificado } from '@/lib/portal';
import { fechaCorta } from '@/lib/tiempo';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Certificado de historial · Nozieres', robots: { index: false, follow: false } };

/** Certificado público del historial de mantenimiento de un dominio. No muestra datos del titular. */
export default async function Certificado({ params }: { params: Promise<{ token: string }> }) {
    const d = datosCertificado((await params).token);
    if (!d) notFound();
    const v = d.vehiculo;
    return (
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.2rem', color: '#e5e7eb' }}>
            <header style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Nozieres" style={{ height: 44, margin: '0 auto 8px' }} />
                <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Certificado de historial de mantenimiento</h1>
                <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: 2, margin: '.4rem 0' }}>{v.patente}</div>
                <div style={{ color: '#9ca3af' }}>{[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}</div>
            </header>
            <p style={{ fontSize: '.85rem', color: '#9ca3af', marginBottom: '1rem' }}>Servicios registrados por Nozieres Lubricantes para este dominio. {d.historial.length} {d.historial.length === 1 ? 'registro' : 'registros'}.</p>
            {d.historial.map(h => (
                <div key={h.id} className="card" style={{ marginBottom: '.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{fechaCorta(h.fecha)}</b><span style={{ color: '#9ca3af', fontSize: '.85rem' }}>{h.km ? `${h.km.toLocaleString('es-AR')} km` : ''} · {h.sucursal}</span></div>
                    <div style={{ fontSize: '.88rem', color: '#d1d5db' }}>{h.servicios.length ? h.servicios.join(' · ') : 'Service realizado'}</div>
                </div>
            ))}
            {!d.historial.length && <p>Este dominio todavía no tiene servicios registrados.</p>}
        </main>
    );
}
