
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

import { getEcuadorDayRange } from "@/lib/date-utils"

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

async function getInformeForUser(userId: string, fechaInicio: Date, fechaFin: Date, fecha: Date) {
  // Obtener información del cobrador/usuario (puede ser diferente al usuario logueado si es admin)
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

  // Obtener pagos del día (filtrados por usuario)
  const pagos = await prisma.pago.findMany({
    where: {
      userId: userId, // Filtrar por el cobrador seleccionado
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

  // Obtener préstamos creados en el día (filtrados por usuario)
  const prestamos = await prisma.prestamo.findMany({
    where: {
      userId: userId, // Filtrar por el cobrador seleccionado
      createdAt: {
        gte: fechaInicio,
        lte: fechaFin
      }
    },
    include: {
      cliente: true
    }
  })

  // Obtener todos los préstamos activos (filtrados por usuario)
  const prestamosActivos = await prisma.prestamo.findMany({
    where: {
      userId: userId, // Filtrar por el cobrador seleccionado
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

  // Obtener gastos del día (filtrados por usuario)
  const gastos = await prisma.gasto.findMany({
    where: {
      userId: userId, // Filtrar por el cobrador seleccionado
      fecha: {
        gte: fechaInicio,
        lte: fechaFin
      }
    }
  })

  // Obtener clientes nuevos (creados en el día, filtrados por ruta del cobrador)
  const clientesNuevos = await prisma.cliente.findMany({
    where: {
      rutaId: usuario?.rutaId || null,
      createdAt: {
        gte: fechaInicio,
        lte: fechaFin
      }
    }
  })

  // Obtener clientes visitados (con pagos en el día)
  const clientesVisitadosIds = [...new Set(pagos.map(p => p.prestamo.clienteId))]
  
  // Obtener todos los clientes con préstamos activos (filtrados por ruta)
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

  // Clientes pendientes (con préstamos activos sin pago en el día)
  const clientesPendientes = clientesConPrestamosActivos.filter(
    cliente => !clientesVisitadosIds.includes(cliente.id)
  )

  // Calcular renovaciones (clientes que tienen más de un préstamo del usuario seleccionado)
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

  // Clientes con renovaciones (más de un préstamo)
  const clientesRenovacion = clientesConPrestamos.filter(c => c.prestamos.length > 1)
  
  // Renovaciones realizadas en el día (préstamos creados hoy para clientes que ya tenían préstamos)
  const renovacionesRealizadas = prestamos.filter(p => {
    const cliente = clientesConPrestamos.find(c => c.id === p.clienteId)
    return cliente && cliente.prestamos.length > 1
  })

  // Clientes por renovar (con préstamos próximos a vencer - últimos 5 días)
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

  // Renovaciones pendientes (clientes con préstamos activos que ya vencieron)
  const renovacionesPendientes = await prisma.prestamo.findMany({
    where: {
      estado: "ACTIVO",
      fechaFin: {
        lt: fecha
      }
    }
  })

  // Calcular totales
  const totalCobrado = pagos.reduce((sum, pago) => 
    sum + parseFloat(pago.monto.toString()), 0
  )

  // Calcular total cobrado en efectivo (sin transferencias ni depósitos)
  const totalCobradoEfectivo = pagos
    .filter(p => p.metodoPago === "EFECTIVO")
    .reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)

  const totalCobradoTransferencia = pagos
    .filter(p => p.metodoPago === "TRANSFERENCIA")
    .reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)

  const totalCobradoDeposito = pagos
    .filter(p => p.metodoPago === "DEPOSITO")
    .reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)

  // Calcular mora cobrada (pagos en préstamos vencidos)
  let moraCobrada = 0
  for (const pago of pagos) {
    const prestamo = await prisma.prestamo.findUnique({
      where: { id: pago.prestamoId }
    })
    if (prestamo && prestamo.fechaFin < pago.fecha) {
      const diasMora = Math.floor(
        (pago.fecha.getTime() - prestamo.fechaFin.getTime()) / (1000 * 60 * 60 * 24)
      )
      const moraPorDia = parseFloat(prestamo.moraCredito.toString())
      moraCobrada += moraPorDia * diasMora
    }
  }

  // Calcular dinero en transferencia
  const dineroTransferencia = totalCobradoTransferencia + totalCobradoDeposito
  
  const transferenciasRealizadas = pagos.filter(p => 
    p.metodoPago === "TRANSFERENCIA" || p.metodoPago === "DEPOSITO"
  ).length
  
  const transferenciasPendientes = 0
  
  const totalPrestado = prestamos.reduce((sum, prestamo) => 
    sum + parseFloat(prestamo.monto.toString()), 0
  )

  const prestamosEfectivo = prestamos.filter(p => p.tipoCredito === "EFECTIVO" || p.tipoCredito == null)
  const totalPrestadoEfectivo = prestamosEfectivo.reduce((sum, prestamo) => 
    sum + parseFloat(prestamo.monto.toString()), 0
  )

  const prestamosTransferencia = prestamos.filter(p => p.tipoCredito === "TRANSFERENCIA")
  const totalPrestadoTransferencia = prestamosTransferencia.reduce((sum, prestamo) => 
    sum + parseFloat(prestamo.monto.toString()), 0
  )
  
  const totalGastos = gastos.reduce((sum, gasto) => 
    sum + parseFloat(gasto.monto.toString()), 0
  )

  // Obtener movimientos de caja chica del día (filtrados por usuario)
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

  // Buscar el último cierre de caja registrado para el cobrador actual
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

  let totalPorCobrar = 0
  for (const prestamo of prestamosActivos) {
    const montoTotal = parseFloat(prestamo.monto.toString()) * (1 + parseFloat(prestamo.interes.toString()) / 100)
    const totalPagado = prestamo.pagos.reduce((sum, pago) => 
      sum + parseFloat(pago.monto.toString()), 0
    )
    const saldoPendiente = Math.max(0, montoTotal - totalPagado)
    totalPorCobrar += saldoPendiente
  }

  let expectativaCobroHoy = 0
  for (const prestamo of prestamosActivos) {
    const fechaInicioPrestamo = new Date(prestamo.fechaInicio)
    if (fechaInicioPrestamo <= fechaFin) {
      if (esDiaDePago(prestamo.tipoPago, prestamo.fechaInicio, fecha)) {
        expectativaCobroHoy += parseFloat(prestamo.valorCuota.toString())
      }
    }
  }

  const detalleClientesMora: any[] = []
  const clientesMoraIds = new Set<string>()

  const prestamosMora = prestamosActivos.filter(p => p.fechaFin < fecha)
  for (const prestamo of prestamosMora) {
    if (!clientesMoraIds.has(prestamo.cliente.id)) {
      clientesMoraIds.add(prestamo.cliente.id)
      
      const montoTotal = parseFloat(prestamo.monto.toString()) * (1 + parseFloat(prestamo.interes.toString()) / 100)
      const totalPagado = prestamo.pagos.reduce((sum, pago) => sum + parseFloat(pago.monto.toString()), 0)
      const saldoPendiente = Math.max(0, montoTotal - totalPagado)
      
      const diasMora = Math.floor((fecha.getTime() - prestamo.fechaFin.getTime()) / (1000 * 60 * 60 * 24))

      detalleClientesMora.push({
        id: prestamo.cliente.id,
        nombre: prestamo.cliente.nombre,
        apellido: prestamo.cliente.apellido,
        telefono: prestamo.cliente.telefono || "",
        prestamoId: prestamo.id,
        saldoPendiente: saldoPendiente,
        diasMora: diasMora > 0 ? diasMora : 0
      })
    }
  }

  const cierreDia = await prisma.cierreDia.findUnique({
    where: {
      userId_fecha: {
        userId: userId,
        fecha: fecha
      }
    }
  })

  return {
    fecha,
    nombreCobrador: usuario ? `${usuario.firstName} ${usuario.lastName}` : "N/A",
    numeroRuta: usuario?.ruta?.numero || usuario?.numeroRuta || "N/A",
    nombreRuta: usuario?.ruta?.nombre || "Sin ruta",
    cobradorId: usuario?.id || null,
    rutaId: usuario?.rutaId || null,
    totalCobrado,
    totalCobradoEfectivo,
    totalCobradoTransferencia,
    totalCobradoDeposito,
    moraCobrada,
    dineroTransferencia,
    totalPrestado,
    totalPrestadoEfectivo,
    totalPrestadoTransferencia,
    totalGastos: totalGastosReal,
    gastosOperativos: totalGastos,
    gastosCajaChica,
    ingresosExtraCaja,
    egresosExtraCaja,
    saldoInicial,
    saldoEfectivo,
    totalPorCobrar,
    expectativaCobroHoy,
    cerrado: !!cierreDia,
    cierreId: cierreDia?.id,
    cantidadPagos: pagos.length,
    cantidadPrestamos: prestamos.length,
    cantidadGastos: gastos.length,
    resumenClientes: {
      clientesNuevos: clientesNuevos.length,
      clientesVisitados: clientesVisitadosIds.length,
      clientesPendientes: clientesPendientes.length,
      clientesPorVisitar: clientesConPrestamosActivos.length - clientesVisitadosIds.length,
      clientesMora: detalleClientesMora.length
    },
    resumenPrestamos: {
      nuevosPrestamos: prestamos.length,
      prestamosRealizados: prestamosActivos.length
    },
    resumenRenovaciones: {
      renovacionClientes: clientesRenovacion.length,
      clientesPorRenovar: clientesPorRenovar.length,
      renovacionesPendientes: renovacionesPendientes.length,
      renovacionesRealizadas: renovacionesRealizadas.length
    },
    resumenTransferencias: {
      totalTransferencia: dineroTransferencia,
      transferenciasRealizadas: transferenciasRealizadas,
      transferenciasPendientes: transferenciasPendientes
    },
    detallePagos: pagos.map(pago => ({
      id: pago.id,
      monto: parseFloat(pago.monto.toString()),
      mora: 0,
      metodoPago: pago.metodoPago,
      fecha: pago.fecha,
      observaciones: pago.observaciones,
      cliente: {
        nombre: pago.prestamo.cliente.nombre,
        apellido: pago.prestamo.cliente.apellido,
        documento: pago.prestamo.cliente.documento
      }
    })),
    detallePrestamos: prestamos.map(prestamo => ({
      id: prestamo.id,
      monto: parseFloat(prestamo.monto.toString()),
      interes: parseFloat(prestamo.interes.toString()),
      fechaInicio: prestamo.fechaInicio,
      cliente: {
        nombre: prestamo.cliente.nombre,
        apellido: prestamo.cliente.apellido
      }
    })),
    detalleGastos: gastos.map(gasto => ({
      id: gasto.id,
      concepto: gasto.concepto,
      monto: parseFloat(gasto.monto.toString()),
      fecha: gasto.fecha,
      observaciones: gasto.observaciones
    })),
    detalleClientesNuevos: clientesNuevos.map(cliente => ({
      id: cliente.id,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      documento: cliente.documento
    })),
    detalleClientesMora
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fechaParam = searchParams.get("fecha")
    const userIdParam = searchParams.get("userId")
    
    // Usar la utilidad de Ecuador para obtener el rango exacto
    const { inicio: fechaInicio, fin: fechaFin } = getEcuadorDayRange(fechaParam)
    const fecha = fechaInicio // Para mantener compatibilidad con el resto del código

    if (userIdParam === "todos") {
      if (session.user.role !== "ADMINISTRADOR" && session.user.role !== "SUPERVISOR") {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
      }

      const cobradores = await prisma.user.findMany({
        where: {
          role: "COBRADOR",
          isActive: true
        }
      })

      const informes = await Promise.all(
        cobradores.map(c => getInformeForUser(c.id, fechaInicio, fechaFin, fecha))
      )

      const totalCobrado = informes.reduce((sum, i) => sum + i.totalCobrado, 0)
      const totalCobradoEfectivo = informes.reduce((sum, i) => sum + i.totalCobradoEfectivo, 0)
      const totalCobradoTransferencia = informes.reduce((sum, i) => sum + i.totalCobradoTransferencia, 0)
      const totalCobradoDeposito = informes.reduce((sum, i) => sum + i.totalCobradoDeposito, 0)
      const moraCobrada = informes.reduce((sum, i) => sum + i.moraCobrada, 0)
      const dineroTransferencia = informes.reduce((sum, i) => sum + i.dineroTransferencia, 0)
      const totalPrestado = informes.reduce((sum, i) => sum + i.totalPrestado, 0)
      const totalPrestadoEfectivo = informes.reduce((sum, i) => sum + i.totalPrestadoEfectivo, 0)
      const totalPrestadoTransferencia = informes.reduce((sum, i) => sum + i.totalPrestadoTransferencia, 0)
      const totalGastos = informes.reduce((sum, i) => sum + i.totalGastos, 0)
      const gastosOperativos = informes.reduce((sum, i) => sum + (i.gastosOperativos || 0), 0)
      const gastosCajaChica = informes.reduce((sum, i) => sum + (i.gastosCajaChica || 0), 0)
      const ingresosExtraCaja = informes.reduce((sum, i) => sum + (i.ingresosExtraCaja || 0), 0)
      const egresosExtraCaja = informes.reduce((sum, i) => sum + (i.egresosExtraCaja || 0), 0)
      const saldoInicial = informes.reduce((sum, i) => sum + i.saldoInicial, 0)
      const saldoEfectivo = informes.reduce((sum, i) => sum + i.saldoEfectivo, 0)
      const totalPorCobrar = informes.reduce((sum, i) => sum + i.totalPorCobrar, 0)
      const expectativaCobroHoy = informes.reduce((sum, i) => sum + i.expectativaCobroHoy, 0)
      const cantidadPagos = informes.reduce((sum, i) => sum + i.cantidadPagos, 0)
      const cantidadPrestamos = informes.reduce((sum, i) => sum + i.cantidadPrestamos, 0)
      const cantidadGastos = informes.reduce((sum, i) => sum + i.cantidadGastos, 0)

      const resumenClientes = {
        clientesNuevos: informes.reduce((sum, i) => sum + i.resumenClientes.clientesNuevos, 0),
        clientesVisitados: informes.reduce((sum, i) => sum + i.resumenClientes.clientesVisitados, 0),
        clientesPendientes: informes.reduce((sum, i) => sum + i.resumenClientes.clientesPendientes, 0),
        clientesPorVisitar: informes.reduce((sum, i) => sum + i.resumenClientes.clientesPorVisitar, 0),
        clientesMora: informes.reduce((sum, i) => sum + i.resumenClientes.clientesMora, 0)
      }

      const resumenPrestamos = {
        nuevosPrestamos: informes.reduce((sum, i) => sum + i.resumenPrestamos.nuevosPrestamos, 0),
        prestamosRealizados: informes.reduce((sum, i) => sum + i.resumenPrestamos.prestamosRealizados, 0)
      }

      const resumenRenovaciones = {
        renovacionClientes: informes.reduce((sum, i) => sum + i.resumenRenovaciones.renovacionClientes, 0),
        clientesPorRenovar: informes.reduce((sum, i) => sum + i.resumenRenovaciones.clientesPorRenovar, 0),
        renovacionesPendientes: informes.reduce((sum, i) => sum + i.resumenRenovaciones.renovacionesPendientes, 0),
        renovacionesRealizadas: informes.reduce((sum, i) => sum + i.resumenRenovaciones.renovacionesRealizadas, 0)
      }

      const transferenciasRealizadas = informes.reduce((sum, i) => sum + (i.resumenTransferencias?.transferenciasRealizadas || 0), 0)

      const resumenTransferencias = {
        totalTransferencia: dineroTransferencia,
        transferenciasRealizadas: transferenciasRealizadas,
        transferenciasPendientes: 0
      }

      const detallePagos = informes.flatMap(i => i.detallePagos)
      const detallePrestamos = informes.flatMap(i => i.detallePrestamos)
      const detalleGastos = informes.flatMap(i => i.detalleGastos)
      const detalleClientesNuevos = informes.flatMap(i => i.detalleClientesNuevos)
      
      const uniqueMoraClientes = new Map<string, any>()
      for (const i of informes) {
        for (const c of i.detalleClientesMora) {
          if (!uniqueMoraClientes.has(c.id)) {
            uniqueMoraClientes.set(c.id, c)
          } else {
            const existing = uniqueMoraClientes.get(c.id)
            if (c.saldoPendiente > existing.saldoPendiente) {
              uniqueMoraClientes.set(c.id, c)
            }
          }
        }
      }
      const detalleClientesMora = Array.from(uniqueMoraClientes.values())

      const cerrado = informes.length > 0 && informes.every(i => i.cerrado)

      const informeTodos = {
        fecha,
        nombreCobrador: "-- Todos --",
        numeroRuta: "N/A",
        nombreRuta: "Todas las rutas",
        cobradorId: "todos",
        rutaId: null,
        totalCobrado,
        totalCobradoEfectivo,
        totalCobradoTransferencia,
        totalCobradoDeposito,
        moraCobrada,
        dineroTransferencia,
        totalPrestado,
        totalPrestadoEfectivo,
        totalPrestadoTransferencia,
        totalGastos,
        gastosOperativos,
        gastosCajaChica,
        ingresosExtraCaja,
        egresosExtraCaja,
        saldoInicial,
        saldoEfectivo,
        totalPorCobrar,
        expectativaCobroHoy,
        cerrado,
        cierreId: undefined,
        cantidadPagos,
        cantidadPrestamos,
        cantidadGastos,
        resumenClientes,
        resumenPrestamos,
        resumenRenovaciones,
        resumenTransferencias,
        detallePagos,
        detallePrestamos,
        detalleGastos,
        detalleClientesNuevos,
        detalleClientesMora
      }

      return NextResponse.json(informeTodos)
    } else {
      const userId = userIdParam || session.user.id
      const informe = await getInformeForUser(userId, fechaInicio, fechaFin, fecha)
      return NextResponse.json(informe)
    }
  } catch (error) {
    console.error("Error al obtener informe:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
