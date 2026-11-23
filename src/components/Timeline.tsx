'use client';

import React from 'react';
import { Capacitacion } from '@/lib/actions';

interface TimelineProps {
    capacitaciones: Capacitacion[];
}

const Timeline: React.FC<TimelineProps> = ({ capacitaciones }) => {
    // Generar los últimos 4 meses y los próximos 2 para el rango del timeline
    const now = new Date();
    const months: { label: string; month: number; year: number }[] = [];
    for (let i = -2; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push({
            label: d.toLocaleString('es-ES', { month: 'short', year: '2-digit' }),
            month: d.getMonth(),
            year: d.getFullYear()
        });
    }

    return (
        <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
            <div style={{ minWidth: '800px', display: 'flex', position: 'relative', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                {months.map((m, idx) => (
                    <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {m.label}
                    </div>
                ))}
            </div>
            
            <div style={{ minWidth: '800px', height: '120px', position: 'relative', marginTop: '1rem' }}>
                {/* Linea central */}
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

                {capacitaciones.map((cap) => {
                    const capDate = new Date(cap.fecha);
                    const startDate = new Date(months[0].year, months[0].month, 1);
                    const endDate = new Date(months[months.length - 1].year, months[months.length - 1].month + 1, 0);

                    if (capDate < startDate || capDate > endDate) return null;

                    // Calcular posición porcentual
                    const totalTime = endDate.getTime() - startDate.getTime();
                    const capTime = capDate.getTime() - startDate.getTime();
                    const leftPercent = (capTime / totalTime) * 100;

                    return (
                        <div 
                            key={cap.id} 
                            style={{ 
                                position: 'absolute', 
                                left: `${leftPercent}%`, 
                                top: cap.es_obligatoria ? '20px' : '60px',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                zIndex: 2,
                                cursor: 'pointer'
                            }}
                            title={cap.titulo}
                        >
                            <div style={{ 
                                width: '12px', 
                                height: '12px', 
                                borderRadius: '50%', 
                                background: cap.es_obligatoria ? 'var(--accent)' : '#3b82f6',
                                boxShadow: cap.es_obligatoria ? '0 0 10px var(--accent)' : 'none',
                                marginBottom: '5px'
                            }}></div>
                            <div style={{ 
                                background: 'rgba(0,0,0,0.8)', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.7rem', 
                                whiteSpace: 'nowrap', 
                                maxWidth: '120px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                border: '1px solid var(--glass-border)'
                            }}>
                                {cap.titulo}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Timeline;
