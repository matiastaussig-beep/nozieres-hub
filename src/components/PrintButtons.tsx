"use client";

import React from 'react';

export default function PrintButtons() {
  return (
    <>
      <button
        className="no-print btn-primary"
        style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}
        onClick={() => window.print()}
      >
        Imprimir
      </button>
      <button
        className="no-print btn-primary"
        style={{ position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 100, background: '#333', color: 'white' }}
        onClick={() => window.history.back()}
      >
        Volver
      </button>
    </>
  );
}
