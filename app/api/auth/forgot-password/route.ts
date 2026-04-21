import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createResetToken } from "@/lib/token"
import { sendResetEmail } from "@/lib/email"
import { withRateLimit } from "@/lib/rate-limiter"

const handler = withRateLimit('/api/auth/forgot-password')(async (req: NextRequest, ip: string) => {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { message: "Se o email estiver cadastrado, você receberá instruções de redefinição." },
        { status: 200 }
      )
    }

    const resetToken = createResetToken()

    await prisma.resetToken.upsert({
      where: { userId: user.id },
      update: {
        token: resetToken.token,
        expiresAt: resetToken.expiresAt,
        used: false,
      },
      create: {
        userId: user.id,
        token: resetToken.token,
        expiresAt: resetToken.expiresAt,
        used: false,
      },
    })

    await sendResetEmail(email, resetToken.token)

    return NextResponse.json(
      { message: "Instruções de redefinição enviadas para seu email." },
      { status: 200 }
    )
  } catch (error) {
    console.error("Erro ao solicitar redefinição:", error)
    return NextResponse.json(
      { error: "Ocorreu um erro ao processar sua solicitação. Tente novamente." },
      { status: 500 }
    )
  }
})

export { handler as POST }
