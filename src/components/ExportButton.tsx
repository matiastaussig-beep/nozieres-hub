'use client';

import React from 'react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
    data: any[];
    filename: string;
    label: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({ data, filename, label }) => {
    const handleExport = () => {
        if (!data || data.length === 0) {
            alert('No hay datos para exportar');
            return;
        }

        // 1. Obtener cabeceras (keys del primer objeto)
        const headers = Object.keys(data[0]);
        
        // 2. Crear filas CSV
        const csvRows = [];
        // Cabecera con BOM para que Excel detecte UTF-8
        csvRows.push('\ufeff' + headers.join(','));

        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                const escaped = ('' + (val ?? '')).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        
        // 3. Descargar el archivo
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button 
            onClick={handleExport}
            className="hero-glass"
            style={{ 
                padding: '0.8rem 1.2rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                cursor: 'pointer',
                border: '1px solid var(--glass-border)',
                color: 'white',
                fontSize: '0.9rem'
            }}
        >
            <Download size={18} /> {label}
        </button>
    );
};

export default ExportButton;
