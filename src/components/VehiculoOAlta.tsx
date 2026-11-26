'use client';

import { useState } from 'react';
import SearchableSelect from './SearchableSelect';

/** Elegir un vehículo ya cargado o darlo de alta (con su cliente) en la misma pantalla de la agenda. */
export default function VehiculoOAlta({ options, defaultValue }: { options: { value: string; label: string }[]; defaultValue?: string }) {
    const [nuevo, setNuevo] = useState(false);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
            <input type="hidden" name="es_nuevo" value={nuevo ? '1' : '0'} />
            {!nuevo ? (
                <div className="form-group"><label>Vehículo / cliente *</label>
                    <SearchableSelect name="vehiculo_id" required options={options} defaultValue={defaultValue} />
                    <button type="button" className="btn-primary" onClick={() => setNuevo(true)} style={{ marginTop: '.5rem', alignSelf: 'flex-start', background: 'rgba(37,211,102,.14)', color: '#4ade80', border: '1px solid rgba(37,211,102,.35)' }}>
                        ＋ Cliente o vehículo nuevo
                    </button>
                </div>
            ) : (
                <div style={{ border: '1px solid rgba(37,211,102,.35)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
                        <b>Cliente y vehículo nuevos</b>
                        <button type="button" onClick={() => setNuevo(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>← Elegir uno ya cargado</button>
                    </div>
                    <p style={{ fontSize: '.78rem', color: 'var(--text-muted)', margin: 0 }}>Si la patente ya existe, se usa ese vehículo y su titular. No hace falta cargar nada más.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '.8rem' }}>
                        <div className="form-group"><label>Patente *</label><input className="form-input" name="nuevo_patente" required style={{ textTransform: 'uppercase' }} placeholder="AB123CD" /></div>
                        <div className="form-group"><label>Tipo</label><select className="form-input" name="nuevo_tipo" defaultValue="Auto"><option>Auto</option><option>Camioneta</option><option value="Camion">Camión</option></select></div>
                        <div className="form-group"><label>Marca</label><input className="form-input" name="nuevo_marca" /></div>
                        <div className="form-group"><label>Modelo</label><input className="form-input" name="nuevo_modelo" /></div>
                        <div className="form-group"><label>Nombre del cliente *</label><input className="form-input" name="nuevo_nombre" /></div>
                        <div className="form-group"><label>Teléfono (WhatsApp) *</label><input className="form-input" name="nuevo_telefono" inputMode="tel" placeholder="388 6705166" /></div>
                        <div className="form-group"><label>Mail</label><input className="form-input" type="email" name="nuevo_email" /></div>
                        <div className="form-group"><label>DNI</label><input className="form-input" name="nuevo_dni" inputMode="numeric" /></div>
                    </div>
                </div>
            )}
        </div>
    );
}
