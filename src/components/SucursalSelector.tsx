'use client';

import { useTransition } from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { cambiarSucursalAction } from '@/lib/auth-actions';

interface Props {
    sucursales: { id: number; nombre: string }[];
    activa: number | null;
    puedeConsolidado: boolean;
}

export default function SucursalSelector({ sucursales, activa, puedeConsolidado }: Props) {
    const [pending, start] = useTransition();
    if (sucursales.length <= 1 && !puedeConsolidado) {
        return (
            <div className="sucursal-pill"><Building2 size={13} style={{ color: '#FFD700' }} /> <span>{sucursales[0]?.nombre ?? 'Sin sucursal'}</span></div>
        );
    }
    return (
        <div className="sucursal-pill" style={{ opacity: pending ? 0.6 : 1 }}>
            <Building2 size={13} style={{ color: '#FFD700', flexShrink: 0 }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                    aria-label="Sucursal"
                    value={activa ?? 'todos'}
                    disabled={pending}
                    onChange={e => start(() => cambiarSucursalAction(e.target.value))}
                    style={{ background: 'transparent', color: '#fff', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', paddingRight: '1.2rem', border: 'none', outline: 'none', appearance: 'none', maxWidth: 200 }}
                >
                    {puedeConsolidado && <option value="todos" style={{ background: '#111' }}>🌐 Todas (consolidado)</option>}
                    {sucursales.map(s => <option key={s.id} value={s.id} style={{ background: '#111' }}>📍 {s.nombre}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 0, color: '#FFD700', pointerEvents: 'none' }} />
            </div>
        </div>
    );
}
