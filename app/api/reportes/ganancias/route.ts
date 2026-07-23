
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Decimal } from "@prisma/client/runtime/library"

import { getEcuadorDayRange, getEcuadorRange, esDiaDePago, getDiasMoraSinDomingos } from "@/lib/date-utils"

export const dynamic = "force-dynamic"


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
  pagos?: {
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
    tipoPago: string
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

    // Consultar todos los datos requeridos en paralelo con Promise.all
    const [
      pagosAnio,
      gastosAnio,
      movsAnio,
      prestamosAnio,
      prestamos,
      todosPagos,
      gastos,
      movimientosCajaChica,
      prestamosConSaldo,
      prestamosRenovados,
      prestamosNuevos,
      prestamosVigentesPeriodo,
      prestamosPorTransferencia,
      agregacionPagos
    ] = await Promise.all([
      prisma.pago.findMany({
        where: { fecha: { gte: anualInicio } },
        select: { userId: true, fecha: true, monto: true }
      }),
      prisma.gasto.findMany({
        where: { fecha: { gte: anualInicio } },
        select: { userId: true, fecha: true, monto: true }
      }),
      prisma.movimientoCajaChica.findMany({
        where: { fecha: { gte: anualInicio } },
        select: { cobradorId: true, fecha: true, monto: true, tipo: true }
      }),
      prisma.prestamo.findMany({
        where: { OR: [{ createdAt: { gte: anualInicio } }, { fechaFin: { gte: anualInicio } }] },
        select: { id: true, userId: true, createdAt: true, fechaFin: true, monto: true, interes: true }
      }),
      prisma.prestamo.findMany({
        where: { createdAt: { gte: fechaInicioDate, lte: fechaFinDate } },
        include: {
          cliente: { select: { nombre: true, apellido: true, documento: true } },
          pagos: { where: { fecha: { gte: fechaInicioDate, lte: fechaFinDate } } }
        }
      }),
      prisma.pago.findMany({
        where: { fecha: { gte: fechaInicioDate, lte: fechaFinDate } },
        include: {
          prestamo: {
            include: { cliente: { select: { nombre: true, apellido: true, documento: true } } }
          }
        }
      }),
      prisma.gasto.findMany({
        where: { fecha: { gte: fechaInicioDate, lte: fechaFinDate } }
      }),
      prisma.movimientoCajaChica.findMany({
        where: { fecha: { gte: fechaInicioDate, lte: fechaFinDate } }
      }),
      prisma.prestamo.findMany({
        where: { estado: 'ACTIVO' },
        include: { cliente: { select: { id: true, nombre: true, apellido: true, documento: true } } }
      }),
      prisma.prestamo.findMany({
        where: { estado: 'RENOVADO', updatedAt: { gte: fechaInicioDate, lte: fechaFinDate } },
        include: { cliente: { select: { id: true, nombre: true, apellido: true, documento: true } } }
      }),
      prisma.prestamo.findMany({
        where: { createdAt: { gte: fechaInicioDate, lte: fechaFinDate } },
        include: { cliente: { select: { id: true, nombre: true, apellido: true, documento: true } } }
      }),
      prisma.prestamo.findMany({
        where: { fechaInicio: { lte: fechaFinDate }, fechaFin: { gte: fechaInicioDate } }
      }),
      prisma.prestamo.findMany({
        where: { tipoCredito: 'TRANSFERENCIA', estado: 'ACTIVO' },
        include: { transferencias: true }
      }),
      prisma.pago.groupBy({
        by: ["prestamoId"],
        _sum: { monto: true, devolucionSeguro: true }
      })
    ])

    // CÁLCULOS FINANCIEROS

    // 1. Capital Invertido (total de préstamos creados en el período)
    const capitalInvertido = (prestamos as PrestamoConCliente[]).reduce((sum: number, prestamo) => 
      sum + parseFloat(prestamo.monto.toString()), 0
    )

    // Expectativa de cobro en el período (suma de las cuotas programadas en el rango)
    let expectativaCobroPeriodo = 0
    for (const prestamo of prestamosVigentesPeriodo) {
      const inicioPrestamo = new Date(prestamo.fechaInicio)
      const finPrestamo = new Date(prestamo.fechaFin)
      const tipoPago = prestamo.tipoPago
      const valorCuota = parseFloat(prestamo.valorCuota.toString())
      
      const startOverlap = new Date(Math.max(fechaInicioDate.getTime(), inicioPrestamo.getTime()))
      const endOverlap = new Date(Math.min(fechaFinDate.getTime(), finPrestamo.getTime()))
      
      if (startOverlap <= endOverlap) {
        let current = new Date(startOverlap)
        while (current <= endOverlap) {
          if (esDiaDePago(tipoPago, prestamo.fechaInicio, current)) {
            expectativaCobroPeriodo += valorCuota
          }
          current.setDate(current.getDate() + 1)
        }
      }
    }

    const totalPagadoMap = new Map()
    agregacionPagos.forEach(agg => {
      totalPagadoMap.set(agg.prestamoId, Number(agg._sum.monto || 0) + Number(agg._sum.devolucionSeguro || 0))
    })

    const getTotalPagado = (prestamoId: string) => totalPagadoMap.get(prestamoId) || 0

    // 2. Balance Pendiente (suma de todos los saldos pendientes)
    let balancePendiente = 0
    ;(prestamosConSaldo as any[]).forEach((prestamo) => {
      const baseTotal = parseFloat(prestamo.monto.toString()) * (1 + parseFloat(prestamo.interes.toString()) / 100)
      const montoTotal = baseTotal
      const totalPagado = getTotalPagado(prestamo.id)
      const saldoPendiente = Math.max(0, montoTotal - totalPagado)
      balancePendiente += saldoPendiente
    })

    // 3. Capital Recuperado (pagos realizados en el período)
    const capitalRecuperado = (todosPagos as PagoConPrestamo[]).reduce((sum: number, pago) => 
      sum + parseFloat(pago.monto.toString()), 0
    )

    // 4. Capital No Recuperado (préstamos vencidos sin pagar)
    let capitalNoRecuperado = 0
    ;(prestamosConSaldo as any[])
      .filter((prestamo) => new Date(prestamo.fechaFin) < hoy)
      .forEach((prestamo) => {
        const baseTotal = parseFloat(prestamo.monto.toString()) * (1 + parseFloat(prestamo.interes.toString()) / 100)
        const montoTotal = baseTotal
        const totalPagado = getTotalPagado(prestamo.id)
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
        const diasRetraso = getDiasMoraSinDomingos(fechaFin, fechaPago, pago.prestamo.tipoPago)
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
    
    const transferenciasEstimadas = (prestamosPorTransferencia as any[]).filter((p) => {
      const baseTotal = parseFloat(p.monto.toString()) * (1 + parseFloat(p.interes.toString()) / 100)
      const montoTotal = baseTotal
      const totalPagado = getTotalPagado(p.id)
      return montoTotal > totalPagado && p.transferencias.length === 0
    }).length

    // ===== MICROSEGUROS =====
    let cantidadDevolucionesMicroseguro = 0;
    let totalDevolucionesMicroseguro = 0;
    let microseguroCobrado = 0;

    ;(todosPagos as any[]).forEach((pago) => {
      // Devoluciones
      if (pago.devolucionSeguro && parseFloat(pago.devolucionSeguro.toString()) > 0) {
        cantidadDevolucionesMicroseguro++;
        totalDevolucionesMicroseguro += parseFloat(pago.devolucionSeguro.toString());
      }

    });
    
    // Total generado por préstamos en el periodo (cobrado al inicio)
    let totalMicroseguroGenerado = 0;
    ;(prestamos as any[]).forEach((prestamo) => {
      const microseguroTotal = parseFloat(prestamo.microseguroTotal?.toString() || '0');
      const tipoMicroseguro = prestamo.microseguroTipo || 'NINGUNO';
      if (microseguroTotal > 0 && tipoMicroseguro !== 'DEVOLUCION') {
        totalMicroseguroGenerado += microseguroTotal;
      }
    });

    // Como el microseguro se retiene al inicio, todo lo generado ya está cobrado
    microseguroCobrado = totalMicroseguroGenerado;

    const gananciaNetaMicroseguro = microseguroCobrado - totalDevolucionesMicroseguro;


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

    // Pre-agrupar colecciones por usuario/cobrador para evitar O(C * N) filtrados en bucle
    const todosPagosByCobrador = new Map<string, typeof todosPagos>()
    todosPagos.forEach(p => {
      const list = todosPagosByCobrador.get(p.userId) || []
      list.push(p)
      todosPagosByCobrador.set(p.userId, list)
    })

    const prestamosNuevosByCobrador = new Map<string, typeof prestamosNuevos>()
    prestamosNuevos.forEach(p => {
      const list = prestamosNuevosByCobrador.get(p.userId) || []
      list.push(p)
      prestamosNuevosByCobrador.set(p.userId, list)
    })

    const gastosByCobrador = new Map<string, typeof gastos>()
    gastos.forEach(g => {
      const list = gastosByCobrador.get(g.userId) || []
      list.push(g)
      gastosByCobrador.set(g.userId, list)
    })

    const movsByCobrador = new Map<string, typeof movimientosCajaChica>()
    movimientosCajaChica.forEach(m => {
      if (m.cobradorId) {
        const list = movsByCobrador.get(m.cobradorId) || []
        list.push(m)
        movsByCobrador.set(m.cobradorId, list)
      }
    })

    const prestamosByCobrador = new Map<string, typeof prestamos>()
    prestamos.forEach(p => {
      const list = prestamosByCobrador.get(p.userId) || []
      list.push(p)
      prestamosByCobrador.set(p.userId, list)
    })

    const prestamosConSaldoByCobrador = new Map<string, typeof prestamosConSaldo>()
    prestamosConSaldo.forEach(p => {
      const list = prestamosConSaldoByCobrador.get((p as any).userId) || []
      list.push(p)
      prestamosConSaldoByCobrador.set((p as any).userId, list)
    })

    const pagosAnioByCobrador = new Map<string, typeof pagosAnio>()
    pagosAnio.forEach(p => {
      const list = pagosAnioByCobrador.get(p.userId) || []
      list.push(p)
      pagosAnioByCobrador.set(p.userId, list)
    })

    const gastosAnioByCobrador = new Map<string, typeof gastosAnio>()
    gastosAnio.forEach(g => {
      const list = gastosAnioByCobrador.get(g.userId) || []
      list.push(g)
      gastosAnioByCobrador.set(g.userId, list)
    })

    const movsAnioByCobrador = new Map<string, typeof movsAnio>()
    movsAnio.forEach(m => {
      if (m.cobradorId) {
        const list = movsAnioByCobrador.get(m.cobradorId) || []
        list.push(m)
        movsAnioByCobrador.set(m.cobradorId, list)
      }
    })

    const prestamosAnioByCobrador = new Map<string, typeof prestamosAnio>()
    prestamosAnio.forEach(p => {
      const list = prestamosAnioByCobrador.get(p.userId) || []
      list.push(p)
      prestamosAnioByCobrador.set(p.userId, list)
    })

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
      microseguros: {
        cantidadDevoluciones: cantidadDevolucionesMicroseguro,
        totalDevoluciones: totalDevolucionesMicroseguro,
        cobrado: microseguroCobrado,
        generado: totalMicroseguroGenerado,
        gananciaNeta: gananciaNetaMicroseguro
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
        const todosPagosCobrador = todosPagosByCobrador.get(cobrador.id) || []
        const prestamosNuevosCobrador = prestamosNuevosByCobrador.get(cobrador.id) || []
        const gastosCobrador = gastosByCobrador.get(cobrador.id) || []
        const movsCobrador = movsByCobrador.get(cobrador.id) || []
        const prestamosCobrador = prestamosByCobrador.get(cobrador.id) || []
        const prestamosConSaldoCobrador = prestamosConSaldoByCobrador.get(cobrador.id) || []

        // Filtrar pagos en efectivo del cobrador
        const pagosRuta = todosPagosCobrador.filter(p => p.metodoPago === 'EFECTIVO' && !p.observaciones?.startsWith("Liquidación por refinanciamiento"))
        const totalCobradoEfectivo = pagosRuta.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)
        
        // Filtrar préstamos en efectivo del cobrador
        const prestamosRuta = prestamosNuevosCobrador.filter(p => (p.tipoCredito === 'EFECTIVO' || p.tipoCredito == null) && !p.observaciones?.startsWith("REFINANCIAMIENTO"))
        const totalPrestadoEfectivo = prestamosRuta.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)
        
        // Gastos operativos
        const gastosRuta = gastosCobrador
        const gastosOperativos = gastosRuta.reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0)
        
        // Gastos sueldos y viaticos del cobrador
        const movsRuta = movsCobrador
        const gastosSueldos = movsRuta.filter(m => m.tipo === 'PAGO_SUELDO').reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
        const otrosGastos = movsRuta.filter(m => m.tipo === 'GASTO' || m.tipo === 'GASTADO').reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
        
        const ingresosExtra = movsRuta.filter(m => ['INGRESO', 'ENTREGADO', 'ENTREGA', 'APERTURA_CAJA'].includes(m.tipo)).reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
        const egresosExtra = movsRuta.filter(m => ['EGRESO', 'EGRESO_GENERAL', 'DEVUELTO', 'DEVOLUCION'].includes(m.tipo) && !(m.observaciones && m.observaciones.includes("Refinanciamiento préstamo:"))).reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
        
        const balancePeriodo = totalCobradoEfectivo - totalPrestadoEfectivo - gastosOperativos - gastosSueldos - otrosGastos + ingresosExtra - egresosExtra

        // === MÉTRICAS DE RUTA ===
        const prestamosRutaTodos = prestamosCobrador
        const capitalInvertidoRuta = prestamosRutaTodos.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)

        // Regado en la calle
        let regadoCalleRuta = 0
        prestamosConSaldoCobrador.forEach((p) => {
          const montoTotal = parseFloat(p.monto.toString()) * (1 + parseFloat(p.interes.toString()) / 100)
          const totalPagado = getTotalPagado(p.id)
          const saldoPendiente = Math.max(0, montoTotal - totalPagado)
          regadoCalleRuta += saldoPendiente
        })

        // Interés ganado
        const interesProyectadoRuta = prestamosRutaTodos.reduce((sum, p) => 
          sum + parseFloat(p.monto.toString()) * (parseFloat(p.interes.toString()) / 100), 0
        )

        let interesCobradoRuta = 0
        const pagosRutaPeriodo = todosPagosCobrador
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

        // Pérdidas del período
        const prestamosAnioCobrador = prestamosAnioByCobrador.get(cobrador.id) || []
        const pagosAnioCobrador = pagosAnioByCobrador.get(cobrador.id) || []
        const gastosAnioCobrador = gastosAnioByCobrador.get(cobrador.id) || []
        const movsAnioCobrador = movsAnioByCobrador.get(cobrador.id) || []

        let perdidasRutaPeriodo = 0
        const prestamosExpiradosPeriodo = prestamosAnioCobrador.filter(p => 
          p.fechaFin >= fechaInicioDate && 
          p.fechaFin <= fechaFinDate
        )
        prestamosExpiradosPeriodo.forEach((p) => {
          const montoTotal = parseFloat(p.monto.toString()) * (1 + parseFloat(p.interes.toString()) / 100)
          const totalPagado = getTotalPagado(p.id)
          const saldoPendiente = Math.max(0, montoTotal - totalPagado)
          perdidasRutaPeriodo += saldoPendiente
        })

        // Helper para calcular métricas históricas de esta ruta
        const calcularPeriodoHistorico = (inicio: Date) => {
          const pagos = pagosAnioCobrador.filter(p => p.fecha >= inicio)
          const cobrado = pagos.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)

          const gst = gastosAnioCobrador.filter(g => g.fecha >= inicio)
          const gastosOperativosHist = gst.reduce((sum, g) => sum + parseFloat(g.monto.toString()), 0)
          
          const movs = movsAnioCobrador.filter(m => m.fecha >= inicio)
          const gastosSueldosHist = movs.filter(m => m.tipo === 'PAGO_SUELDO').reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
          const otrosGastosHist = movs.filter(m => m.tipo === 'GASTO' || m.tipo === 'GASTADO').reduce((sum, m) => sum + parseFloat(m.monto.toString()), 0)
          
          const gastosTotal = gastosOperativosHist + gastosSueldosHist + otrosGastosHist

          const prestamosCreados = prestamosAnioCobrador.filter(p => p.createdAt >= inicio)
          const invertido = prestamosCreados.reduce((sum, p) => sum + parseFloat(p.monto.toString()), 0)

          const prestamosExpirados = prestamosAnioCobrador.filter(p => p.fechaFin >= inicio && p.fechaFin <= hoy)
          let perdidas = 0
          prestamosExpirados.forEach((p) => {
            const montoTotal = parseFloat(p.monto.toString()) * (1 + parseFloat(p.interes.toString()) / 100)
            const totalPagado = getTotalPagado(p.id)
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
          ingresosExtra,
          egresosExtra,
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
      })
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

