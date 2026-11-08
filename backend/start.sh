#!/bin/sh
# Script de arranque para Render/producción
# Ejecuta prisma migrate deploy y continúa aunque ya esté al día o la DB ya exista.
# Errores P3005 (database not empty / migration history mismatch) se ignoran —
# la DB fue inicializada con prisma db push y las migraciones ya fueron aplicadas
# manualmente con `prisma migrate resolve --applied`.

echo "[start.sh] Ejecutando prisma migrate deploy..."
npx prisma migrate deploy 2>&1 || echo "[start.sh] prisma migrate deploy retornó un código de error (posiblemente ya al día o P3005 esperado). Continuando..."

echo "[start.sh] Iniciando servidor Node..."
exec node dist/server.js
