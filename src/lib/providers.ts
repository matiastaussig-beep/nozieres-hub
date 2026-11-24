import nodemailer from 'nodemailer';

export interface Resultado { ok: boolean; error?: string }

/** Credenciales de WhatsApp: una por sucursal (WHATSAPP_TOKEN_<id> / WHATSAPP_PHONE_ID_<id>) o una general. Así cada aviso sale por el número de su sucursal. */
function credWA(sucursalId?: number | null) {
    const e = process.env;
    const d360 = e.WHATSAPP_AUTH === 'd360';   // proveedores tipo 360dialog: usan D360-API-KEY y no piden ID de número
    const propio = sucursalId ? e[`WHATSAPP_TOKEN_${sucursalId}`] : undefined;
    const token = propio || (sucursalId && hayTokensPorSucursal() ? undefined : e.WHATSAPP_TOKEN);
    const phone = propio ? e[`WHATSAPP_PHONE_ID_${sucursalId}`] : e.WHATSAPP_PHONE_ID;
    if (!token || (!d360 && !phone)) return null;
    return { token, phone, d360 };
}
function hayTokensPorSucursal() { return Object.keys(process.env).some(k => /^WHATSAPP_TOKEN_\d+$/.test(k)); }

export const waConfigurado = (sucursalId?: number | null) => sucursalId === undefined
    ? !!(credWA(null) || Object.keys(process.env).some(k => /^WHATSAPP_TOKEN_\d+$/.test(k) && credWA(Number(k.split('_')[2]))))
    : !!credWA(sucursalId);
export const smtpConfigurado = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

/** WhatsApp Business (Cloud API de Meta o proveedor compatible). Con WHATSAPP_TEMPLATE se usa una plantilla aprobada (necesario para escribir primero a un cliente). */
export async function enviarWhatsApp(destino: string, texto: string, sucursalId?: number | null): Promise<Resultado> {
    const c = credWA(sucursalId ?? null);
    if (!c) return { ok: false, error: 'WhatsApp no configurado' };
    const tpl = process.env.WHATSAPP_TEMPLATE;
    const body = tpl
        ? { messaging_product: 'whatsapp', to: destino, type: 'template', template: { name: tpl, language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'es_AR' }, components: [{ type: 'body', parameters: [{ type: 'text', text: texto.replace(/\s*\n+\s*/g, ' · ').slice(0, 1000) }] }] } }
        : { messaging_product: 'whatsapp', to: destino, type: 'text', text: { body: texto, preview_url: false } };
    const base = process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v21.0';
    const url = c.d360 ? `${base}/messages` : `${base}/${c.phone}/messages`;
    const headers: Record<string, string> = c.d360 ? { 'D360-API-KEY': c.token, 'Content-Type': 'application/json' } : { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' };
    try {
        const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
        if (r.ok) return { ok: true };
        const j: any = await r.json().catch(() => ({}));
        return { ok: false, error: `WhatsApp ${r.status}: ${j?.error?.message || j?.meta?.developer_message || 'error'}`.slice(0, 300) };
    } catch (e: any) { return { ok: false, error: `WhatsApp: ${e.message}`.slice(0, 300) }; }
}

export async function enviarEmail(destino: string, asunto: string, texto: string): Promise<Resultado> {
    if (!smtpConfigurado()) return { ok: false, error: 'Email no configurado' };
    try {
        const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
        await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: destino, subject: asunto, text: texto });
        return { ok: true };
    } catch (e: any) { return { ok: false, error: `Email: ${e.message}`.slice(0, 300) }; }
}
