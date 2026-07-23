
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getDiasMoraSinDomingos } from "@/lib/date-utils"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0]

    // Obtener datos del usuario para filtrar por ruta si no es administrador
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || "" }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Construir filtro de ruta según el rol
    const routeFilter: any = {}
    if (user.role !== "ADMINISTRADOR") {
      if (!user.rutaId) {
        routeFilter.rutaId = "sin-ruta-imposible"
      } else {
        routeFilter.rutaId = user.rutaId
      }
    }

    // Convertir fecha a rango del día CORRECTAMENTE
    const [year, month, day] = fecha.split('-').map(Number)

    const fechaInicio = new Date(year, month - 1, day, 0, 0, 0, 0)
    const fechaFin = new Date(year, month - 1, day, 23, 59, 59, 999)

    // Ejecutar todas las consultas del informe de clientes en paralelo con Promise.all
    const [
      totalClientes,
      prestamosData,
      prestamosCancelados,
      prestamosNuevosHoy,
      prestamosVencidosTotal,
      clientesVisitados,
      clientesNoVisitados,
      prestamosVencidos,
      nuevosClientes,
      nuevosPrestamos,
      cobrosHoy,
      clientesConMora,
      todosPrestamosTotales,
      prestamosCanceladosLista,
      prestamosEnMoraLista
    ] = await Promise.all([
      // 1. CLIENTES TOTALES
      prisma.cliente.count({
        where: { 
          activo: true,
          ...routeFilter
        }
      }),
      // 2. PRÉSTAMOS TOTALES Y ACTIVOS
      prisma.prestamo.aggregate({
        _count: { id: true },
        where: { 
          estado: 'ACTIVO',
          cliente: routeFilter
        }
      }),
      // 2.1 PRÉSTAMOS CANCELADOS (COMPLETADOS)
      prisma.prestamo.count({
        where: { 
          estado: 'CANCELADO',
          cliente: routeFilter
        }
      }),
      // 2.2 PRÉSTAMOS NUEVOS HOY
      prisma.prestamo.count({
        where: {
          createdAt: {
            gte: fechaInicio,
            lte: fechaFin
          },
          cliente: routeFilter
        }
      }),
      // 2.3 PRÉSTAMOS VENCIDOS (Total)
      prisma.prestamo.count({
        where: {
          estado: 'ACTIVO',
          fechaFin: {
            lt: new Date()
          },
          cliente: routeFilter
        }
      }),
      // 3. CLIENTES VISITADOS HOY
      prisma.cliente.findMany({
        where: {
          activo: true,
          ...routeFilter,
          visitas: {
            some: {
              fecha: {
                gte: fechaInicio,
                lte: fechaFin
              }
            }
          }
        },
        include: {
          visitas: {
            where: {
              fecha: {
                gte: fechaInicio,
                lte: fechaFin
              }
            },
            include: {
              usuario: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: {
              fecha: 'desc'
            },
            take: 1
          },
          prestamos: {
            where: { estado: 'ACTIVO' },
            include: {
              pagos: {
                select: {
                  monto: true
                }
              }
            }
          }
        }
      }),
      // 4. CLIENTES NO VISITADOS HOY (con préstamos activos)
      prisma.cliente.findMany({
        where: {
          activo: true,
          ...routeFilter,
          prestamos: {
            some: { estado: 'ACTIVO' }
          },
          NOT: {
            visitas: {
              some: {
                fecha: {
                  gte: fechaInicio,
                  lte: fechaFin
                }
              }
            }
          }
        },
        include: {
          visitas: {
            orderBy: {
              fecha: 'desc'
            },
            take: 1
          },
          prestamos: {
            where: { estado: 'ACTIVO' },
            include: {
              pagos: {
                select: {
                  monto: true
                }
              }
            }
          }
        }
      }),
      // 5. PRÉSTAMOS VENCIDOS
      prisma.prestamo.findMany({
        where: {
          estado: 'ACTIVO',
          fechaFin: {
            lt: new Date()
          },
          cliente: routeFilter
        },
        include: {
          cliente: {
            select: {
              nombre: true,
              apellido: true,
              documento: true,
              telefono: true,
              direccionCobro: true,
              direccionCliente: true
            }
          },
          pagos: {
            select: {
              monto: true,
              fecha: true
            },
            orderBy: {
              fecha: 'desc'
            }
          }
        }
      }),
      // 6. LISTA DE CLIENTES (Todos los activos para el reporte)
      prisma.cliente.findMany({
        where: {
          activo: true,
          ...routeFilter
        },
        include: {
          prestamos: {
            select: {
              id: true,
              monto: true,
              estado: true,
              fechaInicio: true,
              tipoPago: true,
              interes: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      // 7. NUEVOS PRÉSTAMOS (creados hoy)
      prisma.prestamo.findMany({
        where: {
          createdAt: {
            gte: fechaInicio,
            lte: fechaFin
          },
          cliente: routeFilter
        },
        include: {
          cliente: {
            select: {
              nombre: true,
              apellido: true,
              documento: true,
              telefono: true,
              direccionCobro: true
            }
          },
          usuario: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          pagos: {
            select: {
              monto: true,
              fecha: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      // 8. COBROS DE HOY
      prisma.pago.findMany({
        where: {
          fecha: {
            gte: fechaInicio,
            lte: fechaFin
          },
          prestamo: {
            cliente: routeFilter
          }
        },
        include: {
          prestamo: {
            include: {
              cliente: {
                select: {
                  nombre: true,
                  apellido: true,
                  documento: true,
                  telefono: true
                }
              },
              pagos: {
                select: {
                  monto: true
                }
              }
            }
          },
          usuario: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          fecha: 'desc'
        }
      }),
      // 9. CLIENTES CON MORA (préstamos vencidos + saldo pendiente)
      prisma.cliente.findMany({
        where: {
          activo: true,
          ...routeFilter,
          prestamos: {
            some: {
              estado: 'ACTIVO',
              fechaFin: {
                lt: new Date()
              }
            }
          }
        },
        include: {
          visitas: {
            orderBy: {
              fecha: 'desc'
            },
            take: 1
          },
          prestamos: {
            where: {
              estado: 'ACTIVO',
              fechaFin: {
                lt: new Date()
              }
            },
            include: {
              pagos: {
                select: {
                  monto: true
                }
              }
            }
          }
        }
      }),
      // 10. TODOS LOS PRÉSTAMOS ACTIVOS (para pestaña Total)
      prisma.prestamo.findMany({
        where: { 
          estado: 'ACTIVO',
          cliente: routeFilter
        },
        include: {
          cliente: {
            select: {
              nombre: true,
              apellido: true,
              documento: true,
              telefono: true,
              direccionCobro: true,
              direccionCliente: true
            }
          },
          pagos: {
            select: {
              monto: true,
              fecha: true
            },
            orderBy: {
              fecha: 'desc'
            }
          }
        },
        orderBy: {
          fechaInicio: 'desc'
        }
      }),
      // 11. PRÉSTAMOS CANCELADOS (completados)
      prisma.prestamo.findMany({
        where: { 
          estado: 'CANCELADO',
          cliente: routeFilter
        },
        include: {
          cliente: {
            select: {
              nombre: true,
              apellido: true,
              documento: true,
              telefono: true,
              direccionCobro: true,
              direccionCliente: true
            }
          },
          pagos: {
            select: {
              monto: true,
              fecha: true
            },
            orderBy: {
              fecha: 'desc'
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 100 // Limitamos a los últimos 100
      }),
      // 12. PRÉSTAMOS EN MORA (préstamos específicos vencidos con info del cliente)
      prisma.prestamo.findMany({
        where: {
          estado: 'ACTIVO',
          fechaFin: {
            lt: new Date()
          },
          cliente: routeFilter
        },
        include: {
          cliente: {
            select: {
              nombre: true,
              apellido: true,
              documento: true,
              telefono: true,
              direccionCobro: true,
              direccionCliente: true
            }
          },
          pagos: {
            select: {
              monto: true,
              fecha: true
            },
            orderBy: {
              fecha: 'desc'
            }
          }
        },
        orderBy: {
          fechaFin: 'asc' // Los más vencidos primero
        }
      })
    ])

    // Function to check if a loan has actually missing payments
    const hasSaldoPendiente = (prestamo: any) => {
      const pagado = prestamo.pagos?.reduce((sum: any, pago: any) => sum + Number(pago.monto), 0) || 0
      return Number(prestamo.monto) - pagado > 0
    }

    // Calcular totales de cobros
    const totalCobrado = cobrosHoy.reduce((sum, pago) => sum + Number(pago.monto), 0)

    const prestamosVencidosReales = prestamosVencidos.filter(hasSaldoPendiente)
    const prestamosEnMoraListaReales = prestamosEnMoraLista.filter(hasSaldoPendiente)
    const clientesConMoraReales = clientesConMora.map(cliente => ({
      ...cliente,
      prestamos: cliente.prestamos.filter(hasSaldoPendiente)
    })).filter(c => c.prestamos.length > 0)

    // Construir respuesta
    const informe = {
      fecha,
      resumen: {
        totalClientes,
        totalPrestamos: prestamosData._count.id,
        clientesVisitadosHoy: clientesVisitados.length,
        clientesNoVisitadosHoy: clientesNoVisitados.length,
        prestamosVencidos: prestamosVencidosReales.length,
        // Filtramos para contar solo los realmente nuevos hoy
        nuevosClientesHoy: nuevosClientes.filter(c => {
          const cDate = new Date(c.createdAt)
          return cDate >= fechaInicio && cDate <= fechaFin
        }).length,
        nuevosPrestamosHoy: nuevosPrestamos.length,
        cobrosHoy: cobrosHoy.length,
        totalCobradoHoy: totalCobrado,
        clientesConMora: clientesConMoraReales.length,
        // Nuevas estadísticas de préstamos
        prestamosCancelados,
        prestamosNuevosHoyCount: prestamosNuevosHoy,
        prestamosVencidosCount: prestamosVencidosReales.length,
        prestamosEnMora: clientesConMoraReales.reduce((sum, cliente) => sum + cliente.prestamos.length, 0)
      },
      detalles: {
        clientesVisitados: clientesVisitados.map(cliente => {
          const totalPrestado = cliente.prestamos.reduce((sum, p) => sum + Number(p.monto), 0)
          const totalPagado = cliente.prestamos.reduce((sum, p) =>
            sum + p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto), 0), 0
          )
          const saldoPendiente = totalPrestado - totalPagado
          const prestamosVencidos = cliente.prestamos.filter(p => new Date(p.fechaFin) < new Date() && hasSaldoPendiente(p))

          return {
            id: cliente.id,
            nombre: `${cliente.nombre} ${cliente.apellido}`,
            documento: cliente.documento,
            telefono: cliente.telefono,
            direccion: cliente.direccionCobro || cliente.direccionCliente,
            ultimaVisita: cliente.visitas[0]?.fecha || null,
            visitadoPor: cliente.visitas[0]?.usuario ?
              `${cliente.visitas[0].usuario.firstName} ${cliente.visitas[0].usuario.lastName}` : null,
            tipoVisita: cliente.visitas[0]?.tipo || null,
            observaciones: cliente.visitas[0]?.observaciones || null,
            prestamosActivos: cliente.prestamos.length,
            totalPrestado,
            totalPagado,
            saldoPendiente,
            prestamosVencidos: prestamosVencidos.length,
            diasMora: prestamosVencidos.length > 0 ?
              Math.max(...prestamosVencidos.map(p =>
                getDiasMoraSinDomingos(p.fechaFin, new Date(), p.tipoPago)
              )) : 0
          }
        }),

        clientesNoVisitados: clientesNoVisitados.map(cliente => {
          const totalPrestado = cliente.prestamos.reduce((sum, p) => sum + Number(p.monto), 0)
          const totalPagado = cliente.prestamos.reduce((sum, p) =>
            sum + p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto), 0), 0
          )
          const saldoPendiente = totalPrestado - totalPagado
          const prestamosVencidos = cliente.prestamos.filter(p => new Date(p.fechaFin) < new Date() && hasSaldoPendiente(p))
          const ultimaVisita = cliente.visitas[0]?.fecha || null
          const diasSinVisita = ultimaVisita ?
            Math.ceil((new Date().getTime() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24)) : null

          return {
            id: cliente.id,
            nombre: `${cliente.nombre} ${cliente.apellido}`,
            documento: cliente.documento,
            telefono: cliente.telefono,
            direccion: cliente.direccionCobro || cliente.direccionCliente,
            prestamosActivos: cliente.prestamos.length,
            montoTotal: totalPrestado,
            totalPrestado,
            totalPagado,
            saldoPendiente,
            prestamosVencidos: prestamosVencidos.length,
            ultimaVisita,
            diasSinVisita,
            diasMora: prestamosVencidos.length > 0 ?
              Math.max(...prestamosVencidos.map(p =>
                getDiasMoraSinDomingos(p.fechaFin, new Date(), p.tipoPago)
              )) : 0
          }
        }),

        prestamosVencidos: prestamosVencidosReales.map(prestamo => {
          const totalPagado = prestamo.pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
          const saldoPendiente = Number(prestamo.monto) - totalPagado
          const cuotasPagadas = Math.floor(totalPagado / Number(prestamo.valorCuota || 1))
          const porcentajePagado = (totalPagado / Number(prestamo.monto || 1) * 100).toFixed(1)
          const ultimoPago = prestamo.pagos?.length > 0 ? prestamo.pagos[0].fecha : null

          return {
            id: prestamo.id,
            cliente: `${prestamo.cliente?.nombre || ''} ${prestamo.cliente?.apellido || ''}`.trim() || 'Desconocido',
            documento: prestamo.cliente?.documento || '',
            telefono: prestamo.cliente?.telefono || '',
            direccion: prestamo.cliente?.direccionCobro || prestamo.cliente?.direccionCliente || '',
            monto: Number(prestamo.monto),
            valorCuota: Number(prestamo.valorCuota),
            cuotas: prestamo.cuotas,
            fechaVencimiento: prestamo.fechaFin,
            diasVencido: Math.ceil((new Date().getTime() - new Date(prestamo.fechaFin).getTime()) / (1000 * 60 * 60 * 24)),
            totalPagado,
            saldoPendiente,
            cuotasPagadas,
            porcentajePagado,
            ultimoPago
          }
        }),

        nuevosClientes: nuevosClientes.map(cliente => {
          const prestamosActivos = cliente.prestamos.filter(p => p.estado === 'ACTIVO')
          const primerPrestamo = cliente.prestamos.length > 0 ? cliente.prestamos[0] : null

          return {
            id: cliente.id,
            nombre: `${cliente.nombre} ${cliente.apellido}`,
            documento: cliente.documento,
            telefono: cliente.telefono,
            direccion: cliente.direccionCobro || cliente.direccionCliente,
            fechaRegistro: cliente.createdAt,
            totalPrestamos: cliente.prestamos.length,
            prestamosActivos: prestamosActivos.length,
            tienePrestamo: cliente.prestamos.length > 0,
            montoPrimerPrestamo: primerPrestamo ? Number(primerPrestamo.monto) : null,
            tipoPagoPrimerPrestamo: primerPrestamo?.tipoPago || null,
            interesPrimerPrestamo: primerPrestamo ? Number(primerPrestamo.interes) : null
          }
        }),

        nuevosPrestamos: nuevosPrestamos.map(prestamo => {
          const totalPagado = prestamo.pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
          const cuotasPagadas = Math.floor(totalPagado / Number(prestamo.valorCuota || 1))
          const porcentajePagado = (totalPagado / Number(prestamo.monto || 1) * 100).toFixed(1)

          return {
            id: prestamo.id,
            cliente: `${prestamo.cliente?.nombre || ''} ${prestamo.cliente?.apellido || ''}`.trim() || 'Desconocido',
            documento: prestamo.cliente?.documento || '',
            telefono: prestamo.cliente?.telefono || '',
            direccion: prestamo.cliente?.direccionCobro || '',
            monto: Number(prestamo.monto),
            interes: Number(prestamo.interes),
            tipoPago: prestamo.tipoPago,
            valorCuota: Number(prestamo.valorCuota),
            cuotas: prestamo.cuotas,
            fechaInicio: prestamo.fechaInicio,
            fechaFin: prestamo.fechaFin,
            creadoPor: prestamo.usuario ? `${prestamo.usuario.firstName} ${prestamo.usuario.lastName}` : 'Desconocido',
            totalPagado,
            cuotasPagadas,
            porcentajePagado,
            pagosRealizados: prestamo.pagos?.length || 0
          }
        }),

        cobrosHoy: cobrosHoy.map(pago => {
          const totalPagado = pago.prestamo?.pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
          const montoPrestamo = Number(pago.prestamo?.monto || 1)
          const porcentajePagado = (totalPagado / montoPrestamo * 100).toFixed(1)
          const cuotasPagadas = Math.floor(totalPagado / Number(pago.prestamo?.valorCuota || 1))
          const saldoPendiente = montoPrestamo - totalPagado

          return {
            id: pago.id,
            cliente: pago.prestamo ? `${pago.prestamo.cliente?.nombre || ''} ${pago.prestamo.cliente?.apellido || ''}`.trim() : 'Desconocido',
            documento: pago.prestamo?.cliente?.documento || '',
            telefono: pago.prestamo?.cliente?.telefono || '',
            monto: Number(pago.monto),
            fecha: pago.fecha,
            prestamoId: pago.prestamoId,
            montoPrestamo,
            valorCuota: Number(pago.prestamo?.valorCuota || 0),
            cuotasTotales: pago.prestamo?.cuotas || 0,
            totalPagado,
            saldoPendiente,
            cuotasPagadas,
            porcentajePagado,
            cobradoPor: pago.usuario ? `${pago.usuario.firstName} ${pago.usuario.lastName}` : 'Desconocido',
            observaciones: pago.observaciones
          }
        }),

        clientesConMora: clientesConMoraReales.map(cliente => {
          const totalPrestado = cliente.prestamos.reduce((sum, p) => sum + Number(p.monto), 0)
          const totalPagado = cliente.prestamos.reduce((sum, p) =>
            sum + p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto), 0), 0
          )
          const saldoPendiente = totalPrestado - totalPagado
          const diasMora = Math.max(...cliente.prestamos.map(p =>
            getDiasMoraSinDomingos(p.fechaFin, new Date(), p.tipoPago)
          ))
          const ultimaVisita = cliente.visitas[0]?.fecha || null
          const diasSinGestion = ultimaVisita ?
            Math.ceil((new Date().getTime() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24)) : null

          return {
            id: cliente.id,
            nombre: `${cliente.nombre} ${cliente.apellido}`,
            documento: cliente.documento,
            telefono: cliente.telefono,
            direccion: cliente.direccionCobro || cliente.direccionCliente,
            prestamosEnMora: cliente.prestamos.length,
            montoTotal: totalPrestado,
            totalPrestado,
            totalPagado,
            saldoPendiente,
            diasMora,
            ultimaVisita,
            diasSinGestion,
            cuotasVencidas: cliente.prestamos.reduce((sum, p) => {
              const cuotasPagadas = Math.floor(p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto), 0) / Number(p.valorCuota))
              return sum + (p.cuotas - cuotasPagadas)
            }, 0)
          }
        }),

        // NUEVAS LISTAS PARA LAS SUB-PESTAÑAS DE PRÉSTAMOS
        todosPrestamosTotales: todosPrestamosTotales.map(prestamo => {
          const totalPagado = prestamo.pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
          const saldoPendiente = Number(prestamo.monto) - totalPagado
          const cuotasPagadas = Math.floor(totalPagado / Number(prestamo.valorCuota || 1))
          const porcentajePagado = (totalPagado / Number(prestamo.monto || 1) * 100).toFixed(1)
          const ultimoPago = prestamo.pagos?.length > 0 ? prestamo.pagos[0].fecha : null
          const estaVencido = new Date(prestamo.fechaFin) < new Date()
          const diasVencido = estaVencido ?
            getDiasMoraSinDomingos(prestamo.fechaFin, new Date(), prestamo.tipoPago) : 0

          return {
            id: prestamo.id,
            cliente: `${prestamo.cliente?.nombre || ''} ${prestamo.cliente?.apellido || ''}`.trim() || 'Desconocido',
            documento: prestamo.cliente?.documento || '',
            telefono: prestamo.cliente?.telefono || '',
            direccion: prestamo.cliente?.direccionCobro || prestamo.cliente?.direccionCliente || '',
            monto: Number(prestamo.monto),
            interes: Number(prestamo.interes),
            tipoPago: prestamo.tipoPago,
            valorCuota: Number(prestamo.valorCuota),
            cuotas: prestamo.cuotas,
            fechaInicio: prestamo.fechaInicio,
            fechaFin: prestamo.fechaFin,
            totalPagado,
            saldoPendiente,
            cuotasPagadas,
            porcentajePagado,
            ultimoPago,
            estaVencido,
            diasVencido
          }
        }),

        prestamosCanceladosLista: prestamosCanceladosLista.map(prestamo => {
          const totalPagado = prestamo.pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
          const cuotasPagadas = prestamo.cuotas
          const ultimoPago = prestamo.pagos?.length > 0 ? prestamo.pagos[0].fecha : null

          return {
            id: prestamo.id,
            cliente: `${prestamo.cliente?.nombre || ''} ${prestamo.cliente?.apellido || ''}`.trim() || 'Desconocido',
            documento: prestamo.cliente?.documento || '',
            telefono: prestamo.cliente?.telefono || '',
            direccion: prestamo.cliente?.direccionCobro || prestamo.cliente?.direccionCliente || '',
            monto: Number(prestamo.monto),
            interes: Number(prestamo.interes),
            tipoPago: prestamo.tipoPago,
            valorCuota: Number(prestamo.valorCuota),
            cuotas: prestamo.cuotas,
            fechaInicio: prestamo.fechaInicio,
            fechaFin: prestamo.fechaFin,
            totalPagado,
            cuotasPagadas,
            ultimoPago,
            fechaCompletado: prestamo.updatedAt
          }
        }),

        prestamosEnMoraLista: prestamosEnMoraListaReales.map(prestamo => {
          const totalPagado = prestamo.pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0
          const saldoPendiente = Number(prestamo.monto) - totalPagado
          const cuotasPagadas = Math.floor(totalPagado / Number(prestamo.valorCuota || 1))
          const porcentajePagado = (totalPagado / Number(prestamo.monto || 1) * 100).toFixed(1)
          const ultimoPago = prestamo.pagos?.length > 0 ? prestamo.pagos[0].fecha : null
          const diasVencido = getDiasMoraSinDomingos(prestamo.fechaFin, new Date(), prestamo.tipoPago)

          return {
            id: prestamo.id,
            cliente: `${prestamo.cliente?.nombre || ''} ${prestamo.cliente?.apellido || ''}`.trim() || 'Desconocido',
            documento: prestamo.cliente?.documento || '',
            telefono: prestamo.cliente?.telefono || '',
            direccion: prestamo.cliente?.direccionCobro || prestamo.cliente?.direccionCliente || '',
            monto: Number(prestamo.monto),
            interes: Number(prestamo.interes),
            tipoPago: prestamo.tipoPago,
            valorCuota: Number(prestamo.valorCuota),
            cuotas: prestamo.cuotas,
            fechaInicio: prestamo.fechaInicio,
            fechaFin: prestamo.fechaFin,
            totalPagado,
            saldoPendiente,
            cuotasPagadas,
            porcentajePagado,
            ultimoPago,
            diasVencido,
            cuotasVencidas: prestamo.cuotas - cuotasPagadas
          }
        })
      }
    }

    return NextResponse.json(informe)

  } catch (error) {
    console.error("Error al generar informe de clientes:", error)
    return NextResponse.json(
      { error: "Error al generar informe de clientes" },
      { status: 500 }
    )
  }
}
