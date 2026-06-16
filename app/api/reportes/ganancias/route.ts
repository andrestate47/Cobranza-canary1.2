
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Decimal } from "@prisma/client/runtime/library"

import { getEcuadorDayRange, getEcuadorRange } from "@/lib/date-utils"

export const dynamic = "force-dynamic"

function esDiaDePago(tipoPago: string, fechaInicio: Date, fechaEvaluar: Date): boolean {
  const inicio = new Date(fechaInicio)
  const evaluar = new Date(fechaEvaluar)
  
  // Normalizar a fechas sin hora (12:00:00 UTC) para evitar desfases de zona horaria
  const inicioUTC = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate(), 12, 0, 0)
  const evaluarUTC = Date.UTC(evaluar.getUTCFullYear(), evaluar.getUTCMonth(), evaluar.getUTCDate(), 12, 0, 0)
  
  if (evaluarUTC < inicioUTC) return false
  
  const diffTime = evaluarUTC - inicioUTC
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  const diaSemana = evaluar.getUTCDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  
  if (tipoPago === 'DIARIO') {
    return diaSemana !== 0 // Domingo no se cobra
  }
  if (tipoPago === 'LUNES_A_SABADO') {
    return diaSemana !== 0 // Domingo no se cobra
  }
  if (tipoPago === 'LUNES_A_VIERNES') {
    return diaSemana !== 0 && diaSemana !== 6 // Sábado y Domingo no se cobra
  }
  if (tipoPago === 'SEMANAL') {
    return diffDays % 7 === 0
  }
  if (tipoPago === 'CATORCENAL') {
    return diffDays % 14 === 0
  }
  if (tipoPago === 'QUINCENAL') {
    return diffDays % 15 === 0
  }
  if (tipoPago === 'MENSUAL' || tipoPago === 'FIN_DE_MES') {
    return inicio.getUTCDate() === evaluar.getUTCDate()
  }
  
  return false
}

interface PrestamoConCliente {
  id: string
  monto: Decimal | number
  interes: Decimal | number
  fechaFin: Date | string
  updatedAt: Date
  createdAt: Date
  clienteId: string
  cliente: {
    nombre: string
    apellido: string
    documento: string
  }
  pagos: {
    monto: Decimal | number
  }[]
}

interface PagoConPrestamo {
  id: string
  monto: Decimal | number
  fecha: Date | string
  prestamoId: string
  prestamo: {
    clienteId: string
    monto: Decimal | number
    interes: Decimal | number
    fechaFin: Date | string
    cliente: {
      nombre: string
      apellido: string
      documento: string
    }
  }
  observaciones?: string | null
}

interface GastoBasico {
  id: string
  monto: Decimal | number
  fecha: Date | string
  concepto: string
  observaciones?: string | null
}

interface InteresCliente {
  clienteId: string
  nombre: string
  documento: string
  interesGenerado: number
  interesGanado: number
}

interface TransferenciaConPrestamo {
  id: string
  monto: Decimal | number
  fecha: Date | string
  prestamo: {
    clienteId: string
    cliente: {
      nombre: string
      apellido: string
      documento: string
    }
  }
}

interface PrestamoParaTransferencia {
  id: string
  monto: Decimal | number
  interes: Decimal | number
  pagos: {
    monto: Decimal | number
  }[]
  transferencias: any[]
}

interface UsuarioConSalario {
  id: string
  nombre: string
  apellido: string
  nombreCompleto: string
  email: string
  salario: number
  pagoSemanal: number
  pagoQuincenal: number
  pagoMensual: number
  comisionPorCobro: number
}

interface PagoDetallado {
  id: string
  prestamo: {
    cliente: {
      nombre: string
      apellido: string
    }
  }
  monto: Decimal | number
  fecha: Date
  prestamoId: string
  observaciones?: string | null
}

