import db from '@/lib/db';
import { requireSesion } from '@/lib/auth';
import { cfg } from '@/lib/mensajes';
import { agregarDestinatarioAction, quitarDestinatarioAction, enviarInformeAhoraAction, guardarAjustesMensajesAction, pausarDestinatarioAction } from '@/lib/mensajes-actions';
import { textoCierreWhatsApp, textoCierreMail } from '@/lib/informe';
import { fechaAR } from '@/lib/tiempo';

export const dynamic = 'force-dynamic';

export default async function InformesConfig({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; generados?: string; desde?: string; hasta?: string }> }) {
    await requireSesion('configuracion');
    const sp = await searchParams;
    const sucursales = db.prepare('SELECT id, nombre FROM sucursales WHERE activa = 1').all() as { id: number; nombre: string }[];
    const dest = db.prepare('SELECT d.*, s.nombre sucursal FROM destinatarios_informe d LEFT JOIN sucursales s ON s.id = d.sucursal_id ORDER BY d.id').all() as any[];
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const hoy = fechaAR();
    let desde = re.test(sp.desde || '') ? sp.desde! : hoy;
    let hasta = re.test(sp.hasta || '') ? sp.hasta! : desde;
    if (hasta < desde) [desde, hasta] = [hasta, desde];
    const vistaWA = textoCierreWhatsApp(desde, hasta);
    const vistaMail = textoCierreMail(desde, hasta);
    const chk = (k: string) => cfg(k, '0') === '1';
    const T = (k: string) => cfg(k);
    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start', gap: '1.2rem' }}>
            <div className="page-header" style={{ width: '100%' }}><div><h1 className="page-title">Informes y mensajes automáticos</h1>
                <p className="app-subtitle" style={{ marginBottom: 0 }}>A quién le llega el informe de cierre, a qué hora, y qué textos se mandan a los clientes.</p></div></div>
            {sp.ok && <p style={{ color: '#4ade80' }}>✓ Guardado.</p>}{sp.generados && <p style={{ color: '#4ade80' }}>✓ Informe generado ({sp.generados}). Mirá la bandeja de Mensajes.</p>}
            {sp.error && <p style={{ color: '#f87171' }}>⚠️ Revisá el dato ingresado ({sp.error}).</p>}

            <div className="card" style={{ width: '100%' }}>
                <h3>Destinatarios del informe de cierre</h3>
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', margin: '.3rem 0 .8rem' }}>Un único informe diario, consolidado con desglose por sucursal, para los gerentes. Sale desde Central.</p>
                <table className="data-table"><thead><tr><th>Nombre</th><th>Canal</th><th>Destino</th><th>Informe de</th><th>Estado</th><th></th></tr></thead><tbody>
                    {dest.map(d => <tr key={d.id}><td>{d.nombre}</td><td>{d.canal}</td><td>{d.destino}</td><td>Consolidado</td><td style={{ color: d.activo ? '#4ade80' : '#fbbf24' }}>{d.activo ? 'Recibe' : 'En pausa'}</td><td style={{ display: 'flex', gap: '.4rem' }}><form action={pausarDestinatarioAction.bind(null, d.id)}><button className="btn-primary" style={{ padding: '.25rem .7rem', fontSize: '.8rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>{d.activo ? 'Pausar' : 'Activar'}</button></form><form action={quitarDestinatarioAction.bind(null, d.id)}><button className="btn-primary" style={{ padding: '.25rem .7rem', fontSize: '.8rem', background: 'rgba(239,68,68,.12)', color: '#f87171', border: '1px solid rgba(239,68,68,.3)' }}>Quitar</button></form></td></tr>)}
                    {!dest.length && <tr><td colSpan={6} style={{ color: 'var(--text-muted)' }}>Todavía no hay destinatarios.</td></tr>}
                </tbody></table>
                <form action={agregarDestinatarioAction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '.8rem', alignItems: 'end', marginTop: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label>Nombre</label><input className="form-input" name="nombre" required /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label>Canal</label><select className="form-input" name="canal"><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label>Teléfono o email</label><input className="form-input" name="destino" required placeholder="3886705166 o nombre@mail.com" /></div>
                    
                    <button className="btn-primary" type="submit">Agregar</button>
                </form>
            </div>

            <div className="card" style={{ width: '100%' }}>
                <h3>Informe por fechas</h3>
                <form style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '.4rem' }}>
                    <input className="form-input" type="date" name="desde" defaultValue={desde} /><input className="form-input" type="date" name="hasta" defaultValue={hasta} />
                    <button className="btn-primary">Ver</button>
                </form>
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.6rem' }}>Versión WhatsApp (corta, con semáforo)</p>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '.88rem', marginTop: '.2rem' }}>{vistaWA}</pre>
                <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.8rem' }}>Versión mail (completa)</p>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '.88rem', marginTop: '.2rem' }}>{vistaMail}</pre>
                <form action={enviarInformeAhoraAction}><input type="hidden" name="desde" value={desde} /><input type="hidden" name="hasta" value={hasta} /><button className="btn-primary" style={{ marginTop: '.6rem' }}>Enviar este informe ahora a los destinatarios</button></form>
            </div>

            <form action={guardarAjustesMensajesAction} className="card" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3>Ajustes</h3>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <label><input type="checkbox" name="informe_activo" defaultChecked={chk('informe_activo')} /> Enviar informe de cierre</label>
                    <label><input type="checkbox" name="mensajes_activos" defaultChecked={chk('mensajes_activos')} /> Mensajes a clientes</label>
                    <label><input type="checkbox" name="recordatorio_service_activo" defaultChecked={chk('recordatorio_service_activo')} /> Avisar service por vencer (activar cuando esté todo probado)</label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
                    <div className="form-group"><label>Hora del informe</label><input className="form-input" type="time" name="informe_hora" defaultValue={T('informe_hora')} /></div>
                    <div className="form-group"><label>Avisar service con (días)</label><input className="form-input" type="number" name="recordatorio_service_dias" defaultValue={T('recordatorio_service_dias')} /></div>
                    <div className="form-group"><label>Próximo service por defecto (meses)</label><input className="form-input" type="number" name="proximo_service_meses" defaultValue={T('proximo_service_meses')} /></div>
                    <div className="form-group"><label>Recordar turno (horas antes)</label><input className="form-input" type="number" name="turno_recordatorio_horas" defaultValue={T('turno_recordatorio_horas')} /></div>
                </div>
                <p style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Variables en los textos: {'{cliente} {vehiculo} {patente} {sucursal} {fecha} {hora} {portal}'}</p>
                {([['plantilla_recibimos', 'Recibimos tu auto'], ['plantilla_listo', 'Tu auto está listo'], ['plantilla_service', 'Service por vencer'], ['plantilla_turno', 'Recordatorio de turno']] as const).map(([k, l]) => (
                    <div className="form-group" key={k}><label>{l}</label><textarea className="form-input" name={k} rows={2} defaultValue={T(k)} /></div>))}
                <button className="btn-primary" style={{ alignSelf: 'flex-end' }} type="submit">Guardar ajustes</button>
            </form>
        </main>
    );
}
