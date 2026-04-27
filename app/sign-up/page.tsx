"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

const smallCaps = "uppercase tracking-[0.22em] text-[10px] font-medium";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name || name.length < 2) {
      setError("O nome deve ter pelo menos 2 caracteres");
      return;
    }
    if (!email || !email.includes("@")) {
      setError("Digite um email válido");
      return;
    }
    if (!password || password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Falha no cadastro");
        setIsLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (!signInResult || signInResult.error) {
        setError(
          "Conta criada, mas falha no login automático. Faça login manualmente.",
        );
        setIsLoading(false);
        return;
      }

      setSuccess("Conta criada com sucesso! Redirecionando…");
      setTimeout(() => {
        window.location.href = signInResult.url ?? "/dashboard";
      }, 1200);
    } catch {
      setError("Ocorreu um erro inesperado");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* Painel editorial — oculto em mobile */}
        <aside className="relative hidden overflow-hidden bg-gray-950 lg:block">
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
            aria-hidden
          />
          <div
            className="absolute -left-24 top-1/3 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
            style={{
              background: "radial-gradient(circle, #10b981 0%, transparent 60%)",
            }}
            aria-hidden
          />
          <div
            className="absolute -right-16 bottom-10 h-[360px] w-[360px] rounded-full opacity-25 blur-3xl"
            style={{
              background: "radial-gradient(circle, #6366f1 0%, transparent 60%)",
            }}
            aria-hidden
          />

          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <div>
              <p className={`${smallCaps} text-gray-400`}>Ledger · Financeiro</p>
              <h2 className="mt-6 max-w-md text-4xl font-semibold tracking-tight">
                Controle total das suas{" "}
                <span className="text-emerald-400">finanças</span> em um só lugar.
              </h2>
              <p className="mt-4 max-w-md text-sm text-gray-400">
                Crie sua conta e comece a organizar contas, transações e
                vale-benefícios com clareza tipográfica.
              </p>
            </div>

            <div className="grid max-w-md grid-cols-3 gap-6">
              <div>
                <p className={`${smallCaps} text-gray-500`}>Contas</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  Corrente
                </p>
                <span
                  className="mt-2 inline-block h-px w-10"
                  style={{ background: "#818cf8" }}
                  aria-hidden
                />
              </div>
              <div>
                <p className={`${smallCaps} text-gray-500`}>Tickets</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-400">
                  Refeição
                </p>
                <span
                  className="mt-2 inline-block h-px w-10"
                  style={{ background: "#f59e0b" }}
                  aria-hidden
                />
              </div>
              <div>
                <p className={`${smallCaps} text-gray-500`}>Relatórios</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-400">
                  Dossiês
                </p>
                <span
                  className="mt-2 inline-block h-px w-10"
                  style={{ background: "#10b981" }}
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Formulário */}
        <main className="flex items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
                Cadastro · Nova conta
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Criar conta
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Preencha os dados abaixo para começar.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
                >
                  Nome completo
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Marcos Andrade"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marcos@exemplo.com"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
                >
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-600"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                >
                  <span
                    className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-rose-500"
                    aria-hidden
                  />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <span
                    className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                    aria-hidden
                  />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition disabled:opacity-50 dark:bg-white dark:text-gray-900"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? "Criando conta…" : "Criar conta"}
                  {!isLoading && <span aria-hidden>→</span>}
                </span>
              </button>
            </form>

            <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">
                Já tem uma conta?{" "}
                <Link
                  href="/sign-in"
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Entrar
                </Link>
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
