'use client';

import { CheckCircle } from 'lucide-react';

export default function PrintSummaryButton() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }} className="no-print">
            <button 
                onClick={() => window.print()}
                className="btn-primary" 
                style={{ padding: '0.8rem 2rem' }}
            >
                <CheckCircle size={18} /> Imprimir resumen del servicio
            </button>
        </div>
    );
}
