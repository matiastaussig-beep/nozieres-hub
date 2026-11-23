#!/bin/bash
# Activa la copia continua de la base a Cloudflare R2. Se corre UNA vez en el servidor (/opt/hub).
# Pide las claves por teclado sin mostrarlas y las guarda sólo en /opt/hub/.env.
set -e
cd /opt/hub
ACCOUNT_ID="c4f47c919ddf27d31a0cd8389120e8c5"
read -r -p "Access Key ID: " AK
read -r -s -p "Secret Access Key (no se ve al pegar): " SK; echo
grep -v '^LITESTREAM_' .env > .env.tmp || true
{
  echo "LITESTREAM_BUCKET=nozieres-hub-backups"
  echo "LITESTREAM_ENDPOINT=https://${ACCOUNT_ID}.r2.cloudflarestorage.com"
  echo "LITESTREAM_ACCESS_KEY_ID=${AK}"
  echo "LITESTREAM_SECRET_ACCESS_KEY=${SK}"
} >> .env.tmp
mv .env.tmp .env && chmod 600 .env
mkdir -p deploy
cat > deploy/litestream.yml <<'YML'
dbs:
  - path: /data/nozieres.db
    replicas:
      - type: s3
        bucket: ${LITESTREAM_BUCKET}
        path: nozieres-hub
        endpoint: ${LITESTREAM_ENDPOINT}
        access-key-id: ${LITESTREAM_ACCESS_KEY_ID}
        secret-access-key: ${LITESTREAM_SECRET_ACCESS_KEY}
        retention: 336h
        sync-interval: 1s
YML
if ! grep -q '^  litestream:' docker-compose.yml; then
python3 - <<'PY'
p='docker-compose.yml'
s=open(p).read()
blk="""  litestream:
    image: litestream/litestream:0.3
    restart: always
    command: replicate
    env_file: .env
    volumes:
      - hubdata:/data
      - ./deploy/litestream.yml:/etc/litestream.yml:ro
    depends_on: [app]

"""
s=s.replace("  autoheal:", blk+"  autoheal:",1)
open(p,'w').write(s)
PY
fi
docker compose up -d litestream
sleep 12
docker compose logs litestream --tail 8
