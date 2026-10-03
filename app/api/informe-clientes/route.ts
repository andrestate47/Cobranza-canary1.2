
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getEcuadorDayRange, getDiasMoraSinDomingos } from "@/lib/date-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission('VER_INFORME_CLIENTES')

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

    // Obtener rango del día según la zona horaria de Ecuador
    const { inicio: fechaInicio, fin: fechaFin } = getEcuadorDayRange(fecha)

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
            lt: fechaFin
          },
          cliente: routeFilter
        }
      }),
      // 3. CLIENTES VISITADOS HOY (tienen registros en visitas_cliente O han realizado un pago hoy)
      prisma.cliente.findMany({
        where: {
          activo: true,
          ...routeFilter,
          OR: [
            {
              visitas: {
                some: {
                  fecha: {
                    gte: fechaInicio,
                    lte: fechaFin
                  }
                }
              }
            },
            {
              prestamos: {
                some: {
                  pagos: {
                    some: {
                      fecha: {
                        gte: fechaInicio,
                        lte: fechaFin
                      }
                    }
                  }
                }
              }
            }
          ]
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
            where: {
              OR: [
                { estado: 'ACTIVO' },
                { estado: 'VENCIDO' }
              ]
            },
            include: {
              pagos: {
                select: {
                  monto: true,
                  devolucionSeguro: true,
                  fecha: true,
                  usuario: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      // 4. CLIENTES NO VISITADOS HOY (con préstamos activos o vencidos con saldo pendiente y sin visitas ni pagos hoy)
      prisma.cliente.findMany({
        where: {
          activo: true,
          ...routeFilter,
          prestamos: {
            some: {
              OR: [
                { estado: 'ACTIVO' },
                { estado: 'VENCIDO' }
              ]
            }
          },
          NOT: {
            OR: [
              {
                visitas: {
                  some: {
                    fecha: {
                      gte: fechaInicio,
                      lte: fechaFin
                    }
                  }
                }
              },
              {
                prestamos: {
                  some: {
                    pagos: {
                      some: {
                        fecha: {
                          gte: fechaInicio,
                          lte: fechaFin
                        }
                      }
                    }
                  }
                }
              }
            ]
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
              OR: [
                { estado: 'ACTIVO' },
                { estado: 'VENCIDO' }
              ]
            },
            include: {
              pagos: {
                select: {
                  monto: true,
                  devolucionSeguro: true,
                  fecha: true
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
            lt: fechaFin
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
      if (prestamo.estado === 'CANCELADO' || prestamo.estado === 'RENOVADO') return false
      const montoTotal = Math.round((Number(prestamo.monto || 0) * (1 + Number(prestamo.interes || 0) / 100)) * 100) / 100
      const pagado = Math.round(((prestamo.pagos || []).reduce((sum: any, pago: any) => sum + Number(pago.monto || 0) + Number(pago.devolucionSeguro || 0), 0)) * 100) / 100
      return (montoTotal - pagado) > 0.01
    }

    // Calcular totales de cobros
    const totalCobrado = cobrosHoy.reduce((sum, pago) => sum + Number(pago.monto), 0)

    const prestamosVencidosReales = prestamosVencidos.filter(hasSaldoPendiente)
    const prestamosEnMoraListaReales = prestamosEnMoraLista.filter(hasSaldoPendiente)
    const clientesConMoraReales = clientesConMora.map(cliente => ({
      ...cliente,
      prestamos: cliente.prestamos.filter(hasSaldoPendiente)
    })).filter(c => c.prestamos.length > 0)

    // Filtrar clientes no visitados para que solo incluyan aquellos que tienen préstamos con saldo pendiente real
    const clientesNoVisitadosReales = clientesNoVisitados.filter(c => 
      c.prestamos.some(p => hasSaldoPendiente(p))
    )

    // Construir respuesta
    const informe = {
      fecha,
      resumen: {
        totalClientes,
        totalPrestamos: prestamosData._count.id,
        clientesVisitadosHoy: clientesVisitados.length,
        clientesNoVisitadosHoy: clientesNoVisitadosReales.length,
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
          const totalPrestado = cliente.prestamos.reduce((sum, p) => sum + Number(p.monto) * (1 + Number(p.interes) / 100), 0)
          const totalPagado = cliente.prestamos.reduce((sum, p) =>
            sum + p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto) + Number(pago.devolucionSeguro || 0), 0), 0
          )
          const saldoPendiente = Math.max(0, totalPrestado - totalPagado)
          const prestamosVencidos = cliente.prestamos.filter(p => new Date(p.fechaFin) < new Date() && hasSaldoPendiente(p))

          // Extraer información de la visita o del último abono registrado
          let ultimaVisitaFecha = cliente.visitas[0]?.fecha || null
          let visitadoPorNombre = cliente.visitas[0]?.usuario ?
            `${cliente.visitas[0].usuario.firstName} ${cliente.visitas[0].usuario.lastName}` : null
          let tipoVisitaNombre = cliente.visitas[0]?.tipo || null
          let observacionesTexto = cliente.visitas[0]?.observaciones || null

          const todosLosPagos = cliente.prestamos.flatMap(p => p.pagos)
          if (!ultimaVisitaFecha && todosLosPagos.length > 0) {
            const pagosOrdenados = [...todosLosPagos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            const ultimoPago = pagosOrdenados[0]
            if (ultimoPago) {
              ultimaVisitaFecha = ultimoPago.fecha
              if ((ultimoPago as any).usuario) {
                visitadoPorNombre = `${(ultimoPago as any).usuario.firstName} ${(ultimoPago as any).usuario.lastName}`
              }
              tipoVisitaNombre = 'COBRO'
              observacionesTexto = 'Abono registrado'
            }
          }

          return {
            id: cliente.id,
            nombre: `${cliente.nombre} ${cliente.apellido}`,
            documento: cliente.documento,
            telefono: cliente.telefono,
            direccion: cliente.direccionCobro || cliente.direccionCliente,
            ultimaVisita: ultimaVisitaFecha,
            visitadoPor: visitadoPorNombre,
            tipoVisita: tipoVisitaNombre,
            observaciones: observacionesTexto,
            prestamosActivos: cliente.prestamos.filter(hasSaldoPendiente).length,
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

        clientesNoVisitados: clientesNoVisitadosReales.map(cliente => {
          const totalPrestado = cliente.prestamos.reduce((sum, p) => sum + Number(p.monto) * (1 + Number(p.interes) / 100), 0)
          const totalPagado = cliente.prestamos.reduce((sum, p) =>
            sum + p.pagos.reduce((pSum, pago) => pSum + Number(pago.monto) + Number(pago.devolucionSeguro || 0), 0), 0
          )
          const saldoPendiente = Math.max(0, totalPrestado - totalPagado)
          const prestamosVencidos = cliente.prestamos.filter(p => new Date(p.fechaFin) < new Date() && hasSaldoPendiente(p))

          let ultimaVisitaFecha = cliente.visitas[0]?.fecha || null
          const todosLosPagos = cliente.prestamos.flatMap(p => p.pagos)
          if (todosLosPagos.length > 0) {
            const ultimoPagoFecha = [...todosLosPagos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]?.fecha
            if (ultimoPagoFecha && (!ultimaVisitaFecha || new Date(ultimoPagoFecha) > new Date(ultimaVisitaFecha))) {
              ultimaVisitaFecha = ultimoPagoFecha
            }
          }

          const diasSinVisita = ultimaVisitaFecha ?
            Math.ceil((new Date().getTime() - new Date(ultimaVisitaFecha).getTime()) / (1000 * 60 * 60 * 24)) : null

          return {
            id: cliente.id,
            nombre: `${cliente.nombre} ${cliente.apellido}`,
            documento: cliente.documento,
            telefono: cliente.telefono,
            direccion: cliente.direccionCobro || cliente.direccionCliente,
            prestamosActivos: cliente.prestamos.filter(hasSaldoPendiente).length,
            montoTotal: totalPrestado,
            totalPrestado,
            totalPagado,
            saldoPendiente,
            prestamosVencidos: prestamosVencidos.length,
            ultimaVisita: ultimaVisitaFecha,
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

  } catch (error: any) {
    console.error("Error al generar informe de clientes:", error)
    if (error?.message?.includes("permiso") || error?.message?.includes("autenticado") || error?.message?.includes("desactivado")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Error al generar informe de clientes" },
      { status: 500 }
    )
  }
}
