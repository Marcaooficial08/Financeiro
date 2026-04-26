import { NextRequest, NextResponse } from "next/server"

// 🛡️ CONFIGURAÇÕES DE RATE LIMITING
interface RateLimitConfig {
  windowMs: number    // Janela de tempo em milissegundos
  max: number         // Máximo de requisições permitidas
  message: string     // Mensagem para usuário
}

// Configurações por endpoint
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // NextAuth credentials provider — endpoint real chamado no submit do login.
  '/api/auth/callback/credentials': {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,                    // Máximo 5 tentativas
    message: "Muitas tentativas de login. Tente novamente em 15 minutos."
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000,  // 1 hora
    max: 3,                    // Máximo 3 registros
    message: "Muitas tentativas de cadastro. Tente novamente em 1 hora."
  },
  '/api/auth/forgot-password': {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3,                    // Máximo 3 solicitações
    message: "Muitas solicitações. Tente novamente em 15 minutos."
  }
}

/**
 * Extrai IP do request (x-forwarded-for / x-real-ip).
 */
export function getClientIp(headers: { get(name: string): string | null }): string {
  const forwardedFor = headers.get("x-forwarded-for")
  const realIp = headers.get("x-real-ip")
  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown"
}

// 🗃️ ARMAZENAMENTO EM MEMÓRIA (em produção: Redis ou banco)
const requestStore = new Map<string, { count: number; startTime: number; windowStart: number }>()

/**
 * Verifica se requisição excede rate limit
 * @param ip Endereço IP do cliente
 * @param path Caminho da requisição
 * @returns { ok: true } ou { ok: false, message: string }
 */
export function checkRateLimit(ip: string, path: string) {
  const config = RATE_LIMIT_CONFIGS[path]
  if (!config) return { ok: true }

  const now = Date.now()
  const windowStart = Math.floor(now / config.windowMs) * config.windowMs
  const key = `${ip}:${path}`

  const record = requestStore.get(key)

  if (!record || record.windowStart !== windowStart) {
    // Nova janela ou primeiro pedido
    requestStore.set(key, {
      count: 1,
      startTime: now,
      windowStart
    })
    return { ok: true }
  }

  if (record.count >= config.max) {
    const elapsed = Math.floor((now - record.startTime) / 1000)
    const remaining = Math.ceil((config.windowMs - elapsed) / 1000)
    return {
      ok: false,
      message: config.message,
      retryAfter: remaining
    }
  }

  // Incrementa contador
  record.count++
  requestStore.set(key, record)
  return { ok: true }
}

/**
 * Middleware para aplicar rate limiting
 */
export function withRateLimit(path: string) {
  return function (handler: (req: NextRequest, ip: string) => Promise<NextResponse>) {
    return async (req: NextRequest) => {
      const ip = getClientIp(req.headers)

      const { ok, message, retryAfter } = checkRateLimit(ip, path)

      if (!ok) {
        return NextResponse.json(
          {
            error: message,
            ...(retryAfter && { retryAfter })
          },
          { status: 429 }
        )
      }

      return handler(req, ip)
    }
  }
}

/**
 * Limpa armazenamento (útil para testes)
 */
export function clearRateLimitStore() {
  requestStore.clear()
}