const montoNum = 200;
const interesNum = 20;
const microseguroTipo = 'DEVOLUCION';
const microseguroTotalNum = 10;
const cuotasNum = 24;

const interesTotal = montoNum * (interesNum / 100);
const montoTotal = microseguroTipo === 'DEVOLUCION' 
  ? montoNum + interesTotal
  : montoNum + interesTotal + microseguroTotalNum;
const valorCuota = montoTotal / cuotasNum;

console.log("montoTotal:", montoTotal);
console.log("valorCuota:", valorCuota);
