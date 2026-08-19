import { NextRequest, NextResponse } from "next/server"
import { requireUserManagementPermission, ROLE_PERMISSIONS } from "@/lib/permissions"
import { prisma } from "@/lib/db"
import { Permission } from "@prisma/client"
import bcryptjs from "bcryptjs"
import { uploadFile } from "@/lib/s3"

export const dynamic = "force-dynamic"

// GET - Obtener todos los usuarios
export async function GET(request: NextRequest) {
  try {
    await requireUserManagementPermission()

    const usuarios = await prisma.user.findMany({
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
        _count: {
          select: {
            prestamos: true,
            pagos: true,
            gastos: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Formatear datos para frontend
    const usuariosFormateados = usuarios.map(usuario => {
      const effectivePermissions = usuario.permissions.length > 0
        ? usuario.permissions.map(p => p.permission)
        : (ROLE_PERMISSIONS[usuario.role] || [])

      return {
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
        permissions: effectivePermissions,
        stats: usuario._count
      }
    })

    return NextResponse.json(usuariosFormateados)
  } catch (error: unknown) {
    console.error("Error fetching users:", error)
    const msg = error instanceof Error ? error.message : "Error interno del servidor"
    return NextResponse.json(
      { error: msg },
      { status: msg.includes('autorizado') || msg.includes('permiso') || msg.includes('autenticado') ? 403 : 500 }
    )
  }
}

// POST - Crear nuevo usuario
export async function POST(request: NextRequest) {
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
      isActive = true,
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
      permissions = []
    } = body

    // Validaciones
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son obligatorios" },
        { status: 400 }
      )
    }

    if (!['ADMINISTRADOR', 'SUPERVISOR', 'COBRADOR'].includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      )
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este email" },
        { status: 400 }
      )
    }

    // Subir archivo del documento si existe
    let documentoUrl = null
    if (documentoFile && documentoFile.size > 0) {
      const buffer = Buffer.from(await documentoFile.arrayBuffer())
      const mimeType = documentoFile.type || 'application/octet-stream'
      documentoUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
    }

    let profilePhotoUrl = null
    const profilePhotoFile = body.profilePhotoFile as File | null
    if (profilePhotoFile && profilePhotoFile.size > 0) {
      const buffer = Buffer.from(await profilePhotoFile.arrayBuffer())
      const mimeType = profilePhotoFile.type || 'application/octet-stream'
      profilePhotoUrl = `data:${mimeType};base64,${buffer.toString('base64')}`
    }

    // Encriptar contraseña
    const hashedPassword = await bcryptjs.hash(password, 12)

    // Crear usuario con valores correctamente procesados
    const nuevoUsuario = await prisma.user.create({
      data: {
        email: email.trim(),
        password: hashedPassword,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        name: name?.trim() || `${firstName?.trim() || ''} ${lastName?.trim() || ''}`.trim() || null,
        role,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        timeLimit: timeLimit && !isNaN(Number(timeLimit)) ? Number(timeLimit) : null,
        supervisorId: supervisorId?.trim() || null,
        phone: phone?.trim() || null,
        phoneReferencial: phoneReferencial?.trim() || null,
        address: address?.trim() || null,
        pais: pais?.trim() || null,
        ciudad: ciudad?.trim() || null,
        ubicacion: ubicacion?.trim() || null,
        mapLink: mapLink?.trim() || null,
        referenciaFamiliar: referenciaFamiliar?.trim() || null,
        referenciaTrabajo: referenciaTrabajo?.trim() || null,
        documentoIdentificacion: documentoUrl,
        profilePhoto: profilePhotoUrl
      },
      include: {
        supervisor: true
      }
    })

    // Permisos a asignar: los indicados o por defecto del rol
    const effectivePermissions = (Array.isArray(permissions) && permissions.length > 0)
      ? permissions
      : (ROLE_PERMISSIONS[role] || [])

    if (effectivePermissions.length > 0) {
      await prisma.userPermission.createMany({
        data: effectivePermissions.map((permission: string) => ({
          userId: nuevoUsuario.id,
          permission: permission as Permission
        })),
        skipDuplicates: true
      })
    }

    // Obtener usuario con permisos
    const usuarioCompleto = await prisma.user.findUnique({
      where: { id: nuevoUsuario.id },
      include: {
        permissions: true,
        supervisor: true
      }
    })

    return NextResponse.json({
      id: usuarioCompleto!.id,
      email: usuarioCompleto!.email,
      firstName: usuarioCompleto!.firstName,
      lastName: usuarioCompleto!.lastName,
      name: usuarioCompleto!.name,
      role: usuarioCompleto!.role,
      isActive: usuarioCompleto!.isActive,
      timeLimit: usuarioCompleto!.timeLimit,
      supervisor: usuarioCompleto!.supervisor,
      documentoIdentificacion: usuarioCompleto!.documentoIdentificacion,
      profilePhoto: usuarioCompleto!.profilePhoto,
      permissions: usuarioCompleto!.permissions.map(p => p.permission)
    })

  } catch (error: unknown) {
    console.error("Error creating user:", error)
    const msg = error instanceof Error ? error.message : "Error interno del servidor"
    return NextResponse.json(
      { error: msg },
      { status: msg.includes('autorizado') || msg.includes('permiso') || msg.includes('autenticado') ? 403 : 500 }
    )
  }
}

