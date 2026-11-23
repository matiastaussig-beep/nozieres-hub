CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  dni TEXT,
  telefono TEXT,
  email TEXT,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sucursales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  localidad TEXT,
  direccion TEXT,
  telefono TEXT,
  activa BOOLEAN DEFAULT 1,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT DEFAULT 'operador', -- 'gerente', 'operador'
  sucursal_id INTEGER,
  activo BOOLEAN DEFAULT 1,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patente TEXT UNIQUE NOT NULL,
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  cliente_id INTEGER NOT NULL,
  tipo_vehiculo TEXT DEFAULT 'Auto',
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehiculo_id INTEGER NOT NULL,
  sucursal_id INTEGER,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  kilometraje INTEGER,
  notas TEXT,
  total REAL DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  checklist_calidad TEXT,
  proximo_servicio_km INTEGER,
  proximo_servicio_fecha TEXT,
  mecanico TEXT,
  aceite_utilizado TEXT,
  filtros_cambiados TEXT,
  presupuesto_nro TEXT,
  servicios_autos TEXT,
  servicios_camioneta TEXT,
  servicios_camion TEXT,
  complementos TEXT,
  observaciones_cliente TEXT,
  tecnico_asignado TEXT,
  hora_ingreso TEXT,
  hora_estimada_fin TEXT,
  observaciones_tecnicas TEXT,
  hora_fin_real TEXT,
  complementos_adicionales TEXT,
  firma_cliente TEXT,
  usuario_id INTEGER,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id),
  FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS inventario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id INTEGER NOT NULL,
  codigo TEXT,
  nombre TEXT NOT NULL,
  categoria TEXT, -- 'aceite', 'filtro', 'insumo', 'servicio'
  stock_actual REAL DEFAULT 0,
  stock_minimo REAL DEFAULT 0,
  precio_costo REAL DEFAULT 0,
  precio_venta REAL DEFAULT 0,
  unidad TEXT DEFAULT 'unidad',
  FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
);

CREATE TABLE IF NOT EXISTS servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  precio_base REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orden_servicios (
  orden_id INTEGER NOT NULL,
  servicio_id INTEGER NOT NULL,
  cantidad INTEGER DEFAULT 1,
  precio_unitario REAL NOT NULL,
  PRIMARY KEY (orden_id, servicio_id),
  FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id),
  FOREIGN KEY (servicio_id) REFERENCES servicios(id)
);

CREATE TABLE IF NOT EXISTS puntos_clientes (
  cliente_id INTEGER PRIMARY KEY,
  puntos_acumulados INTEGER DEFAULT 0,
  ultimo_movimiento DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS puntos_historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  orden_id INTEGER,
  sucursal_id INTEGER,
  puntos INTEGER NOT NULL,
  concepto TEXT NOT NULL,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id),
  FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
);

CREATE TABLE IF NOT EXISTS departamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS empleados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT,
  departamento_id INTEGER,
  perfil TEXT,
  sucursal_id INTEGER,
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
  FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
);

CREATE TABLE IF NOT EXISTS capacitaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha DATETIME NOT NULL,
  es_obligatoria BOOLEAN DEFAULT 0,
  departamento_id INTEGER,
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
);

CREATE TABLE IF NOT EXISTS capacitacion_empleados (
  capacitacion_id INTEGER,
  empleado_id INTEGER,
  estado TEXT DEFAULT 'pendiente',
  PRIMARY KEY (capacitacion_id, empleado_id),
  FOREIGN KEY (capacitacion_id) REFERENCES capacitaciones(id),
  FOREIGN KEY (empleado_id) REFERENCES empleados(id)
);

CREATE TABLE IF NOT EXISTS recordatorios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER,
  cliente_id INTEGER,
  sucursal_id INTEGER,
  tipo TEXT, -- 'service_proximo', 'mantenimiento'
  fecha_programada DATETIME,
  estado TEXT DEFAULT 'pendiente', -- pendiente, enviado, fallido
  metodo TEXT, -- 'whatsapp', 'email'
  mensaje TEXT,
  FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
);

CREATE TABLE IF NOT EXISTS adjuntos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL,
  nombre_archivo TEXT NOT NULL,
  ruta_archivo TEXT NOT NULL,
  tipo_mime TEXT,
  fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id)
);

CREATE TABLE IF NOT EXISTS configuracion_puntos (
  id INTEGER PRIMARY KEY DEFAULT 1,
  puntos_base_servicio INTEGER DEFAULT 100,
  multiplicador_campana REAL DEFAULT 1.0,
  nombre_campana TEXT DEFAULT 'Campaña Estándar',
  activa_campana BOOLEAN DEFAULT 0,
  puntos_minimos_canje INTEGER DEFAULT 500,
  canje_habilitado BOOLEAN DEFAULT 1
);




