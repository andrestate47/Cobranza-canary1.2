const { execSync } = require('child_process');

async function main() {
  console.log('=== DISPOSITIVOS DE ALMACENAMIENTO Y PARTICIONES EN EL SERVIDOR ===');
  
  try {
    console.log('\n--- Partitiones y discos (lsblk) ---');
    console.log(execSync('lsblk -f', { encoding: 'utf-8' }));
  } catch (e) {}

  try {
    console.log('\n--- Espacio en discos montados (df -h) ---');
    console.log(execSync('df -h', { encoding: 'utf-8' }));
  } catch (e) {}

  try {
    console.log('\n--- Comprobando volúmenes lógicos (LVM) ---');
    console.log(execSync('lvs 2>/dev/null || vgs 2>/dev/null || pvs 2>/dev/null || echo "No LVM"', { encoding: 'utf-8' }));
  } catch (e) {}

  try {
    console.log('\n--- Historial de instalaciones/paquetes en dpkg ---');
    console.log(execSync('head -n 20 /var/log/dpkg.log 2>/dev/null || echo "Sin dpkg.log"', { encoding: 'utf-8' }));
  } catch (e) {}
}

main();
