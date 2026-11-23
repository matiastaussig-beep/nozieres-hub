import db from './db';

const FERIADOS_2027_FIJOS = ['2027-01-01', '2027-05-01', '2027-05-25', '2027-07-09', '2027-12-08', '2027-12-25'];
const FERIADOS_2026_ARGENTINA = [
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-03-23', '2026-03-24', 
    '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-25', '2026-06-15', 
    '2026-06-20', '2026-07-09', '2026-07-10', '2026-08-17', '2026-10-12', 
    '2026-11-23', '2026-12-07', '2026-12-08', '2026-12-25'
];

export function getDiasHabiles(year: number, month: number) {
    let diasHabiles = 0;
    // JS Date month is 0-indexed
    const date = new Date(year, month - 1, 1);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (date.getMonth() === month - 1) {
        // Cortar si superamos el día de hoy (para promedios reales del mes en curso)
        if (date > today) {
            break;
        }

        const dayOfWeek = date.getDay();
        // pad zeros for ISO matching
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const isoString = `${y}-${m}-${d}`;
        
        // No contar si es feriado
        if (!FERIADOS_2026_ARGENTINA.includes(isoString) && !FERIADOS_2027_FIJOS.includes(isoString)) {
            // 0 = Domingo, 1-5 = Lunes a Viernes, 6 = Sábado
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                diasHabiles += 1;
            } else if (dayOfWeek === 6) {
                diasHabiles += 0.5;
            }
        }
        date.setDate(date.getDate() + 1);
    }
    return diasHabiles;
}

