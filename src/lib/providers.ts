import nodemailer from 'nodemailer';

export interface Resultado { ok: boolean; error?: string }

export const waConfigurado = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
export const smtpConfigurado = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

/** WhatsApp Business Cloud API (Meta). Con WHATSAPP_TEMPLATE se usa una plantilla aprobada (necesario para escribir primero a un cliente). */
export async function enviarWhatsApp(destino: string, texto: string): Promise<Resultado> {
    if (!waConfigurado()) return { ok: false, error: 'WhatsApp no configurado' };
    const tpl = process.env.WHATSAPP_TEMPLATE;
    const body = tpl
        ? { messaging_product: 'whatsapp', to: destino, type: 'template', template: { name: tpl, language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'es_AR' }, components: [{ type: 'body', parameters: [{ type: 'text', text: texto.replace(/\s*\n+\s*/g, ' · ').slice(0, 1000) }] }] } }
        : { messaging_product: 'whatsapp', to: destino, type: 'text', text: { body: texto, preview_url: false } };
    try {
        const r = await fetch(`${process.env.WHATSAPP_API_BASE || "https://graph.facebook.com/v21.0"}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST', headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
        });
        if (r.ok) return { ok: true };
        const j: any = await r.json().catch(() => ({}));
        return { ok: false, error: `WhatsApp ${r.status}: ${j?.error?.message || 'error'}`.slice(0, 300) };
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
