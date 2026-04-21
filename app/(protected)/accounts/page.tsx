"use client";

import { useState, useEffect } from "react";
import { createAccount, getAccounts, deleteAccount } from "./actions";
import { Account } from "@prisma/client";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "CHECKING" as const,
  });
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

    try {
      const result = await createAccount(data);
      if (result.success) {
        setMessage({ type: "success", text: result.message || "Conta criada com sucesso!" });
        setFormData({ name: "", type: "CHECKING" });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Contas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showForm ? "Cancelar" : "Nova Conta"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Conta
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="CHECKING">Conta Corrente</option>
              <option value="SAVINGS">Poupança</option>
              <option value="CASH">Dinheiro</option>
              <option value="CREDIT_CARD">Cartão de Crédito</option>
              <option value="INVESTMENT">Investimento</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isSubmitting ? "Criando..." : "Criar Conta"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Suas Contas</h2>
        </div>

        {accounts.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma conta encontrada. Crie sua primeira conta acima.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <div key={account.id} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{account.name}</h3>
                  <p className="text-sm text-gray-500">
                    {account.type === "CHECKING" && "Conta Corrente"}
                    {account.type === "SAVINGS" && "Poupança"}
                    {account.type === "CASH" && "Dinheiro"}
                    {account.type === "CREDIT_CARD" && "Cartão de Crédito"}
                    {account.type === "INVESTMENT" && "Investimento"}
                    {account.type === "OTHER" && "Outro"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-semibold">
                    R$ {Number(account.balance ?? 0).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="text-red-500 hover:text-red-700 px-2 py-1 rounded"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}