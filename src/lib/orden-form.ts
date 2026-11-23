/** Lee los campos del formulario de orden y los deja listos para guardar (compartido entre alta y edición). */
export function leerFormOrden(f: FormData) {
    const s = (k: string) => String(f.get(k) ?? '').trim();
    const n = (k: string) => { const v = s(k); return v && !isNaN(Number(v)) ? Number(v) : null; };
    const tecnico_asignado = [s('tecnico_1'), s('tecnico_2')].filter(Boolean).join(' y ');
    const aceite = JSON.stringify({
        motor: { marca: s('aceite_motor_marca'), densidad: s('aceite_motor_densidad'), litros: s('aceite_motor_litros') },
        caja: { marca: s('aceite_caja_marca'), densidad: s('aceite_caja_densidad'), litros: s('aceite_caja_litros') },
        diferencial: { marca: s('aceite_diferencial_marca'), densidad: s('aceite_diferencial_densidad'), litros: s('aceite_diferencial_litros') },
    });
    const filtros = JSON.stringify({
        combustible: s('filtro_combustible_detalle'), aire_motor: s('filtro_aire_motor_detalle'),
        aire_motor_primario: s('filtro_aire_motor_primario_detalle'), aire_motor_secundario: s('filtro_aire_motor_secundario_detalle'),
        habitaculo: s('filtro_habitaculo_detalle'), aceite: s('filtro_aceite_detalle'), desecador: s('filtro_desecador_detalle'),
        trampa_agua: s('filtro_trampa_agua_detalle'), aceite_transmision: s('filtro_aceite_transmision_detalle'),
        agua: s('filtro_agua_detalle'), hidraulico: s('filtro_hidraulico_detalle'),
    });
    const checklist = JSON.stringify({
        luces: f.getAll('checklist_luces'), niveles: f.getAll('checklist_niveles'),
        neumaticos: f.getAll('checklist_neumaticos'), bateria: f.getAll('checklist_bateria'),
    });
    return {
        vehiculo_id: n('vehiculo_id'),
        kilometraje: n('kilometraje'),
        proximo_servicio_km: n('proximo_servicio_km'),
        proximo_servicio_fecha: s('proximo_servicio_fecha') || null,
        presupuesto_nro: s('presupuesto_nro'),
        tecnico_asignado,
        aceite, filtros, checklist,
        servicios_autos: JSON.stringify(f.getAll('servicios_autos')),
        servicios_camioneta: JSON.stringify(f.getAll('servicios_camioneta')),
        servicios_camion: JSON.stringify(f.getAll('servicios_camion')),
        complementos: JSON.stringify(f.getAll('complementos')),
        complementos_adicionales: s('complementos_adicionales'),
        observaciones_cliente: s('observaciones_cliente'),
        observaciones_tecnicas: s('observaciones_tecnicas'),
        hora_estimada_fin: s('hora_estimada_fin'),
    };
}
