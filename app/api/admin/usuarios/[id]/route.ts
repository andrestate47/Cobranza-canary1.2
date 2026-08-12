import { NextRequest, NextResponse } from "next/server"
import { requireUserManagementPermission } from "@/lib/permissions"
import { prisma } from "@/lib/db"
import { Permission } from "@prisma/client"
import bcryptjs from "bcryptjs"
import { uploadFile, deleteFile } from "@/lib/s3"

export const dynamic = "force-dynamic"

// GET - Obtener usuario específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireUserManagementPermission()

    const usuario = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        permissions: true,
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true
          }
        },
        supervisados: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true
          }
        },
        timeUsage: {
          orderBy: {
            date: 'desc'
          },
          take: 30 // Últimos 30 días
        }
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: usuario.id,
      email: usuario.email,
      firstName: usuario.firstName,
      lastName: usuario.lastName,
      name: usuario.name,
      role: usuario.role,
      isActive: usuario.isActive,
      timeLimit: usuario.timeLimit,
      lastLogin: usuario.lastLogin,
      createdAt: usuario.createdAt,
      supervisor: usuario.supervisor,
      supervisados: usuario.supervisados,
      documentoIdentificacion: usuario.documentoIdentificacion,
      profilePhoto: usuario.profilePhoto,
      phone: usuario.phone,
      phoneReferencial: usuario.phoneReferencial,
      address: usuario.address,
      pais: usuario.pais,
      ciudad: usuario.ciudad,
      ubicacion: usuario.ubicacion,
      mapLink: usuario.mapLink,
      referenciaFamiliar: usuario.referenciaFamiliar,
      referenciaTrabajo: usuario.referenciaTrabajo,
      permissions: usuario.permissions.map(p => p.permission),
      timeUsage: usuario.timeUsage
    })

  } catch (error: unknown) {
    console.error("Error fetching user:", error)
    const msg = error instanceof Error ? error.message : "Error interno del servidor"
    return NextResponse.json(
      { error: msg },
      { status: msg.includes('autorizado') || msg.includes('permiso') ? 403 : 500 }
    )
  }
}

