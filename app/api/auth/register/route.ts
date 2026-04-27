import { NextRequest, NextResponse } from "next/server"
import { prisma, type PrismaTx } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { withRateLimit } from "@/lib/rate-limiter"
import { ensureDefaultCategories } from "@/lib/defaults"

const handler = withRateLimit('/api/auth/register')(async (req: NextRequest, ip: string) => {
  try {
    const { email, name, password } = await req.json()

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, nome e senha são obrigatórios" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Usuário com este email já existe" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.$transaction(async (tx: PrismaTx) => {
      const created = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
        },
      })
      await ensureDefaultCategories(created.id, tx)
      return created
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
})

export { handler as POST }
