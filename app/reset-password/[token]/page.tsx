"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const resetSchema = z.object({
  newPassword: z.string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
})

type ResetFormValues = z.infer<typeof resetSchema>

export default function ResetTokenPage({ params }: { params: { token: string } }) {
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetFormValues) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/auth/reset-password/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || "Falha ao redefinir senha")
      } else {
        setSuccess(true)
        setTimeout(() => {
          window.location.href = "/sign-in"
        }, 2500)
      }
    } catch (error) {
      console.error(error)
      setError("Ocorreu um erro inesperado")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg">
        {success ? (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Senha redefinida!</h1>
            <p className="mt-3 text-gray-600 dark:text-gray-300">
              Sua senha foi atualizada com sucesso. Redirecionando para login...
            </p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Redefinir Senha</h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Informe a nova senha para finalizar a redefinição.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  {...register("newPassword")}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="Digite sua nova senha"
                />
                {errors.newPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.newPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Redefinindo..." : "Redefinir Senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
