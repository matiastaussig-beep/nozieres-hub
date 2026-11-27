import { requireSesion } from '@/lib/auth';
import { getConfiguraciones, updateConfiguracionAction, getConfiguracionPuntos, updateConfiguracionPuntos } from '@/lib/actions';
import { Settings, Save, Building, Clock, Users, MessageCircle, MapPin, Mail, Phone, Award, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
    await requireSesion('configuracion');
    const configs = await getConfiguraciones();
    const puntosConfig = await getConfiguracionPuntos();
    const getConfig = (clave: string) => configs.find(c => c.clave === clave)?.valor || '';

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}><a className="badge" href="/configuracion/usuarios">👤 Usuarios y roles</a><a className="badge" href="/configuracion/informes">📨 Informes y mensajes</a><a className="badge" href="/mensajes">💬 Bandeja de mensajes</a><a className="badge" href="/configuracion/importar">📥 Importar del sistema anterior</a></div>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Configuración del Sistema</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>Administre los parámetros generales, puntos de fidelización y campañas multi-sucursal.</p>
                </div>
            </div>

            <div className="table-container" style={{ padding: '2rem', maxWidth: '900px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                
                {/* SECCIÓN CAMPAÑAS Y PUNTOS DE FIDELIZACIÓN */}
                <form action={updateConfiguracionPuntos} style={{ background: 'rgba(255, 215, 0, 0.03)', border: '1px solid rgba(255, 215, 0, 0.2)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255, 215, 0, 0.2)', paddingBottom: '0.5rem' }}>
                        <Award size={20} /> Configuración de Puntos y Campañas de Fidelización
                    </h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ color: 'var(--text-main)', fontWeight: 500 }}>Puntos Base por Service</label>
                            <input type="number" name="puntos_base_servicio" className="form-input" defaultValue={puntosConfig.puntos_base_servicio} placeholder="Ej: 100" required />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Puntos fijos asignados en cada orden de trabajo completada.</p>
                        </div>
                    </div>

                    {/* REGLAS DE CANJE DE PUNTOS */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                                💳 Control de canje de puntos
                            </h3>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                <input type="checkbox" name="canje_habilitado" defaultChecked={!!puntosConfig.canje_habilitado} /> Habilitar Canje en Caja
                            </label>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.85rem' }}>Puntos Mínimos Requeridos para Habilitar el Canje</label>
                            <input type="number" name="puntos_minimos_canje" className="form-input" defaultValue={puntosConfig.puntos_minimos_canje || 500} placeholder="Ej: 500" required />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                El botón de canje solo se mostrará si el cliente supera esta cantidad de puntos acumulados.
                            </p>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                                <Sparkles size={18} /> Campaña Especial (Doble Puntos / Promociones)
                            </h3>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                <input type="checkbox" name="activa_campana" defaultChecked={!!puntosConfig.activa_campana} /> Activar Campaña
                            </label>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.85rem' }}>Nombre de la Campaña</label>
                                <input type="text" name="nombre_campana" className="form-input" defaultValue={puntosConfig.nombre_campana} placeholder="Ej: Campaña Mes del Padre 2x" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.85rem' }}>Multiplicador de Puntos</label>
                                <select name="multiplicador_campana" className="form-input" defaultValue={puntosConfig.multiplicador_campana}>
                                    <option value="1.0">1.0x (Puntos Estándar)</option>
                                    <option value="1.5">1.5x (+50% Puntos Extra)</option>
                                    <option value="2.0">2.0x (¡DOBLE PUNTOS! 🔥)</option>
                                    <option value="3.0">3.0x (TRIPLE PUNTOS 🎉)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary" style={{ background: '#f59e0b', color: 'black', fontWeight: 700 }}>
                            <Save size={16} /> Guardar Reglas de Fidelización
                        </button>
                    </div>
                </form>

                <form action={updateConfiguracionAction}>
                    
                    {/* SECCIÓN 1: DATOS DE LA EMPRESA */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                            <Building size={20} /> Datos de la Empresa
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    Nombre del Lubricentro
                                </label>
                                <input type="text" name="empresa_nombre" className="form-input" defaultValue={getConfig('empresa_nombre')} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <MapPin size={14} /> Dirección
                                </label>
                                <input type="text" name="empresa_direccion" className="form-input" defaultValue={getConfig('empresa_direccion')} placeholder="Ej: Av. San Martín 1234" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Phone size={14} /> Teléfono Fijo
                                </label>
                                <input type="text" name="empresa_telefono" className="form-input" defaultValue={getConfig('empresa_telefono')} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <MessageCircle size={14} /> WhatsApp (Solo números con código de país)
                                </label>
                                <input type="text" name="empresa_whatsapp" className="form-input" defaultValue={getConfig('empresa_whatsapp')} placeholder="Ej: 5493881234567" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Mail size={14} /> Email
                                </label>
                                <input type="email" name="empresa_email" className="form-input" defaultValue={getConfig('empresa_email')} />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: TIEMPOS ESTÁNDAR Y PREDICCIÓN */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                            <Clock size={20} /> Tiempos Estándar y Predicción
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            <div className="hero-glass" style={{ padding: '1rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Auto</h3>
                                <div className="form-group">
                                    <label>Tiempo Estándar (min)</label>
                                    <input type="number" name="tiempo_std_auto" className="form-input" defaultValue={getConfig('tiempo_std_auto')} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>KM Promedio / Día (Defecto)</label>
                                    <input type="number" name="km_promedio_auto" className="form-input" defaultValue={getConfig('km_promedio_auto')} />
                                </div>
                            </div>
                            <div className="hero-glass" style={{ padding: '1rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Camioneta</h3>
                                <div className="form-group">
                                    <label>Tiempo Estándar (min)</label>
                                    <input type="number" name="tiempo_std_camioneta" className="form-input" defaultValue={getConfig('tiempo_std_camioneta')} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>KM Promedio / Día (Defecto)</label>
                                    <input type="number" name="km_promedio_camioneta" className="form-input" defaultValue={getConfig('km_promedio_camioneta')} />
                                </div>
                            </div>
                            <div className="hero-glass" style={{ padding: '1rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Camión</h3>
                                <div className="form-group">
                                    <label>Tiempo Estándar (min)</label>
                                    <input type="number" name="tiempo_std_camion" className="form-input" defaultValue={getConfig('tiempo_std_camion')} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>KM Promedio / Día (Defecto)</label>
                                    <input type="number" name="km_promedio_camion" className="form-input" defaultValue={getConfig('km_promedio_camion')} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: TÉCNICOS */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                            <Users size={20} /> Técnicos de Taller (Operativos)
                        </h2>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Lista de Técnicos (Separados por coma)</label>
                            <textarea 
                                name="tecnicos_activos" 
                                className="form-input" 
                                rows={3} 
                                defaultValue={getConfig('tecnicos_activos')} 
                                placeholder="Ej: JOSE, GUSTAVO, LUIS"
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Estos son los técnicos que aparecerán para seleccionar al crear o editar una Orden de Trabajo.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                        <Link href="/" className="btn-secondary">
                            Cancelar
                        </Link>
                        <button type="submit" className="btn-primary">
                            <Save size={18} /> Guardar Configuración General
                        </button>
                    </div>

                </form>
            </div>
        </main>
    );
}

