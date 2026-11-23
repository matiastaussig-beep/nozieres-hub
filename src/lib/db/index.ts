import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { DB_PATH, BACKUPS_DIR, ensureDirs, DATA_DIR } from '../paths';
import { SCHEMA_SQL } from './schema';
import { runMigrations, LATEST_VERSION } from './migrate';
import { hashPassword } from '../password';

let db: Database.Database;

function initDb(database: Database.Database, existed: boolean) {
    database.pragma('journal_mode = WAL');
    database.pragma('busy_timeout = 5000');
    database.pragma('foreign_keys = OFF'); // la base histórica tiene referencias sueltas; no se bloquean altas por eso

    // Copia de seguridad ANTES de migrar una base que ya existía (si hay migraciones pendientes)
    const version = database.pragma('user_version', { simple: true }) as number;
    if (existed && version < LATEST_VERSION) {
        try {
            const dest = path.join(BACKUPS_DIR, `pre-migracion-v${version}-${Date.now()}.db`);
            database.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
            console.log('🛟 Copia previa a la migración:', dest);
        } catch (e) { console.error('No se pudo hacer la copia previa:', e); }
    }

    database.exec(SCHEMA_SQL);

    // Columnas históricas agregadas a mano en versiones anteriores
    const cols = (t: string) => (database.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map(c => c.name);
    const add = (t: string, c: string, def: string) => { if (!cols(t).includes(c)) database.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); };
    add('ordenes_trabajo', 'sucursal_id', 'INTEGER REFERENCES sucursales(id)');
    add('ordenes_trabajo', 'usuario_id', 'INTEGER REFERENCES usuarios(id)');
    add('configuracion_puntos', 'puntos_minimos_canje', 'INTEGER DEFAULT 500');
    add('configuracion_puntos', 'canje_habilitado', 'BOOLEAN DEFAULT 1');

    runMigrations(database);

    // Datos iniciales sólo si la base está vacía
    const n = (sql: string) => (database.prepare(sql).get() as { c: number }).c;
    if (n('SELECT COUNT(*) c FROM sucursales') === 0) {
        const ins = database.prepare('INSERT INTO sucursales (nombre, localidad, direccion) VALUES (?, ?, ?)');
        ins.run('Central (Ledesma)', 'Ledesma', '');
        ins.run('San Pedro', 'San Pedro', '');
    }
    if (n('SELECT COUNT(*) c FROM configuracion_puntos') === 0) {
        database.prepare(`INSERT INTO configuracion_puntos (id, puntos_base_servicio, multiplicador_campana, nombre_campana, activa_campana)
                          VALUES (1, 100, 1.0, 'Fidelidad Nozieres', 0)`).run();
    }
    // Autorreparación: todo vehículo debe tener un titular vigente (portal del cliente y traspaso de dominio dependen de eso)
    database.exec(`INSERT INTO vehiculo_propietarios (vehiculo_id, cliente_id, desde, motivo)
        SELECT v.id, v.cliente_id, COALESCE((SELECT MIN(date(o.fecha)) FROM ordenes_trabajo o WHERE o.vehiculo_id = v.id), date('now','-3 hours')), 'alta'
        FROM vehiculos v WHERE NOT EXISTS (SELECT 1 FROM vehiculo_propietarios p WHERE p.vehiculo_id = v.id AND p.hasta IS NULL)`);
    if (n('SELECT COUNT(*) c FROM usuarios') === 0) {
        const pass = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
        const r = database.prepare(`INSERT INTO usuarios (nombre, username, password_hash, rol, debe_cambiar_clave) VALUES (?,?,?,?,1)`)
            .run('Administrador', 'admin', hashPassword(pass), 'administrador');
        console.log('🌱 Usuario inicial creado: admin');
        if (!process.env.INITIAL_ADMIN_PASSWORD) {
            const f = path.join(DATA_DIR, 'CLAVE_INICIAL_ADMIN.txt');
            fs.writeFileSync(f, `Usuario: admin\nClave: ${pass}\n(Cambiala al entrar y borrá este archivo)\n`);
            console.log('🔑 La clave inicial quedó en', f);
        }
        void r;
    }
}

function open() {
    ensureDirs();
    const existed = fs.existsSync(DB_PATH);
    const d = new Database(DB_PATH);
    initDb(d, existed);
    return d;
}

const g = global as typeof globalThis & { __nozieresDb?: Database.Database };
if (!g.__nozieresDb) g.__nozieresDb = open();
db = g.__nozieresDb;

export { db };
export default db;
