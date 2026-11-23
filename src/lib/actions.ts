'use server';

import db from './db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermiso } from './auth';
import fs from 'fs';
import path from 'path';


// Tipos básicos
export interface Sucursal {
    id: number;
    nombre: string;
    localidad?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    activa: number;
    fecha_registro?: string;
}

export interface Cliente {
    id: number;
    nombre: string;
    dni?: string | null;
    telefono: string | null;
    email: string | null;
    fecha_registro: string;
    puntos_acumulados?: number;
}

export interface Vehiculo {
    id: number;
    patente: string;
    marca: string | null;
    modelo: string | null;
    anio: number | null;
    cliente_id: number;
    tipo_vehiculo: string;
    // Campo que viene del join
    cliente_nombre?: string;
    ultimo_servicio_fecha?: string;
    ultimo_servicio_km?: number;
    ultimo_servicio_aceite?: string;
}

export interface Configuracion {
    clave: string;
    valor: string;
    descripcion: string;
}

export interface ConfiguracionPuntos {
    id: number;
    puntos_base_servicio: number;
    multiplicador_campana: number;
    nombre_campana: string;
    activa_campana: boolean | number;
    puntos_minimos_canje: number;
    canje_habilitado: boolean | number;
}

export async function getConfiguracionPuntos(): Promise<ConfiguracionPuntos> {
    await requirePermiso('configuracion');
    const config = db.prepare('SELECT * FROM configuracion_puntos WHERE id = 1').get() as ConfiguracionPuntos | undefined;
    if (!config) {
        return {
            id: 1,
            puntos_base_servicio: 100,
            multiplicador_campana: 1.0,
            nombre_campana: 'Campaña Estándar',
            activa_campana: false,
            puntos_minimos_canje: 500,
            canje_habilitado: true
        };
    }
    return config;
}

export async function updateConfiguracionPuntos(formData: FormData) {
    await requirePermiso('configuracion');
    const puntos_base_servicio = parseInt(formData.get('puntos_base_servicio') as string) || 100;
    const multiplicador_campana = parseFloat(formData.get('multiplicador_campana') as string) || 1.0;
    const nombre_campana = (formData.get('nombre_campana') as string) || 'Campaña Estándar';
    const activa_campana = formData.get('activa_campana') === 'on' || formData.get('activa_campana') === 'true' || formData.get('activa_campana') === '1' ? 1 : 0;
    const puntos_minimos_canje = parseInt(formData.get('puntos_minimos_canje') as string) || 500;
    const canje_habilitado = formData.get('canje_habilitado') === 'on' || formData.get('canje_habilitado') === 'true' || formData.get('canje_habilitado') === '1' ? 1 : 0;

    const stmt = db.prepare(`
        INSERT INTO configuracion_puntos (id, puntos_base_servicio, multiplicador_campana, nombre_campana, activa_campana, puntos_minimos_canje, canje_habilitado)
        VALUES (1, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            puntos_base_servicio = excluded.puntos_base_servicio,
            multiplicador_campana = excluded.multiplicador_campana,
            nombre_campana = excluded.nombre_campana,
            activa_campana = excluded.activa_campana,
            puntos_minimos_canje = excluded.puntos_minimos_canje,
            canje_habilitado = excluded.canje_habilitado
    `);
    stmt.run(puntos_base_servicio, multiplicador_campana, nombre_campana, activa_campana, puntos_minimos_canje, canje_habilitado);

    revalidatePath('/configuracion');
}



export async function getConfiguraciones(): Promise<Configuracion[]> {
    await requirePermiso('configuracion');
    return db.prepare('SELECT * FROM configuracion').all() as Configuracion[];
}

export async function updateConfiguracionAction(formData: FormData) {
    await requirePermiso('configuracion');
    const data = Object.fromEntries(formData.entries());
    
    // update all keys
    const stmt = db.prepare('UPDATE configuracion SET valor = ? WHERE clave = ?');
    
    // wrap in a transaction
    const updateMany = db.transaction((entries: [string, any][]) => {
        for (const [clave, valor] of entries) {
            stmt.run(valor as string, clave);
        }
    });

    updateMany(Object.entries(data));
    revalidatePath('/configuracion');
    revalidatePath('/ordenes/nueva');
}

