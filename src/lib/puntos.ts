import db from './db';

export interface ConfigPuntos { puntos_base_servicio: number; multiplicador_campana: number; nombre_campana: string; activa_campana: number; puntos_minimos_canje: number; canje_habilitado: number }

export function configPuntos(): ConfigPuntos {
    return db.prepare('SELECT * FROM configuracion_puntos WHERE id = 1').get() as ConfigPuntos;
}

/** Puntos por una orden terminada: base fija (× campaña si está activa). Sin montos: eso es de Boxer. */
export function puntosPorOrden(): { puntos: number; concepto: string } {
    const c = configPuntos();
    let p = c.puntos_base_servicio || 100;
    let extra = '';
    if (c.activa_campana && Number(c.multiplicador_campana) > 1) { p = Math.round(p * Number(c.multiplicador_campana)); extra = ` · ${c.nombre_campana} (${c.multiplicador_campana}x)`; }
    return { puntos: p, concepto: extra };
}

/** Acredita puntos de la orden UNA sola vez (marca puntos_otorgados dentro de la misma transacción). */
export function acreditarPuntosOrden(ordenId: number): number {
    const tx = db.transaction(() => {
        const o = db.prepare(`SELECT o.id, o.sucursal_id, o.puntos_otorgados, v.cliente_id FROM ordenes_trabajo o JOIN vehiculos v ON v.id = o.vehiculo_id WHERE o.id = ?`).get(ordenId) as any;
        if (!o || o.puntos_otorgados) return 0;
        const { puntos, concepto } = puntosPorOrden();
        db.prepare(`INSERT INTO puntos_clientes (cliente_id, puntos_acumulados, ultimo_movimiento) VALUES (?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(cliente_id) DO UPDATE SET puntos_acumulados = puntos_acumulados + excluded.puntos_acumulados, ultimo_movimiento = CURRENT_TIMESTAMP`).run(o.cliente_id, puntos);
        db.prepare('INSERT INTO puntos_historial (cliente_id, orden_id, sucursal_id, puntos, concepto) VALUES (?,?,?,?,?)').run(o.cliente_id, ordenId, o.sucursal_id, puntos, `Servicio #${ordenId}${concepto}`);
        db.prepare('UPDATE ordenes_trabajo SET puntos_otorgados = 1 WHERE id = ?').run(ordenId);
        return puntos;
    });
    return tx();
}

/** Canje: descuenta puntos si alcanzan. Devuelve puntos antes/después o null si no alcanzan. */
export function canjearPuntos(clienteId: number, puntos: number, sucursalId: number | null, concepto: string, ordenId?: number | null) {
    const tx = db.transaction(() => {
        const row = db.prepare('SELECT puntos_acumulados FROM puntos_clientes WHERE cliente_id = ?').get(clienteId) as { puntos_acumulados: number } | undefined;
        const antes = row?.puntos_acumulados || 0;
        if (puntos <= 0 || antes < puntos) return null;
        db.prepare('UPDATE puntos_clientes SET puntos_acumulados = puntos_acumulados - ?, ultimo_movimiento = CURRENT_TIMESTAMP WHERE cliente_id = ?').run(puntos, clienteId);
        db.prepare('INSERT INTO puntos_historial (cliente_id, orden_id, sucursal_id, puntos, concepto) VALUES (?,?,?,?,?)').run(clienteId, ordenId ?? null, sucursalId, -puntos, concepto);
        return { antes, despues: antes - puntos };
    });
    return tx();
}
