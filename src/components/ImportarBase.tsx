'use client';
import { useState } from 'react';

type R = {
    ok: boolean; aplicado: boolean; error?: string; ordenes_nuevas: number; ordenes_ya_estaban: number; clientes_nuevos: number;
    vehiculos_nuevos: number; titulares_cambiados: number; puntos_movimientos: number; puntos_total: number; desde?: string; hasta?: string;
    porSucursal: Record<string, number>; avisos: string[]; backup?: string;
};

export default function ImportarBase() {
    const [archivo, setArchivo] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [r, setR] = useState<R | null>(null);
    const [err, setErr] = useState('');

    async function enviar(modo: 'vista' | 'aplicar') {
        setBusy(true); setErr('');
        try {
            const fd = new FormData(); fd.set('modo', modo); if (modo === 'vista' && archivo) fd.set('archivo', archivo);
            const resp = await fetch('/api/importar', { method: 'POST', body: fd });
            const j = await resp.json();
            if (!resp.ok || j.error) { setErr(j.error || 'Error'); if (modo === 'vista') setR(null); } else setR(j);
        } catch { setErr('No se pudo enviar el archivo. Probá de nuevo.'); }
        setBusy(false);
    }

    const card = { background: 'rgba(255,255,255,.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '1rem' } as const;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={card}>
                <p style={{ margin: '0 0 .6rem' }}>1. Elegí el archivo <b>nozieres.db</b> del sistema anterior (el que se actualiza en el Drive).</p>
                <input type="file" accept=".db,.sqlite,.sqlite3" onChange={e => { setArchivo(e.target.files?.[0] || null); setR(null); setErr(''); }} />
                <div style={{ marginTop: '.8rem' }}>
                    <button className="btn btn-primary" disabled={!archivo || busy} onClick={() => enviar('vista')}>{busy && !r ? 'Revisando…' : 'Ver qué se va a importar'}</button>
                </div>
            </div>
            {err && <div style={{ ...card, borderColor: '#ef4444', color: '#fca5a5' }}>⚠️ {err}</div>}
            {r && (
                <div style={{ ...card, borderColor: r.aplicado ? '#22c55e' : 'var(--glass-border)' }}>
                    <h3 style={{ marginTop: 0 }}>{r.aplicado ? '✅ Importación terminada' : '👀 Vista previa (todavía no se importó nada)'}</h3>
                    <ul style={{ lineHeight: 1.8, paddingLeft: '1.2rem' }}>
                        <li><b>{r.ordenes_nuevas}</b> servicios nuevos{r.desde ? <> (del {r.desde.slice(0, 10)} al {r.hasta?.slice(0, 10)})</> : null}</li>
                        <li>{r.ordenes_ya_estaban} servicios que ya estaban (no se tocan)</li>
                        <li>{r.clientes_nuevos} clientes nuevos · {r.vehiculos_nuevos} vehículos nuevos{r.titulares_cambiados ? ` · ${r.titulares_cambiados} traspasos` : ''}</li>
                        <li>{r.puntos_movimientos} movimientos de puntos (+{r.puntos_total} puntos)</li>
                        {Object.entries(r.porSucursal).map(([s, n]) => <li key={s}>Sucursal {s === '1' ? 'Central (Ledesma)' : s}: {n} servicios</li>)}
                    </ul>
                    {r.avisos.slice(0, 8).map((a, i) => <p key={i} style={{ color: '#fbbf24', margin: '.2rem 0' }}>⚠️ {a}</p>)}
                    {r.aplicado && r.backup && <p style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Se guardó una copia de seguridad previa antes de importar.</p>}
                    {!r.aplicado && r.ordenes_nuevas > 0 && (
                        <button className="btn btn-primary" disabled={busy} onClick={() => enviar('aplicar')} style={{ marginTop: '.6rem' }}>{busy ? 'Importando…' : `Importar ${r.ordenes_nuevas} servicios`}</button>
                    )}
                    {!r.aplicado && r.ordenes_nuevas === 0 && <p>No hay nada nuevo para importar: el Hub ya está al día con este archivo.</p>}
                </div>
            )}
        </div>
    );
}
