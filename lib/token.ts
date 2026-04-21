import crypto from "crypto"

// 🔐 GERAÇÃO DE TOKEN SEGURO
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// ⏱️ TOKEN EXPIRÁVEL (15 minutos)
const TOKEN_EXPIRATION_MS = 15 * 60 * 1000

export interface ResetToken {
  token: string
  expiresAt: Date
  used: boolean
}

// 🗝️ CRIAÇÃO DO TOKEN COM EXPIRAÇÃO
export function createResetToken(): ResetToken {
  return {
    token: generateResetToken(),
    expiresAt: new Date(Date.now() + TOKEN_EXPIRATION_MS),
    used: false,
  }
}

// ✅ VALIDAÇÃO DO TOKEN
export function validateResetToken(tokenData: ResetToken): boolean {
  const now = new Date()

  // Verifica se expirou
  if (now > tokenData.expiresAt) {
    return false
  }

  // Verifica se já foi usado
  if (tokenData.used) {
    return false
  }

  return true
}

// 🗑️ INATIVAÇÃO DO TOKEN APÓS USO
export function invalidateResetToken(tokenData: ResetToken): void {
  tokenData.used = true
}

// 🔍 VALIDAÇÃO DO FORMATO DO TOKEN
export function isValidTokenFormat(token: string): boolean {
  return typeof token === "string" && token.length === 64
}