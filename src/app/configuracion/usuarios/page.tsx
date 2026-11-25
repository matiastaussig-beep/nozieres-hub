import db from '@/lib/db';
import { requireSesion, ROL_NOMBRE } from '@/lib/auth';
import { crearUsuarioAction, actualizarUsuarioAction } from '@/lib/auth-actions';
import AltaRapida from './AltaRapida';

export const dynamic = 'force-dynamic';

const ERR: Record<string, string> = {
    datos: 'Revisá los datos (usuario de 3+ letras/números sin espacios, clave de 8+ caracteres).',
    existe: 'Ese usuario ya existe.',
    propio: 'No podés quitarte a vos mismo el rol de administrador ni desactivarte.',
};

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
    await requireSesion('usuarios');
    const { error, ok } = await searchParams;
    const sucursales = db.prepare('SELECT id, nombre FROM sucursales WHERE activa = 1 ORDER BY id').all() as { id: number; nombre: string }[];
    const usuarios = db.prepare('SELECT id, nombre, username, rol, activo, ultimo_acceso FROM usuarios ORDER BY activo DESC, rol, nombre').all() as any[];
    const asign = db.prepare('SELECT usuario_id, sucursal_id FROM usuario_sucursales').all() as { usuario_id: number; sucursal_id: number }[];
    const roles = ['administrador', 'vendedor', 'cajera', 'tecnico'] as const;

    return (
        <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="page-header" style={{ width: '100%' }}>
                <div>
                    <h1 className="page-title">Usuarios y permisos</h1>
                    <p className="app-subtitle" style={{ marginBottom: 0 }}>
                        Administrador: ve todo y todas las sucursales. Vendedor y Cajera: clientes, agenda, recepción y mensajes a clientes. Técnico: agenda del día y sus órdenes.
                        Un usuario puede trabajar en más de una sucursal.
                    </p>
                </div>
            </div>
            {error && <p style={{ color: '#f87171' }}>⚠️ {ERR[error] || 'Error'}</p>}
            {ok && <p style={{ color: '#4ade80' }}>✓ Listo.</p>}

            <AltaRapida />

            <div className="table-container" style={{ padding: '1.2rem', width: '100%' }}>
                <h2 style={{ marginBottom: '.8rem' }}>Nuevo usuario</h2>
                <form action={crearUsuarioAction} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', alignItems: 'end' }}>
                    <div className="form-group"><label>Nombre</label><input className="form-input" name="nombre" required /></div>
                    <div className="form-group"><label>Usuario</label><input className="form-input" name="username" required pattern="[a-zA-Z0-9._-]{3,30}" autoCapitalize="none" /></div>
                    <div className="form-group"><label>Clave inicial (se la pide cambiar al entrar)</label><input className="form-input" name="clave" type="text" minLength={8} required /></div>
                    <div className="form-group"><label>Rol</label>
                        <select className="form-input" name="rol" defaultValue="tecnico">{roles.map(r => <option key={r} value={r}>{ROL_NOMBRE[r]}</option>)}</select>
                    </div>
                    <div className="form-group"><label>Sucursales</label>
                        <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                            {sucursales.map(s => <label key={s.id} style={{ display: 'flex', gap: 4, fontSize: '.85rem' }}><input type="checkbox" name="sucursales" value={s.id} /> {s.nombre}</label>)}
                        </div>
                    </div>
                    <button className="btn-primary" type="submit">Crear usuario</button>
                </form>
            </div>

            <div className="table-container" style={{ width: '100%' }}>
                <table className="data-table">
                    <thead><tr><th>Usuario</th><th>Rol</th><th>Sucursales</th><th>Activo</th><th>Nueva clave</th><th></th></tr></thead>
                    <tbody>
                        {usuarios.map(u => {
                            const mias = new Set(asign.filter(a => a.usuario_id === u.id).map(a => a.sucursal_id));
                            const fid = `f${u.id}`;
                            return (
                                <tr key={u.id}>
                                    <td><strong>{u.nombre}</strong><br /><span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{u.username}{u.ultimo_acceso ? ` · último acceso ${u.ultimo_acceso}` : ''}</span></td>
                                    <td>
                                        <input type="hidden" name="id" value={u.id} form={fid} />
                                        <select className="form-input" name="rol" defaultValue={u.rol} form={fid}>{roles.map(r => <option key={r} value={r}>{ROL_NOMBRE[r]}</option>)}</select>
                                    </td>
                                    <td>{u.rol === 'administrador' ? <em style={{ fontSize: '.8rem' }}>todas</em> : sucursales.map(s => (
                                        <label key={s.id} style={{ display: 'flex', gap: 4, fontSize: '.8rem' }}><input type="checkbox" name="sucursales" value={s.id} defaultChecked={mias.has(s.id)} form={fid} /> {s.nombre}</label>
                                    ))}</td>
                                    <td><input type="checkbox" name="activo" defaultChecked={!!u.activo} form={fid} /></td>
                                    <td><input className="form-input" name="clave" placeholder="dejar vacío = no cambia" form={fid} /></td>
                                    <td><form id={fid} action={actualizarUsuarioAction}><button className="btn-primary" type="submit">Guardar</button></form></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
