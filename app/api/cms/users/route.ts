import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json(users)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { email, name, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  try {
    const user = await prisma.user.create({
      data: { email, name: name || null, role: (role as UserRole) || 'viewer', active: true },
    })
    return NextResponse.json(user)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { id, role, active } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role: role as UserRole }),
        ...(active !== undefined && { active }),
      },
    })
    return NextResponse.json(user)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
