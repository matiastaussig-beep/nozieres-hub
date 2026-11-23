import { getDashboardStats } from '@/lib/estadisticas';
import { Activity, Clock, Users, Trophy, ChevronRight, ChevronLeft, Calendar, Car, FileText, GraduationCap, UserPlus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';
import { requireSesion, sucursalesVisibles } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';

export default async function Home(props: { searchParams?: Promise<{ mes?: string }> }) {
  const params = props.searchParams ? await props.searchParams : {};
  const selectedMonth = params.mes || new Date().toISOString().slice(0, 7);
  const ses = await requireSesion();
  if (ses.rol !== 'administrador') redirect('/agenda');
  const sucs = sucursalesVisibles(ses);
  const stats = await getDashboardStats(selectedMonth, sucs);
  const abiertas = (db.prepare(`SELECT COUNT(*) c FROM ordenes_trabajo WHERE estado = 'en_proceso' AND sucursal_id IN (${sucs.map(() => '?').join(',')})`).get(...sucs) as { c: number }).c;
  const porEnviar = (db.prepare("SELECT COUNT(*) c FROM mensajes WHERE estado IN ('manual','error')").get() as { c: number }).c;

  // Funciones para calcular mes anterior y siguiente
  const [yearStr, monthStr] = stats.indicadorMes.mes.split('-');
  let year = parseInt(yearStr);
  let month = parseInt(monthStr);
  
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) { prevMonth = 12; prevYear--; }
  
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth === 13) { nextMonth = 1; nextYear++; }

  const formatMonth = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
  const prevMonthStr = formatMonth(prevYear, prevMonth);
  const nextMonthStr = formatMonth(nextYear, nextMonth);

  const mesesEspanol = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesActualNombre = `${mesesEspanol[month - 1]} ${year}`;

  const maxCantidadHistorica = stats.evolucion.length > 0 ? Math.max(...stats.evolucion.map(e => e.cantidad)) : 10;

  // Variación porcentual mes vs mes anterior
  const calcVariacion = (actual: number, anterior: number) => {
    if (anterior === 0) return null;
    return Math.round(((actual - anterior) / anterior) * 100);
  };
  const varClientes = calcVariacion(stats.captacion.clientesNuevosMes, stats.captacion.clientesPrevMes);
  const varVehiculos = calcVariacion(stats.captacion.vehiculosNuevosMes, stats.captacion.vehiculosPrevMes);

  const renderVariacion = (v: number | null) => {
    if (v === null) return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sin datos prev.</span>;
    if (v > 0) return <span style={{ color: '#4ade80', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}><TrendingUp size={13} /> +{v}% vs mes ant.</span>;
    if (v < 0) return <span style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}><TrendingDown size={13} /> {v}% vs mes ant.</span>;
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}><Minus size={13} /> Sin cambio</span>;
  };

  // Para el gráfico histórico dual
  const maxCaptacion = stats.captacion.historico.length > 0
    ? Math.max(...stats.captacion.historico.flatMap(p => [p.clientes, p.vehiculos]), 1)
    : 10;

  const renderTimeBadge = (avg: number, std: number) => {
    if (avg === 0) return <span style={{ color: 'var(--text-muted)' }}>Sin datos</span>;
    if (avg <= std) return <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{avg} min (Ideal)</span>;
    if (avg <= std * 1.3) return <span style={{ color: '#facc15', fontWeight: 'bold' }}>{avg} min (+{avg - std}m)</span>;
    return <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{avg} min (+{avg - std}m)</span>;
  };

  return (
    <main className="main-container" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>

      <div className="card-grid" style={{ marginBottom: '1rem' }}>
        <Link href="/ordenes?estado=en_proceso" className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Órdenes en proceso ahora</div><div style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa' }}>{abiertas}</div></Link>
        <Link href="/agenda" className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Agenda de hoy</div><div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Ver turnos →</div></Link>
        <Link href="/mensajes" className="card"><div style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Mensajes para enviar / con error</div><div style={{ fontSize: '2rem', fontWeight: 800, color: porEnviar ? '#fbbf24' : '#4ade80' }}>{porEnviar}</div></Link>
      </div>

      <div className="page-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Panel Principal</h1>
          <p className="app-subtitle" style={{ marginBottom: 0 }}>Rendimiento en tiempo real de Nozieres Lubricantes.</p>
        </div>
        
        {/* Selector de Mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
            <Link href={`/?mes=${prevMonthStr}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><ChevronLeft size={20} /></Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 'bold', minWidth: '120px', justifyContent: 'center' }}>
                <Calendar size={18} color="var(--accent)"/> {mesActualNombre}
            </div>
            <Link href={`/?mes=${nextMonthStr}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}><ChevronRight size={20} /></Link>
        </div>
      </div>

      {/* Tarjetas Superiores KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', width: '100%', marginBottom: '2rem' }}>

        {/* KPI: Top Mecánico */}
        <div className="hero-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', padding: '0.8rem', borderRadius: '50%', color: 'var(--accent)' }}>
              <Trophy size={28} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Técnico del Mes (Más Servicios)</p>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{stats.topMecanico ? stats.topMecanico.tecnico_asignado : 'N/A'}</h2>
            </div>
          </div>
          {stats.topMecanico && <p style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>{stats.topMecanico.cantidad} Órdenes procesadas completadas</p>}
        </div>

        {/* KPI: Tiempos Globales */}
        <div className="hero-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '0.8rem', borderRadius: '50%', color: 'white' }}>
              <Clock size={28} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Tiempos Promedio Real vs Estándar</p>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Eficiencia de Box</h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <div style={{ flex: 1 }}><strong>Auto:</strong> <br />{renderTimeBadge(stats.statsTiempos['Auto'].avg, 25)}</div>
            <div style={{ flex: 1 }}><strong>Pick-Up:</strong> <br />{renderTimeBadge(stats.statsTiempos['Camioneta'].avg, 25)}</div>
            <div style={{ flex: 1 }}><strong>Camión:</strong> <br />{renderTimeBadge(stats.statsTiempos['Camion'].avg, 90)}</div>
          </div>
        </div>

        {/* KPI: Services por Día Hábil */}
        <div className="hero-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.8rem', borderRadius: '50%', color: '#3b82f6' }}>
              <Activity size={28} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Promedio Service / Día Hábil</p>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{stats.indicadorMes.promedioPorDia} <span style={{fontSize: '1rem', color:'var(--text-muted)'}}>/ día</span></h2>
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
             Total de <strong>{stats.indicadorMes.totalServices}</strong> services en <strong>{stats.indicadorMes.diasHabiles}</strong> días hábiles.
          </div>
        </div>

        {/* KPI: Capacitaciones Próximas */}
        <div className="hero-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: '0.8rem', borderRadius: '50%', color: '#4ade80' }}>
              <GraduationCap size={28} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Alertas de Capacitación</p>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Próximos Eventos</h2>
            </div>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            {stats.capacitacionesProximas.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No hay capacitaciones pendientes.</p>
            ) : (
              (stats.capacitacionesProximas as any[]).map((cap: any) => (
                <div key={cap.id} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>• {cap.titulo}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(cap.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KPI: Clientes Nuevos del Mes */}
        <div className="hero-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', padding: '0.8rem', borderRadius: '50%', color: '#34d399' }}>
              <UserPlus size={28} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Clientes Nuevos</p>
              <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 800, color: '#34d399' }}>{stats.captacion.clientesNuevosMes}</h2>
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Registrados en {mesActualNombre}
          </div>
          <div style={{ marginTop: '0.4rem' }}>{renderVariacion(varClientes)}</div>
        </div>

        {/* KPI: Vehículos por Primera Vez */}
        <div className="hero-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', padding: '0.8rem', borderRadius: '50%', color: '#a78bfa' }}>
              <Car size={28} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>Vehículos — 1ª Visita</p>
              <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 800, color: '#a78bfa' }}>{stats.captacion.vehiculosNuevosMes}</h2>
            </div>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Primera vez en {mesActualNombre}
          </div>
          <div style={{ marginTop: '0.4rem' }}>{renderVariacion(varVehiculos)}</div>
        </div>

      </div>

      {/* Fila Central: Gráficos de Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem', width: '100%', marginBottom: '2rem' }}>

        {/* Gráfico Tipo Vehiculos */}
        <div className="hero-glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={18} color="var(--accent)" /> Total Vehículos Atendidos
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(stats.vehiculosPorTipo).map(([key, value]) => {
              const maxVal = Math.max(...Object.values(stats.vehiculosPorTipo), 1);
              const percent = Math.round((value / maxVal) * 100);
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                    <span>{key}</span>
                    <span style={{ fontWeight: 'bold' }}>{value}</span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, backgroundColor: key === 'Camion' ? '#f97316' : (key === 'Camioneta' ? '#3b82f6' : 'var(--accent)'), height: '100%', borderRadius: '10px', transition: 'width 1s ease-in-out' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico Histórico Mes a Mes Bar/Line */}
        <div className="hero-glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--accent)" /> Volumen Histórico de Servicios
          </h3>

          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '0.5rem', minHeight: '200px', paddingTop: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {stats.evolucion.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>Aún no hay suficiente histórico para graficar.</p>
            ) : (
              stats.evolucion.map((point, index) => {
                const hPercent = (point.cantidad / maxCantidadHistorica) * 100;
                return (
                  <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '0.3rem', opacity: hPercent > 0 ? 1 : 0 }}>{point.cantidad}</span>
                    <div style={{
                      width: '60%',
                      height: `${hPercent}%`,
                      backgroundColor: 'rgba(255, 215, 0, 0.7)',
                      borderRadius: '4px 4px 0 0',
                      minHeight: hPercent > 0 ? '5px' : '0px',
                      transition: 'height 1s ease-out'
                    }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap' }}>
                      {point.mesCorto}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* Gráfico Histórico: Captación Mes a Mes */}
      <div className="hero-glass" style={{ padding: '1.5rem', width: '100%', marginBottom: '2rem', boxSizing: 'border-box' }}>
        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} color="#34d399" /> Captación Histórica — Clientes Nuevos vs Vehículos Primera Visita
        </h3>

        {/* Leyenda */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#34d399', borderRadius: '3px' }}></div>
            <span style={{ color: 'var(--text-muted)' }}>Clientes Nuevos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#a78bfa', borderRadius: '3px' }}></div>
            <span style={{ color: 'var(--text-muted)' }}>Vehículos 1ª Visita</span>
          </div>
        </div>

        {stats.captacion.historico.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Sin historial disponible.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', minHeight: '180px', paddingTop: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
            {stats.captacion.historico.map((point, index) => {
              const hClientes = Math.round((point.clientes / maxCaptacion) * 100);
              const hVehiculos = Math.round((point.vehiculos / maxCaptacion) * 100);
              return (
                <div key={index} style={{ flex: '0 0 auto', minWidth: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '180px', gap: '2px' }}>
                  {/* Valores encima */}
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '4px', fontSize: '0.7rem' }}>
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>{point.clientes}</span>
                    <span style={{ color: 'var(--text-muted)' }}>/</span>
                    <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{point.vehiculos}</span>
                  </div>
                  {/* Barras dobles */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '140px' }}>
                    <div style={{
                      width: '18px',
                      height: `${hClientes}%`,
                      backgroundColor: '#34d399',
                      borderRadius: '3px 3px 0 0',
                      minHeight: hClientes > 0 ? '4px' : '0',
                      transition: 'height 0.8s ease-out',
                      opacity: 0.85
                    }} />
                    <div style={{
                      width: '18px',
                      height: `${hVehiculos}%`,
                      backgroundColor: '#a78bfa',
                      borderRadius: '3px 3px 0 0',
                      minHeight: hVehiculos > 0 ? '4px' : '0',
                      transition: 'height 0.8s ease-out 0.1s',
                      opacity: 0.85
                    }} />
                  </div>
                  {/* Label mes */}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px', whiteSpace: 'nowrap' }}>
                    {point.mesCorto}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accesos Rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', width: '100%', marginTop: 'auto' }}>
        <Link href="/ordenes/nueva" style={{ padding: '1.2rem', background: 'rgba(255, 215, 0, 0.1)', color: 'var(--accent)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', border: '1px solid rgba(255, 215, 0, 0.2)', transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><FileText size={24} /> <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Abrir Nueva Orden</span></div>
          <ChevronRight />
        </Link>
        <Link href="/vehiculos/nuevo" style={{ padding: '1.2rem', background: 'rgba(255, 255, 255, 0.05)', color: 'white', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', border: '1px solid var(--glass-border)', transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Car size={24} /> <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Registrar Vehículo</span></div>
          <ChevronRight />
        </Link>
        <Link href="/clientes/nuevo" style={{ padding: '1.2rem', background: 'rgba(255, 255, 255, 0.05)', color: 'white', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', border: '1px solid var(--glass-border)', transition: 'all 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Users size={24} /> <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Alta de Cliente</span></div>
          <ChevronRight />
        </Link>
        <Link href="/capacitaciones" style={{ padding: '1.2rem', background: 'rgba(255, 255, 255, 0.05)', color: 'white', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', border: '1px solid var(--glass-border)', transition: 'all 0.2s', gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><GraduationCap size={24} /> <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Módulo de Capacitación y Entrenamiento</span></div>
          <ChevronRight />
        </Link>
      </div>

    </main>
  );
}
