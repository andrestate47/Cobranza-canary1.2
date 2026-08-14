
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { registrarEliminacion } from "@/lib/auditoria"
import { TipoEntidad } from "@prisma/client"

import { requirePermission } from "@/lib/permissions"

// PUT /api/prestamos/[id] - Editar préstamo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission('EDITAR_PRESTAMOS')

    const prestamoId = params.id
    const body = await request.json()
    const {
      monto,
      interes,
      tipoPago,
      cuotas,
      fechaInicio,
      fechaFinManual,
      diasTranscurridosManual,
      fechaProximoPagoManual,
      observaciones,
      microseguroTipo,
      microseguroValor,
      microseguroTotal,
      tipoCredito,
      diasGracia,
      cuotasPagadasManual,
      cuotasAtrasadasManual,
      cuotasPendientesManual,
      diasVencidosManual,
      valorEnAtrasoManual
    } = body

    // Validaciones básicas
    if (!monto || interes === undefined || !tipoPago || !cuotas || !fechaInicio) {
      return NextResponse.json(
        { error: "Todos los campos obligatorios son requeridos" },
        { status: 400 }
      )
    }

    const montoNum = parseFloat(monto)
    const interesNum = parseFloat(interes)
    const cuotasNum = parseInt(cuotas)
    const microseguroValorNum = parseFloat(microseguroValor || '0')
    const microseguroTotalNum = parseFloat(microseguroTotal || '0')

    if (montoNum <= 0 || interesNum < 0 || cuotasNum <= 0) {
      return NextResponse.json(
        { error: "Los valores deben ser válidos y positivos" },
        { status: 400 }
      )
    }

    // Verificar que el préstamo existe
    const prestamoExistente = await prisma.prestamo.findUnique({
      where: { id: prestamoId },
      include: {
        pagos: true,
        cliente: true
      }
    })

    if (!prestamoExistente) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 })
    }

    // Verificar permisos de ruta si no es administrador
    const userDb = await prisma.user.findUnique({
      where: { email: session.user?.email || "" }
    })

    if (!userDb) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (userDb.role !== "ADMINISTRADOR") {
      if (!userDb.rutaId || prestamoExistente.cliente.rutaId !== userDb.rutaId) {
        return NextResponse.json({ error: "No tienes permiso para modificar este préstamo" }, { status: 403 })
      }
    }

    // Calcular nueva fecha de fin y valor de cuota
    const fechaInicioDate = new Date(fechaInicio)
    let fechaFin = new Date(fechaInicioDate)
    
    // Solo recalcular fechaFin matemáticamente si no nos han enviado un fechaFinManual explícito
    if (fechaFinManual) {
      fechaFin = new Date(fechaFinManual)
    } else {
      if (tipoPago === 'LUNES_A_SABADO' || tipoPago === 'LUNES_A_VIERNES' || tipoPago === 'DIARIO') {
        let cuotasContadas = 0
        let diaActual = new Date(fechaFin.getTime());

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
        fechaFin.setTime(diaActual.getTime())
      } else {
        const diasPorTipo = {
          'DIARIO': 1,
          'SEMANAL': 7,
          'QUINCENAL': 15,
          'CATORCENAL': 14,
          'FIN_DE_MES': 30,
          'MENSUAL': 30,
          'TRIMESTRAL': 90,
          'CUATRIMESTRAL': 120,
          'SEMESTRAL': 180,
          'ANUAL': 365
        }

        const diasTotal = (diasPorTipo[tipoPago as keyof typeof diasPorTipo] || 1) * cuotasNum
        fechaFin.setDate(fechaFin.getDate() + diasTotal)
      }
    }

    // Calcular nuevo valor de cuota
    const interesTotal = montoNum * (interesNum / 100)
    const montoTotal = montoNum + interesTotal
    const valorCuota = montoTotal / cuotasNum

    // Actualizar préstamo
    const prestamoActualizado = await prisma.prestamo.update({
      where: { id: prestamoId },
      data: {
        monto: montoNum,
        interes: interesNum,
        tipoPago,
        cuotas: cuotasNum,
        fechaInicio: fechaInicioDate,
        fechaFin,
        fechaFinManual: fechaFinManual ? new Date(fechaFinManual) : null,
        diasTranscurridosManual: diasTranscurridosManual !== undefined && diasTranscurridosManual !== null && diasTranscurridosManual !== "" ? parseInt(diasTranscurridosManual) : null,
        fechaProximoPagoManual: fechaProximoPagoManual ? new Date(fechaProximoPagoManual) : null,
        valorCuota,
        observaciones: observaciones || null,
        microseguroTipo: microseguroTipo || undefined,
        microseguroValor: microseguroValorNum,
        microseguroTotal: microseguroTotalNum,
        tipoCredito: tipoCredito || undefined,
        diasGracia: diasGracia !== undefined && diasGracia !== null && diasGracia !== "" ? parseInt(diasGracia) : 0,
        cuotasPagadasManual: cuotasPagadasManual !== undefined && cuotasPagadasManual !== null && cuotasPagadasManual !== "" ? parseFloat(cuotasPagadasManual) : null,
        cuotasAtrasadasManual: cuotasAtrasadasManual !== undefined && cuotasAtrasadasManual !== null && cuotasAtrasadasManual !== "" ? parseFloat(cuotasAtrasadasManual) : null,
        cuotasPendientesManual: cuotasPendientesManual !== undefined && cuotasPendientesManual !== null && cuotasPendientesManual !== "" ? parseFloat(cuotasPendientesManual) : null,
        diasVencidosManual: diasVencidosManual !== undefined && diasVencidosManual !== null && diasVencidosManual !== "" ? parseInt(diasVencidosManual) : null,
        valorEnAtrasoManual: valorEnAtrasoManual !== undefined && valorEnAtrasoManual !== null && valorEnAtrasoManual !== "" ? parseFloat(valorEnAtrasoManual) : null
        // No cambiar la fecha de creación ni el usuario
      },
      include: {
        cliente: true,
        pagos: true,
        usuario: {
          select: {
            firstName: true,
            lastName: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      message: "Préstamo actualizado exitosamente",
      prestamo: prestamoActualizado
    })

  } catch (error) {
    console.error("Error al actualizar préstamo:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { 
      status: 500 
    })
  }
}

