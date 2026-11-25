import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from './db';
import { SESSION_COOKIE, readSessionToken } from './session-token';

export type Rol = 'administrador' | 'vendedor' | 'cajera' | 'tecnico';

export interface Sesion {
    id: number;
    nombre: string;
    username: string;
    rol: Rol;
    sucursales: { id: number; nombre: string }[];   // sucursales a las que puede entrar
    sucursalActivaId: number | null;                 // null = consolidado (sólo administrador)
    debeCambiarClave: boolean;
}

/** Qué puede hacer cada rol. Una sola tabla: fácil de revisar y de cambiar. */
const PERMISOS: Record<string, Rol[]> = {
    'dashboard':        ['administrador'],
    'informes':         ['administrador'],
    'configuracion':    ['administrador'],
    'usuarios':         ['administrador'],
    'puntos.control':   ['administrador'],
    'puntos.canje':     ['administrador', 'vendedor', 'cajera'],
    'clientes.ver':     ['administrador', 'vendedor', 'cajera'],
    'clientes.editar':  ['administrador', 'vendedor', 'cajera'],
    'vehiculos.ver':    ['administrador', 'vendedor', 'cajera', 'tecnico'],
    'vehiculos.editar': ['administrador', 'vendedor', 'cajera'],
    'agenda.ver':       ['administrador', 'vendedor', 'cajera', 'tecnico'],
    'agenda.editar':    ['administrador', 'vendedor', 'cajera'],
    'ordenes.ver':      ['administrador', 'vendedor', 'cajera', 'tecnico'],
    'ordenes.abrir':    ['administrador', 'vendedor', 'cajera', 'tecnico'],
    'ordenes.cerrar':   ['administrador', 'vendedor', 'cajera', 'tecnico'],
    'ordenes.editar':   ['administrador', 'vendedor', 'cajera'],
    'mensajes':         ['administrador', 'vendedor', 'cajera'],
    'capacitaciones':   ['administrador'],
};

export function can(rol: Rol | undefined, permiso: string): boolean {
    return !!rol && (PERMISOS[permiso] || []).includes(rol);
}

export const ROL_NOMBRE: Record<Rol, string> = { administrador: 'Administrador', vendedor: 'Vendedor', cajera: 'Cajera', tecnico: 'Técnico' };
export const ACTIVE_BRANCH_COOKIE = 'nh_sucursal';

/** Sesión actual leída de la cookie firmada + estado real en la base (usuario activo, rol, sucursales). */
export async function getSesion(): Promise<Sesion | null> {
    const store = await cookies();
    const uid = readSessionToken(store.get(SESSION_COOKIE)?.value);
    if (!uid) return null;
    const u = db.prepare('SELECT id, nombre, username, rol, activo, debe_cambiar_clave FROM usuarios WHERE id = ?').get(uid) as
        { id: number; nombre: string; username: string; rol: Rol; activo: number; debe_cambiar_clave: number } | undefined;
    if (!u || !u.activo) return null;

    let sucursales: { id: number; nombre: string }[];
    if (u.rol === 'administrador') {
        sucursales = db.prepare('SELECT id, nombre FROM sucursales WHERE activa = 1 ORDER BY id').all() as any[];
    } else {
        sucursales = db.prepare(`SELECT s.id, s.nombre FROM usuario_sucursales us JOIN sucursales s ON s.id = us.sucursal_id
                                 WHERE us.usuario_id = ? AND s.activa = 1 ORDER BY s.id`).all(u.id) as any[];
    }
    const wanted = store.get(ACTIVE_BRANCH_COOKIE)?.value;
    let activa: number | null;
    if (wanted === 'todos' && u.rol === 'administrador') activa = null;
    else {
        const n = Number(wanted);
        activa = sucursales.find(s => s.id === n)?.id ?? sucursales[0]?.id ?? null;
        if (u.rol === 'administrador' && !wanted) activa = null; // el administrador arranca en la vista consolidada
    }
    return { id: u.id, nombre: u.nombre, username: u.username, rol: u.rol, sucursales, sucursalActivaId: activa, debeCambiarClave: !!u.debe_cambiar_clave };
}

/** Exige sesión (y opcionalmente un permiso). Redirige al login o a la página de inicio si no corresponde. */
export async function requireSesion(permiso?: string): Promise<Sesion> {
    const s = await getSesion();
    if (!s) redirect('/login');
    if (s.debeCambiarClave) redirect('/cuenta/clave');
    if (permiso && !can(s.rol, permiso)) redirect('/sin-permiso');
    return s;
}

/** Variante para server actions: lanza error en vez de redirigir. */
export async function requirePermiso(permiso: string): Promise<Sesion> {
    const s = await getSesion();
    if (!s) throw new Error('Sesión vencida. Volvé a iniciar sesión.');
    if (!can(s.rol, permiso)) throw new Error('No tenés permiso para esta acción.');
    return s;
}

/** IDs de sucursal que la sesión puede consultar según la sucursal activa (consolidado = todas las suyas). */
export function sucursalesVisibles(s: Sesion): number[] {
    if (s.sucursalActivaId) return [s.sucursalActivaId];
    return s.sucursales.map(x => x.id);
}

export function puedeVerSucursal(s: Sesion, sucursalId: number | null | undefined) {
    if (!sucursalId) return s.rol === 'administrador';
    return s.sucursales.some(x => x.id === sucursalId);
}
