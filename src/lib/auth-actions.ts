'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import db from './db';
import { hashPassword, verifyPassword } from './password';
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken } from './session-token';
import { ACTIVE_BRANCH_COOKIE, getSesion, requirePermiso, Rol } from './auth';

const COOKIE_BASE = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: process.env.COOKIE_SECURE === '1' };

export async function loginAction(formData: FormData): Promise<void> {
    const username = String(formData.get('username') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    if (!username || !password) redirect('/login?error=empty');

    const h = await headers();
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';

    // Freno a intentos repetidos: 8 fallos en 15 minutos para el mismo usuario o IP
    const fallos = (db.prepare(`SELECT COUNT(*) c FROM sesiones_log WHERE ok = 0 AND fecha > datetime('now','-15 minutes') AND (username = ? OR ip = ?)`)
        .get(username, ip) as { c: number }).c;
    if (fallos >= 8) redirect('/login?error=bloqueado');

    const u = db.prepare('SELECT id, password_hash, activo FROM usuarios WHERE lower(username) = ?').get(username) as
        { id: number; password_hash: string; activo: number } | undefined;
    const ok = !!u && !!u.activo && verifyPassword(password, u.password_hash);
    db.prepare('INSERT INTO sesiones_log (usuario_id, username, ok, ip) VALUES (?,?,?,?)').run(u?.id ?? null, username, ok ? 1 : 0, ip);
    if (!ok || !u) redirect('/login?error=invalid');

    db.prepare("UPDATE usuarios SET ultimo_acceso = datetime('now') WHERE id = ?").run(u.id);
    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(u.id), { ...COOKIE_BASE, maxAge: SESSION_DAYS * 86400 });
    store.delete(ACTIVE_BRANCH_COOKIE);
    redirect('/');
}

export async function logoutAction() {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    store.delete(ACTIVE_BRANCH_COOKIE);
    redirect('/login');
}

export async function cambiarClaveAction(formData: FormData): Promise<void> {
    const s = await getSesion();
    if (!s) redirect('/login');
    const actual = String(formData.get('actual') || '');
    const nueva = String(formData.get('nueva') || '');
    const repetir = String(formData.get('repetir') || '');
    const row = db.prepare('SELECT password_hash FROM usuarios WHERE id = ?').get(s.id) as { password_hash: string };
    if (!verifyPassword(actual, row.password_hash)) redirect('/cuenta/clave?error=actual');
    if (nueva.length < 8) redirect('/cuenta/clave?error=corta');
    if (nueva !== repetir) redirect('/cuenta/clave?error=distinta');
    if (nueva === actual) redirect('/cuenta/clave?error=igual');
    db.prepare('UPDATE usuarios SET password_hash = ?, debe_cambiar_clave = 0 WHERE id = ?').run(hashPassword(nueva), s.id);
    redirect('/');
}

export async function cambiarSucursalAction(valor: string) {
    const s = await getSesion();
    if (!s) return;
    const store = await cookies();
    if (valor === 'todos' && s.rol === 'administrador') store.set(ACTIVE_BRANCH_COOKIE, 'todos', { ...COOKIE_BASE, maxAge: 86400 * 30 });
    else if (s.sucursales.some(x => x.id === Number(valor))) store.set(ACTIVE_BRANCH_COOKIE, String(Number(valor)), { ...COOKIE_BASE, maxAge: 86400 * 30 });
    revalidatePath('/', 'layout');
}

// --- Administración de usuarios (sólo administrador) ---
const ROLES: Rol[] = ['administrador', 'vendedor', 'tecnico'];

export async function crearUsuarioAction(formData: FormData): Promise<void> {
    await requirePermiso('usuarios');
    const nombre = String(formData.get('nombre') || '').trim();
    const username = String(formData.get('username') || '').trim().toLowerCase();
    const rol = String(formData.get('rol') || '') as Rol;
    const clave = String(formData.get('clave') || '');
    const sucursales = formData.getAll('sucursales').map(Number).filter(Boolean);
    if (!nombre || !/^[a-z0-9._-]{3,30}$/.test(username) || !ROLES.includes(rol) || clave.length < 8) redirect('/configuracion/usuarios?error=datos');
    if (db.prepare('SELECT 1 FROM usuarios WHERE lower(username) = ?').get(username)) redirect('/configuracion/usuarios?error=existe');
    const tx = db.transaction(() => {
        const r = db.prepare('INSERT INTO usuarios (nombre, username, password_hash, rol, debe_cambiar_clave) VALUES (?,?,?,?,1)')
            .run(nombre, username, hashPassword(clave), rol);
        const ins = db.prepare('INSERT OR IGNORE INTO usuario_sucursales (usuario_id, sucursal_id) VALUES (?,?)');
        for (const sid of sucursales) ins.run(Number(r.lastInsertRowid), sid);
    });
    tx();
    revalidatePath('/configuracion/usuarios');
    redirect('/configuracion/usuarios?ok=creado');
}

export async function actualizarUsuarioAction(formData: FormData): Promise<void> {
    const yo = await requirePermiso('usuarios');
    const id = Number(formData.get('id'));
    const rol = String(formData.get('rol') || '') as Rol;
    const activo = formData.get('activo') ? 1 : 0;
    const sucursales = formData.getAll('sucursales').map(Number).filter(Boolean);
    const nuevaClave = String(formData.get('clave') || '');
    if (!id || !ROLES.includes(rol)) redirect('/configuracion/usuarios?error=datos');
    // Nadie puede dejarse a sí mismo sin acceso de administrador
    if (id === yo.id && (rol !== 'administrador' || !activo)) redirect('/configuracion/usuarios?error=propio');
    const tx = db.transaction(() => {
        db.prepare('UPDATE usuarios SET rol = ?, activo = ? WHERE id = ?').run(rol, activo, id);
        db.prepare('DELETE FROM usuario_sucursales WHERE usuario_id = ?').run(id);
        const ins = db.prepare('INSERT OR IGNORE INTO usuario_sucursales (usuario_id, sucursal_id) VALUES (?,?)');
        for (const sid of sucursales) ins.run(id, sid);
        if (nuevaClave) {
            if (nuevaClave.length < 8) throw new Error('corta');
            db.prepare('UPDATE usuarios SET password_hash = ?, debe_cambiar_clave = 1 WHERE id = ?').run(hashPassword(nuevaClave), id);
        }
    });
    try { tx(); } catch { redirect('/configuracion/usuarios?error=datos'); }
    revalidatePath('/configuracion/usuarios');
    redirect('/configuracion/usuarios?ok=guardado');
}
