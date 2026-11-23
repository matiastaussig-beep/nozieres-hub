'use client';

import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';
import FotoCapture from '@/components/FotoCapture';

interface Vehiculo {
    id: number;
    patente: string;
    marca: string | null;
    modelo: string | null;
    anio: number | null;
    cliente_nombre?: string;
    tipo_vehiculo: string;
}

interface OrdenTrabajo {
    id: number;
    vehiculo_id: number;
    fecha: string;
    kilometraje: number | null;
    notas: string | null;
    total: number;
    estado: string;
    proximo_servicio_km: number | null;
    proximo_servicio_fecha: string | null;
    mecanico: string | null;
    aceite_utilizado: string | null;
    filtros_cambiados: string | null;
    presupuesto_nro: string | null;
    servicios_autos: string | null;
    servicios_camioneta: string | null;
    servicios_camion: string | null;
    complementos: string | null;
    observaciones_cliente: string | null;
    tecnico_asignado: string | null;
    hora_ingreso: string | null;
    hora_estimada_fin: string | null;
    observaciones_tecnicas: string | null;
    hora_fin_real: string | null;
    complementos_adicionales: string | null;
    checklist_calidad: string | null;
}

interface TurnoPre { id: number; vehiculo_id: number | null; tecnico: string | null; presupuesto_nro: string | null; motivo: string | null }

