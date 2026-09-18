#!/bin/bash

# Script para instalar el Cron Job de Respaldos Automáticos en el VPS
# Ejecuta el respaldo de la base de datos todos los días a las 02:00 AM

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_PATH=$(which node)

if [ -z "$NODE_PATH" ]; then
  NODE_PATH="/usr/bin/node"
fi

CRON_JOB_BACKUP="0 2 * * * cd $APP_DIR && $NODE_PATH scripts/vps-auto-backup.js >> $APP_DIR/backups/cron.log 2>&1"
CRON_JOB_CIERRE="0 0 * * * cd $APP_DIR && $NODE_PATH scripts/cierre-cron-job.js >> $APP_DIR/backups/cierre-cron.log 2>&1"

# Verificar e instalar en crontab
(crontab -l 2>/dev/null | grep -v "scripts/vps-auto-backup.js" | grep -v "scripts/cierre-cron-job.js"; echo "$CRON_JOB_BACKUP"; echo "$CRON_JOB_CIERRE") | crontab -

echo "================================================================"
echo "✅ CRON JOBS INSTALADOS CORRECTAMENTE EN EL VPS"
echo "================================================================"
echo "Directorio de la App: $APP_DIR"
echo "Ejecutable Node: $NODE_PATH"
echo "1. Respaldo Automático: Todos los días a las 02:00 AM"
echo "2. Cierre de Caja Automático: Todos los días a las 12:00 AM (00:00)"
echo "Logs de cierre: $APP_DIR/backups/cierre-cron.log"
echo "================================================================"

