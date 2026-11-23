'use client';

import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

/** Abre la cámara del celular (o elige una imagen en la compu), reduce la foto y la deja lista para enviar con el formulario. */
async function comprimir(file: File, maxLado = 1600, calidad = 0.78): Promise<File> {
    if (!file.type.startsWith('image/')) return file;
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return file;
    const esc = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * esc); c.height = Math.round(bmp.height * esc);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise(r => c.toBlob(r, 'image/jpeg', calidad));
    return blob ? new File([blob], `${file.name.replace(/\.\w+$/, '')}.jpg`, { type: 'image/jpeg' }) : file;
}

export default function FotoCapture({ name, label, required }: { name: string; label: string; required?: boolean }) {
    const visible = useRef<HTMLInputElement>(null);
    const real = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true);
        const out = await comprimir(f);
        const dt = new DataTransfer(); dt.items.add(out);
        if (real.current) real.current.files = dt.files;
        setPreview(URL.createObjectURL(out));
        setBusy(false);
    };
    const quitar = () => { if (real.current) real.current.value = ''; if (visible.current) visible.current.value = ''; setPreview(null); };

    return (
        <div style={{ border: '1px dashed var(--glass-border)', borderRadius: 12, padding: '.6rem', textAlign: 'center', position: 'relative', minHeight: 120, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
            {preview ? (
                <>{/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt={label} style={{ width: '100%', maxHeight: 130, objectFit: 'cover', borderRadius: 8 }} />
                <button type="button" onClick={quitar} aria-label="Quitar foto" style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.7)', border: 0, borderRadius: 999, color: '#fff', padding: 4, cursor: 'pointer' }}><X size={14} /></button></>
            ) : (
                <button type="button" onClick={() => visible.current?.click()} style={{ background: 'none', border: 0, color: 'var(--accent)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Camera size={26} /><span style={{ fontSize: '.8rem' }}>{busy ? 'Procesando…' : 'Tomar foto'}</span>
                </button>
            )}
            <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{label}{required ? ' *' : ''}</span>
            <input ref={visible} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: 'none' }} />
            <input ref={real} type="file" name={name} style={{ display: 'none' }} />
        </div>
    );
}
