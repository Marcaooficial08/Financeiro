"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

const smallCaps = "uppercase tracking-[0.22em] text-[10px] font-medium";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

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
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (!result || result.error) {
        setError("Email ou senha inválidos. Tente novamente.");
        setIsLoading(false);
        return;
      }

      window.location.href = result.url ?? "/dashboard";
    } catch (err) {
      console.error("Erro no login:", err);
      setError("Ocorreu um erro inesperado. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* Painel editorial */}
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
              background:
                "radial-gradient(circle, #6366f1 0%, transparent 60%)",
            }}
            aria-hidden
          />
          <div
            className="absolute -right-16 bottom-10 h-[360px] w-[360px] rounded-full opacity-25 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #f59e0b 0%, transparent 60%)",
            }}
            aria-hidden
          />

          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <div>
              <p className={`${smallCaps} text-gray-400`}>Ledger · Financeiro</p>
              <h2 className="mt-6 max-w-md text-4xl font-semibold tracking-tight">
                Dossiês financeiros{" "}
                <span className="text-indigo-400">editoriais</span> para cada
                centavo.
              </h2>
              <p className="mt-4 max-w-md text-sm text-gray-400">
                Contas, transações e vale-benefícios com a mesma disciplina
                tipográfica. Sem pastel, sem ruído.
              </p>
            </div>

            <div className="grid max-w-md grid-cols-3 gap-6">
              <div>
                <p className={`${smallCaps} text-gray-500`}>Saldo</p>
                <p
                  className="mt-1 text-2xl font-semibold tabular-nums"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  R$ 12.480
                </p>
                <span
                  className="mt-2 inline-block h-px w-10"
                  style={{ background: "#818cf8" }}
                  aria-hidden
                />
              </div>
              <div>
                <p className={`${smallCaps} text-gray-500`}>Receitas</p>
                <p
                  className="mt-1 text-2xl font-semibold tabular-nums text-emerald-400"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  +4.120
                </p>
                <span
                  className="mt-2 inline-block h-px w-10"
                  style={{ background: "#10b981" }}
                  aria-hidden
                />
              </div>
              <div>
                <p className={`${smallCaps} text-gray-500`}>Despesas</p>
                <p
                  className="mt-1 text-2xl font-semibold tabular-nums text-rose-400"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  −1.930
                </p>
                <span
                  className="mt-2 inline-block h-px w-10"
                  style={{ background: "#f43f5e" }}
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
                Acesso · Credenciais
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Bem-vindo de volta
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Entre com sua conta para acessar o painel.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
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
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className={`${smallCaps} text-gray-500 dark:text-gray-400`}
                  >
                    Senha
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition disabled:opacity-50 dark:bg-white dark:text-gray-900"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? "Entrando…" : "Entrar"}
                  {!isLoading && <span aria-hidden>→</span>}
                </span>
              </button>
            </form>

            <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">
                Ainda não tem conta?{" "}
                <Link
                  href="/sign-up"
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Cadastrar
                </Link>
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