interface GastoDetallado {
  id: string
  concepto: string
  monto: Decimal | number
  fecha: Date
  observaciones?: string | null
}


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que sea administrador o supervisor
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || "" }
    })

    if (!user || (user.role !== "ADMINISTRADOR" && user.role !== "SUPERVISOR")) {
      return NextResponse.json({ error: "No tienes permisos para ver este reporte" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const fechaInicioParam = searchParams.get("fechaInicio")
    const fechaFinParam = searchParams.get("fechaFin")
    
    let fechaInicioDate: Date
    let fechaFinDate: Date
    
    if (fechaInicioParam && fechaFinParam) {
      const range = getEcuadorRange(fechaInicioParam, fechaFinParam)
      fechaInicioDate = range.inicio
      fechaFinDate = range.fin
    } else {
      // Mes actual por defecto (normalizado a Ecuador)
      const { inicio } = getEcuadorDayRange()
      const base = new Date(inicio)
      fechaInicioDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1, 5, 0, 0))
      fechaFinDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0, 4, 59, 59, 999))
    }

    const hoy = new Date()
    const semanaInicio = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000)
    const mesInicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000)
    const semestreInicio = new Date(hoy.getTime() - 180 * 24 * 60 * 60 * 1000)
    const anualInicio = new Date(hoy.getTime() - 365 * 24 * 60 * 60 * 1000)

    // Consultar datos históricos para el breakdown por periodos (últimos 365 días)
    const pagosAnio = await prisma.pago.findMany({
      where: {
        fecha: {
          gte: anualInicio
        }
      }
    })

    const gastosAnio = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: anualInicio
        }
      }
    })

    const movsAnio = await prisma.movimientoCajaChica.findMany({
      where: {
        fecha: {
          gte: anualInicio
        }
      }
    })

    const prestamosAnio = await prisma.prestamo.findMany({
      where: {
        OR: [
          { createdAt: { gte: anualInicio } },
          { fechaFin: { gte: anualInicio } }
        ]
      },
      include: {
        pagos: true
      }
    })

    // Obtener todos los préstamos en el rango de fechas
    const prestamos = await prisma.prestamo.findMany({
      where: {
        createdAt: {
          gte: fechaInicioDate,
          lte: fechaFinDate
        }
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            documento: true
          }
        },
        pagos: {
          where: {
            fecha: {
              gte: fechaInicioDate,
              lte: fechaFinDate
            }
          }
        }
      }
    })

    // Obtener todos los pagos en el rango de fechas
    const todosPagos = await prisma.pago.findMany({
      where: {
        fecha: {
          gte: fechaInicioDate,
          lte: fechaFinDate
        }
      },
      include: {
        prestamo: {
          include: {
            cliente: {
              select: {
                nombre: true,
                apellido: true,
                documento: true
              }
            }
          }
        }
      }
    })

    // Obtener todos los gastos en el rango de fechas
    const gastos = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: fechaInicioDate,
          lte: fechaFinDate
        }
      }
    })

    // Obtener movimientos de caja chica en el rango
    const movimientosCajaChica = await prisma.movimientoCajaChica.findMany({
      where: {
        fecha: {
          gte: fechaInicioDate,
          lte: fechaFinDate
        }
      }
    })

    // Obtener todos los préstamos para calcular saldos pendientes
    const prestamosConSaldo = await prisma.prestamo.findMany({
      where: {
        estado: 'ACTIVO'
      },
      include: {
        pagos: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            documento: true
          }
        }
      }
    })

    // Obtener préstamos renovados en el rango de fechas
    const prestamosRenovados = await prisma.prestamo.findMany({
      where: {
        estado: 'RENOVADO',
        updatedAt: {
          gte: fechaInicioDate,
          lte: fechaFinDate
        }
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            documento: true
          }
        }
      }
    })

    // Obtener nuevos préstamos (que podrían ser renovaciones)
    const prestamosNuevos = await prisma.prestamo.findMany({
      where: {
        createdAt: {
          gte: fechaInicioDate,
          lte: fechaFinDate
        }
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            documento: true
          }
        }
      }
    })

    // CÁLCULOS FINANCIEROS

    // 1. Capital Invertido (total de préstamos creados en el período)
    const capitalInvertido = (prestamos as PrestamoConCliente[]).reduce((sum: number, prestamo) => 
      sum + parseFloat(prestamo.monto.toString()), 0
    )

    // Expectativa de cobro en el período (suma de las cuotas programadas en el rango)
    const prestamosVigentesPeriodo = await prisma.prestamo.findMany({
      where: {
        fechaInicio: {
          lte: fechaFinDate
        },
        fechaFin: {
          gte: fechaInicioDate
        }
      }
    })

    const diasPeriodo: Date[] = []
    let tempDia = new Date(fechaInicioDate)
    while (tempDia <= fechaFinDate) {
      diasPeriodo.push(new Date(tempDia))
      tempDia.setDate(tempDia.getDate() + 1)
    }

    let expectativaCobroPeriodo = 0
    for (const prestamo of prestamosVigentesPeriodo) {
      const inicioPrestamo = new Date(prestamo.fechaInicio)
      const finPrestamo = new Date(prestamo.fechaFin)
      
      for (const dia of diasPeriodo) {
        if (dia >= inicioPrestamo && dia <= finPrestamo) {
          if (esDiaDePago(prestamo.tipoPago, prestamo.fechaInicio, dia)) {
            expectativaCobroPeriodo += parseFloat(prestamo.valorCuota.toString())
          }
        }
      }
    }

    // 2. Balance Pendiente (suma de todos los saldos pendientes)
    let balancePendiente = 0
    ;(prestamosConSaldo as PrestamoConCliente[]).forEach((prestamo) => {
      const montoTotal = parseFloat(prestamo.monto.toString()) * (1 + parseFloat(prestamo.interes.toString()) / 100)
      const totalPagado = prestamo.pagos.reduce((sum: number, pago) => sum + parseFloat(pago.monto.toString()), 0)
      const saldoPendiente = Math.max(0, montoTotal - totalPagado)
      balancePendiente += saldoPendiente
    })

    // 3. Capital Recuperado (pagos realizados en el período)
    const capitalRecuperado = (todosPagos as PagoConPrestamo[]).reduce((sum: number, pago) => 
      sum + parseFloat(pago.monto.toString()), 0
    )

    // 4. Capital No Recuperado (préstamos vencidos sin pagar)
    let capitalNoRecuperado = 0
    ;(prestamosConSaldo as PrestamoConCliente[])
      .filter((prestamo) => new Date(prestamo.fechaFin) < hoy)
      .forEach((prestamo) => {
        const montoTotal = parseFloat(prestamo.monto.toString()) * (1 + parseFloat(prestamo.interes.toString()) / 100)
        const totalPagado = prestamo.pagos.reduce((sum: number, pago) => sum + parseFloat(pago.monto.toString()), 0)
        const saldoPendiente = Math.max(0, montoTotal - totalPagado)
        capitalNoRecuperado += saldoPendiente
      })

    // 5. Total Intereses (intereses generados por préstamos del período)
    const totalIntereses = (prestamos as PrestamoConCliente[]).reduce((sum: number, prestamo) => {
      const montoInteres = parseFloat(prestamo.monto.toString()) * (parseFloat(prestamo.interes.toString()) / 100)
      return sum + montoInteres
    }, 0)

    // 6. Intereses Cobrados (parte de intereses en los pagos del período)
    let interesesCobrados = 0
    ;(todosPagos as PagoConPrestamo[]).forEach((pago) => {
      const prestamo = pago.prestamo
      const montoOriginal = parseFloat(prestamo.monto.toString())
      const tasaInteres = parseFloat(prestamo.interes.toString()) / 100
      const montoConInteres = montoOriginal * (1 + tasaInteres)
      
      // Calcular qué parte del pago corresponde a intereses
      if (montoConInteres > 0) {
        const porcentajeInteres = (montoConInteres - montoOriginal) / montoConInteres
        const interesEnPago = parseFloat(pago.monto.toString()) * porcentajeInteres
        interesesCobrados += interesEnPago
      }
    })

    // 7. Total de Gastos
    const totalGastos = (gastos as GastoBasico[]).reduce((sum: number, gasto) => 
      sum + parseFloat(gasto.monto.toString()), 0
    )

    // 8. Mora Cobrada (pagos realizados después de fecha de fin del préstamo)
    let moraCobrada = 0
    ;(todosPagos as PagoConPrestamo[]).forEach((pago) => {
      const fechaFin = new Date(pago.prestamo.fechaFin)
      const fechaPago = new Date(pago.fecha)
      
      if (fechaPago > fechaFin) {
        // Calcular mora (ejemplo: 5% del monto por día de retraso)
        const diasRetraso = Math.floor((fechaPago.getTime() - fechaFin.getTime()) / (1000 * 60 * 60 * 24))
        const moraPorDia = parseFloat(pago.monto.toString()) * 0.05 / 30 // 5% mensual prorrateado
        moraCobrada += moraPorDia * diasRetraso
      }
    })

    // 9. Utilidad Neta
    const utilidadNeta = capitalRecuperado + interesesCobrados + moraCobrada - capitalInvertido - totalGastos

    // Datos adicionales para análisis
    const cantidadPrestamos = prestamos.length
    const cantidadPagos = todosPagos.length
    const cantidadGastos = gastos.length
    const cantidadClientesActivos = new Set((todosPagos as PagoConPrestamo[]).map((p) => p.prestamo.clienteId)).size

    // Préstamos por estado
    const prestamosAlDia = (prestamosConSaldo as PrestamoConCliente[]).filter((p) => new Date(p.fechaFin) >= hoy).length
    const prestamosVencidos = (prestamosConSaldo as PrestamoConCliente[]).filter((p) => new Date(p.fechaFin) < hoy).length

    // ROI (Return on Investment)
    const roi = capitalInvertido > 0 ? ((utilidadNeta / capitalInvertido) * 100) : 0

    // ===== RENOVACIONES =====
    const renovacionesGenerales = prestamosRenovados.length
    const renovacionesNuevas = prestamosNuevos.filter((p) => {
      const fechaCreacion = new Date(p.createdAt)
      const primerDiaMes = new Date(fechaInicioDate.getFullYear(), fechaInicioDate.getMonth(), 1)
      return fechaCreacion >= primerDiaMes
    }).length
    const renovacionesRealizadas = prestamosRenovados.length
    
    // Préstamos que están próximos a vencer (renovaciones pendientes)
    const prestamosProximosVencer = await prisma.prestamo.findMany({
      where: {
        estado: 'ACTIVO',
        fechaFin: {
          gte: hoy,
          lte: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 días desde hoy
        }
      }
    })
    const renovacionesPendientes = prestamosProximosVencer.length
    
    const renovacionesPorRealizar = (prestamosConSaldo as PrestamoConCliente[]).filter((p) => {
      const fechaFin = new Date(p.fechaFin)
      const diasParaVencer = Math.floor((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return diasParaVencer <= 7 && diasParaVencer >= 0
    }).length

    // ===== INTERESES POR CLIENTE =====
    const interesesPorCliente: Record<string, {
      clienteId: string
      nombre: string
      documento: string
      interesGenerado: number
      interesGanado: number
    }> = {}

    // Calcular interés generado por cada cliente
    ;(prestamos as PrestamoConCliente[]).forEach((prestamo) => {
      const clienteId = prestamo.clienteId
      const montoInteres = parseFloat(prestamo.monto.toString()) * (parseFloat(prestamo.interes.toString()) / 100)
      
      if (!interesesPorCliente[clienteId]) {
        interesesPorCliente[clienteId] = {
          clienteId: clienteId,
          nombre: `${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`,
          documento: prestamo.cliente.documento,
          interesGenerado: 0,
          interesGanado: 0
        }
      }
      
      interesesPorCliente[clienteId].interesGenerado += montoInteres
    })

    // Calcular interés ganado por cada cliente (de los pagos)
    ;(todosPagos as PagoConPrestamo[]).forEach((pago) => {
      const prestamo = pago.prestamo
      const clienteId = prestamo.clienteId
      const montoOriginal = parseFloat(prestamo.monto.toString())
      const tasaInteres = parseFloat(prestamo.interes.toString()) / 100
      const montoConInteres = montoOriginal * (1 + tasaInteres)
      
      if (montoConInteres > 0) {
        const porcentajeInteres = (montoConInteres - montoOriginal) / montoConInteres
        const interesEnPago = parseFloat(pago.monto.toString()) * porcentajeInteres
        
        if (!interesesPorCliente[clienteId]) {
          interesesPorCliente[clienteId] = {
            clienteId: clienteId,
            nombre: `${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`,
            documento: prestamo.cliente.documento,
            interesGenerado: 0,
            interesGanado: 0
          }
        }
        
        interesesPorCliente[clienteId].interesGanado += interesEnPago
      }
    })

    const interesesPorClienteArray = Object.values(interesesPorCliente) as InteresCliente[]
    const interesTotalGenerado = interesesPorClienteArray.reduce((sum: number, c) => sum + c.interesGenerado, 0)
    const interesTotalGanado = interesesPorClienteArray.reduce((sum: number, c) => sum + c.interesGanado, 0)

    // ===== TRANSFERENCIAS =====
    // Obtener transferencias en el rango de fechas
    const transferencias = await prisma.transferencia.findMany({
      where: {
        fecha: {
          gte: fechaInicioDate,
          lte: fechaFinDate
        }
      },
      include: {
        prestamo: {
          include: {
            cliente: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                documento: true
              }
            }
          }
        }
      }
    })
    
    const transferenciasRealizadas = transferencias.length
    const valorTotalTransferencias = (transferencias as TransferenciaConPrestamo[]).reduce((sum: number, t) => sum + parseFloat(t.monto.toString()), 0)
    const clientesTransferencia = new Set((transferencias as TransferenciaConPrestamo[]).map((t) => t.prestamo.clienteId)).size
    
    // Transferencias pendientes (préstamos de tipo TRANSFERENCIA con saldo pendiente)
    const prestamosPorTransferencia = await prisma.prestamo.findMany({
      where: {
        tipoCredito: 'TRANSFERENCIA',
        estado: 'ACTIVO'
      },
      include: {
        pagos: true,
        transferencias: true
      }
    })
    
    const transferenciasEstimadas = (prestamosPorTransferencia as PrestamoParaTransferencia[]).filter((p) => {
      const montoTotal = parseFloat(p.monto.toString()) * (1 + parseFloat(p.interes.toString()) / 100)
      const totalPagado = p.pagos.reduce((sum: number, pago) => sum + parseFloat(pago.monto.toString()), 0)
      return montoTotal > totalPagado && p.transferencias.length === 0
    }).length

    // ===== SALARIOS DE USUARIOS =====
    const usuarios = await prisma.user.findMany({
      where: {
        isActive: true
      },
      include: {
        configuracionSueldo: true
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' }
      ]
    })

    // Función para calcular pagos semanales, quincenales y mensuales
    const calcularPagos = (salarioMensual: number) => {
      const pagoSemanal = salarioMensual / 4 // Aproximadamente 4 semanas por mes
      const pagoQuincenal = salarioMensual / 2
      const pagoMensual = salarioMensual
      return { pagoSemanal, pagoQuincenal, pagoMensual }
    }

    const administradores = usuarios
      .filter(u => u.role === 'ADMINISTRADOR')
      .map(u => {
        const salarioBase = u.configuracionSueldo?.salarioBase 
          ? parseFloat(u.configuracionSueldo.salarioBase.toString()) 
          : 0
        const pagos = calcularPagos(salarioBase)
        return {
          id: u.id,
          nombre: u.firstName || '',
          apellido: u.lastName || '',
          nombreCompleto: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          email: u.email,
          salario: salarioBase,
          pagoSemanal: pagos.pagoSemanal,
          pagoQuincenal: pagos.pagoQuincenal,
          pagoMensual: pagos.pagoMensual,
          comisionPorCobro: u.configuracionSueldo?.comisionPorCobro 
            ? parseFloat(u.configuracionSueldo.comisionPorCobro.toString()) 
            : 0
        }
      })

    const supervisores = usuarios
      .filter(u => u.role === 'SUPERVISOR')
      .map(u => {
        const salarioBase = u.configuracionSueldo?.salarioBase 
          ? parseFloat(u.configuracionSueldo.salarioBase.toString()) 
          : 0
        const pagos = calcularPagos(salarioBase)
        return {
          id: u.id,
          nombre: u.firstName || '',
          apellido: u.lastName || '',
          nombreCompleto: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          email: u.email,
          salario: salarioBase,
          pagoSemanal: pagos.pagoSemanal,
          pagoQuincenal: pagos.pagoQuincenal,
          pagoMensual: pagos.pagoMensual,
          comisionPorCobro: u.configuracionSueldo?.comisionPorCobro 
            ? parseFloat(u.configuracionSueldo.comisionPorCobro.toString()) 
            : 0
        }
      })

    const cobradores = usuarios
      .filter(u => u.role === 'COBRADOR')
      .map(u => {
        const salarioBase = u.configuracionSueldo?.salarioBase 
          ? parseFloat(u.configuracionSueldo.salarioBase.toString()) 
          : 0
        const pagos = calcularPagos(salarioBase)
        return {
          id: u.id,
          numeroRuta: u.numeroRuta || 'Sin asignar',
          nombre: u.firstName || '',
          apellido: u.lastName || '',
          nombreCompleto: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          email: u.email,
          salario: salarioBase,
          pagoSemanal: pagos.pagoSemanal,
          pagoQuincenal: pagos.pagoQuincenal,
          pagoMensual: pagos.pagoMensual,
          comisionPorCobro: u.configuracionSueldo?.comisionPorCobro 
            ? parseFloat(u.configuracionSueldo.comisionPorCobro.toString()) 
            : 0
        }
      })

    const totalSalarios = usuarios.reduce((sum: number, u) => {
      if (u.configuracionSueldo?.salarioBase) {
        return sum + parseFloat(u.configuracionSueldo.salarioBase.toString())
      }
      return sum
    }, 0)

    // Calcular totales por rol
    const totalSalariosAdministradores = (administradores as UsuarioConSalario[]).reduce((sum: number, a) => sum + a.salario, 0)
    const totalSalariosSupervisores = (supervisores as UsuarioConSalario[]).reduce((sum: number, s) => sum + s.salario, 0)
    const totalSalariosCobradores = (cobradores as UsuarioConSalario[]).reduce((sum: number, c) => sum + c.salario, 0)

    // Calcular promedios
    const promedioSalarioAdministrador = administradores.length > 0 
      ? totalSalariosAdministradores / administradores.length 
      : 0
    const promedioSalarioSupervisor = supervisores.length > 0 
      ? totalSalariosSupervisores / supervisores.length 
      : 0
    const promedioSalarioCobrador = cobradores.length > 0 
      ? totalSalariosCobradores / cobradores.length 
      : 0

    // Calcular totales semanales, quincenales y mensuales
    const pagosSemanales = calcularPagos(totalSalarios)
    const promediosPorRol = {
      administradores: promedioSalarioAdministrador,
      supervisores: promedioSalarioSupervisor,
      cobradores: promedioSalarioCobrador
    }

    const reporte = {
      periodo: {
        fechaInicio: fechaInicioDate,
        fechaFin: fechaFinDate
      },
      metricas: {
        capitalInvertido,
        balancePendiente,
        capitalRecuperado,
        capitalNoRecuperado,
        totalIntereses,
        interesesCobrados,
        totalGastos,
        moraCobrada,
        utilidadNeta,
        roi,
        expectativaCobroPeriodo
      },
      estadisticas: {
        cantidadPrestamos,
        cantidadPagos,
        cantidadGastos,
        cantidadClientesActivos,
        prestamosAlDia,
        prestamosVencidos,
        promedioPrestamosDia: cantidadPrestamos > 0 ? capitalInvertido / cantidadPrestamos : 0,
        promedioPagosDia: cantidadPagos > 0 ? capitalRecuperado / cantidadPagos : 0
      },
      renovaciones: {
        generales: renovacionesGenerales,
        nuevas: renovacionesNuevas,
        pendientes: renovacionesPendientes,
        porRealizar: renovacionesPorRealizar,
        realizadas: renovacionesRealizadas,
        detalles: prestamosRenovados.map((p) => ({
          id: p.id,
          cliente: `${p.cliente.nombre} ${p.cliente.apellido}`,
          documento: p.cliente.documento,
          montoOriginal: parseFloat(p.monto.toString()),
          montoNuevo: 0, // No tenemos referencia al nuevo préstamo
          estado: 'REALIZADA',
          fechaCreacion: p.updatedAt.toISOString()
        }))
      },
      intereses: {
        totalGenerado: interesTotalGenerado,
        totalGanado: interesTotalGanado,
        porCliente: interesesPorClienteArray
      },
      transferencias: {
        realizadas: transferenciasRealizadas,
        pendientes: transferenciasEstimadas,
        clientesTotales: clientesTransferencia,
        valorTotal: valorTotalTransferencias,
        detalles: transferencias.map((t) => ({
          id: t.id,
          cliente: `${t.prestamo.cliente.nombre} ${t.prestamo.cliente.apellido}`,
          documento: t.prestamo.cliente.documento,
          monto: parseFloat(t.monto.toString()),
          fecha: t.fecha.toISOString()
        }))
      },
      salarios: {
        administradores,
        supervisores,
        cobradores,
        totalSalarios,
        cantidadUsuarios: usuarios.length,
        totalesPorRol: {
          administradores: totalSalariosAdministradores,
          supervisores: totalSalariosSupervisores,
          cobradores: totalSalariosCobradores
        },
        promediosPorRol,
        pagosGenerales: {
          semanal: pagosSemanales.pagoSemanal,
          quincenal: pagosSemanales.pagoQuincenal,
          mensual: pagosSemanales.pagoMensual
        },
        porcentajesPorRol: {
          administradores: totalSalarios > 0 ? (totalSalariosAdministradores / totalSalarios) * 100 : 0,
          supervisores: totalSalarios > 0 ? (totalSalariosSupervisores / totalSalarios) * 100 : 0,
          cobradores: totalSalarios > 0 ? (totalSalariosCobradores / totalSalarios) * 100 : 0
        }
      },
      rutas: cobradores.map((cobrador) => {
        // Filtrar pagos en efectivo del cobrador
        const pagosRuta = todosPagos.filter(p => p.userId === cobrador.id && p.metodoPago === 'EFECTIVO')
        const totalCobradoEfectivo = pagosRuta.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)
        
        // Filtrar préstamos en efectivo del cobrador
        const prestamosRuta = prestamosNuevos.filter(p => p.userId === cobrador.id && (p.tipoCredito === 'EFECTIVO' || p.tipoCredito == null))
        const totalPrestadoEfectivo = prestamosRuta.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)
        
        // Gastos operativos
        const gastosRuta = gastos.filter(g => g.userId === cobrador.id)
        const gastosOperativos = gastosRuta.reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0)
        
        // Gastos sueldos y viaticos del cobrador
        const movsRuta = movimientosCajaChica.filter(m => m.cobradorId === cobrador.id)
        const gastosSueldos = movsRuta.filter(m => m.tipo === 'PAGO_SUELDO').reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
        const otrosGastos = movsRuta.filter(m => m.tipo === 'GASTO' || m.tipo === 'GASTADO').reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
        
        const balancePeriodo = totalCobradoEfectivo - totalPrestadoEfectivo - gastosOperativos - gastosSueldos - otrosGastos

        // === NUEVAS MÉTRICAS SOLICITADAS POR EL CLIENTE ===
        // 1. Capital invertido en el período (efectivo y transferencia)
        const prestamosRutaTodos = prestamos.filter(p => p.userId === cobrador.id)
        const capitalInvertidoRuta = prestamosRutaTodos.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)

        // 2. Cobrador regado en la calle (saldo pendiente actual)
        let regadoCalleRuta = 0
        prestamosConSaldo
          .filter(p => p.userId === cobrador.id)
          .forEach((p) => {
            const montoTotal = parseFloat(p.monto.toString()) * (1 + parseFloat(p.interes.toString()) / 100)
            const totalPagado = p.pagos.reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)
            const saldoPendiente = Math.max(0, montoTotal - totalPagado)
            regadoCalleRuta += saldoPendiente
          })

        // 3. Interés ganado de esa ruta (Proyectado y Cobrado del período seleccionado)
        const interesProyectadoRuta = prestamosRutaTodos.reduce((sum, p) => 
          sum + parseFloat(p.monto.toString()) * (parseFloat(p.interes.toString()) / 100), 0
        )

        let interesCobradoRuta = 0
        const pagosRutaPeriodo = todosPagos.filter(p => p.userId === cobrador.id)
        pagosRutaPeriodo.forEach((pago) => {
          const prestamo = pago.prestamo
          const montoOriginal = parseFloat(prestamo.monto.toString())
          const tasaInteres = parseFloat(prestamo.interes.toString()) / 100
          const montoConInteres = montoOriginal * (1 + tasaInteres)
          if (montoConInteres > 0) {
            const porcentajeInteres = (montoConInteres - montoOriginal) / montoConInteres
            const interesEnPago = parseFloat(pago.monto.toString()) * porcentajeInteres
            interesCobradoRuta += interesEnPago
          }
        })

        // 4. Pérdidas del período (préstamos que vencieron en el período con saldo pendiente)
        let perdidasRutaPeriodo = 0
        const prestamosExpiradosPeriodo = prestamosAnio.filter(p => 
          p.userId === cobrador.id && 
          p.fechaFin >= fechaInicioDate && 
          p.fechaFin <= fechaFinDate
        )
        prestamosExpiradosPeriodo.forEach((p) => {
          const montoTotal = parseFloat(p.monto.toString()) * (1 + parseFloat(p.interes.toString()) / 100)
          const totalPagado = p.pagos.reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)
          const saldoPendiente = Math.max(0, montoTotal - totalPagado)
          perdidasRutaPeriodo += saldoPendiente
        })

        // Helper para calcular métricas históricas de esta ruta
        const calcularPeriodoHistorico = (inicio: Date) => {
          // Cobrado
          const pagos = pagosAnio.filter(p => p.userId === cobrador.id && p.fecha >= inicio)
          const cobrado = pagos.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)

          // Gastos
          const gst = gastosAnio.filter(g => g.userId === cobrador.id && g.fecha >= inicio)
          const gastosOperativosHist = gst.reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0)
          
          const movs = movsAnio.filter(m => m.cobradorId === cobrador.id && m.fecha >= inicio)
          const gastosSueldosHist = movs.filter(m => m.tipo === 'PAGO_SUELDO').reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
          const otrosGastosHist = movs.filter(m => m.tipo === 'GASTO' || m.tipo === 'GASTADO').reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
          
          const gastosTotal = gastosOperativosHist + gastosSueldosHist + otrosGastosHist

          // Capital Invertido
          const prestamosCreados = prestamosAnio.filter(p => p.userId === cobrador.id && p.createdAt >= inicio)
          const invertido = prestamosCreados.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)

          // Pérdidas (expiraron en el período histórico y tienen saldo pendiente)
          const prestamosExpirados = prestamosAnio.filter(p => p.userId === cobrador.id && p.fechaFin >= inicio && p.fechaFin <= hoy)
          let perdidas = 0
          prestamosExpirados.forEach((p) => {
            const montoTotal = parseFloat(p.monto.toString()) * (1 + parseFloat(p.interes.toString()) / 100)
            const totalPagado = p.pagos.reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)
            const saldoPendiente = Math.max(0, montoTotal - totalPagado)
            perdidas += saldoPendiente
          })

          return { cobrado, gastos: gastosTotal, perdidas, invertido }
        }

        const historico = {
          semanal: calcularPeriodoHistorico(semanaInicio),
          mensual: calcularPeriodoHistorico(mesInicio),
          semestral: calcularPeriodoHistorico(semestreInicio),
          anual: calcularPeriodoHistorico(anualInicio),
        }

        return {
          cobradorId: cobrador.id,
          nombreCobrador: cobrador.nombreCompleto,
          numeroRuta: cobrador.numeroRuta,
          totalCobradoEfectivo,
          totalPrestadoEfectivo,
          gastosOperativos: gastosOperativos + otrosGastos,
          gastosSueldos,
          balancePeriodo,
          capitalInvertidoRuta,
          regadoCalleRuta,
          interesProyectadoRuta,
          interesCobradoRuta,
          perdidasRutaPeriodo,
          historico,
          detallesPagos: pagosRuta.map(p => ({
            id: p.id,
            cliente: `${p.prestamo.cliente.nombre} ${p.prestamo.cliente.apellido}`,
            monto: parseFloat(p.monto.toString()),
            fecha: p.fecha.toISOString(),
            observaciones: p.observaciones
          })),
          detallesPrestamos: prestamosRuta.map(p => ({
            id: p.id,
            cliente: `${p.cliente.nombre} ${p.cliente.apellido}`,
            monto: parseFloat(p.monto.toString()),
            fecha: p.createdAt.toISOString()
          })),
          detallesGastos: gastosRuta.map(g => ({
            id: g.id,
            concepto: g.concepto,
            monto: parseFloat(g.monto.toString()),
            fecha: g.fecha.toISOString()
          })),
          detallesSueldos: movsRuta.filter(m => m.tipo === 'PAGO_SUELDO' || m.tipo === 'GASTO' || m.tipo === 'GASTADO').map(m => ({
            id: m.id,
            descripcion: m.descripcion || m.tipo,
            monto: parseFloat(m.monto.toString()),
            fecha: m.fecha.toISOString()
          }))
        }
      }),
      detalles: {
        prestamos: (prestamos as PrestamoConCliente[]).map((p) => {
          const montoTotal = parseFloat(p.monto.toString()) * (1 + parseFloat(p.interes.toString()) / 100)
          const totalPagado = p.pagos.reduce((sum: number, pago) => sum + parseFloat(pago.monto.toString()), 0)
          const saldoPendiente = Math.max(0, montoTotal - totalPagado)
          
          return {
            id: p.id,
            cliente: `${p.cliente.nombre} ${p.cliente.apellido}`,
            documento: p.cliente.documento,
            monto: parseFloat(p.monto.toString()),
            interes: parseFloat(p.interes.toString()),
            saldoPendiente: saldoPendiente,
            fechaInicio: p.fechaFin,
            fechaVencimiento: p.fechaFin, // Usar fechaFin como fechaVencimiento
            pagosEnPeriodo: p.pagos.length,
            montoPagado: totalPagado
          }
        }),
        pagos: (todosPagos as PagoDetallado[]).map((p) => ({
          id: p.id,
          cliente: `${p.prestamo.cliente.nombre} ${p.prestamo.cliente.apellido}`,
          monto: parseFloat(p.monto.toString()),
          fecha: p.fecha,
          prestamoId: p.prestamoId,
          observaciones: p.observaciones
        })),
        gastos: (gastos as GastoDetallado[]).map((g) => ({
          id: g.id,
          concepto: g.concepto,
          monto: parseFloat(g.monto.toString()),
          fecha: g.fecha,
          observaciones: g.observaciones
        }))
      }
    }

    return NextResponse.json(reporte)
  } catch (error) {
    console.error("Error al obtener reporte de ganancias:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

