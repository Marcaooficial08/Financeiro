/**
 * Envia email usando Resend (produção real).
 * Em desenvolvimento, usa console.log para evitar custos.
 *
 * Em produção (NODE_ENV=production), exige RESEND_API_KEY definida — caso
 * contrário lança erro explícito para evitar fluxo de reset de senha
 * silenciosamente quebrado.
 */
export async function sendResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Redefinição de Senha</h1>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>O link expira em 15 minutos.</p>
      </body>
    </html>
  `

  const isProduction = process.env.NODE_ENV === "production"

  // 🟡 Modo desenvolvimento: simula envio
  if (!isProduction) {
    console.log(`[DEV] Email para: ${email}`)
    console.log(`[DEV] Token: ${token}`)
    console.log(`[DEV] URL: ${resetUrl}`)
    return
  }

  // 🔴 Produção: RESEND_API_KEY é obrigatória.
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY não configurada em produção. Defina a variável de ambiente para habilitar reset de senha.",
    )
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "noreply@example.com",
      to: email,
      subject: "Redefinição de Senha",
      html,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Falha ao enviar email via Resend: ${response.status} ${detail}`)
  }
}

/**
 * Valida se o email é válido (formato básico)
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}
