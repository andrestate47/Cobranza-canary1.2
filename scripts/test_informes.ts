import { PrismaClient } from "@prisma/client"
import dotenv from "dotenv"
import { getEcuadorDayRange, esDiaDePago, getDiasMoraSinDomingos } from "../lib/date-utils"

dotenv.config()
const prisma = new PrismaClient()


async function getInformeForUser(userId: string, fechaInicio: Date, fechaFin: Date, fecha: Date) {
  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ruta: {
        select: {
          id: true,
          numero: true,
          nombre: true
        }
      }
    }
  })

  const pagos = await prisma.pago.findMany({
    where: {
      userId: userId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin
      }
    },
    include: {
      prestamo: {
        include: {
          cliente: true
        }
      }
    }
  })

  const prestamos = await prisma.prestamo.findMany({
    where: {
      userId: userId,
      createdAt: {
        gte: fechaInicio,
        lte: fechaFin
      }
    },
    include: {
      cliente: true
    }
  })

  const prestamosActivos = await prisma.prestamo.findMany({
    where: {
      userId: userId,
      estado: {
        notIn: ["CANCELADO"]
      }
    },
    include: {
      pagos: true,
      cliente: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          telefono: true
        }
      }
    }
  })

  const gastos = await prisma.gasto.findMany({
    where: {
      userId: userId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin
      }
    }
  })

  const clientesNuevos = await prisma.cliente.findMany({
    where: {
      rutaId: usuario?.rutaId || null,
      createdAt: {
        gte: fechaInicio,
        lte: fechaFin
      }
    }
  })

  const clientesVisitadosIds = [...new Set(pagos.map(p => p.prestamo.clienteId))]
  
  const clientesConPrestamosActivos = await prisma.cliente.findMany({
    where: {
      rutaId: usuario?.rutaId || null,
      prestamos: {
        some: {
          userId: userId,
          estado: {
            notIn: ["CANCELADO"]
          }
        }
      }
    }
  })

  const clientesPendientes = clientesConPrestamosActivos.filter(
    cliente => !clientesVisitadosIds.includes(cliente.id)
  )

  const clientesConPrestamos = await prisma.cliente.findMany({
    where: {
      rutaId: usuario?.rutaId || null
    },
    include: {
      prestamos: {
        where: {
          userId: userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  const clientesRenovacion = clientesConPrestamos.filter(c => c.prestamos.length > 1)
  
  const renovacionesRealizadas = prestamos.filter(p => {
    const cliente = clientesConPrestamos.find(c => c.id === p.clienteId)
    return cliente && cliente.prestamos.length > 1
  })

  const fechaLimiteRenovacion = new Date(fecha)
  fechaLimiteRenovacion.setDate(fechaLimiteRenovacion.getDate() + 5)
  
  const clientesPorRenovar = await prisma.cliente.findMany({
    where: {
      prestamos: {
        some: {
          estado: "ACTIVO",
          fechaFin: {
            lte: fechaLimiteRenovacion
          }
        }
      }
    }
  })

  const renovacionesPendientes = await prisma.prestamo.findMany({
    where: {
      estado: "ACTIVO",
      fechaFin: {
        lt: fecha
      }
    }
  })

  const totalCobrado = pagos.reduce((sum, pago) => 
    sum + parseFloat(pago.monto.toString()), 0
  )

  const totalCobradoEfectivo = pagos
    .filter(p => p.metodoPago === "EFECTIVO")
    .reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)

  const totalCobradoTransferencia = pagos
    .filter(p => p.metodoPago === "TRANSFERENCIA")
    .reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)

  const totalCobradoDeposito = pagos
    .filter(p => p.metodoPago === "DEPOSITO")
    .reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)

  let moraCobrada = 0
  for (const pago of pagos) {
    const prestamo = await prisma.prestamo.findUnique({
      where: { id: pago.prestamoId }
    })
    if (prestamo && prestamo.fechaFin < pago.fecha) {
      const diasMora = getDiasMoraSinDomingos(prestamo.fechaFin, pago.fecha, prestamo.tipoPago)
      const moraPorDia = parseFloat(prestamo.moraCredito.toString())
      moraCobrada += moraPorDia * diasMora
    }
  }

  const dineroTransferencia = totalCobradoTransferencia + totalCobradoDeposito
  
  const transferenciasRealizadas = pagos.filter(p => 
    p.metodoPago === "TRANSFERENCIA" || p.metodoPago === "DEPOSITO"
  ).length
  
  const totalPrestado = prestamos.reduce((sum, prestamo) => 
    sum + parseFloat(prestamo.monto.toString()), 0
  )

  const totalGastos = gastos.reduce((sum, gasto) => 
    sum + parseFloat(gasto.monto.toString()), 0
  )

  const movimientosCajaChica = await prisma.movimientoCajaChica.findMany({
    where: {
      cobradorId: userId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin
      }
    }
  })

  const ingresosExtraCaja = movimientosCajaChica
    .filter(m => m.tipo === "INGRESO" || m.tipo === "ENTREGADO" || m.tipo === "ENTREGA" || m.tipo === "APERTURA_CAJA")
    .reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)

  const egresosExtraCaja = movimientosCajaChica
    .filter(m => m.tipo === "EGRESO" || m.tipo === "EGRESO_GENERAL" || m.tipo === "DEVUELTO" || m.tipo === "DEVOLUCION")
    .reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)

  const gastosCajaChica = movimientosCajaChica
    .filter(m => m.tipo === "GASTO" || m.tipo === "GASTADO")
    .reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)

  const totalGastosReal = totalGastos + gastosCajaChica

  const cierreAnterior = await prisma.cierreDia.findFirst({
    where: {
      userId: userId,
      fecha: {
        lt: fechaInicio
      }
    },
    orderBy: {
      fecha: 'desc'
    }
  })
  
  const saldoInicial = cierreAnterior ? 
    parseFloat(cierreAnterior.saldoEfectivo.toString()) : 0

  const saldoEfectivo = saldoInicial + totalCobrado - totalPrestado - totalGastosReal + ingresosExtraCaja - egresosExtraCaja

  if (pagos.length > 0 || prestamos.length > 0 || totalGastosReal > 0) {
    console.log(`Usuario: ${usuario?.firstName} ${usuario?.lastName}`)
    console.log(`- Pagos: ${pagos.length}, Préstamos: ${prestamos.length}, Gastos: ${gastos.length}`)
    console.log(`- Saldo inicial: ${saldoInicial}`)
    console.log(`- Total cobrado: ${totalCobrado}`)
    console.log(`- Total prestado: ${totalPrestado}`)
    console.log(`- Total gastos: ${totalGastosReal}`)
    console.log(`- Saldo efectivo calculado: ${saldoEfectivo}`)
  }
  return true
}

async function run() {
  const users = await prisma.user.findMany({ where: { role: "COBRADOR" } })
  console.log(`Total cobradores: ${users.length}`)
  
  // Vamos a obtener todas las fechas únicas que tienen pagos, préstamos o gastos
  const allPagos = await prisma.pago.findMany({ select: { fecha: true } })
  const allPrestamos = await prisma.prestamo.findMany({ select: { createdAt: true } })
  
  const dates = new Set<string>()
  allPagos.forEach(p => dates.add(p.fecha.toISOString().split('T')[0]))
  allPrestamos.forEach(p => dates.add(p.createdAt.toISOString().split('T')[0]))
  
  console.log("Fechas con datos:", Array.from(dates))
  
  for (const fechaStr of dates) {
    console.log(`\n================ FECHA: ${fechaStr} ================`)
    const { inicio: fechaInicio, fin: fechaFin } = getEcuadorDayRange(fechaStr)
    for (const user of users) {
      try {
        await getInformeForUser(user.id, fechaInicio, fechaFin, fechaInicio)
      } catch (e: any) {
        console.error(`ERROR for user ${user.id} on date ${fechaStr}:`, e.message, e.stack)
      }
    }
  }
}

run().finally(() => prisma.$disconnect())
