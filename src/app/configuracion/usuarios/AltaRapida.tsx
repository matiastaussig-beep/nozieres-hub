'use client';

import { useActionState } from 'react';
import { altaRapidaUsuariosAction, type AltaRapidaResultado } from '@/lib/auth-actions';

const EJEMPLO = `Cecilia; cecilia; cajera; San Pedro
Técnico San Pedro; tecnico.sanpedro; tecnico; San Pedro
Noemi; noemi; cajera; Ledesma
Martin; martin; vendedor; Ledesma
Técnico Ledesma; tecnico.ledesma; tecnico; Ledesma
Diego; diego; administrador
Macarena; macarena; administrador
Nicolas; nicolas; administrador`;

export default function AltaRapida() {
    const [res, accion, pendiente] = useActionState<AltaRapidaResultado | null, FormData>(altaRapidaUsuariosAction, null);
    return (
        <div className="table-container" style={{ padding: '1.2rem', width: '100%' }}>
            <h2 style={{ marginBottom: '.4rem' }}>Alta rápida de usuarios</h2>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '.8rem' }}>
                Una línea por persona: <strong>Nombre; usuario; rol; sucursal</strong>. Roles: administrador, vendedor, cajera, tecnico. El administrador entra a todas las sucursales (no hace falta ponerla).
                El sistema genera una clave temporal para cada uno y <strong>te la muestra una sola vez</strong>; cada persona la cambia al entrar.
            </p>
            <form action={accion} style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
                <textarea className="form-input" name="lista" rows={9} defaultValue={EJEMPLO} style={{ fontFamily: 'monospace' }} />
                <button className="btn-primary" type="submit" disabled={pendiente} style={{ alignSelf: 'flex-start' }}>{pendiente ? 'Creando…' : 'Crear usuarios'}</button>
            </form>
            {res && (
                <div style={{ marginTop: '1rem' }}>
                    {res.creados.length > 0 && (
                        <>
                            <h3 style={{ color: '#4ade80' }}>✓ Usuarios creados — anotá las claves ahora, no se vuelven a mostrar</h3>
                            <table className="data-table" style={{ marginTop: '.5rem' }}>
                                <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Sucursal</th><th>Clave temporal</th></tr></thead>
                                <tbody>{res.creados.map(c => (
                                    <tr key={c.username}><td>{c.nombre}</td><td>{c.username}</td><td>{c.rol}</td><td>{c.sucursales}</td><td style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 700 }}>{c.clave}</td></tr>
                                ))}</tbody>
                            </table>
                            <button type="button" className="btn-primary" style={{ marginTop: '.6rem' }} onClick={() => window.print()}>Imprimir esta lista</button>
                        </>
                    )}
                    {res.omitidos.length > 0 && (
                        <div style={{ marginTop: '.8rem', color: '#fbbf24' }}>
                            <strong>No se crearon:</strong>
                            <ul style={{ marginLeft: '1.2rem' }}>{res.omitidos.map((o, i) => <li key={i}>{o}</li>)}</ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
