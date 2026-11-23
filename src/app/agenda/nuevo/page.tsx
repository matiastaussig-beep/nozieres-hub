import Link from 'next/link';
import { requireSesion } from '@/lib/auth';
import { crearTurnoAction } from '@/lib/agenda-actions';
import { getVehiculos } from '@/lib/actions';
import { tecnicosActivos } from '@/lib/queries';
import SearchableSelect from '@/components/SearchableSelect';
import { fechaAR } from '@/lib/tiempo';

export const dynamic = 'force-dynamic';

export default async function NuevoTurno({ searchParams }: { searchParams: Promise<{ fecha?: string; vehiculo?: string; error?: string }> }) {
    const ses = await requireSesion('agenda.editar');
    const sp = await searchParams;
    const vehiculos = await getVehiculos();
    const tecnicos = tecnicosActivos();
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}><div><h1 className="page-title">Nuevo turno</h1>
                <p className="app-subtitle" style={{ marginBottom: 0 }}>Elegí el vehículo y el cliente se carga solo. Podés adjuntar el presupuesto en PDF para que el técnico lo vea.</p></div></div>
            {sp.error && <p style={{ color: '#f87171' }}>⚠️ Revisá los datos: {sp.error === 'vehiculo' ? 'falta elegir el vehículo' : 'fecha inválida'}.</p>}
            <form action={crearTurnoAction} className="hero-glass" style={{ maxWidth: 760, width: '100%', textAlign: 'left', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {ses.sucursalActivaId ? <input type="hidden" name="sucursal_id" value={ses.sucursalActivaId} /> : (
                    <div className="form-group"><label>Sucursal *</label>
                        <select className="form-input" name="sucursal_id" required defaultValue="">{<option value="" disabled>Elegí…</option>}{ses.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
                )}
                <div className="form-group"><label>Vehículo / cliente *</label>
                    <SearchableSelect name="vehiculo_id" required options={vehiculos.map(v => ({ value: String(v.id), label: `${v.patente} - ${v.marca || ''} ${v.modelo || ''} | ${v.cliente_nombre}` }))} defaultValue={sp.vehiculo} />
                    <p style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>¿No está? <Link href="/vehiculos/nuevo" style={{ color: 'var(--accent)' }}>Cargá el vehículo primero</Link>.</p></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '1rem' }}>
                    <div className="form-group"><label>Fecha *</label><input className="form-input" type="date" name="fecha" required defaultValue={sp.fecha || fechaAR()} /></div>
                    <div className="form-group"><label>Hora</label><input className="form-input" type="time" name="hora" /></div>
                    <div className="form-group"><label>Duración (min)</label><input className="form-input" type="number" name="duracion_min" defaultValue={30} min={10} step={5} /></div>
                    <div className="form-group"><label>Técnico</label><input className="form-input" name="tecnico" list="tec" /><datalist id="tec">{tecnicos.map(t => <option key={t} value={t} />)}</datalist></div>
                </div>
                <div className="form-group"><label>Motivo / trabajo previsto</label><input className="form-input" name="motivo" placeholder="Ej: service completo, cambio de aceite y filtros" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
                    <div className="form-group"><label>Presupuesto Nº (Boxer)</label><input className="form-input" name="presupuesto_nro" placeholder="Sólo el número" /></div>
                    <div className="form-group"><label>Presupuesto en PDF</label><input type="file" name="presupuesto_pdf" accept="application/pdf" /></div>
                </div>
                <div className="form-group"><label>Notas</label><textarea className="form-input" name="notas" rows={2} /></div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end' }}>Guardar turno</button>
            </form>
        </main>
    );
}
