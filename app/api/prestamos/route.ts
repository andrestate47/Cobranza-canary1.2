
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conSaldo = searchParams.get("conSaldo") === "true"

    // Obtener préstamos activos con información completa de cliente y pagos
    const prestamos = await prisma.prestamo.findMany({
      where: {
        estado: "ACTIVO"
      },
      include: {
        cliente: {
          select: {
            id: true,
            codigoCliente: true,
            documento: true,
            nombre: true,
            apellido: true,
            direccionCliente: true,
            direccionCobro: true,
            telefono: true,
            foto: true,
            pais: true,
            ciudad: true,
            referenciasPersonales: true
          }
        },
        pagos: {
          orderBy: {
            fecha: "desc"
          }
        }
      },
      orderBy: [
        { fechaInicio: "desc" }
      ]
    })

    // Procesar préstamos y calcular saldos
    const prestamosConSaldo = prestamos.map(prestamo => {
      const totalPagado = prestamo.pagos.reduce((sum, pago) =>
        sum + parseFloat(pago.monto.toString()), 0
      )
      const montoTotal = parseFloat(prestamo.monto.toString()) +
        (parseFloat(prestamo.monto.toString()) * parseFloat(prestamo.interes.toString()) / 100)
      const saldoPendiente = Math.round((montoTotal - totalPagado) * 100) / 100
      const cuotasPagadasRaw = parseFloat(prestamo.valorCuota.toString()) > 0
        ? totalPagado / parseFloat(prestamo.valorCuota.toString())
        : 0
      const cuotasPagadas = Math.round(cuotasPagadasRaw * 100) / 100

      // Determinar la fecha de actividad más reciente
      const fechaCreacion = prestamo.createdAt || prestamo.fechaInicio
      const fechaUltimoPago = prestamo.pagos.length > 0 ? prestamo.pagos[0].fecha : null

      const fechaActividadReciente = fechaUltimoPago && new Date(fechaUltimoPago) > new Date(fechaCreacion)
        ? fechaUltimoPago
        : fechaCreacion

      return {
        id: prestamo.id,
        monto: parseFloat(prestamo.monto.toString()),
        interes: parseFloat(prestamo.interes.toString()),
        cuotas: prestamo.cuotas,
        valorCuota: parseFloat(prestamo.valorCuota.toString()),
        fechaInicio: prestamo.fechaInicio,
        fechaFin: prestamo.fechaFin,
        estado: prestamo.estado,
        observaciones: prestamo.observaciones,
        tipoPago: prestamo.tipoPago,
        tipoCredito: prestamo.tipoCredito,
        diasGracia: prestamo.diasGracia,
        moraCredito: parseFloat(prestamo.moraCredito?.toString() || '0'),
        microseguroTipo: prestamo.microseguroTipo,
        microseguroTotal: parseFloat(prestamo.microseguroTotal?.toString() || '0'),
        fechaActividadReciente,
        cliente: prestamo.cliente,
        saldoPendiente,
        cuotasPagadas,
        montoTotal
      }
    })

    // AGRUPAR POR CLIENTE - ¡Esta es la clave!
    const clientesConPrestamos = new Map()

    prestamosConSaldo.forEach(prestamo => {
      const clienteId = prestamo.cliente.id

      if (!clientesConPrestamos.has(clienteId)) {
        clientesConPrestamos.set(clienteId, {
          cliente: prestamo.cliente,
          prestamos: [],
          fechaActividadReciente: prestamo.fechaActividadReciente,
          saldoTotalPendiente: 0,
          cuotasTotalesPagadas: 0,
          montoTotalPrestado: 0
        })
      }

      const clienteData = clientesConPrestamos.get(clienteId)
      clienteData.prestamos.push(prestamo)
      clienteData.saldoTotalPendiente += prestamo.saldoPendiente
      clienteData.cuotasTotalesPagadas += prestamo.cuotasPagadas
      clienteData.montoTotalPrestado += prestamo.monto

      // Mantener la fecha de actividad más reciente
      if (new Date(prestamo.fechaActividadReciente) > new Date(clienteData.fechaActividadReciente)) {
        clienteData.fechaActividadReciente = prestamo.fechaActividadReciente
      }
    })

    // Convertir Map a Array, redondear totales y ordenar por actividad reciente
    const clientesArray = Array.from(clientesConPrestamos.values()).map(clienteData => ({
      ...clienteData,
      saldoTotalPendiente: Math.round(clienteData.saldoTotalPendiente * 100) / 100,
      cuotasTotalesPagadas: Math.round(clienteData.cuotasTotalesPagadas * 100) / 100
    }))

    clientesArray.sort((a, b) => {
      const fechaA = new Date(a.fechaActividadReciente).getTime()
      const fechaB = new Date(b.fechaActividadReciente).getTime()
      return fechaB - fechaA
    })

    // Filtrar solo clientes con saldo pendiente si se solicita
    const resultado = conSaldo ?
      clientesArray.filter(cliente => cliente.saldoTotalPendiente > 0) :
      clientesArray

    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error al obtener préstamos:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/prestamos - Iniciando creación de préstamo")

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.log("Error: No hay sesión válida o ID de usuario")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    console.log("Sesión válida - Usuario:", session.user.email, "ID:", session.user.id)

    const body = await request.json()
    console.log("Datos recibidos:", body)

    const {
      clienteId,
      monto,
      interes,
      tipoPago = 'DIARIO',
      cuotas,
      fechaInicio,
      observaciones,
      tipoCredito = 'EFECTIVO',
      diasGracia = 0,
      moraCredito = 0,
      microseguroTipo = 'NINGUNO',
      microseguroValor = 0,
      microseguroTotal = 0
    } = body

    // Validar campos obligatorios
    if (!clienteId || !monto || interes === undefined || !cuotas || !fechaInicio) {
      console.log("Error: Campos faltantes - clienteId:", clienteId, "monto:", monto, "interes:", interes, "cuotas:", cuotas, "fechaInicio:", fechaInicio)
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      )
    }

    // Sanitizar y validar datos
    const montoNum = parseFloat(monto)
    const interesNum = parseFloat(interes)
    const cuotasNum = parseInt(cuotas)
    const diasGraciaNum = parseInt(diasGracia)
    const moraCreditoNum = parseFloat(moraCredito)
    const microseguroValorNum = parseFloat(microseguroValor)
    const microseguroTotalNum = parseFloat(microseguroTotal)

    if (isNaN(montoNum) || isNaN(interesNum) || isNaN(cuotasNum) || isNaN(diasGraciaNum) || isNaN(moraCreditoNum) || isNaN(microseguroValorNum) || isNaN(microseguroTotalNum)) {
      console.log("Error: Valores numéricos inválidos - monto:", montoNum, "interes:", interesNum, "cuotas:", cuotasNum, "diasGracia:", diasGraciaNum, "moraCredito:", moraCreditoNum, "microseguroValor:", microseguroValorNum, "microseguroTotal:", microseguroTotalNum)
      return NextResponse.json(
        { error: "Los valores numéricos son inválidos" },
        { status: 400 }
      )
    }

    if (montoNum <= 0 || interesNum < 0 || cuotasNum <= 0 || diasGraciaNum < 0 || moraCreditoNum < 0 || microseguroValorNum < 0 || microseguroTotalNum < 0) {
      console.log("Error: Valores fuera de rango - monto:", montoNum, "interes:", interesNum, "cuotas:", cuotasNum, "diasGracia:", diasGraciaNum, "moraCredito:", moraCreditoNum, "microseguroValor:", microseguroValorNum, "microseguroTotal:", microseguroTotalNum)
      return NextResponse.json(
        { error: "Los valores deben ser válidos y no negativos" },
        { status: 400 }
      )
    }

    // Validar tipo de crédito
    if (!['EFECTIVO', 'TRANSFERENCIA'].includes(tipoCredito)) {
      console.log("Error: Tipo de crédito inválido:", tipoCredito)
      return NextResponse.json(
        { error: "Tipo de crédito inválido" },
        { status: 400 }
      )
    }

    // Validar tipo de microseguro
    if (!['NINGUNO', 'MONTO_FIJO', 'PORCENTAJE'].includes(microseguroTipo)) {
      console.log("Error: Tipo de microseguro inválido:", microseguroTipo)
      return NextResponse.json(
        { error: "Tipo de microseguro inválido" },
        { status: 400 }
      )
    }

    console.log("Datos sanitizados - monto:", montoNum, "interes:", interesNum, "cuotas:", cuotasNum, "tipoPago:", tipoPago)

    // Validar que el cliente existe
    console.log("Verificando cliente con ID:", clienteId)
    try {
      const clienteExistente = await prisma.cliente.findUnique({
        where: { id: clienteId }
      })

      if (!clienteExistente) {
        console.log("Error: Cliente no encontrado con ID:", clienteId)
        return NextResponse.json(
          { error: "Cliente no encontrado" },
          { status: 404 }
        )
      }

      console.log("Cliente encontrado:", clienteExistente.nombre, clienteExistente.apellido)
    } catch (dbError) {
      console.error("Error al buscar cliente:", dbError)
      return NextResponse.json(
        { error: "Error al verificar cliente" },
        { status: 500 }
      )
    }

    // Calcular valores
    const interesTotal = montoNum * interesNum / 100
    const montoTotal = montoNum + interesTotal + microseguroTotalNum
    const valorCuota = montoTotal / cuotasNum

    console.log("Cálculos - montoTotal:", montoTotal, "interesTotal:", interesTotal, "valorCuota:", valorCuota, "tipoCredito:", tipoCredito, "diasGracia:", diasGraciaNum, "moraCredito:", moraCreditoNum)

    // Calcular fecha de fin (Usar mediodía UTC para evitar desfases horarios locales de AWS/Vercel)
    const fechaInicioStr = String(fechaInicio).split('T')[0];
    const [inicioY, inicioM, inicioD] = fechaInicioStr.split('-').map(Number);
    const fechaFin = new Date(Date.UTC(inicioY, inicioM - 1, inicioD, 12, 0, 0, 0));
    let diasTotalesAgregados = 0

    if (tipoPago === 'LUNES_A_SABADO' || tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'DIARIO') {
      let cuotasContadas = 0
      let diaActual = new Date(Date.UTC(inicioY, inicioM - 1, inicioD, 12, 0, 0, 0));

      // En la lógica original (cuotas * 1), el primer pago es "mañana".
      // Mantenemos esa lógica: avanzamos días hasta completar las cuotas.
      while (cuotasContadas < cuotasNum) {
        diaActual.setUTCDate(diaActual.getUTCDate() + 1)
        const diaSemana = diaActual.getUTCDay() // 0 = Domingo, 6 = Sábado

        let esDiaPago = true
        if (tipoPago === 'LUNES_A_SABADO' && diaSemana === 0) esDiaPago = false
        if (tipoPago === 'LUNES_A_VIERNES' && (diaSemana === 0 || diaSemana === 6)) esDiaPago = false
        if (tipoPago === 'DIARIO' && diaSemana === 0) esDiaPago = false

        if (esDiaPago) {
          cuotasContadas++
        }
      }
      // Calcular diferencia de días para el log
      diasTotalesAgregados = Math.round((diaActual.getTime() - fechaFin.getTime()) / (1000 * 60 * 60 * 24))
      fechaFin.setTime(diaActual.getTime())
    } else {
      const diasPorTipo = {
        DIARIO: 1,
        SEMANAL: 7,
        QUINCENAL: 15,
        CATORCENAL: 14,
        FIN_DE_MES: 30,
        MENSUAL: 30,
        TRIMESTRAL: 90,
        CUATRIMESTRAL: 120,
        SEMESTRAL: 180,
        ANUAL: 365
      }

      const diasMultiplicador = diasPorTipo[tipoPago as keyof typeof diasPorTipo] || 1
      diasTotalesAgregados = cuotasNum * diasMultiplicador
      fechaFin.setDate(fechaFin.getDate() + diasTotalesAgregados)
    }

    console.log("Fechas - inicio:", fechaInicio, "fin calculada:", fechaFin, "días naturales agregados:", diasTotalesAgregados)

    // Crear préstamo y registrar en caja chica usando transacción
    console.log("Creando préstamo en base de datos...")

    try {
      const resultado = await prisma.$transaction(async (tx) => {
        // Crear el préstamo
        const prestamo = await tx.prestamo.create({
          data: {
            clienteId,
            userId: session.user.id,
            monto: montoNum,
            interes: interesNum,
            tipoPago,
            cuotas: cuotasNum,
            valorCuota,
            // Parsear fecha manualmente y establecer a mediodía UTC para evitar problemas de zona horaria
            fechaInicio: (() => {
              const dateStr = String(fechaInicio).split('T')[0];
              const [y, m, d] = dateStr.split('-').map(Number);
              return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
            })(),
            fechaFin,
            observaciones: observaciones?.trim() || null,
            tipoCredito,
            interesTotal,
            diasGracia: diasGraciaNum,
            moraCredito: moraCreditoNum,
            microseguroTipo,
            microseguroValor: microseguroValorNum,
            microseguroTotal: microseguroTotalNum
          },
          include: {
            cliente: true
          }
        })

        // Registrar movimiento en caja chica como egreso general
        await tx.movimientoCajaChica.create({
          data: {
            tipo: "EGRESO_GENERAL",
            monto: montoNum,
            saldoAnterior: 0,
            saldoNuevo: 0,
            observaciones: `Préstamo: ${prestamo.cliente.nombre} ${prestamo.cliente.apellido} - ${tipoCredito} - ${cuotasNum} cuotas`,
            asignadoPor: {
              connect: { id: session.user.id }
            }
          }
        })

        console.log("Préstamo creado exitosamente con ID:", prestamo.id)
        return prestamo
      })

      return NextResponse.json({
        message: "Préstamo creado exitosamente",
        prestamo: {
          id: resultado.id,
          monto: parseFloat(resultado.monto.toString()),
          interes: parseFloat(resultado.interes.toString()),
          cuotas: resultado.cuotas,
          valorCuota: parseFloat(resultado.valorCuota.toString()),
          fechaInicio: resultado.fechaInicio,
          fechaFin: resultado.fechaFin,
          estado: resultado.estado,
          tipoPago: resultado.tipoPago,
          cliente: resultado.cliente
        }
      })
    } catch (createError) {
      console.error("Error al crear préstamo en base de datos:", createError)
      console.error("Stack trace:", createError instanceof Error ? createError.stack : 'No stack trace')

      // Error específico de Prisma
      if (createError && typeof createError === 'object' && 'code' in createError) {
        console.log("Código de error Prisma:", createError.code)
        if (createError.code === 'P2002') {
          return NextResponse.json({
            error: "Error de duplicación en base de datos"
          }, { status: 400 })
        }
        if (createError.code === 'P2003') {
          return NextResponse.json({
            error: "Error de referencia en base de datos - cliente no válido"
          }, { status: 400 })
        }
      }

      throw createError // Re-throw para ser capturado por el catch externo
    }
  } catch (error) {
    console.error("Error general al crear préstamo:", error)
    console.error("Stack trace completo:", error instanceof Error ? error.stack : 'No stack trace')

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
