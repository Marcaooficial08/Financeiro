"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  createTransaction,
  updateTransaction,
  getTransactions,
  deleteTransaction,
} from "./actions";
import { Transaction, Account, Category, AccountType } from "@prisma/client";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const smallCaps = "uppercase tracking-[0.22em] text-[10px] font-medium";
const numeral = "font-semibold tracking-tight tabular-nums";
const tabularStyle = { fontVariantNumeric: "tabular-nums" as const };

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-600";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200";

const ghostBtn =
  "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

type GroupKey = "regular" | "meal" | "fuel" | "award";

const groupMeta: Record<
  GroupKey,
  { label: string; accent: string; dot: string }
> = {
  regular: { label: "Contas normais", accent: "#6366f1", dot: "bg-indigo-500" },
  meal: { label: "Ticket Refeição", accent: "#f59e0b", dot: "bg-amber-500" },
  fuel: { label: "Ticket Combustível", accent: "#e11d48", dot: "bg-rose-500" },
  award: { label: "Ticket Premiação", accent: "#8b5cf6", dot: "bg-violet-500" },
};

function groupOf(type: AccountType): GroupKey {
  if (type === "TICKET_MEAL") return "meal";
  if (type === "TICKET_FUEL") return "fuel";
  if (type === "TICKET_AWARD") return "award";
  return "regular";
}

