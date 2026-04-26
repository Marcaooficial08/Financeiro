"use client";

import { useState, useEffect } from "react";
import {
  createAccount,
  getAccounts,
  deleteAccount,
  updateAccountBalance,
  updateAccountName,
  transferBalance,
} from "./actions";
import type { Prisma } from "@prisma/client";
type Account = Prisma.AccountGetPayload<object>;

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const smallCaps = "uppercase tracking-[0.22em] text-[10px] font-medium";
const numeral = "font-semibold tracking-tight tabular-nums";
const tabularStyle = { fontVariantNumeric: "tabular-nums" as const };

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-600";

const primaryBtn =
  "inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200";

const ghostBtn =
  "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

const accentBtn = (accent: string) =>
  `inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-50`;

function typeLabel(type: Account["type"]) {
  switch (type) {
    case "CHECKING":
      return "Conta Corrente";
    case "SAVINGS":
      return "Poupança";
    case "CASH":
      return "Dinheiro";
    case "CREDIT_CARD":
      return "Cartão de Crédito";
    case "INVESTMENT":
      return "Investimento";
    case "TICKET_MEAL":
      return "Ticket Refeição";
    case "TICKET_FUEL":
      return "Ticket Combustível";
    case "TICKET_AWARD":
      return "Ticket Premiação";
    default:
      return "Outro";
  }
}

