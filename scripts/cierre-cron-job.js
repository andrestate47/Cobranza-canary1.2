/**
 * Script de Cron Job para Cierre Automático de Caja a las 12:00 AM (00:00)
 * Invoca el endpoint interno /api/cron/cierre-automatico
 */

const http = require('http');
const https = require('https');

const APP_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'cierre_auto_secret_key';

async function ejecutarCierreCron() {
  const url = `${APP_URL}/api/cron/cierre-automatico?secret=${encodeURIComponent(CRON_SECRET)}`;
  console.log(`[${new Date().toISOString()}] Ejecutando Cierre Automático de Medianoche en: ${url}`);

  const client = url.startsWith('https') ? https : http;

  client.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`[${new Date().toISOString()}] Respuesta Cierre Automático (${res.statusCode}): ${data}`);
    });
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Error al invocar cierre automático:`, err.message);
  });
}

ejecutarCierreCron();
