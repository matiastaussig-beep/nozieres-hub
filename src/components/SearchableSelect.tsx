'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    name: string;
    placeholder?: string;
    required?: boolean;
    onChange?: (value: string) => void;
    defaultValue?: string;
}

export default function SearchableSelect({ options, name, placeholder = 'Seleccione...', required = false, onChange, defaultValue = '' }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedValue, setSelectedValue] = useState(defaultValue);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(option => 
        option.label.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 60); // liviano en celular: se muestran las primeras 60 coincidencias

    const selectedOption = options.find(opt => opt.value === selectedValue);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            {/* Input para validación browser y envío de datos */}
            <input 
                type="text" 
                name={name} 
                value={selectedValue} 
                required={required} 
                onChange={() => {}}
                tabIndex={-1}
                style={{ 
                    position: 'absolute', 
                    opacity: 0, 
                    height: 1, 
                    width: 1, 
                    pointerEvents: 'none',
                    top: '50%'
                }}
            />

            {/* Display / Trigger button */}
            <div 
                className="form-input" 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    cursor: 'pointer',
                    padding: '0.6rem 1rem',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-md)',
                    color: selectedOption ? 'var(--text-main)' : 'var(--text-muted)',
                    marginBottom: 0
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
            </div>

            {/* Dropdown with search */}
            {isOpen && (
                <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    zIndex: 50, 
                    marginTop: '4px',
                    background: '#1a1d24', 
                    border: '1px solid var(--glass-border)', 
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '300px'
                }}>
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Search size={16} style={{ color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (filteredOptions.length > 0) {
                                        const option = filteredOptions[0];
                                        setSelectedValue(option.value);
                                        setIsOpen(false);
                                        setSearch('');
                                        if (onChange) onChange(option.value);
                                    }
                                }
                            }}
                            autoFocus
                            style={{ 
                                width: '100%', 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--text-main)',
                                outline: 'none',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <div 
                                    key={option.value}
                                    style={{ 
                                        padding: '0.8rem 1rem', 
                                        cursor: 'pointer',
                                        background: selectedValue === option.value ? 'rgba(49, 115, 167, 0.2)' : 'transparent',
                                        borderLeft: selectedValue === option.value ? '3px solid var(--accent)' : '3px solid transparent',
                                        color: 'var(--text-main)',
                                        fontSize: '0.9rem',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = selectedValue === option.value ? 'rgba(49, 115, 167, 0.2)' : 'transparent'}
                                    onClick={() => {
                                        setSelectedValue(option.value);
                                        setIsOpen(false);
                                        setSearch(''); // Reset search after select
                                        if (onChange) onChange(option.value);
                                    }}
                                >
                                    {option.label}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                No se encontraron resultados.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
