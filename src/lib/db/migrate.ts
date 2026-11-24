import type Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { hashPassword, isHashed } from '../password';
import { DATA_DIR, ensureDirs } from '../paths';

/**
 * Migraciones versionadas (PRAGMA user_version). Cada una corre UNA sola vez, dentro de una
 * transacción: si algo falla, la base queda como estaba. Antes de migrar una base existente
 * se hace una copia automática (ver db/index.ts).
 */
const migrations: Array<(db: Database.Database) => void> = [
    // v1: roles, multi-sucursal, estados, turnos, mensajes, portal, titularidad de dominios
    (db) => {
        const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map(c => c.name);
        const addCol = (t: string, c: string, def: string) => { if (!cols(t).includes(c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); };

        // Tablas que existían sólo en la base y no en schema.sql
        db.exec(`CREATE TABLE IF NOT EXISTS configuracion (clave TEXT PRIMARY KEY, valor TEXT, descripcion TEXT)`);
        db.exec(`CREATE TABLE IF NOT EXISTS modificaciones_orden (
            id INTEGER PRIMARY KEY AUTOINCREMENT, orden_id INTEGER NOT NULL, usuario_nombre TEXT, causa TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        // Usuarios y roles
        db.exec(`UPDATE usuarios SET rol='administrador' WHERE rol='gerente'`);
        db.exec(`UPDATE usuarios SET rol='tecnico' WHERE rol='operador'`);
        addCol('usuarios', 'debe_cambiar_clave', 'INTEGER DEFAULT 0');
        addCol('usuarios', 'ultimo_acceso', 'DATETIME');
        db.exec(`CREATE TABLE IF NOT EXISTS usuario_sucursales (
            usuario_id INTEGER NOT NULL, sucursal_id INTEGER NOT NULL, PRIMARY KEY (usuario_id, sucursal_id))`);
        db.exec(`INSERT OR IGNORE INTO usuario_sucursales (usuario_id, sucursal_id)
                 SELECT id, sucursal_id FROM usuarios WHERE sucursal_id IS NOT NULL`);
        // Contraseñas en texto plano -> hash scrypt. Si eran las de ejemplo conocidas, se reemplazan por una clave
        // aleatoria que queda anotada en la carpeta de datos (las de ejemplo estaban publicadas en la pantalla de acceso).
        const DEFAULTS = new Set(['admin123', 'ledesma123', 'sanpedro123']);
        const users = db.prepare('SELECT id, username, password_hash FROM usuarios').all() as { id: number; username: string; password_hash: string }[];
        const upd = db.prepare('UPDATE usuarios SET password_hash = ?, debe_cambiar_clave = ? WHERE id = ?');
        const nuevas: string[] = [];
        for (const u of users) {
            if (isHashed(u.password_hash)) continue;
            if (DEFAULTS.has(u.password_hash)) {
                const clave = crypto.randomBytes(9).toString('base64url');
                upd.run(hashPassword(clave), 1, u.id);
                nuevas.push(`${u.username}: ${clave}`);
            } else upd.run(hashPassword(u.password_hash), 1, u.id);
        }
        // Las cuentas compartidas de sucursal eran "operador": pasan a vendedor (recepción), el administrador crea los técnicos reales
        db.exec(`UPDATE usuarios SET rol='vendedor' WHERE username IN ('ledesma','sanpedro') AND rol='tecnico'`);
        if (nuevas.length) {
            ensureDirs();
            fs.writeFileSync(path.join(DATA_DIR, 'CLAVES_INICIALES.txt'),
                `Claves nuevas (cada usuario debe cambiarla al entrar). Borrá este archivo después de anotarlas.\n${nuevas.join('\n')}\n`);
        }

        // Órdenes
        addCol('ordenes_trabajo', 'iniciada_at', 'TEXT');
        addCol('ordenes_trabajo', 'cerrada_at', 'TEXT');
        addCol('ordenes_trabajo', 'puntos_otorgados', 'INTEGER DEFAULT 0');
        addCol('ordenes_trabajo', 'turno_id', 'INTEGER');
        addCol('ordenes_trabajo', 'firma_at', 'TEXT');
        addCol('ordenes_trabajo', 'creada_por', 'INTEGER');
        addCol('ordenes_trabajo', 'cerrada_por', 'INTEGER');
        // Todo lo histórico ya está realizado: pasa a "terminada" y no vuelve a sumar puntos
        db.exec(`UPDATE ordenes_trabajo SET estado='terminada', cerrada_at=COALESCE(cerrada_at, fecha), puntos_otorgados=1
                 WHERE estado IN ('pendiente','completada','terminada') OR estado IS NULL`);
        // El histórico sin sucursal es de Ledesma (única sucursal operativa hasta hoy)
        const led = db.prepare(`SELECT id FROM sucursales ORDER BY id LIMIT 1`).get() as { id: number } | undefined;
        if (led) db.prepare('UPDATE ordenes_trabajo SET sucursal_id = ? WHERE sucursal_id IS NULL').run(led.id);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_ot_estado ON ordenes_trabajo(estado, sucursal_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_ot_vehiculo ON ordenes_trabajo(vehiculo_id, fecha)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_ot_fecha ON ordenes_trabajo(fecha)`);

        // Archivos: fotos privadas y PDF de presupuesto, ligados a orden o turno
        addCol('adjuntos', 'turno_id', 'INTEGER');
        addCol('adjuntos', 'categoria', "TEXT DEFAULT 'archivo'");
        addCol('adjuntos', 'privado', 'INTEGER DEFAULT 0');
        db.exec(`CREATE TABLE IF NOT EXISTS archivos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orden_id INTEGER, turno_id INTEGER,
            categoria TEXT NOT NULL,            -- foto_frente, foto_trasera, foto_lateral_izq, foto_lateral_der, foto_tablero, foto_salida, presupuesto_pdf, otro
            nombre TEXT, ruta TEXT NOT NULL, mime TEXT, bytes INTEGER,
            subido_por INTEGER, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_archivos_orden ON archivos(orden_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_archivos_turno ON archivos(turno_id)`);

        // Agenda de turnos
        db.exec(`CREATE TABLE IF NOT EXISTS turnos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sucursal_id INTEGER NOT NULL,
            cliente_id INTEGER, vehiculo_id INTEGER,
            fecha TEXT NOT NULL,                -- YYYY-MM-DD
            hora TEXT,                          -- HH:MM
            duracion_min INTEGER DEFAULT 30,
            tecnico TEXT,
            estado TEXT NOT NULL DEFAULT 'en_espera',   -- en_espera | en_proceso | terminada
            presupuesto_nro TEXT,               -- número del presupuesto en Boxer (sólo referencia)
            motivo TEXT, notas TEXT,
            orden_id INTEGER,
            creado_por INTEGER, creado_en DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(sucursal_id, fecha)`);

        // Mensajes automáticos (cola) e informes
        db.exec(`CREATE TABLE IF NOT EXISTS mensajes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,                 -- recibimos_auto | auto_listo | service_proximo | informe_diario | turno_recordatorio
            canal TEXT NOT NULL DEFAULT 'whatsapp',  -- whatsapp | email
            cliente_id INTEGER, orden_id INTEGER, turno_id INTEGER, sucursal_id INTEGER,
            destino TEXT, asunto TEXT, cuerpo TEXT NOT NULL,
            clave_unica TEXT UNIQUE,            -- evita duplicados (ej: "listo:123")
            programado_para TEXT NOT NULL DEFAULT (datetime('now')),
            estado TEXT NOT NULL DEFAULT 'pendiente',  -- pendiente | enviado | manual | error | descartado
            intentos INTEGER DEFAULT 0, error TEXT, enviado_at TEXT,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_msg_estado ON mensajes(estado, programado_para)`);
        db.exec(`CREATE TABLE IF NOT EXISTS destinatarios_informe (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL, canal TEXT NOT NULL, destino TEXT NOT NULL,
            sucursal_id INTEGER,                -- NULL = informe consolidado
            activo INTEGER DEFAULT 1)`);
        db.exec(`CREATE TABLE IF NOT EXISTS tareas_programadas (clave TEXT PRIMARY KEY, ultima_ejecucion TEXT)`);

        // Portal del cliente y titularidad del dominio
        addCol('clientes', 'portal_token', 'TEXT');
        addCol('vehiculos', 'cert_token', 'TEXT');
        db.exec(`CREATE TABLE IF NOT EXISTS vehiculo_propietarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehiculo_id INTEGER NOT NULL, cliente_id INTEGER NOT NULL,
            desde TEXT NOT NULL, hasta TEXT,    -- hasta NULL = propietario actual
            motivo TEXT)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_prop_veh ON vehiculo_propietarios(vehiculo_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_prop_cli ON vehiculo_propietarios(cliente_id)`);
        // Patentes: la misma patente cargada con distinta escritura ("AB 123 CD" / "ab123cd") se unifica.
        // Se conserva el vehículo con el servicio más reciente; si el cliente era otro, queda como propietario anterior.
        const norm = (p: string) => p.toUpperCase().replace(/\s+/g, '');
        const todos = db.prepare('SELECT id, patente, cliente_id FROM vehiculos').all() as { id: number; patente: string; cliente_id: number }[];
        const grupos = new Map<string, typeof todos>();
        for (const v of todos) { const k = norm(v.patente.trim()); (grupos.get(k) || grupos.set(k, []).get(k)!).push(v); }
        const rango = db.prepare(`SELECT MIN(date(fecha)) mn, MAX(date(fecha)) mx FROM ordenes_trabajo WHERE vehiculo_id = ?`);
        const insProp = db.prepare('INSERT INTO vehiculo_propietarios (vehiculo_id, cliente_id, desde, hasta, motivo) VALUES (?,?,?,?,?)');
        const hoy = (db.prepare("SELECT date('now') d").get() as { d: string }).d;
        for (const [, g] of grupos) {
            if (g.length < 2) continue;
            const info = g.map(v => ({ v, r: rango.get(v.id) as { mn: string | null; mx: string | null } }))
                .sort((a, b) => (a.r.mx || '').localeCompare(b.r.mx || '') || a.v.id - b.v.id);
            const canon = info[info.length - 1];
            let desdeCanon = canon.r.mn || hoy;
            for (const o of info.slice(0, -1)) {
                db.prepare('UPDATE ordenes_trabajo SET vehiculo_id = ? WHERE vehiculo_id = ?').run(canon.v.id, o.v.id);
                if (o.v.cliente_id !== canon.v.cliente_id) {
                    const hasta = o.r.mx || desdeCanon;
                    insProp.run(canon.v.id, o.v.cliente_id, o.r.mn || hasta, hasta, 'unificación de patente duplicada');
                    if (hasta > desdeCanon) desdeCanon = hasta;
                }
                db.prepare('DELETE FROM vehiculos WHERE id = ?').run(o.v.id);
            }
            (canon as any).desde = desdeCanon;
            db.prepare('UPDATE vehiculos SET patente = ? WHERE id = ?').run(norm(canon.v.patente.trim()), canon.v.id);
        }
        db.exec(`UPDATE vehiculos SET patente = UPPER(REPLACE(TRIM(patente),' ',''))`);
        db.exec(`INSERT INTO vehiculo_propietarios (vehiculo_id, cliente_id, desde)
                 SELECT v.id, v.cliente_id,
                        COALESCE((SELECT MAX(p.hasta) FROM vehiculo_propietarios p WHERE p.vehiculo_id = v.id),
                                 (SELECT MIN(date(o.fecha)) FROM ordenes_trabajo o WHERE o.vehiculo_id = v.id), date('now'))
                 FROM vehiculos v
                 WHERE NOT EXISTS (SELECT 1 FROM vehiculo_propietarios p WHERE p.vehiculo_id = v.id AND p.hasta IS NULL)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_cli_dni ON clientes(dni)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_cli_tel ON clientes(telefono)`);

        // Puntos: columna que el código nuevo usa, y un índice que impide acreditar dos veces la misma orden
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_puntos_cliente ON puntos_clientes(cliente_id)`);
        db.exec(`CREATE TABLE IF NOT EXISTS sesiones_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER, username TEXT, ok INTEGER, ip TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        // Configuración nueva (sin pisar lo existente)
        const cfg = db.prepare('INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?,?,?)');
        cfg.run('informe_hora', '20:30', 'Hora (Argentina) en que se envía el informe de cierre del día');
        cfg.run('recordatorio_service_dias', '7', 'Días de anticipación para avisar el vencimiento del próximo service');
        cfg.run('proximo_service_meses', '6', 'Meses por defecto hasta el próximo service');
        cfg.run('mensajes_activos', '1', 'Enviar mensajes automáticos a clientes (1/0)');
        cfg.run('plantilla_recibimos', 'Hola {cliente}! Recibimos tu {vehiculo} ({patente}) en {sucursal}. Te avisamos apenas esté listo. Seguí el historial en {portal}', 'Mensaje al recibir el vehículo');
        cfg.run('plantilla_listo', 'Hola {cliente}! Tu {vehiculo} ({patente}) está listo para retirar en {sucursal}. Gracias por elegir Nozieres!', 'Mensaje cuando el vehículo está listo');
        cfg.run('plantilla_service', 'Hola {cliente}! El próximo service de tu {vehiculo} ({patente}) vence el {fecha}. Reservá tu turno respondiendo este mensaje.', 'Aviso de service próximo a vencer');
    },
    // v2: plantilla de recordatorio de turno
    (db) => {
        db.prepare('INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?,?,?)')
            .run('plantilla_turno', 'Hola {cliente}! Te recordamos tu turno el {fecha} a las {hora} en {sucursal} para tu {vehiculo} ({patente}). Si no podés venir, avisanos por acá.', 'Recordatorio de turno');
        db.prepare('INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?,?,?)')
            .run('turno_recordatorio_horas', '24', 'Horas antes del turno en que se avisa al cliente automáticamente');
        const c = db.prepare('INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES (?,?,?)');
        c.run('recordatorio_service_activo', '1', 'Enviar automáticamente el aviso de service próximo a vencer (1/0)');
        c.run('informe_activo', '1', 'Enviar el informe de cierre del día a los destinatarios cargados (1/0)');
    },
    // v3: fuera todo vestigio de cobros/cajas en puntos (sin montos; el canje es solo de puntos)
    (db) => {
        const cols = (db.prepare('PRAGMA table_info(configuracion_puntos)').all() as { name: string }[]).map(c => c.name);
        if (!cols.includes('canje_habilitado')) db.exec('ALTER TABLE configuracion_puntos ADD COLUMN canje_habilitado BOOLEAN DEFAULT 1');
        if (cols.includes('habilitar_canje_caja')) {
            db.exec('UPDATE configuracion_puntos SET canje_habilitado = habilitar_canje_caja');
            db.exec('ALTER TABLE configuracion_puntos DROP COLUMN habilitar_canje_caja');
        }
        if (cols.includes('monto_por_punto')) db.exec('ALTER TABLE configuracion_puntos DROP COLUMN monto_por_punto');
    },
    // v4: casillas de avisos por cliente (WhatsApp / mail). Por defecto aceptan ambos.
    (db) => {
        const cols = (db.prepare('PRAGMA table_info(clientes)').all() as { name: string }[]).map(c => c.name);
        if (!cols.includes('avisos_whatsapp')) db.exec('ALTER TABLE clientes ADD COLUMN avisos_whatsapp INTEGER DEFAULT 1');
        if (!cols.includes('avisos_email')) db.exec('ALTER TABLE clientes ADD COLUMN avisos_email INTEGER DEFAULT 1');
    },
];

export function runMigrations(db: Database.Database) {
    const current = db.pragma('user_version', { simple: true }) as number;
    for (let v = current; v < migrations.length; v++) {
        const tx = db.transaction(() => {
            migrations[v](db);
            db.pragma(`user_version = ${v + 1}`);
        });
        tx();
        console.log(`✅ Migración v${v + 1} aplicada`);
    }
}
export const LATEST_VERSION = migrations.length;
