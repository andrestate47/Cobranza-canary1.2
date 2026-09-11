const { execSync } = require('child_process');

async function main() {
  console.log('================================================================');
  console.log('🔍 ANÁLISIS FORENSE EN EL SERVIDOR VPS (DISCOS, DOCKER, DUMPS)');
  console.log('================================================================');

  console.log('\n--- 1. VERIFICANDO DOCKER CONTENEDORES Y VOLÚMENES ---');
  try {
    const dockerPs = execSync('docker ps -a 2>&1', { encoding: 'utf-8' });
    console.log('docker ps -a:');
    console.log(dockerPs);
  } catch (e) {
    console.log('Docker error/no instalado:', e.message);
  }

  try {
    const dockerVolumes = execSync('docker volume ls 2>&1', { encoding: 'utf-8' });
    console.log('\ndocker volume ls:');
    console.log(dockerVolumes);
  } catch (e) {
    console.log('Docker volumes error:', e.message);
  }

  console.log('\n--- 2. BÚSQUEDA DE CUALQUIER ARCHIVO .SQL, .DUMP, .BACKUP EN EL SERVIDOR ---');
  try {
    const findDumps = execSync('sudo find / -type f \\( -name "*.sql" -o -name "*.dump" -o -name "*.backup" -o -name "*backup*" -o -name "*dump*" \\) 2>/dev/null | grep -v "/proc" | grep -v "/sys" | grep -v "node_modules" | head -100', { encoding: 'utf-8' });
    console.log('Archivos encontrados:');
    console.log(findDumps || 'Ningún archivo de respaldo o dump encontrado.');
  } catch (e) {
    console.log('Error buscando archivos:', e.message);
  }

  console.log('\n--- 3. ARCHIVO .ENV Y CONFIGURACIÓN DE BASE DE DATOS ---');
  try {
    const envContent = execSync('cat /var/www/cobranza/.env', { encoding: 'utf-8' });
    const sanitizedEnv = envContent.replace(/:\/\/[^:]+:[^@]+@/, '://[USUARIO:PASSWORD_OCULTO]@');
    console.log('Configuración de .env (sanitizado):');
    console.log(sanitizedEnv);
  } catch (e) {
    console.log('Error leyendo .env:', e.message);
  }

  console.log('\n================================================================');
}

main();
