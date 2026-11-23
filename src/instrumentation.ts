export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;
    const { tick } = await import('./lib/scheduler');
    // Primer chequeo a los 20 s de arrancar y luego cada minuto
    setTimeout(() => { tick(); setInterval(tick, 60_000); }, 20_000);
    console.log('⏱️  Tareas automáticas activas (mensajes, informe diario, copias de seguridad)');
}
