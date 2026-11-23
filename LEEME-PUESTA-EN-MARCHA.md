# Nozieres Hub v2 — Puesta en marcha (para el dueño)

Qué es: complemento de **taller** para Boxer (órdenes, agenda, fotos, firma, puntos, avisos, informes). No factura, no maneja cajas, ARCA ni inventario.

## Lo único que tenés que hacer vos
1. **Comprar el dominio** (ej. nic.ar → `nozieres.com.ar`). Usaremos `taller.nozieres.com.ar`.
2. **Cuentas** (todas gratis o de pocos USD/mes): GitHub (código), Cloudflare R2 (respaldo continuo), un VPS chico (Hetzner/DigitalOcean/Contabo, ~5 USD/mes, Ubuntu).
3. En Cloudflare/NIC: apuntar `taller` (registro A) a la IP del VPS.
4. En el VPS: instalar Docker, copiar este proyecto, `cp .env.example .env`, completar, y `docker compose up -d`.
5. **WhatsApp Business Cloud API** (token + phone id) y/o datos de correo SMTP. Sin esto igual funciona: los avisos quedan en **/mensajes** con un botón "Enviar por WhatsApp".
6. Elegir en **Configuración → Informes** quién recibe el informe de cierre diario.

## Qué se cuida solo
- HTTPS y renovación del certificado (Caddy). Reinicio automático si algo se cuelga (autoheal). Actualización automática al subir cambios a GitHub (watchtower).
- Respaldo continuo a R2 cada segundo (Litestream) + copia diaria local (14 días).
- Primer arranque: se crea el administrador y la contraseña inicial queda en el archivo `CLAVE_INICIAL_ADMIN.txt` dentro del volumen de datos (`docker compose exec app cat /data/CLAVE_INICIAL_ADMIN.txt`); el sistema obliga a cambiarla.
- Monitor externo gratis: UptimeRobot a `https://taller.../api/health`, te avisa por mail si cae.

## Si algo se rompe
Pasame el mensaje de error: el código está en GitHub y se corrige subiendo un cambio; el servidor lo toma solo en ~5 minutos.
Restaurar base: `litestream restore -o nozieres.db <réplica>` (o la copia diaria en `/data/backups`).

## Alternativa sin VPS
Una PC fija en la sucursal con Docker y Cloudflare Tunnel (sin abrir puertos). Menos segura (cortes de luz/internet): solo si hace falta.

## Roles
- **Técnico**: agenda del día, abrir/cerrar orden, fotos, firma. No ve montos.
- **Vendedor**: agenda, clientes/vehículos, órdenes, mensajes.
- **Administrador**: todo, por sucursal o consolidado, usuarios, informes, puntos.
Clientes y dominios son compartidos entre sucursales; un usuario puede trabajar en ambas.

Importación de la base actual: copiar `nozieres.db` al volumen `/data` ANTES del primer arranque (se migra sola, con copia previa).
