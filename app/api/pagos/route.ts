
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Decimal } from "@prisma/client/runtime/library"
import { Prisma } from "@prisma/client"
import { getEcuadorDayRange, normalizeToEcuadorMidnight } from "@/lib/date-utils"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 === API PAGOS POST INICIADO ===')

    const session = await getServerSession(authOptions)
    console.log('🔐 Sesión válida:', !!session)
    console.log('🔐 Usuario ID:', session?.user?.id)
    console.log('🔐 Usuario rol:', session?.user?.role)

    if (!session) {
      console.log('❌ No hay sesión válida')
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
      const { fotoComprobante, fotoMiniatura, ...bodyToLog } = body || {}
      console.log('📦 Body recibido:', JSON.stringify(bodyToLog, null, 2))
      if (fotoComprobante) console.log('📦 Incluye fotoComprobante: Sí (base64 omitido en log)')
      if (fotoMiniatura) console.log('📦 Incluye fotoMiniatura: Sí (base64 omitido en log)')
    } catch (parseError) {
      console.log('❌ Error parsing JSON body:', parseError)
      return NextResponse.json(
        { error: "Los datos enviados no son válidos o la imagen es muy pesada. Intenta nuevamente" },
        { status: 400 }
      )
    }

    const { prestamoId, monto, devolucionSeguro, observaciones, metodoPago, fecha, fotoComprobante, fotoMiniatura } = body || {}

    // Validaciones básicas
    if (!prestamoId || !monto) {
      console.log('❌ Faltan datos obligatorios')
      return NextResponse.json(
        { error: "El préstamo y el monto del pago son obligatorios" },
        { status: 400 }
      )
    }

    // Validar método de pago
    const metodosValidos = ['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO']
    const metodoFinal = metodoPago && metodosValidos.includes(metodoPago) ? metodoPago : 'EFECTIVO'

    // Validar foto de comprobante
    if (metodoFinal !== 'EFECTIVO' && !fotoComprobante) {
      // Opcionalmente se puede requerir foto para transferencias y depósitos
      // console.log('❌ Falta foto del comprobante para pago no en efectivo')
      // return NextResponse.json(
      //   { error: "La foto del comprobante es obligatoria para transferencias y depósitos" },
      //   { status: 400 }
      // )
    }

    // Validar que el monto sea un número válido y positivo
    const montoNumerico = parseFloat(monto)
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      console.log('❌ Monto inválido:', monto)
      return NextResponse.json(
        { error: "El monto debe ser un número positivo mayor a cero" },
        { status: 400 }
      )
    }

    const devolucionSeguroNumerico = devolucionSeguro ? parseFloat(devolucionSeguro) : 0
    if (isNaN(devolucionSeguroNumerico) || devolucionSeguroNumerico < 0) {
      return NextResponse.json(
        { error: "El monto de devolución de seguro debe ser un número positivo o cero" },
        { status: 400 }
      )
    }

    // Validar que el monto no sea excesivamente grande (más de 1 billón)
    if (montoNumerico > 1000000000000) {
      console.log('❌ Monto demasiado grande:', monto)
      return NextResponse.json(
        { error: "El monto ingresado es demasiado grande. Verifica la cantidad" },
        { status: 400 }
      )
    }

    // Validar que prestamoId sea una cadena válida
    if (typeof prestamoId !== 'string' || prestamoId.trim().length === 0) {
      console.log('❌ PrestamoId inválido:', prestamoId)
      return NextResponse.json(
        { error: "ID de préstamo no válido" },
        { status: 400 }
      )
    }

    // Validar userId de la sesión
    if (!session.user?.id || typeof session.user.id !== 'string') {
      console.log('❌ UserId de sesión inválido:', session.user?.id)
      return NextResponse.json(
        { error: "Sesión de usuario no válida. Por favor vuelve a iniciar sesión" },
        { status: 401 }
      )
    }

    // Verificar si el día está cerrado (solo para cobradores)
    if (session.user.role === "COBRADOR") {
      const hoy = normalizeToEcuadorMidnight()

      const cierreHoy = await prisma.cierreDia.findUnique({
        where: {
          userId_fecha: {
            userId: session.user.id,
            fecha: hoy
          }
        }
      })

      if (cierreHoy) {
        return NextResponse.json(
          { error: "No se pueden registrar pagos después del cierre del día" },
          { status: 403 }
        )
      }
    }

    // Verificar que el préstamo existe y está activo
    const prestamo = await prisma.prestamo.findUnique({
      where: { id: prestamoId },
      include: {
        cliente: true,
        pagos: {
          orderBy: { fecha: 'desc' },
          take: 1
        }
      }
    })

    if (!prestamo) {
      return NextResponse.json(
        { error: "Préstamo no encontrado" },
        { status: 404 }
      )
    }

    if (prestamo.estado !== "ACTIVO") {
      return NextResponse.json(
        { error: "No se pueden registrar pagos en un préstamo inactivo" },
        { status: 400 }
      )
    }

    // Calcular saldo pendiente antes de crear el pago para validar
    console.log('🔢 Calculando saldo pendiente actual...')
    const pagosExistentes = await prisma.pago.aggregate({
      where: { prestamoId },
      _sum: { monto: true, devolucionSeguro: true }
    })

    const montoOriginalPrestamo = Number(prestamo.monto)
    const tasaInteresPrestamo = Number(prestamo.interes) / 100
    let montoTotalPrestamo = montoOriginalPrestamo * (1 + tasaInteresPrestamo)
    
    const microseguroTotal = Number(prestamo.microseguroTotal || 0)
    if (prestamo.microseguroTipo !== 'DEVOLUCION') {
      montoTotalPrestamo += microseguroTotal
    }
    const totalPagosExistentes = Number(pagosExistentes._sum.monto || 0) + Number(pagosExistentes._sum.devolucionSeguro || 0)
    // Redondear a 2 decimales para evitar precisiones de punto flotante
    const saldoActual = Math.max(0, Math.round((montoTotalPrestamo - totalPagosExistentes) * 100) / 100)

    const pagoTotalVirtual = montoNumerico + devolucionSeguroNumerico;

    console.log('💰 Validación de saldo:')
    console.log('  - Monto total préstamo:', montoTotalPrestamo)
    console.log('  - Total pagos existentes:', totalPagosExistentes)
    console.log('  - Saldo actual:', saldoActual)
    console.log('  - Monto a pagar (efectivo):', montoNumerico)
    console.log('  - Devolución seguro:', devolucionSeguroNumerico)

    // Validar que el pago no exceda el saldo pendiente
    if (pagoTotalVirtual > saldoActual) {
      console.log('❌ Pago excede saldo pendiente')
      return NextResponse.json(
        {
          error: `La suma del pago y seguro devuelto ($${pagoTotalVirtual.toLocaleString('es-CO')}) no puede ser mayor al saldo pendiente ($${saldoActual.toLocaleString('es-CO')})`
        },
        { status: 400 }
      )
    }

    // Validar que haya saldo pendiente (préstamo no esté ya pagado)
    if (saldoActual <= 0) {
      console.log('❌ No hay saldo pendiente')
      return NextResponse.json(
        { error: "Este préstamo ya está completamente pagado" },
        { status: 400 }
      )
    }

    console.log('💾 Creando pago en BD...')
    console.log('💰 Monto a guardar:', montoNumerico, typeof montoNumerico)
    console.log('💰 PrestamoId:', prestamoId, typeof prestamoId)
    console.log('👤 UserId:', session.user.id, typeof session.user.id)

    // Crear el pago usando el constructor Decimal de Prisma para mayor compatibilidad
    let montoDecimal: Decimal
    try {
      montoDecimal = new Decimal(montoNumerico)
      console.log('💰 MontoDecimal creado:', montoDecimal.toString())
    } catch (decimalError) {
      console.log('❌ Error creando Decimal:', decimalError)
      return NextResponse.json(
        { error: "Error en el formato del monto. Por favor verifica que sea un número válido" },
        { status: 400 }
      )
    }

    let pago
    try {
      pago = await prisma.pago.create({
        data: {
          prestamoId,
          userId: session.user.id,
          monto: montoDecimal, // Pasar como objeto Decimal
          devolucionSeguro: devolucionSeguroNumerico > 0 ? new Decimal(devolucionSeguroNumerico) : null,
          observaciones: observaciones?.trim() || null,
          metodoPago: metodoFinal,
          fotoComprobante: fotoComprobante || null,
          fotoMiniatura: fotoMiniatura || null,
          fecha: fecha ? new Date(fecha) : undefined
        },
        include: {
          prestamo: {
            include: {
              cliente: true
            }
          },
          usuario: {
            select: {
              firstName: true,
              lastName: true,
              name: true
            }
          }
        }
      })
    } catch (pagoError) {
      console.error('❌ Error específico creando pago:', pagoError)

      if (pagoError instanceof Error) {
        // Error específico de validación de Decimal
        if (pagoError.message.includes('Decimal') || pagoError.message.includes('Invalid')) {
          console.log('🔍 Error de Decimal detectado:', pagoError.message)
          return NextResponse.json(
            { error: "Error en el formato del monto. Por favor verifica que sea un número válido" },
            { status: 400 }
          )
        }

        // Error de foreign key (prestamoId o userId inválidos)
        if (pagoError.message.includes('Foreign key constraint')) {
          console.log('🔍 Error de clave foránea detectado:', pagoError.message)
          return NextResponse.json(
            { error: "Error de referencia de datos. Por favor verifica el préstamo e intenta nuevamente" },
            { status: 400 }
          )
        }
      }

      // Re-lanzar el error para que sea manejado por el catch principal
      throw pagoError
    }

    console.log('✅ Pago creado en BD')
    console.log('📄 ID pago:', pago.id)
    console.log('💰 Monto pago:', pago.monto)
    console.log('👤 Cliente:', pago.prestamo?.cliente?.nombre)

    // Calcular nuevo saldo pendiente después de crear el pago
    console.log('🔢 Recalculando saldo pendiente después del pago...')
    const nuevoSaldoPendiente = Math.max(0, saldoActual - pagoTotalVirtual)

    console.log('🔢 Cálculos finales:')
    console.log('  - Saldo antes del pago:', saldoActual)
    console.log('  - Reducción de deuda:', pagoTotalVirtual)
    console.log('  - Nuevo saldo pendiente:', nuevoSaldoPendiente)

    const numeroBoleta = `BOL-${String(pago.id).padStart(6, '0')}`
    console.log('📄 Número de boleta generado:', numeroBoleta)

    // Obtener el último pago anterior para incluir en la boleta
    const ultimoPagoAnterior = prestamo.pagos.length > 0 && prestamo.pagos[0].id !== pago.id
      ? prestamo.pagos[0]
      : null;

    const responseData = {
      message: "Pago registrado exitosamente",
      pago: {
        id: pago.id,
        monto: Number(pago.monto),
        fecha: pago.fecha,
        observaciones: pago.observaciones,
        metodoPago: pago.metodoPago,
        devolucionSeguro: pago.devolucionSeguro ? Number(pago.devolucionSeguro) : 0,
        numeroBoleta: numeroBoleta,
        prestamo: {
          id: prestamo.id,
          monto: montoOriginalPrestamo,
          interes: Number(prestamo.interes),
          valorCuota: Number(prestamo.valorCuota),
          montoTotal: montoTotalPrestamo,
          saldoPendiente: nuevoSaldoPendiente,
          fechaInicio: prestamo.fechaInicio,
          tipoPago: prestamo.tipoPago,
          cuotas: prestamo.cuotas,
          microseguroTipo: prestamo.microseguroTipo,
          microseguroValor: Number(prestamo.microseguroValor),
          microseguroTotal: Number(prestamo.microseguroTotal),
          ultimoPago: ultimoPagoAnterior ? {
            fecha: ultimoPagoAnterior.fecha,
            monto: Number(ultimoPagoAnterior.monto)
          } : undefined
        },
        cliente: {
          nombre: pago.prestamo.cliente.nombre,
          apellido: pago.prestamo.cliente.apellido,
          documento: pago.prestamo.cliente.documento,
          telefono: pago.prestamo.cliente.telefono,
          direccionCliente: pago.prestamo.cliente.direccionCliente
        },
        usuario: {
          nombre: pago.usuario.firstName && pago.usuario.lastName
            ? `${pago.usuario.firstName} ${pago.usuario.lastName}`
            : pago.usuario.name || "Usuario"
        },
        // Campos adicionales para la boleta mejorada
        tipoCredito: prestamo.tipoCredito.toLowerCase(),
        tipoPagoMetodo: pago.metodoPago.toLowerCase(),
        fotoComprobante: pago.fotoComprobante,
        fotoMiniatura: pago.fotoMiniatura
      }
    }

    console.log('📤 RESPONSE COMPLETA DE LA API:')
    console.log(JSON.stringify(responseData, null, 2))
    console.log('🏁 Enviando response exitosa')

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("❌ Error al registrar pago:", error)
    console.error("❌ Stack trace completo:", error instanceof Error ? error.stack : 'No disponible')

    // Manejar diferentes tipos de errores específicamente
    if (error instanceof Error) {
      console.log('📋 Analizando tipo de error:', error.message)

      // Error de validación de Prisma
      if (error.message.includes('Unique constraint')) {
        console.log('🔍 Error de constraint único detectado')
        return NextResponse.json(
          { error: "Ya existe un registro con estos datos" },
          { status: 400 }
        )
      }

      // Error de conexión a base de datos
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        console.log('🔍 Error de conexión detectado')
        return NextResponse.json(
          { error: "Problema de conexión. Intenta nuevamente en unos momentos" },
          { status: 503 }
        )
      }

      // Error de validación de Prisma (incluye Decimal)
      if (error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('Expected') || error.message.includes('validation')) {
        console.log('🔍 Error de validación de Prisma detectado')
        return NextResponse.json(
          { error: "Error en la validación de datos. Por favor verifica la información ingresada" },
          { status: 400 }
        )
      }

      // Error de cast o conversión
      if (error.message.includes('cast') || error.message.includes('convert') || error.message.includes('Decimal')) {
        console.log('🔍 Error de conversión de datos detectado')
        return NextResponse.json(
          { error: "Error en el formato de los datos. Verifica que el monto sea un número válido" },
          { status: 400 }
        )
      }

      // Error de sesión o autenticación
      if (error.message.includes('session') || error.message.includes('auth')) {
        console.log('🔍 Error de sesión detectado')
        return NextResponse.json(
          { error: "Tu sesión ha expirado. Por favor recarga la página e intenta nuevamente" },
          { status: 401 }
        )
      }
    }

    // Error genérico pero más amigable
    console.log('🔍 Error genérico no categorizado')
    return NextResponse.json(
      { error: "Error interno del servidor. Por favor intenta nuevamente o contacta al administrador" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get("fecha")
    const prestamoId = searchParams.get("prestamoId")

    // Obtener datos del usuario para filtrar por ruta si no es administrador
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || "" }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const whereCondition: Prisma.PagoWhereInput = {}

    // Si no es ADMINISTRADOR, filtrar por la ruta del cliente
    if (user.role !== "ADMINISTRADOR") {
      if (!user.rutaId) {
        whereCondition.prestamo = {
          cliente: {
            rutaId: "sin-ruta-imposible"
          }
        }
      } else {
        whereCondition.prestamo = {
          cliente: {
            rutaId: user.rutaId
          }
        }
      }
    }

    if (fecha) {
      const { inicio: fechaInicio, fin: fechaFin } = getEcuadorDayRange(fecha)

      whereCondition.fecha = {
        gte: fechaInicio,
        lte: fechaFin
      }
    }

    if (prestamoId) {
      whereCondition.prestamoId = prestamoId
    }

    const pagos = await prisma.pago.findMany({
      where: whereCondition,
      include: {
        prestamo: {
          include: {
            cliente: true
          }
        },
        usuario: {
          select: {
            firstName: true,
            lastName: true,
            name: true
          }
        }
      },
      orderBy: {
        fecha: "desc"
      }
    })

    const pagosFormateados = pagos.map(pago => ({
      id: pago.id,
      monto: Number(pago.monto),
      fecha: pago.fecha,
      observaciones: pago.observaciones,
      metodoPago: pago.metodoPago,
      devolucionSeguro: pago.devolucionSeguro ? Number(pago.devolucionSeguro) : 0,
      modificado: pago.modificado,
      prestamo: {
        id: pago.prestamo.id,
        monto: Number(pago.prestamo.monto),
        cliente: {
          nombre: pago.prestamo.cliente.nombre,
          apellido: pago.prestamo.cliente.apellido,
          documento: pago.prestamo.cliente.documento
        }
      },
      usuario: {
        nombre: pago.usuario.firstName && pago.usuario.lastName
          ? `${pago.usuario.firstName} ${pago.usuario.lastName}`
          : pago.usuario.name || "Usuario"
      }
    }))

    return NextResponse.json(pagosFormateados)
  } catch (error) {
    console.error("❌ Error al obtener pagos:", error)

    // Manejar diferentes tipos de errores específicamente
    if (error instanceof Error) {
      // Error de conexión a base de datos
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        return NextResponse.json(
          { error: "Problema de conexión. Intenta nuevamente en unos momentos" },
          { status: 503 }
        )
      }
    }

    // Error genérico pero más amigable
    return NextResponse.json(
      { error: "No se pudieron cargar los pagos. Por favor intenta nuevamente" },
      { status: 500 }
    )
  }
}
