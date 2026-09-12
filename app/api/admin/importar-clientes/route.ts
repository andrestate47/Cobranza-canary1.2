import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any)?.role !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user?.email || '' }
    })

    if (!adminUser) {
      return NextResponse.json({ error: "Usuario administrador no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const { clientes } = body

    if (!Array.isArray(clientes) || clientes.length === 0) {
      return NextResponse.json({ error: "Se requiere un arreglo de clientes válido" }, { status: 400 })
    }

    console.log(`Iniciando importación masiva de ${clientes.length} clientes...`)
    let creados = 0
    let errores = 0

    for (const c of clientes) {
      try {
        if (!c.nombre || !c.documento) {
          errores++
          continue
        }

        const docLimpio = String(c.documento).trim()
        const nombreLimpio = String(c.nombre).trim()
        const apellidoLimpio = c.apellido ? String(c.apellido).trim() : "."
        const telefonoLimpio = c.telefono ? String(c.telefono).trim() : null
        const direccionLimpia = c.direccionCliente ? String(c.direccionCliente).trim() : "Sin dirección"

        const cliente = await prisma.cliente.upsert({
          where: { documento: docLimpio },
          update: {
            nombre: nombreLimpio,
            apellido: apellidoLimpio,
            telefono: telefonoLimpio,
            direccionCliente: direccionLimpia,
            numeroRuta: c.numeroRuta ? String(c.numeroRuta).trim() : null
          },
          create: {
            codigoCliente: c.codigoCliente || `CL${Math.floor(100 + Math.random() * 900)}${Date.now().toString().slice(-3)}`,
            documento: docLimpio,
            nombre: nombreLimpio,
            apellido: apellidoLimpio,
            telefono: telefonoLimpio,
            direccionCliente: direccionLimpia,
            numeroRuta: c.numeroRuta ? String(c.numeroRuta).trim() : null,
            activo: true
          }
        })

        if (c.valorPrestamo && parseFloat(c.valorPrestamo) > 0) {
          const monto = parseFloat(c.valorPrestamo)
          const cuotas = parseInt(c.cuotas) || 24
          const interes = parseFloat(c.interes) || 20
          const totalPagar = monto * (1 + interes / 100)
          const valorCuota = totalPagar / cuotas
          const fechaInicio = new Date()
          const fechaFin = new Date()
          fechaFin.setDate(fechaFin.getDate() + 30)

          await prisma.prestamo.create({
            data: {
              clienteId: cliente.id,
              userId: adminUser.id,
              monto: monto,
              interes: interes,
              cuotas: cuotas,
              valorCuota: valorCuota,
              tipoPago: 'DIARIO',
              estado: 'ACTIVO',
              fechaInicio: fechaInicio,
              fechaFin: fechaFin
            }
          })
        }

        creados++
      } catch (err) {
        console.error(`Error importando cliente ${c.documento}:`, err)
        errores++
      }
    }

    return NextResponse.json({
      exito: true,
      mensaje: `Importación completada: ${creados} registros procesados correctamente, ${errores} errores.`,
      creados,
      errores
    })

  } catch (error: any) {
    console.error("Error en importación masiva:", error)
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 })
  }
}
