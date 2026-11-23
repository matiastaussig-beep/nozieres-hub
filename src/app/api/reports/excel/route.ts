import { NextResponse } from 'next/server';
import db from '@/lib/db';
import ExcelJS from 'exceljs';
import { getSesion, can, sucursalesVisibles } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const ses = await getSesion();
    if (!ses || !can(ses.rol, 'informes')) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    try {
        const { searchParams } = new URL(request.url);
        const inicio = searchParams.get('inicio') || '2000-01-01';
        const fin = searchParams.get('fin') || '2100-12-31';
        const tecnico = searchParams.get('tecnico') || 'todos';

        // Include the entire end day
        const finConHora = fin.includes(' ') ? fin : `${fin} 23:59:59`;

        const sucs = sucursalesVisibles(ses);
        let sql = `
            SELECT o.*, v.patente as vehiculo_patente, v.marca as vehiculo_marca, v.modelo as vehiculo_modelo, v.tipo_vehiculo,
                   c.nombre as cliente_nombre, c.telefono as cliente_telefono
            FROM ordenes_trabajo o 
            JOIN vehiculos v ON o.vehiculo_id = v.id 
            JOIN clientes c ON v.cliente_id = c.id
            WHERE o.fecha BETWEEN ? AND ? AND o.sucursal_id IN (${sucs.map(() => '?').join(',') || 'NULL'})
        `;
        const params: any[] = [inicio, finConHora, ...sucs];

        if (tecnico !== 'todos') {
            sql += ` AND o.tecnico_asignado = ?`;
            params.push(tecnico);
        }

        sql += ` ORDER BY o.fecha DESC`;

        const stmt = db.prepare(sql);
        const rows = stmt.all(...params) as any[];

        // --- Process Rankings ---
        const marcasMap: Record<string, number> = {};
        const modelosMap: Record<string, number> = {};
        const aceitesMap: Record<string, number> = {};
        const categoriasMap: Record<string, number> = {};

        rows.forEach(r => {
            // Brand
            const marca = (r.vehiculo_marca || 'SIN MARCA').toUpperCase().trim();
            marcasMap[marca] = (marcasMap[marca] || 0) + 1;

            // Model
            const modelo = (r.vehiculo_modelo || 'SIN MODELO').toUpperCase().trim();
            modelosMap[modelo] = (modelosMap[modelo] || 0) + 1;

            // Category
            const cat = (r.tipo_vehiculo || 'AUTO').toUpperCase().trim();
            categoriasMap[cat] = (categoriasMap[cat] || 0) + 1;

            // Product (Aceite Motor)
            if (r.aceite_utilizado) {
                try {
                    const oil = JSON.parse(r.aceite_utilizado);
                    if (oil.motor && oil.motor.marca) {
                        const motorOil = `${oil.motor.marca} ${oil.motor.densidad || ''}`.toUpperCase().trim();
                        if (motorOil) {
                            aceitesMap[motorOil] = (aceitesMap[motorOil] || 0) + 1;
                        }
                    }
                } catch (e) {}
            }
        });

        const rankingMarcas = Object.entries(marcasMap).sort((a, b) => b[1] - a[1]);
        const rankingModelos = Object.entries(modelosMap).sort((a, b) => b[1] - a[1]);
        const rankingAceites = Object.entries(aceitesMap).sort((a, b) => b[1] - a[1]);
        const rankingCategorias = Object.entries(categoriasMap).sort((a, b) => b[1] - a[1]);

        // --- Create Excel Workbook ---
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Nozieres Hub';
        workbook.created = new Date();

        // Sheet 1: Details
        const sheetDetalle = workbook.addWorksheet('Detalle de Órdenes');
        sheetDetalle.columns = [
            { header: 'ID OT', key: 'id', width: 10 },
            { header: 'Fecha', key: 'fecha', width: 20 },
            { header: 'Cliente', key: 'cliente_nombre', width: 30 },
            { header: 'Teléfono', key: 'cliente_telefono', width: 18 },
            { header: 'Patente', key: 'vehiculo_patente', width: 15 },
            { header: 'Marca', key: 'vehiculo_marca', width: 20 },
            { header: 'Modelo', key: 'vehiculo_modelo', width: 20 },
            { header: 'Tipo Vehículo', key: 'tipo_vehiculo', width: 15 },
                        { header: 'Técnico', key: 'tecnico_asignado', width: 25 },
            { header: 'Aceite Motor', key: 'aceite_motor', width: 25 },
            { header: 'Aceite Caja', key: 'aceite_caja', width: 25 },
            { header: 'Filtros Cambiados', key: 'filtros', width: 40 }
        ];

        rows.forEach(r => {
            let aceiteMotor = '-';
            let aceiteCaja = '-';
            let filtrosList: string[] = [];

            if (r.aceite_utilizado) {
                try {
                    const oil = JSON.parse(r.aceite_utilizado);
                    if (oil.motor) {
                        aceiteMotor = `${oil.motor.marca || ''} ${oil.motor.densidad || ''} (${oil.motor.litros || ''}L)`.trim();
                    }
                    if (oil.caja) {
                        aceiteCaja = `${oil.caja.marca || ''} ${oil.caja.densidad || ''} (${oil.caja.litros || ''}L)`.trim();
                    }
                } catch (e) {}
            }

            if (r.filtros_cambiados) {
                try {
                    const fObj = JSON.parse(r.filtros_cambiados);
                    Object.entries(fObj).forEach(([tipo, detalle]) => {
                        if (detalle) {
                            filtrosList.push(`${tipo}: ${detalle}`);
                        }
                    });
                } catch (e) {}
            }

            sheetDetalle.addRow({
                id: r.id,
                fecha: r.fecha,
                cliente_nombre: r.cliente_nombre,
                cliente_telefono: r.cliente_telefono || 'Sin número',
                vehiculo_patente: r.vehiculo_patente.toUpperCase(),
                vehiculo_marca: r.vehiculo_marca || '-',
                vehiculo_modelo: r.vehiculo_modelo || '-',
                tipo_vehiculo: r.tipo_vehiculo || 'Auto',
                tecnico_asignado: r.tecnico_asignado || '-',
                aceite_motor: aceiteMotor === '()' ? '-' : aceiteMotor,
                aceite_caja: aceiteCaja === '()' ? '-' : aceiteCaja,
                filtros: filtrosList.join(' | ') || '-'
            });
        });

        // Header style
        sheetDetalle.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheetDetalle.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E293B' } // Slate 800
        };

        // Sheet 2: Rankings
        const sheetRankings = workbook.addWorksheet('Rankings y Estadísticas');

        // Brand Ranking
        sheetRankings.getCell('A1').value = 'RANKING DE MARCAS';
        sheetRankings.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FFD97706' } };
        sheetRankings.getCell('A2').value = 'Marca';
        sheetRankings.getCell('B2').value = 'Servicios';
        sheetRankings.getCell('A2').font = { bold: true };
        sheetRankings.getCell('B2').font = { bold: true };
        rankingMarcas.forEach((r, idx) => {
            sheetRankings.getCell(`A${idx + 3}`).value = r[0];
            sheetRankings.getCell(`B${idx + 3}`).value = r[1];
        });

        // Model Ranking
        sheetRankings.getCell('D1').value = 'RANKING DE MODELOS';
        sheetRankings.getCell('D1').font = { bold: true, size: 12, color: { argb: 'FFD97706' } };
        sheetRankings.getCell('D2').value = 'Modelo';
        sheetRankings.getCell('E2').value = 'Servicios';
        sheetRankings.getCell('D2').font = { bold: true };
        sheetRankings.getCell('E2').font = { bold: true };
        rankingModelos.forEach((r, idx) => {
            sheetRankings.getCell(`D${idx + 3}`).value = r[0];
            sheetRankings.getCell(`E${idx + 3}`).value = r[1];
        });

        // Oil Product Ranking
        sheetRankings.getCell('G1').value = 'RANKING DE ACEITES (PRODUCTOS)';
        sheetRankings.getCell('G1').font = { bold: true, size: 12, color: { argb: 'FFD97706' } };
        sheetRankings.getCell('G2').value = 'Aceite / Densidad';
        sheetRankings.getCell('H2').value = 'Servicios';
        sheetRankings.getCell('G2').font = { bold: true };
        sheetRankings.getCell('H2').font = { bold: true };
        rankingAceites.forEach((r, idx) => {
            sheetRankings.getCell(`G${idx + 3}`).value = r[0];
            sheetRankings.getCell(`H${idx + 3}`).value = r[1];
        });

        // Vehicle Category Ranking
        sheetRankings.getCell('J1').value = 'RANKING CATEGORÍA VEHÍCULO';
        sheetRankings.getCell('J1').font = { bold: true, size: 12, color: { argb: 'FFD97706' } };
        sheetRankings.getCell('J2').value = 'Categoría';
        sheetRankings.getCell('K2').value = 'Servicios';
        sheetRankings.getCell('J2').font = { bold: true };
        sheetRankings.getCell('K2').font = { bold: true };
        rankingCategorias.forEach((r, idx) => {
            sheetRankings.getCell(`J${idx + 3}`).value = r[0];
            sheetRankings.getCell(`K${idx + 3}`).value = r[1];
        });

        sheetRankings.columns = [
            { width: 25 }, { width: 15 }, { width: 5 },
            { width: 25 }, { width: 15 }, { width: 5 },
            { width: 30 }, { width: 15 }, { width: 5 },
            { width: 25 }, { width: 15 }
        ];

        const buffer = await workbook.xlsx.writeBuffer();

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="reporte_nozieres_${inicio}_a_${fin}.xlsx"`,
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: 'Error generating excel report: ' + e.message }, { status: 500 });
    }
}
