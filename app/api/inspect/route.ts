import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const users = await prisma.user.findMany({
    where: { role: "COBRADOR" },
    select: { id: true, firstName: true, name: true }
  })
  const closures = await prisma.cierreDia.findMany({
    orderBy: { fecha: 'desc' },
    take: 10,
    include: { usuario: { select: { firstName: true, name: true } } }
  })
  return NextResponse.json({ users, closures })
}
