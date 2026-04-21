"use client";

import { useState, useEffect } from "react";
import { createTransaction, getTransactions, deleteTransaction } from "./actions";
import { Transaction, Account, Category } from "@prisma/client";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<(Transaction & { account: Account; category: Category })[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    type: "EXPENSE" as const,
    description: "",
    accountId: "",
    categoryId: "",
    date: new Date().toISOString().split('T')[0],
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transactionsResult, accountsResult, categoriesResult] = await Promise.all([
        getTransactions(),
        getAccounts(),
        getCategories(),
      ]);

      if (transactionsResult.success) {
        setTransactions(transactionsResult.data || []);
      }
      if (accountsResult.success) {
        setAccounts(accountsResult.data || []);
      }
      if (categoriesResult.success) {
        setCategories(categoriesResult.data || []);
      }

      if (!transactionsResult.success || !accountsResult.success || !categoriesResult.success) {
        setMessage({ type: "error", text: "Erro ao carregar dados" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao carregar dados" });
    } finally {
      setIsLoading(false);
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
      const result = await createTransaction(data);
      if (result.success) {
        setMessage({ type: "success", text: result.message || "Transação criada com sucesso!" });
        setFormData({
          amount: "",
          type: "EXPENSE",
          description: "",
          accountId: "",
          categoryId: "",
          date: new Date().toISOString().split('T')[0],
        });
        setShowForm(false);
        await loadData();
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao criar transação" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao criar transação" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;

    try {
      const result = await deleteTransaction(transactionId);
      if (result.success) {
        setMessage({ type: "success", text: "Transação excluída com sucesso!" });
        await loadData();
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao excluir transação" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir transação" });
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
        <h1 className="text-3xl font-bold">Transações</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showForm ? "Cancelar" : "Nova Transação"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Valor
              </label>
              <input
                type="number"
                id="amount"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-2">
                Conta
              </label>
              <select
                id="accountId"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                id="categoryId"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione uma categoria</option>
                {categories
                  .filter((category) => category.type === formData.type)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <input
              type="date"
              id="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isSubmitting ? "Criando..." : "Criar Transação"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Suas Transações</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma transação encontrada. Crie sua primeira transação acima.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${transaction.type === "INCOME" ? "bg-green-500" : "bg-red-500"}`} />
                    <div>
                      <h3 className="font-medium">{transaction.description}</h3>
                      <p className="text-sm text-gray-500">
                        {transaction.category.icon} {transaction.category.name} • {transaction.account.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`font-semibold ${transaction.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                    {transaction.type === "INCOME" ? "+" : "-"}R$ {Number(transaction.amount).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDelete(transaction.id)}
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

// Helper functions to get accounts and categories
async function getAccounts() {
  const response = await fetch("/api/accounts");
  return response.json();
}

async function getCategories() {
  const response = await fetch("/api/categories");
  return response.json();
}