export async function getDashboardStats(selectedMonth?: string, sucursales: number[] = []) {
    const ids = sucursales.filter(n => Number.isInteger(n));
    const OT = `(SELECT * FROM ordenes_trabajo WHERE estado = 'terminada'${ids.length ? ` AND sucursal_id IN (${ids.join(',')})` : ''})`;
    const currentMes = selectedMonth || new Date().toISOString().slice(0, 7);

    // 1. Conteo de vehículos atendidos por tipo (Histórico)
    const vehiculosPorTipoRaw = db.prepare(`
        SELECT v.tipo_vehiculo, COUNT(o.id) as cantidad
        FROM ${OT} o
        JOIN vehiculos v ON o.vehiculo_id = v.id
        GROUP BY v.tipo_vehiculo
    `).all();

    // Normalizar a un objeto para fácil acceso
    const vehiculosPorTipo = {
        'Auto': 0, 'Camioneta': 0, 'Camion': 0
    };
    (vehiculosPorTipoRaw as any[]).forEach(row => {
        const t = row.tipo_vehiculo === 'Camión' ? 'Camion' : (row.tipo_vehiculo || 'Auto');
        vehiculosPorTipo[t as keyof typeof vehiculosPorTipo] += row.cantidad;
    });

    // 2. Evolución histórica (Agrupada por MES)
    const evolucionRaw = db.prepare(`
        SELECT strftime('%Y-%m', fecha) as mes, COUNT(id) as cantidad
        FROM ${OT}
        GROUP BY mes
        ORDER BY mes ASC
        LIMIT 12
    `).all();

    const mesesEspanol = {
        '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
        '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };
    const evolucion = (evolucionRaw as any[]).map(row => {
        const [year, numMes] = row.mes.split('-');
        return {
            mesAbsoluto: row.mes,
            mesCorto: `${mesesEspanol[numMes as keyof typeof mesesEspanol]} ${year.substring(2)}`,
            cantidad: row.cantidad
        }
    });

    // 3. Mecánico Top (el que tiene más OTs asignadas)
    const topMecanico = db.prepare(`
        SELECT tecnico_asignado, COUNT(id) as cantidad
        FROM ${OT}
        WHERE tecnico_asignado IS NOT NULL AND tecnico_asignado != ''
        GROUP BY tecnico_asignado
        ORDER BY cantidad DESC
        LIMIT 1
            `).get() as { tecnico_asignado: string, cantidad: number } | undefined;

    // 4. Calculo de Tiempos Real vs Estándar (Promedio por tipo en minutos)
    const statsTiempos: Record<string, { totalMin: number, count: number, avg: number, std: number }> = {
        'Auto': { totalMin: 0, count: 0, avg: 0, std: 25 },
        'Camioneta': { totalMin: 0, count: 0, avg: 0, std: 25 },
        'Camion': { totalMin: 0, count: 0, avg: 0, std: 90 },
    };

    const tiemposDB = db.prepare(`
        SELECT v.tipo_vehiculo, o.hora_ingreso, o.hora_fin_real
        FROM ${OT} o
        JOIN vehiculos v ON o.vehiculo_id = v.id
        WHERE o.hora_ingreso IS NOT NULL AND o.hora_ingreso != '' 
          AND o.hora_fin_real IS NOT NULL AND o.hora_fin_real != ''
            `).all();

    (tiemposDB as any[]).forEach(row => {
        try {
            const h1 = row.hora_ingreso.split(':');
            const h2 = row.hora_fin_real.split(':');

            let min1 = parseInt(h1[0]) * 60 + parseInt(h1[1]);
            let min2 = parseInt(h2[0]) * 60 + parseInt(h2[1]);

            let diff = min2 - min1;
            if (diff < 0) diff += 24 * 60; // Cruzó medianoche?

            // Descartar si el error es grosero (más de 10 horas ej cerraron la pestaña y volvieron al día ss)
            if (diff < 600) {
                const tipo = row.tipo_vehiculo === 'Camión' ? 'Camion' : (row.tipo_vehiculo || 'Auto');
                if (statsTiempos[tipo]) {
                    statsTiempos[tipo].totalMin += diff;
                    statsTiempos[tipo].count++;
                }
            }
        } catch (e) { }
    });

    Object.keys(statsTiempos).forEach(k => {
        if (statsTiempos[k].count > 0) {
            statsTiempos[k].avg = Math.round(statsTiempos[k].totalMin / statsTiempos[k].count);
        }
    });

    // 5. Próximas Capacitaciones Obligatorias (próximos 30 días)
    const capacitacionesProximas = db.prepare(`
        SELECT c.*, d.nombre as departamento_nombre
        FROM capacitaciones c
        LEFT JOIN departamentos d ON c.departamento_id = d.id
        WHERE c.es_obligatoria = 1 AND c.fecha >= date('now')
        ORDER BY c.fecha ASC
        LIMIT 3
    `).all();

    // 6. Indicador de services por día hábil
    const [yearStr, monthStr] = currentMes.split('-');
    const diasHabiles = getDiasHabiles(parseInt(yearStr), parseInt(monthStr));
    
    const countMesRaw = db.prepare(`
        SELECT COUNT(id) as cantidad
        FROM ${OT}
        WHERE strftime('%Y-%m', fecha) = ?
    `).get(currentMes) as { cantidad: number } | undefined;
    
    const totalServicesMes = countMesRaw ? countMesRaw.cantidad : 0;
    const servicesPorDiaHabil = diasHabiles > 0 ? Math.round(totalServicesMes / diasHabiles).toString() : '0';

    // 7. Clientes nuevos del mes seleccionado
    // Un cliente es "nuevo" cuando su PRIMER service histórico cae en ese mes
    const clientesNuevosMesRaw = db.prepare(`
        SELECT COUNT(*) as total
        FROM (
            SELECT v.cliente_id, MIN(o.fecha) as primera_fecha
            FROM ${OT} o
            JOIN vehiculos v ON o.vehiculo_id = v.id
            GROUP BY v.cliente_id
        )
        WHERE strftime('%Y-%m', primera_fecha) = ?
    `).get(currentMes) as { total: number } | undefined;
    const clientesNuevosMes = clientesNuevosMesRaw?.total ?? 0;

    // 8. Vehículos que vienen por primera vez en el mes seleccionado
    const vehiculosNuevosMesRaw = db.prepare(`
        SELECT COUNT(*) as total
        FROM (
            SELECT vehiculo_id, MIN(fecha) as primera_fecha
            FROM ${OT}
            GROUP BY vehiculo_id
        )
        WHERE strftime('%Y-%m', primera_fecha) = ?
    `).get(currentMes) as { total: number } | undefined;
    const vehiculosNuevosMes = vehiculosNuevosMesRaw?.total ?? 0;

    // 9. Calcular mes anterior para comparación (variación %)
    let prevYearN = parseInt(yearStr);
    let prevMonthN = parseInt(monthStr) - 1;
    if (prevMonthN === 0) { prevMonthN = 12; prevYearN--; }
    const prevMes = `${prevYearN}-${String(prevMonthN).padStart(2, '0')}`;

    const clientesPrevRaw = db.prepare(`
        SELECT COUNT(*) as total
        FROM (
            SELECT v.cliente_id, MIN(o.fecha) as primera_fecha
            FROM ${OT} o
            JOIN vehiculos v ON o.vehiculo_id = v.id
            GROUP BY v.cliente_id
        )
        WHERE strftime('%Y-%m', primera_fecha) = ?
    `).get(prevMes) as { total: number } | undefined;
    const clientesPrevMes = clientesPrevRaw?.total ?? 0;

    const vehiculosPrevRaw = db.prepare(`
        SELECT COUNT(*) as total
        FROM (
            SELECT vehiculo_id, MIN(fecha) as primera_fecha
            FROM ${OT} GROUP BY vehiculo_id
        )
        WHERE strftime('%Y-%m', primera_fecha) = ?
    `).get(prevMes) as { total: number } | undefined;
    const vehiculosPrevMes = vehiculosPrevRaw?.total ?? 0;

    // 10. Captación histórica mes a mes: clientes nuevos + vehículos nuevos (últimos 12 meses)
    // Clientes: primer service histórico por cliente
    const captacionClientesRaw = db.prepare(`
        SELECT strftime('%Y-%m', primera_fecha) as mes, COUNT(*) as clientes
        FROM (
            SELECT v.cliente_id, MIN(o.fecha) as primera_fecha
            FROM ${OT} o
            JOIN vehiculos v ON o.vehiculo_id = v.id
            GROUP BY v.cliente_id
        )
        GROUP BY mes
        ORDER BY mes ASC
        LIMIT 12
    `).all() as { mes: string; clientes: number }[];

    const captacionVehiculosRaw = db.prepare(`
        SELECT strftime('%Y-%m', primera_fecha) as mes, COUNT(*) as vehiculos
        FROM (
            SELECT vehiculo_id, MIN(fecha) as primera_fecha
            FROM ${OT}
            GROUP BY vehiculo_id
        )
        GROUP BY mes
        ORDER BY mes ASC
        LIMIT 12
    `).all() as { mes: string; vehiculos: number }[];

    // Combinar en un mapa para tener ambas series alineadas por mes
    const captacionMap: Record<string, { clientes: number; vehiculos: number }> = {};
    captacionClientesRaw.forEach(r => {
        if (!captacionMap[r.mes]) captacionMap[r.mes] = { clientes: 0, vehiculos: 0 };
        captacionMap[r.mes].clientes = r.clientes;
    });
    captacionVehiculosRaw.forEach(r => {
        if (!captacionMap[r.mes]) captacionMap[r.mes] = { clientes: 0, vehiculos: 0 };
        captacionMap[r.mes].vehiculos = r.vehiculos;
    });

    const captacionHistorica = Object.entries(captacionMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, vals]) => {
            const [y, m] = mes.split('-');
            return {
                mes,
                mesCorto: `${mesesEspanol[m as keyof typeof mesesEspanol]} ${y.substring(2)}`,
                clientes: vals.clientes,
                vehiculos: vals.vehiculos,
            };
        });

    return {
        vehiculosPorTipo,
        evolucion,
        topMecanico,
        statsTiempos,
        capacitacionesProximas,
        indicadorMes: {
            mes: currentMes,
            diasHabiles: diasHabiles,
            totalServices: totalServicesMes,
            promedioPorDia: servicesPorDiaHabil
        },
        captacion: {
            clientesNuevosMes,
            vehiculosNuevosMes,
            clientesPrevMes,
            vehiculosPrevMes,
            historico: captacionHistorica,
        }
    };
}