export async function getClientes(query: string = ''): Promise<Cliente[]> {
    await requirePermiso('clientes.ver');
    let sql = 'SELECT * FROM clientes';
    const params: any[] = [];
    
    if (query) {
        sql += ' WHERE nombre LIKE ? OR dni LIKE ? OR telefono LIKE ?';
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY nombre ASC';
    const stmt = db.prepare(sql);
    return stmt.all(...params) as Cliente[];
}

export async function createCliente(formData: FormData) {
    await requirePermiso('clientes.editar');
    const nombre = formData.get('nombre') as string;
    const dni = formData.get('dni') as string;
    const telefono = formData.get('telefono') as string;
    const email = formData.get('email') as string;

    const stmt = db.prepare('INSERT INTO clientes (nombre, dni, telefono, email) VALUES (?, ?, ?, ?)');
    stmt.run(nombre, dni || null, telefono, email || null);

    revalidatePath('/clientes');
}

export async function getVehiculos(query: string = ''): Promise<Vehiculo[]> {
    await requirePermiso('vehiculos.ver');
    let sql = `
    SELECT v.*, c.nombre as cliente_nombre,
           (SELECT fecha FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1) as ultimo_servicio_fecha,
           (SELECT kilometraje FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1) as ultimo_servicio_km,
           (SELECT aceite_utilizado FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1) as ultimo_servicio_aceite
    FROM vehiculos v 
    LEFT JOIN clientes c ON v.cliente_id = c.id 
    `;
    
    const params: any[] = [];
    if (query) {
        sql += ' WHERE v.patente LIKE ? OR c.nombre LIKE ?';
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY v.patente ASC';
    const stmt = db.prepare(sql);
    return stmt.all(...params) as Vehiculo[];
}

export async function createVehiculo(formData: FormData) {
    await requirePermiso('vehiculos.editar');
    const patente = formData.get('patente') as string;
    const marca = formData.get('marca') as string;
    const modelo = formData.get('modelo') as string;
    const anio = formData.get('anio') ? parseInt(formData.get('anio') as string) : null;
    const cliente_id = parseInt(formData.get('cliente_id') as string);
    const tipo_vehiculo = formData.get('tipo_vehiculo') as string || 'Auto';

    const stmt = db.prepare('INSERT INTO vehiculos (patente, marca, modelo, anio, cliente_id, tipo_vehiculo) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(patente, marca, modelo, anio, cliente_id, tipo_vehiculo);

    revalidatePath('/vehiculos');
}

export async function updateVehiculoTipoAction(vehiculoId: number, tipo_vehiculo: string) {
    await requirePermiso('vehiculos.editar');
    const stmt = db.prepare('UPDATE vehiculos SET tipo_vehiculo = ? WHERE id = ?');
    stmt.run(tipo_vehiculo, vehiculoId);
    revalidatePath('/vehiculos', 'layout');
    
    const lastOrden = db.prepare('SELECT id FROM ordenes_trabajo WHERE vehiculo_id = ? ORDER BY fecha DESC LIMIT 1').get(vehiculoId) as { id: number } | undefined;
    return lastOrden?.id || null;
}


export interface OrdenTrabajo {
    id: number;
    vehiculo_id: number;
    sucursal_id?: number | null;
    fecha: string;
    kilometraje: number | null;
    notas: string | null;
    total: number;
    estado: string;
    proximo_servicio_km: number | null;
    proximo_servicio_fecha: string | null;
    mecanico: string | null;
    aceite_utilizado: string | null;
    filtros_cambiados: string | null;
    // Campos físicos OT
    presupuesto_nro: string | null;
    servicios_autos: string | null;
    servicios_camioneta: string | null;
    servicios_camion: string | null;
    complementos: string | null;
    observaciones_cliente: string | null;
    tecnico_asignado: string | null;
    hora_ingreso: string | null;
    hora_estimada_fin: string | null;
    observaciones_tecnicas: string | null;
    hora_fin_real: string | null;
    complementos_adicionales: string | null;
    checklist_calidad: string | null;
    // Campos join
    vehiculo_patente?: string;
    vehiculo_marca?: string;
    vehiculo_modelo?: string;
    vehiculo_anio?: number;
    cliente_nombre?: string;
    cliente_telefono?: string;
    sucursal_nombre?: string;
    sucursal_localidad?: string;
}

export async function getVehiculoByPatente(patente: string): Promise<(Vehiculo & { cliente_dni?: string; cliente_telefono?: string; cliente_email?: string }) | null> {
    const stmt = db.prepare(`
        SELECT v.*, c.nombre as cliente_nombre, c.dni as cliente_dni, c.telefono as cliente_telefono, c.email as cliente_email
        FROM vehiculos v
        JOIN clientes c ON v.cliente_id = c.id
        WHERE v.patente = ?
    `);
    return stmt.get(patente) as any || null;
}

export async function getHistorialVehiculo(vehiculoId: number): Promise<OrdenTrabajo[]> {
    await requirePermiso('vehiculos.ver');
    const stmt = db.prepare(`
        SELECT o.*, v.patente as vehiculo_patente, c.nombre as cliente_nombre, s.nombre as sucursal_nombre, s.localidad as sucursal_localidad
        FROM ordenes_trabajo o
        JOIN vehiculos v ON o.vehiculo_id = v.id
        JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN sucursales s ON o.sucursal_id = s.id
        WHERE o.vehiculo_id = ?
        ORDER BY o.fecha DESC
    `);
    return stmt.all(vehiculoId) as OrdenTrabajo[];
}

export async function getClienteById(id: number): Promise<Cliente | null> {
    await requirePermiso('clientes.ver');
    const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(id) as Cliente | null;
    if (cliente) {
        cliente.puntos_acumulados = (db.prepare('SELECT puntos_acumulados p FROM puntos_clientes WHERE cliente_id = ?').get(cliente.id) as { p: number } | undefined)?.p ?? 0;
    }
    return cliente;
}

export async function getVehiculosDeCliente(clienteId: number): Promise<Vehiculo[]> {
    await requirePermiso('clientes.ver');
    return db.prepare(`
        SELECT v.*,
            (SELECT fecha FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1) as ultimo_servicio_fecha,
            (SELECT kilometraje FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1) as ultimo_servicio_km,
            (SELECT aceite_utilizado FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1) as ultimo_servicio_aceite,
            (SELECT proximo_servicio_km FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1) as proximo_servicio_km,
            (SELECT proximo_servicio_fecha FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1) as proximo_servicio_fecha,
            (SELECT kilometraje FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1 OFFSET 1) as penultimo_km,
            (SELECT fecha FROM ordenes_trabajo WHERE vehiculo_id = v.id ORDER BY fecha DESC LIMIT 1 OFFSET 1) as penultima_fecha
        FROM vehiculos v
        WHERE v.cliente_id = ?
        ORDER BY v.patente ASC
    `).all(clienteId) as any[];
}

export async function getHistorialCliente(clienteId: number): Promise<OrdenTrabajo[]> {
    await requirePermiso('clientes.ver');
    return db.prepare(`
        SELECT o.*, v.patente as vehiculo_patente, v.marca as vehiculo_marca, v.modelo as vehiculo_modelo, c.nombre as cliente_nombre, s.nombre as sucursal_nombre, s.localidad as sucursal_localidad
        FROM ordenes_trabajo o
        JOIN vehiculos v ON o.vehiculo_id = v.id
        JOIN clientes c ON v.cliente_id = c.id
        LEFT JOIN sucursales s ON o.sucursal_id = s.id
        WHERE v.cliente_id = ?
        ORDER BY o.fecha DESC
    `).all(clienteId) as OrdenTrabajo[];
}

export async function getOrdenById(id: number): Promise<OrdenTrabajo | null> {
    await requirePermiso('ordenes.ver');
    const stmt = db.prepare(`
    SELECT o.*, v.patente as vehiculo_patente, v.marca as vehiculo_marca, v.modelo as vehiculo_modelo, v.anio as vehiculo_anio, c.nombre as cliente_nombre, c.telefono as cliente_telefono, s.nombre as sucursal_nombre, s.localidad as sucursal_localidad
    FROM ordenes_trabajo o 
    JOIN vehiculos v ON o.vehiculo_id = v.id 
    JOIN clientes c ON v.cliente_id = c.id
    LEFT JOIN sucursales s ON o.sucursal_id = s.id
    WHERE o.id = ?
  `);
    return stmt.get(id) as OrdenTrabajo | null;
}

// --- MÓDULO DE CAPACITACIONES ---

export interface Departamento {
    id: number;
    nombre: string;
}

export interface Empleado {
    id: number;
    nombre: string;
    email: string | null;
    departamento_id: number | null;
    perfil: string | null;
    departamento_nombre?: string;
}

export interface Capacitacion {
    id: number;
    titulo: string;
    descripcion: string | null;
    fecha: string;
    es_obligatoria: number; // SQLite usa 0/1
    departamento_id: number | null;
    departamento_nombre?: string;
}

export async function getDepartamentos(): Promise<Departamento[]> {
    await requirePermiso('capacitaciones');
    return db.prepare('SELECT * FROM departamentos ORDER BY nombre ASC').all() as Departamento[];
}

export async function getEmpleados(): Promise<Empleado[]> {
    await requirePermiso('capacitaciones');
    return db.prepare(`
        SELECT e.*, d.nombre as departamento_nombre 
        FROM empleados e 
        LEFT JOIN departamentos d ON e.departamento_id = d.id 
        ORDER BY e.nombre ASC
    `).all() as Empleado[];
}

export async function getCapacitaciones(): Promise<Capacitacion[]> {
    await requirePermiso('capacitaciones');
    return db.prepare(`
        SELECT c.*, d.nombre as departamento_nombre 
        FROM capacitaciones c 
        LEFT JOIN departamentos d ON c.departamento_id = d.id 
        ORDER BY c.fecha DESC
    `).all() as Capacitacion[];
}

export async function createCapacitacion(formData: FormData) {
    await requirePermiso('capacitaciones');
    const titulo = formData.get('titulo') as string;
    const descripcion = formData.get('descripcion') as string;
    const fecha = formData.get('fecha') as string;
    const es_obligatoria = formData.get('es_obligatoria') === 'on' ? 1 : 0;
    const departamento_id = formData.get('departamento_id') ? parseInt(formData.get('departamento_id') as string) : null;

    const stmt = db.prepare(`
        INSERT INTO capacitaciones (titulo, descripcion, fecha, es_obligatoria, departamento_id) 
        VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(titulo, descripcion, fecha, es_obligatoria, departamento_id);
    const capId = info.lastInsertRowid;

    // Si es obligatoria para un departamento, asignar a todos los empleados de ese departamento
    if (es_obligatoria && departamento_id) {
        const empleados = db.prepare('SELECT id FROM empleados WHERE departamento_id = ?').all() as { id: number }[];
        const insertAsignacion = db.prepare('INSERT INTO capacitacion_empleados (capacitacion_id, empleado_id) VALUES (?, ?)');
        for (const emp of empleados) {
            insertAsignacion.run(capId, emp.id);
        }
    }

    revalidatePath('/capacitaciones');
}

export async function createEmpleado(formData: FormData) {
    await requirePermiso('capacitaciones');
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const departamento_id = formData.get('departamento_id') ? parseInt(formData.get('departamento_id') as string) : null;
    const perfil = formData.get('perfil') as string;

    const stmt = db.prepare('INSERT INTO empleados (nombre, email, departamento_id, perfil) VALUES (?, ?, ?, ?)');
    stmt.run(nombre, email || null, departamento_id, perfil || null);

    revalidatePath('/capacitaciones');
}

// --- MÓDULO DE RECORDATORIOS ---

// --- MÓDULO DE INFORMES ---

export interface ReporteFiltros {
    inicio: string;
    fin: string;
    tecnico?: string;
}
