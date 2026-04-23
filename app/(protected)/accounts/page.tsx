"use client";

import { useState, useEffect } from "react";
import { createAccount, getAccounts, deleteAccount, updateAccountBalance } from "./actions";
import { Account } from "@prisma/client";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const result = await getAccounts();
      if (result.success) {
        setAccounts(result.data || []);
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao carregar contas" });
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
        setMessage({ type: "success", text: result.message || "Conta criada com sucesso!" });
        setFormData({ name: "", type: "CHECKING", balance: "" });
        setShowForm(false);
        await loadAccounts();
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao criar conta" });
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
        setMessage({ type: "error", text: result.error || "Erro ao excluir conta" });
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
        setMessage({ type: "success", text: result.message || "Saldo atualizado!" });
        cancelEditBalance();
        await loadAccounts();
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao atualizar saldo" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao atualizar saldo" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg dark:text-gray-200">Carregando...</div>
      </div>
    );
  }

  const isTicket = (t: Account["type"]) => t === "TICKET_MEAL" || t === "TICKET_FUEL";
  const totalBalance = accounts
    .filter((a) => !isTicket(a.type))
    .reduce((sum, a) => sum + Number(a.balance ?? 0), 0);
  const ticketMealBalance = accounts
    .filter((a) => a.type === "TICKET_MEAL")
    .reduce((sum, a) => sum + Number(a.balance ?? 0), 0);
  const ticketFuelBalance = accounts
    .filter((a) => a.type === "TICKET_FUEL")
    .reduce((sum, a) => sum + Number(a.balance ?? 0), 0);
  const ticketMealCount = accounts.filter((a) => a.type === "TICKET_MEAL").length;
  const ticketFuelCount = accounts.filter((a) => a.type === "TICKET_FUEL").length;
  const regularCount = accounts.length - ticketMealCount - ticketFuelCount;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold dark:text-gray-100">Contas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          {showForm ? "Cancelar" : "Nova Conta"}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 p-6 text-white shadow-md dark:from-indigo-700 dark:to-blue-800">
          <p className="text-sm opacity-90">Saldo total das contas</p>
          <p className="mt-1 text-3xl font-bold">{brl(totalBalance)}</p>
          <p className="mt-1 text-xs opacity-80">
            {regularCount} {regularCount === 1 ? "conta" : "contas"} (exclui Ticket)
          </p>
        </div>
        <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white shadow-md dark:from-amber-700 dark:to-orange-800">
          <p className="text-sm opacity-90">Saldo Ticket Refeição</p>
          <p className="mt-1 text-3xl font-bold">{brl(ticketMealBalance)}</p>
          <p className="mt-1 text-xs opacity-80">
            {ticketMealCount} {ticketMealCount === 1 ? "conta" : "contas"}
          </p>
        </div>
        <div className="rounded-lg bg-gradient-to-r from-rose-500 to-red-600 p-6 text-white shadow-md dark:from-rose-700 dark:to-red-800">
          <p className="text-sm opacity-90">Saldo Ticket Combustível</p>
          <p className="mt-1 text-3xl font-bold">{brl(ticketFuelBalance)}</p>
          <p className="mt-1 text-xs opacity-80">
            {ticketFuelCount} {ticketFuelCount === 1 ? "conta" : "contas"}
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 dark:bg-gray-900 dark:shadow-gray-900/50">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Nome da Conta
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Tipo
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="CHECKING">Conta Corrente</option>
              <option value="SAVINGS">Poupança</option>
              <option value="CASH">Dinheiro</option>
              <option value="CREDIT_CARD">Cartão de Crédito</option>
              <option value="INVESTMENT">Investimento</option>
              <option value="TICKET_MEAL">Ticket Refeição</option>
              <option value="TICKET_FUEL">Ticket Combustível</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Saldo Inicial (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              id="balance"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              placeholder="Ex: 10.000,50"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              Aceita vírgula ou ponto como decimal. Deixe em branco se a conta começa zerada.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {isSubmitting ? "Criando..." : "Criar Conta"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-md dark:bg-gray-900 dark:shadow-gray-900/50">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold dark:text-gray-100">Suas Contas</h2>
        </div>

        {accounts.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            Nenhuma conta encontrada. Crie sua primeira conta acima.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {accounts.map((account) => {
              const isEditing = editingId === account.id;
              return (
                <div key={account.id} className="px-6 py-4">
                  <div className="flex justify-between items-center gap-4 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="font-medium dark:text-gray-100">{account.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {account.type === "CHECKING" && "Conta Corrente"}
                        {account.type === "SAVINGS" && "Poupança"}
                        {account.type === "CASH" && "Dinheiro"}
                        {account.type === "CREDIT_CARD" && "Cartão de Crédito"}
                        {account.type === "INVESTMENT" && "Investimento"}
                        {account.type === "TICKET_MEAL" && "Ticket Refeição"}
                        {account.type === "TICKET_FUEL" && "Ticket Combustível"}
                        {account.type === "OTHER" && "Outro"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-lg font-semibold tabular-nums dark:text-gray-100">
                        {brl(Number(account.balance ?? 0))}
                      </span>
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => startEditBalance(account)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm px-2 py-1 rounded dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Editar saldo
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded dark:text-red-400 dark:hover:text-red-300"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        placeholder="Ex: 10.000,50"
                        className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
                        autoFocus
                      />
                      <button
                        onClick={() => submitEditBalance(account.id)}
                        disabled={isSubmitting}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={cancelEditBalance}
                        disabled={isSubmitting}
                        className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded dark:text-gray-300 dark:hover:text-gray-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