const emptyForm = () => ({
  amount: "",
  type: "EXPENSE" as "INCOME" | "EXPENSE",
  description: "",
  accountId: "",
  categoryId: "",
  date: new Date().toISOString().split("T")[0],
});

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<
    (Transaction & { account: Account; category: Category })[]
  >([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transactionsResult, accountsResult, categoriesResult] =
        await Promise.all([getTransactions(), getAccounts(), getCategories()]);

      if (transactionsResult.success) {
        setTransactions(transactionsResult.data || []);
      }
      if (accountsResult.success) {
        setAccounts(accountsResult.data || []);
      }
      if (categoriesResult.success) {
        setCategories(categoriesResult.data || []);
      }

      if (
        !transactionsResult.success ||
        !accountsResult.success ||
        !categoriesResult.success
      ) {
        setMessage({ type: "error", text: "Erro ao carregar dados" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao carregar dados" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm());
    setEditingId(null);
  };

  const startEdit = (
    tx: Transaction & { account: Account; category: Category },
  ) => {
    const amountStr = Number(tx.amount).toFixed(2).replace(".", ",");
    setFormData({
      amount: amountStr,
      type: tx.type as "INCOME" | "EXPENSE",
      description: tx.description ?? "",
      accountId: tx.accountId,
      categoryId: tx.categoryId,
      date: new Date(tx.date).toISOString().split("T")[0],
    });
    setEditingId(tx.id);
    setShowForm(true);
    setMessage(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const data = new FormData();
    data.append("amount", formData.amount);
    data.append("type", formData.type);
    data.append("description", formData.description);
    data.append("accountId", formData.accountId);
    data.append("categoryId", formData.categoryId);
    data.append("date", formData.date);

    try {
      const result = editingId
        ? await updateTransaction(editingId, data)
        : await createTransaction(data);

      if (result.success) {
        setMessage({
          type: "success",
          text:
            result.message ||
            (editingId
              ? "Transação atualizada com sucesso!"
              : "Transação criada com sucesso!"),
        });
        resetForm();
        setShowForm(false);
        await loadData();
      } else {
        setMessage({
          type: "error",
          text:
            result.error ||
            (editingId ? "Erro ao atualizar transação" : "Erro ao criar transação"),
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: editingId
          ? "Erro ao atualizar transação"
          : "Erro ao criar transação",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    if (editingId === transactionId) {
      resetForm();
      setShowForm(false);
    }

    try {
      const result = await deleteTransaction(transactionId);
      if (result.success) {
        setMessage({
          type: "success",
          text: "Transação excluída com sucesso!",
        });
        await loadData();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao excluir transação",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir transação" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
          Carregando…
        </div>
      </div>
    );
  }

  const groupTotals: Record<
    GroupKey,
    { income: number; expense: number; count: number }
  > = {
    regular: { income: 0, expense: 0, count: 0 },
    meal: { income: 0, expense: 0, count: 0 },
    fuel: { income: 0, expense: 0, count: 0 },
    award: { income: 0, expense: 0, count: 0 },
  };

  for (const t of transactions) {
    const key = groupOf(t.account.type);
    const amount = Number(t.amount);
    if (t.type === "INCOME") groupTotals[key].income += amount;
    else groupTotals[key].expense += amount;
    groupTotals[key].count += 1;
  }

  const sortedAccounts = [...accounts].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`${smallCaps} text-gray-400`}>02 · Movimentações</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Transações
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Registros consolidados com conta e categoria.
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
              setShowForm(false);
            } else {
              setShowForm(true);
            }
          }}
          className={primaryBtn}
        >
          {showForm ? "Cancelar" : "+ Nova transação"}
        </button>
      </header>

      {/* Cards segmentados por tipo de conta */}
      <section className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(groupMeta) as GroupKey[]).map((key) => {
          const meta = groupMeta[key];
          const totals = groupTotals[key];
          const net = totals.income - totals.expense;
          return (
            <div
              key={key}
              className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <span
                className="absolute inset-y-0 left-0 w-1"
                style={{ background: meta.accent }}
                aria-hidden
              />
              <div className="mb-4 flex items-center justify-between pl-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${meta.dot}`}
                    aria-hidden
                  />
                  <div>
                    <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
                      Resumo
                    </p>
                    <h3 className="mt-0.5 text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                      {meta.label}
                    </h3>
                  </div>
                </div>
                <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[10px] font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {totals.count} mov.
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pl-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                  <p
                    className={`${smallCaps} text-gray-500 dark:text-gray-400`}
                  >
                    Receitas
                  </p>
                  <p
                    className={`mt-1.5 text-base text-emerald-600 dark:text-emerald-400 ${numeral}`}
                    style={tabularStyle}
                  >
                    {brl(totals.income)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                  <p
                    className={`${smallCaps} text-gray-500 dark:text-gray-400`}
                  >
                    Despesas
                  </p>
                  <p
                    className={`mt-1.5 text-base text-rose-600 dark:text-rose-400 ${numeral}`}
                    style={tabularStyle}
                  >
                    {brl(totals.expense)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                  <p
                    className={`${smallCaps} text-gray-500 dark:text-gray-400`}
                  >
                    Líquido
                  </p>
                  <p
                    className={`mt-1.5 text-base ${numeral} ${
                      net >= 0
                        ? "text-gray-900 dark:text-white"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                    style={tabularStyle}
                  >
                    {brl(net)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {message && (
        <div
          role="alert"
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          <span
            className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
              message.type === "success" ? "bg-emerald-500" : "bg-rose-500"
            }`}
            aria-hidden
          />
          <span>{message.text}</span>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <p className={`${smallCaps} text-gray-400`}>
                {editingId ? "Editar registro" : "Novo registro"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingId ? "Atualizar transação" : "Criar transação"}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Cancelar edição
              </button>
            )}
          </div>

          {/* Type toggle como pílulas */}
          <div className="mb-5">
            <p className={`${smallCaps} mb-2 text-gray-500 dark:text-gray-400`}>
              Tipo
            </p>
            <div
              role="tablist"
              className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950"
            >
              {(
                [
                  { v: "EXPENSE", label: "Despesa", color: "#ef4444" },
                  { v: "INCOME", label: "Receita", color: "#10b981" },
                ] as const
              ).map((opt) => {
                const active = formData.type === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        type: opt.v,
                        categoryId: "",
                      })
                    }
                    className={`relative px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "rounded-lg bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: opt.color }}
                        aria-hidden
                      />
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="amount"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Valor
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="amount"
                list="amount-suggestions"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="Ex: 50,00"
                className={inputCls}
                required
              />
              <datalist id="amount-suggestions">
                <option value="10,00" />
                <option value="25,00" />
                <option value="50,00" />
                <option value="100,00" />
                <option value="200,00" />
                <option value="500,00" />
                <option value="1000,00" />
              </datalist>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Aceita vírgula ou ponto. Clique para ver sugestões.
              </p>
            </div>

            <div>
              <label
                htmlFor="date"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Data
              </label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="description"
              className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
            >
              Descrição{" "}
              <span className="ml-1 text-[9px] text-gray-400 normal-case tracking-normal">
                (opcional)
              </span>
            </label>
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={inputCls}
            />
          </div>

          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="accountId"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Conta
              </label>
              <select
                id="accountId"
                value={formData.accountId}
                onChange={(e) =>
                  setFormData({ ...formData, accountId: e.target.value })
                }
                className={inputCls}
                required
              >
                <option value="">Selecione uma conta</option>
                {sortedAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="categoryId"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Categoria
              </label>
              {(() => {
                const filtered = categories
                  .filter((category) => category.type === formData.type)
                  .sort((a, b) =>
                    a.name.localeCompare(b.name, "pt-BR", {
                      sensitivity: "base",
                    }),
                  );
                const typeLbl =
                  formData.type === "INCOME" ? "receita" : "despesa";
                if (filtered.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                      Nenhuma categoria de {typeLbl}.{" "}
                      <Link
                        href="/categories"
                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                      >
                        Criar categoria →
                      </Link>
                    </div>
                  );
                }
                return (
                  <select
                    id="categoryId"
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className={inputCls}
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {filtered.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={primaryBtn + " w-full"}
          >
            {isSubmitting
              ? editingId
                ? "Atualizando…"
                : "Criando…"
              : editingId
                ? "Salvar alterações"
                : "Registrar transação"}
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-baseline justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <p className={`${smallCaps} text-gray-400`}>Suas transações</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {transactions.length}{" "}
              {transactions.length === 1 ? "registro" : "registros"}
            </h2>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className={`${smallCaps} text-gray-400`}>Vazio</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Nenhuma transação registrada. Crie a primeira acima.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[...transactions]
              .sort((a, b) =>
                (a.description ?? "").localeCompare(
                  b.description ?? "",
                  "pt-BR",
                  { sensitivity: "base" },
                ),
              )
              .map((transaction) => {
                const isIncome = transaction.type === "INCOME";
                const accent = isIncome ? "#10b981" : "#ef4444";
                const isEditing = editingId === transaction.id;
                return (
                  <div
                    key={transaction.id}
                    className={`group relative flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40 ${
                      isEditing
                        ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                        : ""
                    }`}
                  >
                    <div
                      className="absolute inset-y-2 left-0 w-[3px] rounded-r-full opacity-70"
                      style={{ background: accent }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 pl-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl" aria-hidden>
                          {transaction.category.icon ??
                            (isIncome ? "⬆️" : "⬇️")}
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-medium text-gray-900 dark:text-gray-100">
                            {transaction.description || "(sem descrição)"}
                          </h3>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{transaction.category.name}</span>
                            <span
                              className="inline-block h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700"
                              aria-hidden
                            />
                            <span>{transaction.account.name}</span>
                            <span
                              className="inline-block h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700"
                              aria-hidden
                            />
                            <span className="tabular-nums">
                              {new Date(transaction.date).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-base ${numeral} ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                        style={tabularStyle}
                      >
                        {isIncome ? "+" : "−"} {brl(Number(transaction.amount))}
                      </span>
                      <button
                        onClick={() => startEdit(transaction)}
                        className="rounded-lg px-2.5 py-1.5 text-xs text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="rounded-lg px-2.5 py-1.5 text-xs text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}

// Helper functions to get accounts and categories
async function getAccounts() {
  const response = await fetch("/api/accounts");
  return response.json();
}

async function getCategories() {
  const response = await fetch("/api/categories");
  return response.json();
}
