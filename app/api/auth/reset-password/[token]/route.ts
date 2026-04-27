import { NextRequest, NextResponse } from "next/server"
import { prisma, type PrismaTx } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validateResetToken, isValidTokenFormat } from "@/lib/token"
import { withRateLimit } from "@/lib/rate-limiter"

const handler = withRateLimit('/api/auth/reset-password')(async (req: NextRequest, ip: string) => {
  try {
    const token = req.nextUrl.pathname.split('/').pop() || ""
    const { newPassword } = await req.json()

    if (!isValidTokenFormat(token)) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 400 }
      )
    }

    const resetTokenRecord = await prisma.resetToken.findUnique({
      where: { token },
    })

    if (!resetTokenRecord) {
      return NextResponse.json(
        { error: "Token inválido ou expirado" },
        { status: 400 }
      )
    }

    if (!validateResetToken(resetTokenRecord)) {
      return NextResponse.json(
        { error: "Token expirado ou já utilizado" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: resetTokenRecord.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 8 caracteres" },
        { status: 400 }
      )
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: "A senha deve conter letras maiúsculas, minúsculas e números" },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx: PrismaTx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: await bcrypt.hash(newPassword, 10),
        },
      })

      await tx.resetToken.update({
        where: { token },
        data: { used: true },
      })
    })

    return NextResponse.json(
      { message: "Senha redefinida com sucesso! Você pode fazer login agora." },
      { status: 200 }
    )
  } catch (error) {
    console.error("Erro ao redefinir senha:", error)
    return NextResponse.json(
      { error: "Ocorreu um erro ao redefinir a senha. Tente novamente." },
      { status: 500 }
    )
  }
})

export { handler as POST }