// PUT - Actualizar usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireUserManagementPermission()

    const contentType = request.headers.get('content-type') || ''
    let body: any
    let documentoFile: File | null = null

    // Manejar FormData o JSON
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())
      
      // Extraer archivos si existen
      documentoFile = formData.get('documentoFile') as File | null
      const profilePhotoFile = formData.get('profilePhotoFile') as File | null
      body.profilePhotoFile = profilePhotoFile
      
      // Parsear permisos si viene como string
      if (typeof body.permissions === 'string') {
        try {
          body.permissions = JSON.parse(body.permissions)
        } catch {
          body.permissions = []
        }
      }
      
      // Convertir valores booleanos y numéricos de strings
      if (body.isActive !== undefined) {
        body.isActive = body.isActive === 'true' || body.isActive === true
      }
      if (body.timeLimit) {
        const parsed = parseInt(body.timeLimit)
        body.timeLimit = isNaN(parsed) || body.timeLimit === '' ? null : parsed
      }
    } else {
      body = await request.json()
    }

    const {
      email,
      password,
      firstName,
      lastName,
      name,
      role,
      isActive,
      timeLimit,
      supervisorId,
      phone,
      phoneReferencial,
      address,
      pais,
      ciudad,
      ubicacion,
      mapLink,
      referenciaFamiliar,
      referenciaTrabajo,
      permissions
    } = body

    // Verificar si el usuario existe
    const usuarioExistente = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Validaciones si se envía email o role
    if (email && email !== usuarioExistente.email) {
      const emailExistente = await prisma.user.findUnique({
        where: { email }
      })

      if (emailExistente) {
        return NextResponse.json(
          { error: "Ya existe un usuario con este email" },
          { status: 400 }
        )
      }
    }

    if (role && !['ADMINISTRADOR', 'SUPERVISOR', 'COBRADOR'].includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      )
    }

    // Subir archivo del documento si existe
    let documentoUrl = usuarioExistente.documentoIdentificacion
    if (documentoFile && documentoFile.size > 0) {
      if (usuarioExistente.documentoIdentificacion) {
        try {
          await deleteFile(usuarioExistente.documentoIdentificacion)
        } catch (error) {
          console.error("Error deleting old document:", error)
        }
      }
      
      const buffer = Buffer.from(await documentoFile.arrayBuffer())
      const mimeType = documentoFile.type || 'application/octet-stream'
      documentoUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
    }

    let profilePhotoUrl = usuarioExistente.profilePhoto
    const profilePhotoFile = body.profilePhotoFile as File | null
    if (profilePhotoFile && profilePhotoFile.size > 0) {
      const buffer = Buffer.from(await profilePhotoFile.arrayBuffer())
      const mimeType = profilePhotoFile.type || 'application/octet-stream'
      profilePhotoUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
    }

    // Preparar objeto de actualización solo con los campos proporcionados
    const updateData: any = {}

    if (email !== undefined) updateData.email = email.trim()
    if (firstName !== undefined) updateData.firstName = firstName?.trim() || null
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || null
    
    if (name !== undefined) {
      updateData.name = name?.trim() || null
    } else if (firstName !== undefined || lastName !== undefined) {
      const fName = firstName !== undefined ? firstName?.trim() : usuarioExistente.firstName
      const lName = lastName !== undefined ? lastName?.trim() : usuarioExistente.lastName
      updateData.name = `${fName || ''} ${lName || ''}`.trim() || null
    }

    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = typeof isActive === 'boolean' ? isActive : isActive === 'true'
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit && !isNaN(Number(timeLimit)) ? Number(timeLimit) : null
    if (supervisorId !== undefined) updateData.supervisorId = supervisorId?.trim() || null
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (phoneReferencial !== undefined) updateData.phoneReferencial = phoneReferencial?.trim() || null
    if (address !== undefined) updateData.address = address?.trim() || null
    if (pais !== undefined) updateData.pais = pais?.trim() || null
    if (ciudad !== undefined) updateData.ciudad = ciudad?.trim() || null
    if (ubicacion !== undefined) updateData.ubicacion = ubicacion?.trim() || null
    if (mapLink !== undefined) updateData.mapLink = mapLink?.trim() || null
    if (referenciaFamiliar !== undefined) updateData.referenciaFamiliar = referenciaFamiliar?.trim() || null
    if (referenciaTrabajo !== undefined) updateData.referenciaTrabajo = referenciaTrabajo?.trim() || null
    if (documentoFile && documentoFile.size > 0) updateData.documentoIdentificacion = documentoUrl
    if (profilePhotoFile && profilePhotoFile.size > 0) updateData.profilePhoto = profilePhotoUrl

    if (password) {
      updateData.password = await bcryptjs.hash(password, 12)
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: params.id },
        data: updateData
      })
    }

    // Actualizar permisos si se especificaron
    if (permissions !== undefined) {
      await prisma.userPermission.deleteMany({
        where: { userId: params.id }
      })

      if (Array.isArray(permissions) && permissions.length > 0) {
        await prisma.userPermission.createMany({
          data: permissions.map((permission: string) => ({
            userId: params.id,
            permission: permission as Permission
          })),
          skipDuplicates: true
        })
      }
    }

    // Obtener usuario actualizado
    const usuarioActualizado = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        permissions: true,
        supervisor: true
      }
    })

    return NextResponse.json({
      id: usuarioActualizado!.id,
      email: usuarioActualizado!.email,
      firstName: usuarioActualizado!.firstName,
      lastName: usuarioActualizado!.lastName,
      name: usuarioActualizado!.name,
      role: usuarioActualizado!.role,
      isActive: usuarioActualizado!.isActive,
      timeLimit: usuarioActualizado!.timeLimit,
      supervisor: usuarioActualizado!.supervisor,
      documentoIdentificacion: usuarioActualizado!.documentoIdentificacion,
      profilePhoto: usuarioActualizado!.profilePhoto,
      permissions: usuarioActualizado!.permissions.map(p => p.permission)
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno del servidor"
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: msg },
      { status: msg.includes('autorizado') ? 401 : 500 }
    )
  }
}

// DELETE - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireUserManagementPermission()

    const usuario = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            prestamos: true,
            pagos: true,
            gastos: true,
            pagosSueldoCobrador: true,
            pagosSueldoPagador: true,
          }
        }
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Verificar si el usuario tiene registros asociados
    const tieneRegistros = usuario._count.prestamos > 0 || 
                          usuario._count.pagos > 0 || 
                          usuario._count.gastos > 0 ||
                          usuario._count.pagosSueldoCobrador > 0 ||
                          usuario._count.pagosSueldoPagador > 0

    if (tieneRegistros) {
      const detalles = []
      if (usuario._count.prestamos > 0) detalles.push(`${usuario._count.prestamos} préstamo(s)`)
      if (usuario._count.pagos > 0) detalles.push(`${usuario._count.pagos} pago(s) de clientes`)
      if (usuario._count.gastos > 0) detalles.push(`${usuario._count.gastos} gasto(s)`)
      if (usuario._count.pagosSueldoCobrador > 0) detalles.push(`${usuario._count.pagosSueldoCobrador} pago(s) de sueldo`)
      if (usuario._count.pagosSueldoPagador > 0) detalles.push(`${usuario._count.pagosSueldoPagador} liquidación(es) emitidas`)

      return NextResponse.json(
        { error: `No se puede eliminar el usuario porque tiene registros asociados: ${detalles.join(', ')}. Eliminá esos registros primero o desactivá el usuario.` },
        { status: 400 }
      )
    }

    // Eliminar usuario (los permisos se eliminan automáticamente por CASCADE)
    await prisma.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno del servidor"
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: msg },
      { status: msg.includes('autorizado') ? 401 : 500 }
    )
  }
}

