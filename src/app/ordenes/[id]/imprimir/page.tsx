import { getOrdenById } from '@/lib/actions';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import PrintButtons from '@/components/PrintButtons';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { requireSesion, puedeVerSucursal } from '@/lib/auth';
import { tokenPortal, baseUrl as appUrl } from '@/lib/mensajes';
import db from '@/lib/db';

export default async function ImprimirOrden({ params }: { params: Promise<{ id: string }> }) {
    const ses = await requireSesion('ordenes.ver');
    const { id } = await params;
    const headerList = await headers();
    const host = headerList.get('host');
    const protocol = host?.includes('localhost') || host?.includes('127.0.0.1') ? 'http' : 'https';
    const baseUrl = appUrl() || `${protocol}://${host}`;
    
    const orden = await getOrdenById(parseInt(id));

    if (!orden || !puedeVerSucursal(ses, orden.sucursal_id)) {
        notFound();
    }
    const cli = db.prepare('SELECT v.cliente_id FROM vehiculos v WHERE v.id = ?').get(orden.vehiculo_id) as { cliente_id: number };
    const qr = await QRCode.toDataURL(`${baseUrl}/p/${tokenPortal(cli.cliente_id)}`, { margin: 1, width: 180 });

    // Cast
    const info = orden as any;
    const autos = JSON.parse(info.servicios_autos || '[]');
    const camioneta = JSON.parse(info.servicios_camioneta || '[]');
    const camion = JSON.parse(info.servicios_camion || '[]');
    const comp = JSON.parse(info.complementos || '[]');

    // Constantes de listado para reconstruir la tabla
    const sAutos = [
        "Cambio de filtro Aceite", "Cambio de Filtro de Aire", "Cambio de Filtro AC",
        "Cambio de Filtro de Combustible", "Cambio de Aceite Motor", "Cambio de Aceite Caja"
    ];
    const sCamioneta = [
        "Cambio de filtro Aceite", "Cambio de Filtro de Aire", "Cambio de Filtro AC",
        "Cambio de Filtro de Combustible", "Cambio de Aceite Motor", "Cambio de Aceite Caja",
        "Cambio de Aceite Diferencial"
    ];
    const sCamion = [
        "Cambio de filtro Aceite", "Cambio de Filtro de Aire", "Cambio de Filtro AC",
        "Cambio de Filtro de COmbustible", "Cambio de Filtro Secador Aire", "Trampa de Agua",
        "Hidraulico", "Cambio de Aceite de Motor", "Cambio de Aceite de Caja", "Cambio de Aceite Diferencial"
    ];

    const c1 = ["Revision General", "Liquido refrigerante", "Lava Parabrisas"];
    const c2 = ["Escobillas", "Liquido de Frenos", "Liquido Hidraulico"];

    return (
        <div className="print-container" style={{ fontFamily: 'sans-serif', position: 'relative' }}>

            <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <Image src="/logo.png" alt="Nozieres Logo" width={180} height={45} style={{ objectFit: 'contain' }} />
                <div style={{ background: 'white', padding: '4px', border: '1px solid #3173a7', borderRadius: '4px' }}>
                    <img 
                        src={qr} 
                        alt="QR Portal Cliente" 
                        width={90} 
                        height={90} 
                    />
                    <p style={{ margin: 0, fontSize: '0.5rem', textAlign: 'center', color: '#3173a7', fontWeight: 'bold' }}>PORTAL Y PUNTOS</p>
                    <p style={{ margin: 0, fontSize: '0.45rem', textAlign: 'center', color: '#666' }}>Escaneá para ver tu historial y puntos</p>

                </div>
            </div>

            <h2 style={{ textAlign: 'center', color: '#3173a7', fontSize: '1.2rem', marginBottom: '1rem', marginTop: '0.5rem' }}>Orden de Trabajo</h2>

            {/* 1. Datos del Cliente */}
            <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ color: '#3173a7', fontSize: '1rem', marginBottom: '0.3rem' }}>1. Datos del Cliente y Vehículo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontSize: '0.8rem' }}>
                    <p>Fecha: <span style={{ textDecoration: 'underline' }}>{new Date(orden.fecha).toLocaleDateString()}</span></p>
                    <p>Nombre del cliente: <span style={{ textDecoration: 'underline' }}>{info.cliente_nombre}</span></p>
                    <p>Teléfono: <span style={{ textDecoration: 'underline' }}>{info.cliente_telefono || ''}</span></p>
                    <p>Correo electrónico: <span style={{ textDecoration: 'underline' }}></span></p>
                    <p>Marca / Modelo: <span style={{ textDecoration: 'underline' }}>{info.vehiculo_marca} {info.vehiculo_modelo}</span></p>
                    <p>Dominio del vehículo: <span style={{ textDecoration: 'underline' }}>{info.vehiculo_patente?.toUpperCase()}</span></p>
                    <p>Kilometraje actual: <span style={{ textDecoration: 'underline' }}>{orden.kilometraje || ''} km</span></p>
                    <p>Próximo Service: <span style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{orden.proximo_servicio_km ? `${orden.proximo_servicio_km} km` : ''}</span></p>
                    <p>Presupuesto Nº: <span style={{ textDecoration: 'underline' }}>{info.presupuesto_nro || ''}</span></p>
                </div>
            </div>

            {/* 2. Servicios */}
            <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ color: '#3173a7', fontSize: '1rem', marginBottom: '0.3rem' }}>2. Servicios Solicitados</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '0.75rem' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid black', padding: '6px', textAlign: 'left' }}>Service Autos</th>
                            <th style={{ border: '1px solid black', padding: '6px', textAlign: 'left' }}>Service Camioneta</th>
                            <th style={{ border: '1px solid black', padding: '6px', textAlign: 'left' }}>Service Camion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                            <tr key={i}>
                                <td style={{ border: '1px solid black', padding: '6px' }}>
                                    {sAutos[i] ? `${sAutos[i]} ${autos.includes(sAutos[i]) ? '(X)' : ''}` : ''}
                                </td>
                                <td style={{ border: '1px solid black', padding: '6px' }}>
                                    {sCamioneta[i] ? `${sCamioneta[i]} ${camioneta.includes(sCamioneta[i]) ? '(X)' : ''}` : ''}
                                </td>
                                <td style={{ border: '1px solid black', padding: '6px' }}>
                                    {sCamion[i] ? `${sCamion[i]} ${camion.includes(sCamion[i]) ? '(X)' : ''}` : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    <thead>
                        <tr><th colSpan={3} style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Complementos</th></tr>
                    </thead>
                    <tbody>
                        {[0, 1, 2].map(i => (
                            <tr key={i}>
                                <td style={{ border: '1px solid black', padding: '4px', width: '33%' }}>
                                    {c1[i]} {comp.includes(c1[i]) ? '(X)' : ''}
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px', width: '33%' }}>
                                    {c2[i]} {comp.includes(c2[i]) ? '(X)' : ''}
                                </td>
                                <td style={{ border: '1px solid black', padding: '4px', width: '34%' }}></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {info.complementos_adicionales && (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.75rem' }}>
                        <strong>Complementos Extra / Manuales: </strong>
                        <span style={{ fontStyle: 'italic' }}>{info.complementos_adicionales}</span>
                    </div>
                )}
            </div>

            {/* 3. Detalles de Insumos (Filtros y Aceites) */}
            <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ color: '#3173a7', fontSize: '1rem', marginBottom: '0.3rem' }}>3. Detalle de Filtros y Aceites Utilizados</h3>
                <div style={{ border: '1px solid black', fontSize: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid black' }}>
                        <div style={{ padding: '4px', borderRight: '1px solid black', backgroundColor: '#f9f9f9' }}><strong>TIPO DE ACEITE</strong></div>
                        <div style={{ padding: '4px', backgroundColor: '#f9f9f9' }}><strong>MARCA / DENSIDAD / CANTIDAD</strong></div>
                    </div>
                    {(() => {
                        try {
                            const ac = JSON.parse(info.aceite_utilizado || '{}');
                            return (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #eee' }}>
                                        <div style={{ padding: '3px 6px', borderRight: '1px solid black' }}>Aceite Motor</div>
                                        <div style={{ padding: '3px 6px' }}>{ac.motor?.marca} {ac.motor?.densidad} {ac.motor?.litros ? `- ${ac.motor.litros} Lts` : ''}</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #eee' }}>
                                        <div style={{ padding: '3px 6px', borderRight: '1px solid black' }}>Aceite Caja</div>
                                        <div style={{ padding: '3px 6px' }}>{ac.caja?.marca} {ac.caja?.densidad} {ac.caja?.litros ? `- ${ac.caja.litros} Lts` : ''}</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid black' }}>
                                        <div style={{ padding: '3px 6px', borderRight: '1px solid black' }}>Aceite Diferencial</div>
                                        <div style={{ padding: '3px 6px' }}>{ac.diferencial?.marca} {ac.diferencial?.densidad} {ac.diferencial?.litros ? `- ${ac.diferencial.litros} Lts` : ''}</div>
                                    </div>
                                </>
                            );
                        } catch (e) { return null; }
                    })()}
                    
                    <div style={{ backgroundColor: '#f9f9f9', padding: '4px', borderBottom: '1px solid black' }}><strong>MARCAS Y MODELOS DE FILTROS</strong></div>
                    <div style={{ padding: '6px' }}>
                        {(() => {
                            try {
                                const fl = JSON.parse(info.filtros_cambiados || '{}');
                                const activeFilters = [
                                    fl.aceite && `Aceite: ${fl.aceite}`,
                                    fl.combustible && `Combustible: ${fl.combustible}`,
                                    fl.aire_motor && `Aire Motor: ${fl.aire_motor}`,
                                    fl.aire_motor_primario && `Aire Primario: ${fl.aire_motor_primario}`,
                                    fl.aire_motor_secundario && `Aire Secundario: ${fl.aire_motor_secundario}`,
                                    fl.habitaculo && `Habitáculo: ${fl.habitaculo}`,
                                    fl.desecador && `Desecador: ${fl.desecador}`,
                                    fl.trampa_agua && `Trampa Agua: ${fl.trampa_agua}`,
                                    fl.aceite_transmision && `Transmisión: ${fl.aceite_transmision}`,
                                    fl.agua && `Agua: ${fl.agua}`,
                                    fl.hidraulico && `Hidráulico: ${fl.hidraulico}`
                                ].filter(Boolean);
                                
                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                                        {activeFilters.map((f, idx) => (
                                            <div key={idx} style={{ fontSize: '0.7rem' }}>• {f}</div>
                                        ))}
                                    </div>
                                );
                            } catch (e) { return <p>-</p>; }
                        })()}
                    </div>
                </div>
            </div>

            {/* 4. Control de Calidad (Checklist) */}
            <div style={{ marginBottom: '1rem', border: '1px solid #4ade80', padding: '0.5rem', borderRadius: '4px', background: 'rgba(74, 222, 128, 0.02)' }}>
                <h3 style={{ color: '#22543d', fontSize: '0.9rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    4. Control de Calidad (Checklist)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.7rem' }}>
                    {(() => {
                        const ck = JSON.parse(info.checklist_calidad || '{"luces":[],"niveles":[],"neumaticos":[],"bateria":[]}');
                        return (
                            <>
                                <div>
                                    <strong>Luces:</strong><br />
                                    {ck.luces.length > 0 ? ck.luces.join(', ') : 'OK'}
                                </div>
                                <div>
                                    <strong>Niveles:</strong><br />
                                    {ck.niveles.length > 0 ? ck.niveles.join(', ') : 'OK'}
                                </div>
                                <div>
                                    <strong>Neumáticos:</strong><br />
                                    {ck.neumaticos.length > 0 ? ck.neumaticos.join(', ') : 'OK'}
                                </div>
                                <div>
                                    <strong>Batería/Otros:</strong><br />
                                    {ck.bateria.length > 0 ? ck.bateria.join(', ') : 'OK'}
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* PAGE BREAK PREVENIDO */}
            <div>
                {/* 5. Observaciones del cliente */}
                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ color: '#3173a7', fontSize: '1rem', marginBottom: '0.3rem' }}>5. Observaciones del Cliente</h3>
                    <p style={{ textDecoration: 'underline', whiteSpace: 'pre-line', minHeight: '1.5rem', fontSize: '0.8rem' }}>
                        {info.observaciones_cliente || '                                                                          '}
                    </p>
                </div>

                {/* 6. Autorización */}
                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.95rem', marginBottom: '0.3rem' }}>6. Autorización de Trabajo</h3>
                    <p style={{ fontSize: '0.75rem', textAlign: 'justify', lineHeight: '1.2' }}>
                        Declaro que el personal de Nozieres Lubricantes, me han explicado el procedimiento, los productos utilizados y las posibles observaciones de mi vehiculo. Me retiro sin inconvenientes en mi vehiculo y conforme con el servicio brindado, sin quejas sobre este o los productos utilizados.
                    </p>
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-end', gap: '2rem' }}>
                        {info.firma_cliente ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={info.firma_cliente} alt="Firma del cliente" style={{ maxWidth: '250px', maxHeight: '100px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }} />
                                <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.2rem', borderTop: '1px solid black', paddingTop: '0.2rem', width: '250px', textAlign: 'center' }}>Firma del Cliente / Aclaración ✓</span>
                            </div>
                        ) : (
                            <span style={{ fontSize: '0.8rem', width: '250px', borderTop: '1px solid black', textAlign: 'center', paddingTop: '0.3rem', display: 'inline-block' }}>Firma del Cliente / Aclaración</span>
                        )}
                    </div>
                </div>

                {/* 7. Registro interno */}
                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ color: '#3173a7', fontSize: '1rem', marginBottom: '0.3rem' }}>7. Registro Interno (Uso del taller)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                        <p style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>Técnico asignado: <span style={{ textDecoration: 'underline' }}>{info.tecnico_asignado}</span></p>
                        <p style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>Fecha/Hora Cierre Real: <span style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{orden.fecha.split('T')[0]} {info.hora_fin_real || ''}</span></p>
                        <p style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>Hora de ingreso del vehículo: <span style={{ textDecoration: 'underline' }}>{info.hora_ingreso || '    :    '}</span></p>
                        <p style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>Hora estimada fin: <span style={{ textDecoration: 'underline' }}>{info.hora_estimada_fin || '    :    '}</span></p>
                    </div>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.3rem', marginBottom: '0.3rem' }}>Observaciones técnicas: <span style={{ textDecoration: 'underline' }}>{info.observaciones_tecnicas}</span></p>
                    <p style={{ textDecoration: 'underline', minHeight: '1rem', width: '100%', display: 'inline-block' }}></p>
                </div>
            </div>



            <PrintButtons />
        </div>
    );
}
