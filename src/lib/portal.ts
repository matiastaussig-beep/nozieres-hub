import db from './db';

export interface ServicioPortal { id: number; fecha: string; km: number | null; servicios: string[]; sucursal: string | null; proximo_fecha: string | null; proximo_km: number | null; tecnico?: string | null }

function listaServicios(o: any): string[] {
    const j = (s: string | null) => { try { return JSON.parse(s || '[]'); } catch { return []; } };
    return [...j(o.servicios_autos), ...j(o.servicios_camioneta), ...j(o.servicios_camion), ...j(o.complementos)];
}

/** Historial de un vehículo (sólo órdenes terminadas) dentro de un rango de fechas (el período de cada titular). */
export function historialVehiculo(vehiculoId: number, desde?: string | null, hasta?: string | null): ServicioPortal[] {
    const rows = db.prepare(`SELECT o.*, s.nombre sucursal_nombre FROM ordenes_trabajo o LEFT JOIN sucursales s ON s.id = o.sucursal_id
        WHERE o.vehiculo_id = ? AND o.estado = 'terminada' ORDER BY o.fecha DESC, o.id DESC`).all(vehiculoId) as any[];
    return rows.filter(o => {
        const f = String(o.fecha).slice(0, 10);
        return (!desde || f >= desde) && (!hasta || f <= hasta);
    }).map(o => ({ id: o.id, fecha: String(o.fecha).slice(0, 10), km: o.kilometraje, servicios: listaServicios(o), sucursal: o.sucursal_nombre, proximo_fecha: o.proximo_servicio_fecha, proximo_km: o.proximo_servicio_km }));
}

export function datosPortalCliente(token: string) {
    const c = db.prepare('SELECT id, nombre FROM clientes WHERE portal_token = ?').get(token) as { id: number; nombre: string } | undefined;
    if (!c) return null;
    const puntos = (db.prepare('SELECT puntos_acumulados p FROM puntos_clientes WHERE cliente_id = ?').get(c.id) as { p: number } | undefined)?.p ?? 0;
    const movimientos = db.prepare('SELECT fecha, puntos, concepto FROM puntos_historial WHERE cliente_id = ? ORDER BY id DESC LIMIT 15').all(c.id) as { fecha: string; puntos: number; concepto: string }[];
    const props = db.prepare(`SELECT p.*, v.patente, v.marca, v.modelo, v.anio, v.cert_token FROM vehiculo_propietarios p JOIN vehiculos v ON v.id = p.vehiculo_id
        WHERE p.cliente_id = ? ORDER BY p.hasta IS NOT NULL, p.desde DESC`).all(c.id) as any[];
    const vehiculos = props.map(p => ({
        vehiculo_id: p.vehiculo_id as number, patente: p.patente as string, marca: p.marca as string | null, modelo: p.modelo as string | null, anio: p.anio as number | null,
        actual: !p.hasta, desde: p.desde as string, hasta: p.hasta as string | null, cert_token: p.cert_token as string | null,
        // El titular actual ve TODA la historia del dominio; un titular anterior sólo ve la de su período
        historial: p.hasta ? historialVehiculo(p.vehiculo_id, p.desde, p.hasta) : historialVehiculo(p.vehiculo_id),
    }));
    return { cliente: c, puntos, movimientos, vehiculos };
}

export function datosCertificado(token: string) {
    const v = db.prepare('SELECT id, patente, marca, modelo, anio, tipo_vehiculo FROM vehiculos WHERE cert_token = ?').get(token) as any;
    if (!v) return null;
    return { vehiculo: v, historial: historialVehiculo(v.id) };
}
