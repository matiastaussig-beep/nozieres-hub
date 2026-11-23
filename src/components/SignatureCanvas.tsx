'use client';

import { useRef, useEffect, useState } from 'react';
import { RotateCcw, PenLine } from 'lucide-react';

/** Firma con el dedo o el mouse. Se guarda como PNG tinta negra sobre fondo blanco (sirve para imprimir). */
export default function SignatureCanvas({ name = 'firma_cliente' }: { name?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [hasSig, setHasSig] = useState(false);
    const [value, setValue] = useState('');

    const paintBg = () => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.strokeStyle = '#111827'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    };
    useEffect(paintBg, []);

    const pos = (e: React.PointerEvent) => {
        const c = ref.current!, r = c.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
    };
    const down = (e: React.PointerEvent) => { e.preventDefault(); ref.current!.setPointerCapture(e.pointerId); drawing.current = true; last.current = pos(e); };
    const move = (e: React.PointerEvent) => {
        if (!drawing.current || !last.current) return;
        const ctx = ref.current!.getContext('2d')!, p = pos(e);
        ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        last.current = p; if (!hasSig) setHasSig(true);
    };
    const up = () => { if (!drawing.current) return; drawing.current = false; last.current = null; setValue(ref.current!.toDataURL('image/png')); };
    const clear = () => { paintBg(); setHasSig(false); setValue(''); };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.85rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><PenLine size={14} />{hasSig ? <b style={{ color: '#4ade80' }}>✓ Firma registrada</b> : 'Firmá con el dedo en el recuadro'}</span>
                {hasSig && <button type="button" onClick={clear} style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', color: '#ef4444', padding: '.25rem .6rem', borderRadius: 8, cursor: 'pointer' }}><RotateCcw size={12} /> Borrar</button>}
            </div>
            <canvas ref={ref} width={800} height={260} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
                style={{ width: '100%', height: 220, border: `2px dashed ${hasSig ? 'rgba(74,222,128,.6)' : 'var(--glass-border)'}`, borderRadius: 12, background: '#fff', touchAction: 'none', cursor: 'crosshair' }} />
            <input type="hidden" name={name} value={value} />
        </div>
    );
}