function accentFor(type: Account["type"]) {
  switch (type) {
    case "TICKET_MEAL":
      return "#f59e0b";
    case "TICKET_FUEL":
      return "#e11d48";
    case "TICKET_AWARD":
      return "#8b5cf6";
    case "SAVINGS":
      return "#14b8a6";
    case "INVESTMENT":
      return "#0ea5e9";
    case "CREDIT_CARD":
      return "#f43f5e";
    case "CASH":
      return "#84cc16";
    default:
      return "#6366f1";
  }
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="p-5 pl-6">
        <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
          {label}
        </p>
        <p
          className={`mt-3 text-3xl text-gray-900 dark:text-white ${numeral}`}
          style={tabularStyle}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "CHECKING" as const,
    balance: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferData, setTransferData] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
  });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const result = await getAccounts();
      if (result.success) {
        setAccounts(result.data || []);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao carregar contas",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao carregar contas" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("type", formData.type);
    data.append("balance", formData.balance || "0");

    try {
      const result = await createAccount(data);
      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Conta criada com sucesso!",
        });
        setFormData({ name: "", type: "CHECKING", balance: "" });
        setShowForm(false);
        await loadAccounts();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao criar conta",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao criar conta" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;

    try {
      const result = await deleteAccount(accountId);
      if (result.success) {
        setMessage({ type: "success", text: "Conta excluída com sucesso!" });
        await loadAccounts();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao excluir conta",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir conta" });
    }
  };

  const startEditBalance = (account: Account) => {
    setEditingId(account.id);
    setEditingValue(Number(account.balance ?? 0).toFixed(2).replace(".", ","));
    setMessage(null);
  };

  const cancelEditBalance = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const submitEditBalance = async (accountId: string) => {
    setIsSubmitting(true);
    try {
      const result = await updateAccountBalance(accountId, editingValue);
      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Saldo atualizado!",
        });
        cancelEditBalance();
        await loadAccounts();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao atualizar saldo",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao atualizar saldo" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditName = (account: Account) => {
    setEditingNameId(account.id);
    setEditingNameValue(account.name);
    setMessage(null);
  };

  const cancelEditName = () => {
    setEditingNameId(null);
    setEditingNameValue("");
  };

  const submitEditName = async (accountId: string) => {
    setIsSubmitting(true);
    try {
      const result = await updateAccountName(accountId, editingNameValue);
      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Nome atualizado!",
        });
        cancelEditName();
        await loadAccounts();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao atualizar nome",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao atualizar nome" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const data = new FormData();
    data.append("fromAccountId", transferData.fromAccountId);
    data.append("toAccountId", transferData.toAccountId);
    data.append("amount", transferData.amount);

    try {
      const result = await transferBalance(data);
      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Transferência realizada!",
        });
        setTransferData({ fromAccountId: "", toAccountId: "", amount: "" });
        setShowTransferForm(false);
        await loadAccounts();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao transferir",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao transferir" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className={`${smallCaps} text-gray-500 dark:text-gray-400`}
        >
          Carregando…
        </div>
      </div>
    );
  }

  const isTicket = (t: Account["type"]) =>
    t === "TICKET_MEAL" || t === "TICKET_FUEL" || t === "TICKET_AWARD";
  const byName = (a: Account, b: Account) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
  const regularAccounts = accounts.filter((a) => !isTicket(a.type)).sort(byName);
  const ticketMealAccounts = accounts
    .filter((a) => a.type === "TICKET_MEAL")
    .sort(byName);
  const ticketFuelAccounts = accounts
    .filter((a) => a.type === "TICKET_FUEL")
    .sort(byName);
  const ticketAwardAccounts = accounts
    .filter((a) => a.type === "TICKET_AWARD")
    .sort(byName);
  const totalBalance = regularAccounts.reduce(
    (sum, a) => sum + Number(a.balance ?? 0),
    0,
  );
  const ticketMealBalance = ticketMealAccounts.reduce(
    (sum, a) => sum + Number(a.balance ?? 0),
    0,
  );
  const ticketFuelBalance = ticketFuelAccounts.reduce(
    (sum, a) => sum + Number(a.balance ?? 0),
    0,
  );
  const ticketAwardBalance = ticketAwardAccounts.reduce(
    (sum, a) => sum + Number(a.balance ?? 0),
    0,
  );
  const ticketMealCount = ticketMealAccounts.length;
  const ticketFuelCount = ticketFuelAccounts.length;
  const ticketAwardCount = ticketAwardAccounts.length;
  const regularCount = regularAccounts.length;

  const renderAccount = (account: Account) => {
    const isEditingBalance = editingId === account.id;
    const isEditingName = editingNameId === account.id;
    const accent = accentFor(account.type);
    return (
      <div
        key={account.id}
        className="group relative px-6 py-4 transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
      >
        <div
          className="absolute inset-y-2 left-0 w-[3px] rounded-r-full opacity-70"
          style={{ background: accent }}
          aria-hidden
        />
        <div className="flex flex-wrap items-center justify-between gap-4 pl-3">
          <div className="min-w-0">
            {isEditingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  placeholder="Ex: 💳 Nubank"
                  className={`${inputCls} min-w-[220px]`}
                  autoFocus
                />
                <button
                  onClick={() => submitEditName(account.id)}
                  disabled={isSubmitting}
                  className={primaryBtn}
                >
                  Salvar
                </button>
                <button
                  onClick={cancelEditName}
                  disabled={isSubmitting}
                  className={ghostBtn}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <h3 className="truncate font-medium text-gray-900 dark:text-gray-100">
                {account.name}
              </h3>
            )}
            <p
              className={`${smallCaps} mt-1 text-gray-400 dark:text-gray-500`}
            >
              {typeLabel(account.type)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-lg ${numeral} text-gray-900 dark:text-gray-100`}
              style={tabularStyle}
            >
              {brl(Number(account.balance ?? 0))}
            </span>
            {!isEditingBalance && !isEditingName && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEditName(account)}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  Editar nome
                </button>
                <button
                  onClick={() => startEditBalance(account)}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  Editar saldo
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditingBalance && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-3">
            <input
              type="text"
              inputMode="decimal"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              placeholder="Ex: 10.000,50"
              className={`${inputCls} flex-1 min-w-[200px]`}
              autoFocus
            />
            <button
              onClick={() => submitEditBalance(account.id)}
              disabled={isSubmitting}
              className={primaryBtn}
            >
              Salvar
            </button>
            <button
              onClick={cancelEditBalance}
              disabled={isSubmitting}
              className={ghostBtn}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  };

  const groups: { title: string; items: Account[]; accent: string }[] = [
    { title: "Contas", items: regularAccounts, accent: "#6366f1" },
    { title: "Ticket Refeição", items: ticketMealAccounts, accent: "#f59e0b" },
    { title: "Ticket Combustível", items: ticketFuelAccounts, accent: "#e11d48" },
    { title: "Ticket Premiação", items: ticketAwardAccounts, accent: "#8b5cf6" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`${smallCaps} text-gray-400`}>01 · Patrimônio</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Contas
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Snapshot de saldo por tipo de conta e vale-benefício.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowTransferForm((prev) => !prev);
              if (!showTransferForm) setShowForm(false);
            }}
            disabled={accounts.length < 2}
            className={ghostBtn}
            title={
              accounts.length < 2
                ? "Crie pelo menos duas contas para transferir"
                : ""
            }
          >
            {showTransferForm ? "Cancelar transferência" : "Transferir"}
          </button>
          <button
            onClick={() => {
              setShowForm((prev) => !prev);
              if (!showForm) setShowTransferForm(false);
            }}
            className={primaryBtn}
          >
            {showForm ? "Cancelar" : "+ Nova conta"}
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Contas regulares"
          value={brl(totalBalance)}
          hint={`${regularCount} ${regularCount === 1 ? "conta" : "contas"}`}
          accent="#6366f1"
        />
        <SummaryTile
          label="Ticket Refeição"
          value={brl(ticketMealBalance)}
          hint={`${ticketMealCount} ${ticketMealCount === 1 ? "conta" : "contas"}`}
          accent="#f59e0b"
        />
        <SummaryTile
          label="Ticket Combustível"
          value={brl(ticketFuelBalance)}
          hint={`${ticketFuelCount} ${ticketFuelCount === 1 ? "conta" : "contas"}`}
          accent="#e11d48"
        />
        <SummaryTile
          label="Ticket Premiação"
          value={brl(ticketAwardBalance)}
          hint={`${ticketAwardCount} ${ticketAwardCount === 1 ? "conta" : "contas"}`}
          accent="#8b5cf6"
        />
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

      {showTransferForm && (
        <form
          onSubmit={handleTransferSubmit}
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <p className={`${smallCaps} text-gray-400`}>Transferência</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Mover saldo entre contas
              </h2>
            </div>
          </div>
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="fromAccountId"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                De
              </label>
              <select
                id="fromAccountId"
                value={transferData.fromAccountId}
                onChange={(e) =>
                  setTransferData({
                    ...transferData,
                    fromAccountId: e.target.value,
                  })
                }
                className={inputCls}
                required
              >
                <option value="">Selecione a origem</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {brl(Number(account.balance ?? 0))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="toAccountId"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Para
              </label>
              <select
                id="toAccountId"
                value={transferData.toAccountId}
                onChange={(e) =>
                  setTransferData({
                    ...transferData,
                    toAccountId: e.target.value,
                  })
                }
                className={inputCls}
                required
              >
                <option value="">Selecione o destino</option>
                {accounts
                  .filter((account) => account.id !== transferData.fromAccountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} — {brl(Number(account.balance ?? 0))}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label
              htmlFor="transferAmount"
              className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
            >
              Valor (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              id="transferAmount"
              value={transferData.amount}
              onChange={(e) =>
                setTransferData({ ...transferData, amount: e.target.value })
              }
              placeholder="Ex: 500,00"
              className={inputCls}
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Aceita vírgula ou ponto como decimal.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={primaryBtn + " w-full justify-center"}
          >
            {isSubmitting ? "Transferindo…" : "Confirmar transferência"}
          </button>
        </form>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="mb-5">
            <p className={`${smallCaps} text-gray-400`}>Nova conta</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Registrar nova conta ou vale
            </h2>
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Nome da conta
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: 💳 Nubank"
                className={inputCls}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Emojis são permitidos no nome.
              </p>
            </div>
            <div>
              <label
                htmlFor="type"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Tipo
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as any })
                }
                className={inputCls}
              >
                <option value="CHECKING">Conta Corrente</option>
                <option value="SAVINGS">Poupança</option>
                <option value="CASH">Dinheiro</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="INVESTMENT">Investimento</option>
                <option value="TICKET_MEAL">Ticket Refeição</option>
                <option value="TICKET_FUEL">Ticket Combustível</option>
                <option value="TICKET_AWARD">Ticket Premiação</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
          </div>

          <div className="mb-5">
            <label
              htmlFor="balance"
              className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
            >
              Saldo inicial (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              id="balance"
              value={formData.balance}
              onChange={(e) =>
                setFormData({ ...formData, balance: e.target.value })
              }
              placeholder="Ex: 10.000,50"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Aceita vírgula ou ponto. Deixe em branco se começa zerada.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={primaryBtn + " w-full justify-center"}
          >
            {isSubmitting ? "Criando…" : "Criar conta"}
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-baseline justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <p className={`${smallCaps} text-gray-400`}>Suas contas</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {accounts.length}{" "}
              {accounts.length === 1 ? "registro" : "registros"}
            </h2>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className={`${smallCaps} text-gray-400`}>Vazio</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Crie sua primeira conta acima.
            </p>
          </div>
        ) : (
          <div>
            {groups
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <section key={group.title}>
                  <div className="flex items-center gap-3 border-y border-gray-100 bg-gray-50/60 px-6 py-2.5 dark:border-gray-800 dark:bg-gray-950/40">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: group.accent }}
                      aria-hidden
                    />
                    <h3
                      className={`${smallCaps} text-gray-600 dark:text-gray-400`}
                    >
                      {group.title}
                    </h3>
                    <span className="text-xs tabular-nums text-gray-400">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {group.items.map(renderAccount)}
                  </div>
                </section>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
