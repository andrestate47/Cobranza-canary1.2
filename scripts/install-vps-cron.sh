#!/bin/bash

# Script para instalar el Cron Job de Respaldos Automáticos en el VPS
# Ejecuta el respaldo de la base de datos todos los días a las 02:00 AM

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_PATH=$(which node)

if [ -z "$NODE_PATH" ]; then
  NODE_PATH="/usr/bin/node"
fi

CRON_JOB="0 2 * * * cd $APP_DIR && $NODE_PATH scripts/vps-auto-backup.js >> $APP_DIR/backups/cron.log 2>&1"

# Verificar si ya existe en crontab
(crontab -l 2>/dev/null | grep -v "scripts/vps-auto-backup.js"; echo "$CRON_JOB") | crontab -

echo "================================================================"
echo "✅ CRON JOB DE RESPALDOS AUTOMÁTICOS INSTALADO CORRECTAMENTE"
echo "================================================================"
echo "Directorio de la App: $APP_DIR"
echo "Ejecutable Node: $NODE_PATH"
echo "Frecuencia: Todos los días a las 02:00 AM"
echo "Registro de logs: $APP_DIR/backups/cron.log"
echo "================================================================"
