const { execSync } = require('child_process');

async function main() {
  console.log('=== BUSCANDO PROYECTOS ANTERIORES Y ARCHIVOS .ENV O RESPALDOS EN TODO EL SERVIDOR ===');

  try {
    console.log('\n--- Carpetas en /var/www ---');
    console.log(execSync('ls -la /var/www', { encoding: 'utf-8' }));
  } catch (e) {}

  try {
    console.log('\n--- Carpetas en /root ---');
    console.log(execSync('ls -la /root', { encoding: 'utf-8' }));
  } catch (e) {}

  try {
    console.log('\n--- Todos los archivos .env encontrados en el servidor ---');
    console.log(execSync('find / -name "*.env*" 2>/dev/null | grep -v "/proc" | grep -v "/sys" | grep -v "node_modules"', { encoding: 'utf-8' }));
  } catch (e) {}

  try {
    console.log('\n--- Buscar archivos .sql, .json o respaldos en /var, /root, /home, /tmp ---');
    console.log(execSync('find /var /root /home /tmp -type f \\( -name "*.sql" -o -name "*.json" -o -name "*.dump" -o -name "*.bak" -o -name "*.tar.gz" \\) 2>/dev/null | grep -v "node_modules" | grep -v "package.json" | grep -v "tsconfig" | grep -v "components.json"', { encoding: 'utf-8' }));
  } catch (e) {}
}

main();
