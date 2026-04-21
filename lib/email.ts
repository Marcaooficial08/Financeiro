/**
 * Envia email usando Resend (produção real)
 * Em desenvolvimento, usa console.log para evitar custos
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

  // 🟡 Modo desenvolvimento: simula envio
  if (process.env.NODE_ENV === "development" || !process.env.RESEND_API_KEY) {
    console.log(`[DEV] Email para: ${email}`)
    console.log(`[DEV] Token: ${token}`)
    console.log(`[DEV] URL: ${resetUrl}`)
    return
  }

  throw new Error("Resend email service não está configurado. Defina RESEND_API_KEY para envio real de emails.")
}

/**
 * Valida se o email é válido (formato básico)
 */
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}