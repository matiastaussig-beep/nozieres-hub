'use client';

import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SearchInput() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    
    const [query, setQuery] = useState(initialQuery);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (query) {
                params.set('q', query);
            } else {
                params.delete('q');
            }
            router.push(`?${params.toString()}`);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, router, searchParams]);

    return (
        <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
                type="text"
                placeholder="Buscar por patente, nombre o DNI..."
                className="form-input"
                style={{ width: '100%', paddingLeft: '2.5rem', marginBottom: 0 }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
        </div>
    );
}
