// Todo el negocio opera en hora de Argentina (Jujuy, UTC-3 todo el año, sin horario de verano).
const TZ = 'America/Argentina/Jujuy';

function partes(d: Date) {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const o: Record<string, string> = {};
    for (const p of f.formatToParts(d)) o[p.type] = p.value;
    return o;
}
export function fechaAR(d = new Date()) { const p = partes(d); return `${p.year}-${p.month}-${p.day}`; }
export function horaAR(d = new Date()) { const p = partes(d); return `${p.hour}:${p.minute}`; }
export function sumarMeses(fechaISO: string, meses: number) {
    const [y, m, d] = fechaISO.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + meses, d));
    return dt.toISOString().slice(0, 10);
}
export function sumarDias(fechaISO: string, dias: number) {
    const [y, m, d] = fechaISO.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}
/** "2026-11-30" -> "30/11/2026" */
export function fechaCorta(iso?: string | null) {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}
/** Minutos entre dos instantes ISO; null si falta alguno. */
export function minutosEntre(a?: string | null, b?: string | null) {
    if (!a || !b) return null;
    const x = Date.parse(a), y = Date.parse(b);
    if (isNaN(x) || isNaN(y)) return null;
    return Math.round((y - x) / 60000);
}