// DELETE /api/prestamos/[id] - Eliminar préstamo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission('ELIMINAR_PRESTAMOS')

    const prestamoId = params.id

    // Verificar que el préstamo existe
    const prestamoExistente = await prisma.prestamo.findUnique({
      where: { id: prestamoId },
      include: {
        pagos: true,
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            codigoCliente: true,
            rutaId: true
          }
        }
      }
    })

    if (!prestamoExistente) {
      return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 })
    }

    // Verificar permisos de ruta si no es administrador
    const usuario = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true, role: true, rutaId: true }
    })

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (usuario.role !== "ADMINISTRADOR") {
      if (!usuario.rutaId || prestamoExistente.cliente.rutaId !== usuario.rutaId) {
        return NextResponse.json({ error: "No tienes permiso para eliminar este préstamo" }, { status: 403 })
      }
    }

    // Registrar en auditoría solo si NO es administrador
    if (usuario.role !== 'ADMINISTRADOR') {
      await registrarEliminacion(
        usuario.id,
        TipoEntidad.PRESTAMO,
        prestamoId,
        {
          cliente: `${prestamoExistente.cliente.nombre} ${prestamoExistente.cliente.apellido}`,
          codigoCliente: prestamoExistente.cliente.codigoCliente,
          monto: prestamoExistente.monto.toString(),
          interes: prestamoExistente.interes.toString(),
          cuotas: prestamoExistente.cuotas,
          valorCuota: prestamoExistente.valorCuota.toString(),
          fechaInicio: prestamoExistente.fechaInicio,
          fechaFin: prestamoExistente.fechaFin,
          estado: prestamoExistente.estado,
          pagosEliminados: prestamoExistente.pagos.length
        },
        request
      )
    }

    // Eliminar préstamo y todos sus pagos relacionados (cascada)
    // Con la configuración onDelete: Cascade, los pagos se eliminan automáticamente
    await prisma.prestamo.delete({
      where: { id: prestamoId }
    })

    return NextResponse.json({ 
      message: "Préstamo eliminado exitosamente",
      deletedId: prestamoId,
      deletedPayments: prestamoExistente.pagos.length
    })

  } catch (error) {
    console.error("Error al eliminar préstamo:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { 
      status: 500 
    })
  }
}