export default function OrdenForm({ vehiculos, onSubmit, initialData, sucursalId, tecnicos: listaTecnicos = [], turno }: { vehiculos: Vehiculo[], onSubmit: (formData: FormData) => Promise<void>, initialData?: OrdenTrabajo, sucursalId?: number | null, tecnicos?: string[], turno?: TurnoPre | null }) {
    const isEditing = !!initialData;
    const [selectedVehiculoId, setSelectedVehiculoId] = useState(initialData?.vehiculo_id.toString() || turno?.vehiculo_id?.toString() || '');
    // Parseo de campos JSON
    const aceites = initialData?.aceite_utilizado ? JSON.parse(initialData.aceite_utilizado) : null;
    const filtros = initialData?.filtros_cambiados ? JSON.parse(initialData.filtros_cambiados) : null;
    const srvAutos = initialData?.servicios_autos ? JSON.parse(initialData.servicios_autos) : [];
    const srvCamionetas = initialData?.servicios_camioneta ? JSON.parse(initialData.servicios_camioneta) : [];
    const srvCamiones = initialData?.servicios_camion ? JSON.parse(initialData.servicios_camion) : [];
    const comps = initialData?.complementos ? JSON.parse(initialData.complementos) : [];
    const checklist = initialData?.checklist_calidad ? JSON.parse(initialData.checklist_calidad) : null;

    // Técnicos
    const tecnicos = (initialData?.tecnico_asignado || turno?.tecnico || '').split(' y ').filter(Boolean);
    const t1_val = tecnicos[0] || '';
    const t2_val = tecnicos[1] || '';
    const selectedVehiculo = vehiculos.find(v => v.id.toString() === selectedVehiculoId);
    const tipo = (selectedVehiculo?.tipo_vehiculo || '').toLowerCase();

    const servicesAutos = [
        "Cambio de filtro Aceite", "Cambio de Filtro de Aire", "Cambio de Filtro AC",
        "Cambio de Filtro de Combustible", "Cambio de Aceite Motor", "Cambio de Aceite Caja"
    ];

    const servicesCamioneta = [
        "Cambio de filtro Aceite", "Cambio de Filtro de Aire", "Cambio de Filtro AC",
        "Cambio de Filtro de Combustible", "Cambio de Aceite Motor", "Cambio de Aceite Caja",
        "Cambio de Aceite Diferencial"
    ];

    const servicesCamion = [
        "Cambio de filtro Aceite", "Cambio de Filtro de Aire", "Cambio de Filtro AC",
        "Cambio de Filtro de COmbustible", "Cambio de Filtro Secador Aire", "Trampa de Agua",
        "Hidraulico", "Cambio de Aceite de Motor", "Cambio de Aceite de Caja", "Cambio de Aceite Diferencial"
    ];

    const complementos1 = ["Revision General", "Liquido refrigerante", "Lava Parabrisas"];
    const complementos2 = ["Escobillas", "Liquido de Frenos", "Liquido Hidraulico"];

    return (
        <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <input type="hidden" name="sucursal_id" value={sucursalId ?? ""} />
            {turno && <input type="hidden" name="turno_id" value={turno.id} />}

            {/* SECCIÓN 1: DATOS CLIENTE Y VEHÍCULO */}
            <div>
                <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>1. Datos del Cliente, Vehículo y Técnicos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                        <label htmlFor="tecnico_1" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Técnico 1</label>
                        <input type="text" id="tecnico_1" name="tecnico_1" className="form-input" list="lista-tecnicos" placeholder="Elegí o escribí" defaultValue={t1_val} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="tecnico_2" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Técnico 2 (opcional)</label>
                        <input type="text" id="tecnico_2" name="tecnico_2" className="form-input" list="lista-tecnicos" placeholder="Elegí o escribí" defaultValue={t2_val} />
                    </div>
                    <datalist id="lista-tecnicos">{listaTecnicos.map(t => <option key={t} value={t} />)}</datalist>
                    <div className="form-group">
                        <label htmlFor="presupuesto_nro" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Presupuesto Nº</label>
                        <input type="text" id="presupuesto_nro" name="presupuesto_nro" className="form-input" placeholder="Ej: 0001-00001234" defaultValue={initialData?.presupuesto_nro || turno?.presupuesto_nro || ''} />
                        <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', margin: '.2rem 0 0' }}>Número del presupuesto en Boxer (sólo referencia).</p>
                    </div>
                    <div className="form-group">
                        <label htmlFor="vehiculo_id" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Vehículo y Cliente *</label>
                        <SearchableSelect 
                            name="vehiculo_id" 
                            options={vehiculos.map(v => ({ 
                                value: v.id.toString(), 
                                label: `${v.patente.toUpperCase()} - ${v.marca || ''} ${v.modelo || ''} | Cliente: ${v.cliente_nombre} (${v.tipo_vehiculo})` 
                            }))} 
                            required={true}
                            onChange={(val) => setSelectedVehiculoId(val)}
                            defaultValue={initialData?.vehiculo_id?.toString() || turno?.vehiculo_id?.toString() || ""}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="kilometraje" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Kilometraje Actual</label>
                        <input type="number" id="kilometraje" name="kilometraje" className="form-input" placeholder="Ej: 154000" defaultValue={initialData?.kilometraje || ''} />
                    </div>
                    <div className="form-group" style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '0.8rem', borderRadius: 'var(--radius-md)' }}>
                        <label htmlFor="proximo_servicio_km" style={{ color: 'var(--accent)', fontWeight: 600 }}>Próximo Service (KM)</label>
                        <input type="number" id="proximo_servicio_km" name="proximo_servicio_km" className="form-input" placeholder="Ej: 164000" style={{ marginBottom: 0 }} defaultValue={initialData?.proximo_servicio_km || ''} />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: SERVICIOS SOLICITADOS */}
            <div>
                <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>2. Servicios Solicitados</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    {/* Autos */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)', paddingBottom: '0.5rem', borderBottom: '1px solid #333' }}>Service Autos</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {servicesAutos.map((srv, i) => (
                                <label key={`auto-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input type="checkbox" name="servicios_autos" value={srv} defaultChecked={srvAutos.includes(srv)} /> {srv}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Camioneta */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)', paddingBottom: '0.5rem', borderBottom: '1px solid #333' }}>Service Camioneta</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {servicesCamioneta.map((srv, i) => (
                                <label key={`camioneta-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input type="checkbox" name="servicios_camioneta" value={srv} defaultChecked={srvCamionetas.includes(srv)} /> {srv}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Camion */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)', paddingBottom: '0.5rem', borderBottom: '1px solid #333' }}>Service Camion</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {servicesCamion.map((srv, i) => (
                                <label key={`camion-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input type="checkbox" name="servicios_camion" value={srv} defaultChecked={srvCamiones.includes(srv)} /> {srv}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Complementos */}
                <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Complementos</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {complementos1.map((srv, i) => (
                            <label key={`comp1-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input type="checkbox" name="complementos" value={srv} defaultChecked={comps.includes(srv)} /> {srv}
                            </label>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {complementos2.map((srv, i) => (
                            <label key={`comp2-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input type="checkbox" name="complementos" value={srv} defaultChecked={comps.includes(srv)} /> {srv}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label htmlFor="complementos_adicionales" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Complementos Adicionales Añadidos (Manual)</label>
                    <textarea name="complementos_adicionales" className="form-input" rows={2} style={{ width: '100%' }} placeholder="Escriba aquí si agregó algo que no está en la lista superior, por ejemplo mangueras específicas..." defaultValue={initialData?.complementos_adicionales || ''}></textarea>
                </div>
            </div>

            {/* SECCIÓN 3: DETALLES DE FILTROS (DINÁMICO) */}
            {(tipo === 'auto' || tipo === 'camioneta' || tipo === 'camión' || tipo === 'camion') && (
                <div>
                    <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>3. Detalles de Filtros (Marca y Modelo)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtro de Aceite</label>
                            <input type="text" name="filtro_aceite_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.aceite || ''} />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtro de Combustible</label>
                            <input type="text" name="filtro_combustible_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.combustible || ''} />
                        </div>
                        
                        {(tipo === 'auto' || tipo === 'camioneta') ? (
                            <>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtro Aire Motor</label>
                                    <input type="text" name="filtro_aire_motor_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.aire_motor || ''} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aire Motor Primario</label>
                                    <input type="text" name="filtro_aire_motor_primario_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.aire_motor_primario || ''} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aire Motor Secundario</label>
                                    <input type="text" name="filtro_aire_motor_secundario_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.aire_motor_secundario || ''} />
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtro Habitáculo</label>
                            <input type="text" name="filtro_habitaculo_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.habitaculo || ''} />
                        </div>

                        {(tipo === 'camión' || tipo === 'camion') && (
                            <>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Desecador</label>
                                    <input type="text" name="filtro_desecador_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.desecador || ''} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Trampa de Agua</label>
                                    <input type="text" name="filtro_trampa_agua_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.trampa_agua || ''} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aceite Transmisión</label>
                                    <input type="text" name="filtro_aceite_transmision_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.aceite_transmision || ''} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtro de Agua</label>
                                    <input type="text" name="filtro_agua_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.agua || ''} />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filtro Hidráulico</label>
                                    <input type="text" name="filtro_hidraulico_detalle" className="form-input" placeholder="Marca/Modelo" style={{ marginBottom: 0 }} defaultValue={filtros?.hidraulico || ''} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* SECCIÓN 4: DETALLES DE ACEITES */}
            <div>
                <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>4. Detalles de Aceites</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr', gap: '0.5rem', marginBottom: '-0.5rem', padding: '0 0.5rem', opacity: 0.8, fontSize: '0.8rem', fontWeight: 600 }}>
                        <div></div>
                        <div>Marca</div>
                        <div>Densidad</div>
                        <div>Cant. Lts</div>
                    </div>
                    {/* Motor */}
                    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>Aceite Motor</div>
                        <input type="text" name="aceite_motor_marca" className="form-input" placeholder="Ej: Castrol" style={{ marginBottom: 0 }} defaultValue={aceites?.motor?.marca || ''} />
                        <input type="text" name="aceite_motor_densidad" className="form-input" placeholder="10W40" style={{ marginBottom: 0 }} defaultValue={aceites?.motor?.densidad || ''} />
                        <input type="number" step="0.001" name="aceite_motor_litros" className="form-input" placeholder="0.000" style={{ marginBottom: 0 }} defaultValue={aceites?.motor?.litros || ''} />
                    </div>
                    {/* Caja */}
                    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>Aceite Caja</div>
                        <input type="text" name="aceite_caja_marca" className="form-input" placeholder="Marca" style={{ marginBottom: 0 }} defaultValue={aceites?.caja?.marca || ''} />
                        <input type="text" name="aceite_caja_densidad" className="form-input" placeholder="75W90" style={{ marginBottom: 0 }} defaultValue={aceites?.caja?.densidad || ''} />
                        <input type="number" step="0.001" name="aceite_caja_litros" className="form-input" placeholder="0.000" style={{ marginBottom: 0 }} defaultValue={aceites?.caja?.litros || ''} />
                    </div>
                    {/* Diferencial */}
                    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>Aceite Diferencial</div>
                        <input type="text" name="aceite_diferencial_marca" className="form-input" placeholder="Marca" style={{ marginBottom: 0 }} defaultValue={aceites?.diferencial?.marca || ''} />
                        <input type="text" name="aceite_diferencial_densidad" className="form-input" placeholder="Espec." style={{ marginBottom: 0 }} defaultValue={aceites?.diferencial?.densidad || ''} />
                        <input type="number" step="0.001" name="aceite_diferencial_litros" className="form-input" placeholder="0.000" style={{ marginBottom: 0 }} defaultValue={aceites?.diferencial?.litros || ''} />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 5: OBSERVACIONES DEL CLIENTE */}
            <div>
                <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>5. Observaciones del Cliente</h3>
                <textarea name="observaciones_cliente" className="form-input" rows={3} style={{ width: '100%' }} placeholder="Escriba aquí lo que el cliente informa..." defaultValue={initialData?.observaciones_cliente || ''}></textarea>
            </div>

            {/* SECCIÓN 6: CHECKLIST DIGITAL DE CALIDAD */}
            <div style={{ background: 'rgba(74, 222, 128, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                <h3 style={{ borderBottom: '1px solid rgba(74, 222, 128, 0.2)', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Checklist de Control de Calidad
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div>
                        <h5 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Luces</h5>
                        {["Delanteras", "Traseras", "Giros", "Frenos"].map(item => (
                            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.3rem', cursor: 'pointer' }}>
                                <input type="checkbox" name="checklist_luces" value={item} defaultChecked={checklist?.luces?.includes(item)} /> {item}
                            </label>
                        ))}
                    </div>
                    <div>
                        <h5 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Niveles</h5>
                        {["Aceite", "Refrigerante", "Líquido Frenos", "Hidráulico"].map(item => (
                            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.3rem', cursor: 'pointer' }}>
                                <input type="checkbox" name="checklist_niveles" value={item} defaultChecked={checklist?.niveles?.includes(item)} /> {item}
                            </label>
                        ))}
                    </div>
                    <div>
                        <h5 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Neumáticos</h5>
                        {["Presión OK", "Estado Gomas", "Auxilio"].map(item => (
                            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.3rem', cursor: 'pointer' }}>
                                <input type="checkbox" name="checklist_neumaticos" value={item} defaultChecked={checklist?.neumaticos?.includes(item)} /> {item}
                            </label>
                        ))}
                    </div>
                    <div>
                        <h5 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Batería</h5>
                        {["Bornes limpios", "Carga OK", "Filtro Habitaculo"].map(item => (
                            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.3rem', cursor: 'pointer' }}>
                                <input type="checkbox" name="checklist_bateria" value={item} defaultChecked={checklist?.bateria?.includes(item)} /> {item}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* SECCIÓN 7: REGISTRO INTERNO */}
            <div>
                <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>7. Registro Interno (Uso del taller)</h3>
                <div className="form-group">
                    <label htmlFor="observaciones_tecnicas" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Observaciones técnicas</label>
                    <textarea id="observaciones_tecnicas" name="observaciones_tecnicas" className="form-input" rows={3} defaultValue={initialData?.observaciones_tecnicas || ''}></textarea>
                </div>
            </div>

            {/* PRESUPUESTO PDF */}
            <div className="form-group" style={{ background: 'rgba(255, 215, 0, 0.04)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <label htmlFor="presupuesto_pdf" style={{ color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Presupuesto en PDF (para que el técnico lo vea)</label>
                <input type="file" id="presupuesto_pdf" name="presupuesto_pdf" accept="application/pdf" style={{ color: 'var(--text-muted)' }} />
            </div>

            {/* FOTOS DE RECEPCIÓN */}
            {!isEditing && (
                <div>
                    <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>Fotos del vehículo al recibirlo</h3>
                    <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.8rem' }}>Desde el celular se abre la cámara directamente. Quedan guardadas en la orden como constancia del estado en que llegó.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.8rem' }}>
                        <FotoCapture name="foto_frente" label="Frente" />
                        <FotoCapture name="foto_trasera" label="Trasera" />
                        <FotoCapture name="foto_lateral_izq" label="Lateral izquierdo" />
                        <FotoCapture name="foto_lateral_der" label="Lateral derecho" />
                        <FotoCapture name="foto_tablero" label="Tablero (kilometraje)" />
                    </div>
                </div>
            )}

            {/* ARCHIVOS ADJUNTOS */}
            <div className="form-group" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--glass-border)' }}>
                <label htmlFor="archivos" style={{ color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Archivos Adjuntos (Documentos extras o PDF, Fotos, etc.)</label>
                <input type="file" id="archivos" name="archivos" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ color: 'var(--text-muted)' }} />
            </div>

            {/* SECCIÓN DE AUDITORÍA (Solo en edición) */}
            {isEditing && (
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)', marginTop: '1rem' }}>
                    <h3 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Confirmación de Modificación</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label htmlFor="modificacion_causa" style={{ color: 'var(--text-main)', fontWeight: 500 }}>Causa de la modificación *</label>
                            <input type="text" id="modificacion_causa" name="modificacion_causa" className="form-input" placeholder="Ej: Error en kilometraje, cambio de filtros..." required />
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '1rem' }}>
                <Link href="/ordenes" className="btn-secondary">
                    Cancelar
                </Link>
                <button type="submit" className="btn-primary">
                    <Save size={18} /> {isEditing ? 'Guardar Cambios' : 'Abrir orden (queda en proceso)'}
                </button>
            </div>
        </form>
    );
}
