'use client';

import { useState, useTransition } from 'react';
import { marcarAvisoOrdenAction } from '@/lib/taller-actions';

/** Cartel emergente al abrir o cerrar una orden: recuerda mandar el WhatsApp al cliente. Si no se manda, el mensaje queda en la bandeja de Mensajes. */
export default function AvisoWhatsApp({ mensajeId, destino, cuerpo, titulo }: { mensajeId: number; destino: string; cuerpo: string; titulo: string }) {
    const [abierto, setAbierto] = useState(true);
    const [, start] = useTransition();
    if (!abierto) return null;
    const cerrar = (estado?: 'enviado' | 'descartado') => { if (estado) start(() => { marcarAvisoOrdenAction(mensajeId, estado); }); setAbierto(false); };
    return (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: '.9rem', border: '1px solid #25D366' }}>
                <h2 style={{ margin: 0 }}>💬 {titulo}</h2>
                <p style={{ margin: 0, fontSize: '.9rem', color: 'var(--text-muted)' }}>No te olvides de avisarle al cliente. Se abre WhatsApp con el mensaje listo; solo tenés que tocar enviar.</p>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '.9rem', background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '.8rem' }}>{cuerpo}</div>
                <a href={`https://wa.me/${destino}?text=${encodeURIComponent(cuerpo)}`} target="_blank" rel="noopener noreferrer" className="btn-primary"
                   style={{ background: 'rgba(37,211,102,.18)', color: '#25D366', border: '1px solid rgba(37,211,102,.4)', textAlign: 'center', justifyContent: 'center', fontSize: '1.05rem' }}>
                    Abrir WhatsApp
                </a>
                <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn-primary" onClick={() => cerrar('enviado')}>Ya lo envié</button>
                    <button type="button" className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'white', border: '1px solid var(--glass-border)' }} onClick={() => cerrar()}>Más tarde (queda en Mensajes)</button>
                </div>
            </div>
        </div>
    );
}
